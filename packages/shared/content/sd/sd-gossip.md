---
id: sd-gossip
title: Gossip protocols and failure detection
area: sd
section: C. Building blocks
---

## Overview

A gossip protocol spreads information the way a rumour spreads in an office: every node regularly picks a few random peers and tells them what it knows. No node is in charge, each node does the same small amount of work however big the cluster is, and the news still reaches every node in about log N rounds. Systems like Cassandra, Dynamo, Consul and Redis Cluster use it to track who is in the cluster and who is down. The price is that everyone learns eventually, not instantly, so gossip is for membership, health and metadata, not for decisions that must be exact such as electing a leader.

## What to know

1. How gossip spreads :: In each round every node that knows something new picks a few random peers (the fan-out, often 2 or 3) and sends it. Those peers do the same next round, so the number of informed nodes roughly multiplies each round until nearly everyone has it. For push gossip the expected time to reach all N nodes is about log2(N) + ln(N) rounds, so around 17 rounds for 1,000 nodes at fan-out 1. With a one-second interval that is seconds, not minutes. Each node sends the same number of messages per round whatever N is, so there is no hot spot and no single point of failure.

2. Push, pull and push-pull :: Push: a node with news sends it to peers. It is fast at the start but slow at the end, because the last few nodes are rarely picked. Pull: a node asks random peers what they have. It is slow at the start but fast at the end, because by then most peers know. Push-pull: two nodes exchange what each is missing, which is the fastest of the three and the one most real systems use. Each exchange usually sends a small digest (versions or hashes) first, and only the missing items after that, to save bandwidth.

3. Heartbeats and SWIM failure detection :: All-to-all heartbeats cost N-squared messages, which breaks down past a few dozen nodes. Gossip-style detection keeps a table of node, heartbeat counter and the local time it last increased. Each node bumps its own counter, sends its table to a random peer, and the receiver keeps the higher counter for every entry. If a node's counter has not moved for a timeout (measured on the receiver's own clock) it is suspected, and after a longer cleanup time it is removed. SWIM does it with direct pings, and indirect pings through k other nodes before suspecting, so one bad link does not cause a false alarm.

4. Anti-entropy and Merkle trees :: Gossip can lose a message, and a node that was down misses rumours. Anti-entropy fixes that: replicas periodically compare their data and repair differences. To compare a billion keys cheaply they build a Merkle tree, a hash tree over key ranges. Two replicas compare the root hashes; if they match, they are identical. If not, they descend only into the subtrees whose hashes differ, so the cost is about the number of differences times the tree depth. Dynamo-style stores (Cassandra repair, Riak) run this in the background next to rumour-style gossip.

5. Tuning interval, fan-out and timeouts :: You tune three things: the interval (faster means quicker convergence and more traffic), the fan-out (more peers per round means fewer rounds and more traffic) and the failure timeout (shorter detects sooner and raises false positives during GC pauses or network blips). Cassandra gossips every second with up to three nodes and uses a phi-accrual detector, which turns heartbeat arrival times into a suspicion level and convicts when it passes a threshold (default 8) instead of using one fixed timeout. The bigger the state in each message, the more the cost grows, so large clusters send digests and deltas.

6. When to use gossip and when to use consensus :: Use gossip for cluster membership, node health, ring and schema versions, and spreading small metadata widely. It suits very large or dynamic clusters where a central registry would be a bottleneck. Do not use it where you need one agreed answer right now: leader election, locks and configuration changes that must be ordered belong to a consensus system (Raft, ZooKeeper, etcd). A leader that sends heartbeats to every follower is simpler and detects failure faster, but it does not scale past a few hundred nodes and the leader becomes the weak spot.

## Recap

- Each node tells a few random peers every round; news reaches all N nodes in about log2(N) + ln(N) rounds, with constant work per node.
- Push is fast early, pull is fast late, push-pull exchange is fastest; send digests first, then only what is missing.
- Failure detection: heartbeat counters merged by max, 'no change for T on my own clock' means suspect; SWIM adds indirect pings before suspecting.
- Anti-entropy with Merkle trees repairs what rumours missed. Use gossip for membership and health, not for leader election.

## Go deeper

### How fast does a rumour spread? A worked example {point: 0}

Take 1,000 nodes, fan-out 1, one gossip round per second, and one node learns a fact at time 0. Round 1: 2 nodes know. Round 2: about 4. The count roughly doubles while few nodes know, so after about 10 rounds around half the cluster knows (2 to the 10th is 1,024). Then the curve flips: most picks land on nodes that already know, so reaching the last few takes extra rounds. Pittel's result puts the total near log2(N) + ln(N), which is 9.97 + 6.91, about 17 rounds, so under 20 seconds.

Raise the fan-out to 3 and the early growth is about 4 times per round, so the total drops to roughly 8 to 10 rounds, at 3 times the messages. Doubling N from 1,000 to 2,000 adds only about one round. That logarithmic growth is the reason gossip scales: a 100,000-node cluster is only a few rounds slower than a 1,000-node one, and each node still sends the same few messages per round.

