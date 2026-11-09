---
id: sd-sql
title: SQL internals
area: sd
section: B. Data storage
---

## Overview

Relational databases are the default choice: transactions, constraints, flexible queries, and they scale further than people think (read replicas, partitioning, a big primary). Know how indexes and isolation work so you can say why a query is fast and a transfer is safe.

## What to know

1. B-tree, composite and covering indexes :: A B-tree index keeps keys sorted in a shallow tree of disk pages, so lookups and range scans take a few page reads. A composite index on (a, b) serves queries filtering on a, or a and b, but not b alone (leftmost-prefix rule). A covering index includes every column the query needs, so the table isn't touched at all.

2. Query plans :: EXPLAIN shows the plan the optimizer chose: index scan vs full table scan, join order and join algorithm, estimated rows. Check it for slow queries; a sequential scan on a big table or a bad row estimate usually explains the problem.

3. Transactions and isolation levels (read committed, repeatable read, snapshot, serializable) :: Read committed: no dirty reads, but repeated reads can change. Repeatable read / snapshot isolation: the transaction sees one consistent snapshot, but write skew is still possible. Serializable: as if transactions ran one at a time; safest, with more aborts or locking. Postgres defaults to read committed, MySQL InnoDB to repeatable read.

4. MVCC :: Multi-version concurrency control keeps old row versions so readers see a snapshot without blocking writers, and writers don't block readers. Old versions are cleaned up later (vacuum in Postgres, purge in InnoDB). Long transactions keep old versions alive and bloat the table.

5. Deadlocks :: Two transactions each hold a lock the other needs. The database detects the cycle and aborts one, so the application must retry. Avoid deadlocks by always locking rows in the same order and keeping transactions short.

## Recap

- Composite index (a, b, c) serves a, a+b, a+b+c prefixes; covering = no table lookup.
- EXPLAIN: look for seq scans on big tables, bad row estimates, sorts spilling to disk.
- Postgres default READ COMMITTED; snapshot isolation prevents most anomalies but not write skew.
- MVCC: readers don't block writers; old versions cleaned by vacuum.

## Go deeper

### Designing an index for a query {point: 0}

Query: WHERE tenant_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 50. Index (tenant_id, status, created_at DESC): equality columns first, then the sort column, so the database walks the index in order and stops after 50 rows, no sort.

Add the selected columns with INCLUDE (Postgres) to make it covering (index-only scan). Range conditions stop index usage for later columns: (a, b) with WHERE a > 5 AND b = 3 can't use b efficiently, so put equality columns before range columns.

```
CREATE INDEX tickets_open ON tickets (tenant_id, status, created_at DESC)
  INCLUDE (title, assignee_id);
EXPLAIN ANALYZE SELECT title, assignee_id FROM tickets
WHERE tenant_id = 42 AND status = 'open'
ORDER BY created_at DESC LIMIT 50;   -- expect: Index Only Scan, no Sort
```

### How a query runs {point: 1}

The database parses SQL into a tree, rewrites it (inlining views, simplifying predicates), then the planner enumerates candidate plans: which index or scan to use per table, the join order, and the join algorithm. It estimates each plan's cost from table statistics (row counts, value distributions, histograms, distinct counts) and picks the cheapest. The executor then pulls rows through the plan's operators.

This explains most performance surprises. Stale statistics give wrong row estimates, which give wrong join choices (a nested loop over 2 million rows that the planner thought was 20). Correlated columns (city and zip code) fool estimates that assume independence; extended statistics fix that. Parameterized queries may get a generic plan that's bad for skewed values.

Practical habits: run EXPLAIN ANALYZE on slow queries, compare estimated vs actual rows at each node, keep autovacuum/analyze healthy, and design indexes for your top queries rather than adding one per column.

### Write skew, the anomaly snapshot isolation misses {point: 2}

Two doctors are on call; rule: at least one must stay. Both run 'SELECT count(*) FROM oncall WHERE on_call' (sees 2), then each sets themselves off call. Under snapshot isolation both commit (they wrote different rows), leaving zero on call.

Fixes: SERIALIZABLE isolation (Postgres SSI detects it and aborts one), SELECT … FOR UPDATE on the rows the decision depends on, or a constraint the database can enforce. Interviewers like this example because it shows isolation levels aren't just about dirty reads.

### Transactions, MVCC and locking working together {point: 3}

In Postgres and InnoDB, plain reads use MVCC snapshots: a transaction sees the database as of its snapshot, so readers never wait for writers. Writes take row-level locks: two transactions updating the same row serialize (the second waits, then either proceeds on the new version or, under repeatable read, aborts with a serialization error).

Isolation levels decide when the snapshot is taken and which anomalies are blocked. READ COMMITTED takes a new snapshot per statement, so two SELECTs in one transaction can see different data. REPEATABLE READ / snapshot isolation keeps one snapshot for the whole transaction. SERIALIZABLE adds detection of read-write dependency cycles (Postgres SSI) or uses strict two-phase locking with range locks (classic implementations).

Patterns that matter in system design: use conditional updates or SELECT … FOR UPDATE for read-modify-write; keep transactions short; retry on serialization failures and deadlocks; and avoid long-running transactions, which block vacuum and hold locks. For queues in SQL, FOR UPDATE SKIP LOCKED lets many workers claim different rows safely.

### Scaling a relational database step by step

1) Tune: right indexes, connection pooling (PgBouncer), fix N+1 queries, add caching. 2) Scale up: more CPU/RAM/faster disks; buys a lot. 3) Read replicas: route read-heavy, lag-tolerant queries there. 4) Partition big tables by time or key within one database (native partitioning) so old data can be dropped cheaply and indexes stay small. 5) Move workloads out: analytics to a warehouse via CDC, search to Elasticsearch, blobs to S3, hot counters to Redis. 6) Shard: split data across several databases by a shard key (customer id, tenant id), with a routing layer (application-level, Vitess for MySQL, Citus for Postgres). 7) Or adopt a distributed SQL database (CockroachDB, Spanner, YugabyteDB) that shards and replicates for you with consensus, at the cost of higher write latency.

In interviews, show you know this order, and that a single well-run relational database goes surprisingly far.

## Interview questions

- Why might a query not use the index you created?
- Explain write skew with an example and how to prevent it.
- When does a relational database stop being enough?

## Common mistakes

- Indexing every column; each index slows writes and uses memory.
