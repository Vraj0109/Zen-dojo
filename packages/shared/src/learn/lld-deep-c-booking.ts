import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the movie ticket booking project in lld-projects-c-booking.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const BOOKING_GUIDE: LldGuide = {
  requirements: [
    "Search shows of a movie in a city. See a seat map of one show with seats free, held or sold.",
    "Pick up to 6 seats. They are held for a few minutes while the customer pays; nothing is charged yet.",
    "Two customers must never get the same seat, and a request for several seats is all or nothing.",
    "Pay to confirm. A declined card leaves the hold in place. A slow payment must not lose the seats. An expired hold frees them.",
    "Cancel: a held booking just frees the seats; a paid one is refunded by a policy that depends on how close the show is. Pricing has rules (seat category, weekend evening, coupon).",
  ],
  entities: [
    "Movie, Show (movie, screen, time, prices), Screen (seat layout), Seat (SeatId, category)",
    "ShowSeats (per show seat states, the lock), SeatState (AVAILABLE, HELD, BOOKED)",
    "Booking (HELD, PAYING, CONFIRMED, CANCELLED, EXPIRED), BookingService (facade), BookingResult",
    "PricingStrategy (CategoryPricing, PeakSurcharge, CouponDiscount), PaymentGateway, RefundPolicy, BookingListener",
  ],
  patterns: [
    "Per-show lock: the check and the change of seats are one atomic step",
    "Hold with expiry (a lease), driven by an injected clock",
    "Decorator for stacking price rules; Strategy for refund policy",
    "Observer for notifications; idempotency key for the payment",
    "Three-step confirm: pin under the lock, pay outside it, record under it",
  ],
  code: `final class ShowSeats {
  private final Map<SeatId, SeatState> states = new TreeMap<>();

  synchronized List<SeatId> holdAll(List<SeatId> wanted, String bookingId, long until) {
    List<SeatId> taken = new ArrayList<>();
    for (SeatId id : wanted) if (states.get(id).kind != SeatState.Kind.AVAILABLE) taken.add(id);
    if (!taken.isEmpty()) return taken;               // all or nothing: change nothing
    for (SeatId id : wanted) { SeatState s = states.get(id); s.kind = SeatState.Kind.HELD; s.bookingId = bookingId; s.holdUntil = until; }
    return taken;
  }

  synchronized List<String> sweep(long now) {         // expire holds
    List<String> expired = new ArrayList<>();
    for (SeatState s : states.values())
      if (s.kind == SeatState.Kind.HELD && s.holdUntil <= now) { expired.add(s.bookingId); s.kind = SeatState.Kind.AVAILABLE; }
    return expired;
  }
}

BookingResult confirm(String userId, String bookingId) {
  synchronized (stock) { /* still HELD? pin the hold, status = PAYING */ }
  String ref = payments.charge(userId, b.amountCents(), b.id());   // slow call, no lock held
  synchronized (stock) { /* ref == null: back to HELD, else mark seats BOOKED, CONFIRMED */ }
}`,
  extensions: [
    "Seat map pushes to browsers: a BookingListener that publishes seat changes to a websocket topic.",
    "Group discounts, member prices and gift cards are more PricingStrategy decorators.",
    "Several servers: the per-show lock becomes a row lock or a compare-and-set in the database (see the walkthrough).",
    "Waiting list for a sold-out show, notified when a hold expires or a booking is cancelled.",
  ],
};

