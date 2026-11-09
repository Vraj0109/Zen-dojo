import type { LldDeep, LldExtra, LldGuide } from "./types";

// Batch F LLD walkthroughs, guides, extras, and diagrams (plan 0025).
// No backticks or dollar-brace in text. Quoted Mermaid node labels.

// =====================================================================
// 1. Pub-Sub / Distributed Message Queue
// =====================================================================

export const PUBSUB_GUIDE: LldGuide = {
  requirements: [
    "Topics partitioned into append-only message logs with monotonic 64-bit offsets.",
    "Producers publish messages with optional keys; partitioning strategy selects target partition (key-hash or round-robin).",
    "Consumers belong to Consumer Groups; partitions of subscribed topics are evenly distributed among active group members.",
    "Offset management: group commits offsets per partition, supporting at-least-once processing, commitSync, and manual seek.",
    "Dynamic rebalancing: when consumers join or leave a group, partition assignments are recalculated automatically.",
    "Thread-safe architecture: independent concurrent reading and writing without cross-partition lock contention.",
  ],
  entities: [
    "MessageBroker (central coordinator managing topics, coordinators, and offset manager)",
    "Topic (collection of ordered Partitions with an assigned PartitionStrategy)",
    "Partition (append-only log of Messages with monotonic offsets, lock, and condition variable)",
    "Message and RecordMetadata (payload, key, offset, timestamp)",
    "ConsumerGroupCoordinator (tracks group membership, generation IDs, and partition assignments)",
    "Consumer and Producer (client interfaces for polling and publishing)",
    "OffsetManager (stores committed offsets per group and partition)",
  ],
  patterns: [
    "Partition Strategy pattern for key-hash vs round-robin routing",
    "Log-Structured Append-Only storage for immutable, reproducible message streams",
    "Coordinator pattern for group membership management and rebalance protocol",
    "Condition-based blocking poll for efficient low-latency notification",
  ],
  code: `final class Partition {
    private final List<Message> messages = new ArrayList<>();
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition hasData = lock.newCondition();

    RecordMetadata append(String key, String payload, long timestamp) {
        lock.lock();
        try {
            long offset = messages.size();
            messages.add(new Message(offset, key, payload, timestamp));
            hasData.signalAll();
            return new RecordMetadata(topic, partitionId, offset, timestamp);
        } finally {
            lock.unlock();
        }
    }
}`,
  extensions: [
    "Log compaction: retain only the latest message per key for state-store changelog topics.",
    "Segment-based disk storage with memory-mapped files and index files for fast offset lookup.",
    "Heartbeat mechanism and session timeouts for automatic failure detection of dead consumers.",
    "Transactional messaging: atomic multi-partition writes with commit markers.",
  ],
};

export const PUBSUB_EXTRA: LldExtra = {
  recap: [
    "A Topic is divided into multiple Partitions, each an independent append-only log with strictly monotonic offsets.",
    "Producers use a PartitionStrategy: KeyHashPartitioner hashes message keys to pin related records to one partition; RoundRobin distributes evenly.",
    "Within a Consumer Group, each partition is assigned to exactly one consumer, guaranteeing ordered processing per partition while scaling horizontally across partitions.",
    "OffsetManager stores committed offsets per group and partition, enabling crash recovery, at-least-once delivery, and seek replay.",
  ],
  flow: [
    "Producer publishes an order message with key 'cust-100' to topic 'orders'.",
    "KeyHashPartitioner hashes 'cust-100' modulo partition count (3) to select Partition 1.",
    "Partition 1 locks, assigns next monotonic offset, appends message, signals awaiting consumers, and returns RecordMetadata.",
    "Consumer 1 in group 'order-workers' polls its assigned Partition 1, retrieves records, and advances its local fetch position.",
    "After successful processing, Consumer 1 calls commitSync, storing the new committed offset in OffsetManager.",
    "When a new Consumer 2 joins the group, ConsumerGroupCoordinator triggers a rebalance and reallocates partitions evenly.",
  ],
  edgeCases: [
    "More consumers than partitions: extra consumers remain idle without assigned partitions until a consumer leaves.",
    "Consumer crash during processing: uncommitted offsets are re-read by the newly assigned consumer upon rebalance.",
    "Null message keys: automatically fall back to round-robin partition assignment for uniform distribution.",
    "Manual seek past log end or before earliest offset: clamped safely to partition bounds.",
    "Multiple independent consumer groups: each maintains separate committed offsets without interference.",
  ],
};

const PUBSUB_WALKTHROUGH = [
  {
    "title": "1. Architecture and design principles",
    "body": "An in-memory publish-subscribe message queue is a foundational distributed systems pattern designed to decouple message producers from message consumers while maintaining high throughput and strict ordering guarantees. Rather than following a transient queue model like traditional AMQP brokers where messages vanish immediately once acknowledged by any single listener, a log-centric design stores messages as an append-only sequence of immutable records. Each message is tagged with an immutable 64-bit monotonic offset. This architectural choice enables multiple consumers to read the stream at their own independent rates, rewind to earlier offsets for auditing, debugging, or state rebuilding, and scale horizontally by partitioning topics across multiple worker threads or physical nodes. In this project, we implement an in-memory streaming broker featuring topics, multi-partition logs, deterministic key-based partitioning, consumer groups with automatic partition rebalancing, offset tracking with synchronous commits, and thread-safe concurrent producer and consumer operations."
  },
  {
    "title": "2. Data modeling: Topics, Partitions, and Offsets",
    "body": "The core data model is structured hierarchically to mirror real-world distributed streaming platforms. A Topic represents a logical stream identified by a unique name (such as 'orders', 'payments', or 'telemetry'). To allow concurrent ingestion and consumption beyond what a single global lock could handle, each topic is divided into one or more Partitions. A Partition is an independent, ordered, append-only log of messages. The TopicPartition record couples a topic name with an integer partition index, serving as the canonical coordination key across the broker. When a message is appended to a partition, it receives the current base offset plus the internal list size as its unique monotonic offset. Because messages are stored in an array-backed list, offset lookups are exact O(1) random-access operations. Once assigned, an offset never changes, and messages are never deleted during normal processing, guaranteeing that consumers have a reproducible, deterministic view of the event stream regardless of when they poll."
  },
  {
    "title": "3. Partitioning strategies: Key-hash and Round-robin",
    "body": "Message distribution across partitions is governed by the PartitionStrategy interface. When an order, payment, or telemetry event is published, the producer determines which partition receives the record. If per-entity ordering is required—for instance, all actions for a specific customer or bank account must be processed in the exact order they occurred—a KeyHashPartitioner is utilized. It computes the hash code of the message key, applies bit-mixing to distribute high and low bits to avoid clustering with sequential string keys, and computes the non-negative modulo against the partition count. All messages sharing the same non-null key are guaranteed to land on the identical partition and thus be processed sequentially by the single consumer assigned to that partition. Conversely, if the key is null or if maximum throughput without key ordering is preferred, the RoundRobinPartitioner distributes successive messages sequentially across all available partitions using an atomic counter."
  },
  {
    "title": "4. Consumer Groups and Partition Rebalancing",
    "body": "Scaling consumer throughput requires distributing work across multiple consumer instances without message duplication. A Consumer Group provides horizontal scaling by dividing the partitions of subscribed topics among all active members in the group. The rule is strict: each partition is assigned to at most one consumer in a given group, preventing duplicate processing while ensuring parallel execution across different partitions. The ConsumerGroupCoordinator manages group membership. When a consumer registers by subscribing to topics or deregisters upon shutdown, the coordinator increments a generation ID and rebalances partition assignments. Partitions are sorted and assigned round-robin or by range across the active members. If there are 4 partitions and 2 consumers, each gets 2 partitions; if a 3rd consumer joins, assignments redistribute so each gets at least one partition; if consumers exceed partitions, surplus members stay idle until active members leave."
  },
  {
    "title": "5. Offset management and delivery semantics",
    "body": "Consumers maintain a local fetch position for each assigned partition, indicating the offset of the next message to read. During poll, the consumer reads messages from its fetch position up to the requested batch size and advances its internal position. However, local position alone does not protect against consumer crashes. The OffsetManager provides persistent offset tracking by storing the committed offset per group and TopicPartition. When a consumer invokes commitSync, its current fetch positions are committed to the OffsetManager. If that consumer crashes and a rebalance assigns its partition to a different worker, the new worker queries the OffsetManager and resumes execution precisely from the last committed offset. This architecture supports at-least-once delivery (commit after processing), at-most-once delivery (commit before processing), and manual rewind via seek for event replay."
  },
  {
    "title": "6. Concurrency, thread safety, and flow control",
    "body": "Concurrency in the broker is designed around fine-grained locking to eliminate single-point bottlenecks. Each Partition possesses its own ReentrantLock and Condition variable (hasData). Producers publishing to Partition 0 never block or contend with producers publishing to Partition 1. When a consumer polls an empty partition, it waits on the condition variable with a specified timeout using awaitNanos, waking immediately when a producer appends new records without burning CPU cycles in busy loops. The OffsetManager relies on ConcurrentHashMap to allow lock-free concurrent commits across different consumer groups. Group rebalancing inside ConsumerGroupCoordinator is protected by a dedicated reentrant lock, ensuring that partition assignment calculations are atomic and visible across all member threads."
  },
  {
    "title": "7. Production extensions and real-world considerations",
    "body": "In production distributed brokers such as Apache Kafka or Apache Pulsar, several extensions build on this foundation. Log retention policies evict older segments based on total retention time (e.g. 7 days) or partition disk quotas. Log compaction retains only the most recent record for each key, creating a durable key-value changelog for state recovery. Network transport uses zero-copy transfer (Java NIO FileChannel.transferTo) to pipe bytes directly from kernel page cache to network sockets. Finally, consumer heartbeats and dead-man switches detect unresponsive consumers and automatically trigger rebalances without requiring explicit close notifications, while dead-letter queues (DLQ) capture malformed poison-pill payloads that repeatedly fail processing."
  },
  {
    "title": "8. Testing and validation strategies for distributed messaging",
    "body": "Testing a concurrent message broker demands comprehensive verification across both functional correctness and race condition resilience. Unit tests verify basic log mechanics: offset monotonicity, zero-indexed start offsets, and out-of-bounds boundary handling. Partition strategy tests confirm that identical keys route deterministically to the same partition while null keys cycle uniformly across all available partitions. Multi-threaded concurrency tests validate broker integrity under intense write pressure: launching eight worker threads that concurrently publish hundreds of records to the same topic confirms that offsets remain strictly sequential without gaps, lost updates, or duplicate sequence IDs. Finally, consumer group tests verify rebalancing behavior dynamically, checking that when a second consumer joins an existing group, partition ownership redistributes cleanly without dropping or duplicating pending uncommitted messages."
  }
];

