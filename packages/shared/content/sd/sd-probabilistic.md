---
id: sd-probabilistic
title: Probabilistic structures
area: sd
section: C. Building blocks
---

## Overview

Probabilistic data structures answer membership, counting and frequency questions in a tiny fraction of the memory exact structures need, in exchange for a small, bounded error. They're common in deep dives (crawler dedup, unique visitors, trending topics).

## What to know

1. Bloom filter :: A bit array with k hash functions. Add an item by setting its k bits; query by checking them. If any bit is 0 the item is definitely absent; if all are 1 it's probably present (false positives, never false negatives). About 10 bits per item gives a ~1% false-positive rate. Can't delete items (counting Bloom filters can).

2. HyperLogLog :: Estimates the number of distinct items (unique visitors) using a few kilobytes, with ~1-2% error, by tracking the maximum number of leading zeros of hashed values in many registers. Sketches can be merged (union across servers or days). Redis has PFADD and PFCOUNT.

3. Count-Min Sketch :: Estimates item frequencies in fixed memory: a d × w grid of counters with d hash functions. Increment one counter per row; the estimate is the minimum across rows, which may overcount but never undercounts. Used for heavy hitters or top-k in streams, combined with a heap.

4. Geohash / quadtree :: Geohash encodes latitude and longitude as a string where a shared prefix means nearby; search the cell and its 8 neighbours. A quadtree recursively splits space into four until each cell holds few points, adapting to density (dense cities get small cells). Used for 'find nearby drivers or places'.

5. Consistent hashing ring :: Nodes and keys are hashed onto a ring; each key belongs to the next node clockwise, with virtual nodes for balance. Adding or removing a node only moves its neighbours' keys. Used by distributed caches and Dynamo-style stores.

## Recap

- Bloom filter: 'definitely not' or 'maybe'; ~10 bits/item for 1% false positives.
- HyperLogLog: distinct counts with ~0.8% error in 12 KB (Redis PFADD/PFCOUNT).
- Count-Min Sketch: frequency estimates that only overcount; heavy hitters with a heap.
- Geohash prefixes / quadtrees for 'nearby'; consistent hashing for partitioning.

## Go deeper

### Sizing a Bloom filter {point: 0}

For n items and false-positive rate p: bits m = −n·ln(p) / (ln 2)² and hash functions k = (m/n)·ln 2. For 1B URLs at 1%: m ≈ 9.6 bits × 1B ≈ 1.2 GB, k ≈ 7. At 0.1%: ~14.4 bits per item.

Uses: skip disk reads for absent keys (LSM SSTables), a crawler's 'seen URL' check, avoiding cache lookups for keys that don't exist. Can't delete (counting Bloom filters can) and can't list members.

### HyperLogLog: counting distinct items cheaply {point: 1}

Exact distinct counts (unique visitors per day) need memory proportional to the number of distinct items. HyperLogLog estimates cardinality with fixed small memory: hash each item; use the first bits to pick one of m registers; in the remaining bits, count the position of the first 1-bit (long runs of leading zeros are rare, so seeing one suggests many distinct items); each register keeps the maximum seen. The estimate combines registers with a harmonic mean and bias corrections.

With 16,384 registers (Redis uses 12 KB per key) the standard error is about 0.81%. HLLs merge by taking register-wise maxima, so you can count uniques per hour and merge for the day or across shards without double counting. Redis: PFADD, PFCOUNT, PFMERGE. Use for unique visitors, distinct search queries, distinct IPs; not when exact counts are legally required (billing).

### Count-Min Sketch and heavy hitters {point: 2}

Count-Min Sketch estimates how often each item appears in a stream using a d × w grid of counters and d hash functions. To add an item, increment one counter per row (at column hash_i(item)). To query, take the minimum of the item's d counters. Collisions only add, so estimates never undercount; overcount error is bounded by about (total count / w) with probability depending on d.

Combine with a min-heap of size k to track the top-k heavy hitters (most-clicked ads, trending hashtags, top talkers in network traffic): after each update, if the item's estimate exceeds the heap minimum, update the heap. Sketches merge by adding counters, so per-partition sketches combine globally.

Trade-off: tiny memory and constant time per event, at the cost of approximate counts; for exact top-k on smaller data, aggregate exactly by key in a stream processor.

### Geohash and quadtree for nearby search {point: 3}

Geohash interleaves latitude/longitude bits into a base32 string; a shared prefix means a nearby cell (6 chars ≈ 1.2 km × 0.6 km). Index drivers by geohash; to search, look up the user's cell plus its 8 neighbours (points near a cell edge are close but have different prefixes).

Quadtree: recursively split a region into 4 until each leaf has ≤ K points; dense cities get small cells, deserts big ones. Good for uneven density and k-nearest queries; harder to shard. Many production systems (Uber's H3) use hexagonal hierarchical grids for uniform neighbour distances.

### Spatial indexing: geohash, quadtrees, S2/H3 {point: 3}

Geohash encodes latitude and longitude into a string by interleaving bits of each coordinate and base32-encoding; each extra character subdivides the cell (precision 5 ≈ 4.9 km, 6 ≈ 1.2 km, 7 ≈ 150 m). Nearby points usually share prefixes, so a B-tree or key-value prefix query finds candidates. Edge cases: neighbours across a cell boundary have different prefixes (query the 8 adjacent cells too), and cell shapes distort toward the poles.

Quadtree: recursively split space into four quadrants until each leaf holds at most K points; adaptive to density, good for in-memory nearest-neighbour search; needs rebalancing as points move.

Google S2 (cells on a cube projected to the sphere, ordered by a Hilbert curve) and Uber H3 (hierarchical hexagons, uniform neighbour distances) are production-grade alternatives used for ride matching, delivery zones and surge pricing. Redis GEO commands (GEOADD, GEOSEARCH) store points in sorted sets by geohash score for simple radius queries.

## Interview questions

- How does a web crawler avoid re-crawling URLs with limited memory?
- Count unique daily visitors across 100 servers.
- Find the top 10 trending hashtags in a stream.
