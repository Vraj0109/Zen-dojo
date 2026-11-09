import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the food delivery project in lld-projects-d-food.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const FOOD_GUIDE: LldGuide = {
  requirements: [
    "Customers order from a restaurant's menu; the restaurant accepts or rejects; a courier is found, picks the food up and delivers it.",
    "An order moves through PLACED, ACCEPTED, PREPARING, READY, PICKED_UP and DELIVERED (or REJECTED or CANCELLED), and only legal moves are allowed.",
    "Matching: offer the order to one courier at a time with a deadline; on decline or timeout try the next; widen the search radius when nobody is near.",
    "A courier must never be given two orders at once, however many orders are looking for one.",
    "Cancellation refunds depend on the state. Delivery fee depends on distance and on demand against supply.",
  ],
  entities: [
    "Restaurant (menu, sold-out items, open flag), MenuItem, Order (lines, status, history), OrderStatus (transition table)",
    "Courier (AtomicReference status), CourierStatus, Location",
    "MatchingStrategy (NearestFirst, BalancedScore), Dispatcher (offers, deadlines, radius), Offer",
    "FeePolicy (DistanceFee), PaymentGateway, DeliveryService (facade), DeliveryListener",
  ],
  patterns: [
    "State machine as a transition table",
    "Strategy for matching and for the fee",
    "Compare-and-set on the courier status, so offering is atomic without a lock",
    "Offer with a deadline, driven by an injected clock",
    "Observer for notifications; result codes for expected refusals",
  ],
  code: `enum OrderStatus {
  PLACED, ACCEPTED, PREPARING, READY, PICKED_UP, DELIVERED, REJECTED, CANCELLED;
  private static final Map<OrderStatus, Set<OrderStatus>> NEXT = new EnumMap<>(OrderStatus.class);
  static {
    NEXT.put(PLACED, EnumSet.of(ACCEPTED, REJECTED, CANCELLED));
    NEXT.put(ACCEPTED, EnumSet.of(PREPARING, CANCELLED));
    NEXT.put(PREPARING, EnumSet.of(READY, CANCELLED));
    NEXT.put(READY, EnumSet.of(PICKED_UP, CANCELLED));
    NEXT.put(PICKED_UP, EnumSet.of(DELIVERED));
    /* DELIVERED, REJECTED, CANCELLED: no moves */
  }
  boolean canMoveTo(OrderStatus next) { return NEXT.get(this).contains(next); }
}

final class Courier {
  private final AtomicReference<CourierStatus> status = new AtomicReference<>(CourierStatus.AVAILABLE);
  boolean tryOffer() { return status.compareAndSet(CourierStatus.AVAILABLE, CourierStatus.OFFERED); }
  boolean confirm()  { return status.compareAndSet(CourierStatus.OFFERED, CourierStatus.BUSY); }
}

interface MatchingStrategy { List<Courier> rank(Location pickup, List<Courier> candidates); }`,
  extensions: [
    "Batching: one courier carries two orders from the same area; a new MatchingStrategy plus a capacity on the courier.",
    "Real ETA from a routing service instead of straight-line distance, behind the same strategy.",
    "Ratings and tips after delivery as a listener on the DELIVERED event.",
    "Scheduled orders: PLACED with a start time, and dispatch only starts shortly before it.",
  ],
};

