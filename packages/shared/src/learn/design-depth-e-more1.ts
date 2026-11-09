import type { ArchitectureBlock, EvaluationCriterion } from "./design-depth-types";
import type { Section } from "./types";

// Plan 0014 batch E and plan 0031: extra sections, architecture cards and evaluation criteria for the first three designs.
// design-depth-e.ts merges these into the base entries (edge cases and extra numbers go before "Failure modes", the
// trade-offs section goes last).

export interface DepthMore {
  before: Section[];
  after: Section[];
  architecture: ArchitectureBlock[];
  criteria: EvaluationCriterion[];
}

const p = (...paragraphs: string[]) => paragraphs.join("\n\n");

export const DEPTH_MORE_1: Record<string, DepthMore> = {
  "sdd-metrics": {
    before: [
      {
        title: "Edge cases that break naive designs",
        body: p(
          "**Counters reset.** A counter such as `http_requests_total` only goes up until the process restarts, then it drops to zero. A rate calculation that subtracts the first point from the last would report a huge negative number. The query layer must treat any decrease as a reset and add the value before the drop. Sum counters across instances first and then take the rate; averaging the instances hides a restarted one.",
          "**Percentiles do not average.** Host A served 10 requests with a p99 of 100 ms, host B served 10,000 requests with a p99 of 900 ms. The average of the two p99 values is 500 ms, which is wrong for the fleet, because almost all traffic saw something close to B. Store **histogram buckets** (counts of requests under 50 ms, 100 ms, 250 ms and so on) and add the bucket counts across hosts, then compute the percentile from the merged histogram. This is why agents send buckets, not percentiles.",
          "**Vanishing series and staleness.** When a pod is deleted, its series stops. A chart must not keep drawing the last value forever, so the query layer ends a series after a lookback window (five minutes is a common choice) or when the agent writes an explicit staleness marker. Related: autoscaling and deploys give every pod a new name. If 1,000 pods are replaced 10 times a day, one metric with a `pod` label creates 10,000 new series a day, which is a quiet cardinality leak.",
          "**Late and out-of-order samples.** A flaky network delivers a batch 3 minutes late. The head block in memory can accept it, but a block already written to object storage is immutable. Accept out-of-order samples only inside a window (say 10 minutes) and reject older ones with a counted error, otherwise you must rewrite blocks.",
          "**Absent data is not zero.** If the agent dies, the series stops; a rule such as `errors > 5` never fires because there are no errors to compare. Add an alert on absence (no samples for 3 minutes) and a constant always-firing heartbeat alert that proves the whole alert path, including the pager, still works."
        ),
      },
    ],
    after: [
      {
        title: "Trade-offs to discuss in the interview",
        body: p(
          "**Push or pull.** Pull (the server scrapes each target) makes it obvious when a target is down and keeps load under the server's control, but needs service discovery and cannot reach short-lived batch jobs. Push (agents send) works through firewalls and for short jobs, but a bug can flood the gateway. Many real systems pull for long-lived services and push for batch jobs through a small gateway.",
          "**Retention against cost, with numbers.** Raw samples at 10 seconds cost about 120 GB a day after compression (1,000,000 samples a second x 86,400 s x 1.4 bytes). Keeping 15 days raw is 1.8 TB. A 1-minute rollup keeps one sixth of the points: 20 GB a day, so 13 months is about 8 TB. A 1-hour rollup is 360 times smaller than raw: about 0.33 GB a day, so two years is roughly 240 GB. Tiered retention costs a few percent of keeping everything raw, and the price is that old graphs lose spikes. Store min, max, sum and count in each rollup so a spike still shows as a max.",
          "**Cardinality limits against freedom.** A hard cap per tenant (for example 1 million active series) protects the cluster but rejects a team's data at the worst time. The usual compromise is a soft warning at 80 percent, a per-metric view of the top label offenders, and a rule that identifiers such as user ids never become labels; they belong in logs or traces.",
          "**Evaluate alerts on a stream or by querying.** Querying stored data every 30 seconds is simple and reuses the query engine, but adds up to a half minute of delay and fails if the query layer is down. Streaming evaluation is faster and isolated, but you now maintain a second engine. State which you choose and what the alert latency target is (for paging, usually under a minute end to end)."
        ),
      },
    ],
    architecture: [
      { name: "Agents", role: "Run next to each service, scrape local counters and send batches of samples with labels.", scale: "10,000 hosts x 1,000 series every 10 s is 1,000,000 samples a second in total, about 100 per host per second.", failure: "A dead agent means missing data, not zeros. An absence alert catches it. Agents buffer a few minutes on disk." },
      { name: "Ingestion gateway and queue", role: "Authenticate, validate and enforce series limits, then publish samples to a queue keyed by series hash.", scale: "Stateless gateways scale by adding instances. The queue absorbs bursts: 16 MB/s of raw samples is small for a log.", failure: "If the queue is down, gateways return errors and agents retry with backoff. A longer outage drops the oldest buffered data." },
      { name: "Ingesters", role: "Own a shard of series. Append to a write-ahead log and an in-memory head block, cut a block every 2 hours.", scale: "10,000 hosts x 1,000 series is 10 million active series: 1 million per ingester on 10 shards, and replication multiplies the memory by 2 or 3.", failure: "A crash loses memory but the WAL replays on restart. Replication factor 2 or 3 keeps queries answerable during replay." },
      { name: "Object storage and rollups", role: "Hold immutable compressed blocks and the 1 minute and 1 hour rollups.", scale: "About 120 GB a day raw, 20 GB a day at 1 minute, 0.33 GB a day at 1 hour.", failure: "Blocks are replicated by the store. A failed rollup job is rerun for the same range because it is idempotent." },
      { name: "Query layer and alert evaluator", role: "Fan out range queries to ingesters and blocks, merge, and run alert rules on a separate path.", scale: "Dashboards are bursty. Cap the series per query (for example 50,000) and cache panel results for 30 s.", failure: "A heavy query must not starve alerts: separate worker pools and a query timeout of around 30 s." },
    ],
    criteria: [
      { area: "Requirements and scale", strong: "States series count, scrape interval and retention, and derives 1,000,000 samples a second and about 120 GB a day compressed.", weak: "Says millions of metrics without the sampling rate or any storage figure." },
      { area: "Data model", strong: "Time series with labels, names cardinality as the main risk and says which labels are banned.", weak: "Stores each sample as a row in a relational table with a timestamp index." },
      { area: "Write and read paths", strong: "Separates a sequential write path (WAL, head block, immutable blocks) from range-query reads, with rollups for old data.", weak: "One database for both, with no thought for compaction or old data cost." },
      { area: "Alerting", strong: "Uses a for-duration, handles missing data, isolates the alert path from dashboards and mentions deduplication of notifications.", weak: "Fires on a single sample and treats alerting as a cron job on the dashboard database." },
      { area: "Failure and trade-offs", strong: "Covers ingester loss, a cardinality explosion, late samples and the push versus pull choice with a reason.", weak: "Mentions replication only and cannot say what happens when an ingester restarts." },
    ],
  },
  "sdd-kafka": {
    before: [
      {
        title: "Edge cases that break naive designs",
        body: p(
          "**A poison message.** One record that always throws in the consumer blocks its partition: the consumer retries forever and the lag behind it grows. Retry a few times with a delay, then publish the record, plus the error, to a **dead-letter topic** and move on. Alert on dead-letter volume, because it is the list of data you did not process.",
          "**Rebalances cause duplicates.** If a consumer commits its offset after processing, a crash between processing and committing means the next owner repeats up to a batch. That is **at-least-once** delivery, and the consumer must be idempotent (a unique event id with an insert that ignores duplicates). Committing before processing gives at-most-once and can lose records. A consumer that takes longer than its poll timeout between polls is also treated as dead and kicked out, which triggers a rebalance for the whole group; keep slow work out of the poll loop or lower the batch size.",
          "**A hot key.** If one customer produces 30 percent of the traffic and the key is the customer id, one partition carries 30 percent of 1 GB/s, which is 300 MB/s, more than one disk and one consumer can take. Fixes: a compound key that spreads the customer over a few sub-keys (you lose strict order across the sub-keys), or a separate topic for the giant tenant.",
          "**Changing the partition count.** The partition for a key is hash(key) modulo the count, so adding partitions moves keys: records for one key can land on two partitions around the change and per-key order breaks briefly. Partitions can be added but never removed. Plan a count with headroom, and drain consumers before changing it for order-sensitive topics.",
          "**Large records.** Brokers cap a record near 1 MB by default and large records hurt batching. Put the file in object storage and send a small record with the location (the claim-check pattern).",
          "**Unclean leader election.** If every in-sync replica of a partition is gone, you can wait for one to return (consistent, unavailable) or promote an out-of-sync replica (available, loses the records it never had). For payments choose to wait; for click logs availability is usually better."
        ),
      },
    ],
    after: [
      {
        title: "Trade-offs to discuss in the interview",
        body: p(
          "**How many partitions.** Partitions are the unit of parallelism: a consumer group can have at most one active consumer per partition. If one partition handles about 10 MB/s of producer traffic comfortably and you need 1 GB/s, you need at least 100 partitions; choose 120 or 200 for headroom. Each partition costs file handles, memory and replication work: 200 partitions x 3 replicas is 600 replicas, or 23 per broker on 26 brokers, which is fine. A cluster with 200,000 partitions is not, because a controller failover has to rebuild state for all of them, so keep the total in the tens of thousands per cluster.",
          "**Durability against latency.** With replication factor 3, `acks=all` and `min.insync.replicas=2`, a write is acknowledged only after two copies exist, so one broker can die with no loss and the cost is an extra network hop (a few milliseconds). `acks=1` is faster but loses acknowledged records if the leader dies before followers copy them. Say which topics get which setting.",
          "**Delivery guarantees.** At-least-once with idempotent consumers is the common and cheap answer. Exactly-once inside Kafka (idempotent producer plus transactions) works for read-process-write to Kafka topics and costs some throughput; it does not make an external side effect, such as sending an email, happen once.",
          "**Log or queue.** A log keeps data for a retention period and lets many independent groups replay it. A traditional queue deletes on acknowledgement, gives per-message routing and visibility timeouts, and is simpler when you want a work list. Pick the log for event streams, fan-out and replay, and a queue for a simple job list where ordering and replay do not matter.",
          "**Retention and compression.** Seven days at 1 GB/s is 86 TB per copy. Compressing batches with lz4 or zstd typically cuts text-like data by 2 to 4 times for a small CPU cost, which can bring the 26-broker retention estimate down to roughly 7 to 13. Longer retention is cheap only on tiered storage, so say when you would move old segments to object storage."
        ),
      },
    ],
    architecture: [
      { name: "Producers", role: "Batch records, pick a partition by key hash and send to that partition's leader.", scale: "Batching 1 KB records into 64 KB batches turns 1,000,000 messages a second into about 16,000 requests a second.", failure: "On a timeout they retry. The idempotent producer setting prevents the retry from writing a duplicate." },
      { name: "Brokers and partitions", role: "Store each partition as a segmented append-only log and serve reads and writes for the partitions they lead.", scale: "About 10 MB/s per partition and 100 to 200 MB/s per broker; 1 GB/s needs 10 brokers for throughput, 26 for 7-day retention.", failure: "A broker loss moves the leadership of its partitions to in-sync followers in seconds. Under-replicated partitions are the metric to watch." },
      { name: "Replication", role: "Followers copy the leader's log. The in-sync set decides which replicas can become leader.", scale: "Replication factor 3 triples network and disk write: 1 GB/s in is 3 GB/s written.", failure: "If in-sync replicas fall below min.insync.replicas, producers with acks=all get errors instead of silent data loss." },
      { name: "Consumer groups", role: "Share a topic's partitions among consumers; each consumer commits its own offset.", scale: "Up to one active consumer per partition. 120 partitions allow 120 parallel consumers.", failure: "A dead consumer is detected by missed heartbeats and its partitions are reassigned. Work since the last commit is repeated." },
      { name: "Coordination and controller", role: "Track cluster membership, topic metadata and leader elections.", scale: "Metadata for tens of thousands of partitions fits in memory; the limit is failover time.", failure: "The controller role moves to another broker. Metadata is replicated, so a quorum loss stops topic changes but not reads and writes on healthy partitions." },
    ],
    criteria: [
      { area: "Why a log", strong: "Explains decoupling, buffering, replay and sequential I/O as the reason for the throughput.", weak: "Calls it a faster message queue without saying what is different." },
      { area: "Capacity arithmetic", strong: "Derives 1 GB/s in, 3 GB/s with replication, 86 TB a week and a broker count from both throughput and retention.", weak: "Names a broker count with no derivation or only counts throughput." },
      { area: "Partitions and ordering", strong: "Ordering only within a partition, key choice, hot keys, and the cost of changing the partition count.", weak: "Promises total order across a topic." },
      { area: "Delivery guarantees", strong: "Explains offset commit placement, at-least-once with idempotent consumers and the limit of exactly-once.", weak: "Says exactly-once and stops." },
      { area: "Failure handling", strong: "Covers leader failover, min in-sync replicas, poison messages, consumer lag and unclean election as a stated choice.", weak: "Only says replicas keep the data safe." },
    ],
  },
  "sdd-recommendations": {
    before: [
      {
        title: "Edge cases that break naive designs",
        body: p(
          "**Already seen or bought.** A recommender that suggests the film you watched yesterday looks broken. Filter items the user has consumed, using a compact structure such as a bloom filter or a per-user set kept in the feature store. The exception is repeat-purchase goods (coffee, nappies), where the right answer is to re-recommend at the expected interval.",
          "**Position bias in the logs.** The item shown first gets more clicks because it is first, not only because it is good. If you train only on clicks, the model learns to repeat today's ranking, and the loop reinforces itself. Mitigations: log the position, include it as a feature during training and fix it at serving time; randomise a small slice of traffic (1 to 5 percent) so you learn about items that would never be shown; and weight examples by the inverse of how likely they were to be shown.",
          "**Training-serving skew.** If the offline job computes average watch time over 30 days with one piece of code and the online service computes it over 28 days with another, the model sees different numbers in production and quietly gets worse. Define each feature once and use the same definition for both, which is the job of a feature store.",
          "**Delayed labels.** A click is known in seconds, a purchase in days, a return in weeks. Train on the labels you have and give the training job a cut-off, so that recent examples with no purchase yet are not wrongly counted as negatives.",
          "**Fraud and bots.** A script that views one item 100,000 times can raise its similarity to everything. Cap the weight of one user per item, drop sessions with inhuman rates and look at unique users rather than raw events.",
          "**Diversity and deletion.** Ten near-identical items waste the slate; re-rank with a penalty for similarity to items already chosen. When a user deletes their data, remove their events from the data lake, the feature store and the training sets for the next run, and say how long that takes."
        ),
      },
    ],
    after: [
      {
        title: "Trade-offs to discuss in the interview",
        body: p(
          "**Precompute or compute at request time.** Precomputing 20 item ids for each of 100 million users is 100,000,000 x 20 x 8 bytes = 16 GB, which fits in a key-value store and makes the read a single lookup of a few milliseconds. The cost is staleness (the lists were built hours ago) and wasted work on users who never return. Computing on request gives fresh results and uses the latest session, at the price of the 200 ms budget. A common split: precompute for the home page of all users nightly, and re-rank online for active users using the last few actions.",
          "**Memory for the candidate index.** An approximate nearest-neighbour index over 10 million item embeddings of 128 numbers is 10,000,000 x 128 x 4 bytes = 5.1 GB as 32-bit floats and about 1.3 GB when quantised to 8 bits, so one or two machines hold it, replicated for traffic. Say the trade: quantising saves 4 times the memory and costs a little recall.",
          "**Latency budget.** For 200 ms end to end, a plausible split is 20 ms candidate retrieval, 40 ms to fetch features for 500 candidates, 50 ms ranking, 20 ms rules and diversity, and the rest for network and a safety margin. If a stage is late, degrade: return candidates without the ranker, or return the cached list.",
          "**Offline against online evaluation.** Offline metrics such as recall at 20 and NDCG let you compare models quickly on logged data but are biased by what was shown. The real decision is an A/B test on a business metric (watch time, purchases) with enough traffic to reach significance, plus guardrail metrics such as complaints and latency. A model that wins offline and loses online is common.",
          "**Exploration and simplicity.** Showing only the highest predicted item never tests the rest; reserving 5 percent of slots for exploration costs a little today to avoid a stale model later. And a simpler model that ships in a week, with popularity and item-to-item similarity, often beats a complex one that never reaches production."
        ),
      },
    ],
    architecture: [
      { name: "Event pipeline", role: "Collect views, clicks, purchases and watch time through a queue into a data lake and a stream processor.", scale: "100 million users x 20 events a day is 2 billion events a day, about 23,000 a second on average.", failure: "Events are buffered in the queue. A gap loses training data for a period but does not stop serving." },
      { name: "Feature store", role: "Serves user and item features online (milliseconds) and the same definitions offline for training.", scale: "100 million users x 1 KB of features is 100 GB, held in memory-backed key-value storage.", failure: "If it is slow, rank with a reduced feature set or fall back to the precomputed list." },
      { name: "Candidate generation", role: "Narrow 10 million items to a few hundred using item similarity, embeddings and popularity.", scale: "An approximate nearest-neighbour index of 10 million x 128 floats is about 5 GB, 1.3 GB quantised.", failure: "A stale index shows old items; a failed one falls back to popular items per region and category." },
      { name: "Ranker", role: "Scores the few hundred candidates with a learned model and the user's context.", scale: "500 candidates at 0.1 ms each is 50 ms. Batch the scoring.", failure: "On timeout, return candidates ordered by retrieval score and count the degraded response." },
      { name: "Re-ranking rules", role: "Filter seen items, enforce diversity, stock and policy limits, and mix in exploration.", scale: "Cheap list operations, a few milliseconds.", failure: "A rule bug can empty the list, so keep a hard fallback list and alert when the average result size drops." },
    ],
    criteria: [
      { area: "Funnel thinking", strong: "Explains why you cannot score every item and builds candidates then ranker then rules, with a latency budget.", weak: "Puts one model in front of the whole catalogue." },
      { area: "Data and features", strong: "Names interaction events, content features and a feature store that avoids training-serving skew.", weak: "Says the model learns from the data without describing the data." },
      { area: "Cold start", strong: "Handles new users and items with popularity, content features and exploration slots.", weak: "Ignores users and items with no history." },
      { area: "Feedback and bias", strong: "Mentions position bias, feedback loops and an exploration slice, and measures with an A/B test.", weak: "Judges the model by offline accuracy only." },
      { area: "Failure and degradation", strong: "States a fallback at every stage and how serving continues if the ranker or the feature store is slow.", weak: "Has no answer for a slow or failed model." },
    ],
  },
};
