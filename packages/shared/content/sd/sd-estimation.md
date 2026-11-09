---
id: sd-estimation
title: Back-of-envelope estimation
area: sd
section: A. Fundamentals
---

## Overview

Estimation shows you can size a system before designing it. The goal is the right order of magnitude to make decisions (one database or sharded? cache fits in memory?), not precise numbers. State assumptions, round aggressively, and say what the numbers imply.

## What to know

1. QPS, storage per year, bandwidth, cache memory :: Estimate peak QPS (average × 2-10 for peaks), storage per year (items/day × size × 365 × replication), bandwidth (QPS × payload size), and cache memory (e.g. 20% of daily hot data). Then use them: '10k writes/s is too much for one Postgres primary, so we shard'.

2. 1 day ≈ 86,400 s, 1M req/day ≈ 12 QPS :: A day has 86,400 seconds; round to ~100,000. So 1 million requests a day is about 12 QPS on average, and 100 million a day is about 1,200 QPS. Memorize this conversion; it comes up in every design.

3. 1 KB × 1B = 1 TB :: Multiply size by count: 1 KB × 1 billion = 1 TB; 1 MB × 1 million = 1 TB. Useful powers: thousand = KB, million = MB, billion = GB, trillion = TB (for bytes per item × items).

4. SSD read ≈ 0.1 ms, DC round trip ≈ 0.5 ms, cross-region ≈ 100 ms :: Latency numbers: memory reference ~100 ns, SSD random read ~0.1 ms, round trip within a data center ~0.5 ms, disk seek ~10 ms, cross-continent round trip ~100-150 ms. They explain why caching in memory and avoiding cross-region calls on the request path matter.

## Recap

- 1M/day ≈ 12 QPS; 100M/day ≈ 1.2k QPS; peak ≈ 2-10× average.
- 1 KB × 1B = 1 TB. Storage/yr = items/day × size × 365 × replicas.
- Memory ~100 ns, SSD ~100 µs, same-DC RTT ~0.5 ms, cross-continent ~150 ms.
- One Postgres primary: ~5-10k simple writes/s; one Redis node: ~100k ops/s, ~25-100 GB.

## Go deeper

### A repeatable estimation script {point: 0}

Say it in this order and write the numbers on the board.

1) Users: daily active users (DAU) and how many actions each takes per day. 2) Traffic: requests per day = DAU × actions; divide by ~10⁵ for average QPS; multiply by 2-3 for peak (more for spiky products such as sales or sports). Split reads and writes, since they lead to different designs. 3) Storage: new items per day × size per item × 365 × years kept; add indexes and metadata (~20-30%) and multiply by the replication factor (3). 4) Bandwidth: QPS × response size for egress; uploads × size for ingress. 5) Memory: what fraction is hot (e.g. 20% of daily reads) × item size to size the cache.

Then draw conclusions: 'peak writes are 3k/s, one primary handles that, so no write sharding yet'; '40 TB/year of media means object storage plus CDN'; 'the hot set is 30 GB, so a small Redis cluster'. Finish in 3-5 minutes and move on; you can revisit if a deep dive needs a sharper number.

### Worked example: photo-sharing service {point: 0.5}

Assume 100M DAU, 2 uploads per 10 users per day → 20M photos/day, average 2 MB after compression. Writes: 20M / 86,400 ≈ 230 uploads/s average, ~1k/s peak. Storage: 20M × 2 MB = 40 TB/day → ~15 PB/year before replication; that says object storage (S3) with lifecycle tiers, not a database.

Reads: each user views 50 photos/day → 5B views/day ≈ 58k/s average, 200k+/s peak, read:write ≈ 250:1 → CDN for images, cache for metadata. Metadata row ~500 bytes × 20M/day = 10 GB/day → a sharded relational or wide-column store. Each number led to a decision; that's the point.

### Worked example: chat service {point: 0.7}

Assume 500M DAU, each sends 40 messages a day: 20B messages/day ≈ 230k messages/s average, ~700k/s peak. Each message is ~200 bytes with metadata: 20B × 200 B = 4 TB/day, ~1.5 PB/year before replication. That means a horizontally scalable write-optimized store (wide-column / LSM) partitioned by conversation, with old data tiered to cheaper storage.

Connections: say 100M concurrent users holding WebSockets. If one gateway server handles ~100k connections, you need ~1,000 gateway servers, which means a registry to find which gateway holds a user, and gateways must be stateless apart from the sockets. Fan-out: average group size 5 means ~1.1M deliveries/s average.

Bandwidth per gateway: 1.1M deliveries/s × 200 B ≈ 220 MB/s total, small spread over 1,000 servers; the connection count, not bandwidth, is the constraint. These few numbers justify the main design decisions.

### Capacity numbers worth knowing {point: 3}

Single commodity server: ~10k-50k simple HTTP requests/s. Postgres/MySQL primary on good hardware: thousands to ~10k writes/s, tens of thousands of indexed reads/s. Redis: ~100k ops/s per core-bound instance. Kafka: hundreds of MB/s per broker. 1 Gbps link ≈ 125 MB/s; 10 Gbps ≈ 1.25 GB/s.

These are order-of-magnitude anchors; say them as assumptions ('roughly 10k writes per second per primary, so at 50k we shard into ~8 partitions with headroom').

### Common traps and how to sanity-check

Unit mistakes are the usual failure: bits vs bytes (network in Gbps, storage in GB), per second vs per day, average vs peak, and forgetting replication. Write units next to every number.

Sanity-check against things you know: a single server serves tens of thousands of simple requests per second; a single relational primary handles a few thousand to ten thousand writes per second; a Redis node does ~100k operations per second; SSDs do tens of thousands to hundreds of thousands of random IOPS; a 10 Gbps NIC moves ~1.25 GB/s. If your design needs 1M writes/s on one database, you've found a sharding or batching requirement, which is useful.

Don't over-precise: 86,400 vs 100,000 changes nothing about the design. Do note when a number is close to a threshold ('8k writes/s is near one primary's limit, so plan for sharding by user id from the start').

## Interview questions

- Estimate storage for a URL shortener with 100M new URLs a month, kept 5 years.
- Twitter has 300M daily users who each read 100 tweets: what read QPS is that?
- Will the hot set of user profiles fit in a single Redis node?

## Common mistakes

- Spending 10 minutes on arithmetic; aim for 3-4 minutes.
- Producing numbers and then not using them to make a decision.
