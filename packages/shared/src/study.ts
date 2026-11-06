// Study areas beyond DSA: concept checklists (rate your confidence, tick what you know) and practice
// exercises (designs / LLD problems) with a scored practice log. Content follows the roadmap PDF.

import { addDays, daysBetween } from "./dates";

export type StudyAreaId = "sd" | "lld" | "core";

export interface Concept {
  id: string;
  title: string;
  /** What to know: each point is a checklist item. */
  points: string[];
}

export interface ConceptSection {
  id: string;
  title: string;
  /** Roadmap weeks, e.g. "3-4" */
  weeks?: string;
  concepts: Concept[];
}

export interface Exercise {
  id: string;
  title: string;
  /** What the design/problem exercises */
  focus: string;
  /** e.g. "Amazon" for the retail-flavoured designs */
  tag?: string;
}

export interface FrameworkStep {
  id: string;
  title: string;
  minutes: number;
  hint: string;
}

export interface StudyArea {
  id: StudyAreaId;
  title: string;
  /** Nav label */
  short: string;
  intro: string;
  sections: ConceptSection[];
  exercises?: {
    title: string;
    intro: string;
    /** XP for logging one practice session */
    xp: number;
    /** Steps you score yourself on (1-5) after each practice */
    steps: FrameworkStep[];
    items: Exercise[];
  };
}

/** XP the first time a concept reaches confidence 4+. */
export const CONCEPT_XP = 5;
export const CONFIDENCE_LABELS = ["Not started", "Heard of it", "Shaky", "Okay", "Solid", "Can teach it"] as const;
/** Confidence at which a concept counts as covered. */
export const COVERED_CONFIDENCE = 4;
/** Concepts rated below "covered" come back for review after this many days. */
export const CONCEPT_REVIEW_DAYS = 7;

const c = (id: string, title: string, points: string) => ({ id, title, points: points.split(";").map((s) => s.trim()) });

// ---------------------------------------------------------------- System design

const SD_STEPS: FrameworkStep[] = [
  { id: "req", title: "Requirements", minutes: 5, hint: "Functional, non-functional (latency, availability, consistency, durability), scale, out of scope" },
  { id: "est", title: "Estimation", minutes: 4, hint: "Peak and average QPS, storage, bandwidth, read/write ratio" },
  { id: "api", title: "API and data model", minutes: 5, hint: "Main endpoints, entities, keys, access patterns that drive the store choice" },
  { id: "hld", title: "High-level design", minutes: 10, hint: "Read and write paths; walk one request end to end" },
  { id: "deep", title: "Deep dives", minutes: 15, hint: "The 2-3 hardest parts, alternatives, and why you chose one" },
  { id: "fail", title: "Bottlenecks and failure", minutes: 5, hint: "SPOFs, retries, multi-region, monitoring, cost" },
  { id: "wrap", title: "Wrap-up", minutes: 1, hint: "Summarize trade-offs and what you'd build next" },
];

const sdDesign = (id: string, title: string, focus: string, tag?: string): Exercise => ({ id: `sdd-${id}`, title, focus, tag });

