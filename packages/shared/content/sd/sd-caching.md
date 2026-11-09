---
id: sd-caching
title: Caching
area: sd
section: C. Building blocks
---

## Overview

A cache keeps hot data in fast storage (memory) to cut latency and load on the source. The hard parts aren't putting things in, but keeping them correct (invalidation) and surviving cache failures and stampedes.

## What to know

1. Cache-aside, read-through, write-through, write-behind :: Cache-aside: the app checks the cache, on a miss reads the DB and fills the cache; the most common pattern. Read-through: the cache itself loads from the DB on a miss. Write-through: writes go to cache and DB synchronously (fresh cache, slower writes). Write-behind: write to cache, flush to DB asynchronously (fast writes, risk of loss).

2. TTL and eviction (LRU, LFU) :: A TTL bounds staleness and frees memory automatically. Eviction kicks in when memory is full: LRU evicts the least recently used item (good default), LFU the least frequently used (better for stable popularity). Add jitter to TTLs so many keys don't expire at once.

3. Stampede / thundering herd fixes :: When a hot key expires, thousands of requests miss at once and all hit the DB. Fixes: one request recomputes while others wait or get the stale value (lock or request coalescing), refresh early before expiry (probabilistic early expiration), or never expire hot keys and refresh them in the background.

4. Hot keys :: A single key can overload one cache node (a viral post). Fixes: replicate the key with suffixes across nodes, add a small in-process cache in front, or use the CDN.

5. Cache invalidation :: The safest approach is to delete the cache entry after writing the DB (not update it), with a TTL as a backstop. Races can still leave stale data briefly (a reader fills an old value after your delete); delayed double-delete or versioned keys reduce this. Change data capture can drive invalidation.

6. Redis vs Memcached :: Redis: rich data structures (sorted sets, lists, hashes), persistence options, replication and clustering, pub/sub and Lua scripts; mostly single-threaded per shard. Memcached: a simple multi-threaded key-value cache with no persistence; good for plain large caches. Redis is the usual default.

7. CDN caching :: CDNs cache responses at the edge using HTTP headers (Cache-Control: max-age, s-maxage, stale-while-revalidate). Version static asset URLs (app.3f2a.js) so they can be cached forever; give dynamic content short TTLs or don't cache it.

## Recap

- Cache-aside default: read cache → miss → DB → set with TTL; on write update DB then delete the key.
- Stampede fixes: single-flight lock, early probabilistic refresh, serve stale while revalidating.
- Hot key: replicate it across nodes or keep a tiny in-process cache.
- Always set TTLs; they bound the damage of any invalidation bug.

## Go deeper

### Caching strategies compared {point: 0}

Cache-aside (lazy loading): the application reads the cache, on a miss reads the database and fills the cache. Only requested data is cached and the cache can fail without breaking reads; the first request after a miss or expiry is slow, and the app owns invalidation. The default for most designs.

Read-through: the cache library or service loads from the database itself on a miss; same behaviour as cache-aside but the logic lives in the cache layer (e.g. a caching proxy, DAX for DynamoDB).

Write-through: writes go to the cache and synchronously to the database, so the cache is always fresh for written keys; writes are slower and you cache data that may never be read.

Write-behind (write-back): writes go to the cache and are flushed to the database asynchronously in batches. Very fast writes and absorbs spikes, but data is lost if the cache dies before flushing, and ordering/consistency gets harder. Use for counters, metrics, or with a durable log.

Refresh-ahead: proactively refresh popular entries before they expire, so users never see the miss penalty for hot keys.

### Sizing and eviction {point: 1}

Size the cache for the working set, not all data: 100M users × 1 KB profile = 100 GB total, but if 20% are active daily, ~20 GB keeps the hit rate high. Measure hit rate; below ~80% the cache may be adding latency without saving much.

LRU fits recency-driven access; LFU (Redis allkeys-lfu) protects popular items from being flushed by a one-off scan. Redis vs Memcached: Redis has data structures, persistence, replication and Lua; Memcached is a simple multithreaded key-value cache that scales vertically well. Most designs say Redis.

### Failure modes and how to handle them {point: 2}

Cache stampede (thundering herd): a hot key expires and thousands of requests miss at once, all hitting the database. Fixes: single-flight (one request recomputes while others wait or get the stale value), probabilistic early expiration (each read has a small chance of refreshing before expiry), soft TTLs (serve stale while one background refresh runs), and jittered TTLs so many keys don't expire together.

Cache penetration: requests for keys that don't exist always miss and hit the database (often attacks). Cache negative results briefly or put a Bloom filter of valid keys in front.

Cache avalanche: the cache cluster restarts or a large fraction of keys expire together, and the database is overwhelmed. Fixes: replicas and persistence for the cache, warm-up before taking traffic, rate limiting and load shedding to the database, and staggered TTLs.

Hot keys: one key gets a huge share of traffic on one cache node. Replicate it (key#1..key#n across nodes), add a local in-process cache layer with a short TTL, or serve it from the CDN.

Inconsistency: write-then-invalidate races; mitigate with TTLs, versioning and CDC-driven invalidation.

### Why 'delete on write' beats 'update on write' {point: 4}

Writer A sets price=10, writer B sets price=12. If each also updates the cache, the cache can end at 10 while the DB says 12 (B's cache write landed first). Deleting the key instead means the next reader loads the current DB value.

A race remains: a reader misses, reads the old value from the DB, a writer updates the DB and deletes the key, then the reader writes the old value into the cache. Mitigations: short TTLs, delayed double delete, or versioned values (only set if newer). For strict needs, invalidate from the DB's change stream (CDC) so the order follows commit order.

```
def get_product(id):
    v = cache.get(f"product:{id}")
    if v is not None:
        return v
    with single_flight(f"product:{id}"):          # one loader per key
        v = db.query("SELECT ... WHERE id = %s", id)
        cache.set(f"product:{id}", v, ttl=300 + random(0, 60))   # jitter TTLs
    return v

def update_price(id, price):
    db.execute("UPDATE products SET price = %s WHERE id = %s", price, id)
    cache.delete(f"product:{id}")
```

### Where caches live {point: 5}

Client: browser HTTP cache, service worker, mobile app storage; controlled by Cache-Control and ETags. Edge: CDN caches static assets and cacheable API responses near users. Service: in-process memory caches (Caffeine, Guava) give nanosecond reads but each instance has its own copy (inconsistency across instances, memory per instance), so use short TTLs or invalidation messages. Distributed: Redis or Memcached shared by all instances: one network hop (~0.5 ms), one source of cached truth, scalable via sharding. Database: the buffer pool caches pages; materialized views cache query results.

Layering is normal: a hot product page might come from the CDN; on miss from the service's local cache; then Redis; then the database. Each layer needs a TTL and an invalidation story, and each extra layer makes 'why am I seeing old data?' harder to debug, so add layers only where the numbers justify them.

## Interview questions

- Cache-aside vs write-through: when to use each?
- A celebrity's profile key is melting one Redis node. Fix it.
- How do you stop a thundering herd when a hot key expires?

## Common mistakes

- Caching without a plan for invalidation.
- Treating the cache as a source of truth without persistence.
