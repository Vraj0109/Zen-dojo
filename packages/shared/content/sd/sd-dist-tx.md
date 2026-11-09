---
id: sd-dist-tx
title: Transactions across services
area: sd
section: B. Data storage
---

## Overview

Once data lives in several services or databases, there's no single transaction to make everything atomic. Use 2PC sparingly, prefer sagas with compensating actions, publish events reliably with an outbox, and make every consumer idempotent.

## What to know

1. 2PC :: Two-phase commit: a coordinator asks every participant to prepare (vote), then tells all of them to commit or abort. It's atomic, but blocking: if the coordinator dies after prepare, participants hold locks until it recovers. Fine inside one database cluster; avoid it across microservices.

2. Saga (choreography vs orchestration) :: A saga is a sequence of local transactions, each with a compensating action that undoes it (reserve stock → charge card → on failure, release stock). Choreography: services react to each other's events (decoupled, but the flow is hard to see). Orchestration: a central coordinator drives the steps (clear flow, one more component).

3. Outbox pattern :: To update the database and publish an event without 2PC, write the event to an outbox table in the same local transaction as the business change. A relay (polling or change data capture) publishes outbox rows to the broker and marks them sent. Delivery is at-least-once, never 'database committed but event lost'.

4. Idempotent consumers :: Brokers redeliver, so consumers must handle duplicates: track processed message ids, use upserts or conditional writes, and make side effects idempotent (an idempotency key on the payment call). This turns at-least-once delivery into effectively-once processing.

5. Exactly-once myths :: Exactly-once delivery across a network is impossible in general: a sender can't tell 'lost' from 'slow'. Systems that advertise it (Kafka transactions) give exactly-once processing within their own boundary. Across systems, you get at-least-once plus idempotency.

## Recap

- 2PC: atomic across nodes but blocks if the coordinator dies; avoid across services.
- Saga: sequence of local transactions + compensations (refund, release stock).
- Outbox: write the event in the same DB transaction, relay publishes it.
- Exactly-once = at-least-once delivery + idempotent consumer.

## Go deeper

### Two-phase commit, precisely {point: 0}

2PC coordinates an atomic commit across participants (databases or resource managers). Phase 1 (prepare): the coordinator asks each participant to prepare; each writes everything needed to commit durably, takes locks, and votes yes or no. Phase 2 (commit/abort): if all voted yes, the coordinator durably logs 'commit' and tells everyone to commit; otherwise it tells everyone to abort.

The problem: once a participant votes yes, it must wait for the decision while holding locks. If the coordinator crashes after prepare, participants are stuck in-doubt until it recovers (blocking). Latency is at least two round trips plus durable writes, and throughput suffers from held locks. It works inside one database cluster or between a few databases in a data center (XA transactions, Spanner uses 2PC over Paxos groups so the coordinator itself is replicated), but it's a poor fit between independently deployed microservices.

### An order saga, orchestrated {point: 1}

Orchestrator (a state machine stored in a DB) runs: reserve inventory → authorize payment → create shipment → confirm order. If payment fails: compensate with release inventory, mark order failed. Each step is a local transaction in its service, triggered by a command and reporting back via an event.

Orchestration centralizes the flow (easy to see and change, single point to scale); choreography has services react to each other's events (no coordinator, but the flow is implicit and cycles are easy to create). Compensations must be idempotent and can't always undo (an email was sent), so design semantic undo.

### Designing sagas well {point: 1}

A saga splits a business transaction into local transactions T1…Tn, each with a compensating action C1…Cn that semantically undoes it. If Tk fails, run Ck−1…C1.

Design rules: order steps so the hardest-to-undo happen last (charge the card after reserving inventory, and ship only after payment); make every step and compensation idempotent (they will be retried); store the saga's state durably (orchestrator database or event log) so it resumes after crashes; and handle the 'pending' states in the UI (the order shows 'processing').

Isolation is weaker than ACID: other transactions can see intermediate states (inventory reserved but payment not done). Countermeasures include semantic locks (mark the order PENDING so other flows treat it carefully), commutative updates, and re-reading values before acting. Tools: Temporal or AWS Step Functions for orchestration, Kafka-based choreography with an outbox.

### The transactional outbox {point: 2}

Problem: 'update the DB and publish to Kafka' can't be atomic; crash between them and the event is lost (or published for a rolled-back change). Outbox: in the same transaction as the business change, insert the event into an outbox table. A relay (poller or CDC like Debezium) reads the outbox and publishes, marking rows sent. Publishing may repeat, so consumers dedupe by event id.

```
BEGIN;
UPDATE orders SET status = 'PAID' WHERE id = 991;
INSERT INTO outbox(id, aggregate, type, payload)
VALUES (gen_random_uuid(), 'order:991', 'OrderPaid', '{"orderId":991}');
COMMIT;
-- relay: SELECT ... FROM outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 100;
-- consumer: INSERT INTO processed(event_id) ... ON CONFLICT DO NOTHING → skip if seen
```

### Exactly-once, explained honestly {point: 4}

Networks can't guarantee exactly-once delivery: a sender that doesn't get an acknowledgement can't know if the message arrived, so it must retry (at-least-once) or give up (at-most-once). What systems provide is exactly-once processing effects: retries are deduplicated so the outcome is as if each message were processed once.

Mechanisms: idempotency keys (store processed message ids in the same transaction as the effect); idempotent writes (upserts keyed by a natural id; 'set status to PAID' rather than 'add 100'); transactional consumers that commit the output and the consumed offset atomically (Kafka transactions, Flink checkpoints with transactional sinks).

The boundary matters: Kafka's exactly-once covers reading from Kafka, processing, and writing to Kafka. As soon as you call an external API (send an email, charge a card), you're back to at-least-once and need idempotency on that external call. Say this in interviews; it shows you won't promise magic.

## Interview questions

- Design order checkout across Order, Payment and Inventory services.
- How do you make sure an event is published if and only if the DB write commits?
