import type { Walkthrough } from "./types";

// Reference walkthroughs for the classic designs (part 2), including the Amazon-flavoured ones.

export const DESIGNS_B: Record<string, Walkthrough> = {
  "sdd-ticketing": {
    requirements: [
      "Book seats for events/shows; seat map; temporary hold while paying (e.g. 10 min); confirm or release.",
      "No double booking; handle flash-sale traffic (100× normal) fairly.",
      "Bookings durable; payment integration.",
    ],
    estimates: ["A popular concert: 1M users for 50k seats in the first minutes.", "Normal traffic: low thousands of requests/s."],
    api: ["GET /events/{id}/seats", "POST /holds {eventId, seatIds} → holdId, expiresAt", "POST /bookings {holdId, payment}"],
    data: ["seats(event_id, seat_id, status, hold_id, hold_expires_at, version): relational, partitioned by event.", "holds and bookings tables; payment records with idempotency keys."],
    design: [
      "Seat map reads served from a cache refreshed frequently (status may lag slightly).",
      "Hold: conditional update of all requested seats (status AVAILABLE or hold expired → HELD) in one transaction; succeed only if all rows updated.",
      "Booking: verify the hold is still valid, charge payment (idempotent), mark seats BOOKED.",
      "Expired holds become available lazily (expiry check in the condition) plus a sweeper.",
      "For on-sales: a virtual waiting room (queue) admits users at a rate the booking path can handle.",
    ],
    deepDives: [
      { title: "Contention", body: "Everyone wants the same front-row seats. Row-level conditional updates keep correctness; the waiting room keeps load bounded; optionally assign 'best available' seats server-side instead of letting thousands race for the same seat." },
      { title: "Holds with expiry", body: "Store hold_expires_at on the seat row and treat expired holds as free in the WHERE condition, so correctness doesn't depend on a background job. A Redis key with TTL can mirror holds for fast reads." },
    ],
    tradeoffs: ["Fairness (queue) vs latency.", "Pessimistic row locks vs optimistic conditional updates under heavy contention."],
  },
  "sdd-metrics": {
    requirements: [
      "Collect metrics (counters, gauges, histograms) from thousands of hosts; query and graph them; alert on rules.",
      "High write throughput, recent data queried most; downsample old data; retention policies.",
      "Alerting must keep working even if dashboards are slow.",
    ],
    estimates: ["10k hosts × 1,000 series × 1 sample/10 s = 1M samples/s.", "Compressed time series ~1-2 bytes/sample (Gorilla-style)."],
    api: ["Push: POST /write (batch of samples) or pull: scrape /metrics endpoints", "Query: PromQL-like range queries", "Alert rules: expr, for duration, severity"],
    data: ["Time-series DB: series identified by metric name + labels; data in time-partitioned blocks, compressed per series.", "Downsampled rollups (1 m, 1 h) for long ranges."],
    design: [
      "Agents/collectors push batches (or the system scrapes targets) into an ingestion tier that writes to a queue (Kafka) for buffering.",
      "Ingesters shard by series hash, build in-memory blocks, flush compressed blocks to long-term object storage.",
      "Query layer fans out to ingesters (recent data) and storage (older blocks), merges and aggregates.",
      "Alert evaluator runs rules on a schedule against recent data and sends to a notification service with dedup and silencing.",
    ],
    deepDives: [
      { title: "Cardinality", body: "Each unique label combination is a series. Labels like user_id or request_id explode cardinality and memory. Enforce limits per metric and reject high-cardinality labels; that's the most common real-world failure." },
      { title: "Compression and downsampling", body: "Delta-of-delta timestamps and XOR-encoded float values compress regular samples dramatically. Keep raw data for days, 1-minute rollups for weeks, hourly for years." },
    ],
    tradeoffs: ["Push vs pull collection.", "Precision and retention vs storage cost."],
  },
  "sdd-kafka": {
    requirements: [
      "Distributed append-only log: producers append to topics; consumers read at their own pace and can replay.",
      "Ordering within a partition; durability via replication; horizontal scale; retention by time/size.",
      "Consumer groups for parallel consumption with offset tracking.",
    ],
    estimates: ["1M messages/s of 1 KB = 1 GB/s ingress; retention 7 days ≈ 600 TB × replication 3."],
    api: ["produce(topic, key, value) → (partition, offset)", "fetch(topic, partition, offset, maxBytes)", "commit(group, partition, offset)"],
    data: ["Each partition is a sequence of segment files (append-only) + sparse offset index on the broker's disk.", "Cluster metadata (topics, partitions, leaders, ISR) in a consensus-backed controller (KRaft)."],
    design: [
      "Topics are split into partitions spread across brokers; each partition has one leader and follower replicas.",
      "Producers send to the partition leader (partition chosen by key hash); leader appends to its log, followers fetch and append.",
      "A write is committed when all in-sync replicas (ISR) have it (acks=all with min.insync.replicas=2).",
      "Consumers in a group are assigned partitions; they fetch sequentially and commit offsets to an internal topic.",
    ],
    deepDives: [
      { title: "Why it's fast", body: "Sequential disk writes and reads, the OS page cache, batching and compression, and zero-copy sendfile from page cache to the network. Consumers are just offsets, so the broker keeps no per-message state." },
      { title: "Durability and failover", body: "If the leader dies, the controller elects a new leader from the ISR, so committed messages aren't lost. Unclean leader election (from out-of-sync replicas) trades data loss for availability." },
      { title: "Delivery semantics", body: "At-least-once by default (commit offsets after processing). Idempotent producers dedupe retries per partition; transactions allow atomic writes across partitions plus offset commits for exactly-once processing within Kafka." },
    ],
    tradeoffs: ["More partitions = more parallelism but more open files, longer failover and rebalancing.", "acks=1 (fast, may lose data on leader failure) vs acks=all."],
  },
  "sdd-collab-editing": {
    requirements: [
      "Multiple users edit the same document simultaneously; see each other's changes and cursors in real time.",
      "All replicas converge to the same content; works with brief disconnections; version history.",
      "Low latency (local edits apply instantly).",
    ],
    estimates: ["Most documents have 1-5 concurrent editors; a few have hundreds of viewers.", "Operations are tiny (insert/delete a character) but frequent."],
    api: ["WebSocket per document: send ops {baseVersion, ops}, receive transformed ops and presence", "GET /docs/{id} (snapshot + version)", "GET /docs/{id}/history"],
    data: ["Document snapshots (periodic) + operation log (doc_id, version, op) in a durable store.", "Presence (cursors) ephemeral in memory/Redis."],
    design: [
      "Clients apply edits locally immediately and send operations to the document's session server.",
      "One server (or partition owner) per document orders operations, transforms them against concurrent ones (OT) or merges them (CRDT), appends to the op log, and broadcasts.",
      "Clients transform incoming ops against their unacknowledged local ops.",
      "Periodic snapshots bound replay time; history view reads snapshots + ops.",
    ],
    deepDives: [
      { title: "OT vs CRDT", body: "Operational transformation adjusts concurrent operations (insert at position 5 shifts if someone inserted before it); needs a central server to order ops (Google Docs). CRDTs give every character a unique, ordered id so concurrent edits merge without a central authority, supporting offline and peer-to-peer at the cost of metadata overhead." },
      { title: "Routing", body: "All editors of a document must reach the same session server: route by document id with consistent hashing; on server failure, another server loads the snapshot + log and takes over." },
    ],
    tradeoffs: ["OT (compact, needs a central server) vs CRDT (decentralized, more metadata).", "Sending every keystroke vs batching ops every ~50 ms."],
  },
  "sdd-maps": {
    requirements: [
      "Show map tiles; search places; compute routes with ETA; live traffic. Variant: 'nearby friends'.",
      "Low latency for tiles and nearby queries; routes in < 1 s.",
      "Huge static data (road graph, tiles) plus fast-changing data (traffic, locations).",
    ],
    estimates: ["Tiles are pre-rendered per zoom level: billions of tiles, served almost entirely from CDN.", "Nearby friends: 100M users updating location every 30 s ≈ 3M updates/s."],
    api: ["GET /tiles/{z}/{x}/{y}", "GET /route?from=…&to=…&mode=driving", "GET /nearby?lat&lng&radius (places or friends)"],
    data: [
      "Road network as a graph (nodes = intersections, edges = road segments with travel time), partitioned by region.",
      "Places indexed by geohash/quadtree + search index.",
      "Live locations in an in-memory geo index (cell → user ids) with TTL.",
    ],
    design: [
      "Tiles: pre-rendered (or vector tiles) in object storage behind a CDN.",
      "Routing service: shortest path on the road graph with precomputation (contraction hierarchies) for fast queries; edge weights updated from live traffic.",
      "Traffic: aggregate anonymized speeds from phones per road segment in a stream processor.",
      "Nearby friends: users publish location to the geo index; queries look up friends in the same and neighbouring cells, or subscribe to friends' location channels.",
    ],
    deepDives: [
      { title: "Fast routing", body: "Plain Dijkstra on a continental graph is too slow. Precompute shortcuts (contraction hierarchies) or hierarchical partitions so queries explore few nodes; A* with a distance heuristic helps. Recompute affected weights as traffic changes." },
      { title: "Geo indexes", body: "Geohash cells for uniform grids, quadtrees for density-adaptive cells, H3 hexagons for uniform neighbour distances. Query the containing cell plus neighbours and filter by exact distance." },
    ],
    tradeoffs: ["Pre-render tiles (fast, storage-heavy) vs render on demand.", "Freshness of traffic vs stability of ETAs."],
  },
  "sdd-top-k": {
    requirements: [
      "Count ad clicks (or song plays, hashtags) and show top-k per minute/hour/day, plus per-ad totals for billing.",
      "Billing counts must be accurate (no double counting); dashboards near real time.",
      "Handle late and duplicate events.",
    ],
    estimates: ["1B clicks/day ≈ 12k/s avg, 50k/s peak; 2M distinct ads."],
    api: ["Event ingest: click {adId, userId, ts, clickId}", "GET /ads/{id}/clicks?from&to&granularity", "GET /top?window=1m&k=100"],
    data: ["Raw events in Kafka (replayable) and object storage (audit).", "Aggregates (ad_id, minute) → count in an OLAP/time-series store (Druid, ClickHouse, Pinot)."],
    design: [
      "Click events → Kafka partitioned by ad id; dedupe by clickId.",
      "Stream processor (Flink) aggregates counts per ad per tumbling minute window using event time and watermarks; writes to the OLAP store.",
      "Top-k: each partition keeps local top-k per window (heap), a final stage merges partial top-k lists.",
      "Nightly batch recomputes from raw events to reconcile billing numbers (Lambda-style correction).",
    ],
    deepDives: [
      { title: "Exactly-once counting", body: "Dedupe by click id (bounded state with TTL), checkpoint state and Kafka offsets together, and write aggregates idempotently (upsert by ad + window). The batch job is the source of truth for billing." },
      { title: "Approximate heavy hitters", body: "For very large key spaces, Count-Min Sketch + min-heap gives approximate top-k in fixed memory; exact per-ad counts remain in the aggregate store." },
      { title: "Late events", body: "Event-time windows with allowed lateness update already-emitted results; later stragglers go to a correction path." },
    ],
    tradeoffs: ["Exact (more state, more cost) vs approximate (sketches).", "Real-time stream only vs stream + batch reconciliation."],
  },
  "sdd-recommendations": {
    requirements: [
      "Show personalized recommendations (products, videos) on home and item pages; or rank search results.",
      "Latency < 100-200 ms; recommendations reflect recent behaviour within minutes.",
      "Measure quality with A/B tests.",
    ],
    estimates: ["100M users, 10M items; candidate generation must cut 10M items to ~500 quickly."],
    api: ["GET /recommendations?userId&context=home&k=20", "Event ingest: impressions, clicks, purchases"],
    data: [
      "Feature store: offline (warehouse) + online (key-value, e.g. Redis/Cassandra) user and item features.",
      "Embeddings for users and items; approximate nearest neighbour (ANN) index.",
      "Precomputed candidate lists per user (batch) cached.",
    ],
    design: [
      "Two stages: candidate generation (collaborative filtering, item-to-item similarity, ANN on embeddings, trending, recent-activity based) → ranking model scoring ~500 candidates with rich features.",
      "Re-ranking applies business rules: diversity, de-duplication, already-purchased filtering.",
      "Offline: training pipelines on logged interactions produce models and embeddings; batch jobs precompute candidates.",
      "Online: event stream updates real-time features (last viewed items); results cached briefly per user.",
    ],
    deepDives: [
      { title: "Cold start", body: "New users: popular/trending items, onboarding preferences, context (location, device). New items: content-based features (category, text embeddings) and exploration slots." },
      { title: "Feedback loops and evaluation", body: "Models trained on what was shown reinforce it; add exploration and log propensities. Offline metrics (recall@k, NDCG) guide development; online A/B tests decide." },
    ],
    tradeoffs: ["Batch precomputation (cheap, stale) vs real-time features (fresh, complex).", "Model quality vs serving latency."],
  },
  "sdd-building-blocks": {
    requirements: [
      "Three small designs often asked on their own: a unique ID generator, a distributed lock service, and an API gateway.",
      "IDs: unique, roughly time-ordered, 64-bit, 100k+/s per node. Lock: safe mutual exclusion with failures. Gateway: routing, auth, rate limits for many services.",
    ],
    estimates: ["IDs: 1M/s across 100 nodes.", "Locks: low volume, correctness matters most.", "Gateway: every external request passes through, so it must add < few ms."],
    api: ["nextId() → int64", "acquire(name, ttl) → token, renew(name, token), release(name, token)", "Gateway: route config {path → service, auth, limits, timeouts}"],
    data: ["IDs: no storage beyond assigned worker ids (from ZooKeeper/config).", "Locks: etcd/ZooKeeper keys with leases.", "Gateway: config store; rate-limit counters in Redis."],
    design: [
      "ID generator: Snowflake layout (41-bit ms timestamp, 10-bit worker id, 12-bit sequence); generate locally, wait for the next ms on sequence overflow, refuse if the clock moves backwards.",
      "Lock service: built on etcd/ZooKeeper (consensus) with lease-based locks; returns a monotonically increasing fencing token (revision).",
      "Gateway: stateless proxies behind an L4 load balancer; plugins for authentication (JWT validation), rate limiting, routing, retries/timeouts, request logging and metrics.",
    ],
    deepDives: [
      { title: "Clock issues for IDs", body: "If NTP moves the clock back, Snowflake could repeat ids. Detect and either wait until the clock catches up or fail fast; use monotonic clock sources where possible." },
      { title: "Lock safety", body: "Leases expire, so a paused client may continue after losing the lock; protected resources must check the fencing token and reject stale ones." },
      { title: "Gateway scale and blast radius", body: "Keep gateway logic thin and config-driven; deploy per domain or region to limit blast radius; cache auth decisions briefly." },
    ],
    tradeoffs: ["Snowflake (coordination-free) vs DB ranges (dense, needs a DB).", "Gateway convenience vs it becoming a bottleneck or monolith."],
  },
  "sdd-order-management": {
    requirements: [
      "Manage the order lifecycle for an Amazon-like store: create, pay, allocate stock, ship, deliver, cancel, return/refund.",
      "Each state change triggers downstream actions (warehouse, payments, notifications) reliably.",
      "Idempotent APIs; full history; high availability during peak events.",
    ],
    estimates: ["Peak 10k orders/s during sales; 5-10 state changes per order."],
    api: ["POST /orders (idempotency key) → order id", "POST /orders/{id}/cancel", "GET /orders/{id} (status + timeline)", "Internal events: OrderPlaced, PaymentCaptured, Shipped…"],
    data: [
      "orders(id, customer_id, status, version, totals) + order_items: sharded by order id or customer id.",
      "order_events(order_id, seq, type, payload, at): append-only history.",
      "Outbox table for publishing events.",
    ],
    design: [
      "Order service owns the state machine; each transition is a conditional update (WHERE status = expected AND version = v) plus an event row in the outbox, in one transaction.",
      "Outbox relay publishes events to Kafka; payment, inventory/warehouse and notification services consume them.",
      "A saga orchestrator (or choreography) coordinates: reserve stock → capture payment → allocate warehouse → ship, with compensations (release stock, refund) on failures.",
      "Read models (customer order list, support views) built from events.",
    ],
    deepDives: [
      { title: "State machine", body: "PLACED → PAYMENT_PENDING → PAID → ALLOCATED → SHIPPED → DELIVERED; CANCELLED allowed before SHIPPED; RETURN_REQUESTED → REFUNDED after delivery. Validate transitions centrally; reject or ignore out-of-order events using per-order sequence numbers." },
      { title: "Idempotent consumers", body: "Every consumer records processed event ids (or uses natural idempotency like 'allocate order X' as an upsert) because Kafka delivers at least once." },
    ],
    tradeoffs: ["Orchestration (clear flow) vs choreography (looser coupling).", "Event sourcing the order (full history) vs state + event log (simpler)."],
  },
  "sdd-warehouse": {
    requirements: [
      "Track stock levels for millions of SKUs across hundreds of fulfilment centers: receive, move, pick, pack, ship.",
      "Show sellable availability to the storefront; reserve for orders; reconcile with physical counts.",
      "High write volume from scanners; accuracy matters (no phantom stock).",
    ],
    estimates: ["Millions of inventory movements per hour at peak; availability reads far higher (cached)."],
    api: ["POST /movements {sku, fc, fromBin, toBin, qty, type, movementId}", "GET /availability?sku&region", "POST /reservations {orderId, sku, fc, qty}"],
    data: [
      "inventory_ledger(movement_id, sku, fc, bin, delta, type, at): append-only source of truth.",
      "stock_levels(sku, fc, on_hand, reserved, version): derived balances, updated transactionally with the ledger.",
      "Availability cache per sku/region for the storefront.",
    ],
    design: [
      "Scanners post movements with ids (idempotent); the inventory service writes the ledger entry and updates balances in one transaction, partitioned by fc/sku.",
      "Changes publish events; an availability service aggregates sellable quantities per region and updates the cache the storefront reads.",
      "Order allocation reserves stock at a chosen FC (closest with stock) via conditional updates.",
      "Cycle counts compare physical counts with balances and post adjustment movements.",
    ],
    deepDives: [
      { title: "Ledger + balances", body: "The ledger gives an audit trail and lets you rebuild balances; balances make reads fast. Update both atomically, or derive balances from the ledger stream and accept slight lag." },
      { title: "Availability accuracy", body: "Storefront availability is eventually consistent; keep a safety buffer for fast-moving items and do the authoritative check at reservation time." },
    ],
    tradeoffs: ["Exact global availability (expensive coordination) vs per-FC truth with approximate global view.", "Fine-grained bin tracking vs simpler per-FC counts."],
  },
  "sdd-delivery-slots": {
    requirements: [
      "Customers choose a delivery time slot (e.g. 2-hour windows) at checkout; each slot has limited capacity per area.",
      "Hold a slot while the customer completes checkout; confirm or release; no overbooking.",
      "Spiky demand (everyone wants Saturday morning); show availability quickly.",
    ],
    estimates: ["10k checkouts/min at peak; a few thousand slots per day per city; capacity per slot in the dozens."],
    api: ["GET /slots?area&date → slots with remaining capacity", "POST /slot-holds {slotId, orderId} → holdId (expires in 10 min)", "POST /slot-holds/{id}/confirm"],
    data: ["slots(id, area, start, end, capacity, booked, held, version).", "slot_holds(id, slot_id, order_id, expires_at, status)."],
    design: [
      "Availability reads from a cache of remaining counts, refreshed on changes (slightly stale is fine).",
      "Hold: atomic conditional update UPDATE slots SET held = held + 1 WHERE id = ? AND booked + held < capacity; insert the hold row.",
      "Confirm (after payment): held - 1, booked + 1; expiry sweeper releases expired holds (or lazy expiry via timestamps).",
      "Capacity planning service sets capacity from available drivers and vans per area.",
    ],
    deepDives: [
      { title: "Hot slots", body: "Popular slots see contention on one row. Shard capacity into buckets or use Redis atomic counters as the fast path with the DB as the record; queue checkouts if needed." },
      { title: "Expiry", body: "Store expires_at and treat expired holds as free when counting, so correctness doesn't depend on the sweeper running on time." },
    ],
    tradeoffs: ["Holding at slot selection (fair to the customer) vs at payment (less wasted capacity).", "Strict capacity vs allowing small overbooking with operational buffers."],
  },
  "sdd-pricing": {
    requirements: [
      "Compute the price shown for a product: list price, seller price, promotions (percent off, BOGO, coupons), member discounts.",
      "Price on the product page must match the price charged at checkout (or the change must be explicit).",
      "Very high read volume; rules change frequently; promotions start/end at exact times.",
    ],
    estimates: ["Millions of price lookups/s (search results show many prices); thousands of rule changes per day."],
    api: ["GET /prices?skus=…&customer=… → price, original price, applied promotions, priceVersion", "POST /quote {cart} → itemized total with quote id (valid N minutes)"],
    data: ["Base prices per sku/seller (relational, versioned).", "Promotion rules (conditions, actions, start/end, priority, stackability) in a rules store.", "Precomputed price cache per sku (non-personalized part)."],
    design: [
      "Price service evaluates base price + applicable promotions via a rules engine; non-personalized results cached per sku and invalidated on rule or price changes (events).",
      "Personalized adjustments (membership, coupons) applied on top at request time.",
      "Checkout requests a quote: all prices computed together with a quote id and expiry; the order stores the quote, so the charged price matches what was confirmed.",
      "Scheduled activation: promotions pre-loaded and activated by timestamp, not by a deploy.",
    ],
    deepDives: [
      { title: "Displayed vs charged consistency", body: "Include a price version or quote id with displayed prices; at checkout, recompute and compare. If it changed, show the new price before charging. Never charge a price the customer didn't see." },
      { title: "Rule evaluation", body: "Promotions have priorities and stacking rules (exclusive vs combinable). Evaluate deterministically, record which rules applied for audit and customer support." },
    ],
    tradeoffs: ["Precompute (fast, stale risk) vs compute on request (fresh, costly).", "Rules engine flexibility vs predictability and testability."],
  },
  "sdd-catalog": {
    requirements: [
      "Product catalog with search: millions of products with attributes that vary by category, variants (size, color), images.",
      "Search with filters (facets), sorting, typo tolerance, relevance; product detail pages.",
      "Sellers update listings frequently; search reflects updates within minutes.",
    ],
    estimates: ["100M products; 50k searches/s at peak; product page reads higher still (cache + CDN)."],
    api: ["GET /search?q&filters&sort&cursor → results + facet counts", "GET /products/{id}", "PUT /products/{id} (seller updates)"],
    data: [
      "Source of truth: document store (flexible attributes per category) or relational with JSON columns.",
      "Search index (Elasticsearch/OpenSearch): denormalized documents with searchable text, filterable attributes, price, availability, popularity.",
      "Images in object storage + CDN.",
    ],
    design: [
      "Writes go to the catalog DB; change data capture → Kafka → indexer updates the search index (near real time).",
      "Search service builds queries: text match with analyzers (stemming, synonyms, typo tolerance) + filters + facets; then re-ranks with business signals (sales, ratings, availability, sponsored).",
      "Product pages served from cache with event-driven invalidation.",
      "Full reindex job can rebuild the index from the DB (aliases swap old → new index).",
    ],
    deepDives: [
      { title: "Variable attributes", body: "Category-specific attribute schemas (a TV has screen size; a shirt has size and color) stored as documents; the index maps known filterable attributes per category for facets." },
      { title: "Relevance", body: "BM25 text relevance is the base; combine with popularity, conversion rate, availability and personalization in a second-stage ranker. Measure with click-through and conversion in A/B tests." },
    ],
    tradeoffs: ["Index freshness vs indexing cost (batch small updates).", "Denormalized index documents (fast queries) vs keeping them in sync."],
  },
};
