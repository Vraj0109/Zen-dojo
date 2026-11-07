import { lesson, type Lesson, type LessonExtra } from "./types";

// Two system design concepts added later: gossip protocols and the actor model (plan 0009).
// Written for this app; numbers are the usual ones from the papers and the systems named.

export const SD_GAP_LESSONS: Record<string, Lesson> = {
  "sd-gossip": lesson(
    "A gossip protocol spreads information the way a rumour spreads in an office: every node regularly picks a few random peers and tells them what it knows. No node is in charge, each node does the same small amount of work however big the cluster is, and the news still reaches every node in about log N rounds. Systems like Cassandra, Dynamo, Consul and Redis Cluster use it to track who is in the cluster and who is down. The price is that everyone learns eventually, not instantly, so gossip is for membership, health and metadata, not for decisions that must be exact such as electing a leader.",
    [
      "In each round every node that knows something new picks a few random peers (the fan-out, often 2 or 3) and sends it. Those peers do the same next round, so the number of informed nodes roughly multiplies each round until nearly everyone has it. For push gossip the expected time to reach all N nodes is about log2(N) + ln(N) rounds, so around 17 rounds for 1,000 nodes at fan-out 1. With a one-second interval that is seconds, not minutes. Each node sends the same number of messages per round whatever N is, so there is no hot spot and no single point of failure.",
      "Push: a node with news sends it to peers. It is fast at the start but slow at the end, because the last few nodes are rarely picked. Pull: a node asks random peers what they have. It is slow at the start but fast at the end, because by then most peers know. Push-pull: two nodes exchange what each is missing, which is the fastest of the three and the one most real systems use. Each exchange usually sends a small digest (versions or hashes) first, and only the missing items after that, to save bandwidth.",
      "All-to-all heartbeats cost N-squared messages, which breaks down past a few dozen nodes. Gossip-style detection keeps a table of node, heartbeat counter and the local time it last increased. Each node bumps its own counter, sends its table to a random peer, and the receiver keeps the higher counter for every entry. If a node's counter has not moved for a timeout (measured on the receiver's own clock) it is suspected, and after a longer cleanup time it is removed. SWIM does it with direct pings, and indirect pings through k other nodes before suspecting, so one bad link does not cause a false alarm.",
      "Gossip can lose a message, and a node that was down misses rumours. Anti-entropy fixes that: replicas periodically compare their data and repair differences. To compare a billion keys cheaply they build a Merkle tree, a hash tree over key ranges. Two replicas compare the root hashes; if they match, they are identical. If not, they descend only into the subtrees whose hashes differ, so the cost is about the number of differences times the tree depth. Dynamo-style stores (Cassandra repair, Riak) run this in the background next to rumour-style gossip.",
      "You tune three things: the interval (faster means quicker convergence and more traffic), the fan-out (more peers per round means fewer rounds and more traffic) and the failure timeout (shorter detects sooner and raises false positives during GC pauses or network blips). Cassandra gossips every second with up to three nodes and uses a phi-accrual detector, which turns heartbeat arrival times into a suspicion level and convicts when it passes a threshold (default 8) instead of using one fixed timeout. The bigger the state in each message, the more the cost grows, so large clusters send digests and deltas.",
      "Use gossip for cluster membership, node health, ring and schema versions, and spreading small metadata widely. It suits very large or dynamic clusters where a central registry would be a bottleneck. Do not use it where you need one agreed answer right now: leader election, locks and configuration changes that must be ordered belong to a consensus system (Raft, ZooKeeper, etcd). A leader that sends heartbeats to every follower is simpler and detects failure faster, but it does not scale past a few hundred nodes and the leader becomes the weak spot.",
    ],
    [
      "How can a 1,000-node cluster notice a dead node without every node pinging every other node?",
      "How long does it take news to reach every node, and what controls it?",
      "Why is gossip a poor fit for leader election?",
      "What is anti-entropy, and why do gossip systems still need it?",
      "How does SWIM avoid declaring a healthy node dead because of one lost packet?",
    ],
    [
      "Treating gossip state as strongly consistent: two nodes can disagree for a few rounds, and a design that assumes otherwise will misbehave.",
      "Comparing heartbeat times across machines: use each node's own clock to measure 'no change for T seconds'; clocks are never in sync.",
      "A short timeout in a cluster with GC pauses or noisy networks: you get flapping, where healthy nodes are marked down and up repeatedly.",
      "Forgetting a network partition: both sides will declare the other side dead, so decisions made on 'dead' must be safe if it is wrong.",
    ],
  ),

  "sd-actors": lesson(
    "In the actor model the unit of concurrency is an actor: a small object that owns private state and a mailbox, and handles one message at a time. Actors never share memory. They only send each other asynchronous messages, so you need no locks inside an actor, and millions of them can run on a handful of threads. Erlang, Akka, Orleans, Dapr actors and Ray use this idea. It maps well to systems made of many independent stateful things (chat rooms, game sessions, devices, shopping carts), and it gives you failure handling by design: a parent actor supervises its children and restarts them when they crash.",
    [
      "An actor has three parts: state nobody else can touch, a mailbox queue, and behaviour that runs for one message at a time. When it handles a message it can send messages to other actors, create new actors, and decide how to handle the next message. Because only one message runs at a time inside one actor, its state needs no locks. Concurrency comes from having many actors, not from many threads touching the same data. An Erlang process starts at a few kilobytes, so millions of actors in one machine is normal.",
      "Messages are asynchronous and one-way: the sender does not wait. By default delivery is at most once, and the only ordering you usually get is between one sender and one receiver. Anything stronger is your job: acknowledgements, retries with idempotent handlers, and a timeout on request-reply (often called ask). Messages should be immutable, so sharing one between actors cannot cause a data race. That is the actor version of 'share by communicating'.",
      "Actors are built for failure: let it crash. A parent supervises its children. When a child throws, the supervisor chooses: resume, restart the child with fresh state, stop it, or escalate to its own parent. Restart one child (one-for-one) or all siblings together (one-for-all) depending on whether they depend on each other. Because the state is lost on restart, an actor that matters keeps its state in a store or an event log (event sourcing) and rebuilds from it. This is how Erlang systems reach very high uptime.",
      "An actor is addressed by a name or reference, not by where it runs, so the same code works locally and across machines (location transparency). To scale out, cluster sharding hashes an entity id to a shard and each shard lives on one node, and moves if nodes join or leave. Orleans calls them virtual actors (grains): you call by id, the system activates the actor on demand, guarantees a single active copy, and removes it when idle. That is a natural fit for one actor per user, device or order.",
      "A mailbox that is allowed to grow without limit hides trouble: a fast producer and a slow actor means memory growth until the process dies. Use bounded mailboxes with a policy (reject, drop oldest, or push back to the sender), or let consumers pull work when ready. Never block inside an actor on a slow call, because it stops the whole mailbox and may starve the thread pool; run blocking work on a separate pool or turn it into an async message. Messages that cannot be delivered go to dead letters, which you should monitor.",
      "Pick actors when you have many independent, stateful entities, each doing sequential work, with fault isolation between them. Compare with the alternatives: threads and locks share memory and risk deadlocks and races; CSP channels (Go) name the pipe rather than the receiver; queues such as Kafka are durable and replayable but are infrastructure, not a programming model. Actors are a poor fit for operations that must be atomic across many actors (use a saga or a database transaction), for CPU-bound parallel loops, and when you need one global order of events.",
    ],
    [
      "How does the actor model avoid locks, and what do you give up for that?",
      "What does 'let it crash' mean, and what makes it safe?",
      "What guarantees do you get on message delivery and ordering, and how do you build reliability on top?",
      "Design a chat service or a game lobby with actors. What is an actor, what is its state, and how do you scale it?",
      "How is the actor model different from a message queue or from Go channels?",
    ],
    [
      "Blocking inside an actor (a database call, a lock, Thread.sleep): the mailbox stalls and, on a shared thread pool, other actors starve.",
      "Assuming messages are delivered exactly once or in a global order: they are not; make handlers idempotent and keep ordering assumptions per sender and receiver pair.",
      "Giant actors that hold too much state or do too much work: they become the bottleneck that locks were. Prefer many small ones, one per entity.",
      "An unbounded mailbox with no backpressure: it looks fine until the producer outpaces the consumer.",
    ],
  ),
};

