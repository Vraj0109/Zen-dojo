import type { LessonExtra } from "./types";

// Deeper material for system design fundamentals and data storage concepts.

export const DEEP_SD_A: Record<string, LessonExtra> = {
  "sd-networking": {
    recap: [
      "Request path: DNS → CDN/edge → L4/L7 load balancer → service → cache/DB.",
      "TCP handshake 1 RTT + TLS 1.3 1 RTT before the first byte; reuse connections.",
      "HTTP/2 multiplexes but suffers TCP head-of-line blocking; HTTP/3 (QUIC over UDP) fixes it.",
      "L4 = fast, protocol-agnostic; L7 = route by path/header, TLS termination, retries.",
    ],
    deeper: [
      {
        title: "Worked example: what a cold request costs",
        body: "User in Mumbai, origin in us-east (≈200 ms RTT). Cold: DNS lookup (cache miss, ~50-100 ms), TCP handshake (1 RTT = 200 ms), TLS 1.3 (1 RTT = 200 ms), request + response (1 RTT = 200 ms) → ~650 ms before any server time.\n\nWith a CDN PoP in Mumbai (≈10 ms RTT) terminating TLS and keeping warm connections to the origin: handshakes cost ~20 ms, and cached content returns in ~30 ms total. That's why designs put TLS termination and caching at the edge, and why connection reuse (keep-alive, HTTP/2) matters more than raw bandwidth.",
      },
      {
        title: "Load balancer algorithms and when each fits",
        body: "Round robin: equal servers, similar requests. Weighted round robin: mixed instance sizes. Least connections / least outstanding requests: long or uneven requests (uploads, streaming). Power of two choices: pick two random servers, send to the less loaded; nearly as good as least-connections with no global state. Consistent hashing on a key: cache affinity (same user → same cache node) at the cost of uneven load for hot keys.\n\nHealth checks remove dead backends; connection draining lets in-flight requests finish during deploys. The balancer itself is made redundant with an active-passive pair sharing a virtual IP, or several balancers behind DNS / anycast.",
      },
    ],
  },
  "sd-apis": {
    recap: [
      "Public: REST; internal service-to-service: gRPC; many client shapes: GraphQL.",
      "POST + Idempotency-Key header, server stores key → response for ~24 h.",
      "Cursor pagination for feeds: WHERE (created_at, id) < cursor ORDER BY … LIMIT n.",
      "Chat/games → WebSockets; one-way live updates → SSE; fallback → long polling.",
    ],
    deeper: [
      {
        title: "Idempotency end to end",
        body: "Client generates a UUID per logical operation and retries with the same key. Server: INSERT INTO idempotency(key, status='in_progress') ON CONFLICT DO NOTHING. If the insert won, do the work and store the response; if it lost, return the stored response (or 409 if still in progress). Wrap 'do the work + store response' in one transaction when they share a database.\n\nScope keys per user/merchant so two customers can't collide, compare the request body hash so the same key with a different payload is rejected (422), and expire keys after a window.",
        code: `POST /v1/payments
Idempotency-Key: 8f14e45f-ea5f-4b6e-9a2c-1c7d2f1b9e10
{ "amount": 4999, "currency": "INR", "source": "card_123" }

-- server side
BEGIN;
INSERT INTO idem_keys(merchant_id, key, req_hash, status)
VALUES ($1, $2, $3, 'in_progress')
ON CONFLICT (merchant_id, key) DO NOTHING;   -- 0 rows → replay stored response
-- ... charge, write ledger ...
UPDATE idem_keys SET status='done', response=$4 WHERE merchant_id=$1 AND key=$2;
COMMIT;`,
      },
      {
        title: "Keyset pagination with ties",
        body: "Sorting by created_at alone breaks when two rows share a timestamp. Sort by (created_at DESC, id DESC) and encode both in the cursor. The query uses a composite index and costs the same on page 1 and page 10,000, while OFFSET 200000 scans and throws away 200k rows.\n\nReturn next_cursor = base64({created_at, id}) of the last row. You can't jump to page N; for UIs that need it, cap offsets (e.g. 10 pages) or precompute page boundaries.",
        code: `SELECT id, created_at, body FROM posts
WHERE user_id = $1 AND (created_at, id) < ($2, $3)
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- index: (user_id, created_at DESC, id DESC)`,
      },
    ],
  },
  "sd-estimation": {
    recap: [
      "1M/day ≈ 12 QPS; 100M/day ≈ 1.2k QPS; peak ≈ 2-10× average.",
      "1 KB × 1B = 1 TB. Storage/yr = items/day × size × 365 × replicas.",
      "Memory ~100 ns, SSD ~100 µs, same-DC RTT ~0.5 ms, cross-continent ~150 ms.",
      "One Postgres primary: ~5-10k simple writes/s; one Redis node: ~100k ops/s, ~25-100 GB.",
    ],
    deeper: [
      {
        title: "Worked example: photo-sharing service",
        body: "Assume 100M DAU, 2 uploads per 10 users per day → 20M photos/day, average 2 MB after compression. Writes: 20M / 86,400 ≈ 230 uploads/s average, ~1k/s peak. Storage: 20M × 2 MB = 40 TB/day → ~15 PB/year before replication; that says object storage (S3) with lifecycle tiers, not a database.\n\nReads: each user views 50 photos/day → 5B views/day ≈ 58k/s average, 200k+/s peak, read:write ≈ 250:1 → CDN for images, cache for metadata. Metadata row ~500 bytes × 20M/day = 10 GB/day → a sharded relational or wide-column store. Each number led to a decision; that's the point.",
      },
      {
        title: "Capacity numbers worth knowing",
        body: "Single commodity server: ~10k-50k simple HTTP requests/s. Postgres/MySQL primary on good hardware: thousands to ~10k writes/s, tens of thousands of indexed reads/s. Redis: ~100k ops/s per core-bound instance. Kafka: hundreds of MB/s per broker. 1 Gbps link ≈ 125 MB/s; 10 Gbps ≈ 1.25 GB/s.\n\nThese are order-of-magnitude anchors; say them as assumptions ('roughly 10k writes per second per primary, so at 50k we shard into ~8 partitions with headroom').",
      },
    ],
  },
  "sd-scalability": {
    recap: [
      "Scale up first (simple), scale out when you hit limits or need redundancy.",
      "Stateless app tier: session in Redis/JWT, files in object storage.",
      "Autoscale on a leading signal (queue depth, CPU) with cooldowns.",
      "Backpressure: bounded queues, 429/503 + Retry-After, load shedding.",
    ],
    deeper: [
      {
        title: "Making a service stateless",
        body: "Move every piece of per-user state off the instance: sessions to Redis or signed tokens, uploads to S3 via presigned URLs, caches to a shared cache (or accept per-instance caches as an optimization only), scheduled jobs to a queue or leader-elected worker. Then any instance can serve any request, the balancer can use plain round robin, and instances can be killed at any time.\n\nSticky sessions are the shortcut when you can't: they break even load, and a dead instance logs its users out. Use them only for genuinely stateful connections (WebSockets), and even then keep the authoritative state elsewhere.",
      },
      {
        title: "Backpressure and load shedding",
        body: "When producers outpace consumers, an unbounded queue just converts overload into memory exhaustion and latency. Bound every queue and decide what happens when it's full: block the producer, drop (with a metric), or reject with 429/503 so clients back off.\n\nShed low-priority work first (analytics, prefetch) to protect checkout or login. Admission control (a concurrency limit per service, adapted like TCP congestion control) keeps latency flat under overload instead of letting every request time out.",
      },
    ],
  },
  "sd-availability": {
    recap: [
      "99.9% = 8.8 h/yr down; 99.99% = 52 min/yr. Serial dependencies multiply.",
      "Timeouts on every call; retries only for idempotent ops, with backoff + jitter + budget.",
      "Circuit breaker: closed → open on failures → half-open probe.",
      "Bulkheads: separate pools so one slow dependency can't eat all threads.",
    ],
    deeper: [
      {
        title: "Availability math",
        body: "Components in series multiply: a request touching 5 services each at 99.9% succeeds 0.999⁵ ≈ 99.5% of the time (~44 h of failure a year). Redundant replicas in parallel combine as 1 − (1 − a)ⁿ: two independent 99% instances give 99.99%.\n\nSo to raise availability: remove serial hops from the critical path, make each hop redundant, and make non-critical dependencies optional (degrade instead of fail). SLO = internal target (99.9% of requests < 300 ms over 28 days); error budget = what's left (0.1%) to spend on deploys and experiments.",
      },
      {
        title: "Retry storms and how to avoid them",
        body: "If every layer retries 3×, a failing database sees 3 × 3 × 3 = 27× the load from one user action, keeping it down. Rules: retry at one layer only (usually the edge or the client), cap attempts, use exponential backoff with full jitter (sleep = random(0, base × 2^attempt)), and use a retry budget (retries ≤ 10% of requests).\n\nCombine with circuit breakers so callers fail fast while a dependency recovers, and with deadlines propagated downstream so work isn't done for a request the user already abandoned.",
        code: `sleep_ms = random(0, min(cap_ms, base_ms * 2^attempt))   // full jitter
// attempt 0: 0-100 ms, 1: 0-200 ms, 2: 0-400 ms … cap at e.g. 5 s`,
      },
    ],
  },
  "sd-consistency": {
    recap: [
      "Strong (linearizable): reads see the latest write, as if one copy.",
      "Eventual: replicas converge; reads may be stale.",
      "Read-your-writes: route the writer's reads to the leader for a short window.",
      "Monotonic reads: pin a user to one replica so time never goes backwards.",
    ],
    deeper: [
      {
        title: "Session guarantees in practice",
        body: "A user posts a comment (written to the leader) then refreshes and reads from a lagging follower: the comment is missing. Read-your-writes fixes: read from the leader for N seconds after the user writes, or track the write's log position and only read from replicas that have caught up to it.\n\nMonotonic reads: if a user's reads bounce between a fresh and a stale replica, items appear then disappear. Pin the session to one replica (hash of user id). Consistent prefix: in a partitioned system, an answer can appear before its question; keep causally related writes in the same partition.",
      },
      {
        title: "Choosing per feature",
        body: "Bank balance, inventory decrement, unique username: strong consistency (single leader, transactions, or consensus). Like counts, view counts, feed contents, search index: eventual is fine and much cheaper. Profile edits: read-your-writes is usually enough.\n\nIn an interview, name the requirement per data type rather than picking one model for the whole system; it shows you know where consistency costs latency and availability.",
      },
    ],
  },
  "sd-cap": {
    recap: [
      "Partitions happen; during one choose C (refuse) or A (answer, maybe stale).",
      "PACELC: else (no partition), trade Latency vs Consistency.",
      "Spanner/etcd: PC/EC. Dynamo/Cassandra (default): PA/EL.",
    ],
    deeper: [
      {
        title: "CAP on a concrete scenario",
        body: "Two data centers replicate a shopping cart; the link between them drops. CP choice: the minority side rejects writes (errors for those users) so the cart never diverges. AP choice: both sides accept writes and merge later (Dynamo's cart unions items, so a deleted item can reappear).\n\nCAP says nothing about the normal case, which is most of the time. PACELC adds it: even without partitions, synchronous replication to another region adds ~100 ms per write (consistency) while async replication is fast but can lose recent writes on failover (latency). Most real choices are the EL/EC ones.",
      },
      {
        title: "Tunable consistency (quorums)",
        body: "With N replicas, a write waits for W acks and a read queries R replicas. If R + W > N, every read set overlaps the latest write set, so a read can see the latest value (with versioning to pick it). N=3, W=2, R=2 is the common balance; W=1, R=1 is fast and eventually consistent; W=3 makes writes unavailable if any replica is down.\n\nQuorums alone aren't linearizable (concurrent writes, sloppy quorums, failed writes partially applied); systems add read repair, hinted handoff and anti-entropy to converge.",
      },
    ],
  },
  "sd-dist-concurrency": {
    recap: [
      "Prefer optimistic concurrency: UPDATE … SET v=v+1 WHERE id=? AND version=?.",
      "Distributed lock = lease with TTL from etcd/ZooKeeper; it can expire under you.",
      "Fencing token: monotonically increasing number checked by the storage.",
      "Redlock relies on clocks; avoid it when correctness (not just efficiency) matters.",
    ],
    deeper: [
      {
        title: "Why a lock isn't enough: fencing tokens",
        body: "Client A gets a lease, then pauses (GC, VM stall) past its TTL. The lock service gives the lease to B, which writes. A wakes up still believing it holds the lock and writes too: corruption. A TTL can't prevent this because A can't know it was paused.\n\nFix: the lock service returns a fencing token that increases with every grant (etcd revision, ZooKeeper zxid). Every write carries the token, and the storage rejects tokens lower than the highest it has seen. A's late write (token 33) loses to B's (token 34).",
        code: `-- storage-side check
UPDATE files SET content = $1, fence = $2
WHERE path = $3 AND fence < $2;   -- 0 rows → stale lock holder`,
      },
      {
        title: "Optimistic vs pessimistic in practice",
        body: "Optimistic (version column / compare-and-set): read with a version, write only if unchanged, retry on conflict. Best when conflicts are rare (profile edits, most inventory updates). Pessimistic (SELECT … FOR UPDATE, distributed lock): block others first. Best when conflicts are frequent and retries are expensive (hot ticket seats), but watch for lock waits and deadlocks.\n\nFor counters, avoid both: atomic increments (UPDATE stock = stock − 1 WHERE stock > 0) do the check and write in one statement.",
      },
    ],
  },
  "sd-sql": {
    recap: [
      "Composite index (a, b, c) serves a, a+b, a+b+c prefixes; covering = no table lookup.",
      "EXPLAIN: look for seq scans on big tables, bad row estimates, sorts spilling to disk.",
      "Postgres default READ COMMITTED; snapshot isolation prevents most anomalies but not write skew.",
      "MVCC: readers don't block writers; old versions cleaned by vacuum.",
    ],
    deeper: [
      {
        title: "Designing an index for a query",
        body: "Query: WHERE tenant_id = ? AND status = 'open' ORDER BY created_at DESC LIMIT 50. Index (tenant_id, status, created_at DESC): equality columns first, then the sort column, so the database walks the index in order and stops after 50 rows, no sort.\n\nAdd the selected columns with INCLUDE (Postgres) to make it covering (index-only scan). Range conditions stop index usage for later columns: (a, b) with WHERE a > 5 AND b = 3 can't use b efficiently, so put equality columns before range columns.",
        code: `CREATE INDEX tickets_open ON tickets (tenant_id, status, created_at DESC)
  INCLUDE (title, assignee_id);
EXPLAIN ANALYZE SELECT title, assignee_id FROM tickets
WHERE tenant_id = 42 AND status = 'open'
ORDER BY created_at DESC LIMIT 50;   -- expect: Index Only Scan, no Sort`,
      },
      {
        title: "Write skew, the anomaly snapshot isolation misses",
        body: "Two doctors are on call; rule: at least one must stay. Both run 'SELECT count(*) FROM oncall WHERE on_call' (sees 2), then each sets themselves off call. Under snapshot isolation both commit (they wrote different rows), leaving zero on call.\n\nFixes: SERIALIZABLE isolation (Postgres SSI detects it and aborts one), SELECT … FOR UPDATE on the rows the decision depends on, or a constraint the database can enforce. Interviewers like this example because it shows isolation levels aren't just about dirty reads.",
      },
    ],
  },
  "sd-nosql": {
    recap: [
      "Key-value: lookups by key, sessions, carts (DynamoDB, Redis).",
      "Document: flexible nested records read as a whole (MongoDB).",
      "Wide-column: huge write volume, time-ordered per partition (Cassandra, Bigtable).",
      "Design NoSQL tables from access patterns; denormalize; no ad-hoc joins.",
    ],
    deeper: [
      {
        title: "Designing a wide-column table from queries",
        body: "Chat messages, query: 'latest 50 messages in conversation X, then older pages'. Partition key = conversation_id (all messages of a chat together), clustering key = message_id (time-sortable, e.g. Snowflake) DESC. A read is one partition, already sorted.\n\nHot/huge partitions: a 5-year-old group chat may hold millions of rows; bucket the partition key by time ((conversation_id, month)). There are no joins, so store what the screen needs (sender name snapshot) or fetch it from a cache.",
        code: `CREATE TABLE messages (
  conversation_id uuid,
  bucket          text,       -- e.g. '2026-11'
  message_id      bigint,     -- Snowflake: time-ordered
  sender_id       uuid,
  body            text,
  PRIMARY KEY ((conversation_id, bucket), message_id)
) WITH CLUSTERING ORDER BY (message_id DESC);`,
      },
      {
        title: "DynamoDB single-table thinking",
        body: "Each item has a partition key (PK) and sort key (SK); queries fetch one PK with an SK range. Model multiple entity types in one table with prefixed keys: PK=USER#42, SK=ORDER#2026-11-07#991 lets 'orders of user 42 in November' be one Query. Global secondary indexes give alternate access patterns (by status, by email) and are eventually consistent.\n\nWhen access patterns are unknown or need joins and ad-hoc reporting, a relational database is the better default; say so.",
      },
    ],
  },
  "sd-lsm": {
    recap: [
      "LSM: writes go to memtable + WAL, flushed as sorted SSTables; great write throughput.",
      "Reads check memtable then SSTables newest-first; Bloom filters skip files.",
      "Compaction merges SSTables: size-tiered (write-friendly) vs leveled (read-friendly).",
      "B-tree: in-place pages, predictable reads; random writes and page splits.",
    ],
    deeper: [
      {
        title: "Life of a write and a read in an LSM tree",
        body: "Write: append to the WAL (durability), insert into the in-memory memtable (a sorted structure). When the memtable hits ~64 MB it becomes immutable and is flushed as an SSTable (sorted, immutable file with an index and a Bloom filter). Deletes write tombstones.\n\nRead: memtable → immutable memtables → SSTables from newest to oldest; the Bloom filter for each file answers 'definitely not here' cheaply, and the sparse index finds the block. Compaction in the background merges files, dropping overwritten values and expired tombstones, which keeps reads fast at the cost of rewriting data (write amplification).",
      },
      {
        title: "Amplification trade-offs",
        body: "Write amplification: bytes written to disk per byte of user data. Leveled compaction (RocksDB default) rewrites data ~10× per level but keeps one file per key range per level, so reads touch few files and space overhead is ~10%. Size-tiered (Cassandra default) writes less but a key can be in many files (read amplification) and needs up to 2× disk during compaction (space amplification).\n\nB-trees write a full page (4-16 KB) for a small change plus the WAL, but reads are one root-to-leaf path. Rule of thumb: write-heavy, append-like data (logs, metrics, messages) → LSM; read-heavy with updates in place and range scans → B-tree.",
      },
    ],
  },
  "sd-replication": {
    recap: [
      "Leader-follower: simple, async lag; failover can lose unreplicated writes.",
      "Multi-leader: writes in each region, needs conflict resolution.",
      "Leaderless: quorums R + W > N, read repair, hinted handoff.",
      "Split brain prevention: fencing, quorum-based election, epochs.",
    ],
    deeper: [
      {
        title: "Failover, step by step",
        body: "1) Detect: leader misses heartbeats for a timeout (too short → false failovers, too long → longer outage). 2) Elect: the most up-to-date follower wins, ideally by consensus (Raft, Patroni with etcd). 3) Reconfigure: clients and other followers point to the new leader (DNS/VIP/service discovery update). 4) Fence the old leader so if it comes back it can't accept writes (STONITH, epoch numbers).\n\nWith async replication, writes the old leader acknowledged but hadn't shipped are lost; semi-synchronous replication (wait for at least one follower) narrows that window at a latency cost.",
      },
      {
        title: "Conflict resolution in multi-leader setups",
        body: "Two regions update the same document concurrently. Options: last-write-wins by timestamp (simple, silently drops one write, clock skew decides), merge by type (sets union, counters add: CRDTs), keep both versions and let the app or user resolve (Dynamo shopping cart, Git), or avoid conflicts by routing each record's writes to a home region.\n\nIn interviews, the honest answer is usually 'avoid multi-leader for data that can't merge; give each user a home region and replicate read-only elsewhere'.",
      },
    ],
  },
  "sd-sharding": {
    recap: [
      "Hash sharding: even load, no range scans. Range sharding: range scans, hot ranges.",
      "Consistent hashing + virtual nodes: adding a node moves ~1/N keys.",
      "Pick a shard key matching the main query and with high cardinality.",
      "Secondary indexes: local (scatter-gather reads) vs global (async, write fan-out).",
    ],
    deeper: [
      {
        title: "Choosing a shard key",
        body: "Orders table, queries: 'orders of a customer', 'order by id', occasional 'all orders today' for analytics. Shard by customer_id: a customer's orders live on one shard (single-shard queries), load spreads across millions of customers. Lookups by order_id: embed the shard in the id (Snowflake bits or a prefix) or keep a small order_id → customer_id index.\n\nBad keys: created_date (all writes hit today's shard), country (India's shard melts), a low-cardinality status. Analytics across shards goes to a warehouse via CDC, not scatter-gather on the OLTP shards.",
      },
      {
        title: "Resharding without downtime",
        body: "Avoid hash(key) mod N: changing N moves almost every key. Use many logical shards (e.g. 1024) mapped to fewer physical nodes; moving a logical shard is a bulk copy plus a cutover. Steps: copy the shard snapshot to the new node, stream changes (CDC/binlog) until caught up, briefly pause writes for that shard, flip the routing map, resume.\n\nHot keys (a celebrity) don't fix by resharding; split the key (append a random suffix and fan reads across sub-keys) or cache it in front.",
      },
    ],
  },
  "sd-dist-tx": {
    recap: [
      "2PC: atomic across nodes but blocks if the coordinator dies; avoid across services.",
      "Saga: sequence of local transactions + compensations (refund, release stock).",
      "Outbox: write the event in the same DB transaction, relay publishes it.",
      "Exactly-once = at-least-once delivery + idempotent consumer.",
    ],
    deeper: [
      {
        title: "An order saga, orchestrated",
        body: "Orchestrator (a state machine stored in a DB) runs: reserve inventory → authorize payment → create shipment → confirm order. If payment fails: compensate with release inventory, mark order failed. Each step is a local transaction in its service, triggered by a command and reporting back via an event.\n\nOrchestration centralizes the flow (easy to see and change, single point to scale); choreography has services react to each other's events (no coordinator, but the flow is implicit and cycles are easy to create). Compensations must be idempotent and can't always undo (an email was sent), so design semantic undo.",
      },
      {
        title: "The transactional outbox",
        body: "Problem: 'update the DB and publish to Kafka' can't be atomic; crash between them and the event is lost (or published for a rolled-back change). Outbox: in the same transaction as the business change, insert the event into an outbox table. A relay (poller or CDC like Debezium) reads the outbox and publishes, marking rows sent. Publishing may repeat, so consumers dedupe by event id.",
        code: `BEGIN;
UPDATE orders SET status = 'PAID' WHERE id = 991;
INSERT INTO outbox(id, aggregate, type, payload)
VALUES (gen_random_uuid(), 'order:991', 'OrderPaid', '{"orderId":991}');
COMMIT;
-- relay: SELECT ... FROM outbox WHERE sent_at IS NULL ORDER BY created_at LIMIT 100;
-- consumer: INSERT INTO processed(event_id) ... ON CONFLICT DO NOTHING → skip if seen`,
      },
    ],
  },
  "sd-consensus": {
    recap: [
      "Consensus = a majority agrees on an ordered log; survives ⌊(n−1)/2⌋ failures.",
      "Raft: leader election by terms + votes; log replication; commit on majority ack.",
      "Use 3 or 5 nodes; even counts add no fault tolerance.",
      "You use consensus via etcd/ZooKeeper for metadata, locks, leader election, not for bulk data.",
    ],
    deeper: [
      {
        title: "Raft in five steps",
        body: "1) Nodes start as followers. If a follower hears no heartbeat within a randomized timeout (150-300 ms), it becomes a candidate, increments the term and asks for votes. 2) A node votes once per term, only for a candidate whose log is at least as up to date. A majority makes it leader. 3) The leader appends client commands to its log and replicates them with AppendEntries. 4) An entry is committed once a majority has it; the leader then applies it and tells followers. 5) A stale leader that sees a higher term steps down.\n\nSafety: a new leader always has every committed entry, because committing needed a majority and electing needs a majority, and any two majorities overlap.",
      },
      {
        title: "Where it shows up in designs",
        body: "Kafka (KRaft) and Kubernetes (etcd) store cluster metadata with consensus. Distributed locks and leader election for schedulers use etcd/ZooKeeper leases. Spanner and CockroachDB run a Raft/Paxos group per data range so writes are strongly consistent.\n\nCost: every write needs a majority round trip, so cross-region groups add 50-150 ms per write. That's why you keep consensus off the hot path for high-volume data and use it for the small, critical metadata.",
      },
    ],
  },
  "sd-search": {
    recap: [
      "Inverted index: term → postings list (doc ids, positions).",
      "Analyze text: tokenize, lowercase, stem, stop words; same at index and query time.",
      "Rank with BM25 (term frequency, inverse document frequency, length) + business signals.",
      "Elasticsearch: shards + replicas, near-real-time refresh (~1 s), feed it via CDC/queue.",
    ],
    deeper: [
      {
        title: "Building and querying an inverted index",
        body: "Docs: 1 'red running shoes', 2 'blue shoes', 3 'running shorts'. After analysis (lowercase, stem 'running' → 'run', 'shoes' → 'shoe'): run → [1, 3], shoe → [1, 2], red → [1], blue → [2], short → [3]. Query 'running shoe' → intersect run ∩ shoe = [1] (AND) or union with scores (OR).\n\nPostings are sorted by doc id so intersection is a merge, with skip lists to jump ahead. Positions enable phrase queries. BM25 favors rare terms (high IDF) appearing often in a short doc.",
      },
      {
        title: "Keeping search in sync with the database",
        body: "The source of truth stays in the DB. Changes flow DB → CDC (Debezium) or outbox → Kafka → indexer → Elasticsearch, so the index lags by seconds and can be rebuilt from scratch by replaying. Dual writes from the app (DB then ES) drift on partial failures.\n\nScaling: shard by document id for even spread; replicas serve reads and survive node loss. Reindexing for a mapping change: build a new index alongside, backfill, switch an alias atomically.",
      },
    ],
  },
  "sd-blob": {
    recap: [
      "Object storage: flat key → bytes, 11 nines durability, cheap, HTTP API.",
      "Uploads/downloads go client ↔ S3 directly via presigned URLs.",
      "Multipart upload: parallel parts, resumable, required for > 5 GB.",
      "Lifecycle: hot → infrequent access → archive by age.",
    ],
    deeper: [
      {
        title: "Upload flow with presigned URLs",
        body: "1) Client asks the API for an upload (POST /uploads {size, type}). 2) API checks quota/auth, creates a metadata row (status=pending), returns a presigned PUT URL (or multipart upload id + part URLs) valid for minutes. 3) Client uploads bytes straight to S3, so app servers never carry the file. 4) S3 event (or client callback) → API marks the row uploaded, triggers processing (virus scan, thumbnails, transcoding).\n\nDownloads: presigned GET or a CDN with signed cookies/URLs for private content.",
      },
      {
        title: "Durability: replication vs erasure coding",
        body: "Three full replicas cost 3× storage and tolerate two losses. Erasure coding (e.g. Reed-Solomon 10+4) splits data into 10 fragments plus 4 parity fragments spread across failure domains: any 10 of the 14 rebuild the object, so it tolerates 4 losses at 1.4× storage. The trade-off is CPU and more network reads on repair and on degraded reads.\n\nHot, small, latency-sensitive data → replication; large, colder data → erasure coding.",
      },
    ],
  },
  "sd-warehouse": {
    recap: [
      "OLTP: many small transactions, row store. OLAP: big scans/aggregates, column store.",
      "Columnar (Parquet): read only needed columns, great compression, vectorized scans.",
      "Partition tables by date; cluster/sort by common filter columns.",
      "Feed via CDC/streams into a lake (S3 + Parquet) and a warehouse (BigQuery, Redshift, Snowflake).",
    ],
    deeper: [
      {
        title: "Why columnar is fast for analytics",
        body: "Query: SUM(amount) WHERE country = 'IN' AND day = '2026-11-06' over 10B rows with 50 columns. A row store reads every column of every row. A column store reads only country, day and amount; each column compresses well (dictionary + run-length encoding for low-cardinality country), min/max stats per row group skip groups that can't match, and date partitioning skips whole days.\n\nThe cost: single-row updates and point lookups are slow, which is why OLTP stays in Postgres/MySQL and data flows to the warehouse.",
      },
      {
        title: "Batch ETL vs streaming ingestion",
        body: "Batch (hourly/daily Spark or dbt jobs): simple, cheap, easy to backfill; data is hours old. Streaming (Kafka → Flink → warehouse/lake): seconds fresh, needs handling of late events, duplicates and schema changes.\n\nCommon answer: stream raw events into the lake continuously (append-only, partitioned by event date), run batch transformations on top for curated tables, and use the streaming path only for metrics that must be fresh (fraud, live dashboards).",
      },
    ],
  },
};
