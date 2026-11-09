---
id: sd-consistency
title: Consistency models
area: sd
section: A. Fundamentals
---

## Overview

A consistency model says what a reader may see after writes, especially with replicas. Stronger models are easier to program against but cost latency and availability; weaker ones are fast but expose stale or reordered data. Pick per use case.

## What to know

1. Strong :: Strong (linearizable): every read sees the latest completed write, as if there were one copy. Needed for things like account balances, inventory counts or leader election. Costs a quorum or leader round trip on every operation.

2. Sequential :: Sequential: all clients see all operations in the same order, and each client's operations appear in its program order, but that order needn't match real time. Weaker than linearizable, stronger than causal.

3. Causal :: Causal: operations that are causally related (a reply after the message it answers) are seen in that order by everyone; unrelated operations may be seen in different orders. A good fit for comments and chat; tracked with version vectors or logical clocks.

4. Eventual :: Eventual: if writes stop, all replicas converge to the same value eventually; until then reads may be stale. Fine for like counts, view counts, profile pictures, DNS. Needs a conflict-resolution rule (last-write-wins, CRDTs, app merge).

5. Read-your-writes :: Read-your-writes: a user always sees their own updates (after editing a profile, they see the edit), even if others see it later. Implement by reading from the leader for a short time after a write, or by tracking the write's version and waiting for a replica to catch up.

6. Monotonic reads :: Monotonic reads: a user never sees data go backwards in time (seeing a comment, then refreshing and it's gone). Implement by pinning a user to one replica or by tracking the last version they saw.

## Recap

- Strong (linearizable): reads see the latest write, as if one copy.
- Eventual: replicas converge; reads may be stale.
- Read-your-writes: route the writer's reads to the leader for a short window.
- Monotonic reads: pin a user to one replica so time never goes backwards.

## Go deeper

### The models on one timeline {point: 0}

Imagine a key x written to 1 at time t1 and to 2 at t2, with several clients reading.

Linearizable (strong): once the write of 2 completes, every later read anywhere returns 2; the system behaves like a single copy with operations in real-time order. Needs coordination (single leader with synchronous replication, or consensus) and costs latency, plus availability during partitions.

Sequential: all clients see operations in the same order, consistent with each client's program order, but not necessarily real time. A client might still read 1 after another finished writing 2, as long as everyone agrees on one order.

Causal: operations that are causally related (I read your post, then reply) are seen in that order by everyone; unrelated concurrent operations may be seen in different orders. Achievable while staying available during partitions, with dependency tracking (vector clocks).

Eventual: if writes stop, all replicas converge; meanwhile reads can return old values and different replicas can disagree. The cheapest and most available.

Session guarantees (read-your-writes, monotonic reads, monotonic writes, writes-follow-reads) are per-client promises layered on eventual consistency; they fix the most visible anomalies cheaply.

### How real systems provide these {point: 3}

Single-leader databases (Postgres, MySQL): reads from the leader are strongly consistent; reads from async replicas are eventually consistent with replication lag. Synchronous replication to one standby gives durability on failover but adds a round trip to every commit.

Dynamo-style stores (Cassandra, DynamoDB): tunable per request. Cassandra QUORUM writes + QUORUM reads give read-your-latest for non-concurrent writes; ONE is fastest and eventually consistent. DynamoDB offers eventually consistent reads (default, half price) and strongly consistent reads from the leader replica.

Consensus-backed stores (etcd, ZooKeeper, Spanner, CockroachDB): linearizable reads and writes through a Raft/Paxos leader; Spanner adds globally ordered transactions using synchronized clocks (TrueTime). Caches (Redis replicas, CDN) are eventually consistent with the source.

When designing, write a small table: data → consistency needed → mechanism. Example: inventory count → strong (conditional update on the leader); product description → eventual (cache with TTL + invalidation); user's own profile edits → read-your-writes (read from leader for 10 seconds after a write).

### Conflicts and convergence {point: 3}

When replicas accept writes independently (multi-leader, leaderless, offline clients), concurrent writes conflict and the system must converge. Options:

Last-write-wins: keep the write with the highest timestamp. Simple but loses data silently, and clock skew decides the winner. Acceptable for caches and 'latest location' style data.

Version vectors: each replica tracks a counter per replica; comparing vectors tells you whether one write happened-before another or they're concurrent. Concurrent versions (siblings) are returned to the application to merge.

CRDTs: data types designed so concurrent updates always merge deterministically: grow-only counters, PN-counters (increments and decrements), OR-sets (add/remove), registers, and sequence CRDTs for collaborative text. Used by Riak, Redis Enterprise active-active, and collaborative editors.

Application-level merges: a shopping cart unions items; a document keeps both versions as a conflict copy. The best strategy is often to avoid conflicts by giving each record a single owner (home region or partition) that serializes its writes.

### Session guarantees in practice {point: 4}

A user posts a comment (written to the leader) then refreshes and reads from a lagging follower: the comment is missing. Read-your-writes fixes: read from the leader for N seconds after the user writes, or track the write's log position and only read from replicas that have caught up to it.

Monotonic reads: if a user's reads bounce between a fresh and a stale replica, items appear then disappear. Pin the session to one replica (hash of user id). Consistent prefix: in a partitioned system, an answer can appear before its question; keep causally related writes in the same partition.

### Choosing per feature

Bank balance, inventory decrement, unique username: strong consistency (single leader, transactions, or consensus). Like counts, view counts, feed contents, search index: eventual is fine and much cheaper. Profile edits: read-your-writes is usually enough.

In an interview, name the requirement per data type rather than picking one model for the whole system; it shows you know where consistency costs latency and availability.

## Interview questions

- Which consistency model does a like counter need? A bank transfer? A chat thread?
- A user updates their profile and refreshes, but sees the old version. Why, and how do you fix it?

## Common mistakes

- Saying 'eventual consistency' without explaining how conflicts are resolved.
