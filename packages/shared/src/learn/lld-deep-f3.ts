import type { LldDeep, LldExtra, LldGuide } from "./types";

// Batch F3 LLD walkthroughs, guides, extras, and diagrams (plan 0039).
// No backticks or dollar-brace in text. Quoted Mermaid node labels.

// =====================================================================
// 1. Inventory Management System
// =====================================================================

export const INVENTORY_GUIDE: LldGuide = {
  requirements: [
    "Manage SKU and Product catalogs across multiple distributed warehouse locations.",
    "Support reservation holds during checkout with configurable TTL expiry (e.g. 10 minutes auto-release).",
    "Multi-warehouse order fulfillment: prefer single-facility shipments to minimize splits; fallback to prioritized split allocation.",
    "Restock threshold alerts: trigger notifications when physical inventory drops at or below reorder thresholds.",
    "Deadlock-free concurrent reservation guards: prevent overselling under high-concurrency flash sales.",
    "Full lifecycle operations: hold, confirm on payment, release on cancellation, and scheduled cleanup of expired holds.",
  ],
  entities: [
    "InventoryService (central coordinator managing catalogs, stock matrix, reservations, and alerts)",
    "Sku (product catalog entity with dimensions, price, weight, and category)",
    "Warehouse (fulfillment node with priority, location code, and active status)",
    "StockLocationKey (composite key combining warehouseId and skuId with natural ordering)",
    "InventoryLevel (thread-safe state tracking totalQuantity, reservedQuantity, and reorderThreshold)",
    "InventoryReservation (reservation hold ticket with orderId, items, createdAt, expiresAt, and status)",
    "AllocationStrategy (interface for single-warehouse preference vs priority multi-facility allocation)",
    "FulfillmentPlan and FulfillmentLine (concrete allocation plan mapping items to warehouses)",
    "RestockAlert and RestockAlertListener (event notifications for inventory replenishment)",
    "Clock and ManualClock (pluggable time provider for deterministic TTL expiration testing)",
  ],
  patterns: [
    "Strategy pattern for multi-warehouse inventory allocation (SingleWarehouse vs Priority)",
    "Observer pattern for restock threshold alerts and warehouse replenishment triggers",
    "Finite State Machine (FSM) for reservation lifecycle (PENDING -> CONFIRMED / RELEASED / EXPIRED)",
    "Canonical Resource Ordering for deadlock-free multi-item concurrent locking",
    "Two-Phase Reservation (soft hold with TTL before hard inventory deduction on checkout confirmation)",
  ],
  code: `final class InventoryService {
    private final Map<StockLocationKey, InventoryLevel> stockMatrix = new ConcurrentHashMap<>();

    ReservationResult holdInventory(String orderId, String customerId, Map<String, Integer> items, long ttlMillis) {
        FulfillmentPlan plan = allocationStrategy.planFulfillment(items, warehouses, this::getAvailableStock);
        if (!plan.isFeasible()) return ReservationResult.failure(plan.getFailureReason());

        List<StockLocationKey> sortedKeys = plan.getLines().stream()
                .map(l -> new StockLocationKey(l.getWarehouseId(), l.getSkuId()))
                .distinct().sorted().toList();

        // Lock in canonical order to prevent deadlocks across concurrent carts
        for (StockLocationKey key : sortedKeys) {
            stockMatrix.get(key).tryReserve(qtyMap.get(key));
        }
        return ReservationResult.success(new InventoryReservation(resId, orderId, customerId, items, now, now + ttlMillis));
    }
}`,
  extensions: [
    "Safety stock buffers: dynamic reservation ceilings during peak holiday demand surges.",
    "Geographic distance matrix: Haversine distance and real-time shipping rate API integration.",
    "Distributed lock manager: Redis Redlock or ZooKeeper for multi-node inventory partition clusters.",
    "Batch replenishment orders: automated EDI/PO generation sent directly to suppliers upon restock alerts.",
  ],
};

export const INVENTORY_EXTRA: LldExtra = {
  recap: [
    "Decouple physical stock from logical availability: totalQuantity represents physical goods, availableQuantity = totalQuantity - reservedQuantity.",
    "Two-phase checkout hold: holdInventory reserves stock with a TTL (e.g., 10 minutes); payment confirms hard deduction; abandon triggers auto-release.",
    "Deadlock prevention in multi-item reservations: sort all required (warehouse, SKU) location keys canonically before acquiring locks.",
    "Fulfillment optimization: single-facility preference eliminates split shipping costs, falling back cleanly to multi-facility splits when required.",
  ],
  flow: [
    "Customer adds 2 Laptops and 1 Mouse to cart and initiates checkout with order 'ORD-101'.",
    "InventoryService invokes SingleWarehouseAllocationStrategy to inspect facilities.",
    "Strategy identifies WH-EAST has both items in stock; creates single-warehouse FulfillmentPlan.",
    "Service sorts location keys [WH-EAST:SKU-LAPTOP, WH-EAST:SKU-MOUSE] and acquires atomic holds.",
    "Pending reservation 'res-1001' created with 10-minute expiry; available stock decremented while total stock remains unchanged.",
    "Customer completes payment within 3 minutes; confirmReservation transitions ticket to CONFIRMED and permanently deducts totalQuantity.",
    "Total laptop stock in WH-EAST drops below reorderThreshold; RestockAlert event fired to warehouse replenishment listeners.",
  ],
  edgeCases: [
    "Flash sale concurrency race: 100 threads attempt to reserve the last 5 units; exactly 5 succeed and 95 receive clean out-of-stock rejections.",
    "Cart abandonment: customer closes browser; background cleanupExpiredHolds releases reserved items after 10 minutes without admin intervention.",
    "Partial inventory across facilities: no single warehouse has the full order; strategy seamlessly splits fulfillment across multiple regional hubs.",
    "Double confirmation / double release: atomic FSM transitions ensure confirmation or cancellation cannot execute multiple times.",
    "Negative stock prevention: totalQuantity and reservedQuantity guards reject negative quantities or over-release attempts.",
  ],
};

