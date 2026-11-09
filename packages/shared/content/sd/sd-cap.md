---
id: sd-cap
title: CAP and PACELC
area: sd
section: A. Fundamentals
---

## Overview

CAP says that during a network partition, a distributed store must choose between consistency (refuse or delay requests) and availability (answer, possibly with stale data). PACELC adds that even without partitions there's a trade-off between latency and consistency.

## What to know

1. What you give up in a partition :: Partitions happen (switches fail, links drop), so P isn't optional. When nodes can't talk, a CP system rejects writes or reads on the minority side to stay consistent (ZooKeeper, etcd, Spanner); an AP system keeps accepting them and reconciles later (Dynamo-style stores, Cassandra at low consistency levels).

2. Latency vs consistency otherwise :: PACELC: if Partition, choose Availability or Consistency; Else, choose Latency or Consistency. Synchronous replication to a quorum gives consistency but adds latency to every write even on a healthy network. DynamoDB and Cassandra are PA/EL by default; Spanner is PC/EC.

## Recap

- Partitions happen; during one choose C (refuse) or A (answer, maybe stale).
- PACELC: else (no partition), trade Latency vs Consistency.
- Spanner/etcd: PC/EC. Dynamo/Cassandra (default): PA/EL.

## Go deeper

### CAP on a concrete scenario {point: 0}

Two data centers replicate a shopping cart; the link between them drops. CP choice: the minority side rejects writes (errors for those users) so the cart never diverges. AP choice: both sides accept writes and merge later (Dynamo's cart unions items, so a deleted item can reappear).

CAP says nothing about the normal case, which is most of the time. PACELC adds it: even without partitions, synchronous replication to another region adds ~100 ms per write (consistency) while async replication is fast but can lose recent writes on failover (latency). Most real choices are the EL/EC ones.

### What CAP actually says (and doesn't) {point: 0}

CAP: in the presence of a network partition, a distributed system can't be both consistent (linearizable) and available (every request to a non-failing node gets a non-error response). So during a partition you choose: refuse or delay some requests (CP) or answer them possibly with stale or conflicting data (AP).

What it doesn't say: it's not 'pick two of three' in normal operation, since without a partition you can have both. Partitions aren't optional, since networks do fail, so 'CA' isn't a real choice for a distributed system. C means linearizability specifically, and A is a strong definition; many real systems are neither fully CP nor fully AP and make different choices per operation.

Use CAP in interviews to explain a specific behaviour: 'if the link between regions fails, this cart service keeps accepting writes in both regions (AP) and merges later, while the payment ledger rejects writes in the minority region (CP) because double spending is unacceptable.'

### Tunable consistency (quorums) {point: 1}

With N replicas, a write waits for W acks and a read queries R replicas. If R + W > N, every read set overlaps the latest write set, so a read can see the latest value (with versioning to pick it). N=3, W=2, R=2 is the common balance; W=1, R=1 is fast and eventually consistent; W=3 makes writes unavailable if any replica is down.

Quorums alone aren't linearizable (concurrent writes, sloppy quorums, failed writes partially applied); systems add read repair, hinted handoff and anti-entropy to converge.

### PACELC with examples {point: 1}

PACELC extends CAP: if there's a Partition, choose Availability or Consistency; Else (normal operation), choose Latency or Consistency. The else-branch is the one you live with every day.

PA/EL (Dynamo, Cassandra with low consistency levels): stay available during partitions, and favour low latency normally by not waiting for many replicas. PC/EC (Spanner, etcd, ZooKeeper, HBase): refuse writes without a majority during partitions, and pay coordination latency normally. PA/EC (some configurations of MongoDB historically): available in partitions, consistent reads from the primary normally. PC/EL is rare.

Practical consequence: a globally consistent database means writes wait for cross-region acknowledgement (tens to hundreds of milliseconds). If your product needs sub-50 ms writes worldwide, you either accept weaker consistency, partition data by region (each user's data is strongly consistent within its home region), or redesign the operation to be commutative.

### Making the choice in a design

Go feature by feature. Ask: what's the cost of showing stale data, and what's the cost of rejecting a request? Like counts, view counts, feeds and recommendations: stale is fine, rejecting is bad (AP, eventual). Seat booking, inventory decrement, money movement, unique usernames: wrong data is very costly, so prefer CP for those operations, with a clear error and retry.

You can mix within one system: the order service accepts orders in each region (AP) but the payment authorization and inventory reservation run against a strongly consistent store, and if that's unreachable the order waits in 'pending'. Also mention detection and repair: if you choose AP, you need reconciliation jobs, idempotent merges and monitoring for divergence.

## Interview questions

- Is your design CP or AP during a partition, and what does the user see?
- Why is 'CA' not a real option for a distributed system?

## Common mistakes

- Treating CAP as 'pick 2 of 3' for the whole system; the choice can differ per operation (tunable consistency).