export const BOOKING_EXTRA: LldExtra = {
  recap: [
    "The core problem is concurrency on seats: check and change must be one atomic step per show, and a multi-seat request is all or nothing.",
    "A hold is a lease with an expiry time. Nothing needs a cleaner thread: an expired hold is swept lazily before each hold and by a periodic call.",
    "Confirm is three steps: pin the hold under the lock, call the slow payment outside it, record the result under the lock again.",
    "Pricing is a decorator chain, refunds are a strategy keyed on time to show, and everything that needs time takes an injected clock.",
  ],
  flow: [
    "Asha asks for A1, A2 and A3 of the Sunday show. BookingService validates the labels, sweeps expired holds, and calls ShowSeats.holdAll in one synchronized step.",
    "All three seats were free, so they become HELD until now plus five minutes, and a Booking with the price from the pricing chain is stored. The event HELD is published.",
    "Ben asks for A3 and A4. holdAll sees that A3 is not available, changes nothing and returns the taken seat, so Ben gets SEATS_TAKEN with a conflict list.",
    "Asha pays. confirm pins the hold and sets PAYING, calls the gateway with the booking id as the idempotency key, then marks the seats BOOKED and the booking CONFIRMED.",
    "If she cancels 30 hours before the show, TieredRefundPolicy says 100 percent, the gateway refunds, the seats are released and a CANCELLED event goes out.",
  ],
  edgeCases: [
    "Two threads want the same seat, or overlapping sets of seats, at the same moment: exactly one wins and nobody holds a partial set.",
    "Payment declined (hold stays), payment slower than the hold time (pinned), the Pay button clicked twice (one charge), hold expired before Pay.",
    "Cancel a held booking, a paid booking at each refund tier, cancel twice, cancel after expiry, someone else's booking id.",
    "More than 6 seats, the same seat twice, a seat that does not exist, a show that has already started, a coupon above 100 percent.",
  ],
};

