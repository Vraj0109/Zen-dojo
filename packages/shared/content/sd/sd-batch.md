---
id: sd-batch
title: Batch processing
area: sd
section: C. Building blocks
---

## Overview

Batch processing runs over a large bounded dataset all at once: nightly reports, index builds, ML features. It's simple, high-throughput and easy to re-run, at the cost of freshness.

## What to know

1. MapReduce idea :: Map runs in parallel over input splits, emitting key-value pairs; the framework shuffles and sorts them by key; reduce aggregates each key's values. Failures are handled by re-running tasks on immutable input. The model is what matters now, not Hadoop specifically.

2. Spark :: Spark keeps intermediate data in memory across stages and plans whole pipelines as a DAG, so it's much faster than chained MapReduce jobs. It has DataFrame and SQL APIs and recomputes lost partitions from their lineage.

3. Lambda vs kappa architecture :: Lambda architecture runs a batch layer (accurate, slow) and a speed layer (fast, approximate) and merges them, at the cost of maintaining two codebases. Kappa uses only a stream processor and reprocesses history by replaying the log. Kappa is preferred when the log keeps enough history.

## Recap

- MapReduce: map → shuffle by key → reduce; the shuffle is the expensive part.
- Spark keeps data in memory across stages; lazy DAG; wide vs narrow transformations.
- Lambda: batch layer (accurate) + speed layer (fresh). Kappa: one streaming path, replay to recompute.
- Batch jobs should be idempotent: overwrite a partition, don't append.

## Go deeper

### Word count, and what makes jobs slow {point: 0}

Map: each line → (word, 1). Shuffle: all pairs with the same word go to the same reducer (network-heavy). Reduce: sum. A combiner (pre-sum on the map side) cuts shuffle volume massively.

Skew is the classic problem: one key ('the', or one celebrity user) gets most records, so one reducer runs for hours while others finish. Fixes: salt hot keys (key + random suffix, then aggregate twice), broadcast joins for small tables instead of shuffling both sides.

### Spark execution model {point: 1}

A Spark job is a DAG of transformations on distributed datasets (DataFrames). Narrow transformations (map, filter) process each partition independently; wide transformations (groupBy, join, distinct) need a shuffle, where data is redistributed across the cluster by key, written to disk and read over the network. Shuffles define stage boundaries and dominate run time.

Transformations are lazy; actions (write, count, collect) trigger execution. The Catalyst optimizer rewrites DataFrame queries (predicate pushdown into Parquet, column pruning, join reordering); adaptive query execution adjusts partition counts and join strategies at runtime using actual sizes.

Joins: broadcast hash join when one side is small (ship it to every executor, no shuffle of the big side); sort-merge join for two large sides (shuffle both by key). Skewed keys make one task run forever; enable skew join handling or salt the key. Cache intermediate datasets that are reused, and size partitions to ~100-200 MB.

### Lambda vs Kappa {point: 2}

Lambda: raw events land in the lake; a nightly batch job computes accurate views, while a streaming job provides approximate recent numbers; the serving layer merges them. Two codebases to keep consistent.

Kappa: everything is a stream (Kafka with long retention or a lake as the replay source). To fix a bug or change logic, start a new version of the job reading from the beginning, then switch readers to its output. Simpler conceptually; needs a replayable log and a fast stream processor.

### Designing reliable batch pipelines

Make jobs idempotent and deterministic: each run processes an explicit input range (a date partition) and overwrites the corresponding output partition, so reruns and backfills are safe. Avoid 'append whatever is new since last run' without a watermark you control.

Orchestrate with a scheduler (Airflow, Dagster, Step Functions) that models dependencies, retries with backoff, alerts on failure or lateness (SLA misses), and supports backfills over date ranges. Validate data at boundaries: row counts vs expectations, null rates, uniqueness, referential checks (dbt tests, Great Expectations), and stop the pipeline rather than publishing bad data.

Store data in columnar, partitioned formats (Parquet partitioned by date) and avoid many tiny files (compact them). Keep raw input immutable so you can always recompute.

### Batch in system design answers

Batch fits work that isn't latency-sensitive: nightly billing and invoicing, recomputing recommendations, search index rebuilds, analytics rollups, reconciliation against bank or partner reports, ML training, and data retention/deletion jobs.

A typical answer: 'Real-time click counts come from the stream job for dashboards; every night a Spark job recomputes exact counts from raw events in S3, deduplicated by click id, and those numbers are used for billing. If the two differ by more than 0.1%, we alert.' This combines freshness and correctness, and shows you know when each approach is appropriate.

## Interview questions

- Build a daily 'top products per category' job over 10 TB of orders.
- When would you pick Lambda over Kappa?