export const FOOD_EXTRA: LldExtra = {
  recap: [
    "The order is a state machine whose legal moves are one table. Every change goes through moveTo, so there is a single place that enforces them.",
    "Dispatch offers to one courier at a time with a 30 second deadline. A decline, a timeout or a lost race moves to the next courier; an empty radius is doubled up to a limit.",
    "A courier is claimed with compare-and-set (AVAILABLE to OFFERED to BUSY), so two orders can never both hold the same courier.",
    "Refunds depend on how far the order got: everything before cooking, half during, nothing once it is ready or on the road.",
  ],
  flow: [
    "Asha places an order. The service checks the restaurant, the items and the stock, computes the fee from distance and demand, charges, and stores the order as PLACED.",
    "The restaurant accepts. moveTo(ACCEPTED) is allowed by the table, and the Dispatcher starts: it lists couriers in 3 km, ranks them and offers the order to the first.",
    "The first courier declines, the next one does not answer for 30 seconds, and a tick passes the offer on. The third accepts: the courier goes OFFERED to BUSY and the order records the courier id.",
    "The restaurant marks PREPARING and READY. The courier picks up and delivers, and the courier becomes AVAILABLE again.",
    "If Asha cancels while the food is being cooked, the table allows it, half the total is refunded, and the courier is released.",
  ],
  edgeCases: [
    "An answer from a courier who was not offered, an answer exactly at the deadline, an offer to a courier who went offline.",
    "Nobody within 12 km (the order waits and the next tick tries again), a courier who comes online later.",
    "Twenty orders accepted at the same moment with one courier; forty threads offering the same courier.",
    "Cancel in every state, reject by the restaurant, a wrong customer, a wrong courier, delivering twice.",
    "Sold-out item, closed restaurant, quantity zero, a declined payment (nothing is stored).",
  ],
};