export const BOOKING_DEEP: Record<string, LldDeep> = {
  "lldp-booking": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `Movie ticket booking looks like a CRUD problem and is really a concurrency problem. Two people open the same seat map and both click seat A5. A good design makes sure that exactly one of them gets it, whatever the timing, and that nobody ends up with two of the three seats they asked for.

Ask about scope first. Is it one theatre or many, and do we model search by city and movie? Are seats numbered, with categories and different prices? How many seats can one booking take? Is payment in scope, or do we call a provider? Do seats stay reserved while the customer types their card number, and for how long? What happens when payment fails, or takes a long time? Can the customer cancel, and is there a refund? Is the system one server or many?

The requirements we fix are in the guide: search shows, a seat map, up to 6 seats per booking, a hold of a few minutes, pay to confirm, cancel with a refund policy, and pricing rules. Concurrency is the central requirement, so it decides the design: all seat changes of one show go through one object with one lock, and every other class is plain and immutable wherever it can be.

Two decisions to state aloud. First, expected failures are results, not exceptions: seats taken, hold expired and payment declined are what customers cause by clicking, so BookingService returns a BookingResult with a status code. Second, time is an input. The hold expiry, refund tiers and peak pricing all depend on the clock, and the clock is an interface, so a test can move it.`,
      },
      {
        title: "Entities and the seat map",
        body: `Movie is a record of an id, a title and a length. Screen is a physical room: a sorted map from SeatId to Seat. A SeatId is a record of a row letter and a number, which gives equality, hashing and printing (A5) for free, and it implements Comparable so a seat map prints in a stable order. A Seat has an id and a category: REGULAR, PREMIUM or RECLINER. Screen.grid builds a layout where the last rows are recliners and the rows before them are premium. A screen never changes after it is built, so any thread can read it.

Show is a screening: a movie, a theatre and city, a screen, a start time and a price per category in cents. The same screen has many shows, and each show has its own seat states. That is the key modelling point: the layout belongs to the screen, the availability belongs to the show. Mixing them up is the most common mistake in this problem, because it makes seat A5 sold for all evening shows at once.

Catalog holds shows and answers search by title, city and a start time later than now, earliest first. It is read often and written rarely, so a concurrent map is enough.

ShowSeats is the per-show inventory: a map from SeatId to SeatState, where a state is AVAILABLE, HELD (with the booking id and an expiry time) or BOOKED (with the booking id). Booking is the customer's claim: id, user, show, the seats, the price at the time of holding, the hold deadline and a status. BookingStatus has five values: HELD, PAYING, CONFIRMED, CANCELLED and EXPIRED. Money is in integer cents everywhere, because floating point and money do not mix.`,
      },
      {
        title: "The core: one atomic step per show",
        body: `The bug every candidate must avoid is check then act. Read the seat state, see AVAILABLE, then set it to HELD. Between the read and the write another thread can do the same, and both succeed. The fix is to make the check and the change one atomic step.

ShowSeats does this with synchronized methods. holdAll receives the wanted seats, checks that every one is AVAILABLE, and only if all are, changes all of them to HELD. If any is not, it changes nothing and returns the list of seats that were taken. So a request for A2, A3 and A4 when A3 is taken leaves A2 and A4 free and tells the customer exactly which seat is the problem. That is the all or nothing rule, and the test for it checks that A2 is still available afterwards.

Why one lock per show and not one lock for everything? Customers of different shows never compete, so a global lock would make them wait for each other for no reason. Why not one lock per seat? A booking of three seats would need three locks in a fixed order to avoid deadlock, and it gains almost nothing, because a show has a few hundred seats and a booking takes microseconds. The per-show lock is the simplest thing that is correct and fast enough. Say so, and mention the alternative: lock the seats in sorted order, which is why SeatId is Comparable.

The method holds nothing slow. It does no I/O and calls nobody. That rule matters for everything else: a lock must never be held while calling a payment provider.`,
      },
      {
        title: "Holds with an expiry",
        body: `A hold is a lease. The customer gets the seats for five minutes, and if they do not pay in that time the seats go back on sale. Where does the cleanup run? A background thread that wakes up every second is one option, but it needs lifecycle management, and it is hard to test. This design uses lazy expiry: every HELD seat remembers its deadline, and ShowSeats.sweep(now) frees all seats whose deadline is at or before now. BookingService calls it before every hold, confirm, cancel and seat map read, and an optional expireAll() can be called by a scheduler. Sweeping marks the bookings that lost their seats as EXPIRED and publishes an event.

Two details deserve attention. The deadline is inclusive: at the exact expiry time the seats are free. The test checks one millisecond before and exactly at expiry. And the sweep and the booking status change happen together under the show's lock. Without that, a confirm could slip in between the two steps, find a booking still marked HELD whose seats were already freed, and sell seats it no longer holds. The code has a comment on exactly this.

The clock is the injected TimeSource. The test moves a ManualClock by five minutes and checks the result at once. No test sleeps, so none is slow and none can flake. If you are asked how this works with several servers: put the deadline in the database row and make the sweep a conditional update, because then every server agrees on what is expired.`,
      },
      {
        title: "Confirming: three steps and a pin",
        body: `Paying is where a naive design breaks. The obvious code is: lock, check the hold, call the payment provider, mark the seats sold, unlock. It is correct, but it holds the show's lock during a network call that may take seconds, and every other customer of that show waits. The opposite shortcut, unlock before the call, has a different bug: the hold may expire while the payment is in flight, another customer takes the seats, and the first customer has paid for seats they do not have.

The answer is three steps. Step one, under the lock: sweep, check that the booking is HELD, then pin the hold and set the status to PAYING. Pinning sets the deadline of its seats to infinity, so no sweep will free them while we pay. Step two, outside the lock: charge the provider, with the booking id as the idempotency key so that a retry cannot charge twice. Step three, under the lock again: if the provider declined, unpin the seats back to the original deadline and set the status back to HELD, so the customer can try another card; if it accepted, mark the seats BOOKED and the booking CONFIRMED.

There are two tests that matter. In one, the payment provider advances the clock by fifty minutes in the middle of the charge and tries to hold the same seat for another user: the second customer gets SEATS_TAKEN and the first payment succeeds. In the other, the Pay button is pressed twice: the second call sees CONFIRMED and returns OK, and the provider was charged once. A booking in the PAYING state cannot be cancelled, which is the right answer: the money is moving.`,
      },
      {
        title: "Pricing as a decorator chain, refunds as a strategy",
        body: `Prices change more often than anything else in this system. PricingStrategy has one method, price(show, seats), and the implementations wrap each other. CategoryPricing is the base: each seat costs the price its category has in this show. PeakSurcharge wraps another strategy and adds 20 percent on Friday, Saturday and Sunday evenings from 18:00. CouponDiscount wraps another strategy and takes a percentage off. Composition happens where the service is built: new CouponDiscount(new PeakSurcharge(new CategoryPricing()), 25) is a valid price rule, and BookingService has no idea what is inside. The order is meaningful, and the test shows that the coupon is applied after the surcharge.

The price is computed once, at hold time, and stored in the Booking. If the rules changed between the hold and the payment, the customer still pays the price they saw. That is a product decision you should name, because the alternative is also valid.

Refunds are a strategy for a different reason: they are policy. RefundPolicy answers one question, what percentage comes back given the time to the show. TieredRefundPolicy returns 100 percent from 24 hours before, 50 percent from 4 hours, and nothing after that. cancel computes the refund from the booking's price, asks the provider to refund that amount (only when it is more than zero) and records it on the booking. A held booking cancels without a refund call, since nothing was charged.

Both strategies are tested without a service: build a Show, call price, and compare. That is what a strategy buys you.`,
      },
      {
        title: "Testing and concurrency, step by step",
        body: `Follow Main first. Asha holds A1, A2 and A3 for 3000. Ben asks for A3 and A4 and gets SEATS_TAKEN with A3 listed, then asks for A4 alone and succeeds. Seven seats give TOO_MANY_SEATS and Z9 gives UNKNOWN_SEAT. Asha's card is declined and the booking goes back to HELD; the second attempt succeeds. Chen holds two recliners, six minutes pass, and his payment is refused with HOLD_EXPIRED while H1 is free for the next customer. The weekend evening show costs 20 percent more, a coupon service gives 25 percent off, and cancelling at different distances from the show gives different refunds.

The tests are organised by risk. First the data: labels, layout and categories. Then the atomic hold: all or nothing, with the free seats of a failed request still free. Then validation, one test per bad input. Then pricing and refund tiers, which are pure functions of their inputs. Then the lifecycle: confirm, decline, expiry, pin, repeat click, ownership, cancel in each state. Last, the two races. In the first, 32 threads each hold the same seat for different users, and exactly one wins. In the second, 60 threads submit six different overlapping sets of seats, and the test checks three invariants: no seat belongs to two bookings, the seat map agrees with the winners, and every winner has all three seats.

What the tests do not mock is as important as what they do. The real ShowSeats and the real service run in every test. Only the edges are replaced: the payment provider (FakePayments or a hooked variant) and the clock. If the service called a real network, or read System.currentTimeMillis, none of this would be testable.`,
      },
      {
        title: "Going beyond one server, and what interviewers probe",
        body: `One process with a lock per show is a correct design for one server, and it is the answer to the interview question. The follow-up is always what happens with ten servers. The lock no longer works, because each server has its own memory. The seat states move to a database, and holdAll becomes a conditional update: update show_seat set status = HELD, booking = ?, until = ? where show = ? and seat in (...) and (status = AVAILABLE or until <= now), and then check that the number of rows changed equals the number of seats asked for. If it is lower, roll back. The database row lock does the job of synchronized, and the rest of the design is unchanged. An alternative is a Redis key per seat with SET NX and an expiry, which gives the lease for free, at the cost of a second system that must stay consistent with the database.

Probes, with short answers. Why not lock the whole service? It serialises unrelated shows. Why hold seats before payment? Without a hold the customer pays and then finds out the seat is gone. Why not hold forever? Abandoned carts would starve the show, hence the expiry. What if the server crashes after charging and before marking the booking confirmed? The idempotency key makes a retry safe, and a reconciliation job lists payments that have no confirmed booking. What if the customer's browser sends the request twice? The repeat confirm returns OK without a second charge. Why integer cents? Because 0.1 plus 0.2 is not 0.3. How would you add a waiting list? A listener on the EXPIRED and CANCELLED events that offers the seats to the next person.

Extensions are small by design: a new price rule is a decorator, a new refund rule is a policy class, a new notification is a listener, and a new seat type is an enum value and a price entry.`,
      },
    ],
    classDiagram: `classDiagram
    class BookingService {
        +hold(userId, showId, labels) BookingResult
        +confirm(userId, bookingId) BookingResult
        +cancel(userId, bookingId) BookingResult
        +seatMap(showId) Map
        +subscribe(listener)
    }
    class ShowSeats {
        +holdAll(seats, bookingId, until) List
        +sweep(now) List
        +pin(bookingId)
        +markBooked(bookingId)
        +release(bookingId)
    }
    class SeatState {
        kind
        bookingId
        holdUntil
    }
    class Booking {
        id
        userId
        seats
        amountCents
        status
    }
    class Show {
        <<record>>
        movie
        screen
        startMillis
        prices
    }
    class Screen {
        +seat(id) Seat
        +allSeats() List
    }
    class PricingStrategy {
        <<interface>>
        +price(show, seats) int
    }
    class PaymentGateway {
        <<interface>>
        +charge(user, cents, key) String
        +refund(ref, cents)
    }
    class RefundPolicy {
        <<interface>>
        +refundPercent(millisBefore) int
    }
    class BookingListener {
        <<interface>>
        +onEvent(event)
    }
    class Catalog
    class TimeSource {
        <<interface>>
        +nowMillis() long
    }
    BookingService --> Catalog
    BookingService --> ShowSeats
    BookingService --> Booking
    BookingService --> PricingStrategy
    BookingService --> PaymentGateway
    BookingService --> RefundPolicy
    BookingService --> BookingListener
    BookingService --> TimeSource
    ShowSeats --> SeatState
    Catalog --> Show
    Show --> Screen
    PricingStrategy <|.. CategoryPricing
    PricingStrategy <|.. PeakSurcharge
    PricingStrategy <|.. CouponDiscount
    PeakSurcharge --> PricingStrategy
    CouponDiscount --> PricingStrategy
    RefundPolicy <|.. TieredRefundPolicy
    PaymentGateway <|.. FakePayments`,
    sequenceDiagram: `sequenceDiagram
    actor Asha
    participant S as BookingService
    participant K as ShowSeats
    participant P as PricingStrategy
    participant G as PaymentGateway
    Asha->>S: hold(asha, show, A1 A2 A3)
    S->>K: sweep(now)
    S->>K: holdAll(A1 A2 A3, B1, now + 5 min)
    K-->>S: no seat was taken
    S->>P: price(show, seats)
    P-->>S: 3000
    S-->>Asha: OK, Booking B1 HELD
    Asha->>S: confirm(asha, B1)
    S->>K: pin(B1), status PAYING
    S->>G: charge(asha, 3000, key B1)
    G-->>S: payment reference
    S->>K: markBooked(B1)
    S-->>Asha: OK, Booking CONFIRMED`,
    stateDiagram: `stateDiagram-v2
    [*] --> HELD: seats held
    HELD --> PAYING: confirm called
    PAYING --> CONFIRMED: payment accepted
    PAYING --> HELD: payment declined
    HELD --> EXPIRED: hold time passed
    HELD --> CANCELLED: customer cancels
    CONFIRMED --> CANCELLED: customer cancels, refund by policy`,
    extraDiagrams: [
      {
        title: "Two customers, one seat",
        caption: "The check and the change are one synchronized step, so the second request sees HELD and loses cleanly.",
        source: `sequenceDiagram
    actor Asha
    actor Ben
    participant K as ShowSeats
    Asha->>K: holdAll(A3)
    Ben->>K: holdAll(A3)
    Note over K: one thread at a time inside the lock
    K-->>Asha: nothing taken, A3 is now HELD for Asha
    K-->>Ben: A3 was taken, nothing changed for Ben`,
      },
      {
        title: "All or nothing for several seats",
        caption: "Ben asks for A2, A3 and A4. A3 is held by Asha, so A2 and A4 stay free.",
        source: `flowchart TD
    R["holdAll for A2, A3, A4"] --> C{"Is every seat AVAILABLE?"}
    C -- "no: A3 is HELD" --> T["Change nothing, return taken seats: A3"]
    T --> E["Customer sees SEATS_TAKEN and the seat to replace"]
    C -- yes --> H["Set all three seats to HELD with the same deadline"]
    H --> OK["Booking created, event HELD"]`,
      },
      {
        title: "Confirm in three steps",
        caption: "The lock is never held during the payment call, and the hold cannot expire while the customer is paying.",
        source: `sequenceDiagram
    participant S as BookingService
    participant K as ShowSeats
    participant G as PaymentGateway
    S->>K: lock, sweep, check HELD
    S->>K: pin the hold, status PAYING
    Note over S,K: lock released
    S->>G: charge with booking id as key
    G-->>S: reference or declined
    S->>K: lock again
    alt accepted
        S->>K: markBooked, status CONFIRMED
    else declined
        S->>K: unpin to the old deadline, status HELD
    end`,
      },
      {
        title: "A hold is a lease",
        caption: "Time line of a hold that is never paid. No thread runs in the background: the next call notices.",
        source: `flowchart LR
    A["t = 0: hold, deadline = 5 min"] --> B["t = 4:59: still held"]
    B --> C["t = 5:00: deadline reached"]
    C --> D["Next hold, confirm or seat map call sweeps"]
    D --> E["Seats AVAILABLE, booking EXPIRED, event EXPIRED"]`,
      },
      {
        title: "Seat states in one show",
        caption: "A seat is released by cancel or expiry, and made final by a confirmed payment.",
        source: `stateDiagram-v2
    [*] --> AVAILABLE
    AVAILABLE --> HELD: holdAll
    HELD --> AVAILABLE: expiry or cancel
    HELD --> HELD: pin during payment
    HELD --> BOOKED: payment accepted
    BOOKED --> AVAILABLE: cancel after confirmation`,
      },
      {
        title: "Price rules stack as decorators",
        caption: "The service calls one strategy. What is inside is decided where the service is built.",
        source: `flowchart LR
    S["BookingService"] --> C["CouponDiscount 25 percent"]
    C --> P["PeakSurcharge 20 percent"]
    P --> B["CategoryPricing"]
    B --> V["Show prices: regular, premium, recliner"]`,
      },
      {
        title: "Refund tiers",
        caption: "The policy depends only on how long before the show the customer cancels.",
        source: `flowchart TD
    X["cancel a CONFIRMED booking"] --> D{"Time to the show"}
    D -- "24 hours or more" --> F["Refund 100 percent"]
    D -- "4 to 24 hours" --> H["Refund 50 percent"]
    D -- "under 4 hours" --> N["Refund nothing"]
    F --> R["Gateway refund, seats released, status CANCELLED"]
    H --> R
    N --> R`,
      },
      {
        title: "Object snapshot after two bookings",
        caption: "Asha has paid for three seats, Ben holds one. Seats not shown are AVAILABLE.",
        source: `flowchart LR
    SH["Show sunday"] --> SS["ShowSeats"]
    SS --> A1["A1, A2, A3: BOOKED by B1"]
    SS --> A4["A4: HELD by B2 until 10:05"]
    B1["Booking B1: asha, 3000 cents, CONFIRMED"] --> A1
    B2["Booking B2: ben, 1000 cents, HELD"] --> A4`,
      },
      {
        title: "From one server to many",
        caption: "The same operations, but the atomic step moves into the database. The rest of the design is unchanged.",
        source: `flowchart LR
    U["Customers"] --> LB["Load balancer"]
    LB --> S1["Booking server"]
    LB --> S2["Booking server"]
    S1 --> DB["Database: show_seat rows, conditional update"]
    S2 --> DB
    S1 --> PG["Payment provider"]
    S2 --> PG
    DB --> Q["Event stream: notifications, waiting list"]`,
      },
    ],
    concurrency: [
      "All seat changes of one show go through ShowSeats, whose methods are synchronized. A show is the unit of contention, so different shows never wait for each other.",
      "holdAll checks every seat and changes all of them in one critical section: a request is all or nothing, and a failed request changes nothing.",
      "Expiry and the status change of the bookings happen under the same lock, so a confirm cannot see a HELD booking whose seats were already freed.",
      "confirm never holds the lock during the payment call. The hold is pinned first, so it cannot expire while the customer is paying, and the booking id is the idempotency key.",
      "Events from confirm, cancel and expiry are published while the lock is held, which keeps their order but means a listener must be quick. In production a listener only puts the event on a queue.",
      "Many servers: the lock becomes a conditional update on the database rows, or a Redis key per seat with SET NX and an expiry.",
    ],
  },
};
