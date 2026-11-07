import { lesson, type Lesson } from "./types";

// System design concept lessons: one explanation per checklist point in study.ts.

export const SD_LESSONS: Record<string, Lesson> = {
  // ------------------------------------------------ A. Fundamentals
  "sd-networking": lesson(
    "Every design sits on the network path: client → DNS → CDN/edge → load balancer → service → data store. Know what each hop costs and what it can do for you (caching, TLS termination, routing), because latency and failure modes come from here.",
    [
      "TCP gives an ordered, reliable byte stream with flow and congestion control, at the cost of a handshake and head-of-line blocking. UDP sends independent datagrams with no delivery guarantee; use it when late data is useless (voice, video, games) or when you build reliability yourself (QUIC).",
      "HTTP/1.1 allows one in-flight request per connection, so browsers open ~6 connections. HTTP/2 multiplexes many streams over one TCP connection with header compression, but a lost TCP packet stalls every stream. HTTP/3 runs over QUIC (UDP), so streams are independent and connection setup is faster.",
      "TLS 1.3 needs one round trip: the client sends supported ciphers and a key share, the server replies with its key share and certificate, and both derive symmetric keys (ECDHE). Asymmetric crypto is only used to agree on keys; bulk data uses fast symmetric encryption (AES-GCM). Resumption allows 0-RTT.",
      "The resolver checks its cache, then asks a root server, the TLD server (.com) and the domain's authoritative server, caching each answer for its TTL. Low TTLs allow fast failover but cost more lookups; DNS can return different IPs per region (GeoDNS) to route users nearby.",
      "A CDN caches content at edge locations close to users, cutting latency and origin load. Static assets are the obvious case; it can also cache API responses with short TTLs, terminate TLS, absorb DDoS traffic and run edge logic. Invalidate by versioned URLs rather than purges where possible.",
      "L4 balancers route by IP and port without reading the payload: very fast, protocol-agnostic. L7 balancers parse HTTP, so they can route by path or header, terminate TLS, retry, and do sticky sessions. Common algorithms: round robin, least connections, consistent hashing (for cache affinity).",
      "A forward proxy acts for clients (corporate egress, anonymity). A reverse proxy sits in front of servers and acts for them: TLS termination, compression, caching, rate limiting, routing to backends. Nginx, Envoy and HAProxy are typical; an API gateway is a reverse proxy with auth and API-level policies.",
    ],
    [
      "Walk me through what happens when a user types example.com and presses Enter.",
      "When would you choose an L4 over an L7 load balancer?",
      "Why can HTTP/2 be slower than HTTP/1.1 on a lossy mobile network?",
      "How would you serve users in Asia and Europe with low latency?",
    ],
    ["Forgetting that the load balancer itself must be redundant (active-passive pair or DNS across several).", "Using very long DNS TTLs and then being unable to fail over quickly."],
  ),
  "sd-apis": lesson(
    "The API is the contract between clients and your system. Interviewers look for clear resources, safe retries (idempotency), sensible pagination and the right real-time mechanism for the use case.",
    [
      "REST: resources and HTTP verbs, cacheable, universal; the default for public APIs. gRPC: Protobuf over HTTP/2, typed contracts, streaming, fast; good between internal services. GraphQL: the client asks for exactly the fields it needs in one round trip; good for varied frontends, but harder to cache and to protect from expensive queries.",
      "The client sends a unique Idempotency-Key with a non-idempotent request (e.g. POST /payments). The server stores key → result; a retry with the same key returns the stored result instead of charging twice. Store keys with a TTL (e.g. 24 h) and make the 'check and insert' atomic.",
      "Offset pagination (LIMIT 20 OFFSET 1000) is simple but slow for deep pages and skips or repeats rows when data changes. Cursor/keyset pagination (WHERE id < last_seen ORDER BY id DESC LIMIT 20) uses an index, is stable under inserts, and scales; return an opaque cursor to the client.",
      "Version so old clients keep working: in the URL (/v1/…), a header, or by only making backward-compatible changes (add optional fields, never remove or rename). Deprecate with a timeline and usage metrics.",
      "Protect the API from abuse and noisy clients by limiting requests per key, user or IP. Return 429 Too Many Requests with Retry-After. Usually enforced at the gateway with a token bucket backed by Redis.",
      "Webhooks push events to a URL the customer registers, instead of the customer polling. Sign payloads (HMAC) so receivers can verify them, retry with backoff, and expect receivers to dedupe because delivery is at-least-once.",
      "Long polling: the client's request is held open until there's data, then it re-requests; works everywhere. Server-Sent Events: one long-lived HTTP response streaming server→client events; simple, auto-reconnects. WebSockets: full-duplex over one connection; needed for chat or games, but stateful connections complicate load balancing.",
    ],
    [
      "Design the API for creating a payment so that client retries are safe.",
      "Why is offset pagination a problem for a feed, and what would you use instead?",
      "Chat app: WebSockets, SSE or long polling? Why?",
    ],
    ["Making POST retries unsafe; network timeouts mean clients will retry.", "Returning unbounded lists with no pagination."],
  ),
  "sd-estimation": lesson(
    "Estimation shows you can size a system before designing it. The goal is the right order of magnitude to make decisions (one database or sharded? cache fits in memory?), not precise numbers. State assumptions, round aggressively, and say what the numbers imply.",
    [
      "Estimate peak QPS (average × 2-10 for peaks), storage per year (items/day × size × 365 × replication), bandwidth (QPS × payload size), and cache memory (e.g. 20% of daily hot data). Then use them: '10k writes/s is too much for one Postgres primary, so we shard'.",
      "A day has 86,400 seconds; round to ~100,000. So 1 million requests a day is about 12 QPS on average, and 100 million a day is about 1,200 QPS. Memorize this conversion; it comes up in every design.",
      "Multiply size by count: 1 KB × 1 billion = 1 TB; 1 MB × 1 million = 1 TB. Useful powers: thousand = KB, million = MB, billion = GB, trillion = TB (for bytes per item × items).",
      "Latency numbers: memory reference ~100 ns, SSD random read ~0.1 ms, round trip within a data center ~0.5 ms, disk seek ~10 ms, cross-continent round trip ~100-150 ms. They explain why caching in memory and avoiding cross-region calls on the request path matter.",
    ],
    [
      "Estimate storage for a URL shortener with 100M new URLs a month, kept 5 years.",
      "Twitter has 300M daily users who each read 100 tweets: what read QPS is that?",
      "Will the hot set of user profiles fit in a single Redis node?",
    ],
    ["Spending 10 minutes on arithmetic; aim for 3-4 minutes.", "Producing numbers and then not using them to make a decision."],
  ),
  "sd-scalability": lesson(
    "Scalability is handling more load by adding resources. The core move is making services stateless so any instance can serve any request, then pushing state into systems built to scale it (databases, caches, queues).",
    [
      "Vertical scaling (bigger machine) is simple and has no distribution problems, but has a ceiling and a single point of failure. Horizontal scaling (more machines) is nearly unlimited and adds redundancy, but needs load balancing and stateless services or partitioned data.",
      "A stateless service keeps no per-user data in memory between requests; session data lives in a shared store (Redis) or a signed token. Then instances can be added, removed or replaced freely and the load balancer can send any request anywhere.",
      "Sticky sessions route a user to the same instance (by cookie or IP hash) so in-memory session state works. They're a crutch: load becomes uneven and state is lost when that instance dies. Prefer externalized state.",
      "Autoscaling adds or removes instances based on a metric (CPU, request rate, queue depth). Scale on the metric closest to user pain, keep a minimum for warm capacity, and remember that new instances take time to start, so scale out early and in slowly.",
      "Backpressure means a system that can't keep up signals upstream to slow down instead of falling over: bounded queues, rejecting with 429/503, or consumers pulling at their own pace. Without it, overload leads to cascading failures.",
    ],
    ["Your service holds user sessions in memory. How do you scale it to 20 instances?", "What would you autoscale a queue consumer on?", "How do you stop one slow dependency from taking down everything?"],
    ["Scaling the stateless tier while the database stays the bottleneck."],
  ),
  "sd-availability": lesson(
    "Availability is the fraction of time the system serves requests successfully. You get it from redundancy (no single point of failure), fast detection and failover, and designing so partial failures degrade the product instead of breaking it.",
    [
      "SLI: a measured indicator (e.g. % of requests under 300 ms and non-5xx). SLO: your internal target for it (99.9% over 30 days). SLA: a contract with customers, with penalties, set looser than the SLO. 99.9% allows ~43 minutes of downtime a month; 99.99% ~4.3 minutes. Each extra nine costs a lot more.",
      "Run every component with spares across failure domains (multiple instances, multiple availability zones). Failover can be active-passive (standby takes over; brief outage) or active-active (all serve traffic; harder for writes). Remove single points of failure, including the load balancer and the database primary.",
      "Health checks (liveness: is it running? readiness: can it serve?) let load balancers remove bad instances. Graceful degradation keeps the core working when a dependency fails: show a cached feed, hide recommendations, disable a non-critical feature.",
      "A circuit breaker stops calling a failing dependency after errors cross a threshold (open), fails fast for a while, then lets a few test requests through (half-open) before closing. Bulkheads isolate resources (separate thread pools or connection pools per dependency) so one slow dependency can't exhaust everything.",
      "Retry transient failures, but with exponential backoff (100 ms, 200 ms, 400 ms…) plus random jitter so clients don't retry in sync and hammer the service again. Cap the attempts, only retry idempotent operations, and use a retry budget so retries can't multiply load during an outage.",
      "Every network call needs a timeout; without one, threads pile up waiting on a dead dependency. Set timeouts from the dependency's latency percentiles, and make the total deadline propagate down the call chain so lower layers give up when the caller already has.",
    ],
    ["How would you take this service from 99.9% to 99.99%?", "A downstream service is slow and your thread pool is exhausted. What do you do?", "Explain retries with jitter and when retries make an outage worse."],
    ["Retrying non-idempotent writes.", "Retries at every layer multiplying load (3 layers × 3 retries = 27 requests)."],
  ),
  "sd-consistency": lesson(
    "A consistency model says what a reader may see after writes, especially with replicas. Stronger models are easier to program against but cost latency and availability; weaker ones are fast but expose stale or reordered data. Pick per use case.",
    [
      "Strong (linearizable): every read sees the latest completed write, as if there were one copy. Needed for things like account balances, inventory counts or leader election. Costs a quorum or leader round trip on every operation.",
      "Sequential: all clients see all operations in the same order, and each client's operations appear in its program order, but that order needn't match real time. Weaker than linearizable, stronger than causal.",
      "Causal: operations that are causally related (a reply after the message it answers) are seen in that order by everyone; unrelated operations may be seen in different orders. A good fit for comments and chat; tracked with version vectors or logical clocks.",
      "Eventual: if writes stop, all replicas converge to the same value eventually; until then reads may be stale. Fine for like counts, view counts, profile pictures, DNS. Needs a conflict-resolution rule (last-write-wins, CRDTs, app merge).",
      "Read-your-writes: a user always sees their own updates (after editing a profile, they see the edit), even if others see it later. Implement by reading from the leader for a short time after a write, or by tracking the write's version and waiting for a replica to catch up.",
      "Monotonic reads: a user never sees data go backwards in time (seeing a comment, then refreshing and it's gone). Implement by pinning a user to one replica or by tracking the last version they saw.",
    ],
    ["Which consistency model does a like counter need? A bank transfer? A chat thread?", "A user updates their profile and refreshes, but sees the old version. Why, and how do you fix it?"],
    ["Saying 'eventual consistency' without explaining how conflicts are resolved."],
  ),
  "sd-cap": lesson(
    "CAP says that during a network partition, a distributed store must choose between consistency (refuse or delay requests) and availability (answer, possibly with stale data). PACELC adds that even without partitions there's a trade-off between latency and consistency.",
    [
      "Partitions happen (switches fail, links drop), so P isn't optional. When nodes can't talk, a CP system rejects writes or reads on the minority side to stay consistent (ZooKeeper, etcd, Spanner); an AP system keeps accepting them and reconciles later (Dynamo-style stores, Cassandra at low consistency levels).",
      "PACELC: if Partition, choose Availability or Consistency; Else, choose Latency or Consistency. Synchronous replication to a quorum gives consistency but adds latency to every write even on a healthy network. DynamoDB and Cassandra are PA/EL by default; Spanner is PC/EC.",
    ],
    ["Is your design CP or AP during a partition, and what does the user see?", "Why is 'CA' not a real option for a distributed system?"],
    ["Treating CAP as 'pick 2 of 3' for the whole system; the choice can differ per operation (tunable consistency)."],
  ),
  "sd-dist-concurrency": lesson(
    "When multiple servers update shared data, you need a way to prevent lost updates and double actions. Prefer optimistic concurrency at the data layer; use distributed locks only when you must, and make them safe with leases and fencing tokens.",
    [
      "A single database row lock (SELECT … FOR UPDATE) is the simplest correct lock when all writers share one database. It serializes writers on that row; keep transactions short to avoid contention and deadlocks.",
      "Optimistic concurrency: read the row with its version, write with UPDATE … SET …, version = v+1 WHERE id = ? AND version = v. If zero rows changed, someone else won; re-read and retry. No locks held, great when conflicts are rare. Compare-and-swap in Redis or DynamoDB conditional writes are the same idea.",
      "Distributed locks coordinate across services that don't share a database. ZooKeeper/etcd locks are built on consensus and session leases, so they're safe. Redis Redlock relies on timing assumptions; a GC pause or clock jump can let two clients believe they hold the lock. Use it only for efficiency, not correctness.",
      "A lease is a lock with an expiry: the holder must renew it, and if it crashes the lease expires so others can proceed. The catch: a holder that pauses past expiry may still act as if it holds the lease.",
      "A fencing token is a number that increases every time the lock is granted. The holder sends it with every write, and the storage rejects writes with a token lower than one it has already seen. This makes an expired holder's late writes harmless.",
    ],
    ["Two users book the last seat at the same time. How do you ensure only one succeeds?", "Why isn't a Redis lock with a TTL enough for correctness?"],
    ["Holding a lock across a slow network call or user think-time."],
  ),

  // ------------------------------------------------ B. Data storage
  "sd-sql": lesson(
    "Relational databases are the default choice: transactions, constraints, flexible queries, and they scale further than people think (read replicas, partitioning, a big primary). Know how indexes and isolation work so you can say why a query is fast and a transfer is safe.",
    [
      "A B-tree index keeps keys sorted in a shallow tree of disk pages, so lookups and range scans take a few page reads. A composite index on (a, b) serves queries filtering on a, or a and b, but not b alone (leftmost-prefix rule). A covering index includes every column the query needs, so the table isn't touched at all.",
      "EXPLAIN shows the plan the optimizer chose: index scan vs full table scan, join order and join algorithm, estimated rows. Check it for slow queries; a sequential scan on a big table or a bad row estimate usually explains the problem.",
      "Read committed: no dirty reads, but repeated reads can change. Repeatable read / snapshot isolation: the transaction sees one consistent snapshot, but write skew is still possible. Serializable: as if transactions ran one at a time; safest, with more aborts or locking. Postgres defaults to read committed, MySQL InnoDB to repeatable read.",
      "Multi-version concurrency control keeps old row versions so readers see a snapshot without blocking writers, and writers don't block readers. Old versions are cleaned up later (vacuum in Postgres, purge in InnoDB). Long transactions keep old versions alive and bloat the table.",
      "Two transactions each hold a lock the other needs. The database detects the cycle and aborts one, so the application must retry. Avoid deadlocks by always locking rows in the same order and keeping transactions short.",
    ],
    ["Why might a query not use the index you created?", "Explain write skew with an example and how to prevent it.", "When does a relational database stop being enough?"],
    ["Indexing every column; each index slows writes and uses memory."],
  ),
  "sd-nosql": lesson(
    "NoSQL stores trade query flexibility (joins, ad-hoc queries) for scale, availability or a data model that fits the access pattern. Choose by access pattern: design the keys around the queries you must serve, not around entities.",
    [
      "Key-value: get/put by key, nothing else; extremely fast and easy to partition. Redis keeps data in memory with rich structures (lists, sorted sets) for caches, sessions and leaderboards. DynamoDB is durable and managed, with partition and sort keys, used as a primary store when access patterns are known.",
      "Document stores keep JSON-like documents queried by fields, with flexible schemas and nested data that's read together (a product with variants). Good when each request reads one aggregate; weak at many-to-many relationships and cross-document transactions.",
      "Wide-column stores organize rows by a partition key with sorted clustering columns inside each partition, optimized for huge write volumes and range reads within a partition: messages by (channel_id, time), sensor readings by (device, time). You model one table per query.",
      "Graph databases store nodes and edges and traverse relationships efficiently (friends of friends, fraud rings, recommendations). Use them when queries follow many hops; most social apps still use relational or key-value stores with precomputed graphs.",
      "Time-series databases are optimized for append-heavy timestamped data with time-range queries, downsampling, retention policies and compression (metrics, IoT). They exploit the fact that data arrives roughly in time order and old data is rarely updated.",
    ],
    ["Why would you choose Cassandra for chat messages?", "Model a 'messages in a channel, newest first' query in DynamoDB.", "When would you not use NoSQL?"],
    ["Picking NoSQL 'for scale' when the data is relational and modest in size."],
  ),
  "sd-lsm": lesson(
    "Storage engines come in two families. B-trees update pages in place, which is good for reads. LSM trees buffer writes in memory and flush sorted files sequentially, which is good for writes. The choice explains why Cassandra and RocksDB write fast and Postgres reads fast.",
    [
      "A B-tree does random writes to update pages in place: reads are fast and predictable, and writes cost more. An LSM tree appends writes to a log and an in-memory memtable, then flushes immutable sorted files (SSTables): writes are fast and sequential, and reads may check several files. Use LSM for write-heavy workloads and B-trees for read-heavy, update-in-place ones.",
      "Compaction merges SSTables in the background, dropping overwritten and deleted (tombstoned) keys, so reads check fewer files. Size-tiered compaction is cheaper for writes; leveled compaction gives better reads and space use. Compaction competes with foreground I/O.",
      "Each SSTable has a Bloom filter, a compact bit array that can say 'definitely not here', so a read skips files that can't contain the key. This keeps LSM reads of missing or rare keys cheap.",
      "Write amplification: one logical write becomes several physical writes as data is rewritten during compaction (LSM), or as a whole page is rewritten for a small change (B-tree). It wears SSDs and eats I/O bandwidth; read amplification and space amplification are the other two costs to balance.",
    ],
    ["Why are LSM trees good for write-heavy workloads?", "How does an LSM tree find a key?"],
  ),
  "sd-replication": lesson(
    "Replication keeps copies of data on several machines for availability, read scaling and lower latency. The hard parts are replication lag, failover, and deciding who accepts writes.",
    [
      "One leader accepts writes and streams changes to followers, which serve reads. Simple and widely used (Postgres, MySQL). Synchronous replication to at least one follower avoids losing acknowledged writes; asynchronous is faster but can lose recent writes when the leader dies.",
      "Several leaders accept writes, often one per region, and replicate to each other. Good for multi-region writes and offline clients, but concurrent writes to the same data conflict and need resolution (last-write-wins, merge functions, CRDTs).",
      "Any replica accepts reads and writes (Dynamo, Cassandra). With N replicas, a write waits for W acknowledgements and a read queries R replicas; if R + W > N, a read overlaps at least one up-to-date replica. Repair stale replicas with read repair and anti-entropy (Merkle trees).",
      "Followers trail the leader by milliseconds to minutes. Effects: a user doesn't see their own write, or sees data go backwards. Mitigate with read-your-writes (read from the leader after a write), monotonic reads (pin a user to a replica), or by routing critical reads to the leader.",
      "When the leader fails, a follower is promoted, by consensus or an orchestrator. Risks: losing un-replicated writes, and split brain, where two nodes both think they're the leader and accept writes. Prevent split brain with quorum-based election and fencing the old leader.",
    ],
    ["Leader-follower, multi-leader or leaderless for a global shopping cart?", "With N=3, what R and W give strong reads? What if one node is down?", "What is split brain and how do you prevent it?"],
  ),
  "sd-sharding": lesson(
    "Sharding splits data across machines so each holds a subset, which scales storage and write throughput beyond one node. The partition key decides everything: an even spread, which queries hit one shard, and what hurts when you grow.",
    [
      "Hash partitioning (hash(key) mod N, or a ring) spreads load evenly, but range queries hit every shard. Range partitioning (A-F, G-M) keeps ranges together for efficient scans but risks hot ranges (recent timestamps). Directory-based uses a lookup table from key to shard: flexible, but the directory is one more critical component.",
      "One key or range gets far more traffic than the others: a celebrity's account, today's time bucket. Fixes: add a random suffix to spread the key over several partitions and merge on read, cache it, or split that partition further.",
      "Adding nodes with hash mod N moves almost every key. Use a fixed large number of logical partitions mapped to nodes (move whole partitions), or consistent hashing. Resharding needs a background copy plus a cutover with dual writes or a brief freeze.",
      "Consistent hashing maps keys and nodes onto a ring; a key belongs to the next node clockwise, so adding or removing a node moves only about 1/N of the keys. Virtual nodes (each server owns many ring points) spread load evenly and spread a failed node's load across many peers.",
      "A local secondary index is per shard: writes are cheap, but queries on the indexed field go to every shard (scatter-gather). A global secondary index is partitioned by the indexed value: reads hit one shard, but each write updates another shard, usually asynchronously.",
    ],
    ["Shard a chat messages table. What's the partition key?", "How does consistent hashing reduce data movement?", "How do you query by email when users are sharded by user_id?"],
    ["Sharding before it's needed; it makes joins, transactions and operations much harder."],
  ),
  "sd-dist-tx": lesson(
    "Once data lives in several services or databases, there's no single transaction to make everything atomic. Use 2PC sparingly, prefer sagas with compensating actions, publish events reliably with an outbox, and make every consumer idempotent.",
    [
      "Two-phase commit: a coordinator asks every participant to prepare (vote), then tells all of them to commit or abort. It's atomic, but blocking: if the coordinator dies after prepare, participants hold locks until it recovers. Fine inside one database cluster; avoid it across microservices.",
      "A saga is a sequence of local transactions, each with a compensating action that undoes it (reserve stock → charge card → on failure, release stock). Choreography: services react to each other's events (decoupled, but the flow is hard to see). Orchestration: a central coordinator drives the steps (clear flow, one more component).",
      "To update the database and publish an event without 2PC, write the event to an outbox table in the same local transaction as the business change. A relay (polling or change data capture) publishes outbox rows to the broker and marks them sent. Delivery is at-least-once, never 'database committed but event lost'.",
      "Brokers redeliver, so consumers must handle duplicates: track processed message ids, use upserts or conditional writes, and make side effects idempotent (an idempotency key on the payment call). This turns at-least-once delivery into effectively-once processing.",
      "Exactly-once delivery across a network is impossible in general: a sender can't tell 'lost' from 'slow'. Systems that advertise it (Kafka transactions) give exactly-once processing within their own boundary. Across systems, you get at-least-once plus idempotency.",
    ],
    ["Design order checkout across Order, Payment and Inventory services.", "How do you make sure an event is published if and only if the DB write commits?"],
  ),
  "sd-consensus": lesson(
    "Consensus lets a group of nodes agree on a value or an ordered log despite failures, as long as a majority is up. It's the basis of leader election, configuration stores (etcd, ZooKeeper) and strongly consistent databases (Spanner, CockroachDB).",
    [
      "Paxos and Raft both solve agreement with a majority quorum, so 2f+1 nodes tolerate f failures. Raft is designed to be understandable: one leader per term, the leader appends entries to followers' logs, and an entry is committed once a majority has it. You don't need the proofs, just the guarantees and the costs.",
      "Nodes start as followers; if a follower hears no heartbeat before its randomized timeout, it becomes a candidate, increments the term and asks for votes. A node votes once per term and only for candidates whose log is at least as up to date. A majority makes a leader, and randomized timeouts avoid split votes.",
      "Clients send commands to the leader, which appends them to its log and replicates them to followers. Once a majority has stored an entry, it's committed and applied to the state machine in log order. Followers with conflicting entries are overwritten by the leader's log.",
      "A quorum is a majority, so any two quorums overlap in at least one node; that overlap is why committed data survives leader changes. A 5-node cluster tolerates 2 failures; adding a 6th node doesn't increase tolerance, which is why clusters have odd sizes. Every write costs a round trip to a majority.",
    ],
    ["Why do consensus clusters have an odd number of nodes?", "What happens in Raft when the leader crashes?", "Why not run consensus for every write in a high-throughput system?"],
  ),
  "sd-search": lesson(
    "Full-text search uses an inverted index: for each term, the list of documents containing it. Search systems sit beside the primary database, fed by change streams, and trade freshness and some consistency for fast relevance-ranked queries.",
    [
      "Map each term to a postings list of document ids (with positions and frequencies). A query intersects or unions postings lists, much faster than scanning documents. Postings are sorted and compressed, and segments are immutable and merged, much like an LSM tree.",
      "Analyzers turn text into terms: tokenize, lowercase, remove stop words, stem ('running' → 'run'), add synonyms, and use n-grams for prefix or fuzzy matching. The same analyzer must run at index time and query time.",
      "Classic ranking is TF-IDF or BM25: terms that are frequent in the document but rare overall score higher, and field length is normalized. Real systems add signals like popularity, recency and personalization, often with a second-stage learned re-ranker.",
      "Elasticsearch/OpenSearch distribute the index as shards with replicas; queries fan out to shards and merge the top results. They're not a primary store: index from your database through a queue or CDC, and be able to rebuild the index.",
      "New documents become searchable after a refresh (about 1 s by default), when the in-memory buffer becomes a searchable segment. This is near real time, not immediate; trade refresh frequency against indexing throughput.",
    ],
    ["How would you keep search in sync with the product database?", "Design search for an e-commerce catalog with typo tolerance."],
  ),
  "sd-blob": lesson(
    "Large binary objects (images, videos, backups) belong in object storage, not in your database. Store the bytes in S3-like storage and the metadata (owner, key, size) in your database; serve the bytes through a CDN.",
    [
      "Objects are immutable blobs addressed by bucket and key; you replace an object rather than editing it. S3 provides strong read-after-write consistency, high durability through replication across zones, effectively unlimited scale, and pay-per-GB pricing. There's no rename or append, and listing is by prefix.",
      "Large files are uploaded in parts (e.g. 5-100 MB each) in parallel and assembled at the end. A failed part is retried alone, and uploads can resume. This is required for big videos and backups.",
      "The server signs a short-lived URL that lets the client upload or download one object directly to or from storage. Bytes bypass your servers (saving bandwidth and CPU), and access stays controlled by expiry and the exact key.",
      "Instead of keeping three full copies (200% overhead), split data into k data chunks plus m parity chunks (e.g. 10+4) spread across nodes; any k chunks rebuild the object. Similar durability at ~40% overhead, but rebuilding costs more CPU and network. Used for cold and warm tiers.",
      "Storage classes trade price against access latency and cost (hot, infrequent access, archive). Lifecycle rules move objects to cheaper tiers as they age, and delete them after a retention period.",
    ],
    ["How would users upload 2 GB videos reliably?", "Where do you store image metadata vs the image?"],
  ),
  "sd-warehouse": lesson(
    "Operational databases (OLTP) serve the app; analytical systems (OLAP) answer big aggregate questions. Keep them separate: copy data into a warehouse or lake built for scans, so analytics never slows production.",
    [
      "OLTP: many small reads and writes by key, low latency, current state, row storage (Postgres, DynamoDB). OLAP: few huge queries that scan and aggregate millions of rows, historical data, column storage (BigQuery, Redshift, Snowflake). Analytics on the OLTP primary hurts users.",
      "Columnar formats like Parquet and ORC store each column together. A query reading 3 of 100 columns reads only those, and similar values compress well (dictionary, run-length encoding). Files are partitioned by date so queries skip irrelevant data.",
      "Managed warehouses separate storage from compute, scale out queries across many workers, and bill by data scanned or compute time. Data lakes keep raw files in object storage queried by engines (Spark, Trino); 'lakehouse' formats (Iceberg, Delta) add tables and transactions on top.",
      "Batch ETL runs periodically (nightly or hourly) to extract, transform and load: simple and cheap, with stale data. Streaming pipelines (CDC → Kafka → stream processor → warehouse) give minutes-fresh data at more complexity. Many systems combine both.",
    ],
    ["How would you build a daily revenue dashboard without hurting the production DB?", "Why is columnar storage fast for analytics?"],
  ),

  // ------------------------------------------------ C. Building blocks
  "sd-caching": lesson(
    "A cache keeps hot data in fast storage (memory) to cut latency and load on the source. The hard parts aren't putting things in, but keeping them correct (invalidation) and surviving cache failures and stampedes.",
    [
      "Cache-aside: the app checks the cache, on a miss reads the DB and fills the cache; the most common pattern. Read-through: the cache itself loads from the DB on a miss. Write-through: writes go to cache and DB synchronously (fresh cache, slower writes). Write-behind: write to cache, flush to DB asynchronously (fast writes, risk of loss).",
      "A TTL bounds staleness and frees memory automatically. Eviction kicks in when memory is full: LRU evicts the least recently used item (good default), LFU the least frequently used (better for stable popularity). Add jitter to TTLs so many keys don't expire at once.",
      "When a hot key expires, thousands of requests miss at once and all hit the DB. Fixes: one request recomputes while others wait or get the stale value (lock or request coalescing), refresh early before expiry (probabilistic early expiration), or never expire hot keys and refresh them in the background.",
      "A single key can overload one cache node (a viral post). Fixes: replicate the key with suffixes across nodes, add a small in-process cache in front, or use the CDN.",
      "The safest approach is to delete the cache entry after writing the DB (not update it), with a TTL as a backstop. Races can still leave stale data briefly (a reader fills an old value after your delete); delayed double-delete or versioned keys reduce this. Change data capture can drive invalidation.",
      "Redis: rich data structures (sorted sets, lists, hashes), persistence options, replication and clustering, pub/sub and Lua scripts; mostly single-threaded per shard. Memcached: a simple multi-threaded key-value cache with no persistence; good for plain large caches. Redis is the usual default.",
      "CDNs cache responses at the edge using HTTP headers (Cache-Control: max-age, s-maxage, stale-while-revalidate). Version static asset URLs (app.3f2a.js) so they can be cached forever; give dynamic content short TTLs or don't cache it.",
    ],
    ["Cache-aside vs write-through: when to use each?", "A celebrity's profile key is melting one Redis node. Fix it.", "How do you stop a thundering herd when a hot key expires?"],
    ["Caching without a plan for invalidation.", "Treating the cache as a source of truth without persistence."],
  ),
  "sd-queues": lesson(
    "Queues and logs decouple producers from consumers in time and rate: absorb spikes, retry failures, and fan work out to many consumers. Know the difference between a work queue (SQS, RabbitMQ) and a replayable log (Kafka).",
    [
      "A topic is split into partitions, each an ordered append-only log; ordering holds within a partition. Producers choose the partition by key (so all events for one order stay in order). A consumer group shares the partitions, each read by one consumer of the group, so parallelism equals the partition count. Consumers commit offsets to record progress.",
      "Kafka keeps messages for a retention period whether or not they're consumed, so consumers can replay and new consumers can read history; log compaction keeps the latest value per key. Ordering holds per partition only. Exactly-once semantics come from idempotent producers plus transactions spanning consume-process-produce within Kafka.",
      "SQS is a managed work queue: a message is hidden while one consumer processes it, and deleted on success. Standard queues are at-least-once and unordered; FIFO queues order within a message group. SNS fans one message out to many subscribers (SNS → several SQS queues). RabbitMQ is a broker with flexible routing (exchanges) and push delivery.",
      "Messages that keep failing (poison messages) move to a dead-letter queue after N attempts, so they don't block the queue or loop forever. Alert on DLQ depth and build a way to inspect and replay messages.",
      "Most queues guarantee at-least-once delivery: a message can arrive twice (consumer crashed after processing, before acknowledging). Consumers must be idempotent. At-most-once (ack before processing) can lose messages.",
      "When consumers fall behind, queue depth or consumer lag grows. Monitor it, autoscale consumers on it (up to the partition count for Kafka), and bound the queue or shed load at the producer if lag becomes unacceptable.",
    ],
    ["Kafka or SQS for sending notifications? For an activity event stream?", "How do you keep per-user ordering while processing in parallel?", "What happens if a consumer crashes mid-message?"],
  ),
  "sd-stream": lesson(
    "Stream processing computes continuously over unbounded event streams: rolling counts, fraud detection, real-time dashboards. The key ideas are time (event time vs processing time), windows and state.",
    [
      "Flink is a true streaming engine: event-at-a-time processing, managed state with checkpoints, low latency. Spark Structured Streaming processes small micro-batches, with somewhat higher latency and simpler semantics, and is good if you already use Spark. Kafka Streams is a library for Kafka-to-Kafka processing.",
      "Group events into windows to aggregate: tumbling (fixed, non-overlapping: per minute), sliding/hopping (overlapping: last 5 minutes every minute), and session windows (bursts of activity separated by gaps). Window by event time to get correct results despite delays.",
      "Events arrive late and out of order (mobile clients offline). A watermark is the engine's estimate that 'no more events older than T are coming'; a window closes when the watermark passes its end. Set allowed lateness, and send very late events to a side output or correct earlier results.",
      "The engine checkpoints operator state and source offsets together. After a failure it restores the state and replays from the saved offsets, so each event affects state exactly once. End-to-end exactly-once also needs transactional or idempotent sinks.",
    ],
    ["Count clicks per ad per minute in real time with late mobile events.", "Event time vs processing time: which do you use for billing?"],
  ),
  "sd-batch": lesson(
    "Batch processing runs over a large bounded dataset all at once: nightly reports, index builds, ML features. It's simple, high-throughput and easy to re-run, at the cost of freshness.",
    [
      "Map runs in parallel over input splits, emitting key-value pairs; the framework shuffles and sorts them by key; reduce aggregates each key's values. Failures are handled by re-running tasks on immutable input. The model is what matters now, not Hadoop specifically.",
      "Spark keeps intermediate data in memory across stages and plans whole pipelines as a DAG, so it's much faster than chained MapReduce jobs. It has DataFrame and SQL APIs and recomputes lost partitions from their lineage.",
      "Lambda architecture runs a batch layer (accurate, slow) and a speed layer (fast, approximate) and merges them, at the cost of maintaining two codebases. Kappa uses only a stream processor and reprocesses history by replaying the log. Kappa is preferred when the log keeps enough history.",
    ],
    ["Build a daily 'top products per category' job over 10 TB of orders.", "When would you pick Lambda over Kappa?"],
  ),
  "sd-discovery": lesson(
    "In a fleet where instances come and go, services need to find each other and get configuration without hardcoded addresses. Discovery, config and the mesh or gateway layer handle routing, retries and security between services.",
    [
      "The simplest approach: a stable DNS name resolves to healthy instances or a load balancer. Kubernetes Services work this way. Drawbacks: TTL caching delays updates, and plain DNS doesn't do load-aware routing.",
      "Services register themselves (with health checks) in a strongly consistent registry (Consul, etcd, ZooKeeper); clients or sidecars watch it for changes. The same stores hold dynamic configuration and feature flags, pushed to services without redeploys.",
      "A sidecar proxy (Envoy) next to each service handles traffic: mTLS, retries, timeouts, circuit breaking, load balancing and telemetry. A control plane (Istio) configures all the sidecars. Consistent policy without library changes, at the cost of operational complexity and a little latency.",
      "A single entry point for external clients: routing to internal services, authentication, rate limiting, request aggregation, protocol translation. It keeps those concerns out of every service, but must be highly available and must not turn into a monolith of business logic.",
    ],
    ["How does service A find healthy instances of service B?", "API gateway vs service mesh: what goes where?"],
  ),
  "sd-rate-limit": lesson(
    "Rate limiting protects services from abuse and overload and enforces fair use. Choose an algorithm for the burst behaviour you want, and make counting fast and shared across instances.",
    [
      "A bucket holds up to B tokens and refills at rate r; each request takes a token or is rejected. Allows bursts up to B while enforcing the average rate r. Needs only two numbers per key (tokens and last refill time), so it's cheap and the most common choice.",
      "Requests enter a fixed-size queue that drains at a constant rate; overflow is dropped. Output is perfectly smooth, which suits protecting a downstream with a fixed capacity, but bursts get queued or dropped even when capacity is free.",
      "Fixed window counts requests per calendar window (per minute): simple, but allows 2× the limit across a boundary. Sliding window log stores every timestamp (exact, memory-heavy). Sliding window counter weights the previous window's count by overlap: approximate, cheap, and the common compromise.",
      "With many gateway instances, the counters must be shared: Redis INCR with EXPIRE for windows, or a Lua script doing the token-bucket update atomically. To save round trips, keep local counters and sync periodically, accepting slight overshoot. Decide whether to fail open or closed if Redis is down.",
    ],
    ["Design a rate limiter allowing 100 requests per minute per API key across 50 servers.", "Token bucket vs sliding window: which allows bursts?"],
  ),
  "sd-ids": lesson(
    "Distributed systems need unique ids without a central bottleneck. Properties to choose between: uniqueness, sortability by time, size, and whether ids leak information (like counts).",
    [
      "128-bit random ids (v4) can be generated anywhere with no coordination, and collisions are practically impossible. But they're large, and random ids hurt B-tree index locality (inserts land on random pages). UUIDv7 puts a timestamp first to fix the locality.",
      "64 bits: timestamp in milliseconds (41 bits), machine id (10 bits), per-millisecond sequence (12 bits). Roughly time-sorted, compact, generated locally at high rates. Needs unique machine ids and is sensitive to clock going backwards (wait or fail).",
      "128 bits: 48-bit timestamp plus 80 random bits, encoded as 26 sortable characters. Lexicographically time-sortable, no coordination. Similar to UUIDv7.",
      "A central sequence hands out blocks of ids (each server grabs 1,000 at a time), so the database is hit once per block. Short and dense ids (good for URL shorteners), but they reveal volume, and blocks are lost on crashes (gaps).",
    ],
    ["Generate ids for 100k tweets per second, sortable by time.", "Why not auto-increment ids in a sharded database?"],
  ),
  "sd-coordination": lesson(
    "Some decisions need one answer across the cluster: who's the leader, who holds a lock, what's the current config. Coordination services built on consensus provide these primitives so you don't build consensus yourself.",
    [
      "Small, strongly consistent key-value stores replicated with consensus (ZAB in ZooKeeper, Raft in etcd). Features: watches (notify on change), ephemeral keys tied to a client session or lease (vanish when the client dies), and sequential keys. Kubernetes stores its whole state in etcd. Meant for small metadata, not application data.",
      "Each candidate creates an ephemeral sequential node (or takes a lease key); the lowest sequence (or the lease holder) is leader, and others watch it. When the leader's session expires, its node disappears and the next one takes over. Combine with fencing so the old leader can't keep writing.",
      "The same recipe implements locks: the holder owns the ephemeral node, and others wait for it to be deleted. Safe because of consensus and session expiry, but still pass fencing tokens (the zxid or revision) to the storage you're protecting.",
    ],
    ["How would you ensure exactly one instance runs the nightly job?", "What happens to a ZooKeeper lock when the holder's machine crashes?"],
  ),
  "sd-observability": lesson(
    "Observability is being able to tell what's wrong in production from the outside. Metrics tell you that something is wrong, traces tell you where, and logs tell you why. Interviewers want to hear what you'd monitor and alert on.",
    [
      "Metrics: cheap numeric time series (request rate, error rate, latency percentiles, saturation) for dashboards and alerts. Logs: detailed per-event records, structured (JSON) with request ids. Traces: follow one request across services as spans, showing where time goes. Correlate all three by trace id.",
      "Alert on symptoms users feel (error rate, latency SLO breach), not on causes (CPU 80%). Every alert should be actionable and urgent; everything else goes on a dashboard. Golden signals: latency, traffic, errors, saturation (RED and USE methods).",
      "Error budget = 1 - SLO (0.1% of requests for 99.9%). Burn rate is how fast you're spending it; a 14× burn exhausts a 30-day budget in about 2 days. Multi-window burn-rate alerts (fast and slow) catch both sharp outages and slow leaks with few false alarms.",
      "Each alert links to a runbook: what it means, how to check, how to mitigate (roll back, fail over, scale). Clear ownership, an escalation path, and blameless postmortems that produce action items.",
    ],
    ["What would you monitor for this design, and what would page someone at 3 a.m.?", "Why p99 latency rather than average?"],
  ),
  "sd-security": lesson(
    "Security in a design round means: who is the caller (authentication), what may they do (authorization), protecting data in transit and at rest, and handling secrets and personal data properly. Mention it briefly, unprompted.",
    [
      "Authentication verifies identity (password + MFA, SSO, tokens). Authorization decides what that identity may do (role-based or attribute-based access, resource ownership checks). Check authorization on the server for every request; most real breaches are broken authorization (IDOR).",
      "A delegation framework: a user lets an app access their resources without sharing a password. The authorization-code flow with PKCE gives the app an access token (short-lived) and a refresh token. OpenID Connect adds identity (an ID token) on top for 'log in with Google'.",
      "Server sessions: a random session id in a cookie maps to server-side state; easy to revoke, but needs a shared store. JWTs: signed, self-contained claims verified without a lookup; stateless and fast, but hard to revoke before expiry. Keep JWTs short-lived and pair them with refresh tokens.",
      "API keys identify calling applications (not users); store them hashed, scope them, and rotate them. Mutual TLS: both sides present certificates, which gives strong service-to-service identity and is common inside a service mesh.",
      "In transit: TLS everywhere, including internal traffic. At rest: disk or database encryption with keys in a KMS, plus envelope encryption (data keys encrypted by a master key). Field-level encryption for especially sensitive columns.",
      "Never put secrets in code or images. Use a secrets manager (Vault, AWS Secrets Manager) with access control, audit logs and rotation; inject secrets at runtime and prefer short-lived credentials.",
      "Collect only what you need, restrict access, mask PII in logs, encrypt sensitive fields, set retention periods, and support deletion requests (GDPR). Tokenize payment data so card numbers never touch your main systems.",
    ],
    ["Sessions or JWTs for a web app? How would you log a user out everywhere?", "How do services authenticate each other?"],
  ),
  "sd-deployment": lesson(
    "How code reaches production decides how safely you can change it. Interviewers like hearing about gradual rollouts, fast rollback and surviving the loss of a zone or region.",
    [
      "Containers package an app with its dependencies so it runs the same everywhere. Kubernetes schedules containers (pods) onto machines, keeps the desired number running, does rolling updates, service discovery and autoscaling. Know the vocabulary: pod, deployment, service, ingress.",
      "Blue-green: run the new version alongside the old one and switch traffic at once, with instant rollback by switching back (needs double capacity). Canary: send a small percentage of traffic to the new version, compare its metrics, then ramp up. Canary catches problems with limited blast radius.",
      "Feature flags separate deploying code from releasing a feature: ship dark, enable for internal users, then a percentage, with a kill switch. Rollback should be one click. Database migrations must be backward compatible (expand, migrate, then contract) so old and new code can run together.",
      "Define infrastructure in code (Terraform, CloudFormation) so environments are reproducible, reviewed and versioned, rather than configured by hand.",
      "Spread every tier across at least 3 availability zones (independent data centers in a region) to survive a zone outage. Multi-region adds disaster recovery and lower latency for global users, but brings cross-region replication lag and write-conflict problems. Choose active-passive or active-active, and know your RPO and RTO.",
    ],
    ["How would you roll out a risky change to the payment service?", "Design for surviving the loss of an entire region."],
  ),
  "sd-probabilistic": lesson(
    "Probabilistic data structures answer membership, counting and frequency questions in a tiny fraction of the memory exact structures need, in exchange for a small, bounded error. They're common in deep dives (crawler dedup, unique visitors, trending topics).",
    [
      "A bit array with k hash functions. Add an item by setting its k bits; query by checking them. If any bit is 0 the item is definitely absent; if all are 1 it's probably present (false positives, never false negatives). About 10 bits per item gives a ~1% false-positive rate. Can't delete items (counting Bloom filters can).",
      "Estimates the number of distinct items (unique visitors) using a few kilobytes, with ~1-2% error, by tracking the maximum number of leading zeros of hashed values in many registers. Sketches can be merged (union across servers or days). Redis has PFADD and PFCOUNT.",
      "Estimates item frequencies in fixed memory: a d × w grid of counters with d hash functions. Increment one counter per row; the estimate is the minimum across rows, which may overcount but never undercounts. Used for heavy hitters or top-k in streams, combined with a heap.",
      "Geohash encodes latitude and longitude as a string where a shared prefix means nearby; search the cell and its 8 neighbours. A quadtree recursively splits space into four until each cell holds few points, adapting to density (dense cities get small cells). Used for 'find nearby drivers or places'.",
      "Nodes and keys are hashed onto a ring; each key belongs to the next node clockwise, with virtual nodes for balance. Adding or removing a node only moves its neighbours' keys. Used by distributed caches and Dynamo-style stores.",
    ],
    ["How does a web crawler avoid re-crawling URLs with limited memory?", "Count unique daily visitors across 100 servers.", "Find the top 10 trending hashtags in a stream."],
  ),
};