export const SYSTEM_DESIGN: StudyArea = {
  id: "sd",
  title: "System design",
  short: "Design",
  intro:
    "Drive a 45-minute design: gather requirements, estimate scale, draw a working architecture, then go deep on 2-3 components and defend trade-offs. Study in order: fundamentals, data storage, building blocks, then classic designs aloud.",
  sections: [
    {
      id: "sd-fundamentals",
      title: "A. Fundamentals",
      weeks: "3-4",
      concepts: [
        c("sd-networking", "Networking", "TCP vs UDP; HTTP/1.1 vs HTTP/2 vs HTTP/3; TLS handshake; DNS resolution; CDN; Load balancing (L4 vs L7); Proxies and reverse proxies"),
        c("sd-apis", "APIs", "REST vs gRPC vs GraphQL; Idempotency keys; Pagination (offset, cursor, keyset); Versioning; Rate limiting; Webhooks; Long polling vs SSE vs WebSockets"),
        c("sd-estimation", "Back-of-envelope estimation", "QPS, storage per year, bandwidth, cache memory; 1 day ≈ 86,400 s, 1M req/day ≈ 12 QPS; 1 KB × 1B = 1 TB; SSD read ≈ 0.1 ms, DC round trip ≈ 0.5 ms, cross-region ≈ 100 ms"),
        c("sd-scalability", "Scalability basics", "Vertical vs horizontal scaling; Stateless services; Sticky sessions; Autoscaling; Backpressure"),
        c("sd-availability", "Availability and reliability", "SLA, SLO, SLI and nines; Redundancy and failover; Graceful degradation and health checks; Circuit breakers and bulkheads; Retries with exponential backoff and jitter; Timeouts"),
        c("sd-consistency", "Consistency models", "Strong; Sequential; Causal; Eventual; Read-your-writes; Monotonic reads"),
        c("sd-cap", "CAP and PACELC", "What you give up in a partition; Latency vs consistency otherwise"),
        c("sd-dist-concurrency", "Concurrency in distributed systems", "Locks; Optimistic concurrency (version columns, CAS); Distributed locks (Redlock caveats, ZooKeeper/etcd); Leases; Fencing tokens"),
      ],
    },
    {
      id: "sd-storage",
      title: "B. Data storage",
      weeks: "4-6",
      concepts: [
        c("sd-sql", "SQL internals", "B-tree, composite and covering indexes; Query plans; Transactions and isolation levels (read committed, repeatable read, snapshot, serializable); MVCC; Deadlocks"),
        c("sd-nosql", "NoSQL types", "Key-value (DynamoDB, Redis); Document (MongoDB); Wide-column (Cassandra, HBase, Bigtable); Graph (Neo4j); Time series (InfluxDB, Timestream)"),
        c("sd-lsm", "LSM tree vs B-tree", "Write-heavy vs read-heavy trade-off; Compaction; Bloom filters; Write amplification"),
        c("sd-replication", "Replication", "Leader-follower; Multi-leader; Leaderless (quorum R+W>N); Replication lag; Failover and split brain"),
        c("sd-sharding", "Partitioning / sharding", "Hash vs range vs directory; Hot partitions; Resharding; Consistent hashing with virtual nodes; Secondary indexes on shards"),
        c("sd-dist-tx", "Transactions across services", "2PC; Saga (choreography vs orchestration); Outbox pattern; Idempotent consumers; Exactly-once myths"),
        c("sd-consensus", "Consensus", "Paxos and Raft at the idea level; Leader election; Log replication; Quorum"),
        c("sd-search", "Search", "Inverted index; Tokenization; Ranking basics; Elasticsearch/OpenSearch; Near-real-time indexing"),
        c("sd-blob", "Object and blob storage", "S3 semantics; Multipart upload; Presigned URLs; Erasure coding; Lifecycle tiers"),
        c("sd-warehouse", "Data warehouses and lakes", "OLTP vs OLAP; Columnar formats (Parquet); Redshift/BigQuery; Batch ETL vs stream"),
      ],
    },
    {
      id: "sd-blocks",
      title: "C. Building blocks",
      weeks: "5-7",
      concepts: [
        c("sd-caching", "Caching", "Cache-aside, read-through, write-through, write-behind; TTL and eviction (LRU, LFU); Stampede / thundering herd fixes; Hot keys; Cache invalidation; Redis vs Memcached; CDN caching"),
        c("sd-queues", "Message queues and streams", "Kafka: topics, partitions, consumer groups, offsets; Kafka retention, ordering, exactly-once semantics; SQS/SNS, RabbitMQ; Dead-letter queues; At-least-once delivery; Backpressure"),
        c("sd-stream", "Stream processing", "Flink / Spark Streaming; Windowing; Watermarks and late events; Exactly-once state"),
        c("sd-batch", "Batch processing", "MapReduce idea; Spark; Lambda vs kappa architecture"),
        c("sd-discovery", "Service discovery and config", "DNS; Consul, etcd; Service mesh (Envoy, Istio); API gateway"),
        c("sd-rate-limit", "Rate limiting", "Token bucket; Leaky bucket; Fixed and sliding window; Distributed counters in Redis"),
        c("sd-ids", "Unique ID generation", "UUID; Snowflake; ULID; DB sequences with ranges"),
        c("sd-coordination", "Coordination", "ZooKeeper / etcd; Leader election; Distributed locks"),
        c("sd-observability", "Observability", "Metrics, logs, traces; Alerting and dashboards; SLO burn rate; On-call runbooks"),
        c("sd-security", "Security", "AuthN vs AuthZ; OAuth2; JWT vs sessions; API keys and mTLS; Encryption at rest and in transit; Secrets management; PII handling"),
        c("sd-deployment", "Deployment", "Containers and Kubernetes basics; Blue-green and canary; Feature flags and rollbacks; Infrastructure as code; Multi-region and multi-AZ design"),
        c("sd-probabilistic", "Probabilistic structures", "Bloom filter; HyperLogLog; Count-Min Sketch; Geohash / quadtree; Consistent hashing ring"),
      ],
    },
  ],
  exercises: {
    title: "D. Classic designs",
    intro: "Weeks 7-11, about 2 a week. Do each aloud with a timer and a whiteboard, then compare against a reference. After 10, mix in random prompts with no prep.",
    xp: 30,
    steps: SD_STEPS,
    items: [
      sdDesign("url-shortener", "URL shortener / Pastebin", "ID generation, caching, analytics"),
      sdDesign("rate-limiter", "Rate limiter", "Algorithms, distributed counters, edge placement"),
      sdDesign("kv-store", "Key-value store / distributed cache", "Partitioning, replication, consistency"),
      sdDesign("notifications", "Notification service", "Fan-out, retries, preferences, dedup, multi-channel"),
      sdDesign("news-feed", "News feed / Twitter timeline", "Fan-out on write vs read, celebrity problem, ranking"),
      sdDesign("chat", "Chat system (WhatsApp)", "WebSockets, delivery receipts, ordering, presence, group fan-out"),
      sdDesign("video", "Video streaming (YouTube/Netflix)", "Upload pipeline, transcoding, CDN, adaptive bitrate"),
      sdDesign("file-sync", "File storage and sync (Dropbox/Drive)", "Chunking, dedup, sync conflicts, metadata"),
      sdDesign("ride-sharing", "Ride sharing (Uber)", "Geospatial index, matching, location updates, ETA"),
      sdDesign("typeahead", "Search autocomplete / typeahead", "Trie, top-k per prefix, update pipeline"),
      sdDesign("crawler", "Web crawler", "Frontier, politeness, dedup, scheduling"),
      sdDesign("job-scheduler", "Distributed job scheduler / cron", "Leasing, idempotency, retries, exactly-once-ish"),
      sdDesign("payments", "Payment system", "Idempotency, ledger, double-entry, reconciliation, sagas"),
      sdDesign("inventory", "E-commerce / inventory system", "Stock reservation, oversell, order state machine, caching"),
      sdDesign("ticketing", "Ticket booking / flash sale", "Contention, queues, holds with expiry"),
      sdDesign("metrics", "Metrics and monitoring system", "Time series ingestion, downsampling, alerting"),
      sdDesign("kafka", "Distributed log / message queue (design Kafka)", "Log segments, replication, consumer offsets"),
      sdDesign("collab-editing", "Google Docs / collaborative editing", "OT vs CRDT, conflict resolution, presence"),
      sdDesign("maps", "Maps and navigation / nearby friends", "Tiles, routing graphs, geohash, quadtree"),
      sdDesign("top-k", "Ad click aggregation / top-k leaderboard", "Stream aggregation, windows, accuracy trade-offs"),
      sdDesign("recommendations", "Recommendation / search ranking pipeline", "Features, offline/online, caching"),
      sdDesign("building-blocks", "Unique ID generator, distributed lock, API gateway", "Small but frequently asked building-block designs"),
      sdDesign("order-management", "Order management", "Order lifecycle, state machine, idempotent updates", "Amazon"),
      sdDesign("warehouse", "Warehouse / inventory tracking", "Stock levels across sites, reservations, reconciliation", "Amazon"),
      sdDesign("delivery-slots", "Delivery slot booking", "Capacity, holds with expiry, contention", "Amazon"),
      sdDesign("pricing", "Price and promotion service", "Rules, caching, consistency of displayed vs charged price", "Amazon"),
      sdDesign("catalog", "Product catalog with search", "Catalog model, indexing pipeline, search ranking", "Amazon"),
    ],
  },
};