const PUBSUB_CLASS_DIAGRAM = `classDiagram
  class MessageBroker {
    -Map~String, Topic~ topics
    -Map~String, ConsumerGroupCoordinator~ coordinators
    -OffsetManager offsetManager
    +createTopic(String, int, PartitionStrategy) Topic
    +getTopic(String) Topic
    +createProducer() Producer
    +createConsumer(String, String) Consumer
  }
  class Topic {
    -String name
    -List~Partition~ partitions
    -PartitionStrategy strategy
    +publish(String, String, long) RecordMetadata
    +partition(int) Partition
  }
  class Partition {
    -String topic
    -int partitionId
    -List~Message~ messages
    -ReentrantLock lock
    -Condition hasData
    +append(String, String, long) RecordMetadata
    +poll(long, int, long) List~Message~
    +nextOffset() long
  }
  class ConsumerGroupCoordinator {
    -String groupId
    -Map~String, Set~String~~ memberSubscriptions
    -Map~String, Set~TopicPartition~~ memberAssignments
    +register(String, Set~String~) void
    +deregister(String) void
    +getAssignments(String) Set~TopicPartition~
  }
  class Consumer {
    -String groupId
    -String memberId
    -Map~TopicPartition, Long~ fetchPositions
    +subscribe(Set~String~) void
    +poll(long, int) List~ConsumerRecord~
    +commitSync() void
    +seek(TopicPartition, long) void
  }
  class Producer {
    +send(String, String, String) RecordMetadata
    +sendToPartition(String, int, String, String) RecordMetadata
  }
  class OffsetManager {
    -Map committedOffsets
    +commit(String, TopicPartition, long) void
    +getCommitted(String, TopicPartition) OptionalLong
  }
  MessageBroker --> Topic
  Topic --> Partition
  MessageBroker --> ConsumerGroupCoordinator
  Consumer --> ConsumerGroupCoordinator
  Consumer --> OffsetManager
  Producer --> Topic`;

const PUBSUB_SEQUENCE_DIAGRAM = `sequenceDiagram
  autonumber
  actor P as Producer
  participant B as Broker
  participant T as Topic
  participant Part as Partition
  actor C as Consumer
  participant Coord as Coordinator
  participant OM as OffsetManager

  C->>Coord: register(memberId, ["orders"])
  Coord-->>C: assigned [orders-0, orders-1]
  P->>B: createProducer()
  P->>T: publish("cust-1", "payload")
  T->>Part: append(key, payload)
  Part-->>P: RecordMetadata(offset=0)
  C->>Part: poll(offset=0, max=10)
  Part-->>C: List of records
  Note over C: Process records
  C->>OM: commitSync(offset=1)
  OM-->>C: Offset saved`;

export const LLD_DEEP_F_PUBSUB: LldDeep = {
  walkthrough: PUBSUB_WALKTHROUGH,
  classDiagram: PUBSUB_CLASS_DIAGRAM,
  sequenceDiagram: PUBSUB_SEQUENCE_DIAGRAM,
  stateDiagram: `stateDiagram-v2
    [*] --> STABLE: Consumer joins
    STABLE --> REBALANCING: Member joins or leaves
    REBALANCING --> ASSIGNING: Coordinator recalculates partitions
    ASSIGNING --> STABLE: Partitions allocated
    STABLE --> [*]: Group shutdown`,
  extraDiagrams: [
    {
      title: "Partition assignment across group members",
      source: `flowchart TD
        T["Topic: orders (4 partitions)"] --> P0["Partition 0"]
        T --> P1["Partition 1"]
        T --> P2["Partition 2"]
        T --> P3["Partition 3"]
        P0 --> C1["Consumer 1"]
        P1 --> C1
        P2 --> C2["Consumer 2"]
        P3 --> C2`,
    },
  ],
  concurrency: [
    "Lock per Partition: Appends and reads acquire a partition-specific ReentrantLock, ensuring concurrent writes to different partitions never contend.",
    "Condition Variables: Consumer poll uses hasData.awaitNanos to block without CPU spinning, waking up immediately on append signal.",
    "ConcurrentHashMap: OffsetManager and topic registries use lock-free concurrent maps for low-latency thread-safe lookups.",
    "Atomic offset allocation: Monotonic offset sequencing is guaranteed by holding the partition lock during offset calculation and list insertion.",
  ],
};

// =====================================================================
// 2. Stock Exchange Order Book / Matching Engine
// =====================================================================

