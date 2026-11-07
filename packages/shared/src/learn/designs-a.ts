import type { Walkthrough } from "./types";

// Reference walkthroughs for the classic designs (part 1). Try the design yourself first, then compare.

export const DESIGNS_A: Record<string, Walkthrough> = {
  "sdd-url-shortener": {
    requirements: [
      "Shorten a long URL to a short code; redirect code → URL. Optional custom alias and expiry.",
      "Click analytics (count, referrer, country) eventually consistent.",
      "Very read-heavy (100:1), low-latency redirects, highly available; codes must not collide.",
    ],
    estimates: [
      "100M new URLs/month ≈ 40 writes/s; 100:1 reads ≈ 4,000 redirects/s average, ~20k/s peak.",
      "500 bytes per record × 100M × 12 × 5 years ≈ 3 TB.",
      "Code length: 62^7 ≈ 3.5 trillion, so 7 base62 characters are plenty.",
    ],
    api: ["POST /urls {longUrl, alias?, expiresAt?} → {code, shortUrl}", "GET /{code} → 301/302 Location: longUrl", "GET /urls/{code}/stats"],
    data: ["urls(code PK, long_url, user_id, created_at, expires_at): key-value access by code, so DynamoDB/Cassandra or sharded Postgres.", "clicks: event stream into an analytics store, aggregated per code per day."],
    design: [
      "Write: API service gets a unique id → base62-encodes it → stores code → URL.",
      "Read: redirect service checks Redis (code → URL), falls back to the DB, returns 302 (or 301 if analytics don't matter).",
      "Each redirect publishes a click event to Kafka; a consumer aggregates into the analytics store.",
      "CDN/edge can cache popular redirects.",
    ],
    deepDives: [
      { title: "Generating codes", body: "Options: (1) hash the URL (MD5 → first 7 chars) and handle collisions by retrying with a salt, which also dedupes identical URLs; (2) a counter/ID service handing out ranges to each app server, base62-encoded: no collisions, but codes are guessable (shuffle bits or add a random component if that matters); (3) pre-generate random codes into a key pool table and hand them out. Range-based counters are the simplest robust answer." },
      { title: "301 vs 302", body: "301 (permanent) lets browsers cache the redirect, cutting load but losing click analytics and the ability to change the target. 302 (temporary) sends every click through you. Most shorteners use 302 for analytics." },
      { title: "Hot links and expiry", body: "A viral link is a hot key: the cache absorbs it (plus CDN). Expired links: check expires_at on read and delete lazily, with a background cleanup job." },
    ],
    tradeoffs: ["Hash-based codes dedupe but need collision handling; counters are simple but need a coordination service.", "NoSQL fits the pure key-value access; relational is fine at this size with read replicas and a cache."],
  },
  "sdd-rate-limiter": {
    requirements: [
      "Limit requests per client (API key, user or IP) per rule, e.g. 100/min, across a fleet of gateway servers.",
      "Low added latency (<1-2 ms), accurate enough, configurable rules, return 429 with Retry-After.",
      "Keep working if the limiter's store has problems (fail open or closed by rule).",
    ],
    estimates: ["1M requests/s across the fleet; 10M active keys × ~50 bytes per counter ≈ 500 MB in Redis.", "One Redis round trip per request (~0.5 ms in the same zone)."],
    api: ["Internal: allow(key, rule) → {allowed, remaining, resetAt}", "Rules config: {match: route/plan, limit, window, algorithm}", "Response headers: X-RateLimit-Limit, X-RateLimit-Remaining, Retry-After"],
    data: ["Redis: per key either a token bucket {tokens, last_refill} hash, or window counters with TTL.", "Rules in a config store pushed to gateways."],
    design: [
      "Limiter runs as middleware in the API gateway (or a sidecar).",
      "For each request: find matching rules → atomic check-and-update in Redis via a Lua script → allow or 429.",
      "Redis Cluster sharded by key; replicas for failover.",
      "Optionally a small local token cache per gateway to absorb very hot keys.",
    ],
    deepDives: [
      { title: "Algorithm choice", body: "Token bucket allows bursts up to capacity and enforces an average rate with two numbers per key; it's the usual choice. Sliding window counter (current + weighted previous window) is a cheap, smooth approximation. Fixed windows allow 2× bursts at boundaries. Sliding log is exact but stores every timestamp." },
      { title: "Atomicity and races", body: "Read-then-write from two gateways can let extra requests through. Use a Lua script (runs atomically in Redis) or INCR + EXPIRE for window counters. For multi-region, either limit per region (limit/regions) or accept approximate global counts synced asynchronously." },
      { title: "Failure mode", body: "If Redis is unreachable: fail open (allow) for normal APIs so the limiter can't take the product down; fail closed for abuse-sensitive endpoints like login or OTP. Timeouts on the Redis call must be tight." },
    ],
    tradeoffs: ["Centralized counters are accurate but add a network hop; local counters are fast but allow overshoot across N servers.", "Strict accuracy vs latency and availability."],
  },
  "sdd-kv-store": {
    requirements: [
      "put(key, value), get(key), delete(key); values up to ~1 MB.",
      "Highly available and partition tolerant; tunable consistency; scales horizontally to petabytes.",
      "Low latency (single-digit ms p99).",
    ],
    estimates: ["100k ops/s, 1 PB of data; 3× replication.", "Nodes with ~10 TB each → ~300 nodes."],
    api: ["get(key) → (value, version/context)", "put(key, value, context)", "Client chooses consistency (ONE, QUORUM, ALL) per request"],
    data: ["Per node: LSM storage engine (commit log + memtable + SSTables + bloom filters).", "Each key replicated to N nodes on the ring."],
    design: [
      "Consistent hashing ring with virtual nodes partitions keys; each key stored on the next N distinct nodes (preference list).",
      "Any node can coordinate a request; it forwards to replicas and waits for W acks (writes) or R replies (reads).",
      "Gossip protocol shares membership and failure detection; no single master.",
      "Hinted handoff and read repair keep replicas converging; Merkle-tree anti-entropy repairs in the background.",
    ],
    deepDives: [
      { title: "Quorums", body: "N=3, W=2, R=2 gives R+W>N, so reads overlap the latest write (strong-ish, without failures muddying it). W=1/R=1 is fastest and most available but may read stale data. Sloppy quorums with hinted handoff keep writes available when preferred replicas are down." },
      { title: "Conflicts", body: "Concurrent writes to the same key on different replicas: last-write-wins by timestamp (simple, can lose writes) or vector clocks returning siblings to the client to merge (Dynamo's shopping cart). CRDTs merge automatically for counters and sets." },
      { title: "Storage engine", body: "LSM tree for fast writes: append to commit log, insert into memtable, flush to SSTables, compact in the background. Bloom filters skip SSTables on reads." },
    ],
    tradeoffs: ["AP with eventual consistency (Dynamo/Cassandra) vs CP with consensus per shard (etcd/Spanner-like) at higher latency.", "LWW simplicity vs vector-clock correctness."],
  },
  "sdd-notifications": {
    requirements: [
      "Send notifications through push (iOS/Android), SMS and email, triggered by internal services.",
      "User preferences and opt-outs; templates; scheduling; rate limiting per user.",
      "At-least-once delivery with dedup; retries; tracking (sent, delivered, opened).",
    ],
    estimates: ["10M notifications/day (≈120/s avg), bursts of 1M for campaigns.", "Third-party providers (APNs, FCM, Twilio, SES) have their own rate limits."],
    api: ["POST /notifications {userIds|segment, template, data, channels?, idempotencyKey, sendAt?}", "GET/PUT /users/{id}/preferences"],
    data: ["notifications(id, user_id, channel, status, created_at, sent_at): write-heavy log, Cassandra or a partitioned SQL table.", "preferences(user_id, channel, enabled, quiet_hours); device tokens(user_id, token, platform)."],
    design: [
      "Notification API validates, dedupes by idempotency key, expands segments, and enqueues one message per user.",
      "Router workers check preferences, quiet hours and per-user rate limits, render the template, and enqueue to per-channel queues.",
      "Channel workers call providers (APNs/FCM/SMS/email) with retries and backoff; failures go to a DLQ.",
      "Provider callbacks and open-tracking update status; analytics consume the event stream.",
    ],
    deepDives: [
      { title: "Reliability", body: "Queues between every stage decouple producers from slow providers. Retries with exponential backoff; idempotency keys at each stage so retries don't double-send. Remove invalid device tokens on provider errors." },
      { title: "Campaign bursts", body: "A 1M-user campaign shouldn't starve transactional messages (OTP). Use separate priority queues and worker pools, and throttle campaign sends to provider limits." },
    ],
    tradeoffs: ["Per-channel queues isolate failures but add components.", "Exactly-once sending is impossible across providers; at-least-once + dedup keys is the practical answer."],
  },
  "sdd-news-feed": {
    requirements: [
      "Users follow others; home feed shows posts from followees, newest (or ranked) first, paginated.",
      "Post creation fast; feed load < 200 ms; eventual consistency OK (seconds).",
      "Handle celebrities with millions of followers.",
    ],
    estimates: ["300M DAU, each opens the feed 5×/day → ~17k feed reads/s avg; 50M posts/day ≈ 600 writes/s.", "Average 200 followees; a few accounts with 50M+ followers."],
    api: ["POST /posts {text, media}", "GET /feed?cursor=…&limit=20", "POST /follow/{userId}"],
    data: [
      "posts(post_id, author_id, created_at, content): sharded by post_id or author_id.",
      "follows(follower_id, followee_id): both directions indexed.",
      "Feed cache: Redis list/sorted set of post ids per user (latest ~800).",
    ],
    design: [
      "Write path: store post → enqueue fan-out job → workers push post_id into each follower's feed cache (fan-out on write).",
      "Read path: read post ids from the user's feed cache → hydrate posts and authors from caches → rank → return a page.",
      "Celebrities: skip fan-out; at read time merge their recent posts into the feed (hybrid).",
      "Media goes to object storage + CDN.",
    ],
    deepDives: [
      { title: "Fan-out on write vs read", body: "Push (write) makes reads cheap but a post by someone with 50M followers means 50M writes. Pull (read) is cheap to write but every feed load queries many followees. Hybrid: push for normal users, pull for accounts above a follower threshold, merged at read time." },
      { title: "Ranking and pagination", body: "Chronological uses cursor = last post's (time, id). Ranked feeds score candidates (affinity, engagement, recency) in a ranking service; cache the ranked list per session so pagination is stable." },
      { title: "Inactive users", body: "Don't fan out to users who haven't logged in for weeks; rebuild their feed on next login." },
    ],
    tradeoffs: ["Push vs pull vs hybrid fan-out.", "Feed freshness vs cost; storing ids (small) vs full posts in the cache."],
  },
  "sdd-chat": {
    requirements: [
      "1:1 and group chat (up to ~500 members), real-time delivery, message history, offline delivery.",
      "Delivery and read receipts; online presence; push notifications when offline.",
      "Messages ordered within a conversation; no message loss.",
    ],
    estimates: ["100M DAU × 50 messages/day = 5B/day ≈ 60k/s average.", "~100 bytes/message → 500 GB/day of text."],
    api: ["WebSocket: send {convId, clientMsgId, text}, receive message/ack/receipt events", "GET /conversations/{id}/messages?before=cursor", "POST /conversations (create group)"],
    data: [
      "messages(conversation_id, message_id, sender_id, body, created_at): partition by conversation (+ time bucket), clustered by message_id: Cassandra/HBase.",
      "conversations, members; inbox per user (last message, unread count).",
      "Session registry: user_id → gateway server (Redis).",
    ],
    design: [
      "Clients hold WebSocket connections to gateway servers; the registry records which gateway each user is on.",
      "Send: gateway → chat service assigns a per-conversation sequence id, persists the message, acks the sender.",
      "Fan-out: look up members' gateways and push; offline members get a push notification and fetch on reconnect.",
      "Group messages go through a queue partitioned by conversation id to keep order.",
    ],
    deepDives: [
      { title: "Ordering and dedup", body: "Order by a per-conversation monotonically increasing id (from the partition owner or a Snowflake id with conversation affinity). The client's clientMsgId dedupes retries. Clients sort by sequence id, not arrival time." },
      { title: "Delivery guarantees", body: "Persist before acking the sender. Recipients ack receipt; unacked messages are re-sent on reconnect via a sync endpoint ('give me messages after seq N'). This gives at-least-once delivery with client-side dedup." },
      { title: "Presence", body: "Heartbeats over the WebSocket update a presence store with TTL; publish changes only to contacts who are online, and batch them to avoid storms." },
    ],
    tradeoffs: ["WebSockets (stateful, need connection-aware routing) vs long polling.", "Storing messages per conversation (simple reads) vs per user inbox (simpler sync, more writes)."],
  },
  "sdd-video": {
    requirements: [
      "Upload videos; transcode to multiple resolutions; stream with adaptive bitrate worldwide.",
      "Video metadata, search, view counts; resumable uploads.",
      "Smooth playback (low startup time, few rebuffers); highly available.",
    ],
    estimates: ["500 hours uploaded per minute; each hour of video ≈ several GB across renditions.", "Watch traffic dominates: egress in Tbps, so CDN is mandatory."],
    api: ["POST /videos → presigned multipart upload URLs", "POST /videos/{id}/complete → triggers processing", "GET /videos/{id} → metadata + manifest URL (HLS/DASH)"],
    data: ["videos(id, owner, title, status, durations, renditions): SQL/NoSQL.", "Raw and transcoded segments in object storage; manifests list segment URLs per bitrate.", "View counts via a stream aggregated asynchronously."],
    design: [
      "Client uploads directly to object storage via presigned multipart URLs.",
      "Upload complete → message to a processing pipeline: split into chunks → parallel transcode into renditions (240p…4K) and codecs → package as HLS/DASH segments + manifests → thumbnails.",
      "Metadata DB updated to 'ready'; segments pushed/pulled into CDN.",
      "Player fetches the manifest and picks segment bitrates based on measured bandwidth (ABR).",
    ],
    deepDives: [
      { title: "Transcoding pipeline", body: "A DAG of tasks (split, transcode per rendition, package, thumbnail) run by a workflow engine on a worker fleet; chunk-level parallelism makes a long video finish quickly. Idempotent tasks with retries; store intermediate outputs in object storage." },
      { title: "Adaptive bitrate", body: "Video is cut into 2-6 s segments at several bitrates; the client switches bitrate per segment based on throughput and buffer level. Startup uses a low bitrate to begin quickly." },
      { title: "CDN and cost", body: "Popular videos are cached at the edge; long-tail videos are served from regional caches or origin. Pre-warm the CDN for expected hits; keep cheap storage tiers for rarely watched originals." },
    ],
    tradeoffs: ["Transcoding every rendition up front (fast playback) vs on demand for the long tail (cheaper).", "Own CDN vs commercial CDN."],
  },
  "sdd-file-sync": {
    requirements: [
      "Upload, download and share files; sync across devices automatically; version history.",
      "Large files (GBs) with resumable transfer; offline edits with conflict handling.",
      "Durable (never lose data) and bandwidth-efficient.",
    ],
    estimates: ["50M users × 10 GB = 500 PB stored; dedup and compression reduce this significantly.", "Most activity is small edits to existing files."],
    api: ["POST /files/upload-session → upload chunks by hash (skip ones the server already has)", "POST /files/commit {path, chunkHashes, baseVersion}", "GET /changes?cursor=… (long poll / push for sync)"],
    data: [
      "Blocks: content-addressed chunks (~4 MB) keyed by SHA-256 in object storage, deduplicated.",
      "Metadata DB: files(id, path, owner), versions(file_id, version, chunk_list), namespaces: strongly consistent (sharded SQL).",
      "Per-user change journal for sync cursors.",
    ],
    design: [
      "Client watches the local folder, splits changed files into chunks, hashes them, and asks which chunks the server is missing.",
      "Uploads only missing chunks (delta sync), then commits a new version listing the chunk hashes.",
      "Metadata service writes the version and appends to the change journal; notification service tells other devices to pull changes.",
      "Other devices fetch metadata and download only chunks they don't have.",
    ],
    deepDives: [
      { title: "Chunking and dedup", body: "Fixed-size chunks are simple; content-defined chunking (rolling hash boundaries) keeps most chunks unchanged when bytes are inserted. Content addressing dedupes identical chunks across files and users (careful with cross-user dedup privacy)." },
      { title: "Conflicts", body: "Commit includes the base version; if the server's latest differs, it's a conflict. Simple approach: keep both ('file (conflicted copy)'). Collaborative editors need OT/CRDTs instead." },
    ],
    tradeoffs: ["Strongly consistent metadata (needed for correctness) vs eventually consistent block storage.", "Smaller chunks dedupe better but add metadata overhead."],
  },
  "sdd-ride-sharing": {
    requirements: [
      "Riders request rides; match with a nearby available driver quickly; track the trip live; compute fare.",
      "Drivers send location every ~4 s; ETAs; surge pricing.",
      "Low-latency matching; no driver assigned to two riders.",
    ],
    estimates: ["1M active drivers × 1 update / 4 s = 250k location writes/s.", "Ride requests ~1k-10k/s at peak in big cities."],
    api: ["Driver: PUT /drivers/me/location {lat, lng} (or over WebSocket)", "Rider: POST /rides {pickup, dropoff} → ride id; WebSocket for updates", "Driver: POST /rides/{id}/accept"],
    data: [
      "Driver locations: in-memory geo index (Redis GEO, or H3/geohash cells → driver ids), ephemeral.",
      "trips(id, rider, driver, status, route, fare): durable SQL, sharded by city.",
      "Location history to a stream for analytics and ETA models.",
    ],
    design: [
      "Location service ingests driver updates into the geo index (cell → available drivers) partitioned by city/region.",
      "Matching service: find candidate drivers in the pickup cell and neighbours, rank by ETA, offer to the best one with a timeout, then the next.",
      "Assignment uses an atomic state change (driver AVAILABLE → RESERVED) so two matches can't take the same driver.",
      "Trip service manages the lifecycle; live updates pushed to the rider via WebSocket; pricing service computes fare and surge.",
    ],
    deepDives: [
      { title: "Geo indexing", body: "Geohash or H3 cells map lat/lng to cell ids; nearby search = the pickup cell plus neighbours, expanding rings if too few drivers. Keep the index in memory, sharded by region; updates simply move a driver between cells." },
      { title: "Consistency of assignment", body: "Use a conditional update or a per-driver lock (Redis SET NX with TTL, or a DB row with a version) when offering a ride; the offer expires if not accepted. The trip record is the durable source of truth." },
    ],
    tradeoffs: ["Nearest driver vs global optimization (batch matching every few seconds gives better overall ETAs).", "Location update frequency vs battery and write load."],
  },
  "sdd-typeahead": {
    requirements: [
      "As the user types, return the top 5-10 completions for the prefix within ~50-100 ms.",
      "Ranked by popularity (and freshness, personalization optional); filter offensive terms.",
      "Updated from search logs (hourly/daily is fine).",
    ],
    estimates: ["10B searches/day, each ~5 keystrokes → ~500k suggestion requests/s at peak (debounced clients help).", "Distinct queries worth suggesting: ~100M; the top-k per prefix structure fits in memory across a few shards."],
    api: ["GET /suggest?q=prefix&locale=… → [suggestions]"],
    data: ["Offline: query log aggregated into (query, count) with time decay.", "Online: trie where each node stores precomputed top-k completions, or a prefix → top-k key-value map."],
    design: [
      "Clients debounce keystrokes and cache recent responses; CDN/edge caches popular prefixes.",
      "Suggestion servers hold the trie/prefix map in memory, sharded by prefix range, replicated for reads.",
      "Batch pipeline (Spark) aggregates logs, applies decay and filtering, builds a new trie snapshot, and servers hot-swap to it.",
      "Optional real-time layer adds trending queries from a stream.",
    ],
    deepDives: [
      { title: "Precomputed top-k", body: "Walking the subtree under a prefix at query time is too slow. Store the top-k completions at every node (or in a prefix → list map) during the offline build; a lookup is then O(length of prefix)." },
      { title: "Freshness", body: "Full rebuilds are simple and safe. For trending terms, merge a small real-time top-k (computed with a streaming count-min sketch + heap) into results." },
    ],
    tradeoffs: ["Precomputation (fast reads, stale data, more memory) vs computing at query time.", "Shard by prefix (uneven: 's' is huge) vs by hash of prefix (even, but no range locality)."],
  },
  "sdd-crawler": {
    requirements: [
      "Crawl billions of web pages, store content for indexing, refresh pages periodically.",
      "Politeness: obey robots.txt, limit requests per host.",
      "Avoid duplicates (URLs and content), handle traps, scale horizontally.",
    ],
    estimates: ["1B pages/month ≈ 400 pages/s; average page 100 KB → 100 TB/month of raw content.", "DNS and network I/O dominate; crawlers are I/O-bound."],
    api: ["Internal only: seed URLs in; crawled documents out to storage and the indexing pipeline."],
    data: ["URL frontier: priority queues per host (persistent, e.g. Kafka/RocksDB-backed).", "Seen-URL set (Bloom filter + persistent store); content fingerprints (SimHash) for near-duplicates.", "Page store in object storage; metadata (url, fetched_at, hash, status) in a wide-column DB."],
    design: [
      "Frontier selects the next URLs by priority and freshness, with per-host queues so each host is hit by one worker at a polite rate.",
      "Fetcher workers resolve DNS (cached), check robots.txt (cached), download, and store content.",
      "Parser extracts links, normalizes them, filters seen URLs (Bloom filter), and adds new ones to the frontier.",
      "Content dedup via fingerprints; documents sent to the indexer.",
    ],
    deepDives: [
      { title: "Politeness", body: "Map each host to one frontier queue, consumed by one worker at a time with a delay between requests (based on robots.txt crawl-delay and server response time). This both protects sites and avoids being blocked." },
      { title: "Dedup and traps", body: "URL normalization (lowercase host, strip fragments and tracking params) + Bloom filter for seen URLs. SimHash detects near-duplicate pages. Limit depth and URLs per host to escape infinite calendars and session-id traps." },
    ],
    tradeoffs: ["BFS breadth vs prioritizing important pages (PageRank-like signals).", "Freshness (re-crawl often) vs coverage (crawl new pages)."],
  },
  "sdd-job-scheduler": {
    requirements: [
      "Schedule jobs to run once at a time or on a cron schedule; run them on a worker fleet.",
      "Each scheduled run executes at least once, ideally exactly once; retries with backoff; timeouts.",
      "Visibility: job status, history, logs; scale to millions of jobs.",
    ],
    estimates: ["10M scheduled jobs; 10k job executions/s at peak (top of the hour spikes)."],
    api: ["POST /jobs {schedule|runAt, payload, retries, timeout, idempotencyKey}", "GET /jobs/{id}/runs", "DELETE /jobs/{id}"],
    data: ["jobs(id, schedule, next_run_at, payload, owner): indexed by next_run_at, partitioned by time bucket or hash.", "runs(job_id, run_id, status, attempt, lease_until, worker, started_at, finished_at)."],
    design: [
      "Scheduler shards poll for due jobs (next_run_at <= now) in their partition, create a run, and push it to a queue; then compute the next next_run_at.",
      "Workers pull runs, take a lease (lease_until), execute with heartbeats extending the lease, and report the result.",
      "If a lease expires (worker died), the run is re-queued; retries use backoff up to max attempts, then mark failed and alert.",
      "Leader election (or partition ownership via ZooKeeper/etcd) ensures each scheduler partition has one active poller.",
    ],
    deepDives: [
      { title: "Exactly once-ish", body: "True exactly-once isn't possible: a worker can finish the job and die before reporting. Use leases + at-least-once execution + idempotency (jobs take a run id/idempotency key and make side effects idempotent) + fencing tokens so a stale worker can't commit." },
      { title: "Thundering top of the hour", body: "Many cron jobs fire at :00. Jitter non-critical schedules, pre-enqueue runs slightly ahead, and scale workers on queue depth." },
    ],
    tradeoffs: ["Polling a DB index (simple) vs timer wheels / delay queues (more scalable).", "At-least-once + idempotency vs heavier coordination."],
  },
  "sdd-payments": {
    requirements: [
      "Accept payments from customers (cards, wallets) via external payment processors; pay out merchants.",
      "Never double-charge; never lose money; full audit trail; reconcile with processors and banks.",
      "Handle retries, timeouts and async processor callbacks; PCI compliance.",
    ],
    estimates: ["Modest QPS (thousands/s at peak) but correctness is everything; ledger grows forever (append-only)."],
    api: ["POST /payments {amount, currency, method, orderId} with Idempotency-Key header → payment id + status", "GET /payments/{id}", "Webhook from processor: payment succeeded/failed"],
    data: [
      "payments(id, idempotency_key UNIQUE, order_id, amount, currency, status, processor_ref): relational, ACID.",
      "Double-entry ledger: entries(id, txn_id, account, debit/credit, amount) where every transaction's entries sum to zero; append-only.",
      "Outbox table for events.",
    ],
    design: [
      "Payment service records the payment as PENDING with the idempotency key (unique constraint) before calling the processor.",
      "Calls the processor (tokenized card from the vault, never raw card numbers) with its own idempotency key.",
      "On success (sync response or webhook), updates status and writes balanced ledger entries in one transaction, plus an outbox event.",
      "Reconciliation job compares the ledger with processor settlement files daily and flags mismatches.",
    ],
    deepDives: [
      { title: "Idempotency and unknown outcomes", body: "A timeout doesn't mean failure. Store the attempt first; on timeout, query the processor by your idempotency key (or wait for the webhook) before retrying. Client retries with the same key return the stored result." },
      { title: "Double-entry ledger", body: "Each money movement debits one account and credits another for the same amount (customer → merchant payable → fees). Balances are sums of entries; nothing is updated in place, so the history is auditable and errors are fixed with compensating entries." },
      { title: "Sagas", body: "Checkout spans order, inventory and payment; if payment fails after reserving stock, compensate (release stock). Refunds are new ledger transactions, never deletes." },
    ],
    tradeoffs: ["Strong consistency and auditability over raw throughput.", "Sync processor calls (simple UX) vs async with webhooks (resilient)."],
  },
  "sdd-inventory": {
    requirements: [
      "E-commerce: product catalog, cart, checkout, orders; inventory per warehouse.",
      "Never oversell; reserve stock at checkout and release it if payment fails or times out.",
      "Order state machine; high read traffic on product pages; flash-sale spikes.",
    ],
    estimates: ["100M product views/day vs 1M orders/day: read-heavy browsing, write-critical checkout."],
    api: ["GET /products/{id} (with availability)", "POST /cart/items", "POST /checkout → order id (reserves stock)", "POST /orders/{id}/pay"],
    data: [
      "inventory(sku, warehouse_id, available, reserved, version): relational, row-level atomic updates.",
      "reservations(id, order_id, sku, qty, expires_at).",
      "orders(id, user_id, status, total) + order_items; product catalog in a document store + search index + cache.",
    ],
    design: [
      "Browsing served from cache/CDN and search index; availability shown is approximate (cached).",
      "Checkout: in one transaction per SKU, UPDATE inventory SET available = available - q, reserved = reserved + q WHERE sku = ? AND available >= q; create reservation with expiry.",
      "Payment succeeds → reservation converted (reserved decremented) and order CONFIRMED; fails or expires → stock released.",
      "Order events (outbox → Kafka) drive fulfilment, emails and analytics.",
    ],
    deepDives: [
      { title: "Preventing oversell", body: "The conditional decrement (available >= q) is atomic per row, so two buyers can't both take the last unit. Optimistic locking with a version column works too. Avoid read-then-write in application code without a condition." },
      { title: "Flash sales", body: "One hot SKU row becomes a bottleneck. Options: split stock into N sub-rows (buckets) and decrement any bucket; pre-load stock into Redis with atomic DECR and a queue for order creation; put users in a waiting room to admit at a sustainable rate." },
      { title: "Order state machine", body: "CREATED → RESERVED → PAID → SHIPPED → DELIVERED, with CANCELLED/REFUNDED branches; transitions validated in one place and each emits an event." },
    ],
    tradeoffs: ["Exact availability on product pages (expensive) vs approximate with the check at checkout.", "Reserve at add-to-cart (bad: hoarding) vs at checkout (common)."],
  },
};