// ---------------------------------------------------------------- Registry

/** Study areas in nav order. */
export const STUDY_AREAS: StudyArea[] = [SYSTEM_DESIGN];

export const getStudyArea = (id: string): StudyArea | undefined => STUDY_AREAS.find((a) => a.id === id);

export const ALL_CONCEPTS: Record<string, Concept & { area: StudyAreaId; section: string }> = Object.fromEntries(
  STUDY_AREAS.flatMap((a) => a.sections.flatMap((s) => s.concepts.map((concept) => [concept.id, { ...concept, area: a.id, section: s.title }]))),
);

export const ALL_EXERCISES: Record<string, Exercise & { area: StudyAreaId }> = Object.fromEntries(
  STUDY_AREAS.flatMap((a) => (a.exercises?.items ?? []).map((e) => [e.id, { ...e, area: a.id }])),
);

// ---------------------------------------------------------------- Scheduling

/** Days until a design/problem should be practiced again, from your last overall score (1-5). */
export function practiceInterval(score: number): number {
  if (score >= 4) return 30;
  if (score >= 3) return 14;
  return 7;
}

export type PracticeState =
  | { state: "new" }
  | { state: "practiced"; lastOn: string; score: number; nextOn: string; due: boolean };

export function practiceState(last: { on: string; score: number } | undefined, today: string): PracticeState {
  if (!last) return { state: "new" };
  const nextOn = addDays(last.on, practiceInterval(last.score));
  return { state: "practiced", lastOn: last.on, score: last.score, nextOn, due: nextOn <= today };
}

/** A concept you've rated but not yet covered comes back for review a week after you last touched it. */
export function conceptReviewDue(confidence: number, updatedOn: string | undefined, today: string): boolean {
  return confidence > 0 && confidence < COVERED_CONFIDENCE && !!updatedOn && daysBetween(updatedOn, today) >= CONCEPT_REVIEW_DAYS;
}

/** Average of the per-step scores (1-5) that were filled in, rounded to one decimal; null if none. */
export function averageScore(scores: Record<string, number>): number | null {
  const vals = Object.values(scores).filter((v) => Number.isInteger(v) && v >= 1 && v <= 5);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
}
