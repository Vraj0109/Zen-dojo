import type { Section } from "./types";

// More deeper sections for databases (appended after deep-core.ts).

export const MORE_DB: Record<string, Section[]> = {
  "db-relational": [
    {
      title: "Keys and constraints",
      body: "A super key is any set of columns that uniquely identifies a row; a candidate key is a minimal super key (remove any column and it's no longer unique); the primary key is the candidate key you choose as the main identifier; the rest are alternate keys (enforce them with UNIQUE constraints). Surrogate keys (auto-increment or UUID) are stable and compact; natural keys (email, ISBN) carry meaning but can change, so many designs use a surrogate primary key plus a unique constraint on the natural key.\n\nForeign keys enforce referential integrity: a child row must reference an existing parent. ON DELETE behaviour: RESTRICT (refuse), CASCADE (delete children), SET NULL. CHECK constraints enforce rules (quantity > 0, end_date > start_date), NOT NULL avoids three-valued logic surprises. Constraints are the cheapest correctness guarantee you can get, because the database enforces them under concurrency, unlike application checks.",
    },
    {
      title: "Joins and how they're executed",
      body: "INNER JOIN returns matching pairs. LEFT (OUTER) JOIN keeps every left row, filling NULLs when there's no match; RIGHT is the mirror; FULL OUTER keeps both sides. CROSS JOIN is the Cartesian product. A self join joins a table to itself (employees with their managers). Semi-join (EXISTS / IN) returns left rows that have a match without duplicating them; anti-join (NOT EXISTS) returns rows without a match.\n\nA common trap: putting a condition on the right table in WHERE after a LEFT JOIN (WHERE o.status = 'paid') silently turns it into an inner join; put it in the ON clause to keep unmatched rows.\n\nExecution: nested loop (for each outer row, look up matches; fast when the outer side is small and the inner side has an index), hash join (build a hash table on the smaller input, probe with the larger; best for large unsorted equality joins), merge join (both inputs sorted on the key; stream through both). The optimizer picks based on row estimates and available indexes.",
      code: `-- Employees and their managers (self join), keeping employees without a manager
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;

-- Trap: this LEFT JOIN behaves like an INNER JOIN
SELECT c.name, o.id FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.status = 'paid';                       -- customers without orders disappear
-- Fix: move the filter into ON
SELECT c.name, o.id FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'paid';`,
    },
    {
      title: "Aggregation, GROUP BY and window functions",
      body: "GROUP BY collapses rows into groups; every selected column must be grouped or aggregated (COUNT, SUM, AVG, MIN, MAX). WHERE filters rows before grouping, HAVING filters groups after. COUNT(*) counts rows, COUNT(col) skips NULLs, COUNT(DISTINCT col) counts unique values.\n\nWindow functions compute values across related rows without collapsing them: aggregate OVER (PARTITION BY … ORDER BY … frame). Ranking: ROW_NUMBER (unique 1,2,3), RANK (ties share, gaps after: 1,1,3), DENSE_RANK (ties share, no gaps: 1,1,2). Offsets: LAG/LEAD for previous/next row (day-over-day change). Running totals: SUM(x) OVER (ORDER BY day ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW). Moving averages: ROWS BETWEEN 6 PRECEDING AND CURRENT ROW.\n\nCommon interview queries: top N per group (rank in a subquery, filter rank ≤ N), consecutive streaks (gaps and islands: date − ROW_NUMBER() days is constant within a streak), and percent of total (x / SUM(x) OVER ()).",
      code: `-- Longest login streak per user (gaps and islands)
WITH d AS (
  SELECT DISTINCT user_id, login_date FROM logins
), g AS (
  SELECT user_id, login_date,
         login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date))::int AS grp
  FROM d
)
SELECT user_id, MAX(cnt) AS longest_streak FROM (
  SELECT user_id, grp, COUNT(*) AS cnt FROM g GROUP BY user_id, grp
) s GROUP BY user_id;`,
    },
  ],
  "db-normalization": [
    {
      title: "Functional dependencies and normal forms, precisely",
      body: "A functional dependency X → Y means that rows agreeing on X always agree on Y (student_id → student_name). Normal forms restrict which dependencies may exist.\n\n1NF: every column holds atomic values (no lists in a cell, no repeating column groups like phone1, phone2, phone3). 2NF: in 1NF, and no non-key column depends on only part of a composite key. 3NF: in 2NF, and no non-key column depends on another non-key column (no transitive dependency), or more precisely, for every X → A either X is a super key or A is part of a candidate key. BCNF: for every non-trivial X → Y, X is a super key. BCNF is stricter than 3NF; the difference appears with overlapping candidate keys, and a BCNF decomposition may lose the ability to enforce some dependencies within one table.\n\nDecompositions must be lossless (joining the pieces gives back exactly the original rows), which holds when the common columns form a key of one of the pieces.",
    },
    {
      title: "Worked example: course enrolments",
      body: "Start: Enrolment(student_id, course_id, student_name, course_title, instructor, instructor_office, grade), key (student_id, course_id).\n\nDependencies: student_id → student_name; course_id → course_title, instructor; instructor → instructor_office; (student_id, course_id) → grade.\n\n2NF violations: student_name depends only on student_id; course_title and instructor depend only on course_id. Split out Student(student_id, student_name) and Course(course_id, course_title, instructor). Enrolment(student_id, course_id, grade) remains.\n\n3NF violation in Course: instructor → instructor_office is transitive. Split Instructor(instructor, instructor_office); Course keeps instructor as a foreign key.\n\nResult: Student, Course, Instructor, Enrolment. Each fact is stored once: changing an instructor's office touches one row, and you can store a course with no students. Explaining this in four steps is a common DBMS interview question.",
    },
    {
      title: "Denormalization techniques and their costs",
      body: "Denormalize to speed up reads when joins or aggregations on hot paths are too slow, after measuring. Techniques: duplicate a column (order stores customer_name for display), store precomputed aggregates (post.comment_count, account.balance), materialized views (precomputed query results refreshed on a schedule or incrementally), summary tables for dashboards, and embedding child data in documents (NoSQL).\n\nCosts: extra storage, write amplification (one change updates several places), and risk of inconsistency. Keep copies correct with triggers, updates in the same transaction, or asynchronous event-driven updates (accepting short staleness), and add reconciliation jobs that recompute and compare.\n\nAnalytics schemas (star schemas, wide tables) are deliberately denormalized because they're read-mostly and loaded in batches. OLTP schemas should start normalized and denormalize specific hot spots.",
    },
  ],
  "db-indexing": [
    {
      title: "Index types beyond the B-tree",
      body: "Hash indexes: O(1) equality lookups, no range queries or ordering; Postgres hash indexes and in-memory engines use them, but B-trees are usually just as good for equality. Bitmap indexes (data warehouses, Oracle): a bitmap per distinct value, efficient for low-cardinality columns combined with AND/OR. GIN (generalized inverted index, Postgres): for values containing many elements: arrays, JSONB keys, full-text search terms. GiST and SP-GiST: geometric data, ranges, nearest-neighbour searches (PostGIS). BRIN (block range index): tiny summaries (min/max per block range) for huge tables physically ordered by the column, like append-only time-series. Trigram indexes (pg_trgm): speed up LIKE '%term%' and fuzzy matching.\n\nPartial indexes index only rows matching a condition (WHERE status = 'open'), smaller and faster for skewed queries. Expression indexes index a computed value (LOWER(email)). Unique indexes enforce constraints. Covering indexes include extra columns to allow index-only scans.",
    },
    {
      title: "Clustered vs secondary, and costs of indexes",
      body: "A clustered index determines the physical order of rows: InnoDB stores rows inside the primary key B-tree, so primary-key range scans are sequential, and secondary indexes store the primary key as the pointer (a secondary lookup = secondary index search + primary index search). Postgres tables are heaps (unordered); every index, including the primary key, points to a heap tuple location, and CLUSTER can reorder once but isn't maintained.\n\nIndexes aren't free: each insert, update of an indexed column, and delete must update every relevant index (write amplification), they consume memory and disk, and too many indexes slow writes and bloat backups. Unused indexes should be dropped (Postgres pg_stat_user_indexes shows usage).\n\nSelectivity matters: an index helps when a query reads a small fraction of rows; for large fractions, a sequential scan is cheaper because random index-driven reads cost more per row than sequential reads.",
    },
    {
      title: "Composite index design rules",
      body: "An index on (a, b, c) is sorted by a, then b within each a, then c. It supports WHERE a = ?, WHERE a = ? AND b = ?, WHERE a = ? AND b = ? AND c = ?, ORDER BY a, b, and WHERE a = ? ORDER BY b. It can't seek on b alone (no leading column), and a range on a (a > 5) stops b from being used for seeking (b is only filtered after).\n\nRules of thumb: equality columns first, then the column used for sorting or range, then extra columns to cover the query; put the most selective equality column first only when other queries also need it as a prefix. One well-designed composite index often replaces several single-column indexes.\n\nExample: queries 'orders of customer X, newest first' and 'orders of customer X with status Y, newest first'. Index (customer_id, status, created_at DESC) serves the second fully but the first only for customer_id with a sort; (customer_id, created_at DESC) serves the first. Choose based on query frequency, or keep both if both are hot.",
    },
  ],
  "db-transactions": [
    {
      title: "How each ACID property is implemented",
      body: "Atomicity: the database logs changes (WAL / redo log, plus undo information or old row versions) so it can roll back an aborted transaction and, after a crash, undo transactions that didn't commit. Consistency: constraints, triggers and cascades checked at statement or commit time keep data valid according to defined rules; the application is responsible for business invariants the schema doesn't express. Isolation: locking and/or MVCC control what concurrent transactions see and prevent conflicting writes. Durability: commit returns only after the WAL record is flushed to stable storage (fsync); replication can add durability across machines.\n\nRelaxing durability for speed is possible: Postgres synchronous_commit = off returns before the flush (a crash can lose the last fraction of a second of commits, but never corrupts data); MySQL innodb_flush_log_at_trx_commit = 2 is similar. Mentioning these trade-offs shows practical understanding.",
    },
    {
      title: "Savepoints, nested work and error handling",
      body: "A savepoint marks a point inside a transaction to which you can roll back without aborting the whole transaction: SAVEPOINT s1; … ROLLBACK TO SAVEPOINT s1; RELEASE SAVEPOINT s1. ORMs use savepoints to implement nested transactions (a nested 'transaction' is a savepoint inside the outer one).\n\nIn Postgres, once a statement in a transaction fails, the transaction is aborted and every further statement fails until ROLLBACK, unless you rolled back to a savepoint. Use savepoints when you want to try an insert and handle a unique violation without losing the transaction.\n\nTransaction scoping in apps: one transaction per unit of work (one request handler or one message), opened as late and committed as early as possible. Frameworks' declarative transactions (@Transactional) should not wrap remote calls; if a payment API call happens inside a DB transaction and the DB commit then fails, you've charged without recording it. Order: write intent, commit, call external system with an idempotency key, record result.",
      code: `BEGIN;
INSERT INTO orders(id, user_id) VALUES (991, 7);
SAVEPOINT coupon;
INSERT INTO coupon_uses(code, order_id) VALUES ('WELCOME', 991);   -- may violate UNIQUE
-- on error:
ROLLBACK TO SAVEPOINT coupon;    -- order insert survives, continue without coupon
COMMIT;`,
    },
    {
      title: "Long transactions, locks and timeouts",
      body: "Transactions hold resources until they end: row locks (blocking other writers), snapshot visibility (preventing MVCC cleanup), and connections. A transaction left idle by a bug (an exception path that doesn't roll back, a developer's open console session) can block migrations and cause table bloat.\n\nDefenses: statement_timeout and lock_timeout (fail fast instead of waiting forever), idle_in_transaction_session_timeout (Postgres) to kill abandoned transactions, monitoring for long-running transactions and lock waits (pg_stat_activity, pg_locks), and running migrations that take strong locks with a short lock_timeout and retries.\n\nBatch updates should be chunked (update 10,000 rows per transaction in a loop) rather than one transaction updating millions of rows, which holds locks for a long time, bloats the WAL and replicas lag.",
    },
  ],
  "db-isolation": [
    {
      title: "Each level and the anomalies it allows",
      body: "Read uncommitted: dirty reads possible (see uncommitted changes); rarely used, and Postgres treats it as read committed. Read committed: each statement sees only committed data as of the statement's start; non-repeatable reads (a row changes between two reads in one transaction), phantoms (new rows appear in a repeated range query) and lost updates (in naive read-modify-write) are possible. Repeatable read: rows read once stay the same for the transaction; in the SQL standard phantoms are still possible, but snapshot-based implementations (Postgres) prevent them for reads. Snapshot isolation: the whole transaction reads one consistent snapshot; concurrent writes to the same row conflict (first committer wins); write skew is possible. Serializable: the result equals some serial order of the transactions; no anomalies.\n\nThe SQL standard defines levels by which of dirty read, non-repeatable read and phantom they prevent; real databases implement them differently, so name the database when you discuss behaviour.",
    },
    {
      title: "Lost update and write skew with fixes",
      body: "Lost update: two transactions read stock = 10, each subtracts 1 in application code and writes 9; one decrement is lost. Fixes: atomic update (UPDATE stock SET qty = qty − 1 WHERE id = ? AND qty > 0), SELECT … FOR UPDATE before reading, optimistic version check, or an isolation level that detects it (Postgres repeatable read aborts the second writer).\n\nWrite skew: two transactions read overlapping data, make decisions, and write to different rows, together violating an invariant (both doctors go off call; two users book the same meeting room by inserting separate rows after checking the time is free). Snapshot isolation doesn't catch it because there's no write-write conflict. Fixes: SERIALIZABLE isolation, locking the rows the decision depends on (SELECT … FOR UPDATE on the doctors on call), materializing the conflict (a row per room per time slot, so both transactions update the same row), or a constraint (exclusion constraint on time ranges in Postgres).",
      code: `-- Room booking without write skew: exclusion constraint (Postgres)
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE bookings (
  room_id int,
  during  tstzrange,
  EXCLUDE USING gist (room_id WITH =, during WITH &&)   -- no overlapping ranges per room
);`,
    },
    {
      title: "Choosing an isolation level",
      body: "Default to the database default (read committed in Postgres, repeatable read in MySQL) and protect specific read-modify-write paths with atomic updates, row locks or version checks. Use serializable for transactions with complex invariants across rows (financial rules, scheduling), and retry serialization failures automatically (they're expected, not bugs).\n\nKnow the costs: higher levels mean more aborts and retries under contention (optimistic) or more blocking (lock-based). Read-only reporting queries benefit from repeatable read or snapshot so all their reads are consistent with each other.\n\nIn interviews, the strongest answer names the anomaly the business can't tolerate and the cheapest mechanism that prevents it.",
    },
  ],
  "db-concurrency": [
    {
      title: "Two-phase locking in detail",
      body: "2PL: a transaction acquires locks as it goes (growing phase) and, once it releases any lock, may not acquire new ones (shrinking phase). This guarantees serializable schedules. Strict 2PL holds all exclusive locks until commit or abort, preventing others from reading uncommitted data (avoids cascading aborts); rigorous 2PL holds all locks until the end. Most lock-based databases use strict 2PL.\n\nLock modes: shared (S) for reading, compatible with other S; exclusive (X) for writing, compatible with nothing. Intention locks (IS, IX) at the table level announce row-level locks below, so a request for a table lock can check compatibility without scanning every row lock. To prevent phantoms, databases lock ranges (predicate or next-key/gap locks in InnoDB), not just existing rows.\n\nGranularity: row locks maximize concurrency but cost memory and management; table locks are cheap but serialize; some databases escalate many row locks to a table lock under pressure.",
    },
    {
      title: "MVCC implementations compared",
      body: "Postgres: new row versions are written into the table (heap); old versions remain until VACUUM removes them; each version has xmin/xmax transaction ids; indexes point to versions, and HOT updates avoid index changes when indexed columns don't change. Long transactions or stalled vacuum cause bloat; transaction id wraparound must be prevented by vacuum freezing.\n\nMySQL InnoDB: the row in the clustered index holds the latest version; older versions are reconstructed from undo logs in the rollback segment; purge threads clean undo once no read view needs it. Long transactions make undo grow and slow reads that must walk long version chains.\n\nOracle: undo segments similarly reconstruct read-consistent versions; 'snapshot too old' errors occur when needed undo was overwritten.\n\nIn all of them, readers see a consistent snapshot without blocking writers, but writes to the same row still serialize, and snapshot age has a cost.",
    },
    {
      title: "Optimistic vs pessimistic, with numbers",
      body: "Pessimistic locking (SELECT … FOR UPDATE, then update) blocks competitors while the lock is held. Throughput under contention is bounded by 1 / (lock hold time): if each transaction holds a hot row for 5 ms, that row supports ~200 updates per second, no matter how many servers you add. Keep hold times short and avoid network calls while holding locks.\n\nOptimistic concurrency (version check at write) never blocks, but conflicting transactions fail and retry. With low contention (profile edits), nearly all succeed on the first try and throughput is high. With high contention on one row (a flash-sale counter), most attempts fail and retry, wasting work; pessimistic locking or a different design (queueing, splitting the counter, atomic decrements) is better.\n\nHot rows are a design smell at scale: split counters into shards summed on read, queue updates through a single writer, or use atomic increments in Redis with periodic persistence.",
    },
  ],
  "db-query": [
    {
      title: "Cost-based optimization",
      body: "The optimizer estimates the cost (I/O and CPU) of alternative plans using statistics: number of rows and pages per table, per-column distinct counts, most common values, histograms of value distributions, null fractions and correlation with physical order. For a filter, selectivity estimates tell it how many rows will pass; for joins, it estimates output sizes and picks join order and algorithms; with many tables it uses dynamic programming or heuristics (genetic search beyond ~12 tables in Postgres).\n\nWhen estimates are wrong, plans are wrong. Causes: stale statistics after bulk loads (run ANALYZE), correlated columns (create extended statistics), functions on columns (the optimizer can't use statistics or indexes; use expression indexes), and parameter values that differ wildly in selectivity. Some databases (Oracle, SQL Server) support plan hints or plan baselines to pin a good plan; Postgres relies on statistics and configuration, with extensions (pg_hint_plan) for hints.",
    },
    {
      title: "Join algorithms in more depth",
      body: "Nested loop join: for each row of the outer input, find matching inner rows. With an index on the inner join column it's O(outer × log inner) and returns the first rows quickly (great with LIMIT); without an index it's O(outer × inner), terrible for large inputs.\n\nHash join: build a hash table on the smaller input's join key (in memory, spilling to disk in batches if too large), then scan the larger input and probe. O(n + m), works only for equality conditions, and needs memory (work_mem in Postgres; spills show up as 'Batches: N' in EXPLAIN ANALYZE).\n\nMerge join: sort both inputs on the join key (or read them in order from indexes), then walk them together. O(n log n + m log m) with sorts, O(n + m) if already sorted; handles range/inequality conditions in some databases and large inputs efficiently.\n\nReading EXPLAIN means recognizing which one was chosen and whether that's sensible for the row counts involved.",
    },
    {
      title: "Practical query tuning checklist",
      body: "1) Find the slow queries: slow query log, pg_stat_statements (total time, calls, mean), APM traces. Optimize what consumes the most total time, not only the slowest single query. 2) EXPLAIN ANALYZE (with BUFFERS) the query with realistic parameters. 3) Look for: sequential scans on big tables, estimate vs actual mismatches, nested loops over large row counts, sorts or hashes spilling to disk, and many repeated subplan executions. 4) Fix: add or reshape indexes, rewrite non-sargable conditions (WHERE DATE(created_at) = … → a range on created_at), remove SELECT *, paginate with keyset instead of OFFSET, push filters before joins, break apart OR conditions, avoid functions on indexed columns. 5) Check the application: N+1 queries, chatty round trips, missing batching, no connection pooling. 6) Re-measure.\n\nAt larger scale: caching, read replicas, materialized views or summary tables, and moving analytical queries off the OLTP database.",
    },
  ],
  "db-recovery": [
    {
      title: "Write-ahead logging rules",
      body: "Two rules make WAL work. Before a modified data page is written to disk, the log records describing the change must be on disk (write-ahead). Before a transaction is reported committed, all its log records (including the commit record) must be on disk. With these, the data files can lag behind arbitrarily; the log contains everything needed.\n\nBuffer management policies: 'steal' allows writing pages modified by uncommitted transactions to disk (needs undo information to roll them back after a crash); 'no-force' allows committing without writing data pages (needs redo to reapply them). Most databases use steal/no-force for performance, which is why recovery needs both redo and undo.\n\nThe log is sequential, so committing is one sequential write (batched across transactions by group commit). Log sequence numbers (LSNs) on pages tell recovery whether a page already contains a logged change.",
    },
    {
      title: "Crash recovery with ARIES",
      body: "ARIES, the classic algorithm (used in DB2 and SQL Server; Postgres and InnoDB use similar ideas), has three phases after a crash. Analysis: scan the log from the last checkpoint to reconstruct which transactions were active and which pages were dirty at the crash. Redo: repeat history, reapplying every logged change from the earliest needed point (for committed and uncommitted transactions alike) to pages whose LSN shows they lack it, restoring the exact pre-crash state. Undo: roll back transactions that hadn't committed, in reverse order, writing compensation log records (CLRs) so that a crash during recovery doesn't undo things twice.\n\nCheckpoints limit how much log must be scanned: a fuzzy checkpoint records the active transactions and dirty pages without stopping the database, and the background writer flushes pages so the redo starting point advances. Checkpoint frequency trades recovery time against steady-state I/O.",
    },
    {
      title: "Backups, PITR and disaster recovery",
      body: "Logical backups (pg_dump, mysqldump) export SQL or a portable format: good for small databases, migrations between versions, and restoring single tables; slow for large databases and not point-in-time.\n\nPhysical backups copy data files (pg_basebackup, Percona XtraBackup, storage snapshots) while the database runs; combined with continuous archiving of the WAL/binlog, they enable point-in-time recovery: restore the base backup, then replay the log up to a target time or transaction. Managed services (RDS, Cloud SQL) automate this with retention windows.\n\nDisaster recovery planning: define RPO (data loss tolerated) and RTO (downtime tolerated); keep backups in another region and account (protects against region loss and ransomware or a compromised account); encrypt backups; test restores on a schedule and time them; and use replicas for fast failover, while remembering that replicas faithfully replicate mistakes like DROP TABLE, so they don't replace backups.",
    },
  ],
};