export const ORDERBOOK_GUIDE: LldGuide = {
  requirements: [
    "Maintain limit and market orders for financial instruments with BUY and SELL sides.",
    "Price-time priority matching algorithm: best price executed first; equal prices executed in FIFO order.",
    "Execute trades at resting maker price; support partial fills and multi-level book sweeps.",
    "Order cancellation: cancel resting orders in O(1) time and update book depth accordingly.",
    "Real-time Level 2 Market Depth: aggregate quantity and order count per price level.",
    "Thread-safe matching engine supporting high-throughput concurrent order placement and matching.",
  ],
  entities: [
    "MatchingEngine (manages OrderBooks per symbol and order routing)",
    "OrderBook (holds bid and ask price trees, order index, and matching engine logic)",
    "PriceLevel (FIFO queue of resting orders at a specific price with aggregate volume)",
    "Order (id, symbol, side, type, price, initialQty, remainingQty, status)",
    "Trade (immutable record of matched maker and taker orders, price, and traded quantity)",
    "MatchResult (order outcome, list of generated trades, final order status)",
    "Level2Entry (market depth snapshot per price level)",
  ],
  patterns: [
    "Red-Black Tree (TreeMap) + FIFO Queue for composite Price-Time priority index",
    "Continuous Double Auction matching algorithm",
    "Command-query separation for order placement versus depth queries",
    "Value Object / Record for immutable Trade execution tickets",
  ],
  code: `final class OrderBook {
    private final TreeMap<Long, PriceLevel> bids = new TreeMap<>(Comparator.reverseOrder());
    private final TreeMap<Long, PriceLevel> asks = new TreeMap<>();

    private void matchBuy(Order buy, List<Trade> trades) {
        while (buy.remainingQty() > 0 && !asks.isEmpty()) {
            Map.Entry<Long, PriceLevel> bestAsk = asks.firstEntry();
            if (buy.type() == OrderType.LIMIT && bestAsk.getKey() > buy.price()) break;
            PriceLevel level = bestAsk.getValue();
            while (buy.remainingQty() > 0 && !level.isEmpty()) {
                Order sell = level.peekOrder();
                long qty = Math.min(buy.remainingQty(), sell.remainingQty());
                buy.fill(qty); sell.fill(qty);
                level.onOrderFilled(sell, qty);
                trades.add(new Trade("TRD-1", symbol, buy.id(), sell.id(), sell.price(), qty, now, Side.BUY));
            }
            if (level.isEmpty()) asks.pollFirstEntry();
        }
    }
}`,
  extensions: [
    "Stop-loss and Stop-limit conditional trigger orders evaluated on trade price ticks.",
    "Iceberg orders: display only a small fraction of large volume to hide institutional market impact.",
    "Time-in-force policies: Immediate-Or-Cancel (IOC) and Fill-Or-Kill (FOK).",
    "Lock-free single-writer ring buffer architecture (LMAX Disruptor pattern) for sub-microsecond matching.",
  ],
};

export const ORDERBOOK_EXTRA: LldExtra = {
  recap: [
    "Bids are stored in a TreeMap sorted in reverse order (highest price first); Asks are stored in natural order (lowest price first).",
    "At every price level, orders sit in an ArrayDeque to enforce strict FIFO time priority.",
    "Trades execute at the resting maker order price, rewarding liquidity providers.",
    "Limit orders that do not match immediately rest on the book; market orders sweep available liquidity and cancel any unfilled remainder.",
  ],
  flow: [
    "Incoming LIMIT BUY for 100 shares @ $151.50 arrives at the OrderBook.",
    "OrderBook checks asks: best ask is resting SELL of 80 shares @ $151.00.",
    "Price condition matches ($151.00 <= $151.50): trade executes for 80 shares at maker price $151.00.",
    "Resting SELL order is marked FILLED and removed from PriceLevel; PriceLevel is now empty and removed from asks tree.",
    "Incoming BUY order has 20 shares remaining; next ask is $152.00, which exceeds buy limit.",
    "Remaining 20 shares of BUY rest in the bids tree at price $151.50 as a new maker order.",
  ],
  edgeCases: [
    "Market order with zero liquidity: immediately cancelled without trade execution.",
    "Aggressive order sweeping multiple price levels in one transaction until fully filled.",
    "Cancelling partially filled order: remaining quantity is removed from level and status becomes CANCELLED.",
    "Cancel request for non-existent or already filled order: cleanly returns false.",
    "Crossing limit orders with exact price match: full fill of maker and taker.",
  ],
};

const ORDERBOOK_WALKTHROUGH = [
  {
    "title": "1. Exchange architecture and core requirements",
    "body": "A central limit order book (CLOB) is the computational core of electronic financial exchanges such as NASDAQ, CME, and crypto exchanges. It maintains all outstanding limit orders for a financial asset and continuously matches compatible buy (bid) and sell (ask) interests. Traders submit two primary order types: Limit Orders (specifying maximum price to buy or minimum price to sell) and Market Orders (demanding immediate execution at the best available prevailing prices). The matching engine must enforce three cardinal rules: Price Priority (better prices always match before worse prices), Time Priority (among identical prices, earlier submitted orders execute before later orders), and Maker Price Execution (trades match at the price of the resting maker order already sitting in the book). Additionally, the engine must support real-time Level 2 market depth views, partial fills, multi-level sweeps, maker-taker fee incentives, and instantaneous order cancellations."
  },
  {
    "title": "2. Price-time priority and composite data structures",
    "body": "Achieving ultra-low latency requires combining complementary data structures. If orders were kept in a flat list, finding the best bid or ask would require an O(n) scan, and sorting on each insertion would take O(n log n). Instead, we utilize a two-tier composite data structure: a Red-Black Tree (java.util.TreeMap) indexed by price, where each tree node contains a PriceLevel holding an ArrayDeque of orders. For the bid side, the TreeMap uses Comparator.reverseOrder() so that firstEntry() returns the highest bid in O(1) time. For the ask side, natural ascending order ensures firstEntry() returns the lowest ask in O(1). Within each PriceLevel, orders are queued in arrival order; new orders append to the tail, and executions pop from the head in strict O(1) FIFO order. A secondary HashMap indexed by order ID enables O(1) cancellation lookups and fast removal from the price queue."
  },
  {
    "title": "3. The continuous matching algorithm",
    "body": "When an incoming taker order arrives, the matching algorithm operates iteratively against the opposing book. For an incoming BUY order, it inspects the top ask. If the order is a LIMIT order and the ask price exceeds the buy limit price, no trade is possible and matching halts. If the prices cross (ask price <= buy price) or if the incoming order is a MARKET order, a trade is formed. The traded quantity is min(taker.remainingQty, maker.remainingQty). Both orders have their remaining quantities decremented, and the price level updates its total volume. A Trade execution record is emitted carrying the traded quantity, the maker price, and IDs of both counterparties. If the maker order is exhausted, it is popped from the queue. If the price level becomes empty, it is purged from the TreeMap. The loop repeats until the incoming order is fully filled or no matching prices remain."
  },
  {
    "title": "4. Maker vs Taker and post-match resting",
    "body": "A critical economic principle in market design is distinguishing between liquidity makers and liquidity takers. The maker is the passive counterparty whose order was already resting in the book, providing market depth and bearing inventory risk. The taker is the active incoming order that consumes liquidity immediately. The trade price is always set to the maker order price, granting price improvement to the aggressive taker. Exchanges incentivize makers with fee rebates while charging takers transaction fees. Once matching terminates, if the incoming taker order still possesses unfulfilled quantity, its handling depends on its type. A LIMIT order becomes a maker: it is inserted into the appropriate side's price tree at its specified limit price. A MARKET order, having exhausted all available liquidity within permissible bounds, has its remaining quantity immediately cancelled to avoid uncontrolled slippage and unexpected fills at unfavorable prices."
  },
  {
    "title": "5. Real-time Market Depth and Best Bid/Offer (BBO)",
    "body": "Market participants rely on Level 2 depth feeds to make trading decisions and evaluate market liquidity. Level 2 data summarizes the top N price levels on each side, aggregating total volume and number of resting orders rather than exposing individual order details. In our implementation, getBidDepth(maxLevels) and getAskDepth(maxLevels) traverse the respective tree entries and emit immutable Level2Entry records. The Best Bid and Offer (BBO) represents the tightest spread in the market: bestBid is bids.firstKey(), bestAsk is asks.firstKey(), and the spread is bestAsk - bestBid. When orders enter or exit the book, the BBO updates instantly, reflecting immediate shifts in supply and demand across the market and feeding algorithmic execution models."
  },
  {
    "title": "6. Order cancellation and lifecycle transitions",
    "body": "High-frequency trading environments experience cancellation rates exceeding 90% of submitted orders as market makers continuously adjust quotes. Efficient cancellation is therefore paramount. When cancelOrder(orderId) is called, the engine looks up the order in ordersById. If the order is already FILLED, CANCELLED, or REJECTED, the cancellation is rejected. If ALIVE, the order status transitions to CANCELLED, and the order is located in its corresponding PriceLevel. The price level removes the order and decrements its aggregate quantity. If that order was the sole occupant of the price level, the level is deleted from the TreeMap, preventing memory leaks and immediately shifting the BBO to the next best price without leaving orphan empty nodes."
  },
  {
    "title": "7. Concurrency and enterprise matching architectures",
    "body": "Our implementation uses a ReentrantLock guarding the OrderBook instance, serializing matching operations per instrument while allowing independent instruments ('AAPL', 'MSFT', 'GOOG') to execute concurrently on separate threads without interference. In high-performance institutional trading systems, matching engines often adopt a single-threaded execution model per symbol (such as the LMAX Disruptor architecture). In that model, orders enter a lock-free ring buffer backed by pre-allocated memory arrays, processed by a single pinned CPU core with no context switching or thread synchronization. By eliminating lock contention, CPU cache bouncing, and GC pauses, single-writer matching engines achieve deterministic latencies under 5 microseconds per trade, easily sustaining millions of orders per second."
  },
  {
    "title": "8. Market microstructure and risk controls",
    "body": "Production matching engines incorporate strict pre-trade and in-flight risk controls to prevent flash crashes and erratic algorithms from destabilizing the market. Pre-trade risk checks enforce maximum order notional limits, order size caps, and price collar validation (rejecting bids or asks that deviate by more than a configured percentage, e.g. 5%, from the prevailing midpoint price). Self-match prevention (SMP) detects when a firm's buy and sell orders would cross, cancelling the taker order or reducing maker quantity to prevent wash trading. Circuit breakers track extreme price volatility over rolling time windows, temporarily pausing trading or switching to a call-auction crossing phase until orderly market conditions are restored. Finally, audit logging ensures every order placement, trade, and cancellation is durably persisted for regulatory compliance and dispute resolution."
  }
];