export const DEEP_SD_GAPS: Record<string, LessonExtra> = {
  "sd-gossip": {
    recap: [
      "Each node tells a few random peers every round; news reaches all N nodes in about log2(N) + ln(N) rounds, with constant work per node.",
      "Push is fast early, pull is fast late, push-pull exchange is fastest; send digests first, then only what is missing.",
      "Failure detection: heartbeat counters merged by max, 'no change for T on my own clock' means suspect; SWIM adds indirect pings before suspecting.",
      "Anti-entropy with Merkle trees repairs what rumours missed. Use gossip for membership and health, not for leader election.",
    ],
    deeper: [
      {
        title: "How fast does a rumour spread? A worked example",
        body: "Take 1,000 nodes, fan-out 1, one gossip round per second, and one node learns a fact at time 0. Round 1: 2 nodes know. Round 2: about 4. The count roughly doubles while few nodes know, so after about 10 rounds around half the cluster knows (2 to the 10th is 1,024). Then the curve flips: most picks land on nodes that already know, so reaching the last few takes extra rounds. Pittel's result puts the total near log2(N) + ln(N), which is 9.97 + 6.91, about 17 rounds, so under 20 seconds.\n\nRaise the fan-out to 3 and the early growth is about 4 times per round, so the total drops to roughly 8 to 10 rounds, at 3 times the messages. Doubling N from 1,000 to 2,000 adds only about one round. That logarithmic growth is the reason gossip scales: a 100,000-node cluster is only a few rounds slower than a 1,000-node one, and each node still sends the same few messages per round.",
      },
      {
        title: "Failure detection: gossip heartbeats, SWIM and phi accrual",
        body: "Gossip-style heartbeating (van Renesse et al.): every node keeps a table of (node, heartbeat counter, local time the counter last changed). Each round it increments its own counter, sends its table to a random peer, and the receiver merges by keeping the larger counter and stamping its own clock when a counter increases. If a node's counter has not increased for T_fail on the receiver's clock, it is suspected; after a longer T_cleanup the entry is deleted, which prevents stale entries from reviving a dead node.\n\nSWIM changes the cost model. Each period a node pings one random member. No reply: it asks k other members to ping the target for it (ping-req). Still no reply: the target is marked suspect, not dead, and that suspicion is gossiped by piggybacking on the normal ping and ack messages. The suspect can refute it by sending a message with a higher incarnation number. Only after a suspicion timeout is it declared dead. Per-node load is constant, detection time is bounded, and the chance of a false positive falls quickly with k, because all k indirect paths have to fail. Consul's memberlist implements SWIM.\n\nCassandra uses the phi-accrual detector: instead of a yes or no after a fixed timeout, it models heartbeat inter-arrival times and outputs a suspicion level phi. A node is convicted when phi passes a threshold (default 8), so the same setting adapts to a slow network and a fast one.",
      },
      {
        title: "Anti-entropy and Merkle trees",
        body: "Rumour spreading is probabilistic: a node can miss a message while it is down, and a rumour can stop spreading before everyone has it. Anti-entropy is the safety net. Periodically two replicas compare their data and repair whatever differs. Sending every key is far too costly for a large store, so each replica builds a Merkle tree: leaves hold hashes of small key ranges, and each parent holds the hash of its children.\n\nTwo replicas compare the root hash. Equal roots mean identical data and the exchange ends in one message. Different roots mean they compare the children and descend only into subtrees whose hashes differ, so the traffic is about (number of differing ranges) times (tree depth), often a handful of kilobytes, instead of the whole data set. Cassandra's nodetool repair and Riak's active anti-entropy work this way, and Dynamo describes it in its paper.\n\nThe practical cost is building the trees: it needs a pass over the data, so repair is run on a schedule, one range at a time, and tuned so it does not compete with live traffic.",
      },
      {
        title: "A Cassandra gossip round, and gossip versus a leader",
        body: "Cassandra gossips once a second. A node picks one random live node, sometimes one unreachable node (to detect recovery) and sometimes a seed, and runs a three-message exchange: SYN (digests: node, generation, version), ACK (what the receiver wants, plus the newer state it holds) and ACK2 (the state the first node was asked for). Digests are small, so a large cluster does not drown in state. What spreads this way is node status, tokens (ring ownership), schema versions and load information.\n\nCompare with a central design. A leader (or ZooKeeper-style service) that receives heartbeats from every node gives one authoritative view and detects a crash in a couple of seconds, but the leader's load grows with N, and its failure needs an election. Gossip has no special node, so no single point of failure and constant load per node, but each node's view can lag and different nodes may disagree for several rounds. Big systems often combine them: gossip for membership and health, a small consensus group for the few things that must be agreed exactly.",
      },
      {
        title: "Failure modes and what to ask in a design review",
        body: "Partition: if the network splits, each side sees the other as dead. That is correct from where each side stands, so anything triggered by 'node is dead' (moving data, taking over a role) must be safe when the node is actually alive. Slow node: a long GC pause looks like a crash; a phi-accrual style detector or a longer suspicion timeout, and a rule that a node can refute suspicion, reduce flapping.\n\nSeeds and bootstrap: a new node needs a few known contact points (seed nodes) to join. If every node lists the same single seed, you have recreated a central point. Message size: if you gossip the whole state each time, cost grows with cluster size; send digests and deltas. Security: an unauthenticated gossip port lets anyone inject false state, so real systems encrypt and authenticate (shared keys or TLS).\n\nIn an interview, say what you gossip (membership, load, versions), the interval and fan-out, how long convergence takes for your N, what happens during a partition, and which decisions you route to a consensus system instead.",
      },
    ],
  },

  "sd-actors": {
    recap: [
      "Actor = private state + mailbox + behaviour; one message at a time, so no locks; talk only by asynchronous messages.",
      "Delivery is at most once and ordered per sender and receiver pair; build reliability with acks, retries and idempotent handlers.",
      "Supervisors restart failed children (let it crash); persist or event-source state you cannot lose.",
      "Scale with location transparency and sharding (Orleans grains, Akka cluster sharding); bound mailboxes and never block inside an actor.",
    ],
    deeper: [
      {
        title: "A worked example: a chat room as an actor",
        body: "Model each chat room as one actor whose id is the room id. Its state is the member list and the last 100 messages. Messages it understands: Join(user), Leave(user), Post(user, text). On Post it appends to its history, then sends a Deliver(text) message to the actor of every member (or to each user's connection actor). Because the room handles one message at a time, two people posting at the same moment are put in a clear order with no locks, and the member list cannot change in the middle of a broadcast.\n\nScaling: millions of rooms are fine because most are idle and small. Cluster sharding maps room id to a shard and shard to a node, so any server can receive a request and forward it to the right room. A very busy room (a stream with 500,000 viewers) is the exception: one actor becomes the bottleneck, so you split fan-out into a tree of relay actors. Durability: the room's history is written to a database or log, so a restarted room can reload its last messages.",
      },
      {
        title: "Supervision and 'let it crash'",
        body: "Instead of wrapping everything in defensive code, an actor system arranges actors in a tree and lets failures travel upward. When a child throws, its supervisor decides: Resume (keep the state and carry on), Restart (throw away the state and start fresh), Stop (give up on that child) or Escalate (fail itself and let its parent decide). One-for-one restarts only the failed child; all-for-one restarts all siblings, which fits children that share an assumption.\n\nThis works because a restart gives a known-good state. The things that must survive a restart are kept outside the actor: in a database, or as a log of events replayed to rebuild the state (event sourcing, as in Akka Persistence). Add a restart limit (for example 5 restarts in 1 minute) and a backoff, or a bad message can loop forever: crash, restart, receive the same poison message, crash again. A supervisor that gives up escalates, and the problem becomes visible.",
      },
      {
        title: "Mailboxes, backpressure and blocking",
        body: "A mailbox is a queue, and queues need limits. With an unbounded mailbox, a producer that is faster than the actor makes memory grow until the process falls over, and latency grows long before that. Options: a bounded mailbox that rejects or drops when full (and tell callers), push back to the sender with a bounded request window, or flip the flow so workers pull a batch when ready (the work-pulling pattern).\n\nBlocking is the second trap. An actor that waits on a database call or a lock cannot handle its next message, and on a shared thread pool a few blocked actors can stop every other actor. Keep actors non-blocking: call async clients and receive the result as a message, or run blocking code on a separate dispatcher with its own thread pool. Watch queue depth and message age per actor, and alert on dead letters (messages sent to an actor that no longer exists), which are usually a bug or a shutdown race.",
      },
      {
        title: "Virtual actors and cluster sharding",
        body: "With plain actors you create and track them yourself. Virtual actors (Orleans grains, Dapr actors) remove that: you address an actor by type and id, and the runtime creates it on first use, keeps one active copy in the cluster, and unloads it after it has been idle for a while. The state is loaded from storage on activation and saved on change.\n\nAkka cluster sharding does the same job with explicit shards: an entity id is hashed to a shard id, a coordinator assigns each shard to a node, and messages are routed there, with shards moved when nodes join or leave. Both give you the pattern 'one single-threaded owner per entity': no distributed locks, because all operations on a given user or order go through one actor. The costs are that a node crash means the entity is reactivated elsewhere (so state must be persisted), and a hot entity cannot be spread over several nodes without splitting it.",
      },
      {
        title: "Actors versus threads, channels and queues",
        body: "Threads and locks: threads share memory and you protect it with locks. It is flexible and fast on one machine, but deadlocks, races and priority inversion are easy to create and hard to test. Actors replace shared memory with ownership: state has one owner, everything else asks by message.\n\nChannels (Go, CSP): goroutines send values over named channels. The sender names the channel, not the receiver, which suits pipelines and fan-in or fan-out. Actors name the receiver and carry state with identity, which suits long-lived entities. Message queues and logs (Kafka, SQS): durable, replayable, shared between many services, and consumed by competing workers. An actor mailbox is in memory and private. They combine well: Kafka feeds events in, actors process them per entity, and results are written out.\n\nChoose actors when entities are many, independent and stateful. Avoid them when one operation must change many entities atomically (use a saga or a database transaction), when the work is a CPU-bound parallel loop, or when you need one global order of events.",
      },
    ],
  },
};