const INVENTORY_WALKTHROUGH = [
  {
    "title": "1. Problem domain, commerce scale, and architectural challenges",
    "body": "An enterprise Inventory Management System (IMS) functions as the authoritative operational nervous system of modern e-commerce platforms, airline reservation engines, hotel booking systems, and omni-channel retail supply chains. At high transaction volumes—such as during nationwide flash sales, holiday shopping events like Black Friday, or high-demand concert ticket releases—the inventory engine faces severe concurrency and operational tensions. A naive design might attempt to decrement on-hand inventory immediately when a customer adds an item to their shopping cart. However, across global retail platforms, shopping cart abandonment rates typically exceed 70 percent. Immediately decrementing stock upon cart addition enables malicious actors or uncommitted shoppers to hoard items, starving genuine buyers and drastically reducing merchant conversion. Conversely, postponing inventory verification until the final payment gateway callback introduces catastrophic overselling, where hundreds of shoppers successfully pay for scarce items that physically do not exist in the fulfillment network, resulting in costly cancellations, customer refunds, and reputational damage. Furthermore, modern enterprises operate distributed fulfillment networks comprising dozens of regional distribution centers, urban micro-fulfillment hubs, and retail store locations. An order consisting of multiple distinct items must be routed intelligently to minimize split shipments, consolidate packaging, and manage logistics costs while maintaining sub-second checkout latencies."
  },
  {
    "title": "2. Domain modeling: SKUs, Warehouses, and the Location Matrix",
    "body": "The core domain model establishes a clean, decoupled foundation separating the conceptual product catalog from the physical reality of warehouse facilities. The Sku entity represents a unique stock-keeping unit encapsulating immutable product metadata, including product name, category, dimensions, weight in grams, and retail price in integer cents (avoiding floating-point arithmetic rounding errors). The Warehouse entity models a physical fulfillment node with a geographic location code, an operational priority score, and an active status flag indicating whether the facility is currently operational or temporarily offline for maintenance. Because physical inventory is inherently distributed across facilities, the system models inventory levels not as a monolithic field on the SKU, but as a sparse two-dimensional location matrix keyed by StockLocationKey. The StockLocationKey is a composite value object combining a warehouseId and a skuId. Each matrix coordinate holds an InventoryLevel instance. Crucially, InventoryLevel decouples physical totalQuantity (the actual physical count on warehouse shelves) from logical reservedQuantity (the quantity currently locked in active, uncompleted checkout sessions). The logical availability is dynamically computed as availableQuantity = totalQuantity - reservedQuantity. This separation allows shoppers to view accurate real-time stock availability while keeping physical inventory untouched until checkout confirmation."
  },
  {
    "title": "3. Reservation holds, TTL expirations, and the checkout FSM",
    "body": "To guarantee inventory availability to serious shoppers without risking permanent leakage from cart abandonment, the system implements a two-phase reservation protocol governed by an explicit Finite State Machine (FSM). When a customer advances to checkout, the InventoryService issues an InventoryReservation hold in the PENDING state. The reservation is assigned a strict Time-To-Live (TTL), conventionally 10 minutes (600,000 milliseconds). During this reservation window, available inventory is reduced by incrementing reservedQuantity across all allocated facilities, guaranteeing the buyer that their chosen items cannot be sold to concurrent shoppers while they enter payment and shipping details. The reservation ticket progresses through deterministic state transitions: (1) If payment succeeds within the TTL, confirmReservation transitions the ticket to CONFIRMED, permanently decrementing totalQuantity and releasing reservedQuantity; (2) If the customer explicitly cancels checkout, releaseReservation transitions the ticket to RELEASED, restoring available stock immediately; (3) If the customer closes the browser or walks away, a background scheduled sweeper or reactive check invokes cleanupExpiredHolds. This sweeps all PENDING reservations whose expiry timestamp has passed, atomically transitioning them to EXPIRED and restoring reserved inventory to available status. To make this time-dependent lifecycle entirely deterministic and testable without thread sleeps, the system relies on an injected Clock interface with a ManualClock implementation, allowing unit tests to simulate elapsed time instantaneously."
  },
  {
    "title": "4. Multi-warehouse order fulfillment and allocation strategies",
    "body": "Routing multi-item orders across distributed fulfillment centers involves complex logistics tradeoffs. When an order contains multiple distinct SKUs, fulfilling the items from different warehouses results in a split shipment. Split shipments double packaging materials, increase freight carrier baseline fees, and confuse customers with staggered delivery deliveries. To address this, the system incorporates the Strategy pattern via the AllocationStrategy interface. The primary implementation, SingleWarehouseAllocationStrategy, executes a prioritized two-phase evaluation. In Phase 1, it filters active warehouses sorted by operational priority and evaluates whether any single facility holds sufficient available stock to satisfy 100% of the requested order line items. If a single facility qualifies, it generates a unified single-warehouse FulfillmentPlan. If no single warehouse possesses the full basket, the strategy transitions to Phase 2: a greedy multi-warehouse fallback that aggregates inventory across facilities in descending priority order until all quantities are satisfied. An alternative PriorityWarehouseAllocationStrategy is also provided for regional fulfillment setups where minimizing transit distance or routing strictly from primary hubs takes precedence over shipment consolidation."
  },
  {
    "title": "5. Deadlock-free concurrency guards and flash sale safety",
    "body": "High-concurrency flash sales introduce severe multithreading hazards. When dozens of shoppers simultaneously attempt to reserve popular SKUs, coarse synchronization around the entire inventory service would serialize all checkout operations, creating an unacceptable latency bottleneck. Conversely, acquiring individual locks on multiple inventory items without strict ordering introduces the classic Dining Philosophers deadlock hazard. For example, if Cart 1 contains Item A at WH-1 and Item B at WH-2, while Cart 2 contains Item B at WH-2 and Item A at WH-1, Thread 1 may lock Location A and wait for Location B, while Thread 2 locks Location B and waits for Location A, causing a permanent thread lockup. The InventoryService eliminates this vulnerability by enforcing Canonical Resource Ordering. Before acquiring any reservation locks, all required StockLocationKey instances in the fulfillment plan are sorted lexicographically based on their composite (warehouseId + ':' + skuId) natural ordering. Locks are acquired strictly in this monotonic sequence. Furthermore, the reservation execution enforces an all-or-nothing atomic rollback protocol: if any item in the order fails the reservation check due to concurrent depletion, all previously acquired holds in that transaction are rolled back immediately, and a clean failure response is returned."
  },
  {
    "title": "6. Restock threshold alerts and replenishment pipelines",
    "body": "Preventing stockouts requires proactive, real-time replenishment signals rather than delayed batch audits. Each InventoryLevel maintains a configurable reorderThreshold and a suggested reorderQuantity. Whenever an order is confirmed and physical totalQuantity is decremented, the service checks whether totalQuantity has fallen at or below reorderThreshold. If the threshold is breached, the service constructs an immutable RestockAlert event detailing the affected SKU, warehouse location, current on-hand quantity, threshold, recommended reorder volume, and timestamp. The alert is dispatched to registered RestockAlertListener instances using the Observer pattern. This decouples the core inventory deduction engine from downstream operational workflows, such as automated purchase order generation, electronic data interchange (EDI) dispatches to suppliers, or automated webhook alerts to warehouse floor managers."
  },
  {
    "title": "7. Edge cases, reliability, and enterprise production patterns",
    "body": "The architecture accounts for critical real-world edge cases. When a warehouse facility is temporarily deactivated for maintenance, allocation strategies automatically bypass it during candidate evaluation. In extreme flash sale scenarios where hundreds of threads compete for a single remaining unit, fine-grained synchronized reservation methods ensure that exactly one thread succeeds while all other threads receive clean out-of-stock rejections without data corruption or overselling. State transitions are strictly idempotent: calling confirmReservation or releaseReservation on an already confirmed, released, or expired reservation returns false safely without modifying stock counters. In production environments, this in-memory architecture maps seamlessly to distributed architectures: StockLocationKey corresponds to partition keys in distributed key-value stores (e.g., Redis or DynamoDB), canonical lock sorting prevents distributed deadlocks, and time-based TTL reservations naturally align with Redis key expiry features."
  }
];

