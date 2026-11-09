---
id: sd-observability
title: Observability
area: sd
section: C. Building blocks
---

## Overview

Observability is being able to tell what's wrong in production from the outside. Metrics tell you that something is wrong, traces tell you where, and logs tell you why. Interviewers want to hear what you'd monitor and alert on.

## What to know

1. Metrics, logs, traces :: Metrics: cheap numeric time series (request rate, error rate, latency percentiles, saturation) for dashboards and alerts. Logs: detailed per-event records, structured (JSON) with request ids. Traces: follow one request across services as spans, showing where time goes. Correlate all three by trace id.

2. Alerting and dashboards :: Alert on symptoms users feel (error rate, latency SLO breach), not on causes (CPU 80%). Every alert should be actionable and urgent; everything else goes on a dashboard. Golden signals: latency, traffic, errors, saturation (RED and USE methods).

3. SLO burn rate :: Error budget = 1 - SLO (0.1% of requests for 99.9%). Burn rate is how fast you're spending it; a 14× burn exhausts a 30-day budget in about 2 days. Multi-window burn-rate alerts (fast and slow) catch both sharp outages and slow leaks with few false alarms.

4. On-call runbooks :: Each alert links to a runbook: what it means, how to check, how to mitigate (roll back, fail over, scale). Clear ownership, an escalation path, and blameless postmortems that produce action items.

## Recap

- Metrics (cheap, aggregated), logs (detail per event), traces (one request across services).
- RED for services: rate, errors, duration. USE for resources: utilization, saturation, errors.
- Alert on symptoms users feel (SLO burn rate), not on every cause.
- Propagate a trace id through every hop and log it.

## Go deeper

### Metrics: types and cardinality {point: 0}

Counters only go up (requests served, errors); rates come from differences over time. Gauges go up and down (queue depth, memory in use). Histograms bucket observations (request latency) so you can compute percentiles across instances; averages hide tail latency, so report p50, p95, p99. Summaries compute quantiles on the client but can't be aggregated across instances.

Each unique combination of metric name and label values is a separate time series. Labels like endpoint, status code, region are fine; labels like user id, request id or full URL explode cardinality and can take down the metrics system. Put high-cardinality detail in logs and traces instead.

The four golden signals (latency, traffic, errors, saturation) per service, plus business metrics (orders per minute, sign-ups), form the core of what you monitor.

### Logs and traces {point: 0}

Logs: structured (JSON) with consistent fields: timestamp, level, service, trace id, span id, user/tenant id, request path, error details. Ship them to a central store (ELK/OpenSearch, Loki, Cloud Logging) with retention tiers. Log at the right level: errors with context and stack traces, warnings for degraded behaviour, info for significant events; avoid logging every request body at high volume, and never log secrets or sensitive personal data.

Distributed tracing: each request gets a trace id at the edge, propagated through every call (W3C traceparent header). Each service records spans (operation, start, duration, attributes, parent span). The trace view shows where time went across services, which calls were in parallel, and where errors started. OpenTelemetry is the standard for instrumentation; backends include Jaeger, Tempo, Zipkin, Honeycomb and Datadog.

Sampling: keep a percentage of normal traces, but keep all errors and slow requests (tail-based sampling decides after the trace completes).

### What to put on a service dashboard {point: 1}

Top row: request rate, error rate, p50/p95/p99 latency (RED), SLO status. Then saturation: CPU, memory, connection pools, queue depth, consumer lag. Then dependencies: latency and errors per downstream call. Deploy markers overlaid on graphs answer 'did the deploy do this?'.

Logs: structured JSON with trace_id, user/tenant id, and no secrets or PII. Traces: sample (e.g. 1%) but keep all errors and slow requests (tail-based sampling).

### SLO burn-rate alerting {point: 2}

SLO: 99.9% of requests succeed over 30 days → error budget 0.1%. Burn rate = observed error rate / budget rate. Burning at 14.4× for 1 hour consumes 2% of the monthly budget: page someone. Burning at 6× over 6 hours (5% of the budget): page. Slow burns (1× over 3 days) → ticket.

Multi-window rules (e.g. 1 h and 5 min both above threshold) catch fast incidents quickly and stop alerting soon after recovery, instead of 'error rate > 1% for 5 minutes' rules that are both noisy and late.

### Alerting and on-call that people can live with {point: 3}

Page only on symptoms users feel and that need a human now: SLO burn rate, the service being down, data loss risk. Everything else becomes a ticket or a dashboard. Each alert links to a runbook (what it means, how to check, how to mitigate) and a dashboard.

Good alerts are actionable, have an owner, and fire rarely; review alert noise regularly and delete alerts nobody acts on. Use multi-window burn-rate alerts for SLOs, and inhibit downstream alerts when an upstream dependency is the cause.

After incidents, write blameless postmortems: timeline, impact, root cause and contributing factors, what went well, and action items with owners (often observability gaps). In a design interview, a short 'how we'd know it's broken' section (key metrics, SLOs, alerts) is a strong signal.

## Interview questions

- What would you monitor for this design, and what would page someone at 3 a.m.?
- Why p99 latency rather than average?
