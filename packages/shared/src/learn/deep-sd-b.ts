import type { LessonExtra } from "./types";

// Deeper material for system design building blocks.

export const DEEP_SD_B: Record<string, LessonExtra> = {
  "sd-caching": {
    recap: [
      "Cache-aside default: read cache → miss → DB → set with TTL; on write update DB then delete the key.",
      "Stampede fixes: single-flight lock, early probabilistic refresh, serve stale while revalidating.",
      "Hot key: replicate it across nodes or keep a tiny in-process cache.",
      "Always set TTLs; they bound the damage of any invalidation bug.",
    ],
    deeper: [
      {
        title: "Why 'delete on write' beats 'update on write'",
        body: "Writer A sets price=10, writer B sets price=12. If each also updates the cache, the cache can end at 10 while the DB says 12 (B's cache write landed first). Deleting the key instead means the next reader loads the current DB value.\n\nA race remains: a reader misses, reads the old value from the DB, a writer updates the DB and deletes the key, then the reader writes the old value into the cache. Mitigations: short TTLs, delayed double delete, or versioned values (only set if newer). For strict needs, invalidate from the DB's change stream (CDC) so the order follows commit order.",
        code: `def get_product(id):
    v = cache.get(f"product:{id}")
    if v is not None:
        return v
    with single_flight(f"product:{id}"):          # one loader per key
        v = db.query("SELECT ... WHERE id = %s", id)
        cache.set(f"product:{id}", v, ttl=300 + random(0, 60))   # jitter TTLs
    return v

def update_price(id, price):
    db.execute("UPDATE products SET price = %s WHERE id = %s", price, id)
    cache.delete(f"product:{id}")`,
      },
      {
        title: "Sizing and eviction",
        body: "Size the cache for the working set, not all data: 100M users × 1 KB profile = 100 GB total, but if 20% are active daily, ~20 GB keeps the hit rate high. Measure hit rate; below ~80% the cache may be adding latency without saving much.\n\nLRU fits recency-driven access; LFU (Redis allkeys-lfu) protects popular items from being flushed by a one-off scan. Redis vs Memcached: Redis has data structures, persistence, replication and Lua; Memcached is a simple multithreaded key-value cache that scales vertically well. Most designs say Redis.",
      },
    ],
  },
  "sd-queues": {
    recap: [
      "Kafka: ordered within a partition only; key by entity id to keep its events in order.",
      "Consumer group: each partition read by one consumer; max parallelism = partitions.",
      "At-least-once: commit offsets after processing; make handlers idempotent.",
      "Poison messages → retries with backoff → dead-letter queue + alert.",
    ],
    deeper: [
      {
        title: "Kafka vs SQS vs RabbitMQ",
        body: "Kafka: a durable, replayable log. Retention by time/size (days), consumers track offsets and can rewind, high throughput, ordering per partition. Fits event streams, CDC, analytics, multiple independent consumers.\n\nSQS: a managed queue; messages are deleted after processing, visibility timeout hides in-flight messages, FIFO queues give ordering per message group at lower throughput. Fits task queues with no ops burden. RabbitMQ: a broker with flexible routing (exchanges, topics), per-message acks, priority queues; good for complex routing and RPC-ish work at moderate scale.",
      },
      {
        title: "Getting ordering and parallelism together",
        body: "Need: process each order's events in order, but many orders in parallel. Use order_id as the message key so all of an order's events land in one partition; partitions give parallelism (e.g. 64 partitions, 64 consumers). Inside a consumer, you can parallelize further by key with per-key queues.\n\nRebalancing (a consumer joins/leaves) pauses consumption and can re-deliver uncommitted messages, which is fine with idempotent handlers. Choose partition count up front generously; increasing it later changes key → partition mapping and breaks per-key ordering across the change.",
      },
    ],
  },
  "sd-stream": {
    recap: [
      "Event time (when it happened) vs processing time (when you see it).",
      "Windows: tumbling (fixed, no overlap), sliding/hopping (overlap), session (gap-based).",
      "Watermark = 'probably no older events will come'; late events → allowed lateness or side output.",
      "Exactly-once state: checkpoints of state + source offsets, transactional sinks.",
    ],
    deeper: [
      {
        title: "Counting clicks per minute correctly",
        body: "Mobile clients buffer events offline, so a click at 10:00:59 might arrive at 10:03. Window by event time (tumbling 1-minute windows keyed by ad_id). The watermark trails the max event time seen by, say, 2 minutes; when it passes 10:01, the 10:00 window fires. Events later than the allowed lateness go to a side output that a batch job reconciles.\n\nThe trade-off is latency vs completeness: a longer watermark delay gives more accurate counts later. Dashboards often show an early estimate and update it.",
      },
      {
        title: "How Flink gets exactly-once state",
        body: "Flink periodically injects checkpoint barriers into the streams. When an operator has seen the barrier on all inputs, it snapshots its state (to S3/HDFS). A checkpoint = consistent snapshot of every operator's state + the Kafka offsets it corresponds to. After a crash, Flink restores state and rewinds sources to those offsets, so each event affects state exactly once.\n\nFor outputs, exactly-once needs a transactional sink (Kafka transactions committed on checkpoint) or idempotent writes (upserts keyed by window + key).",
      },
    ],
  },
  "sd-batch": {
    recap: [
      "MapReduce: map → shuffle by key → reduce; the shuffle is the expensive part.",
      "Spark keeps data in memory across stages; lazy DAG; wide vs narrow transformations.",
      "Lambda: batch layer (accurate) + speed layer (fresh). Kappa: one streaming path, replay to recompute.",
      "Batch jobs should be idempotent: overwrite a partition, don't append.",
    ],
    deeper: [
      {
        title: "Word count, and what makes jobs slow",
        body: "Map: each line → (word, 1). Shuffle: all pairs with the same word go to the same reducer (network-heavy). Reduce: sum. A combiner (pre-sum on the map side) cuts shuffle volume massively.\n\nSkew is the classic problem: one key ('the', or one celebrity user) gets most records, so one reducer runs for hours while others finish. Fixes: salt hot keys (key + random suffix, then aggregate twice), broadcast joins for small tables instead of shuffling both sides.",
      },
      {
        title: "Lambda vs Kappa",
        body: "Lambda: raw events land in the lake; a nightly batch job computes accurate views, while a streaming job provides approximate recent numbers; the serving layer merges them. Two codebases to keep consistent.\n\nKappa: everything is a stream (Kafka with long retention or a lake as the replay source). To fix a bug or change logic, start a new version of the job reading from the beginning, then switch readers to its output. Simpler conceptually; needs a replayable log and a fast stream processor.",
      },
    ],
  },
  "sd-discovery": {
    recap: [
      "Services register with a registry (Consul/etcd/Kubernetes); clients resolve by name.",
      "Client-side discovery (client picks instance) vs server-side (load balancer picks).",
      "Service mesh: sidecar proxy (Envoy) does mTLS, retries, timeouts, metrics per call.",
      "API gateway at the edge: auth, rate limits, routing, request shaping.",
    ],
    deeper: [
      {
        title: "How Kubernetes does it",
        body: "A Deployment runs pods with changing IPs. A Service gives them one stable virtual IP and DNS name (orders.prod.svc.cluster.local); kube-proxy routes the virtual IP to healthy pod IPs, and readiness probes decide which pods are in rotation. Config and secrets are mounted from ConfigMaps/Secrets, changed by rolling restarts or watched at runtime.\n\nA mesh (Istio/Linkerd) adds a sidecar per pod so every call gets mTLS, retries, timeouts, circuit breaking and tracing without app code changes, at the cost of extra latency (~1 ms per hop) and operational complexity.",
      },
      {
        title: "Gateway vs mesh responsibilities",
        body: "North-south (client → system) goes through the API gateway: authentication, per-client rate limits, API keys, request validation, routing to services, response caching, protocol translation (REST → gRPC).\n\nEast-west (service → service) goes through the mesh or client libraries: service identity (mTLS), retries with budgets, timeouts, load balancing, telemetry. Saying which concern lives where avoids putting business logic in the gateway.",
      },
    ],
  },
  "sd-rate-limit": {
    recap: [
      "Token bucket: capacity B, refill r/s; allows bursts up to B. Default choice.",
      "Sliding window counter: weighted previous + current window, cheap and smooth.",
      "Distributed: Redis with a Lua script (atomic check + update), key per client.",
      "Return 429 + Retry-After; fail open or closed deliberately if Redis is down.",
    ],
    deeper: [
      {
        title: "Token bucket in Redis, atomically",
        body: "Store tokens and last refill time per key. On each request: compute tokens = min(B, tokens + (now − last) × r); if tokens ≥ 1, decrement and allow, else deny. Running this as a Lua script makes the read-modify-write atomic so concurrent requests on different gateway nodes can't both take the last token.",
        code: `-- KEYS[1] = bucket key; ARGV = capacity, refill_per_sec, now_ms
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local cap, rate, now = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local tokens = tonumber(b[1]) or cap
local ts = tonumber(b[2]) or now
tokens = math.min(cap, tokens + (now - ts) / 1000 * rate)
local allowed = 0
if tokens >= 1 then tokens = tokens - 1; allowed = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate * 1000) * 2)
return allowed`,
      },
      {
        title: "Comparing the algorithms",
        body: "Fixed window (count per minute): simplest, but allows 2× the limit across a window boundary. Sliding log (timestamps per request): exact, memory per request. Sliding window counter: count_prev × overlap% + count_current, nearly exact with two counters. Token bucket: allows controlled bursts, smooth average. Leaky bucket: a queue drained at a fixed rate, smooths output (good in front of a fragile downstream).\n\nAt very high scale, keep local in-memory buckets per gateway node and sync to Redis periodically, accepting slight overshoot for much less latency.",
      },
    ],
  },
  "sd-ids": {
    recap: [
      "UUIDv4: random, no coordination, 128-bit, bad for B-tree locality.",
      "Snowflake: 41-bit ms timestamp + 10-bit machine + 12-bit sequence; sortable, 64-bit.",
      "ULID/UUIDv7: time-ordered 128-bit, sortable strings/UUIDs.",
      "DB ranges: a service grabs blocks of 1000 ids from a sequence; simple, needs the DB.",
    ],
    deeper: [
      {
        title: "Snowflake layout and its failure modes",
        body: "64 bits: 1 sign bit, 41 bits of milliseconds since a custom epoch (~69 years), 10 bits of worker id (1024 workers), 12 bits of sequence (4096 ids per ms per worker → ~4M ids/s per worker). Ids sort by time, fit in a BIGINT, and need no coordination at runtime.\n\nRisks: clock moving backwards (NTP adjustment) can produce duplicates; on detecting it, wait until the clock catches up or refuse. Worker ids must be unique: assign from ZooKeeper/etcd or from the pod ordinal. Ids leak creation time and volume, so don't expose them where that matters.",
        code: `id = ((now_ms - EPOCH) << 22) | (worker_id << 12) | sequence
// same ms: sequence = (sequence + 1) & 0xFFF; if it wraps, spin to the next ms`,
      },
      {
        title: "Short codes for URL shorteners",
        body: "Base62 of a 64-bit counter: 7 characters cover 62⁷ ≈ 3.5 trillion codes. Counter sources: a DB sequence with range allocation per app server, or Snowflake ids (longer codes). Random 7-char codes need a uniqueness check (collision rate grows as the space fills). Sequential codes are guessable; if that matters, shuffle with a reversible permutation (e.g. multiply by a large odd number mod 2⁶⁴, or a small block cipher) before encoding.",
      },
    ],
  },
  "sd-coordination": {
    recap: [
      "ZooKeeper/etcd: small, strongly consistent key-value store with watches and leases.",
      "Leader election: create an ephemeral key with a lease; whoever holds it leads.",
      "Watches notify on change; use them for config and membership.",
      "Keep writes small and infrequent; never put bulk data there.",
    ],
    deeper: [
      {
        title: "Leader election with etcd",
        body: "Each candidate grants a lease (TTL 10 s) and tries to create /election/scheduler with that lease only if it doesn't exist (a transaction comparing create revision = 0). The winner leads and keeps the lease alive with heartbeats. Others watch the key; when the leader dies, the lease expires, the key is deleted and a watcher retries.\n\nThe leader must stop acting when it loses the lease (stop the work on keepalive failure) and should pass the lease's revision as a fencing token to anything it writes, because a paused leader can outlive its lease.",
      },
      {
        title: "ZooKeeper recipes",
        body: "Ephemeral nodes disappear when the session ends (membership: each worker creates /workers/w-17). Sequential nodes get increasing suffixes (/lock/lock-0000000042): the lowest holds the lock and each other node watches only its predecessor, avoiding a thundering herd when the lock is released.\n\nThese patterns underpin Kafka's old controller election, HBase master election and many schedulers.",
      },
    ],
  },
  "sd-observability": {
    recap: [
      "Metrics (cheap, aggregated), logs (detail per event), traces (one request across services).",
      "RED for services: rate, errors, duration. USE for resources: utilization, saturation, errors.",
      "Alert on symptoms users feel (SLO burn rate), not on every cause.",
      "Propagate a trace id through every hop and log it.",
    ],
    deeper: [
      {
        title: "SLO burn-rate alerting",
        body: "SLO: 99.9% of requests succeed over 30 days → error budget 0.1%. Burn rate = observed error rate / budget rate. Burning at 14.4× for 1 hour consumes 2% of the monthly budget: page someone. Burning at 6× over 6 hours (5% of the budget): page. Slow burns (1× over 3 days) → ticket.\n\nMulti-window rules (e.g. 1 h and 5 min both above threshold) catch fast incidents quickly and stop alerting soon after recovery, instead of 'error rate > 1% for 5 minutes' rules that are both noisy and late.",
      },
      {
        title: "What to put on a service dashboard",
        body: "Top row: request rate, error rate, p50/p95/p99 latency (RED), SLO status. Then saturation: CPU, memory, connection pools, queue depth, consumer lag. Then dependencies: latency and errors per downstream call. Deploy markers overlaid on graphs answer 'did the deploy do this?'.\n\nLogs: structured JSON with trace_id, user/tenant id, and no secrets or PII. Traces: sample (e.g. 1%) but keep all errors and slow requests (tail-based sampling).",
      },
    ],
  },
  "sd-security": {
    recap: [
      "AuthN = who you are; AuthZ = what you may do (RBAC/ABAC, checked server-side).",
      "OAuth2 authorization code + PKCE for user login; client credentials for service-to-service.",
      "JWT: stateless but hard to revoke → short expiry + refresh tokens. Sessions: easy to revoke.",
      "TLS in transit, KMS-managed keys at rest, secrets in a vault, least privilege everywhere.",
    ],
    deeper: [
      {
        title: "OAuth2 authorization code flow with PKCE",
        body: "1) App creates a random code_verifier and sends its hash (code_challenge) with the redirect to the authorization server. 2) User logs in and consents; the server redirects back with a short-lived code. 3) App exchanges the code + code_verifier for tokens; the server checks the hash, so an intercepted code is useless. 4) App gets an access token (short-lived, e.g. 15 min) and a refresh token.\n\nAPIs validate the access token (JWT signature + expiry + audience, or introspection) and check scopes/roles. OpenID Connect adds an ID token for identity.",
      },
      {
        title: "Protecting PII and secrets",
        body: "Classify fields (email, phone, address, payment data). Encrypt sensitive columns with envelope encryption: a data key per record/tenant encrypts the data, and KMS encrypts the data key; rotating means re-wrapping keys, not re-encrypting everything. Tokenize card numbers (store a token, keep the PAN in a PCI-scoped vault).\n\nNever log PII or tokens, restrict who can query production, keep audit logs, and support deletion (GDPR) by keying data by user and having a deletion pipeline including backups' retention limits.",
      },
    ],
  },
  "sd-deployment": {
    recap: [
      "Rolling: replace instances gradually. Blue-green: switch traffic between two stacks. Canary: 1% → 10% → 100% with automatic rollback on metrics.",
      "Feature flags decouple deploy from release; clean them up.",
      "Schema changes: expand → migrate → contract, so old and new code both work.",
      "Multi-AZ by default; multi-region for disaster recovery or latency (active-passive vs active-active).",
    ],
    deeper: [
      {
        title: "Zero-downtime schema change",
        body: "Rename column name → full_name. Expand: add full_name (nullable); deploy code that writes both and reads name. Backfill full_name in batches. Switch reads to full_name. Contract: stop writing name, then drop it in a later release.\n\nEach step is backward compatible with the previous code version, so rolling deploys and rollbacks are safe. Big-table changes use online tools (gh-ost, pg_repack) or batched updates to avoid long locks.",
      },
      {
        title: "Multi-region choices",
        body: "Active-passive: one region serves, the other has replicated data and scaled-down capacity; failover takes minutes (RTO) and may lose seconds of async writes (RPO). Simpler and cheaper.\n\nActive-active: every region serves users near it. Reads are easy; writes need either a home region per user (route writes there) or multi-leader replication with conflict handling, or a globally consistent database (Spanner) with higher write latency. State your RTO/RPO and choose.",
      },
    ],
  },
  "sd-probabilistic": {
    recap: [
      "Bloom filter: 'definitely not' or 'maybe'; ~10 bits/item for 1% false positives.",
      "HyperLogLog: distinct counts with ~0.8% error in 12 KB (Redis PFADD/PFCOUNT).",
      "Count-Min Sketch: frequency estimates that only overcount; heavy hitters with a heap.",
      "Geohash prefixes / quadtrees for 'nearby'; consistent hashing for partitioning.",
    ],
    deeper: [
      {
        title: "Sizing a Bloom filter",
        body: "For n items and false-positive rate p: bits m = −n·ln(p) / (ln 2)² and hash functions k = (m/n)·ln 2. For 1B URLs at 1%: m ≈ 9.6 bits × 1B ≈ 1.2 GB, k ≈ 7. At 0.1%: ~14.4 bits per item.\n\nUses: skip disk reads for absent keys (LSM SSTables), a crawler's 'seen URL' check, avoiding cache lookups for keys that don't exist. Can't delete (counting Bloom filters can) and can't list members.",
      },
      {
        title: "Geohash and quadtree for nearby search",
        body: "Geohash interleaves latitude/longitude bits into a base32 string; a shared prefix means a nearby cell (6 chars ≈ 1.2 km × 0.6 km). Index drivers by geohash; to search, look up the user's cell plus its 8 neighbours (points near a cell edge are close but have different prefixes).\n\nQuadtree: recursively split a region into 4 until each leaf has ≤ K points; dense cities get small cells, deserts big ones. Good for uneven density and k-nearest queries; harder to shard. Many production systems (Uber's H3) use hexagonal hierarchical grids for uniform neighbour distances.",
      },
    ],
  },
};