const ORDERBOOK_CLASS_DIAGRAM = `classDiagram
  class MatchingEngine {
    -Map~String, OrderBook~ books
    +getOrCreateBook(String) OrderBook
    +submitLimitOrder(String, String, Side, long, long) MatchResult
    +submitMarketOrder(String, String, Side, long) MatchResult
    +cancelOrder(String, String) boolean
  }
  class OrderBook {
    -String symbol
    -TreeMap~Long, PriceLevel~ bids
    -TreeMap~Long, PriceLevel~ asks
    -Map~String, Order~ ordersById
    -ReentrantLock lock
    +processOrder(Order) MatchResult
    +cancelOrder(String) boolean
    +bestBid() Optional~Long~
    +bestAsk() Optional~Long~
    +spread() Optional~Long~
    +getBidDepth(int) List~Level2Entry~
    +getAskDepth(int) List~Level2Entry~
  }
  class PriceLevel {
    -long price
    -ArrayDeque~Order~ orders
    -long totalQuantity
    +addOrder(Order) void
    +peekOrder() Order
    +pollOrder() Order
    +removeOrder(String) boolean
  }
  class Order {
    -String id
    -Side side
    -OrderType type
    -long price
    -long initialQty
    -long remainingQty
    -OrderStatus status
    +fill(long) void
    +cancel() void
  }
  class Trade {
    -String tradeId
    -long price
    -long quantity
    -Side takerSide
  }
  MatchingEngine --> OrderBook
  OrderBook --> PriceLevel
  PriceLevel --> Order
  OrderBook --> Trade`;

const ORDERBOOK_SEQUENCE_DIAGRAM = `sequenceDiagram
  autonumber
  actor Trader
  participant Engine as MatchingEngine
  participant Book as OrderBook
  participant Asks as Asks TreeMap
  participant Level as PriceLevel

  Trader->>Engine: submitLimitOrder("AAPL", BUY, 15150, 100)
  Engine->>Book: processOrder(buyOrder)
  Book->>Asks: firstEntry()
  Asks-->>Book: bestAsk: 15100
  Book->>Level: peekOrder()
  Level-->>Book: restingSell (80 @ 15100)
  Note over Book: Match 80 @ 15100 (maker price)
  Book->>Level: onOrderFilled(80)
  Note over Book: 20 remaining, next ask > 15150
  Book->>Book: restOrder(buyOrder, 20 @ 15150)
  Book-->>Engine: MatchResult(trades: [80 @ 15100], remaining: 20)
  Engine-->>Trader: Order partially filled`;

export const LLD_DEEP_F_ORDERBOOK: LldDeep = {
  walkthrough: ORDERBOOK_WALKTHROUGH,
  classDiagram: ORDERBOOK_CLASS_DIAGRAM,
  sequenceDiagram: ORDERBOOK_SEQUENCE_DIAGRAM,
  stateDiagram: `stateDiagram-v2
    [*] --> NEW: Submitted
    NEW --> PARTIALLY_FILLED: Partial match
    PARTIALLY_FILLED --> FILLED: Remainder matched
    NEW --> FILLED: Full match
    NEW --> CANCELLED: Cancel request or unfilled market
    PARTIALLY_FILLED --> CANCELLED: Cancel remaining
    NEW --> REJECTED: Invalid parameters
    FILLED --> [*]
    CANCELLED --> [*]`,
  extraDiagrams: [
    {
      title: "Order Book Price-Time Queue Structure",
      source: `flowchart LR
        subgraph Asks [Asks: Ascending TreeMap]
          A1["$151.00 (80 qty)"] --> S1["Order s1: 80"]
          A2["$152.00 (120 qty)"] --> S2["Order s2: 120"]
        end
        subgraph Bids [Bids: Descending TreeMap]
          B1["$150.00 (100 qty)"] --> B11["Order b1: 100"]
          B2["$149.50 (50 qty)"] --> B21["Order b2: 50"]
        end`,
    },
  ],
  concurrency: [
    "Per-instrument locking: Each OrderBook synchronizes with its own ReentrantLock, allowing trades on different tickers to run fully parallel.",
    "Atomic matching loop: The complete matching cycle, trade emission, and resting insertion occur within the locked critical section.",
    "Lock-free reads: Depth and BBO queries acquire the book lock briefly, ensuring consistent Level 2 snapshots without torn state.",
    "Single-writer pattern: Engine easily adapts to an event-loop or Disruptor queue where a single core processes orders sequentially without locks.",
  ],
};

// =====================================================================
// 3. Text Editor with Undo/Redo
// =====================================================================

