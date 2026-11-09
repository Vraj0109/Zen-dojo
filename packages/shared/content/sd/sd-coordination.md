---
id: sd-coordination
title: Coordination
area: sd
section: C. Building blocks
---

## Overview

Some decisions need one answer across the cluster: who's the leader, who holds a lock, what's the current config. Coordination services built on consensus provide these primitives so you don't build consensus yourself.

## What to know

1. ZooKeeper / etcd :: Small, strongly consistent key-value stores replicated with consensus (ZAB in ZooKeeper, Raft in etcd). Features: watches (notify on change), ephemeral keys tied to a client session or lease (vanish when the client dies), and sequential keys. Kubernetes stores its whole state in etcd. Meant for small metadata, not application data.

2. Leader election :: Each candidate creates an ephemeral sequential node (or takes a lease key); the lowest sequence (or the lease holder) is leader, and others watch it. When the leader's session expires, its node disappears and the next one takes over. Combine with fencing so the old leader can't keep writing.

3. Distributed locks :: The same recipe implements locks: the holder owns the ephemeral node, and others wait for it to be deleted. Safe because of consensus and session expiry, but still pass fencing tokens (the zxid or revision) to the storage you're protecting.

## Recap

- ZooKeeper/etcd: small, strongly consistent key-value store with watches and leases.
- Leader election: create an ephemeral key with a lease; whoever holds it leads.
- Watches notify on change; use them for config and membership.
- Keep writes small and infrequent; never put bulk data there.

## Go deeper

### What a coordination service provides {point: 0}

ZooKeeper, etcd and Consul are small replicated stores (Zab or Raft underneath) offering: linearizable writes and compare-and-set, ordered versions/revisions for every change, watches (be notified when a key or prefix changes), and session-bound data (ZooKeeper ephemeral nodes, etcd leases) that disappears automatically when the client dies or stops renewing.

From these primitives you build: leader election (whoever creates the key wins; others watch), distributed locks (with fencing via revision numbers), service registration and health (ephemeral entries per instance), configuration distribution (watch a prefix), group membership, barriers and queues. Kubernetes stores all cluster state in etcd and uses leases for controller leader election.

### ZooKeeper recipes {point: 0.5}

Ephemeral nodes disappear when the session ends (membership: each worker creates /workers/w-17). Sequential nodes get increasing suffixes (/lock/lock-0000000042): the lowest holds the lock and each other node watches only its predecessor, avoiding a thundering herd when the lock is released.

These patterns underpin Kafka's old controller election, HBase master election and many schedulers.

### Leader election with etcd {point: 1}

Each candidate grants a lease (TTL 10 s) and tries to create /election/scheduler with that lease only if it doesn't exist (a transaction comparing create revision = 0). The winner leads and keeps the lease alive with heartbeats. Others watch the key; when the leader dies, the lease expires, the key is deleted and a watcher retries.

The leader must stop acting when it loses the lease (stop the work on keepalive failure) and should pass the lease's revision as a fencing token to anything it writes, because a paused leader can outlive its lease.

### Leader election in practice {point: 1}

Why elect a leader: some work must happen exactly once at a time (a cron scheduler, a shard rebalancer, a single writer for some state). Election with etcd: campaign by creating a key under /election with your lease (only if absent, or using the election API, which orders candidates by creation revision); the earliest wins; others watch the key before theirs.

The leader must: keep its lease alive (renew well before TTL), stop leading immediately if renewal fails or it sees a newer leader, and fence its side effects with the lease/revision as a token. Followers must not assume the leader is dead just because of a slow response; the lease TTL defines the failover time (e.g. 10-15 s).

Alternatives: a database row with a lease_until column and conditional updates (good enough for many apps), or Kubernetes Lease objects. In interviews, explicitly mention 'what if the old leader is paused and comes back?', and the answer: fencing tokens and idempotent work.

### Limits and anti-patterns

Coordination services are for small, critical metadata. Keep keys small (KBs), total data small (MBs to low GBs), and write rates modest (hundreds to thousands per second). Every write goes through the leader and a quorum, so cross-region clusters are slow.

Anti-patterns: storing large blobs or high-volume data, using it as a message queue, one watch per item for millions of items, very short session timeouts that cause flapping leadership under GC pauses, and even-sized clusters (4 nodes tolerate the same failures as 3). Monitor leader changes, fsync latency and request latency; slow disks cause elections.

## Interview questions

- How would you ensure exactly one instance runs the nightly job?
- What happens to a ZooKeeper lock when the holder's machine crashes?
