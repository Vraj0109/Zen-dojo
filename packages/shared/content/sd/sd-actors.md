---
id: sd-actors
title: The actor model
area: sd
section: C. Building blocks
---

## Overview

In the actor model the unit of concurrency is an actor: a small object that owns private state and a mailbox, and handles one message at a time. Actors never share memory. They only send each other asynchronous messages, so you need no locks inside an actor, and millions of them can run on a handful of threads. Erlang, Akka, Orleans, Dapr actors and Ray use this idea. It maps well to systems made of many independent stateful things (chat rooms, game sessions, devices, shopping carts), and it gives you failure handling by design: a parent actor supervises its children and restarts them when they crash.

## What to know

1. Actors, state and mailboxes :: An actor has three parts: state nobody else can touch, a mailbox queue, and behaviour that runs for one message at a time. When it handles a message it can send messages to other actors, create new actors, and decide how to handle the next message. Because only one message runs at a time inside one actor, its state needs no locks. Concurrency comes from having many actors, not from many threads touching the same data. An Erlang process starts at a few kilobytes, so millions of actors in one machine is normal.

2. Message delivery and ordering :: Messages are asynchronous and one-way: the sender does not wait. By default delivery is at most once, and the only ordering you usually get is between one sender and one receiver. Anything stronger is your job: acknowledgements, retries with idempotent handlers, and a timeout on request-reply (often called ask). Messages should be immutable, so sharing one between actors cannot cause a data race. That is the actor version of 'share by communicating'.

3. Supervision and let it crash :: Actors are built for failure: let it crash. A parent supervises its children. When a child throws, the supervisor chooses: resume, restart the child with fresh state, stop it, or escalate to its own parent. Restart one child (one-for-one) or all siblings together (one-for-all) depending on whether they depend on each other. Because the state is lost on restart, an actor that matters keeps its state in a store or an event log (event sourcing) and rebuilds from it. This is how Erlang systems reach very high uptime.

4. Location transparency and sharding :: An actor is addressed by a name or reference, not by where it runs, so the same code works locally and across machines (location transparency). To scale out, cluster sharding hashes an entity id to a shard and each shard lives on one node, and moves if nodes join or leave. Orleans calls them virtual actors (grains): you call by id, the system activates the actor on demand, guarantees a single active copy, and removes it when idle. That is a natural fit for one actor per user, device or order.

5. Backpressure and blocking :: A mailbox that is allowed to grow without limit hides trouble: a fast producer and a slow actor means memory growth until the process dies. Use bounded mailboxes with a policy (reject, drop oldest, or push back to the sender), or let consumers pull work when ready. Never block inside an actor on a slow call, because it stops the whole mailbox and may starve the thread pool; run blocking work on a separate pool or turn it into an async message. Messages that cannot be delivered go to dead letters, which you should monitor.

6. When to use actors :: Pick actors when you have many independent, stateful entities, each doing sequential work, with fault isolation between them. Compare with the alternatives: threads and locks share memory and risk deadlocks and races; CSP channels (Go) name the pipe rather than the receiver; queues such as Kafka are durable and replayable but are infrastructure, not a programming model. Actors are a poor fit for operations that must be atomic across many actors (use a saga or a database transaction), for CPU-bound parallel loops, and when you need one global order of events.

## Recap

- Actor = private state + mailbox + behaviour; one message at a time, so no locks; talk only by asynchronous messages.
- Delivery is at most once and ordered per sender and receiver pair; build reliability with acks, retries and idempotent handlers.
- Supervisors restart failed children (let it crash); persist or event-source state you cannot lose.
- Scale with location transparency and sharding (Orleans grains, Akka cluster sharding); bound mailboxes and never block inside an actor.

## Go deeper

### A worked example: a chat room as an actor {point: 0}

