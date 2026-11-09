---
id: sd-consensus
title: Consensus
area: sd
section: B. Data storage
---

## Overview

Consensus lets a group of nodes agree on a value or an ordered log despite failures, as long as a majority is up. It's the basis of leader election, configuration stores (etcd, ZooKeeper) and strongly consistent databases (Spanner, CockroachDB).

## What to know

1. Paxos and Raft at the idea level :: Paxos and Raft both solve agreement with a majority quorum, so 2f+1 nodes tolerate f failures. Raft is designed to be understandable: one leader per term, the leader appends entries to followers' logs, and an entry is committed once a majority has it. You don't need the proofs, just the guarantees and the costs.

2. Leader election :: Nodes start as followers; if a follower hears no heartbeat before its randomized timeout, it becomes a candidate, increments the term and asks for votes. A node votes once per term and only for candidates whose log is at least as up to date. A majority makes a leader, and randomized timeouts avoid split votes.

3. Log replication :: Clients send commands to the leader, which appends them to its log and replicates them to followers. Once a majority has stored an entry, it's committed and applied to the state machine in log order. Followers with conflicting entries are overwritten by the leader's log.

4. Quorum :: A quorum is a majority, so any two quorums overlap in at least one node; that overlap is why committed data survives leader changes. A 5-node cluster tolerates 2 failures; adding a 6th node doesn't increase tolerance, which is why clusters have odd sizes. Every write costs a round trip to a majority.

## Recap

- Consensus = a majority agrees on an ordered log; survives ⌊(n−1)/2⌋ failures.
- Raft: leader election by terms + votes; log replication; commit on majority ack.
- Use 3 or 5 nodes; even counts add no fault tolerance.
- You use consensus via etcd/ZooKeeper for metadata, locks, leader election, not for bulk data.

## Go deeper

### Why consensus is needed {point: 0}

Many problems reduce to getting several machines to agree on one value or one ordered sequence of values despite crashes and message delays: electing a single leader, committing a transaction, assigning a lock, recording cluster membership, or replicating a state machine (every replica applies the same commands in the same order and ends in the same state).

The FLP result says no deterministic algorithm can guarantee consensus in a fully asynchronous system if even one process may crash; practical algorithms (Paxos, Raft, Zab) are always safe but only guarantee progress when the network behaves well enough (timeouts eventually work). With 2f + 1 nodes they tolerate f crashed nodes: 3 nodes tolerate 1 failure, 5 tolerate 2. Byzantine (malicious) faults need 3f + 1 nodes and different protocols (PBFT, blockchains), which most internal systems don't need.

### Raft in five steps {point: 0.5}

1) Nodes start as followers. If a follower hears no heartbeat within a randomized timeout (150-300 ms), it becomes a candidate, increments the term and asks for votes. 2) A node votes once per term, only for a candidate whose log is at least as up to date. A majority makes it leader. 3) The leader appends client commands to its log and replicates them with AppendEntries. 4) An entry is committed once a majority has it; the leader then applies it and tells followers. 5) A stale leader that sees a higher term steps down.

Safety: a new leader always has every committed entry, because committing needed a majority and electing needs a majority, and any two majorities overlap.

### Raft details interviewers probe {point: 2}

Terms: logical clock incremented on each election; any message with a higher term makes a node update its term and step down to follower. Election safety: at most one leader per term, because each node votes once per term and a candidate needs a majority. Log matching: entries are identified by (term, index); AppendEntries includes the previous entry's (term, index), and followers reject mismatches, so the leader backs up and overwrites divergent follower entries.

Commit rule: an entry from the current term is committed when stored on a majority; earlier entries are committed indirectly. Leader completeness: voters reject candidates whose log is less up to date (compare last term, then last index), so a new leader always has all committed entries.

Practical extras: log compaction with snapshots, membership changes (joint consensus or one-at-a-time), linearizable reads (read index or leader leases, since a stale leader might not know it was replaced), and pre-vote to avoid disruptive elections from a partitioned node.

### Where it shows up in designs

Kafka (KRaft) and Kubernetes (etcd) store cluster metadata with consensus. Distributed locks and leader election for schedulers use etcd/ZooKeeper leases. Spanner and CockroachDB run a Raft/Paxos group per data range so writes are strongly consistent.

Cost: every write needs a majority round trip, so cross-region groups add 50-150 ms per write. That's why you keep consensus off the hot path for high-volume data and use it for the small, critical metadata.

### Using consensus systems wisely

etcd, ZooKeeper and Consul give you consensus as a service: a small, strongly consistent key-value store with watches, leases/ephemeral nodes and compare-and-set. Use them for configuration, service discovery, leader election, distributed locks with fencing, and cluster membership.

Don't use them as general databases: throughput is thousands of writes per second, values are small (KB), and the whole dataset should fit in memory. Keep the cluster small (3 or 5 nodes) in one region for low commit latency; cross-region consensus is possible but every write pays the inter-region round trip.

In a design, mention consensus where correctness depends on a single decision: the scheduler leader, shard-to-node assignment metadata, or the job lease table. Data-heavy paths use replicated databases or logs that themselves rely on consensus internally (Kafka KRaft, CockroachDB ranges).

## Interview questions

- Why do consensus clusters have an odd number of nodes?
- What happens in Raft when the leader crashes?
- Why not run consensus for every write in a high-throughput system?
