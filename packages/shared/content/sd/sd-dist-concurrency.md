---
id: sd-dist-concurrency
title: Concurrency in distributed systems
area: sd
section: A. Fundamentals
---

## Overview

When multiple servers update shared data, you need a way to prevent lost updates and double actions. Prefer optimistic concurrency at the data layer; use distributed locks only when you must, and make them safe with leases and fencing tokens.

## What to know

1. Locks :: A single database row lock (SELECT … FOR UPDATE) is the simplest correct lock when all writers share one database. It serializes writers on that row; keep transactions short to avoid contention and deadlocks.

2. Optimistic concurrency (version columns, CAS) :: Optimistic concurrency: read the row with its version, write with UPDATE … SET …, version = v+1 WHERE id = ? AND version = v. If zero rows changed, someone else won; re-read and retry. No locks held, great when conflicts are rare. Compare-and-swap in Redis or DynamoDB conditional writes are the same idea.

3. Distributed locks (Redlock caveats, ZooKeeper/etcd) :: Distributed locks coordinate across services that don't share a database. ZooKeeper/etcd locks are built on consensus and session leases, so they're safe. Redis Redlock relies on timing assumptions; a GC pause or clock jump can let two clients believe they hold the lock. Use it only for efficiency, not correctness.

4. Leases :: A lease is a lock with an expiry: the holder must renew it, and if it crashes the lease expires so others can proceed. The catch: a holder that pauses past expiry may still act as if it holds the lease.

5. Fencing tokens :: A fencing token is a number that increases every time the lock is granted. The holder sends it with every write, and the storage rejects writes with a token lower than one it has already seen. This makes an expired holder's late writes harmless.

## Recap

- Prefer optimistic concurrency: UPDATE … SET v=v+1 WHERE id=? AND version=?.
- Distributed lock = lease with TTL from etcd/ZooKeeper; it can expire under you.
- Fencing token: monotonically increasing number checked by the storage.
- Redlock relies on clocks; avoid it when correctness (not just efficiency) matters.

## Go deeper

### Locks inside one database first {point: 0}

Most concurrency problems should be solved in the database before reaching for distributed locks. Atomic single statements: UPDATE accounts SET balance = balance − 100 WHERE id = 1 AND balance ≥ 100 does the check and the change atomically. Unique constraints stop duplicate creation (two concurrent sign-ups with the same email). Row locks: SELECT … FOR UPDATE inside a transaction blocks other writers of those rows until commit; FOR UPDATE SKIP LOCKED lets workers grab different rows from a job table without blocking each other.

Optimistic concurrency: add a version column; read version 7, then UPDATE … SET …, version = 8 WHERE id = ? AND version = 7. If zero rows updated, someone else won; reload and retry or report a conflict to the user. ETags in HTTP (If-Match) carry the same idea to APIs.

Advisory locks (pg_advisory_lock) give named application locks that live in the database, useful for 'only one instance runs this migration/report'. Reach for a separate lock service only when the protected resource isn't in one database.

### Optimistic vs pessimistic in practice {point: 1}

Optimistic (version column / compare-and-set): read with a version, write only if unchanged, retry on conflict. Best when conflicts are rare (profile edits, most inventory updates). Pessimistic (SELECT … FOR UPDATE, distributed lock): block others first. Best when conflicts are frequent and retries are expensive (hot ticket seats), but watch for lock waits and deadlocks.

For counters, avoid both: atomic increments (UPDATE stock = stock − 1 WHERE stock > 0) do the check and write in one statement.

### Leases, Redlock and why fencing matters {point: 3}

A distributed lock is really a lease: it's held for a limited time and must be renewed. The holder can lose it without knowing (a GC pause, a VM freeze, a network partition) while still acting as if it holds it. Any correct design must assume a former holder may still be running.

Redis SET key value NX PX 30000 implements a simple lease on one Redis node; release must compare the value (a Lua script) so you don't delete someone else's lock. Redlock acquires the lock on a majority of independent Redis nodes and depends on bounded clock drift and process pauses; critics (notably Martin Kleppmann) argue it can't guarantee safety without fencing. It's fine for efficiency (avoid duplicate work), not for correctness.

For correctness use a consensus system (etcd, ZooKeeper, Consul) that provides a monotonically increasing token with each acquisition, and make the protected resource check the token (fencing). If the resource can't check tokens, design the operation to be idempotent so a duplicate execution is harmless.

### Why a lock isn't enough: fencing tokens {point: 4}

Client A gets a lease, then pauses (GC, VM stall) past its TTL. The lock service gives the lease to B, which writes. A wakes up still believing it holds the lock and writes too: corruption. A TTL can't prevent this because A can't know it was paused.

Fix: the lock service returns a fencing token that increases with every grant (etcd revision, ZooKeeper zxid). Every write carries the token, and the storage rejects tokens lower than the highest it has seen. A's late write (token 33) loses to B's (token 34).

```
-- storage-side check
UPDATE files SET content = $1, fence = $2
WHERE path = $3 AND fence < $2;   -- 0 rows → stale lock holder
```

### Avoiding locks altogether

Often the best distributed concurrency control is none. Techniques: partition ownership (each order id hashes to one partition consumer, which processes its events sequentially, so no two workers touch the same order); single-writer principle (one service owns each piece of data, and others send it commands); idempotent operations (applying twice equals applying once, keyed by request id); commutative updates (counters as increments rather than read-modify-write; CRDTs); and queues for serialization (all bookings for one flight go through one queue partition).

In interviews, when asked 'how do you stop two workers processing the same job?', a strong answer layers these: the queue gives each message to one consumer at a time (visibility timeout / partition assignment), the job's state transition uses a conditional update (status = 'running' WHERE status = 'pending'), and the job's side effects are idempotent so a retry after a crash is safe.

## Interview questions

- Two users book the last seat at the same time. How do you ensure only one succeeds?
- Why isn't a Redis lock with a TTL enough for correctness?

## Common mistakes

- Holding a lock across a slow network call or user think-time.
