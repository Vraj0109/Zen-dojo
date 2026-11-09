---
id: sd-queues
title: Message queues and streams
area: sd
section: C. Building blocks
---

## Overview

Queues and logs decouple producers from consumers in time and rate: absorb spikes, retry failures, and fan work out to many consumers. Know the difference between a work queue (SQS, RabbitMQ) and a replayable log (Kafka).

## What to know

1. Kafka: topics, partitions, consumer groups, offsets :: A topic is split into partitions, each an ordered append-only log; ordering holds within a partition. Producers choose the partition by key (so all events for one order stay in order). A consumer group shares the partitions, each read by one consumer of the group, so parallelism equals the partition count. Consumers commit offsets to record progress.

2. Kafka retention, ordering, exactly-once semantics :: Kafka keeps messages for a retention period whether or not they're consumed, so consumers can replay and new consumers can read history; log compaction keeps the latest value per key. Ordering holds per partition only. Exactly-once semantics come from idempotent producers plus transactions spanning consume-process-produce within Kafka.

3. SQS/SNS, RabbitMQ :: SQS is a managed work queue: a message is hidden while one consumer processes it, and deleted on success. Standard queues are at-least-once and unordered; FIFO queues order within a message group. SNS fans one message out to many subscribers (SNS → several SQS queues). RabbitMQ is a broker with flexible routing (exchanges) and push delivery.

4. Dead-letter queues :: Messages that keep failing (poison messages) move to a dead-letter queue after N attempts, so they don't block the queue or loop forever. Alert on DLQ depth and build a way to inspect and replay messages.

5. At-least-once delivery :: Most queues guarantee at-least-once delivery: a message can arrive twice (consumer crashed after processing, before acknowledging). Consumers must be idempotent. At-most-once (ack before processing) can lose messages.

6. Backpressure :: When consumers fall behind, queue depth or consumer lag grows. Monitor it, autoscale consumers on it (up to the partition count for Kafka), and bound the queue or shed load at the producer if lag becomes unacceptable.

## Recap

- Kafka: ordered within a partition only; key by entity id to keep its events in order.
- Consumer group: each partition read by one consumer; max parallelism = partitions.
- At-least-once: commit offsets after processing; make handlers idempotent.
- Poison messages → retries with backoff → dead-letter queue + alert.

## Go deeper

### Kafka internals worth knowing {point: 0}

A topic is split into partitions; each partition is an append-only log on disk, stored as segment files with an offset index and time index. Producers choose the partition (by key hash, or round robin without a key). Each partition has one leader broker and followers that replicate it; the in-sync replica set (ISR) is the followers caught up within a time bound.

Durability settings: replication factor 3, acks=all (the leader waits for all in-sync replicas), min.insync.replicas=2 (refuse writes if fewer are in sync), and an idempotent producer (sequence numbers stop duplicates from producer retries). Consumers in a group split partitions among themselves; each partition is consumed by exactly one consumer in the group, so parallelism is capped by the partition count.

Retention keeps data for a time or size limit regardless of consumption, so new consumers can replay history. Log compaction keeps only the latest record per key, turning a topic into a changelog of current state. Throughput comes from sequential disk writes, OS page cache, batching, compression, and zero-copy sends to consumers.

### Getting ordering and parallelism together {point: 1}

Need: process each order's events in order, but many orders in parallel. Use order_id as the message key so all of an order's events land in one partition; partitions give parallelism (e.g. 64 partitions, 64 consumers). Inside a consumer, you can parallelize further by key with per-key queues.

Rebalancing (a consumer joins/leaves) pauses consumption and can re-deliver uncommitted messages, which is fine with idempotent handlers. Choose partition count up front generously; increasing it later changes key → partition mapping and breaks per-key ordering across the change.

### Kafka vs SQS vs RabbitMQ {point: 2}

Kafka: a durable, replayable log. Retention by time/size (days), consumers track offsets and can rewind, high throughput, ordering per partition. Fits event streams, CDC, analytics, multiple independent consumers.

SQS: a managed queue; messages are deleted after processing, visibility timeout hides in-flight messages, FIFO queues give ordering per message group at lower throughput. Fits task queues with no ops burden. RabbitMQ: a broker with flexible routing (exchanges, topics), per-message acks, priority queues; good for complex routing and RPC-ish work at moderate scale.

### Delivery semantics and acknowledgements {point: 4}

At-most-once: acknowledge (or commit the offset) before processing; a crash loses the message. Acceptable for metrics you can afford to drop. At-least-once: process, then acknowledge; a crash after processing but before the ack causes redelivery, so handlers must be idempotent. The standard choice. Exactly-once processing: at-least-once plus deduplication or transactional commits.

In SQS, a received message becomes invisible for the visibility timeout; if not deleted before it ends, it becomes visible again for another consumer. Set the timeout longer than your processing time and extend it for long jobs. In Kafka, consumers commit offsets per partition; a rebalance or crash resumes from the last committed offset, reprocessing anything after it. In RabbitMQ, unacked messages are redelivered when the consumer's channel closes; prefetch limits how many unacked messages a consumer holds.

Dead-letter queues collect messages that failed N times (poison messages) so they don't block the queue; alert on DLQ depth and provide a way to inspect and replay.

### Patterns built on queues

Work queue: many workers share tasks (image processing, emails); scale workers by backlog. Pub/sub fan-out: one event, many independent subscribers (SNS → several SQS queues, or several Kafka consumer groups), so services react independently (order placed → email, inventory, analytics).

Event sourcing: store state changes as an immutable event log; current state is a projection. Gives audit history and replay, at the cost of complexity and schema evolution care. CQRS: separate write models from read models, with events updating read-optimized views.

Load leveling: a queue absorbs bursts so downstream systems process at a steady rate (ticket sales, flash sales). Delayed and scheduled delivery: SQS delay queues, RabbitMQ delayed exchanges, or a scheduler table that enqueues when due. Priority: separate queues per priority, with more consumers on the high-priority queue.

In interviews, name the queue's role explicitly ('Kafka here decouples order placement from fulfilment, buffers spikes, and lets analytics replay events') rather than adding one by reflex.

## Interview questions

- Kafka or SQS for sending notifications? For an activity event stream?
- How do you keep per-user ordering while processing in parallel?
- What happens if a consumer crashes mid-message?
