---
id: sd-stream
title: Stream processing
area: sd
section: C. Building blocks
---

## Overview

Stream processing computes continuously over unbounded event streams: rolling counts, fraud detection, real-time dashboards. The key ideas are time (event time vs processing time), windows and state.

## What to know

1. Flink / Spark Streaming :: Flink is a true streaming engine: event-at-a-time processing, managed state with checkpoints, low latency. Spark Structured Streaming processes small micro-batches, with somewhat higher latency and simpler semantics, and is good if you already use Spark. Kafka Streams is a library for Kafka-to-Kafka processing.

2. Windowing :: Group events into windows to aggregate: tumbling (fixed, non-overlapping: per minute), sliding/hopping (overlapping: last 5 minutes every minute), and session windows (bursts of activity separated by gaps). Window by event time to get correct results despite delays.

3. Watermarks and late events :: Events arrive late and out of order (mobile clients offline). A watermark is the engine's estimate that 'no more events older than T are coming'; a window closes when the watermark passes its end. Set allowed lateness, and send very late events to a side output or correct earlier results.

4. Exactly-once state :: The engine checkpoints operator state and source offsets together. After a failure it restores the state and replays from the saved offsets, so each event affects state exactly once. End-to-end exactly-once also needs transactional or idempotent sinks.

## Recap

- Event time (when it happened) vs processing time (when you see it).
- Windows: tumbling (fixed, no overlap), sliding/hopping (overlap), session (gap-based).
- Watermark = 'probably no older events will come'; late events → allowed lateness or side output.
- Exactly-once state: checkpoints of state + source offsets, transactional sinks.

## Go deeper

### Stream processing building blocks {point: 0}

A stream job reads from a log (Kafka, Kinesis), applies operators and writes to sinks (databases, other topics, dashboards). Stateless operators: filter, map, enrich from a cached lookup. Stateful operators: aggregations over windows, joins between streams, deduplication, pattern detection, all needing state that survives failures (Flink keeps it in RocksDB with checkpoints; Kafka Streams keeps it in local stores backed by changelog topics).

Keyed processing: the stream is partitioned by key (user id, ad id) so all events for a key reach the same operator instance, which holds that key's state. Repartitioning by a different key requires a shuffle.

Joins: stream-table (enrich each click with the latest user profile from a changelog table); stream-stream within a time window (match an ad impression with a click within 30 minutes); both rely on buffered state and watermarks to know when to drop old data.

### Counting clicks per minute correctly {point: 1}

Mobile clients buffer events offline, so a click at 10:00:59 might arrive at 10:03. Window by event time (tumbling 1-minute windows keyed by ad_id). The watermark trails the max event time seen by, say, 2 minutes; when it passes 10:01, the 10:00 window fires. Events later than the allowed lateness go to a side output that a batch job reconciles.

The trade-off is latency vs completeness: a longer watermark delay gives more accurate counts later. Dashboards often show an early estimate and update it.

### Windows, watermarks and late data, step by step {point: 1}

Tumbling windows split time into fixed, non-overlapping intervals (every minute). Hopping (sliding) windows have a size and a slide (5-minute windows every minute), so an event belongs to several windows. Session windows group a key's events separated by gaps shorter than a timeout (user sessions).

Event time is when the event happened (in the payload); processing time is when the job sees it. Always aggregate by event time for correctness, since mobile clients and retries deliver late.

A watermark W(t) is the job's assertion that no more events with event time ≤ t are expected. Typical: max event time seen minus a bounded delay (e.g. 30 s). When the watermark passes a window's end, the window emits its result. Allowed lateness keeps window state a while longer and emits updated results for late events; events later than that go to a side output for batch correction. Trade-off: longer delays give more complete results but higher latency and more state.

### How Flink gets exactly-once state {point: 3}

Flink periodically injects checkpoint barriers into the streams. When an operator has seen the barrier on all inputs, it snapshots its state (to S3/HDFS). A checkpoint = consistent snapshot of every operator's state + the Kafka offsets it corresponds to. After a crash, Flink restores state and rewinds sources to those offsets, so each event affects state exactly once.

For outputs, exactly-once needs a transactional sink (Kafka transactions committed on checkpoint) or idempotent writes (upserts keyed by window + key).

### Choosing a stream processor

Apache Flink: true streaming with low latency, rich event-time support, exactly-once state with checkpoints, large state in RocksDB; the default for serious stream processing. Spark Structured Streaming: micro-batches (or continuous mode), the same API as batch Spark, great when the team already uses Spark and seconds of latency are fine. Kafka Streams: a library inside your service (no separate cluster), state backed by Kafka, ideal for per-service stream logic reading and writing Kafka. Managed: Kinesis Data Analytics (Flink), Google Dataflow (Apache Beam).

Operational concerns: consumer lag monitoring, state size and checkpoint duration, rescaling (state redistributes by key groups), schema evolution of events, and reprocessing (start a new job version from an earlier offset, write to a new output, then switch).

## Interview questions

- Count clicks per ad per minute in real time with late mobile events.
- Event time vs processing time: which do you use for billing?
