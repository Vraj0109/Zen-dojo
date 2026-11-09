---
id: sd-ids
title: Unique ID generation
area: sd
section: C. Building blocks
---

## Overview

Distributed systems need unique ids without a central bottleneck. Properties to choose between: uniqueness, sortability by time, size, and whether ids leak information (like counts).

## What to know

1. UUID :: 128-bit random ids (v4) can be generated anywhere with no coordination, and collisions are practically impossible. But they're large, and random ids hurt B-tree index locality (inserts land on random pages). UUIDv7 puts a timestamp first to fix the locality.

2. Snowflake :: 64 bits: timestamp in milliseconds (41 bits), machine id (10 bits), per-millisecond sequence (12 bits). Roughly time-sorted, compact, generated locally at high rates. Needs unique machine ids and is sensitive to clock going backwards (wait or fail).

3. ULID :: 128 bits: 48-bit timestamp plus 80 random bits, encoded as 26 sortable characters. Lexicographically time-sortable, no coordination. Similar to UUIDv7.

4. DB sequences with ranges :: A central sequence hands out blocks of ids (each server grabs 1,000 at a time), so the database is hit once per block. Short and dense ids (good for URL shorteners), but they reveal volume, and blocks are lost on crashes (gaps).

## Recap

- UUIDv4: random, no coordination, 128-bit, bad for B-tree locality.
- Snowflake: 41-bit ms timestamp + 10-bit machine + 12-bit sequence; sortable, 64-bit.
- ULID/UUIDv7: time-ordered 128-bit, sortable strings/UUIDs.
- DB ranges: a service grabs blocks of 1000 ids from a sequence; simple, needs the DB.

## Go deeper

### Requirements that drive the choice {point: 0}

Ask: Must ids be unique across all machines without coordination? Should they be sortable by creation time (for pagination, time-range queries, B-tree locality)? How big can they be (64-bit fits a BIGINT and is compact in indexes; 128-bit is a UUID)? Must they be unguessable (public URLs, preventing enumeration)? What throughput per second?

Auto-increment from one database: simple, compact, ordered, but a single point of write and leaks volume. UUIDv4: 122 random bits, no coordination, unguessable, but random index inserts hurt B-trees and they're 16 bytes. UUIDv7 / ULID: 48-bit millisecond timestamp + random bits; sortable, no coordination, 128-bit; the modern default when 128 bits is fine. Snowflake: 64-bit time + machine + sequence; sortable and compact, needs worker id assignment and sane clocks. Segment allocation (ticket server / hi-lo): each app server reserves a range of ids (e.g. 1,000 at a time) from a central sequence and hands them out locally; compact and fast, ordering only roughly by time.

### Snowflake layout and its failure modes {point: 1}

64 bits: 1 sign bit, 41 bits of milliseconds since a custom epoch (~69 years), 10 bits of worker id (1024 workers), 12 bits of sequence (4096 ids per ms per worker → ~4M ids/s per worker). Ids sort by time, fit in a BIGINT, and need no coordination at runtime.

Risks: clock moving backwards (NTP adjustment) can produce duplicates; on detecting it, wait until the clock catches up or refuse. Worker ids must be unique: assign from ZooKeeper/etcd or from the pod ordinal. Ids leak creation time and volume, so don't expose them where that matters.

```
id = ((now_ms - EPOCH) << 22) | (worker_id << 12) | sequence
// same ms: sequence = (sequence + 1) & 0xFFF; if it wraps, spin to the next ms
```

### Clock issues and uniqueness guarantees {point: 1}

Time-based ids assume clocks move forward. NTP can step a clock backwards; a VM migration can pause and jump. Snowflake-style generators must detect a backwards step (current ms < last ms) and either wait until time catches up, use a logical clock that never goes backwards (max(last, now)), or refuse and alert. Within one millisecond, the sequence number increments; if it overflows (more than 4096 ids in that ms), the generator waits for the next millisecond.

Uniqueness also depends on the machine/worker field being unique: assign it from a coordination service with leases (and stop generating if the lease is lost), from a database table, or derive from something guaranteed unique per instance (StatefulSet ordinal). Collisions in random ids are negligible at 122 bits (you'd need ~2⁶¹ ids for a 50% chance), but not at 32-48 random bits, so don't shorten random ids casually.

### Short codes for URL shorteners

Base62 of a 64-bit counter: 7 characters cover 62⁷ ≈ 3.5 trillion codes. Counter sources: a DB sequence with range allocation per app server, or Snowflake ids (longer codes). Random 7-char codes need a uniqueness check (collision rate grows as the space fills). Sequential codes are guessable; if that matters, shuffle with a reversible permutation (e.g. multiply by a large odd number mod 2⁶⁴, or a small block cipher) before encoding.

### Ids in APIs and URLs

Internally you may use compact integers; externally consider opaque ids so you can change formats and avoid leaking counts or creation order (a competitor can estimate your orders per day from sequential ids). Options: encode with base62 or Crockford base32 for short readable strings, prefix with a type ('ord_9Fz3…', as Stripe does) to catch mix-ups, or use UUIDv7/ULID directly.

For short codes (URL shorteners, invite codes), use base62 encoding of a counter or random value, check for collisions if random, and avoid ambiguous characters for anything humans type (0/O, 1/l/I).

## Interview questions

- Generate ids for 100k tweets per second, sortable by time.
- Why not auto-increment ids in a sharded database?