export const TEXT_EDITOR_GUIDE: LldGuide = {
  requirements: [
    "In-memory text document supporting insert, delete, replace, and backspace operations.",
    "Cursor navigation and selection management with normalized half-open intervals [start, end).",
    "Clipboard operations: copy, cut, and paste supporting single-point insertion and selection replacement.",
    "Full multi-level Undo and Redo implemented via the Command pattern.",
    "Typing coalescing: consecutive character typing coalesces into a single undoable step.",
    "Atomic multi-replacement (replaceAll) implemented via Composite MacroCommand.",
    "Memento pattern: create full state snapshots and restore document state reliably.",
  ],
  entities: [
    "TextEditor (facade coordinating document, history, and clipboard)",
    "TextDocument (internal text buffer, cursor position, selection range, and line/word metrics)",
    "Command interface (execute, undo, redo, canMergeWith, mergeWith)",
    "InsertCommand, DeleteCommand, ReplaceCommand (concrete reversible operations)",
    "MacroCommand (composite command executing and undoing an atomic list of sub-commands)",
    "HistoryManager (manages undo and redo stacks with bounded history capacity and coalescing)",
    "EditorMemento (immutable snapshot of text, cursor, selection, and timestamp)",
    "Clipboard and Selection (support value objects)",
  ],
  patterns: [
    "Command Pattern for encapsulating document mutations with exact inverse operations",
    "Memento Pattern for checkpoint snapshots and disaster recovery",
    "Composite Pattern (MacroCommand) for bundling batch edits into atomic undo units",
    "Facade Pattern (TextEditor) exposing clean editing APIs to callers",
  ],
  code: `final class InsertCommand implements Command {
    private final TextDocument document;
    private final int offset;
    private final StringBuilder text;
    private final Selection priorSelection;

    public void execute() { document.insert(offset, text.toString()); }
    public void undo() {
        document.delete(offset, offset + text.length());
        document.setSelection(priorSelection.start(), priorSelection.end());
    }
    public void redo() { document.insert(offset, text.toString()); }
    public boolean canMergeWith(Command next) {
        return (next instanceof InsertCommand o) && o.offset == offset + text.length();
    }
    public void mergeWith(Command next) { text.append(((InsertCommand) next).text); }
}`,
  extensions: [
    "Piece Table or Rope data structure for handling multi-gigabyte files with O(log n) insertions.",
    "Operational Transformation (OT) or CRDT (Conflict-free Replicated Data Types) for collaborative editing.",
    "Syntax highlighting lexer emitting token spans asynchronously.",
    "Persistent file serialization with atomic write and auto-save timer.",
  ],
};

export const TEXT_EDITOR_EXTRA: LldExtra = {
  recap: [
    "The Command pattern encapsulates mutations so each action knows how to execute, undo, and redo itself.",
    "Selection intervals are half-open [start, end); typing over a selection replaces it in one undoable step.",
    "MacroCommand groups multiple sub-commands into one composite command, ensuring operations like replaceAll undo atomically.",
    "HistoryManager bounds memory by evicting oldest commands from the bottom of the undo deque when max capacity is reached.",
  ],
  flow: [
    "User types 'cat sat on the mat'.",
    "User selects 'mat' (indices 15 to 18) and types 'rug'.",
    "TextEditor creates ReplaceCommand with range [15, 18), newText 'rug', and prior selection.",
    "ReplaceCommand executes: 'mat' is removed, 'rug' inserted, cursor placed at 18, and command pushed to undo stack.",
    "User presses Undo: ReplaceCommand.undo() replaces 'rug' with saved oldText 'mat' and restores selection to [15, 18).",
    "User presses Redo: ReplaceCommand.redo() re-applies 'rug' and clears redo stack on subsequent fresh edits.",
  ],
  edgeCases: [
    "Typing coalescing: sequential single-char typing merges into one command, undone in a single step.",
    "Bounded history eviction: when maxHistorySize is exceeded, oldest commands drop from bottom without error.",
    "Empty selection cut/copy: no-op, preserving existing clipboard content.",
    "Find with no matches returns -1; replaceAll with no matches emits no commands.",
    "Undo on empty undo stack or redo on empty redo stack safely returns false.",
  ],
};

const TEXT_EDITOR_WALKTHROUGH = [
  {
    "title": "1. Core abstractions and architectural patterns",
    "body": "Designing a text editor requires balancing clean object-oriented encapsulation with memory efficiency, low latency, and robust state management. The user interacts through a straightforward mental model: typing characters, moving the cursor, highlighting text ranges, copying, cutting, pasting, and undoing mistakes. Beneath this surface lies an engine that must track exact character offsets, manage a clipboard, and coordinate an undo/redo history. To achieve this, we combine two classic design patterns from the Gang of Four: the Command Pattern and the Memento Pattern. The Command pattern treats every user action as an object possessing execute(), undo(), and redo() methods. The Memento pattern allows capturing and restoring complete document checkpoints. Together, they enable fine-grained, low-overhead incremental undo/redo alongside full-state snapshots for persistent backups or macro rollbacks. Decoupling the document model from the view ensures that multiple frontends (GUI, terminal CLI, web client) can render the editor without altering business logic."
  },
  {
    "title": "2. Document representation and selection mechanics",
    "body": "The TextDocument class encapsulates text storage and cursor state. Internally, a StringBuilder serves as the text buffer, supplemented by an integer cursor offset and a Selection record representing a half-open range [start, end). A point selection has start == end, representing a simple blinking caret. When start < end, a contiguous span of text is highlighted. Normalization in the Selection constructor guarantees start <= end, even if the user dragged backwards from right to left. When the user types while a selection is active, standard editor semantics dictate that the selected text is overwritten. The document provides synchronized primitives for insert, delete, replace, and substring extraction, alongside utility calculations for line count, word count, and character metrics. It also validates boundaries strictly, ensuring cursor offsets never exceed current text length and handling unicode code points consistently."
  },
  {
    "title": "3. Reversible actions with the Command pattern",
    "body": "Every document mutation is implemented as a Command. The InsertCommand records the insertion offset, the inserted string, and the prior selection. When executed, it inserts the text; when undone, it removes the exact character span [offset, offset + length) and restores the prior selection. The DeleteCommand records the deleted span and saves the removed text; upon undo, it re-inserts the saved text at the original position and restores the prior cursor and selection. The ReplaceCommand combines both aspects, recording both the old text and the new replacement text. By encapsulating prior state within each command instance, commands can be undone and redone indefinitely without needing full document copies for every keystroke, keeping memory footprint minimal while preserving exact cursor and highlight contexts across complex edit sequences."
  },
  {
    "title": "4. History manager and typing coalescing",
    "body": "The HistoryManager orchestrates the dual-stack architecture: an undoStack and a redoStack implemented via java.util.ArrayDeque. When a new command executes, it is pushed onto the undoStack and the redoStack is cleared. When undo is triggered, the command is popped, its undo() method is invoked, and it is pushed onto the redoStack. If a user types 20 characters in sequence, treating every keystroke as an isolated command would force them to press Undo 20 times. To solve this, our commands implement canMergeWith() and mergeWith(). Consecutive single-character insertions at adjacent offsets coalesce into a single composite InsertCommand, allowing the entire word or sentence to be undone in a single intuitive keystroke without cluttering history. Coalescing breaks naturally whenever non-character keys (Enter, arrow keys, backspace) or selection changes occur, maintaining fine-grained control."
  },
  {
    "title": "5. Bounded history and memory leak prevention",
    "body": "In a long-running editor session, an unbounded undo stack would retain references to gigabytes of deleted text, eventually triggering an OutOfMemoryError. The HistoryManager solves this by enforcing a configurable maxHistorySize. When the undo stack reaches capacity, the oldest command at the tail of the deque is silently evicted using removeLast(). This bounded buffer guarantees that memory consumption remains strictly constrained while still providing users with dozens or hundreds of levels of undo, preventing memory leaks in memory-constrained environments, browser embedded editors, and enterprise IDE setups."
  },
  {
    "title": "6. Composite commands and atomic batch operations",
    "body": "Certain editing operations modify multiple disparate regions of a document simultaneously. A prime example is replaceAll(target, replacement). If an occurrence of 'cat' appears 10 times in a file, we do not want 10 separate undo steps. The MacroCommand (an implementation of the Composite Pattern) holds a list of child commands. When replaceAll executes, it identifies all target matches from back to front (so earlier indices remain stable), creates a ReplaceCommand for each occurrence, and wraps them inside a single MacroCommand. When the user invokes undo, the MacroCommand iterates over its children in reverse order, undoing all 10 replacements as a single, atomic operation. This composite abstraction also enables scriptable macro recording, letting users record a sequence of keystrokes and replay them atomically across multiple documents."
  },
  {
    "title": "7. Checkpoints with the Memento pattern",
    "body": "While the Command pattern excels at incremental edits, certain operations benefit from snapshotting the entire state. For example, before running an external code formatter, loading a file, or compiling a build, the editor can invoke save() to create an EditorMemento. The memento is an immutable record capturing the full text, cursor offset, selection range, and a timestamp. If the user wishes to discard all modifications, restore(memento) replaces the buffer contents, restores the cursor and selection, and resets the undo history. This dual approach provides both surgical keystroke-level undo and reliable system checkpoints for disaster recovery, auto-saving, or branching alternative editing timelines in collaborative workflows."
  },
  {
    "title": "8. Performance optimizations and large-document handling",
    "body": "While a StringBuilder buffer provides clean, intuitive semantics for standard documents, scaling to multi-megabyte source files requires alternative data structures. A Gap Buffer keeps a movable gap of unallocated memory at the cursor position, allowing rapid localized typing in O(1) time while only requiring array copying when the cursor moves to a distant section. For massive files (hundreds of megabytes), a Piece Table stores original text in an immutable read-only buffer and all typed additions in an append-only add buffer, representing the document as an ordered tree of descriptors pointing into either buffer. Line break indexing via a binary search tree or B-tree maintains fast O(log n) translation between line numbers and character offsets, ensuring smooth viewport scrolling and instantaneous rendering even under high editing volumes. In addition, asynchronous syntax highlighting lexers can tokenize text off the UI thread, emitting styling spans without hitching the responsive typing experience, while memory-mapped file buffers allow opening multi-gigabyte logs instantly with zero initial load delay."
  }
];

