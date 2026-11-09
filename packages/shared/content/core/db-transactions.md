---
id: db-transactions
title: Transactions and ACID
area: core
section: Databases (DBMS)
---

## Overview

A transaction groups operations so they succeed or fail together and run as if isolated from others. ACID is the contract; each letter has a specific mechanism behind it.

## What to know

1. Atomicity, consistency, isolation, durability :: Atomicity: all or nothing; a failure rolls back every change (undo log). Consistency: constraints and invariants hold before and after (the application defines most invariants). Isolation: concurrent transactions don't see each other's partial work (locking or MVCC). Durability: once committed, the data survives crashes (WAL plus fsync).

2. Commit and rollback :: COMMIT makes the changes permanent and visible; ROLLBACK discards them. Keep transactions short: they hold locks or old versions, and long transactions hurt concurrency and storage.

3. Savepoints :: A savepoint marks a point inside a transaction you can roll back to without abandoning the whole transaction. Useful for partial retries inside a batch.

4. Autocommit pitfalls :: With autocommit on, each statement is its own transaction. Running related statements (debit then credit) without an explicit transaction means a crash between them leaves inconsistent data. ORMs sometimes open transactions implicitly or not at all, so know which yours does.

## Recap

- Atomicity: all or nothing (undo/WAL). Consistency: constraints hold. Isolation: concurrent txns don't interfere. Durability: committed survives crashes.
- Keep transactions short; never wait on user input or remote calls inside one.
- Savepoints roll back part of a transaction.
- Autocommit: each statement commits alone, so multi-step changes need explicit BEGIN/COMMIT.

## Go deeper

### How each ACID property is implemented {point: 0}

Atomicity: the database logs changes (WAL / redo log, plus undo information or old row versions) so it can roll back an aborted transaction and, after a crash, undo transactions that didn't commit. Consistency: constraints, triggers and cascades checked at statement or commit time keep data valid according to defined rules; the application is responsible for business invariants the schema doesn't express. Isolation: locking and/or MVCC control what concurrent transactions see and prevent conflicting writes. Durability: commit returns only after the WAL record is flushed to stable storage (fsync); replication can add durability across machines.

Relaxing durability for speed is possible: Postgres synchronous_commit = off returns before the flush (a crash can lose the last fraction of a second of commits, but never corrupts data); MySQL innodb_flush_log_at_trx_commit = 2 is similar. Mentioning these trade-offs shows practical understanding.

### A transfer done right {point: 1}

Both updates and the ledger entry happen in one transaction with a constraint that balances can't go negative; if anything fails, nothing is applied. The conditional update makes the balance check and the decrement atomic.

```
BEGIN;
UPDATE accounts SET balance = balance - 500
 WHERE id = 1 AND balance >= 500;          -- 0 rows → insufficient funds → ROLLBACK
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
INSERT INTO ledger(from_id, to_id, amount) VALUES (1, 2, 500);
COMMIT;
```

### Savepoints, nested work and error handling {point: 2}

A savepoint marks a point inside a transaction to which you can roll back without aborting the whole transaction: SAVEPOINT s1; … ROLLBACK TO SAVEPOINT s1; RELEASE SAVEPOINT s1. ORMs use savepoints to implement nested transactions (a nested 'transaction' is a savepoint inside the outer one).

In Postgres, once a statement in a transaction fails, the transaction is aborted and every further statement fails until ROLLBACK, unless you rolled back to a savepoint. Use savepoints when you want to try an insert and handle a unique violation without losing the transaction.

Transaction scoping in apps: one transaction per unit of work (one request handler or one message), opened as late and committed as early as possible. Frameworks' declarative transactions (@Transactional) should not wrap remote calls; if a payment API call happens inside a DB transaction and the DB commit then fails, you've charged without recording it. Order: write intent, commit, call external system with an idempotency key, record result.

```
BEGIN;
INSERT INTO orders(id, user_id) VALUES (991, 7);
SAVEPOINT coupon;
INSERT INTO coupon_uses(code, order_id) VALUES ('WELCOME', 991);   -- may violate UNIQUE
-- on error:
ROLLBACK TO SAVEPOINT coupon;    -- order insert survives, continue without coupon
COMMIT;
```

### Autocommit and long transactions {point: 3}

With autocommit on (the default in most drivers), running two UPDATEs as separate statements means a crash between them leaves half a transfer. Conversely, a transaction left open (a debugger, a slow HTTP call inside it) holds locks and, in MVCC databases, prevents cleanup of old row versions (Postgres table bloat).

Rule: do remote calls before or after the transaction; inside it, only database work.

### Long transactions, locks and timeouts {point: 3}

Transactions hold resources until they end: row locks (blocking other writers), snapshot visibility (preventing MVCC cleanup), and connections. A transaction left idle by a bug (an exception path that doesn't roll back, a developer's open console session) can block migrations and cause table bloat.

Defenses: statement_timeout and lock_timeout (fail fast instead of waiting forever), idle_in_transaction_session_timeout (Postgres) to kill abandoned transactions, monitoring for long-running transactions and lock waits (pg_stat_activity, pg_locks), and running migrations that take strong locks with a short lock_timeout and retries.

Batch updates should be chunked (update 10,000 rows per transaction in a loop) rather than one transaction updating millions of rows, which holds locks for a long time, bloats the WAL and replicas lag.

## Interview questions

- Explain each ACID property and what implements it.
- How does a database guarantee durability?
