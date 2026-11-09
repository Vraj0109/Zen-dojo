---
id: sd-availability
title: Availability and reliability
area: sd
section: A. Fundamentals
---

## Overview

Availability is the fraction of time the system serves requests successfully. You get it from redundancy (no single point of failure), fast detection and failover, and designing so partial failures degrade the product instead of breaking it.

## What to know

1. SLA, SLO, SLI and nines :: SLI: a measured indicator (e.g. % of requests under 300 ms and non-5xx). SLO: your internal target for it (99.9% over 30 days). SLA: a contract with customers, with penalties, set looser than the SLO. 99.9% allows ~43 minutes of downtime a month; 99.99% ~4.3 minutes. Each extra nine costs a lot more.

2. Redundancy and failover :: Run every component with spares across failure domains (multiple instances, multiple availability zones). Failover can be active-passive (standby takes over; brief outage) or active-active (all serve traffic; harder for writes). Remove single points of failure, including the load balancer and the database primary.

3. Graceful degradation and health checks :: Health checks (liveness: is it running? readiness: can it serve?) let load balancers remove bad instances. Graceful degradation keeps the core working when a dependency fails: show a cached feed, hide recommendations, disable a non-critical feature.

4. Circuit breakers and bulkheads :: A circuit breaker stops calling a failing dependency after errors cross a threshold (open), fails fast for a while, then lets a few test requests through (half-open) before closing. Bulkheads isolate resources (separate thread pools or connection pools per dependency) so one slow dependency can't exhaust everything.

5. Retries with exponential backoff and jitter :: Retry transient failures, but with exponential backoff (100 ms, 200 ms, 400 ms…) plus random jitter so clients don't retry in sync and hammer the service again. Cap the attempts, only retry idempotent operations, and use a retry budget so retries can't multiply load during an outage.

6. Timeouts :: Every network call needs a timeout; without one, threads pile up waiting on a dead dependency. Set timeouts from the dependency's latency percentiles, and make the total deadline propagate down the call chain so lower layers give up when the caller already has.

## Recap

- 99.9% = 8.8 h/yr down; 99.99% = 52 min/yr. Serial dependencies multiply.
- Timeouts on every call; retries only for idempotent ops, with backoff + jitter + budget.
- Circuit breaker: closed → open on failures → half-open probe.
- Bulkheads: separate pools so one slow dependency can't eat all threads.

## Go deeper

### Availability math {point: 0}

Components in series multiply: a request touching 5 services each at 99.9% succeeds 0.999⁵ ≈ 99.5% of the time (~44 h of failure a year). Redundant replicas in parallel combine as 1 − (1 − a)ⁿ: two independent 99% instances give 99.99%.

So to raise availability: remove serial hops from the critical path, make each hop redundant, and make non-critical dependencies optional (degrade instead of fail). SLO = internal target (99.9% of requests < 300 ms over 28 days); error budget = what's left (0.1%) to spend on deploys and experiments.

### Redundancy and failover patterns {point: 1}

Every component on the critical path needs a plan for failure. Stateless services: run at least N+1 instances (N to carry peak load, plus spare) across availability zones behind a health-checked load balancer; a dead instance is simply removed. Load balancers themselves are managed services or redundant pairs.

Stateful stores: replicate. Active-passive (primary + standby with automatic failover) is the common case for databases: failover takes seconds to a minute, and asynchronous replication may lose the last few writes, so state your RPO. Active-active (several nodes serve writes) avoids failover delays but needs conflict handling or partitioned ownership.

Across regions: decide what failure you're protecting against. Multi-AZ handles a data center outage with low latency cost and is the default. Multi-region protects against a regional outage but adds replication lag, cost and complexity; many systems run active-passive across regions with a tested runbook and a defined RTO.

Remove hidden single points of failure: a single DNS provider, one NAT gateway, a shared config service, a leader-elected cron that nobody monitors, or a certificate that expires everywhere at once.

### Designing for graceful degradation {point: 2}

List each feature on a page and decide what happens when its dependency fails. Core (checkout, login): must work, so it gets redundancy and the strictest SLO. Important but optional (recommendations, reviews, personalized prices): fall back to cached, default or hidden content. Nice-to-have (analytics, activity feeds): drop silently and catch up later.

Techniques: serve stale cache entries when the origin fails (stale-if-error), use feature flags as kill switches to turn off expensive features under load, queue writes that can be delayed (likes, view counts), and show partial results with a notice.

Practice failure: chaos experiments (kill instances, inject latency) and game days validate that timeouts, retries and fallbacks actually behave as designed. In interviews, saying 'if the recommendation service is down we render the page without that widget, using a 200 ms timeout and a circuit breaker' shows mature thinking.

### Timeouts, circuit breakers and bulkheads together {point: 3}

A slow dependency is more dangerous than a dead one: requests pile up holding threads and connections until the caller dies too (cascading failure). Defenses work together.

Timeouts: every network call has one, set from the dependency's real latency (e.g. p99 × 2) and within the caller's own deadline. Propagate deadlines so downstream services stop working on requests the user has abandoned.

Circuit breaker: track failures per dependency. When the error rate crosses a threshold, open the circuit and fail fast (or serve a fallback) for a cooldown period; then half-open and let a few trial requests through; close if they succeed. This gives the dependency room to recover and keeps the caller responsive.

Bulkheads: isolate resources per dependency (separate thread pools, connection pools, or concurrency limits) so one slow dependency can only exhaust its own share. Combined with load shedding (reject low-priority work when saturated), the system degrades gracefully: the product page shows without recommendations rather than not at all.

Health checks: liveness ('restart me if I'm stuck') should be shallow; readiness ('send me traffic') can check critical dependencies, but avoid making every instance unready when a shared dependency blips, or you take the whole service down.

### Retry storms and how to avoid them {point: 4}

If every layer retries 3×, a failing database sees 3 × 3 × 3 = 27× the load from one user action, keeping it down. Rules: retry at one layer only (usually the edge or the client), cap attempts, use exponential backoff with full jitter (sleep = random(0, base × 2^attempt)), and use a retry budget (retries ≤ 10% of requests).

Combine with circuit breakers so callers fail fast while a dependency recovers, and with deadlines propagated downstream so work isn't done for a request the user already abandoned.

```
sleep_ms = random(0, min(cap_ms, base_ms * 2^attempt))   // full jitter
// attempt 0: 0-100 ms, 1: 0-200 ms, 2: 0-400 ms … cap at e.g. 5 s
```

## Interview questions

- How would you take this service from 99.9% to 99.99%?
- A downstream service is slow and your thread pool is exhausted. What do you do?
- Explain retries with jitter and when retries make an outage worse.

## Common mistakes

- Retrying non-idempotent writes.
- Retries at every layer multiplying load (3 layers × 3 retries = 27 requests).