const TEXT_EDITOR_CLASS_DIAGRAM = `classDiagram
  class TextEditor {
    -TextDocument document
    -HistoryManager history
    -Clipboard clipboard
    +insert(String) void
    +backspace() void
    +deleteForward() void
    +select(int, int) void
    +copy() void
    +cut() void
    +paste() void
    +undo() boolean
    +redo() boolean
    +replaceAll(String, String) int
    +save() EditorMemento
    +restore(EditorMemento) void
  }
  class TextDocument {
    -StringBuilder buffer
    -int cursor
    -Selection selection
    +insert(int, String) void
    +delete(int, int) String
    +replace(int, int, String) String
  }
  class Command {
    <<interface>>
    +execute() void
    +undo() void
    +redo() void
    +canMergeWith(Command) boolean
    +mergeWith(Command) void
  }
  class InsertCommand {
    -int offset
    -StringBuilder text
    -Selection priorSelection
  }
  class DeleteCommand {
    -int start
    -int end
    -String deletedText
  }
  class ReplaceCommand {
    -int start
    -int end
    -String newText
    -String oldText
  }
  class MacroCommand {
    -List~Command~ commands
  }
  class HistoryManager {
    -Deque~Command~ undoStack
    -Deque~Command~ redoStack
    -int maxHistorySize
    +execute(Command) void
    +undo() boolean
    +redo() boolean
  }
  Command <|.. InsertCommand
  Command <|.. DeleteCommand
  Command <|.. ReplaceCommand
  Command <|.. MacroCommand
  TextEditor --> TextDocument
  TextEditor --> HistoryManager
  HistoryManager --> Command`;

const TEXT_EDITOR_SEQUENCE_DIAGRAM = `sequenceDiagram
  autonumber
  actor User
  participant Editor as TextEditor
  participant Hist as HistoryManager
  participant Cmd as ReplaceCommand
  participant Doc as TextDocument

  User->>Editor: select(0, 5) + insert("Hi")
  Editor->>Cmd: create ReplaceCommand(0, 5, "Hi")
  Editor->>Hist: execute(cmd)
  Hist->>Cmd: execute()
  Cmd->>Doc: replace(0, 5, "Hi")
  Doc-->>Cmd: oldText: "Hello"
  Hist->>Hist: push to undoStack
  User->>Editor: undo()
  Editor->>Hist: undo()
  Hist->>Cmd: undo()
  Cmd->>Doc: replace(0, 2, "Hello")
  Cmd->>Doc: setSelection(0, 5)
  Hist->>Hist: push to redoStack`;

export const LLD_DEEP_F_TEXT_EDITOR: LldDeep = {
  walkthrough: TEXT_EDITOR_WALKTHROUGH,
  classDiagram: TEXT_EDITOR_CLASS_DIAGRAM,
  sequenceDiagram: TEXT_EDITOR_SEQUENCE_DIAGRAM,
  stateDiagram: `stateDiagram-v2
    [*] --> EMPTY: Document initialized
    EMPTY --> CAN_UNDO: Edit executed
    CAN_UNDO --> CAN_UNDO: Successive edits
    CAN_UNDO --> CAN_BOTH: Undo triggered
    CAN_BOTH --> CAN_UNDO: Redo executed
    CAN_BOTH --> CAN_UNDO: New edit clears redo stack
    CAN_BOTH --> CAN_REDO: Additional undos
    CAN_REDO --> EMPTY: All undos exhausted
    CAN_REDO --> CAN_UNDO: New edit clears redo stack`,
  extraDiagrams: [
    {
      title: "History Manager dual-stack transition",
      source: `flowchart LR
        subgraph UndoStack [Undo Stack]
          U1["Cmd 1: Insert 'Hello'"]
          U2["Cmd 2: Replace 'World'"]
        end
        subgraph RedoStack [Redo Stack]
          R1["Cmd 3: Cut 'Text'"]
        end
        U2 -- "undo()" --> R1
        R1 -- "redo()" --> U2`,
    },
  ],
  concurrency: [
    "Synchronized editor facade: All mutating methods on TextEditor synchronize on the instance, preventing race conditions during rapid editing.",
    "Internal thread safety: TextDocument and HistoryManager maintain synchronized internal state, guarding buffer offsets and history deques.",
    "Immutable snapshots: EditorMemento and Selection records are completely immutable, safely shared across background worker threads.",
    "Deterministic execution: Commands operate entirely on in-memory buffers without external locks, eliminating any possibility of deadlock.",
  ],
};

// =====================================================================
// 4. Distributed Job Scheduler
// =====================================================================