### Failure detection: gossip heartbeats, SWIM and phi accrual {point: 2}

Gossip-style heartbeating (van Renesse et al.): every node keeps a table of (node, heartbeat counter, local time the counter last changed). Each round it increments its own counter, sends its table to a random peer, and the receiver merges by keeping the larger counter and stamping its own clock when a counter increases. If a node's counter has not increased for T_fail on the receiver's clock, it is suspected; after a longer T_cleanup the entry is deleted, which prevents stale entries from reviving a dead node.

SWIM changes the cost model. Each period a node pings one random member. No reply: it asks k other members to ping the target for it (ping-req). Still no reply: the target is marked suspect, not dead, and that suspicion is gossiped by piggybacking on the normal ping and ack messages. The suspect can refute it by sending a message with a higher incarnation number. Only after a suspicion timeout is it declared dead. Per-node load is constant, detection time is bounded, and the chance of a false positive falls quickly with k, because all k indirect paths have to fail. Consul's memberlist implements SWIM.

Cassandra uses the phi-accrual detector: instead of a yes or no after a fixed timeout, it models heartbeat inter-arrival times and outputs a suspicion level phi. A node is convicted when phi passes a threshold (default 8), so the same setting adapts to a slow network and a fast one.

### Anti-entropy and Merkle trees {point: 3}

Rumour spreading is probabilistic: a node can miss a message while it is down, and a rumour can stop spreading before everyone has it. Anti-entropy is the safety net. Periodically two replicas compare their data and repair whatever differs. Sending every key is far too costly for a large store, so each replica builds a Merkle tree: leaves hold hashes of small key ranges, and each parent holds the hash of its children.

Two replicas compare the root hash. Equal roots mean identical data and the exchange ends in one message. Different roots mean they compare the children and descend only into subtrees whose hashes differ, so the traffic is about (number of differing ranges) times (tree depth), often a handful of kilobytes, instead of the whole data set. Cassandra's nodetool repair and Riak's active anti-entropy work this way, and Dynamo describes it in its paper.

The practical cost is building the trees: it needs a pass over the data, so repair is run on a schedule, one range at a time, and tuned so it does not compete with live traffic.

### Failure modes and what to ask in a design review {point: 4}

Partition: if the network splits, each side sees the other as dead. That is correct from where each side stands, so anything triggered by 'node is dead' (moving data, taking over a role) must be safe when the node is actually alive. Slow node: a long GC pause looks like a crash; a phi-accrual style detector or a longer suspicion timeout, and a rule that a node can refute suspicion, reduce flapping.

Seeds and bootstrap: a new node needs a few known contact points (seed nodes) to join. If every node lists the same single seed, you have recreated a central point. Message size: if you gossip the whole state each time, cost grows with cluster size; send digests and deltas. Security: an unauthenticated gossip port lets anyone inject false state, so real systems encrypt and authenticate (shared keys or TLS).

In an interview, say what you gossip (membership, load, versions), the interval and fan-out, how long convergence takes for your N, what happens during a partition, and which decisions you route to a consensus system instead.

### A Cassandra gossip round, and gossip versus a leader {point: 5}

Cassandra gossips once a second. A node picks one random live node, sometimes one unreachable node (to detect recovery) and sometimes a seed, and runs a three-message exchange: SYN (digests: node, generation, version), ACK (what the receiver wants, plus the newer state it holds) and ACK2 (the state the first node was asked for). Digests are small, so a large cluster does not drown in state. What spreads this way is node status, tokens (ring ownership), schema versions and load information.

Compare with a central design. A leader (or ZooKeeper-style service) that receives heartbeats from every node gives one authoritative view and detects a crash in a couple of seconds, but the leader's load grows with N, and its failure needs an election. Gossip has no special node, so no single point of failure and constant load per node, but each node's view can lag and different nodes may disagree for several rounds. Big systems often combine them: gossip for membership and health, a small consensus group for the few things that must be agreed exactly.

## Interview questions

- How can a 1,000-node cluster notice a dead node without every node pinging every other node?
- How long does it take news to reach every node, and what controls it?
- Why is gossip a poor fit for leader election?
- What is anti-entropy, and why do gossip systems still need it?
- How does SWIM avoid declaring a healthy node dead because of one lost packet?

## Common mistakes

- Treating gossip state as strongly consistent: two nodes can disagree for a few rounds, and a design that assumes otherwise will misbehave.
- Comparing heartbeat times across machines: use each node's own clock to measure 'no change for T seconds'; clocks are never in sync.
- A short timeout in a cluster with GC pauses or noisy networks: you get flapping, where healthy nodes are marked down and up repeatedly.
- Forgetting a network partition: both sides will declare the other side dead, so decisions made on 'dead' must be safe if it is wrong.