const INVENTORY_CLASS_DIAGRAM = `classDiagram
  class InventoryService {
    -Clock clock
    -Map~String, Sku~ skuCatalog
    -Map~String, Warehouse~ warehouseCatalog
    -Map~StockLocationKey, InventoryLevel~ stockMatrix
    -Map~String, InventoryReservation~ reservations
    -List~RestockAlertListener~ alertListeners
    +registerSku(Sku sku)
    +registerWarehouse(Warehouse warehouse)
    +addStock(String whId, String skuId, int qty)
    +holdInventory(String orderId, String custId, Map items, long ttl) ReservationResult
    +confirmReservation(String resId) boolean
    +releaseReservation(String resId) boolean
    +cleanupExpiredHolds() List~String~
  }

  class InventoryLevel {
    -int totalQuantity
    -int reservedQuantity
    -int reorderThreshold
    -int reorderQuantity
    +synchronized tryReserve(int amount) boolean
    +synchronized confirm(int amount)
    +synchronized release(int amount)
    +synchronized getAvailableQuantity() int
    +synchronized isBelowReorderThreshold() boolean
  }

  class InventoryReservation {
    -String id
    -String orderId
    -String customerId
    -List~ReservationItem~ items
    -long createdAt
    -long expiresAt
    -ReservationStatus status
    +synchronized transitionToConfirmed() boolean
    +synchronized transitionToReleased() boolean
    +synchronized transitionToExpired() boolean
    +isExpired(long now) boolean
  }

  class AllocationStrategy {
    <<interface>>
    +planFulfillment(Map items, List warehouses, BiFunction stockLookup) FulfillmentPlan
  }

  class SingleWarehouseAllocationStrategy {
    +planFulfillment(Map items, List warehouses, BiFunction stockLookup) FulfillmentPlan
  }

  class PriorityWarehouseAllocationStrategy {
    +planFulfillment(Map items, List warehouses, BiFunction stockLookup) FulfillmentPlan
  }

  class Sku {
    -String id
    -String name
    -String category
    -long priceCents
    -int weightGrams
  }

  class Warehouse {
    -String id
    -String name
    -String locationCode
    -int priority
    -boolean active
  }

  class StockLocationKey {
    -String warehouseId
    -String skuId
    +compareTo(StockLocationKey other) int
  }

  class RestockAlert {
    -String alertId
    -String warehouseId
    -String skuId
    -int currentTotal
    -int threshold
  }

  InventoryService --> AllocationStrategy
  InventoryService --> InventoryLevel
  InventoryService --> InventoryReservation
  InventoryService --> RestockAlert
  SingleWarehouseAllocationStrategy ..|> AllocationStrategy
  PriorityWarehouseAllocationStrategy ..|> AllocationStrategy
  StockLocationKey --> InventoryLevel`;