export const JOB_SCHEDULER_GUIDE: LldGuide = {
  requirements: [
    "Schedule and execute jobs with priorities (LOW, NORMAL, HIGH, CRITICAL) and execution states.",
    "Flexible triggers: OneShotTrigger for specific timestamps and FixedDelayTrigger for recurring intervals.",
    "Priority queue execution: tasks ordered primarily by scheduled time, secondarily by priority level, and tertiarily FIFO.",
    "Configurable retry policies: fixed and exponential backoff strategies with attempt caps and maximum delay ceilings.",
    "Comprehensive lifecycle observers (JobListener) and detailed execution history audit logging.",
    "Deterministic testing: fully injectable TimeSource enabling instant simulation of long delays without thread sleep.",
    "Pause, resume, and cancellation mechanics for scheduled tasks.",
  ],
  entities: [
    "JobScheduler (central scheduler managing queue, job registry, state tracking, and dispatch)",
    "Job (id, name, task Runnable, priority, trigger, retryPolicy)",
    "ScheduledTask (priority queue entry with scheduledTime, priority, attempt, sequenceId)",
    "Trigger (interface calculating nextExecutionTime)",
    "OneShotTrigger and FixedDelayTrigger (concrete triggers)",
    "RetryPolicy and BackoffStrategy (calculates delays per retry attempt)",
    "JobRun (immutable record of execution runId, timing, status, and error diagnostic)",
    "JobListener (observer interface for scheduling, start, success, failure, cancellation)",
    "TimeSource and ManualClock (injectable time provider)",
  ],
  patterns: [
    "Strategy Pattern for triggers and backoff calculation",
    "Observer Pattern for job lifecycle event notifications",
    "Priority Queue pattern for efficient O(log n) next-task retrieval",
    "Injectable Clock pattern for deterministic, zero-sleep unit testing",
  ],
  code: `final class JobScheduler {
    private final PriorityQueue<ScheduledTask> queue = new PriorityQueue<>();

    int dispatchReady(long now) {
        List<ScheduledTask> ready = new ArrayList<>();
        lock.lock();
        try {
            if (paused) return 0;
            while (!queue.isEmpty() && queue.peek().scheduledTime() <= now) {
                ready.add(queue.poll());
            }
        } finally { lock.unlock(); }
        for (ScheduledTask task : ready) executeTask(task, now);
        return ready.size();
    }
}`,
  extensions: [
    "Full 5-field Cron parser supporting step values, day-of-week, and timezone conversions.",
    "Distributed leader election with heartbeat leases (ZooKeeper / Raft) for active-passive scheduler HA.",
    "Persistent JDBC/Redis task store to survive scheduler restarts without lost executions.",
    "Misfire instruction policies (FIRE_NOW, IGNORE_MISFIRES) when tasks are delayed by node restarts.",
  ],
};

export const JOB_SCHEDULER_EXTRA: LldExtra = {
  recap: [
    "Tasks sit in a PriorityQueue sorted by scheduled time, then priority level (CRITICAL before LOW), then FIFO sequence.",
    "Triggers compute nextExecutionTime; recurring tasks re-enqueue automatically after successful completion.",
    "When a task throws an exception, RetryPolicy evaluates attempt count and calculates exponential backoff delay before re-enqueuing.",
    "ManualClock allows tests to advance milliseconds instantly without flaky Thread.sleep calls.",
  ],
  flow: [
    "User schedules job 'backup' for timestamp 10,000 with HIGH priority and exponential retry.",
    "Scheduler queries trigger for initial run time (10,000) and inserts ScheduledTask into PriorityQueue.",
    "Clock advances to 10,000; dispatchReady() polls the ready task and marks state RUNNING.",
    "Task runs and throws DatabaseException; scheduler catches failure and inspects RetryPolicy.",
    "Attempt 1 <= maxRetries (3); backoff delay of 1,000 ms is computed, and retry task is queued for 11,000.",
    "Clock advances to 11,000; retry attempt 2 runs, succeeds, records JobRun history, and marks job SUCCESS.",
  ],
  edgeCases: [
    "Two tasks scheduled at identical timestamp: higher priority runs first; same priority runs in FIFO order.",
    "Task failure exhausts all retries: transitions state to FAILED without further retry scheduling.",
    "Job cancelled while pending: removed from priority queue immediately; state set to CANCELLED.",
    "Scheduler paused: dispatchReady() returns 0 without running any tasks until resume() is invoked.",
    "Clock advances past multiple intervals: all overdue tasks are dispatched in correct priority sequence.",
  ],
};

const JOB_SCHEDULER_WALKTHROUGH = [
  {
    "title": "1. Scheduler architecture and component responsibilities",
    "body": "A robust job scheduler is a core infrastructure service responsible for executing computational tasks at specified times, recurring intervals, or upon triggering conditions. Examples include quartz schedulers, Celery, and distributed systems like Google Cloud Scheduler or AWS EventBridge. The architecture centers around five core responsibilities: task definition (encapsulating code, priority, and metadata), trigger evaluation (determining when a task should run), priority queue ordering (dispatching ready tasks in exact order), failure recovery (handling transient errors via retry policies), and lifecycle observability (recording audit logs and notifying listeners). In this low-level design, we construct a thread-safe scheduler engine featuring multi-priority dispatching, fixed and exponential backoff retry policies, recurring execution cycles, and an injectable clock for millisecond-exact testing. Decoupling triggers, tasks, and scheduling logic guarantees high cohesion and independent extensibility across multiple distributed microservices and background job queues."
  },
  {
    "title": "2. Trigger models: One-shot, fixed-delay, and cron",
    "body": "Execution timing is decoupled from job logic using the Trigger interface. A Trigger is a pure function: given the current timestamp, it returns an OptionalLong representing the next scheduled execution time in epoch milliseconds. The OneShotTrigger fires exactly once at a target timestamp and returns empty on subsequent calls, making it ideal for scheduled emails or delayed processing. The FixedDelayTrigger calculates recurring executions: after a task completes, it schedules the next execution at now + delayMillis. This ensures a constant quiet interval between successive executions, avoiding task pileups when individual runs take longer than expected. More complex triggers like CronTrigger can compute schedule times based on calendar hours, days, and recurring patterns across months or weekdays, gracefully handling daylight saving time (DST) shifts and leap seconds without missing or duplicating executions in production environments."
  },
  {
    "title": "3. Priority queue ordering and dispatch mechanics",
    "body": "At the heart of the scheduler is a priority queue containing ScheduledTask instances. Sorting in the queue is three-dimensional: primary sorting by scheduledTime ascending (tasks due earlier must execute first); secondary sorting by JobPriority descending (if two tasks are due at the exact same millisecond, CRITICAL runs before HIGH, which runs before NORMAL and LOW); and tertiary sorting by sequenceId ascending (guaranteeing deterministic FIFO ordering for tasks of equal priority). The dispatchReady(now) method polls all tasks whose scheduledTime <= now. Because polling extracts elements in sorted order, the dispatcher guarantees that urgent, high-priority tasks execute before background low-priority work even when both are ready simultaneously, preventing priority inversion under heavy load spikes and bursty workloads."
  },
  {
    "title": "4. Fault tolerance: Retries and exponential backoff",
    "body": "In distributed environments, tasks frequently interact with remote services that experience transient network blips, database locks, or rate limits. Rather than failing immediately, jobs define a RetryPolicy. When a task throws an uncaught Exception, the scheduler catches it, records the failure, and checks whether task.attempt() <= retryPolicy.maxRetries(). If retries remain, the policy calculates a delay based on the configured BackoffStrategy. Under FIXED backoff, the delay is constant. Under EXPONENTIAL backoff, the delay doubles on each attempt (initialDelay * 2^(attempt - 1)), bounded by maxDelayMillis. The retry task is re-enqueued with attempt incremented. If all attempts are exhausted, the job state permanently transitions to FAILED, preventing infinite retry loops and runaway resource consumption. Full jitter algorithms can further randomize backoff intervals to prevent thundering herd spikes on downstream databases and payment gateways."
  },
  {
    "title": "5. Execution states and lifecycle observability",
    "body": "Each job progresses through well-defined lifecycle states: PENDING (scheduled and awaiting execution), RUNNING (currently executing in a worker thread), SUCCESS (completed cleanly), FAILED (execution threw an error and retries were exhausted), and CANCELLED (aborted before execution). To enable monitoring, alerting, and metrics collection, the scheduler exposes the JobListener observer interface. Listeners receive callbacks for onScheduled, onStarted, onSuccess, onFailure (including whether a retry is planned), and onCancelled. Additionally, every execution creates an immutable JobRun audit record capturing the run ID, start time, end time, duration, and error messages, stored in an in-memory history log for operational dashboards, debugging, and SLA compliance monitoring. Emitting structured metrics like execution duration percentiles (p95, p99) allows alerting systems to detect service degradations early before customer impact occurs."
  },
  {
    "title": "6. Deterministic testing with an injected clock",
    "body": "A classic pitfall in scheduler implementation is relying directly on System.currentTimeMillis() or Thread.sleep() in test suites. Sleeping makes tests slow, non-deterministic, and prone to flakiness under CI CPU load. We solve this by introducing the TimeSource interface and its implementation ManualClock. The scheduler queries TimeSource for all time evaluations. In test suites, we initialize ManualClock with a fixed timestamp and advance it manually (clock.advance(5000) or clock.set(1005000)). We can test a 24-hour recurring schedule with 5-minute exponential backoff across 10 retry attempts in under 5 milliseconds of wall-clock time, with complete determinism, exact millisecond precision, and zero flakiness across varied operating systems and build environments."
  },
  {
    "title": "7. Production extensions: Sharding and distributed consensus",
    "body": "When scaling to enterprise workloads handling millions of jobs, a single scheduler instance becomes a bottleneck and single point of failure. Distributed schedulers (such as Quartz clustered, Temporal, or Cadence) partition jobs by hashing job IDs across a cluster of scheduler nodes. Active-passive high availability is achieved by acquiring a distributed leader lease in ZooKeeper, etcd, or Redis with TTL heartbeats. If the leader fails, a standby node acquires the lease, queries the persistent database for overdue jobs, applies misfire policies (e.g. fire immediately or skip missed runs), and resumes dispatching seamlessly without dropping jobs, skipping critical triggers, or double-executing recurring scheduled events in high-availability deployments."
  },
  {
    "title": "8. Thread pool sizing, backpressure, and worker starvation",
    "body": "In production execution environments, dispatches trigger worker threads managed by a thread pool rather than running inline on the scheduler loop. Thread pool sizing must distinguish between CPU-bound tasks (sized proportional to available CPU cores, e.g., cores + 1) and I/O-bound tasks (which benefit from larger thread pools or virtual threads to absorb blocking network calls). To prevent worker starvation where a sudden burst of low-priority tasks saturates all worker threads and blocks critical jobs, separate execution pools or priority-aware thread pool executors are deployed. Backpressure controls throttle task ingestion when queues exceed capacity, rejecting or deferring new tasks rather than allowing unbounded memory growth. Dead-letter queues provide quarantine for poison tasks that consistently crash worker threads, allowing operators to inspect stack traces safely without holding up healthy scheduled jobs. Additionally, dynamic thread pool resizing can adjust pool capacity dynamically based on system CPU utilization, queue depth metrics, and memory thresholds, maintaining system stability under sudden unexpected load spikes."
  }
];

