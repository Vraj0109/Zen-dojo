import type { WalkthroughExtra } from "./types";

// Per design: what to remember and the follow-ups interviewers ask, with short answers.

export const DESIGN_EXTRA: Record<string, WalkthroughExtra> = {
  "sdd-url-shortener": {
    recap: [
      "Read-heavy (~100:1); 7-char base62 = 3.5T codes.",
      "Codes from a counter with range allocation (no collisions) or hash + collision check.",
      "Redirect path: cache (Redis) → KV store; 301 cacheable vs 302 trackable.",
      "Click analytics async via a queue, never on the redirect path.",
    ],
    followUps: [
      { q: "How do you support custom aliases?", a: "Same table, insert with a uniqueness constraint on the code; reject if taken. Reserve a namespace (or length) so generated codes never collide with aliases." },
      { q: "301 or 302?", a: "301 lets browsers cache and cuts load but hides repeat clicks from analytics; 302 (or 307) keeps every click visible. Most shorteners use 302 when analytics matter." },
      { q: "How do you expire links and reclaim codes?", a: "Store expires_at, check it on redirect, and run a background sweeper. Don't reuse codes quickly: old links in the wild would point to new content." },
      { q: "How do you stop abuse?", a: "Rate-limit creation per user/IP, scan destinations against malware/phishing lists, and allow takedowns." },
    ],
  },
  "sdd-rate-limiter": {
    recap: [
      "Token bucket per (client, endpoint); state in Redis, atomic via Lua.",
      "Enforce at the gateway; return 429 + Retry-After + X-RateLimit-* headers.",
      "Local buckets + periodic sync for very high QPS (accept slight overshoot).",
      "Decide fail-open vs fail-closed if Redis is unavailable.",
    ],
    followUps: [
      { q: "How do you rate-limit across multiple data centers?", a: "Usually per-region limits (global limit / regions) with occasional rebalancing, because a cross-region round trip per request is too slow. Truly global strict limits need a central counter and accept the latency." },
      { q: "How do you handle a hot key (one client hammering)?", a: "Its Redis key lives on one shard; keep a local in-memory bucket in each gateway that only syncs every few hundred ms, and block at the edge (WAF) for abusive clients." },
      { q: "How do limits change without a deploy?", a: "Rules in a config service, cached in each gateway and refreshed on change (watch/poll), with defaults if config is unavailable." },
    ],
  },
  "sdd-kv-store": {
    recap: [
      "Consistent hashing with virtual nodes; replicate to the next N−1 nodes on the ring.",
      "Quorum R + W > N for read-your-latest; N=3, W=2, R=2 typical.",
      "Conflicts: vector clocks or LWW; read repair + Merkle-tree anti-entropy.",
      "Storage engine: LSM (WAL + memtable + SSTables + Bloom filters).",
    ],
    followUps: [
      { q: "What happens when a node is down during a write?", a: "Sloppy quorum: write to the next healthy node with a hint; hinted handoff delivers it when the owner returns." },
      { q: "How do you detect failures?", a: "Gossip protocol: nodes exchange heartbeat tables; a node not heard from within a timeout is suspected, then marked down by agreement." },
      { q: "How do you find divergent replicas efficiently?", a: "Merkle trees per key range: compare root hashes, descend only into differing subtrees, sync just those keys." },
      { q: "How would you make it strongly consistent?", a: "Run a Raft group per partition (like etcd/TiKV): writes go through the leader and commit on majority; reads from the leader (or with read-index)." },
    ],
  },
  "sdd-notifications": {
    recap: [
      "API → validate + preferences → per-channel queues (push, SMS, email) → workers → providers.",
      "Idempotency key per notification to dedupe retries.",
      "Retries with backoff per provider; DLQ; fallback provider for SMS/email.",
      "Respect user preferences, quiet hours and rate limits per user.",
    ],
    followUps: [
      { q: "How do you send a campaign to 50M users?", a: "Batch job splits the audience into chunks and enqueues them gradually (throttled to provider limits), separate from transactional traffic so OTPs aren't delayed." },
      { q: "How do you guarantee an OTP isn't sent twice?", a: "Dedupe by idempotency key in a store with TTL before sending; at-least-once delivery from the queue plus this check gives effectively-once." },
      { q: "How do you track delivery?", a: "Provider callbacks (webhooks) update status per notification; expose status and metrics, retry or fall back on failures." },
    ],
  },
  "sdd-news-feed": {
    recap: [
      "Fan-out on write (push to followers' feed caches) for normal users.",
      "Fan-out on read (pull at read time) for celebrities; merge both.",
      "Feed cache stores post ids only; hydrate posts/users from caches.",
      "Ranking: candidate generation → scoring model → mix and dedupe.",
    ],
    followUps: [
      { q: "A user with 100M followers posts. What happens?", a: "Don't fan out; mark them as a celebrity. Followers' feed reads fetch the latest celebrity posts they follow and merge them with the precomputed feed." },
      { q: "How do you handle a user who hasn't logged in for months?", a: "Skip fan-out to inactive users; rebuild their feed on demand when they return." },
      { q: "How do you paginate a ranked feed?", a: "Snapshot the ranked list for the session (cursor = position in snapshot) so items don't shift or repeat while scrolling." },
    ],
  },
  "sdd-chat": {
    recap: [
      "WebSocket gateways hold connections; a session registry maps user → gateway.",
      "Messages persisted (Cassandra, partition by conversation) before ack; ids time-ordered.",
      "Offline users: store and push notification; sync from last seen message id.",
      "Group fan-out by members; big groups via per-group queues.",
    ],
    followUps: [
      { q: "How do you guarantee ordering?", a: "Per-conversation ordering from a sequence assigned by the conversation's owner shard (or Snowflake ids within one partition); clients sort by it and dedupe by message id." },
      { q: "How do sent/delivered/read receipts work?", a: "Server ack = sent; recipient device ack = delivered; read event when shown. Each is a small message routed back to the sender's devices." },
      { q: "How do you do presence for millions of users?", a: "Heartbeats from connected clients update a TTL key; publish changes only to contacts who are online and subscribed, with debounce to avoid flapping." },
      { q: "Multi-device?", a: "Each device has its own connection and sync cursor; messages fan out to all of a user's devices." },
    ],
  },
  "sdd-video": {
    recap: [
      "Upload to object storage via presigned/multipart; metadata DB tracks state.",
      "Transcoding DAG: split into chunks, transcode in parallel to a bitrate ladder, package HLS/DASH.",
      "Serve segments from CDN; adaptive bitrate chosen by the player.",
      "Popular content pre-warmed in CDN; long tail served from origin/regional caches.",
    ],
    followUps: [
      { q: "How do you make transcoding fast for a 2-hour video?", a: "Split at keyframes into chunks (e.g. 10 s), transcode chunks in parallel across workers, then stitch/package; failed chunks retry independently." },
      { q: "How does adaptive bitrate work?", a: "The video is encoded at several bitrates, cut into 2-6 s segments listed in a manifest; the player measures throughput and buffer and picks the next segment's quality." },
      { q: "How do you count views at scale?", a: "Player emits events to a queue; stream aggregation with dedupe per session; counts eventually consistent and periodically reconciled." },
    ],
  },
  "sdd-file-sync": {
    recap: [
      "Files split into ~4 MB chunks addressed by content hash (dedupe, resumable).",
      "Metadata service: file → ordered chunk list + version; blobs in object storage.",
      "Clients upload only changed chunks; notifications (long poll/WebSocket) trigger sync.",
      "Conflicts: keep both copies ('conflicted copy') or merge by type.",
    ],
    followUps: [
      { q: "Two devices edit the same file offline. What happens?", a: "Each upload names the base version it edited; the second commit sees the base is stale and is saved as a conflicted copy for the user to resolve." },
      { q: "How does dedupe work across users?", a: "Chunk hash lookup before upload: if the chunk exists, just reference it. Beware it can leak whether a file exists; some systems dedupe per user only." },
      { q: "How do you sync a folder with 1M files quickly?", a: "Per-namespace change journal with a cursor; clients fetch only changes since their cursor instead of listing everything." },
    ],
  },
  "sdd-ride-sharing": {
    recap: [
      "Drivers send location every ~4 s; store latest in memory (Redis/geo index), not the main DB.",
      "Geo index by geohash/H3 cell; search the cell and neighbours.",
      "Matching service offers a ride to drivers one at a time (or batched) with a timeout.",
      "Trip state machine in a durable store; payments async after the trip.",
    ],
    followUps: [
      { q: "How do you handle 1M location updates per second?", a: "Shard the geo index by cell/city, keep only the latest position in memory, write history asynchronously to a cheap store for analytics." },
      { q: "How do you prevent two riders getting the same driver?", a: "Lock the driver atomically when offering (compare-and-set driver status available → offered with a TTL)." },
      { q: "How is ETA computed?", a: "Routing on a road graph with live traffic weights (contraction hierarchies for speed), corrected by an ML model trained on actual trip times." },
    ],
  },
  "sdd-typeahead": {
    recap: [
      "Trie with top-k completions precomputed at each node.",
      "Built offline from query logs (counts with time decay), shipped as snapshots.",
      "Serve from memory; shard by prefix; cache popular prefixes at the edge.",
      "Client debounces keystrokes (~100 ms) and caches results.",
    ],
    followUps: [
      { q: "How do you surface trending queries quickly?", a: "A streaming pipeline counts recent queries and merges a small 'trending' layer into results between full rebuilds." },
      { q: "How do you filter offensive suggestions?", a: "Blocklist applied at build time and at serve time (for fast removals)." },
      { q: "How do you personalize?", a: "Blend global top-k with the user's recent searches at serve time; keep personalization lightweight to stay within latency." },
    ],
  },
  "sdd-crawler": {
    recap: [
      "URL frontier: priority queues + per-host queues for politeness.",
      "Respect robots.txt and crawl delay; one connection per host at a time.",
      "Dedupe URLs (normalized, Bloom filter/seen set) and content (hash/simhash).",
      "Fetchers → parse → extract links → frontier; store pages in object storage.",
    ],
    followUps: [
      { q: "How do you avoid crawler traps?", a: "Limit depth and URLs per host, detect repeating path patterns and session ids, cap pages per domain per day." },
      { q: "How do you recrawl?", a: "Schedule by change frequency and importance: pages that changed often are revisited sooner (adaptive intervals)." },
      { q: "How do you scale DNS?", a: "Local caching resolvers and an in-process DNS cache; DNS is a common hidden bottleneck." },
    ],
  },
  "sdd-job-scheduler": {
    recap: [
      "Jobs table indexed by next_run_at; schedulers claim due jobs with leases.",
      "Claim: UPDATE … SET owner, lease_until WHERE due AND (unowned OR lease expired) (SKIP LOCKED).",
      "Workers execute idempotently; at-least-once + idempotency ≈ exactly once.",
      "Retries with backoff, max attempts, DLQ; history table for audit.",
    ],
    followUps: [
      { q: "A worker dies mid-job. What happens?", a: "Its lease expires; another scheduler reclaims the job and reruns it, which is why jobs must be idempotent (or checkpoint progress)." },
      { q: "How do you run 1M jobs at 9:00 sharp?", a: "Pre-enqueue them into time-bucketed queues before 9:00 and scale workers; spread with jitter where exact timing isn't required." },
      { q: "How do you avoid double execution with clock skew?", a: "Leases come from the database clock (or a fencing token), not worker clocks." },
    ],
  },
  "sdd-payments": {
    recap: [
      "Idempotency key on every payment request.",
      "Double-entry ledger: every movement is balanced debits and credits, append-only.",
      "Payment state machine; external PSP calls with retries and status polling.",
      "Daily reconciliation against PSP/bank reports; fix discrepancies explicitly.",
    ],
    followUps: [
      { q: "The PSP call timed out. Did the charge happen?", a: "Unknown: mark the payment pending, query the PSP by our idempotency key/reference, and retry with the same key; never create a new charge." },
      { q: "Why a ledger instead of a balance column?", a: "Append-only entries give an audit trail and let you recompute balances; balances can be cached but are derived." },
      { q: "How do you handle refunds and chargebacks?", a: "New ledger entries reversing the original (never edit history), linked to the original payment, each with its own state machine." },
    ],
  },
  "sdd-inventory": {
    recap: [
      "Reserve stock at checkout (with expiry), commit on payment, release on timeout/failure.",
      "Atomic conditional decrement: UPDATE stock SET available = available − n WHERE available ≥ n.",
      "Order state machine with idempotent transitions.",
      "Cache product pages, never trust cached stock for the final check.",
    ],
    followUps: [
      { q: "How do you prevent overselling during a sale?", a: "The final reservation is an atomic decrement in the source of truth; for extreme hotspots, split stock into sub-buckets or serialize through a queue per SKU." },
      { q: "Payment fails after reserving. What happens?", a: "The saga compensates: release the reservation (or let it expire), mark the order failed, notify the user." },
      { q: "Stock across warehouses?", a: "Track per (SKU, warehouse); choose the warehouse at reservation time by proximity and availability." },
    ],
  },
  "sdd-ticketing": {
    recap: [
      "Virtual waiting room to admit users at a controlled rate.",
      "Seat hold with TTL (Redis SET NX EX or DB row with hold_until).",
      "Confirm on payment; expired holds return seats.",
      "Idempotent purchase; fairness and bot protection.",
    ],
    followUps: [
      { q: "100k users click the same seat. How do you decide who gets it?", a: "Atomic hold (SET seat:42 user NX EX 300): exactly one succeeds; others get 'taken' immediately." },
      { q: "How do you keep the site up during the on-sale?", a: "Waiting room queue at the edge, static pages from the CDN, seat map from a cache, and the booking path protected with rate limits." },
      { q: "How do you stop bots?", a: "CAPTCHA/attestation at queue entry, per-account limits, purchase limits per card/user." },
    ],
  },
  "sdd-metrics": {
    recap: [
      "Agents push (or servers pull) metrics → ingestion → time-series DB.",
      "Store compressed time series (delta-of-delta timestamps, XOR values).",
      "Downsample old data (1 s → 1 min → 1 h) with retention per resolution.",
      "Alerting evaluates rules on recent data; dedupes and routes notifications.",
    ],
    followUps: [
      { q: "How do you handle high cardinality labels?", a: "Limit and monitor label cardinality (no user ids as labels); each unique label set is a separate series and memory cost." },
      { q: "Push or pull?", a: "Pull (Prometheus) gives the server control and easy health detection; push suits short-lived jobs and agents behind NAT. Many systems support both." },
      { q: "How do you query across months fast?", a: "Use the downsampled rollups for long ranges and raw data only for recent windows." },
    ],
  },
  "sdd-kafka": {
    recap: [
      "Topic = partitions = append-only logs split into segment files + offset index.",
      "Leader per partition; followers fetch; ISR; acks=all with min.insync.replicas=2.",
      "Consumers track offsets per partition in an internal topic.",
      "Throughput from sequential I/O, page cache, batching and zero-copy.",
    ],
    followUps: [
      { q: "How do you avoid losing messages?", a: "Replication factor 3, acks=all, min.insync.replicas=2, idempotent producer, and no unclean leader election." },
      { q: "How do you get exactly-once processing?", a: "Idempotent producer + transactions that write outputs and consumer offsets atomically; downstream consumers read committed only." },
      { q: "Retention vs compaction?", a: "Time/size retention deletes old segments; log compaction keeps the latest value per key (good for changelogs and state)." },
    ],
  },
  "sdd-collab-editing": {
    recap: [
      "Each document has an ordered stream of operations through a server (or a CRDT).",
      "OT: transform concurrent ops against each other; needs a central server for ordering.",
      "CRDT: ops commute by design (unique ids per character); works offline/peer-to-peer.",
      "Snapshots + op log for loading; cursors/presence as ephemeral messages.",
    ],
    followUps: [
      { q: "OT or CRDT?", a: "OT with a central server is proven (Google Docs) and compact; CRDTs suit offline-first and peer-to-peer but carry metadata overhead. Either is fine if you can explain conflict handling." },
      { q: "How do you scale to many documents?", a: "Shard by document id; one owner process per active document holds state in memory and sequences ops." },
      { q: "How do you load a long-lived document quickly?", a: "Periodic snapshots; load the snapshot plus ops since it." },
    ],
  },
  "sdd-maps": {
    recap: [
      "Map tiles precomputed per zoom level, served from CDN (vector tiles).",
      "Routing on a road graph; precomputation (contraction hierarchies) for fast queries.",
      "Live traffic from location pings adjusts edge weights.",
      "Nearby friends: geohash cells + pub/sub for location updates.",
    ],
    followUps: [
      { q: "Why not run plain Dijkstra on the whole road network?", a: "Continental graphs have hundreds of millions of edges; preprocessing (contraction hierarchies) answers queries in milliseconds." },
      { q: "How do you update nearby friends in real time?", a: "Each user publishes location to a channel for their cell; friends subscribed to nearby cells get updates; only friends within radius are shown." },
      { q: "How do you keep tiles fresh?", a: "Rebuild changed regions offline and version tiles; CDN serves versioned URLs." },
    ],
  },
  "sdd-top-k": {
    recap: [
      "Events → Kafka → stream aggregation by (ad, window) → store.",
      "Exact counts per window with keyed state; top-k with a heap per window.",
      "Approximate (Count-Min Sketch + heap) when keys are huge; exact batch reconciliation.",
      "Dedupe clicks by click id; handle late events with watermarks.",
    ],
    followUps: [
      { q: "How do you make billing counts exact?", a: "Stream gives fast approximate numbers; a batch job over raw events (deduped) produces the authoritative counts used for billing." },
      { q: "How do you compute global top-k across partitions?", a: "Each partition computes a local top-k (or top-N > k) per window; a merger combines them. For exactness, aggregate by key first so each key lives on one partition." },
      { q: "How do you handle hot ads?", a: "Pre-aggregate locally (combiner) before shuffling by key, or salt the key and sum in a second stage." },
    ],
  },
  "sdd-recommendations": {
    recap: [
      "Two stages: candidate generation (cheap, recall) → ranking (expensive model, precision).",
      "Offline: train models and compute embeddings; online: feature store + low-latency serving.",
      "Cache recommendations per user, refresh on events.",
      "Measure with A/B tests on business metrics.",
    ],
    followUps: [
      { q: "How do you handle a new user (cold start)?", a: "Popular/trending items, onboarding preferences, and context (location, device) until there's enough behaviour." },
      { q: "How do you keep latency under 100 ms?", a: "Approximate nearest neighbour search for candidates, a feature store with precomputed features, and model serving with batching and caching." },
      { q: "How do you avoid training-serving skew?", a: "Compute features with the same code/pipeline for training and serving, logged at serving time." },
    ],
  },
  "sdd-building-blocks": {
    recap: [
      "ID generator: Snowflake (time + worker + sequence), sortable 64-bit.",
      "Distributed lock: etcd/ZooKeeper lease + fencing token.",
      "API gateway: auth, rate limits, routing, TLS termination, observability.",
    ],
    followUps: [
      { q: "How do you assign Snowflake worker ids safely?", a: "Lease them from etcd/ZooKeeper (or use pod ordinals); never configure by hand across a large fleet." },
      { q: "When is Redis SET NX good enough for a lock?", a: "When the lock is an efficiency optimization (avoid duplicate work), not a correctness guarantee; for correctness use fencing tokens with a consensus store." },
      { q: "How do you keep the gateway from becoming a bottleneck?", a: "Stateless gateway instances behind an L4 balancer, autoscaled; push heavy logic into services." },
    ],
  },
  "sdd-order-management": {
    recap: [
      "Order state machine with allowed transitions; every change is an event.",
      "Idempotent commands (client request id) and optimistic concurrency (version).",
      "Saga across inventory, payment, shipping with compensations.",
      "Outbox to publish order events reliably.",
    ],
    followUps: [
      { q: "Two updates arrive for the same order concurrently. What happens?", a: "Both carry the version they read; the second fails the version check and retries after reloading, so no update is lost." },
      { q: "How do customers see order history fast?", a: "A read model (CQRS) built from order events, keyed by customer, separate from the write model." },
      { q: "How do you cancel an order that's partly shipped?", a: "Model line-item states; cancel what hasn't shipped, start a return for what has, each as compensating steps." },
    ],
  },
  "sdd-warehouse": {
    recap: [
      "Stock per (SKU, location, state: available, reserved, damaged).",
      "Every movement is an append-only transaction (receive, pick, transfer, adjust).",
      "Reservations with expiry; cycle counts reconcile physical vs system stock.",
      "Events feed availability to the storefront (eventually consistent).",
    ],
    followUps: [
      { q: "How do you keep storefront availability accurate?", a: "Publish availability changes as events to a fast read store; show 'low stock' conservatively and do the hard check at reservation time." },
      { q: "A cycle count disagrees with the system. What do you do?", a: "Record an adjustment transaction with a reason (never overwrite counts), investigate patterns, alert on large deltas." },
      { q: "How do you allocate an order across warehouses?", a: "Allocation service scores warehouses by distance, stock and cost; split shipments only when needed." },
    ],
  },
  "sdd-delivery-slots": {
    recap: [
      "Capacity per (zone, slot); holds with TTL during checkout.",
      "Atomic decrement of remaining capacity; release on expiry.",
      "Read path cached (show availability), write path authoritative.",
      "Overbooking buffer and graceful 'slot full' handling.",
    ],
    followUps: [
      { q: "Thousands check out for the same evening slot. How do you avoid overbooking?", a: "Hold with an atomic conditional decrement (or Redis DECR with a floor check) per slot; failed holds immediately see 'full'." },
      { q: "A user's hold expires during payment. What now?", a: "Try to re-acquire the same slot at payment confirmation; if gone, offer the nearest available slot." },
      { q: "How do you change capacity (more drivers)?", a: "Capacity updates adjust remaining counts atomically; display caches refresh from events." },
    ],
  },
  "sdd-pricing": {
    recap: [
      "Price = base price + applicable rules/promotions evaluated in a defined order.",
      "Price quote with id and expiry; checkout charges the quoted price.",
      "Rules cached in memory; versioned for audit.",
      "Precompute common prices for listing pages; evaluate fully in cart.",
    ],
    followUps: [
      { q: "How do you guarantee the charged price matches what was shown?", a: "Issue a signed price quote (items, prices, expiry) at cart time; checkout validates and honours it, or reprices with clear messaging if expired." },
      { q: "How do you resolve conflicting promotions?", a: "Explicit stacking rules and priorities, evaluated deterministically; store which rules applied on the order." },
      { q: "How do you roll out a price change safely?", a: "Version rules, schedule activation, preview impact, and keep history for audits and disputes." },
    ],
  },
  "sdd-catalog": {
    recap: [
      "Catalog source of truth in a DB (flexible attributes per category).",
      "Changes → events → indexing pipeline → search index (Elasticsearch/OpenSearch).",
      "Search: text relevance (BM25) + business signals (sales, ratings, availability) + filters/facets.",
      "Product pages served from cache/CDN; invalidate on change events.",
    ],
    followUps: [
      { q: "How do you model attributes that differ per category?", a: "Core columns plus a typed attribute table or JSON document validated against a per-category schema." },
      { q: "How quickly do edits show up in search?", a: "Seconds via the event pipeline and near-real-time refresh; full reindexes run in the background behind an alias swap." },
      { q: "How do you make facet counts fast?", a: "Search engine aggregations on indexed keyword fields, cached for popular queries." },
    ],
  },
};
