---
id: sd-sharding
title: Partitioning / sharding
area: sd
section: B. Data storage
---

## Overview

Sharding splits data across machines so each holds a subset, which scales storage and write throughput beyond one node. The partition key decides everything: an even spread, which queries hit one shard, and what hurts when you grow.

## What to know

1. Hash vs range vs directory :: Hash partitioning (hash(key) mod N, or a ring) spreads load evenly, but range queries hit every shard. Range partitioning (A-F, G-M) keeps ranges together for efficient scans but risks hot ranges (recent timestamps). Directory-based uses a lookup table from key to shard: flexible, but the directory is one more critical component.

2. Hot partitions :: One key or range gets far more traffic than the others: a celebrity's account, today's time bucket. Fixes: add a random suffix to spread the key over several partitions and merge on read, cache it, or split that partition further.

3. Resharding :: Adding nodes with hash mod N moves almost every key. Use a fixed large number of logical partitions mapped to nodes (move whole partitions), or consistent hashing. Resharding needs a background copy plus a cutover with dual writes or a brief freeze.

4. Consistent hashing with virtual nodes :: Consistent hashing maps keys and nodes onto a ring; a key belongs to the next node clockwise, so adding or removing a node moves only about 1/N of the keys. Virtual nodes (each server owns many ring points) spread load evenly and spread a failed node's load across many peers.

5. Secondary indexes on shards :: A local secondary index is per shard: writes are cheap, but queries on the indexed field go to every shard (scatter-gather). A global secondary index is partitioned by the indexed value: reads hit one shard, but each write updates another shard, usually asynchronously.

## Recap

- Hash sharding: even load, no range scans. Range sharding: range scans, hot ranges.
- Consistent hashing + virtual nodes: adding a node moves ~1/N keys.
- Pick a shard key matching the main query and with high cardinality.
- Secondary indexes: local (scatter-gather reads) vs global (async, write fan-out).

## Go deeper

### Choosing a shard key {point: 0}

Orders table, queries: 'orders of a customer', 'order by id', occasional 'all orders today' for analytics. Shard by customer_id: a customer's orders live on one shard (single-shard queries), load spreads across millions of customers. Lookups by order_id: embed the shard in the id (Snowflake bits or a prefix) or keep a small order_id → customer_id index.

Bad keys: created_date (all writes hit today's shard), country (India's shard melts), a low-cardinality status. Analytics across shards goes to a warehouse via CDC, not scatter-gather on the OLTP shards.

### Hash, range and directory partitioning compared {point: 0}

Hash partitioning: shard = hash(key) mod number of logical partitions. Spreads keys evenly and avoids hotspots from sequential keys, but range queries over the key must hit every shard. Use it for user ids, order ids and anything accessed by exact key.

Range partitioning: each shard owns a contiguous key range (A-F, G-M…, or time ranges). Range scans hit one or few shards, and ranges can split when they grow (Bigtable, HBase, CockroachDB). Risk: hotspots when writes concentrate on one range, such as a timestamp key where all new writes go to the latest range. Mitigate by prefixing keys with a hash or bucket.

Directory (lookup) partitioning: a mapping service stores which shard holds each key or tenant. Most flexible: you can move a big tenant to its own shard. The cost is an extra lookup (cached) and a critical metadata service.

Consistent hashing places nodes and keys on a ring so adding or removing a node moves only neighbouring keys; virtual nodes (many points per server) even out load and let bigger servers take more.

### Hot partitions and skew {point: 1}

Even with hashing, some keys are far hotter than others: a celebrity's profile, a viral post, a big tenant. Signs: one shard's CPU or latency much higher than others, throttling on one DynamoDB partition.

Fixes for hot reads: caching in front (often enough), replicating the hot key to several cache nodes, and request coalescing. Fixes for hot writes: split the key into N sub-keys (post:123:likes:0..9), spread writes randomly, and sum on read or aggregate periodically; batch writes; or move the hot tenant to dedicated capacity via a directory.

Also avoid building hotspots: monotonically increasing keys with range partitioning, low-cardinality shard keys (country, status), or sharding by date. When you name a shard key in an interview, immediately say how you'd handle its hot keys.

### Resharding without downtime {point: 2}

Avoid hash(key) mod N: changing N moves almost every key. Use many logical shards (e.g. 1024) mapped to fewer physical nodes; moving a logical shard is a bulk copy plus a cutover. Steps: copy the shard snapshot to the new node, stream changes (CDC/binlog) until caught up, briefly pause writes for that shard, flip the routing map, resume.

Hot keys (a celebrity) don't fix by resharding; split the key (append a random suffix and fan reads across sub-keys) or cache it in front.

### Cross-shard queries and secondary indexes {point: 4}

Once data is sharded, queries not keyed by the shard key become expensive. Local (document-partitioned) secondary indexes live on each shard and index only that shard's data: writes stay local, but a query by the secondary attribute must scatter to all shards and gather results (tail latency grows with shard count). Global (term-partitioned) indexes are partitioned by the indexed value: a query goes to one index partition, but each write must update an index partition on another node, usually asynchronously, so the index lags.

Other strategies: duplicate data into a second table keyed by the other attribute (DynamoDB GSIs, Cassandra query tables), keep a search index (Elasticsearch) for flexible queries, or send analytics to a warehouse.

Cross-shard transactions need 2PC or sagas; design the shard key so most transactions stay within one shard (all of a customer's orders together).

## Interview questions

- Shard a chat messages table. What's the partition key?
- How does consistent hashing reduce data movement?
- How do you query by email when users are sharded by user_id?

## Common mistakes

- Sharding before it's needed; it makes joins, transactions and operations much harder.
