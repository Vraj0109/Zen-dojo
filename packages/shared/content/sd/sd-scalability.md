---
id: sd-scalability
title: Scalability basics
area: sd
section: A. Fundamentals
---

## Overview

Scalability is handling more load by adding resources. The core move is making services stateless so any instance can serve any request, then pushing state into systems built to scale it (databases, caches, queues).

## What to know

1. Vertical vs horizontal scaling :: Vertical scaling (bigger machine) is simple and has no distribution problems, but has a ceiling and a single point of failure. Horizontal scaling (more machines) is nearly unlimited and adds redundancy, but needs load balancing and stateless services or partitioned data.

2. Stateless services :: A stateless service keeps no per-user data in memory between requests; session data lives in a shared store (Redis) or a signed token. Then instances can be added, removed or replaced freely and the load balancer can send any request anywhere.

3. Sticky sessions :: Sticky sessions route a user to the same instance (by cookie or IP hash) so in-memory session state works. They're a crutch: load becomes uneven and state is lost when that instance dies. Prefer externalized state.

4. Autoscaling :: Autoscaling adds or removes instances based on a metric (CPU, request rate, queue depth). Scale on the metric closest to user pain, keep a minimum for warm capacity, and remember that new instances take time to start, so scale out early and in slowly.

5. Backpressure :: Backpressure means a system that can't keep up signals upstream to slow down instead of falling over: bounded queues, rejecting with 429/503, or consumers pulling at their own pace. Without it, overload leads to cascading failures.

## Recap

- Scale up first (simple), scale out when you hit limits or need redundancy.
- Stateless app tier: session in Redis/JWT, files in object storage.
- Autoscale on a leading signal (queue depth, CPU) with cooldowns.
- Backpressure: bounded queues, 429/503 + Retry-After, load shedding.

## Go deeper

### Vertical vs horizontal, honestly {point: 0}

Vertical scaling (a bigger machine) is underrated: modern servers have 100+ cores and terabytes of RAM, and a single well-tuned Postgres instance runs many large businesses. It needs no code changes and no distributed-systems problems. Limits: there's a ceiling, big machines cost more per unit, upgrades may need downtime, and one machine is one failure domain (you still need a replica).

Horizontal scaling (more machines) gives near-unlimited capacity and redundancy, but only for components designed for it. Stateless services scale horizontally trivially. Stateful components need partitioning (sharding) and replication, which bring rebalancing, cross-partition queries, consistency trade-offs and operational load.

A good interview answer: keep the app tier stateless and horizontally scaled behind a load balancer from day one; scale the database vertically with read replicas and caching first; shard only when write volume or data size requires it, and choose the shard key from the main access pattern. Mention that each step adds complexity, so you take it when the numbers force it.

### Making a service stateless {point: 1}

Move every piece of per-user state off the instance: sessions to Redis or signed tokens, uploads to S3 via presigned URLs, caches to a shared cache (or accept per-instance caches as an optimization only), scheduled jobs to a queue or leader-elected worker. Then any instance can serve any request, the balancer can use plain round robin, and instances can be killed at any time.

Sticky sessions are the shortcut when you can't: they break even load, and a dead instance logs its users out. Use them only for genuinely stateful connections (WebSockets), and even then keep the authoritative state elsewhere.

### Autoscaling that works {point: 3}

Autoscaling adds or removes instances based on a metric. CPU is easy but lags for I/O-bound services; requests per instance, latency, or queue depth (for workers) are often better signals. Use target tracking ('keep CPU at 60%') rather than step rules where possible.

Pitfalls: new instances need time to boot, warm caches and pass health checks, so scale out early and scale in slowly (cooldowns, scale-in protection for instances with in-flight work). Predictable peaks (9am traffic, a planned sale) are better handled with scheduled scaling ahead of time. Downstream limits don't autoscale: doubling app servers can double database connections and push the database over; use connection poolers and cap concurrency.

For queue workers, scale on backlog per worker (messages waiting / processing rate) so the time to drain stays bounded. Kubernetes HPA, AWS Auto Scaling groups and KEDA (event-driven scaling) are typical tools to name.

### Backpressure and load shedding {point: 4}

When producers outpace consumers, an unbounded queue just converts overload into memory exhaustion and latency. Bound every queue and decide what happens when it's full: block the producer, drop (with a metric), or reject with 429/503 so clients back off.

Shed low-priority work first (analytics, prefetch) to protect checkout or login. Admission control (a concurrency limit per service, adapted like TCP congestion control) keeps latency flat under overload instead of letting every request time out.

### Caching, async and read replicas as scaling tools

Most scaling wins come from not doing work on the hot path. Cache read-heavy data (CDN for static and public content, Redis for computed objects); a 95% hit rate means the database sees 1/20 of the reads. Move slow or non-essential work off the request path with a queue: send emails, resize images, update search indexes and analytics asynchronously, and return to the user immediately.

Read replicas multiply read capacity for the database, at the cost of replication lag (seconds in bad cases). Route reads that must see the user's own writes to the primary (or use read-your-writes tracking), and send everything else to replicas.

Precompute expensive results (feeds, leaderboards, aggregates) when data changes rather than at read time if reads vastly outnumber writes. And batch: one write of 100 rows is far cheaper than 100 writes. In an interview, after the basic design, ask 'what's the hottest path?' and apply these in order: cache, async, replicas, precompute, then shard.

## Interview questions

- Your service holds user sessions in memory. How do you scale it to 20 instances?
- What would you autoscale a queue consumer on?
- How do you stop one slow dependency from taking down everything?

## Common mistakes

- Scaling the stateless tier while the database stays the bottleneck.
