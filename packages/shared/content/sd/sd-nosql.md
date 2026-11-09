---
id: sd-nosql
title: NoSQL types
area: sd
section: B. Data storage
---

## Overview

NoSQL stores trade query flexibility (joins, ad-hoc queries) for scale, availability or a data model that fits the access pattern. Choose by access pattern: design the keys around the queries you must serve, not around entities.

## What to know

1. Key-value (DynamoDB, Redis) :: Key-value: get/put by key, nothing else; extremely fast and easy to partition. Redis keeps data in memory with rich structures (lists, sorted sets) for caches, sessions and leaderboards. DynamoDB is durable and managed, with partition and sort keys, used as a primary store when access patterns are known.

2. Document (MongoDB) :: Document stores keep JSON-like documents queried by fields, with flexible schemas and nested data that's read together (a product with variants). Good when each request reads one aggregate; weak at many-to-many relationships and cross-document transactions.

3. Wide-column (Cassandra, HBase, Bigtable) :: Wide-column stores organize rows by a partition key with sorted clustering columns inside each partition, optimized for huge write volumes and range reads within a partition: messages by (channel_id, time), sensor readings by (device, time). You model one table per query.

4. Graph (Neo4j) :: Graph databases store nodes and edges and traverse relationships efficiently (friends of friends, fraud rings, recommendations). Use them when queries follow many hops; most social apps still use relational or key-value stores with precomputed graphs.

5. Time series (InfluxDB, Timestream) :: Time-series databases are optimized for append-heavy timestamped data with time-range queries, downsampling, retention policies and compression (metrics, IoT). They exploit the fact that data arrives roughly in time order and old data is rarely updated.

## Recap

- Key-value: lookups by key, sessions, carts (DynamoDB, Redis).
- Document: flexible nested records read as a whole (MongoDB).
- Wide-column: huge write volume, time-ordered per partition (Cassandra, Bigtable).
- Design NoSQL tables from access patterns; denormalize; no ad-hoc joins.

## Go deeper

### DynamoDB single-table thinking {point: 0}

Each item has a partition key (PK) and sort key (SK); queries fetch one PK with an SK range. Model multiple entity types in one table with prefixed keys: PK=USER#42, SK=ORDER#2026-11-07#991 lets 'orders of user 42 in November' be one Query. Global secondary indexes give alternate access patterns (by status, by email) and are eventually consistent.

When access patterns are unknown or need joins and ad-hoc reporting, a relational database is the better default; say so.

### Key-value and document stores in practice {point: 0}

Key-value stores map a key to an opaque value. Redis keeps data in memory with rich types (strings, hashes, lists, sorted sets, streams, HyperLogLog) and optional persistence (RDB snapshots, AOF log); it's used for caches, sessions, rate limiters, leaderboards (sorted sets) and queues. DynamoDB is a managed, partitioned, durable key-value/document store with predictable single-digit-millisecond latency at any scale, if you design keys around access patterns.

Document stores (MongoDB, Couchbase, Firestore) store JSON-like documents with secondary indexes and rich queries. They shine when an entity is read and written as a whole (a product with variable attributes, a user profile with nested settings) and the schema evolves often. Watch out for unbounded arrays inside a document (comments on a post grow forever, so put them in their own collection), multi-document transactions (supported now, but slower), and the lack of joins (embed or reference deliberately).

Choose by access pattern: 'get/put by id at huge scale' → key-value; 'flexible records with a few query patterns' → document; 'complex queries, joins, strong constraints' → relational.

### Designing a wide-column table from queries {point: 2}

Chat messages, query: 'latest 50 messages in conversation X, then older pages'. Partition key = conversation_id (all messages of a chat together), clustering key = message_id (time-sortable, e.g. Snowflake) DESC. A read is one partition, already sorted.

Hot/huge partitions: a 5-year-old group chat may hold millions of rows; bucket the partition key by time ((conversation_id, month)). There are no joins, so store what the screen needs (sender name snapshot) or fetch it from a cache.

```
CREATE TABLE messages (
  conversation_id uuid,
  bucket          text,       -- e.g. '2026-11'
  message_id      bigint,     -- Snowflake: time-ordered
  sender_id       uuid,
  body            text,
  PRIMARY KEY ((conversation_id, bucket), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);
```

### Wide-column, graph and time-series stores {point: 2}

Wide-column stores (Cassandra, ScyllaDB, HBase, Bigtable) organize rows by partition key, with rows inside a partition sorted by clustering columns. Writes are very fast (LSM storage), they scale linearly by adding nodes, and Cassandra replicates across data centers with tunable consistency. You must model one table per query: no joins, limited secondary indexes, and partitions should stay bounded (time-bucket them). Good for messages, activity logs, IoT data, and user timelines.

Graph databases (Neo4j, Amazon Neptune) store nodes and edges and traverse relationships efficiently ('friends of friends who like X', fraud rings, recommendations by paths). Relational databases can do recursive queries, but deep multi-hop traversals are far faster in a graph store. Many large social graphs (Facebook's TAO) are actually custom graph layers over sharded MySQL plus caches.

Time-series databases (InfluxDB, Prometheus, TimescaleDB, Amazon Timestream) optimize for append-only timestamped data: compression for regularly spaced points, downsampling, retention policies, and time-window aggregation queries. Use them for metrics and sensor data.

### Choosing a store in an interview

State the access patterns and requirements first, then pick, then justify in one sentence each. Example for a chat app: messages → Cassandra (huge write volume, query by conversation and time, partition by conversation id with time buckets); user profiles and contacts → relational (moderate size, relational queries, strong constraints); presence and sessions → Redis (ephemeral, TTLs, fast); media → S3 + CDN; search over messages → Elasticsearch fed asynchronously.

Polyglot persistence is normal, but each extra store adds operational cost and consistency work (keeping copies in sync via events/CDC). Mention that trade-off, and prefer fewer stores when requirements are modest. Also mention managed services (DynamoDB, Cloud Spanner, Aurora) when operations headcount matters.

## Interview questions

- Why would you choose Cassandra for chat messages?
- Model a 'messages in a channel, newest first' query in DynamoDB.
- When would you not use NoSQL?

## Common mistakes

- Picking NoSQL 'for scale' when the data is relational and modest in size.