Model each chat room as one actor whose id is the room id. Its state is the member list and the last 100 messages. Messages it understands: Join(user), Leave(user), Post(user, text). On Post it appends to its history, then sends a Deliver(text) message to the actor of every member (or to each user's connection actor). Because the room handles one message at a time, two people posting at the same moment are put in a clear order with no locks, and the member list cannot change in the middle of a broadcast.

Scaling: millions of rooms are fine because most are idle and small. Cluster sharding maps room id to a shard and shard to a node, so any server can receive a request and forward it to the right room. A very busy room (a stream with 500,000 viewers) is the exception: one actor becomes the bottleneck, so you split fan-out into a tree of relay actors. Durability: the room's history is written to a database or log, so a restarted room can reload its last messages.

### Supervision and 'let it crash' {point: 2}

Instead of wrapping everything in defensive code, an actor system arranges actors in a tree and lets failures travel upward. When a child throws, its supervisor decides: Resume (keep the state and carry on), Restart (throw away the state and start fresh), Stop (give up on that child) or Escalate (fail itself and let its parent decide). One-for-one restarts only the failed child; all-for-one restarts all siblings, which fits children that share an assumption.

This works because a restart gives a known-good state. The things that must survive a restart are kept outside the actor: in a database, or as a log of events replayed to rebuild the state (event sourcing, as in Akka Persistence). Add a restart limit (for example 5 restarts in 1 minute) and a backoff, or a bad message can loop forever: crash, restart, receive the same poison message, crash again. A supervisor that gives up escalates, and the problem becomes visible.

### Virtual actors and cluster sharding {point: 3}

With plain actors you create and track them yourself. Virtual actors (Orleans grains, Dapr actors) remove that: you address an actor by type and id, and the runtime creates it on first use, keeps one active copy in the cluster, and unloads it after it has been idle for a while. The state is loaded from storage on activation and saved on change.

Akka cluster sharding does the same job with explicit shards: an entity id is hashed to a shard id, a coordinator assigns each shard to a node, and messages are routed there, with shards moved when nodes join or leave. Both give you the pattern 'one single-threaded owner per entity': no distributed locks, because all operations on a given user or order go through one actor. The costs are that a node crash means the entity is reactivated elsewhere (so state must be persisted), and a hot entity cannot be spread over several nodes without splitting it.

### Mailboxes, backpressure and blocking {point: 4}

A mailbox is a queue, and queues need limits. With an unbounded mailbox, a producer that is faster than the actor makes memory grow until the process falls over, and latency grows long before that. Options: a bounded mailbox that rejects or drops when full (and tell callers), push back to the sender with a bounded request window, or flip the flow so workers pull a batch when ready (the work-pulling pattern).

Blocking is the second trap. An actor that waits on a database call or a lock cannot handle its next message, and on a shared thread pool a few blocked actors can stop every other actor. Keep actors non-blocking: call async clients and receive the result as a message, or run blocking code on a separate dispatcher with its own thread pool. Watch queue depth and message age per actor, and alert on dead letters (messages sent to an actor that no longer exists), which are usually a bug or a shutdown race.

### Actors versus threads, channels and queues {point: 5}

Threads and locks: threads share memory and you protect it with locks. It is flexible and fast on one machine, but deadlocks, races and priority inversion are easy to create and hard to test. Actors replace shared memory with ownership: state has one owner, everything else asks by message.

Channels (Go, CSP): goroutines send values over named channels. The sender names the channel, not the receiver, which suits pipelines and fan-in or fan-out. Actors name the receiver and carry state with identity, which suits long-lived entities. Message queues and logs (Kafka, SQS): durable, replayable, shared between many services, and consumed by competing workers. An actor mailbox is in memory and private. They combine well: Kafka feeds events in, actors process them per entity, and results are written out.

Choose actors when entities are many, independent and stateful. Avoid them when one operation must change many entities atomically (use a saga or a database transaction), when the work is a CPU-bound parallel loop, or when you need one global order of events.

## Interview questions

- How does the actor model avoid locks, and what do you give up for that?
- What does 'let it crash' mean, and what makes it safe?
- What guarantees do you get on message delivery and ordering, and how do you build reliability on top?
- Design a chat service or a game lobby with actors. What is an actor, what is its state, and how do you scale it?
- How is the actor model different from a message queue or from Go channels?

## Common mistakes

- Blocking inside an actor (a database call, a lock, Thread.sleep): the mailbox stalls and, on a shared thread pool, other actors starve.
- Assuming messages are delivered exactly once or in a global order: they are not; make handlers idempotent and keep ordering assumptions per sender and receiver pair.
- Giant actors that hold too much state or do too much work: they become the bottleneck that locks were. Prefer many small ones, one per entity.
- An unbounded mailbox with no backpressure: it looks fine until the producer outpaces the consumer.
