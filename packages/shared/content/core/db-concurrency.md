---
id: db-concurrency
title: Concurrency control
area: core
section: Databases (DBMS)
---

## Overview

Concurrency control lets many transactions run at once while keeping isolation. Two families: locking (pessimistic) and versioning or validation (optimistic, MVCC).

## What to know

1. Two-phase locking :: Two-phase locking: a transaction acquires locks as it goes (growing phase) and releases none until it commits (strict 2PL holds them all until commit). This guarantees serializability but readers and writers block each other and deadlocks are possible.

2. Shared vs exclusive locks, lock granularity :: Shared (read) locks are compatible with each other; exclusive (write) locks are compatible with nothing. Granularity: row locks give more concurrency with more overhead; table locks are cheap but block more. Intention locks let a table lock coexist safely with row locks.

3. MVCC :: Multi-version concurrency control: writes create new row versions tagged with transaction ids, and readers see the version matching their snapshot, so reads never block writes and writes never block reads. Old versions need garbage collection (vacuum).

4. Optimistic vs pessimistic locking :: Pessimistic: lock first (SELECT … FOR UPDATE), which is good when conflicts are frequent. Optimistic: proceed without locks and check a version or timestamp at commit, retrying on conflict, which is good when conflicts are rare (most web apps). Under heavy contention, optimistic retries waste work.

5. Deadlock detection in databases :: The database keeps a wait-for graph; when it finds a cycle, it aborts one transaction (the victim) with a deadlock error. Applications must retry. Lock rows in a consistent order to make deadlocks rarer.

## Recap

- 2PL: growing phase acquires locks, shrinking releases; strict 2PL holds until commit.
- Shared locks for reads, exclusive for writes; row vs page vs table granularity.
- MVCC: writers create new versions; readers see a snapshot without locking.
- Optimistic (version check at commit) for low contention; pessimistic (lock first) for high contention.

## Go deeper

### Two-phase locking in detail {point: 0}

2PL: a transaction acquires locks as it goes (growing phase) and, once it releases any lock, may not acquire new ones (shrinking phase). This guarantees serializable schedules. Strict 2PL holds all exclusive locks until commit or abort, preventing others from reading uncommitted data (avoids cascading aborts); rigorous 2PL holds all locks until the end. Most lock-based databases use strict 2PL.

Lock modes: shared (S) for reading, compatible with other S; exclusive (X) for writing, compatible with nothing. Intention locks (IS, IX) at the table level announce row-level locks below, so a request for a table lock can check compatibility without scanning every row lock. To prevent phantoms, databases lock ranges (predicate or next-key/gap locks in InnoDB), not just existing rows.

Granularity: row locks maximize concurrency but cost memory and management; table locks are cheap but serialize; some databases escalate many row locks to a table lock under pressure.

### How MVCC lets readers and writers coexist {point: 2}

In Postgres each row version has xmin (creating transaction) and xmax (deleting/updating transaction). An UPDATE writes a new version and sets xmax on the old one. A transaction's snapshot lists which transactions were committed when it started; it sees a version if xmin is committed-and-visible and xmax isn't. Readers never block writers and vice versa; writers still block other writers of the same row.

Old versions are garbage-collected by VACUUM once no snapshot can see them, so long-running transactions cause bloat.

### MVCC implementations compared {point: 2.5}

Postgres: new row versions are written into the table (heap); old versions remain until VACUUM removes them; each version has xmin/xmax transaction ids; indexes point to versions, and HOT updates avoid index changes when indexed columns don't change. Long transactions or stalled vacuum cause bloat; transaction id wraparound must be prevented by vacuum freezing.

MySQL InnoDB: the row in the clustered index holds the latest version; older versions are reconstructed from undo logs in the rollback segment; purge threads clean undo once no read view needs it. Long transactions make undo grow and slow reads that must walk long version chains.

Oracle: undo segments similarly reconstruct read-consistent versions; 'snapshot too old' errors occur when needed undo was overwritten.

In all of them, readers see a consistent snapshot without blocking writers, but writes to the same row still serialize, and snapshot age has a cost.

### Optimistic vs pessimistic, with numbers {point: 3}

Pessimistic locking (SELECT … FOR UPDATE, then update) blocks competitors while the lock is held. Throughput under contention is bounded by 1 / (lock hold time): if each transaction holds a hot row for 5 ms, that row supports ~200 updates per second, no matter how many servers you add. Keep hold times short and avoid network calls while holding locks.

Optimistic concurrency (version check at write) never blocks, but conflicting transactions fail and retry. With low contention (profile edits), nearly all succeed on the first try and throughput is high. With high contention on one row (a flash-sale counter), most attempts fail and retry, wasting work; pessimistic locking or a different design (queueing, splitting the counter, atomic decrements) is better.

Hot rows are a design smell at scale: split counters into shards summed on read, queue updates through a single writer, or use atomic increments in Redis with periodic persistence.

### Deadlocks inside the database {point: 4}

T1 updates row A then B; T2 updates B then A. The database's lock manager builds a wait-for graph, detects the cycle (Postgres checks after deadlock_timeout, ~1 s) and aborts one with a deadlock error. The app should retry it.

Prevent most of them by touching rows in a consistent order (sort ids before updating), keeping transactions short, and using the right indexes (missing indexes make UPDATEs lock more rows or ranges than needed).

## Interview questions

- MVCC vs two-phase locking?
- Optimistic vs pessimistic locking for an inventory decrement during a flash sale?