export const FOOD_DEEP: Record<string, LldDeep> = {
  "lldp-food-cab": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `A food delivery app has three kinds of user (customers, restaurants and couriers) and one thing that moves between them: the order. The interview is mostly about that order. What states does it pass through, who can move it, and what happens when something goes wrong in the middle, such as a courier who does not answer or a customer who cancels?

Ask about the flow. Does the restaurant accept every order, or can it reject? When does the courier search start, at acceptance or when the food is ready? Does one courier carry one order or several? How is a courier chosen: nearest, best rated, something else? Can the customer cancel and how much do they get back? How is the delivery fee decided, and is there a surge when there are too many orders? Is payment in scope? What if nobody is near?

The requirements we fix are in the guide above. We start the courier search when the restaurant accepts, so the courier can arrive while the food is being cooked. One courier carries one order. The two hard parts to design are the order lifecycle and the matching, which together answer the question that interviewers care about most: what stops two orders from taking the same courier?

Say what is simplified: a flat map in kilometres instead of coordinates and a road network, a fake payment gateway, and straight-line distance as the estimate of travel time. Each of them is behind an interface or a single class, so a real one can replace it.`,
      },
      {
        title: "The order as a state machine",
        body: `An order moves through PLACED, ACCEPTED, PREPARING, READY, PICKED_UP and DELIVERED. It can also end as REJECTED (the restaurant refuses) or CANCELLED. The tempting implementation is a status field and an if-ladder in every method: if it is PLACED then accept, else if... Each new state or rule edits every ladder.

OrderStatus makes the legal moves data. It is an enum, and a table maps each state to the set of states it may go to. PLACED may go to ACCEPTED, REJECTED or CANCELLED. ACCEPTED, PREPARING and READY may go forward or be CANCELLED. PICKED_UP may only go to DELIVERED, because once the food is on the road it cannot be called back. DELIVERED, REJECTED and CANCELLED are final and have no moves. canMoveTo and isFinal read the table, and a test pins every cell that matters.

Order.moveTo(next, now) is the only way to change the status. It is synchronized on the order, checks the table, changes the status and appends a line to the history, for example 5000 PREPARING. If the move is illegal it returns false, and the service answers WRONG_STATE. That one method is the whole enforcement, so a new rule, such as a cooking-to-cancelled limit, is one line in the table.

DeliveryService wraps each change in synchronized(order), so two events for the same order, for example a customer cancelling at the moment the restaurant marks it ready, are decided one after the other, and exactly one wins. The loser sees the order in the new state and gets WRONG_STATE, which is a correct answer.

Each action also publishes an event: PLACED, ACCEPTED, OFFERED, COURIER_ASSIGNED, PICKED_UP, DELIVERED. Notifications and analytics subscribe to this stream, and the service knows none of them.`,
      },
      {
        title: "Matching: strategy and offers with deadlines",
        body: `Finding a courier has two separate parts. Ranking answers who is the best candidate, and offering answers how to ask them. Ranking is a strategy. MatchingStrategy has one method, rank(pickup, candidates), that returns the couriers from best to worst. NearestFirst sorts by distance to the restaurant with ties broken by id. BalancedScore subtracts half a kilometre per rating point, so a courier rated 5.0 who is 300 metres further than a courier rated 3.0 goes first. Both are tested with the same candidates, and the results differ. Batching or an ETA from a routing service are more classes, and the dispatcher is unchanged.

Offering is the Dispatcher. For each order that is searching it keeps a queue of ranked couriers, the set already tried, the current search radius and the current offer. The loop is: take the next courier, try to claim them, and if that works make an offer valid for 30 seconds. If the courier accepts, the order has a courier. If they decline, or the deadline passes, the dispatcher records them as tried and moves on. It never asks the same courier twice for the same order.

When the queue is empty the dispatcher lists the available couriers within the radius that have not been tried. If there are none, the radius doubles from 3 km to 6 and then 12, and a RADIUS_WIDENED event is published. At 12 km with nobody, it stops and waits: every tick tries again, so a courier who comes online later picks the order up.

Time is injected. respond() refuses an answer at or after the deadline, and tick() moves expired offers on. The test advances a ManualClock by 30 seconds and checks both. No thread sleeps and no timer runs, so the sequence of offers is deterministic. In production a scheduler calls tick() every second or two.`,
      },
      {
        title: "Atomic claims: why a courier is never double-booked",
        body: `Suppose twenty orders have just been accepted and all are looking at the same single free courier. Each runs the dispatch loop, and each sees the courier as AVAILABLE. If the code were: if courier is available, then mark them offered, two threads can both pass the check before either marks. Both orders would think they hold the courier.

The fix is to make check and change one atomic step, and for a single field that does not need a lock. Courier keeps its status in an AtomicReference, and every change is a compare-and-set. tryOffer is compareAndSet(AVAILABLE, OFFERED): it succeeds for exactly one caller and fails for the others, who simply try the next courier. confirm is compareAndSet(OFFERED, BUSY), which is what accepting does. release gives the courier back from either OFFERED or BUSY. No thread can leave the courier in a state that two orders believe in.

The tests show it at two levels. Forty threads call tryOffer on one courier and exactly one gets true. Then twenty whole orders are accepted by twenty threads at the same moment, with one courier in the system, and exactly one order ends with that courier, who is BUSY.

There is a lock in the system as well: the Dispatcher's methods are synchronized, because its queues and offers are shared state and each step is quick. This creates a possible lock-order problem with the order locks. The service takes the order's lock and then the dispatcher's lock, for example on accept and cancel. So the dispatcher must never take an order lock while it holds its own. That is why Order.courierId is volatile and assigned without synchronization: the dispatcher sets it while holding only its own lock, and the order lock is never needed inside it.

Name the alternative: a single thread that reads all events from a queue needs no locks and no CAS, and is easier to reason about, at the cost of a bottleneck that has to be partitioned by region.`,
      },
      {
        title: "Cancellation, refunds and the fee",
        body: `Cancelling is where the state machine earns its keep. DeliveryService.cancel first asks moveTo(CANCELLED), and the table says yes for PLACED, ACCEPTED, PREPARING and READY and no from PICKED_UP onward. The state before the move decides the refund: the full total up to ACCEPTED, because nothing has been cooked; half while PREPARING, because the restaurant has started work; and nothing once the order is READY, because the food exists and a courier may be waiting. The tests run every case and check both the amount recorded on the order and whether the payment gateway was asked at all, which it must not be for a refund of zero.

Cancelling also has to clean up. refundAndFree stops the dispatch, which releases a courier who holds a pending offer, and releases a courier who was already assigned. Both cases are tested: an offered courier and a busy courier go back to AVAILABLE. A rejection by the restaurant refunds in full and cleans up in the same way.

The fee is a strategy too. DistanceFee charges a base of 30 cents plus 10 cents for every started kilometre, and multiplies by one and a half when the number of open orders is higher than the number of free couriers. The surge looks at the system at the moment of placing, and the fee is stored on the order, so the customer pays what they saw. Because the fee is a strategy, a peak-hour rule or a membership discount can be added by wrapping it, as in the movie booking project.

Notice that payment is charged when the order is placed and refunded when it is cancelled or rejected. In production you would authorise first and capture at delivery, which removes most refunds. The interface here would have a third method, and the service would call it from deliver.`,
      },
      {
        title: "The main flow, step by step",
        body: `Run Main and follow it. A closed restaurant and a sold-out item are refused with their own codes. Asha orders two biryanis and four naan for 36.00, the fee is 60 cents for a 2.8 km trip (3 started kilometres), and the order is PLACED. The restaurant accepts. The dispatcher lists the couriers within 3 km, ranks them nearest first, and the first offer goes to Chirag at 0.7 km. Chirag declines and the offer goes to Chitra, who does not answer. After 31 seconds a tick expires her offer. Nobody else is within 3 km, so the radius widens to 6 and then to 12, and Chaitra at 9 km gets the offer and accepts. The order has its courier.

Then the restaurant marks the order PREPARING and READY. A pick-up by the wrong courier is refused as NOT_THE_COURIER. The right courier picks up, and a cancel at this point is refused because an order on the road cannot be cancelled. The courier delivers and becomes available. The history of the first order lists six steps with times, the last one 31000 DELIVERED.

A second order is cancelled while it is being cooked and refunds half, 2.30 of 4.60. A third is rejected by the restaurant and refunded in full. The first events in the stream show the order of things: PLACED, ACCEPTED, OFFERED, OFFER_DECLINED, OFFERED, OFFER_EXPIRED.

The tests cover what Main does not print: every validation code, the ranking strategies, a late answer, the radius, a courier who goes offline and comes back, and the two concurrency tests.`,
      },
      {
        title: "Edge cases, extensions and what interviewers probe",
        body: `Edge cases worth naming: the restaurant accepts and then nobody is near; a courier goes offline with an offer open; an order is cancelled between the moment a courier is offered and the moment they accept; the customer and the restaurant act on the same order at the same time; a payment that is declined must not leave an order behind; a tick that fires exactly at a deadline.

Extensions fit without changes to the core. Batching two orders for one courier is a new MatchingStrategy and a capacity on the courier. A real ETA replaces the straight-line distance behind the same strategy. Tips and ratings are listeners on DELIVERED. Scheduled orders are PLACED with a start time, and the dispatch starts shortly before it. Live tracking is the courier's location, already a volatile field, published as events. Restaurant capacity (a busy kitchen) is an extra check in acceptance.

Probes, with short answers. Why a transition table and not an if-ladder? Rules are data, so adding one is one line and a test. Why offer to one courier at a time? It avoids two couriers racing to the same pickup, and it is fair to the ranking. What are the downsides? It is slower when many decline, and the alternative is to offer to a small group and take the first accept, using the same compare-and-set to pick the winner. Why compare-and-set and not a lock? One field and one condition: a CAS is the smallest correct tool. How would it scale? Dispatch is local to a region, so partition the dispatchers by city or by geohash, and keep each partition single-threaded if you want to avoid locks altogether. What if the server restarts during a dispatch? The search state is derived from orders in ACCEPTED without a courier, so it can be rebuilt on start.`,
      },
    ],
    classDiagram: `classDiagram
    class DeliveryService {
        +placeOrder(customerId, restaurantId, dropoff, lines) DeliveryResult
        +accept(orderId) DeliveryResult
        +reject(orderId) DeliveryResult
        +startPreparing(orderId) DeliveryResult
        +markReady(orderId) DeliveryResult
        +pickUp(orderId, courierId) DeliveryResult
        +deliver(orderId, courierId) DeliveryResult
        +cancel(customerId, orderId) DeliveryResult
        +offerAnswer(orderId, courierId, accept) boolean
        +tick()
    }
    class Order {
        id
        itemsCents
        feeCents
        +moveTo(next, now) boolean
        +history() List
    }
    class OrderStatus {
        <<enumeration>>
        PLACED
        ACCEPTED
        PREPARING
        READY
        PICKED_UP
        DELIVERED
        REJECTED
        CANCELLED
        +canMoveTo(next) boolean
    }
    class Dispatcher {
        +start(order)
        +respond(orderId, courierId, accept) boolean
        +tick()
        +stop(orderId)
    }
    class Courier {
        id
        rating
        +tryOffer() boolean
        +confirm() boolean
        +release() boolean
    }
    class MatchingStrategy {
        <<interface>>
        +rank(pickup, candidates) List
    }
    class FeePolicy {
        <<interface>>
        +fee(km, openOrders, freeCouriers) int
    }
    class PaymentGateway {
        <<interface>>
        +charge(customerId, cents, key) String
        +refund(ref, cents)
    }
    class Restaurant {
        menu
        soldOut
        open
    }
    class DeliveryListener {
        <<interface>>
        +onEvent(type, orderId, detail)
    }
    DeliveryService --> Dispatcher
    DeliveryService --> Order
    DeliveryService --> Restaurant
    DeliveryService --> FeePolicy
    DeliveryService --> PaymentGateway
    DeliveryService --> DeliveryListener
    Order --> OrderStatus
    Dispatcher --> MatchingStrategy
    Dispatcher --> Courier
    MatchingStrategy <|.. NearestFirst
    MatchingStrategy <|.. BalancedScore
    FeePolicy <|.. DistanceFee`,
    sequenceDiagram: `sequenceDiagram
    actor Restaurant
    participant S as DeliveryService
    participant D as Dispatcher
    participant M as MatchingStrategy
    participant C1 as Courier Chirag
    participant C2 as Courier Chitra
    Restaurant->>S: accept(O1)
    S->>S: moveTo(ACCEPTED)
    S->>D: start(order)
    D->>M: rank(pickup, couriers within 3 km)
    M-->>D: Chirag, Chitra
    D->>C1: tryOffer() compare-and-set
    C1-->>D: true
    D-->>C1: offer valid 30 seconds
    C1->>D: respond(decline)
    D->>C1: release()
    D->>C2: tryOffer()
    C2-->>D: true
    D-->>C2: offer valid 30 seconds
    C2->>D: respond(accept)
    D->>C2: confirm()
    D-->>S: courier assigned`,
    stateDiagram: `stateDiagram-v2
    [*] --> PLACED
    PLACED --> ACCEPTED: restaurant accepts
    PLACED --> REJECTED: restaurant rejects, full refund
    PLACED --> CANCELLED: customer cancels, full refund
    ACCEPTED --> PREPARING: cooking starts
    ACCEPTED --> CANCELLED: customer cancels, full refund
    PREPARING --> READY: food is ready
    PREPARING --> CANCELLED: customer cancels, half refund
    READY --> PICKED_UP: courier picks up
    READY --> CANCELLED: customer cancels, no refund
    PICKED_UP --> DELIVERED: courier delivers`,
    extraDiagrams: [
      {
        title: "Courier states",
        caption: "Every change is a compare-and-set, so a courier is in exactly one state that all threads agree on.",
        source: `stateDiagram-v2
    [*] --> AVAILABLE
    AVAILABLE --> OFFERED: tryOffer
    OFFERED --> BUSY: confirm, courier accepts
    OFFERED --> AVAILABLE: release, decline or timeout or cancel
    BUSY --> AVAILABLE: release, delivered or cancelled
    AVAILABLE --> OFFLINE: goOffline
    OFFLINE --> AVAILABLE: goOnline`,
      },
      {
        title: "The dispatch loop",
        caption: "Take the next ranked courier. If the queue is empty, list couriers in the radius and widen the radius when there are none.",
        source: `flowchart TD
    S["step(order)"] --> Q{"Queue empty?"}
    Q -- no --> N["Take the next courier"]
    Q -- yes --> L["List AVAILABLE couriers within the radius, not tried"]
    L --> E{"Any?"}
    E -- no --> R{"Radius at 12 km?"}
    R -- no --> W["Double the radius, event RADIUS_WIDENED"]
    W --> L
    R -- yes --> WAIT["Wait for the next tick"]
    E -- yes --> RK["Rank with the strategy, fill the queue"]
    RK --> N
    N --> T{"tryOffer succeeds?"}
    T -- no --> S
    T -- yes --> O["Offer valid for 30 seconds"]`,
      },
      {
        title: "An offer with a deadline",
        caption: "Three ways an offer ends. The clock is injected, so tests move it instead of waiting.",
        source: `flowchart TD
    O["Offer to courier, expires at t + 30 s"] --> A{"What happens first?"}
    A -- "courier accepts before t + 30" --> OK["confirm: BUSY, order has a courier"]
    A -- "courier declines" --> D["release, remember as tried, next courier"]
    A -- "tick at or after t + 30" --> X["release, remember as tried, next courier"]`,
      },
      {
        title: "Two orders, one courier",
        caption: "Compare-and-set lets exactly one order claim the courier. The other order moves on without any lock.",
        source: `sequenceDiagram
    participant A as Order A thread
    participant B as Order B thread
    participant C as Courier status
    A->>C: compareAndSet(AVAILABLE, OFFERED)
    B->>C: compareAndSet(AVAILABLE, OFFERED)
    C-->>A: true
    C-->>B: false
    Note over B: tries the next courier or waits
    A->>C: compareAndSet(OFFERED, BUSY) after accept`,
      },
      {
        title: "Refund by state",
        caption: "How far the order got decides what comes back.",
        source: `flowchart TD
    X["cancel by the customer"] --> S{"State before the move"}
    S -- "PLACED or ACCEPTED" --> F["Refund 100 percent"]
    S -- PREPARING --> H["Refund 50 percent"]
    S -- READY --> N["Refund nothing"]
    S -- "PICKED_UP, DELIVERED, final" --> W["WRONG_STATE, no change"]
    F --> C["Stop dispatch, release the courier, CANCELLED"]
    H --> C
    N --> C`,
      },
      {
        title: "Surge fee",
        caption: "The fee is decided when the order is placed and stored on it.",
        source: `flowchart LR
    I["distance in km, open orders, free couriers"] --> B["base = 30 + 10 per started km"]
    B --> D{"Open orders more than free couriers?"}
    D -- yes --> S["fee = base times 1.5"]
    D -- no --> P["fee = base"]`,
      },
      {
        title: "Object snapshot during the search",
        caption: "Order O1 has been accepted. The first offer was declined, the second is open.",
        source: `flowchart LR
    O["Order O1: ACCEPTED, no courier yet"] --> P["Dispatch state"]
    P --> T["tried: c2"]
    P --> CU["current offer: c1 until t + 30 s"]
    P --> R["radius 3 km"]
    C1["Courier c1: OFFERED"] --> CU
    C2["Courier c2: AVAILABLE"] --> T
    C3["Courier c3: AVAILABLE, 9 km away"] --> R`,
      },
      {
        title: "Where the extensions attach",
        caption: "Each follow-up question lands in one place.",
        source: `flowchart TD
    X["Follow-up questions"] --> B["Batching orders"]
    X --> E["Real ETA"]
    X --> T["Tips and ratings"]
    X --> SC["Scheduled orders"]
    B --> B1["New MatchingStrategy, capacity on Courier"]
    E --> E1["MatchingStrategy that calls a routing service"]
    T --> T1["Listener on DELIVERED"]
    SC --> SC1["Start time on Order, Dispatcher starts later"]`,
      },
    ],
    concurrency: [
      "The courier status is an AtomicReference with compare-and-set transitions. Offering a courier to two orders at once is impossible: exactly one compare-and-set succeeds.",
      "Every status change of an order is one synchronized(order) block around moveTo, so a customer cancelling and a restaurant marking ready at the same instant are decided one after the other.",
      "The Dispatcher is synchronized as a whole: its state is small and a step is quick. It never takes an order lock while holding its own, which is why the order's courier id is volatile. The service takes order then dispatcher, never the reverse.",
      "Offer deadlines use the injected clock, and expiry happens in tick(), so no timer thread has to be started, stopped or tested.",
      "Events are published on the calling thread. Listeners must be fast, and in production they put the event on a queue.",
      "Scale: dispatch is local to a region, so run one dispatcher per city or geohash. Inside a partition you can make it single-threaded and drop the locks.",
    ],
  },
};