const INVENTORY_SEQUENCE_DIAGRAM = `sequenceDiagram
  autonumber
  actor Buyer as Customer
  participant Svc as InventoryService
  participant Strat as SingleWarehouseAllocationStrategy
  participant Level as InventoryLevel
  participant Res as InventoryReservation
  actor Admin as RestockListener

  Buyer->>Svc: holdInventory(orderId, items, 10m TTL)
  Svc->>Strat: planFulfillment(items, warehouses, stockLookup)
  Strat-->>Svc: FulfillmentPlan(WH-EAST, items)
  Note over Svc: Sort StockLocationKeys lexicographically
  Svc->>Level: tryReserve(qty)
  Level-->>Svc: true (reservedQuantity += qty)
  Svc->>Res: new InventoryReservation(PENDING, expiresAt)
  Svc-->>Buyer: ReservationResult(SUCCESS, res-1001)

  alt Customer completes checkout within TTL
    Buyer->>Svc: confirmReservation(res-1001)
    Svc->>Res: transitionToConfirmed()
    Res-->>Svc: true
    Svc->>Level: confirm(qty) [total -= qty, reserved -= qty]
    opt totalQuantity <= reorderThreshold
      Svc->>Admin: onAlert(RestockAlert)
    end
    Svc-->>Buyer: confirmed (order fulfilled)
  else Customer abandons checkout (TTL expires)
    Note over Svc: Clock advances past 10 minutes
    Svc->>Svc: cleanupExpiredHolds()
    Svc->>Res: transitionToExpired()
    Res-->>Svc: true
    Svc->>Level: release(qty) [reserved -= qty]
    Note over Level: availableQuantity restored automatically
  end`;

export const LLD_DEEP_F3_INVENTORY: LldDeep = {
  walkthrough: INVENTORY_WALKTHROUGH,
  classDiagram: INVENTORY_CLASS_DIAGRAM,
  sequenceDiagram: INVENTORY_SEQUENCE_DIAGRAM,
  stateDiagram: `stateDiagram-v2
    [*] --> PENDING: holdInventory() called with TTL
    PENDING --> CONFIRMED: Payment confirmed within TTL (stock deducted)
    PENDING --> RELEASED: Customer manually cancels checkout
    PENDING --> EXPIRED: TTL elapsed without confirmation (stock auto-released)
    CONFIRMED --> [*]: Order fulfilled
    RELEASED --> [*]: Available inventory restored
    EXPIRED --> [*]: Available inventory restored`,
  extraDiagrams: [
    {
      title: "Canonical lock ordering for multi-item reservations",
      source: `flowchart TD
        Order["Checkout Order: Items at WH-B and WH-A"] --> Sort["Sort StockLocationKeys: 1. WH-A:SKU-1, 2. WH-B:SKU-2"]
        Sort --> Lock1["Acquire Lock WH-A:SKU-1"]
        Lock1 --> Reserve1{"Try Reserve Item 1"}
        Reserve1 -- Yes --> Lock2["Acquire Lock WH-B:SKU-2"]
        Reserve1 -- No --> Fail["Rollback all acquired locks & return failure"]
        Lock2 --> Reserve2{"Try Reserve Item 2"}
        Reserve2 -- Yes --> Success["Create Reservation Hold with 10m TTL"]
        Reserve2 -- No --> Rollback["Release Item 1 hold & return failure"]`,
    },
    {
      title: "Warehouse allocation decision tree",
      source: `flowchart TD
        Start["Order Request: Items [A, B]"] --> CheckSingle{"Does any single active warehouse have both A and B?"}
        CheckSingle -- Yes --> Single["Select highest priority single warehouse (No split shipment)"]
        CheckSingle -- No --> CheckSplit{"Can multi-warehouse aggregation satisfy [A, B]?"}
        CheckSplit -- Yes --> Split["Greedy split across warehouses in priority order"]
        CheckSplit -- No --> OOS["Return Insufficient Inventory Failure"]`,
    },
  ],
  concurrency: [
    "Canonical resource ordering: StockLocationKey instances are sorted lexicographically prior to lock acquisition, preventing deadlocks across concurrent multi-SKU checkout carts.",
    "Atomic compare-and-reserve: InventoryLevel methods are thread-safe, guaranteeing that concurrent reservation attempts never exceed available quantity.",
    "All-or-nothing reservation rollback: If any item in a multi-item basket cannot be satisfied, all previously held stock in that transaction is immediately freed.",
    "ConcurrentHashMap catalog storage: SKU catalogs, warehouse registries, and active reservation maps operate without global lock contention.",
  ],
};

