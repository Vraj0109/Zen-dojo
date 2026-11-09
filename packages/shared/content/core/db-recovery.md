---
id: db-recovery
title: Recovery and durability
area: core
section: Databases (DBMS)
---

## Overview

Databases survive crashes by logging changes before applying them, and survive disasters with backups. Know WAL and the redo/undo idea.

## What to know

1. Write-ahead log (WAL) :: Every change is appended to a sequential log and flushed to disk before the transaction commits; the data pages are updated lazily later. Sequential log writes are fast, and the log is the source of truth after a crash. Replication often ships the WAL to replicas.

2. Checkpoints :: A checkpoint periodically flushes dirty pages to disk and records how far the log is applied, so recovery only replays the log after the last checkpoint and old log segments can be recycled.

3. Crash recovery (redo / undo) :: On restart: redo replays logged changes after the checkpoint so committed work is restored, and undo rolls back changes from transactions that never committed (ARIES: analysis, redo, undo).

4. Backups and point-in-time recovery :: Take full backups regularly and archive the WAL continuously; to restore to any moment (just before a bad DELETE), restore the base backup and replay WAL up to that point. Test restores. RPO (how much data you can lose) and RTO (how long recovery takes) drive the strategy.

## Recap

- WAL: log the change before applying it to data pages; commit = WAL flushed.
- Checkpoint: flush dirty pages so recovery only replays WAL after it.
- Recovery (ARIES): analysis → redo everything since checkpoint → undo uncommitted txns.
- PITR = base backup + archived WAL replayed to a timestamp.

## Go deeper

### Why the WAL makes commits fast and safe {point: 0}

Updating a row changes a page in memory; writing that 8 KB page to its random location on every commit would be slow. Instead, the database appends a small log record describing the change to the WAL (sequential write) and fsyncs it at commit. Data pages are written later in the background. After a crash, replaying the WAL from the last checkpoint reconstructs every committed change.

The same log feeds replication (followers replay it) and CDC.

### Write-ahead logging rules {point: 0.5}

Two rules make WAL work. Before a modified data page is written to disk, the log records describing the change must be on disk (write-ahead). Before a transaction is reported committed, all its log records (including the commit record) must be on disk. With these, the data files can lag behind arbitrarily; the log contains everything needed.

Buffer management policies: 'steal' allows writing pages modified by uncommitted transactions to disk (needs undo information to roll them back after a crash); 'no-force' allows committing without writing data pages (needs redo to reapply them). Most databases use steal/no-force for performance, which is why recovery needs both redo and undo.

The log is sequential, so committing is one sequential write (batched across transactions by group commit). Log sequence numbers (LSNs) on pages tell recovery whether a page already contains a logged change.

### Crash recovery with ARIES {point: 2}

ARIES, the classic algorithm (used in DB2 and SQL Server; Postgres and InnoDB use similar ideas), has three phases after a crash. Analysis: scan the log from the last checkpoint to reconstruct which transactions were active and which pages were dirty at the crash. Redo: repeat history, reapplying every logged change from the earliest needed point (for committed and uncommitted transactions alike) to pages whose LSN shows they lack it, restoring the exact pre-crash state. Undo: roll back transactions that hadn't committed, in reverse order, writing compensation log records (CLRs) so that a crash during recovery doesn't undo things twice.

Checkpoints limit how much log must be scanned: a fuzzy checkpoint records the active transactions and dirty pages without stopping the database, and the background writer flushes pages so the redo starting point advances. Checkpoint frequency trades recovery time against steady-state I/O.

### Backups that you can actually restore {point: 3}

Logical dumps (pg_dump) are portable but slow for big databases. Physical backups (base backup + continuous WAL archiving to S3) allow point-in-time recovery: restore the base backup, replay WAL until 10:42:59, just before someone ran DELETE without WHERE.

Define RPO (how much data you can lose) and RTO (how long recovery may take), and test restores regularly; an untested backup is a hope, not a backup.

### Backups, PITR and disaster recovery {point: 3}

Logical backups (pg_dump, mysqldump) export SQL or a portable format: good for small databases, migrations between versions, and restoring single tables; slow for large databases and not point-in-time.

Physical backups copy data files (pg_basebackup, Percona XtraBackup, storage snapshots) while the database runs; combined with continuous archiving of the WAL/binlog, they enable point-in-time recovery: restore the base backup, then replay the log up to a target time or transaction. Managed services (RDS, Cloud SQL) automate this with retention windows.

Disaster recovery planning: define RPO (data loss tolerated) and RTO (downtime tolerated); keep backups in another region and account (protects against region loss and ransomware or a compromised account); encrypt backups; test restores on a schedule and time them; and use replicas for fast failover, while remembering that replicas faithfully replicate mistakes like DROP TABLE, so they don't replace backups.

## Interview questions

- How does a database recover after a power failure?
- Someone ran DELETE without WHERE at 14:03. How do you recover?
