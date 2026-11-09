---
id: sd-lsm
title: LSM tree vs B-tree
area: sd
section: B. Data storage
---

## Overview

Storage engines come in two families. B-trees update pages in place, which is good for reads. LSM trees buffer writes in memory and flush sorted files sequentially, which is good for writes. The choice explains why Cassandra and RocksDB write fast and Postgres reads fast.

## What to know

1. Write-heavy vs read-heavy trade-off :: A B-tree does random writes to update pages in place: reads are fast and predictable, and writes cost more. An LSM tree appends writes to a log and an in-memory memtable, then flushes immutable sorted files (SSTables): writes are fast and sequential, and reads may check several files. Use LSM for write-heavy workloads and B-trees for read-heavy, update-in-place ones.

2. Compaction :: Compaction merges SSTables in the background, dropping overwritten and deleted (tombstoned) keys, so reads check fewer files. Size-tiered compaction is cheaper for writes; leveled compaction gives better reads and space use. Compaction competes with foreground I/O.

3. Bloom filters :: Each SSTable has a Bloom filter, a compact bit array that can say 'definitely not here', so a read skips files that can't contain the key. This keeps LSM reads of missing or rare keys cheap.

4. Write amplification :: Write amplification: one logical write becomes several physical writes as data is rewritten during compaction (LSM), or as a whole page is rewritten for a small change (B-tree). It wears SSDs and eats I/O bandwidth; read amplification and space amplification are the other two costs to balance.

## Recap

- LSM: writes go to memtable + WAL, flushed as sorted SSTables; great write throughput.
- Reads check memtable then SSTables newest-first; Bloom filters skip files.
- Compaction merges SSTables: size-tiered (write-friendly) vs leveled (read-friendly).
- B-tree: in-place pages, predictable reads; random writes and page splits.

## Go deeper

### Life of a write and a read in an LSM tree {point: 0}

Write: append to the WAL (durability), insert into the in-memory memtable (a sorted structure). When the memtable hits ~64 MB it becomes immutable and is flushed as an SSTable (sorted, immutable file with an index and a Bloom filter). Deletes write tombstones.

Read: memtable → immutable memtables → SSTables from newest to oldest; the Bloom filter for each file answers 'definitely not here' cheaply, and the sparse index finds the block. Compaction in the background merges files, dropping overwritten values and expired tombstones, which keeps reads fast at the cost of rewriting data (write amplification).

### B-tree internals for comparison {point: 0}

A B+ tree stores keys in fixed-size pages (4-16 KB) with high fan-out (hundreds of keys per page), so the tree is shallow: three or four levels index billions of rows. Internal pages hold separator keys and child pointers; leaf pages hold the keys and values (or row pointers) and are linked for range scans.

An update finds the leaf page, modifies it in place (in memory), and logs the change in the WAL; the dirty page is written back later. Inserts into a full page split it into two and push a separator up, which may cascade. Random inserts touch random pages, which costs random I/O and leaves pages partly empty (fragmentation), which is why sequential keys (auto-increment, time-ordered ids) insert much faster than random UUIDs.

Strengths: one copy of each key, predictable read latency, efficient range scans, mature concurrency control. Weakness: random write I/O and write amplification from rewriting whole pages for small changes.

### Compaction strategies and tuning {point: 1}

Size-tiered compaction (STCS, Cassandra's default for many years) merges SSTables of similar size into a bigger one. Writes are cheap (data is rewritten fewer times), but a key may exist in many SSTables, so reads check more files, and a large compaction temporarily needs as much free space as the data being merged.

Leveled compaction (LCS, RocksDB default) organizes SSTables into levels where each level is ~10× bigger than the previous and, within a level, key ranges don't overlap. A read checks at most one file per level, and space overhead is ~10%, but data is rewritten each time it moves down a level (higher write amplification).

Time-window compaction (TWCS) groups data by time window and never merges across windows, which suits time-series data with TTLs: whole old windows are dropped at once.

Tombstones need care: deletes write markers that must survive until compaction has merged them with every older copy; mass deletes create 'tombstone storms' that slow reads. Tune with the workload: write-heavy and rarely read → size-tiered; read-heavy with updates → leveled; append-only time data → time-window.

### Amplification trade-offs {point: 3}

Write amplification: bytes written to disk per byte of user data. Leveled compaction (RocksDB default) rewrites data ~10× per level but keeps one file per key range per level, so reads touch few files and space overhead is ~10%. Size-tiered (Cassandra default) writes less but a key can be in many files (read amplification) and needs up to 2× disk during compaction (space amplification).

B-trees write a full page (4-16 KB) for a small change plus the WAL, but reads are one root-to-leaf path. Rule of thumb: write-heavy, append-like data (logs, metrics, messages) → LSM; read-heavy with updates in place and range scans → B-tree.

### Where each structure shows up

LSM-based: RocksDB (embedded in many systems: CockroachDB, TiKV, Kafka Streams state stores, MyRocks), LevelDB, Cassandra, ScyllaDB, HBase, Bigtable, InfluxDB's storage engine. B-tree-based: Postgres, MySQL InnoDB, SQL Server, Oracle, SQLite, MongoDB WiredTiger (B-tree by default), LMDB.

In a design discussion, the choice usually comes with the database, so the point is to explain behaviour: 'messages are append-heavy and read by recency, which suits Cassandra's LSM storage; we use time-window compaction and TTLs so old buckets drop cheaply' or 'the ledger needs transactional updates and range scans by account, which suits Postgres's B-trees.' Mention Bloom filters when you discuss avoiding disk reads for missing keys.

## Interview questions

- Why are LSM trees good for write-heavy workloads?
- How does an LSM tree find a key?