// =====================================================================
// 2. Social Media Activity Feed
// =====================================================================

export const SOCIAL_FEED_GUIDE: LldGuide = {
  requirements: [
    "Maintain a thread-safe follow and unfollow graph between users.",
    "Hybrid fan-out engine: Fan-out on WRITE (push model) for regular users; Fan-out on READ (pull model) for high-follower celebrity accounts.",
    "Dynamic celebrity threshold: users transitioning past follower limits switch fan-out behavior automatically.",
    "Reverse chronological feed generation with multi-way timeline merging and deduplication.",
    "Cursor-based pagination: stable pagination using timestamp and post ID cursors without offset drift or duplicates.",
    "Granular privacy filtering: enforce PUBLIC, FOLLOWERS_ONLY, and PRIVATE access rules during feed generation.",
    "Dynamic unfollow pruning: unfollowing an author immediately excludes their resting posts from the viewer's feed.",
  ],
  entities: [
    "FeedService (central facade orchestrating follow graph, post publication, inboxes, outboxes, and feed queries)",
    "User (user entity defining id, username, and celebrity follower threshold)",
    "FollowGraph (thread-safe bidirectional follow relationships: followers and following)",
    "Post (content entity with id, authorId, content, timestamp, visibility, and likesCount)",
    "PostVisibility (enum defining PUBLIC, FOLLOWERS_ONLY, and PRIVATE levels)",
    "FeedCursor (composite pagination token encoding timestamp and postId)",
    "FeedPage (paginated response container with post list, nextCursor, and hasMore flag)",
    "Clock and ManualClock (time abstraction for deterministic post timestamps and pagination testing)",
  ],
  patterns: [
    "Hybrid Fan-Out architecture (Push for regular users, Pull for celebrities) to solve write vs read amplification",
    "Cursor Pagination pattern for stable timeline traversal over high-velocity churn streams",
    "Multi-Way Merge and Deduplication for unified feed assembly from heterogeneous timeline sources",
    "Bidirectional Graph indexing for O(1) follower and following lookups",
    "Security Interceptor / Privacy Filter for role-based content visibility checks",
  ],
  code: `final class FeedService {
    Post publishPost(String authorId, String content, PostVisibility visibility) {
        Post post = new Post("post-" + postSeq.incrementAndGet(), authorId, content, clock.currentTimeMillis(), visibility);
        posts.put(post.getId(), post);
        outboxes.computeIfAbsent(authorId, k -> new CopyOnWriteArrayList<>()).add(post.getId());

        if (!isCelebrity(authorId)) {
            // Fan-out on WRITE: Push to all follower inboxes
            for (String followerId : followGraph.getFollowers(authorId)) {
                inboxes.computeIfAbsent(followerId, k -> new CopyOnWriteArrayList<>()).add(post.getId());
            }
        }
        return post;
    }
}`,
  extensions: [
    "Redis Sorted Sets (ZSET): storing timeline post IDs scored by epoch millisecond for O(log N) range queries.",
    "Affinity-based feed ranking: ML feature vectors (interaction history, media type, recency decay) scoring feeds.",
    "Asynchronous worker queues: Kafka or RabbitMQ distributing fan-out write tasks across background workers.",
    "Media CDN offloading: asynchronous thumbnail transcoding and video manifest distribution.",
  ],
};

