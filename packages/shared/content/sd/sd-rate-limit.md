---
id: sd-rate-limit
title: Rate limiting
area: sd
section: C. Building blocks
---

## Overview

Rate limiting protects services from abuse and overload and enforces fair use. Choose an algorithm for the burst behaviour you want, and make counting fast and shared across instances.

## What to know

1. Token bucket :: A bucket holds up to B tokens and refills at rate r; each request takes a token or is rejected. Allows bursts up to B while enforcing the average rate r. Needs only two numbers per key (tokens and last refill time), so it's cheap and the most common choice.

2. Leaky bucket :: Requests enter a fixed-size queue that drains at a constant rate; overflow is dropped. Output is perfectly smooth, which suits protecting a downstream with a fixed capacity, but bursts get queued or dropped even when capacity is free.

3. Fixed and sliding window :: Fixed window counts requests per calendar window (per minute): simple, but allows 2× the limit across a boundary. Sliding window log stores every timestamp (exact, memory-heavy). Sliding window counter weights the previous window's count by overlap: approximate, cheap, and the common compromise.

4. Distributed counters in Redis :: With many gateway instances, the counters must be shared: Redis INCR with EXPIRE for windows, or a Lua script doing the token-bucket update atomically. To save round trips, keep local counters and sync periodically, accepting slight overshoot. Decide whether to fail open or closed if Redis is down.

## Recap

- Token bucket: capacity B, refill r/s; allows bursts up to B. Default choice.
- Sliding window counter: weighted previous + current window, cheap and smooth.
- Distributed: Redis with a Lua script (atomic check + update), key per client.
- Return 429 + Retry-After; fail open or closed deliberately if Redis is down.

## Go deeper

### Comparing the algorithms {point: 0}

Fixed window (count per minute): simplest, but allows 2× the limit across a window boundary. Sliding log (timestamps per request): exact, memory per request. Sliding window counter: count_prev × overlap% + count_current, nearly exact with two counters. Token bucket: allows controlled bursts, smooth average. Leaky bucket: a queue drained at a fixed rate, smooths output (good in front of a fragile downstream).

At very high scale, keep local in-memory buckets per gateway node and sync to Redis periodically, accepting slight overshoot for much less latency.

### Algorithms side by side {point: 0}

Fixed window counter: INCR key:minute; reject if > limit. One counter per key per window, very cheap; allows bursts of up to 2× at window boundaries.

Sliding window log: store each request timestamp in a sorted set; drop entries older than the window; count. Exact, but memory grows with the limit (fine for small limits, costly for 10k/min).

Sliding window counter: keep counts for the current and previous windows; estimate = current + previous × (fraction of the previous window still inside the sliding window). Nearly exact with two counters; widely used (Cloudflare).

Token bucket: tokens refill at rate r up to capacity b; each request takes one. Allows bursts up to b while enforcing average r. Leaky bucket: requests enter a queue drained at a fixed rate; smooths output for a fragile downstream, but adds queueing delay.

Concurrency limiter: cap in-flight requests instead of rate; adapts naturally to slow responses (if each takes longer, fewer start). Good for protecting databases.

### Token bucket in Redis, atomically {point: 3}

Store tokens and last refill time per key. On each request: compute tokens = min(B, tokens + (now − last) × r); if tokens ≥ 1, decrement and allow, else deny. Running this as a Lua script makes the read-modify-write atomic so concurrent requests on different gateway nodes can't both take the last token.

```
-- KEYS[1] = bucket key; ARGV = capacity, refill_per_sec, now_ms
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local cap, rate, now = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local tokens = tonumber(b[1]) or cap
local ts = tonumber(b[2]) or now
tokens = math.min(cap, tokens + (now - ts) / 1000 * rate)
local allowed = 0
if tokens >= 1 then tokens = tokens - 1; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate * 1000) * 2)
return allowed
```

### Distributed limiter design details {point: 3}

Central counters in Redis: each gateway instance runs an atomic Lua script per request (token bucket or sliding window). Shard Redis by limiter key; use a TTL on keys so idle clients don't consume memory. Latency cost: one Redis round trip (~0.5 ms) per request.

For very high throughput, use local buckets with periodic synchronization: each instance gets a share of the limit (limit / instances) or reports its usage every 100 ms and receives updated allowances. Accept slight overshoot in exchange for no per-request network call.

Failure policy: if Redis is unreachable, fail open (allow traffic, risk overload) for user-facing product limits, or fail closed (reject) for limits protecting critical or costly resources; log and alert either way. Multi-region: per-region limits usually suffice; truly global limits need cross-region coordination and are rarely worth it.

### Where to enforce limits

Edge/CDN/WAF: block abusive IPs and obvious floods before they reach you. API gateway: per API key, per user, per IP, per endpoint quotas; the main place for product limits. Service level: protect expensive endpoints and downstream dependencies with concurrency limits (not just request rates). Client side: SDKs back off on 429 and respect Retry-After.

Choose the key carefully: per IP penalizes shared NATs (offices, mobile carriers); per user/API key is fairer but needs authentication first; combine (anonymous by IP, authenticated by user). Different limits per plan tier and per endpoint cost.

Communicate limits with headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset or the standard RateLimit headers) so well-behaved clients can pace themselves.

## Interview questions

- Design a rate limiter allowing 100 requests per minute per API key across 50 servers.
- Token bucket vs sliding window: which allows bursts?