const JOB_SCHEDULER_CLASS_DIAGRAM = `classDiagram
  class JobScheduler {
    -TimeSource clock
    -PriorityQueue~ScheduledTask~ queue
    -Map~String, Job~ jobs
    -Map~String, ExecutionState~ states
    -List~JobRun~ history
    -List~JobListener~ listeners
    -ReentrantLock lock
    -boolean paused
    +schedule(Job) void
    +cancel(String) boolean
    +pause() void
    +resume() void
    +dispatchReady() int
    +getJobState(String) ExecutionState
  }
  class Job {
    -String id
    -String name
    -Runnable task
    -JobPriority priority
    -Trigger trigger
    -RetryPolicy retryPolicy
  }
  class ScheduledTask {
    -String jobId
    -long scheduledTime
    -JobPriority priority
    -int attempt
    -long sequenceId
    +compareTo(ScheduledTask) int
  }
  class Trigger {
    <<interface>>
    +nextExecutionTime(long) OptionalLong
  }
  class RetryPolicy {
    -int maxRetries
    -long initialDelayMillis
    -long maxDelayMillis
    -BackoffStrategy strategy
    +delayForAttempt(int) long
  }
  class JobRun {
    -String runId
    -String jobId
    -int attempt
    -long startTime
    -long endTime
    -ExecutionState state
    +duration() long
  }
  class TimeSource {
    <<interface>>
    +nowMillis() long
  }
  JobScheduler --> ScheduledTask
  JobScheduler --> Job
  Job --> Trigger
  Job --> RetryPolicy
  JobScheduler --> TimeSource
  JobScheduler --> JobRun`;

const JOB_SCHEDULER_SEQUENCE_DIAGRAM = `sequenceDiagram
  autonumber
  actor Client
  participant Scheduler as JobScheduler
  participant Queue as PriorityQueue
  participant Clock as TimeSource
  participant Task as JobTask

  Client->>Scheduler: schedule(job with retryPolicy)
  Scheduler->>Queue: add(ScheduledTask at 1000)
  Client->>Clock: set(1000)
  Client->>Scheduler: dispatchReady()
  Scheduler->>Queue: poll()
  Scheduler->>Task: run()
  Task-->>Scheduler: throws Exception
  Note over Scheduler: attempt 1 <= maxRetries: calculate backoff
  Scheduler->>Queue: add(ScheduledTask at 2000, attempt 2)
  Client->>Clock: set(2000)
  Client->>Scheduler: dispatchReady()
  Scheduler->>Queue: poll()
  Scheduler->>Task: run()
  Task-->>Scheduler: success
  Scheduler-->>Client: state marked SUCCESS`;

export const LLD_DEEP_F_JOB_SCHEDULER: LldDeep = {
  walkthrough: JOB_SCHEDULER_WALKTHROUGH,
  classDiagram: JOB_SCHEDULER_CLASS_DIAGRAM,
  sequenceDiagram: JOB_SCHEDULER_SEQUENCE_DIAGRAM,
  stateDiagram: `stateDiagram-v2
    [*] --> PENDING: Job scheduled
    PENDING --> RUNNING: Dispatched at trigger time
    RUNNING --> SUCCESS: Completed cleanly
    RUNNING --> PENDING: Failed; retry scheduled with backoff
    RUNNING --> FAILED: Failed; retries exhausted
    PENDING --> CANCELLED: Explicit cancellation
    SUCCESS --> PENDING: Recurring trigger reschedules
    SUCCESS --> [*]
    FAILED --> [*]
    CANCELLED --> [*]`,
  extraDiagrams: [
    {
      title: "Priority Queue composite ordering",
      source: `flowchart TD
        Q["Priority Queue"] --> T1["1. Scheduled Time (earlier first)"]
        T1 --> T2["2. Job Priority (CRITICAL > HIGH > NORMAL > LOW)"]
        T2 --> T3["3. Creation Sequence ID (FIFO for ties)"]`,
    },
  ],
  concurrency: [
    "ReentrantLock protection: Priority queue access and state transitions are secured by a ReentrantLock.",
    "Decoupled dispatch and execution: Tasks ready for dispatch are extracted under lock and executed outside the lock, preventing long-running tasks from stalling the queue.",
    "CopyOnWriteArrayList: JobRun history and listener registrations use copy-on-write collections for safe concurrent reads without synchronization overhead.",
    "Atomic counters: Run IDs and sequence IDs use AtomicLong for collision-free identifier generation across threads.",
  ],
};

// =====================================================================
// Aggregated Export
// =====================================================================

export const LLD_DEEP_F: Record<string, LldDeep> = {
  "lldp-pubsub": LLD_DEEP_F_PUBSUB,
  "lldp-orderbook": LLD_DEEP_F_ORDERBOOK,
  "lldp-text-editor": LLD_DEEP_F_TEXT_EDITOR,
  "lldp-job-scheduler": LLD_DEEP_F_JOB_SCHEDULER,
};