export const SOCIAL_FEED_EXTRA: LldExtra = {
  recap: [
    "The fundamental feed dilemma: Pure Push (fan-out on write) crushes database writes when celebrities post; Pure Pull (fan-out on read) crushes database reads when users refresh.",
    "The Hybrid Solution: Regular users use fan-out on write (posts pushed to followers' pre-computed inboxes); Celebrities use fan-out on read (posts saved to outbox only, pulled on read).",
    "Cursor pagination over offset pagination: cursors encode (timestamp, postId), completely preventing post skipping or duplicate items when new posts arrive mid-scroll.",
    "Dynamic unfollow filtering: instead of expensive background deletion sweeps through all follower inboxes upon unfollow, feed generation filters out non-followed posts dynamically.",
  ],
  flow: [
    "Charlie (regular user with 2 followers) publishes post 'p1'.",
    "FeedService checks celebrity status; Charlie is regular, so 'p1' is pushed directly to inboxes of Alice and Bob.",
    "Dave (celebrity with 100,000 followers) publishes post 'p2'.",
    "FeedService identifies Dave as celebrity; skips push to 100,000 inboxes, storing 'p2' only in Dave's outbox.",
    "Alice opens her feed: FeedService queries Alice's inbox (finding 'p1') and queries followed celebrities' outboxes (finding 'p2').",
    "FeedService filters posts by privacy and current follow status, sorts candidates in reverse chronological order, and returns first page with nextCursor.",
  ],
  edgeCases: [
    "Celebrity status transition: user crosses follower threshold; subsequent posts switch from push to pull model automatically.",
    "Stale push after unfollow: follower unfollows author after a post was pushed; feed assembly checks current follow status and drops the post.",
    "Exact timestamp collisions: two posts created in the same millisecond are deterministically ordered by post ID tie-breaker.",
    "Private posts: author's private notes appear only on the author's own feed/timeline, strictly hidden from followers and strangers.",
    "Empty or exhausted feeds: requesting beyond the oldest post returns an empty page with null cursor and hasMore = false.",
  ],
};

const SOCIAL_FEED_WALKTHROUGH = [
  {
    "title": "1. The Social Feed problem and the Fan-Out dilemma",
    "body": "Designing an activity feed pipeline at modern social media scale (such as Twitter/X, Instagram, LinkedIn, or Threads) represents one of the most demanding distributed system challenges in software engineering. The core functional requirement appears deceptively straightforward: when an active user opens their client application, they should immediately see a reverse-chronologically ordered stream of posts generated by the people they follow. However, beneath this simple requirement lies the fundamental architectural tension known as the Fan-Out Dilemma. In a pure Fan-Out on WRITE (Push) model, every time an author publishes a post, the system immediately writes a reference or copy of that post into the personalized inbox timeline of every one of their followers. For a typical user with 100 followers, this requires 100 trivial in-memory writes. However, modern networks exhibit severe power-law distributions: celebrities, news outlets, and public figures often have tens of millions of followers. If a celebrity with 50 million followers posts, a pure push model requires 50 million database writes for a single action, overwhelming message queues, inducing massive replication lag, and exhausting write throughput. Conversely, in a pure Fan-Out on READ (Pull) model, no pre-computed inboxes exist; when a user requests their feed, the system must query every account the user follows, retrieve their recent posts, merge them in memory, and sort them. Under millions of concurrent active users, this causes catastrophic read amplification, high latency, and database CPU saturation."
  },
  {
    "title": "2. The Hybrid Fan-Out Architecture: Push vs Pull models",
    "body": "To resolve the Fan-Out Dilemma, high-scale social platforms adopt a Hybrid Fan-Out Architecture that dynamically balances write amplification against read amplification. The system categorizes users into regular accounts and high-follower celebrity accounts using a configurable follower threshold (such as 1,000 or 25,000 followers). For regular users, who constitute the vast majority of creators on the platform, the system employs Fan-Out on WRITE. Because their follower count is modest, publishing a post pushes the post ID directly into their followers' pre-computed inboxes in milliseconds, guaranteeing O(1) retrieval time when those followers open their feeds. For high-follower celebrity accounts, the system switches to Fan-Out on READ: when a celebrity posts, the post is appended solely to the celebrity's own outbox timeline, and zero follower inboxes are touched, reducing write amplification from O(N) to O(1). When a follower subsequently opens their feed, the FeedService executes a lightweight multi-way merge: it retrieves the follower's pre-computed inbox (containing all pushed posts from regular friends) and pulls recent posts only from the few celebrities the user actually follows. This hybrid design ensures that publishing remains instantaneous for celebrities while keeping feed assembly fast and efficient."
  },
  {
    "title": "3. Graph modeling, bidirectional indexing, and dynamic user transitions",
    "body": "The social relationship topology is governed by the FollowGraph component. Because social relationships in activity feeds are directed (User A following User B does not imply User B follows User A), the graph maintains two synchronized, thread-safe mappings: following (mapping each user to the set of accounts they follow) and followers (mapping each user to the set of accounts that follow them). These sets are backed by concurrent hash sets, enabling O(1) lookups for relationship validation, follower counts, and audience enumeration. The graph enforces strict integrity constraints: self-follows are rejected, and duplicate follow or unfollow operations are handled idempotently. Furthermore, because a creator's audience grows dynamically over time, the system re-evaluates celebrity status upon every post publication. When an account's follower count crosses the celebrity threshold, subsequent posts automatically transition from push distribution to pull distribution without requiring complex data migrations or manual tier adjustments."
  },
  {
    "title": "4. Cursor-based pagination vs Offset-based pagination",
    "body": "A critical architectural requirement for high-velocity feeds is pagination stability. Traditional SQL-style offset pagination (e.g., LIMIT 10 OFFSET 20) fails completely on dynamic activity feeds due to two fatal flaws: offset drift and O(N) scan degradation. When an active feed receives dozens of new posts while a user is reading page 1, querying page 2 with an offset skips posts or serves duplicate entries that shifted down the index. To guarantee mathematical stability, this system implements Cursor-Based Pagination via FeedCursor. A cursor represents a deterministic coordinate in the ordered stream, encoding the timestamp and post ID of the last consumed post. When requesting the subsequent page, the client provides this opaque token. The query engine filters out all items newer than or equal to the cursor coordinate using strict ordering logic: post.timestamp < cursor.timestamp || (post.timestamp == cursor.timestamp && post.id < cursor.postId). This guarantees that new posts published at the top of the feed never disturb pagination lower in the timeline, completely eliminating duplicates and missed posts even when millions of posts are inserted concurrently."
  },
  {
    "title": "5. Granular privacy filtering and dynamic unfollow pruning",
    "body": "In a real-world social network, content distribution must respect access control and privacy boundaries. The Post model supports three distinct visibility tiers: PUBLIC (visible to everyone), FOLLOWERS_ONLY (restricted strictly to authenticated followers), and PRIVATE (visible exclusively to the author). During feed generation, each candidate post undergoes authorization inspection via post.canView(viewerId, isFollower). Moreover, the system elegantly solves the 'unfollow ghost post' dilemma. If Alice unfollows Charlie after Charlie's post was already pushed into Alice's inbox, performing an eager scan to delete Charlie's post IDs from millions of inboxes would be prohibitively slow and resource-intensive. Instead, the FeedService applies dynamic filtering at read time: if followGraph.isFollowing(viewerId, authorId) returns false, the pushed post is discarded on the fly, guaranteeing real-time privacy and audience consistency without background cleanup lag."
  },
  {
    "title": "6. Concurrency model, memory bounding, and production scaling",
    "body": "Concurrency safety is engineered throughout the feed pipeline. All user registries, post repositories, and timeline collections utilize concurrent collections. Inboxes and outboxes use synchronized list access or copy-on-write lists to ensure that background write threads pushing new posts never trigger ConcurrentModificationException in concurrent feed reading threads. In production deployments, inboxes are bounded (e.g., retaining the latest 800 post IDs in memory) using fixed-size ring buffers or Redis Sorted Sets (ZSETs), while older posts are archived to cold storage. Read queries on cold timelines fall back to database queries, ensuring optimal memory residency without unbounded heap consumption while supporting predictable high-throughput under burst traffic."
  },
  {
    "title": "7. Architectural tradeoffs, ML ranking, and future evolutions",
    "body": "Every feed architecture balances latency, storage overhead, and compute complexity. The hybrid push-pull model trades minimal memory replication for sub-second feed delivery. Looking forward to enterprise production scale, this foundation readily extends to: (1) Asynchronous message queues (Kafka) decoupling fan-out push tasks from user HTTP request cycles; (2) Machine-learning rankers scoring candidate posts using engagement probability models rather than purely chronological sorting; (3) Bloom filters providing rapid membership checks for celebrity follow lists; and (4) Distributed cache clusters (Redis) sharding inboxes by user ID with consistent hashing, enabling seamless horizontal scale to hundreds of millions of daily active users."
  }
];

