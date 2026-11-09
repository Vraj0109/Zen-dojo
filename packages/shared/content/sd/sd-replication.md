---
id: sd-replication
title: Replication
area: sd
section: B. Data storage
---

## Overview

Replication keeps copies of data on several machines for availability, read scaling and lower latency. The hard parts are replication lag, failover, and deciding who accepts writes.

## What to know

1. Leader-follower :: One leader accepts writes and streams changes to followers, which serve reads. Simple and widely used (Postgres, MySQL). Synchronous replication to at least one follower avoids losing acknowledged writes; asynchronous is faster but can lose recent writes when the leader dies.

2. Multi-leader :: Several leaders accept writes, often one per region, and replicate to each other. Good for multi-region writes and offline clients, but concurrent writes to the same data conflict and need resolution (last-write-wins, merge functions, CRDTs).

3. Leaderless (quorum R+W>N) :: Any replica accepts reads and writes (Dynamo, Cassandra). With N replicas, a write waits for W acknowledgements and a read queries R replicas; if R + W > N, a read overlaps at least one up-to-date replica. Repair stale replicas with read repair and anti-entropy (Merkle trees).

4. Replication lag :: Followers trail the leader by milliseconds to minutes. Effects: a user doesn't see their own write, or sees data go backwards. Mitigate with read-your-writes (read from the leader after a write), monotonic reads (pin a user to a replica), or by routing critical reads to the leader.

5. Failover and split brain :: When the leader fails, a follower is promoted, by consensus or an orchestrator. Risks: losing un-replicated writes, and split brain, where two nodes both think they're the leader and accept writes. Prevent split brain with quorum-based election and fencing the old leader.

## Recap

- Leader-follower: simple, async lag; failover can lose unreplicated writes.
- Multi-leader: writes in each region, needs conflict resolution.
- Leaderless: quorums R + W > N, read repair, hinted handoff.
- Split brain prevention: fencing, quorum-based election, epochs.

## Go deeper

### Synchronous, semi-synchronous and chain replication {point: 0}

Synchronous replication: the leader waits for followers to confirm before acknowledging a commit. No acknowledged write is lost on failover, but every write pays the slowest follower's latency, and a follower outage blocks writes. Usually you make one follower synchronous and the rest asynchronous (semi-synchronous; MySQL's semi-sync, Postgres's synchronous_standby_names with ANY 1).

Quorum replication (Raft, Paxos): wait for a majority, so a minority of slow or dead replicas doesn't block, and a new leader always has every committed write.

Chain replication: writes go to the head and flow down a chain; the tail acknowledges and serves reads, giving strong consistency with high throughput; used by some object stores.

The interview point: replication mode is a durability/latency trade-off you choose per system and state as RPO ('async cross-region replication means we can lose up to a few seconds of writes if a region is lost').

### Conflict resolution in multi-leader setups {point: 1}

Two regions update the same document concurrently. Options: last-write-wins by timestamp (simple, silently drops one write, clock skew decides), merge by type (sets union, counters add: CRDTs), keep both versions and let the app or user resolve (Dynamo shopping cart, Git), or avoid conflicts by routing each record's writes to a home region.

In interviews, the honest answer is usually 'avoid multi-leader for data that can't merge; give each user a home region and replicate read-only elsewhere'.

### Leaderless replication mechanics {point: 2}

In Dynamo-style systems any replica accepts writes. A coordinator sends the write to all N replicas responsible for the key and returns success after W acknowledge; reads query R replicas and take the newest version (by timestamp or vector clock).

Repair mechanisms keep replicas converging: read repair (when a read sees a stale replica, write the newest value back to it), hinted handoff (if a replica is down, another node stores the write with a hint and forwards it when the replica returns), and anti-entropy (background comparison of Merkle trees per key range to find and sync differences).

Edge cases: sloppy quorums (writes land on non-home nodes during failures) break the R + W > N guarantee temporarily; concurrent writes need conflict resolution; and deletes need tombstones kept long enough for all replicas to see them. These are the follow-ups interviewers ask after you mention quorums.

### Replication lag and its visible effects {point: 3}

With asynchronous replication, followers apply the leader's log a little later: milliseconds normally, seconds or minutes under load or after network trouble. Users notice three things. Their own write seems lost (they post, refresh, and the read hits a lagging replica). Time goes backwards (two refreshes hit different replicas, so a comment appears then disappears). Causality breaks (a reply appears before the message it answers, if they're stored on different partitions).

Fixes: read-your-writes (read from the leader for data the user changed recently, or wait until a replica has applied the user's last write position), monotonic reads (stick a user to one replica), and consistent prefix (keep causally related writes in the same partition, or track dependencies).

Also monitor lag as a metric (seconds behind, or log position difference) and alert on it; route traffic away from replicas that fall too far behind.

### Failover, step by step {point: 4}

1) Detect: leader misses heartbeats for a timeout (too short → false failovers, too long → longer outage). 2) Elect: the most up-to-date follower wins, ideally by consensus (Raft, Patroni with etcd). 3) Reconfigure: clients and other followers point to the new leader (DNS/VIP/service discovery update). 4) Fence the old leader so if it comes back it can't accept writes (STONITH, epoch numbers).

With async replication, writes the old leader acknowledged but hadn't shipped are lost; semi-synchronous replication (wait for at least one follower) narrows that window at a latency cost.

## Interview questions

- Leader-follower, multi-leader or leaderless for a global shopping cart?
- With N=3, what R and W give strong reads? What if one node is down?
- What is split brain and how do you prevent it?