const SOCIAL_FEED_CLASS_DIAGRAM = `classDiagram
  class FeedService {
    -Clock clock
    -FollowGraph followGraph
    -Map~String, User~ users
    -Map~String, Post~ posts
    -Map~String, List~String~~ inboxes
    -Map~String, List~String~~ outboxes
    +registerUser(User user)
    +follow(String followerId, String followeeId) boolean
    +unfollow(String followerId, String followeeId) boolean
    +isCelebrity(String userId) boolean
    +publishPost(String authorId, String content, PostVisibility visibility) Post
    +getFeed(String userId, String cursorToken, int pageSize) FeedPage
    +getUserTimeline(String authorId, String viewerId, String cursorToken, int pageSize) FeedPage
  }

  class User {
    -String id
    -String username
    -int celebrityThreshold
    +isCelebrity(int followerCount) boolean
  }

  class FollowGraph {
    -Map~String, Set~String~~ following
    -Map~String, Set~String~~ followers
    +follow(String followerId, String followeeId) boolean
    +unfollow(String followerId, String followeeId) boolean
    +isFollowing(String followerId, String followeeId) boolean
    +getFollowers(String userId) Set~String~
    +getFollowees(String userId) Set~String~
  }

  class Post {
    -String id
    -String authorId
    -String content
    -long timestamp
    -PostVisibility visibility
    -int likesCount
    +canView(String viewerId, boolean isFollower) boolean
    +compareTo(Post o) int
  }

  class PostVisibility {
    <<enumeration>>
    PUBLIC
    FOLLOWERS_ONLY
    PRIVATE
  }

  class FeedCursor {
    -long timestamp
    -String postId
    +encode() String
    +decode(String token)$ Optional~FeedCursor~
    +allows(Post post) boolean
  }

  class FeedPage {
    -List~Post~ posts
    -String nextCursor
    -boolean hasMore
    +getPosts() List~Post~
    +getNextCursor() Optional~String~
    +hasMore() boolean
  }

  FeedService --> FollowGraph
  FeedService --> User
  FeedService --> Post
  FeedService --> FeedCursor
  FeedService --> FeedPage
  Post --> PostVisibility`;

const SOCIAL_FEED_SEQUENCE_DIAGRAM = `sequenceDiagram
  autonumber
  actor Regular as Regular Author
  actor Celeb as Celebrity Author
  participant Svc as FeedService
  participant Graph as FollowGraph
  participant Store as PostStore
  actor Reader as Follower User

  Note over Regular,Svc: Scenario A: Fan-Out on WRITE (Push)
  Regular->>Svc: publishPost(author, content)
  Svc->>Store: save(post)
  Svc->>Graph: isCelebrity(author)? -> false
  Svc->>Graph: getFollowers(author)
  Graph-->>Svc: [Reader, ...]
  Svc->>Svc: push to Reader inbox list
  Svc-->>Regular: Post created

  Note over Celeb,Svc: Scenario B: Fan-Out on READ (Pull)
  Celeb->>Svc: publishPost(celeb, content)
  Svc->>Store: save(post)
  Svc->>Graph: isCelebrity(celeb)? -> true
  Note over Svc: Do NOT push to millions of inboxes!
  Svc->>Svc: append to Celeb outbox list only
  Svc-->>Celeb: Post created

  Note over Reader,Svc: Scenario C: Feed Retrieval & Merge
  Reader->>Svc: getFeed(readerId, cursor, pageSize)
  Svc->>Svc: fetch posts from Reader inbox (Push posts)
  Svc->>Graph: getFollowees(readerId)
  loop For each followed celebrity
    Svc->>Svc: pull recent posts from Celeb outbox
  end
  Svc->>Svc: merge, deduplicate, filter privacy & unfollowed
  Svc->>Svc: sort reverse-chronological & apply cursor
  Svc-->>Reader: FeedPage(posts, nextCursor, hasMore)`;

export const LLD_DEEP_F3_SOCIAL_FEED: LldDeep = {
  walkthrough: SOCIAL_FEED_WALKTHROUGH,
  classDiagram: SOCIAL_FEED_CLASS_DIAGRAM,
  sequenceDiagram: SOCIAL_FEED_SEQUENCE_DIAGRAM,
  stateDiagram: `stateDiagram-v2
    [*] --> DRAFT: Post composed
    DRAFT --> REGULAR_PUSH: Author followerCount < threshold
    DRAFT --> CELEBRITY_PULL: Author followerCount >= threshold
    REGULAR_PUSH --> PUBLISHED: Pushed to follower inboxes
    CELEBRITY_PULL --> PUBLISHED: Saved to outbox only
    PUBLISHED --> MERGED_FEED: Follower requests home feed
    MERGED_FEED --> [*]: Returned to client with pagination cursor`,
  extraDiagrams: [
    {
      title: "Hybrid fan-out decision architecture",
      source: `flowchart TD
        Author["Author creates Post"] --> Check{"Follower count >= celebrityThreshold?"}
        Check -- No (Regular user) --> Push["FAN-OUT ON WRITE: Deliver post ID to all follower inboxes immediately"]
        Check -- Yes (Celebrity) --> Pull["FAN-OUT ON READ: Write to author outbox only (Skip broadcast push)"]
        Push --> Done["Post Available"]
        Pull --> Done
        Done -.-> Query["Follower queries Feed"]
        Query --> Merge["Merge: Follower Inbox + Followed Celebrity Outboxes"]
        Merge --> Filter["Filter: Privacy + Follow status + Cursor bounds"]
        Filter --> Sort["Sort: Reverse chronological order"]
        Sort --> Client["Return FeedPage to Client"]`,
    },
    {
      title: "Cursor-based pagination stability",
      source: `flowchart LR
        P1["Page 1: Posts 1-3"] --> C1["Cursor: (T_3, ID_3)"]
        C1 --> P2["Page 2: Posts 4-6 (strictly older than T_3)"]
        C2["New post arrives at T_0 (top)"] -. No impact on .-> P2`,
    },
  ],
  concurrency: [
    "ConcurrentHashMap indices: User registries, follow graphs, post lookups, and timeline maps operate concurrently without global locks.",
    "Synchronized timeline updates: Inbox and outbox append operations use synchronized list blocks, preventing ConcurrentModificationException during concurrent reads.",
    "Non-blocking cursor queries: Timeline reads operate on snapshots of post identifiers, allowing continuous publishing while users paginate.",
    "Atomic identifier generation: AtomicLong sequence counters generate monotonic, collision-free post and cursor identifiers across threads.",
  ],
};

// =====================================================================
// Aggregated Export
// =====================================================================

export const LLD_DEEP_F3: Record<string, LldDeep> = {
  "lldp-inventory": LLD_DEEP_F3_INVENTORY,
  "lldp-social-feed": LLD_DEEP_F3_SOCIAL_FEED,
};
