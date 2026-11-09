---
id: lld-modeling
title: Modeling
area: lld
section: Topics
---

## Overview

Modeling turns requirements into entities, relationships and states. Good models make illegal states hard to represent and keep the core flow simple to code in 20 minutes.

## What to know

1. Entities and relationships :: Find the nouns (entities: ParkingLot, Floor, Spot, Vehicle, Ticket) and verbs (operations: park, unpark, pay). Decide ownership and cardinality (a Lot has many Floors; a Ticket references one Spot and one Vehicle), and keep relationships one-directional where possible.

2. Enums for states :: Use enums for fixed sets (VehicleType, SpotSize, OrderStatus, Direction) instead of strings or ints. The type system catches typos, and switches over them stay exhaustive.

3. State machines :: Write down the allowed transitions (CREATED → PAID → SHIPPED → DELIVERED, with CANCELLED from CREATED or PAID) and enforce them in one place, rejecting invalid ones. This is often the heart of the problem (order, elevator, vending machine, booking).

4. Validation and error handling :: Validate inputs at the boundary (amount > 0, seat exists) and fail with specific exceptions (SeatAlreadyBookedException, InsufficientFundsException) instead of returning null or false. Decide what's a checked versus a runtime error, and keep the system consistent when something fails halfway.

5. Extensibility :: Identify what's likely to change (new vehicle types, pricing rules, payment methods, notification channels) and put an interface there. Don't add abstraction for things that won't change; say why you're adding each interface.

## Recap

- Nouns → entities; verbs → methods on the class that owns the data.
- Enums for finite states; a transition table rejects illegal moves.
- Validate at boundaries; throw specific exceptions; keep objects always valid.
- Identify the extension points up front (new vehicle type, new pricing) and put interfaces there.

## Go deeper

### From requirements to classes in 10 minutes {point: 0}

1) List use cases as verbs with actors: 'customer books seats', 'admin adds a show', 'system releases expired holds'. 2) Underline nouns: Customer, Show, Seat, Booking, Screen, Payment. Some nouns are attributes (seat number), some are entities with identity and lifecycle (Booking), some are value objects (Money, TimeRange). 3) Decide relationships and multiplicities: a Screen has many Seats; a Show is a Movie on a Screen at a time; a Booking has many SeatHolds. 4) Assign behaviour to the class owning the data (Show.hold(seats), Booking.confirm(payment)). 5) Identify states with enums and their transitions. 6) Mark the extension points with interfaces. 7) Add a service or facade that orchestrates use cases and handles concurrency.

Say these steps out loud while sketching; interviewers grade the process as much as the result.

### Relationships and ownership {point: 0.5}

Decide who owns what: a ParkingLot has Floors, a Floor has Slots (composition: slots don't exist without the floor). A Ticket references a Vehicle and a Slot (association). Put behaviour where the data is: Slot.park(vehicle) checks fit and occupancy; the lot only chooses which slot.

Keep IDs and value objects (Money, TimeRange) immutable; avoid primitives for money (use long cents or BigDecimal) and for time ranges.

### A state machine with an explicit transition table {point: 2}

Order states: CREATED → PAID → SHIPPED → DELIVERED, with CANCELLED reachable from CREATED or PAID. Encode allowed moves in one map so every transition is checked the same way, and history/audit is easy to add.

```
enum OrderStatus { CREATED, PAID, SHIPPED, DELIVERED, CANCELLED }

class Order {
    private static final Map<OrderStatus, Set<OrderStatus>> NEXT = Map.of(
        OrderStatus.CREATED,   EnumSet.of(OrderStatus.PAID, OrderStatus.CANCELLED),
        OrderStatus.PAID,      EnumSet.of(OrderStatus.SHIPPED, OrderStatus.CANCELLED),
        OrderStatus.SHIPPED,   EnumSet.of(OrderStatus.DELIVERED),
        OrderStatus.DELIVERED, EnumSet.noneOf(OrderStatus.class),
        OrderStatus.CANCELLED, EnumSet.noneOf(OrderStatus.class));
    private OrderStatus status = OrderStatus.CREATED;

    synchronized void moveTo(OrderStatus next) {
        if (!NEXT.get(status).contains(next))
            throw new IllegalStateException(status + " -> " + next + " not allowed");
        status = next;
    }
}
```

### Validation and error handling {point: 3}

Validate at boundaries and keep objects valid from construction: constructors and factory methods reject invalid input (negative amounts, end before start), so the rest of the code can trust its objects. Use specific exceptions or result types: SlotUnavailableException, InsufficientFundsException, InvalidTransitionException, rather than returning null or a generic RuntimeException.

Decide on checked vs unchecked: many modern Java codebases use unchecked exceptions for business errors and document them; alternatively return Optional or a Result type for expected outcomes (no slot free is expected, not exceptional). Never swallow exceptions silently.

For operations with external side effects (payments), define what happens on partial failure: compensating actions, idempotency keys, and states like PAYMENT_PENDING that can be resolved later. Mentioning this in an LLD round connects your class design to real reliability concerns.

```
sealed interface BookingResult permits Booked, Unavailable, PaymentDeclined {}
record Booked(Booking booking) implements BookingResult {}
record Unavailable(List<SeatId> taken) implements BookingResult {}
record PaymentDeclined(String reason) implements BookingResult {}

BookingResult book(ShowId show, List<SeatId> seats, PaymentToken token) {
    List<SeatId> taken = inventory.tryHold(show, seats);
    if (!taken.isEmpty()) return new Unavailable(taken);
    PaymentResult p = payments.charge(price(show, seats), token);
    if (!p.ok()) { inventory.release(show, seats); return new PaymentDeclined(p.reason()); }
    return new Booked(bookings.confirm(show, seats, p.id()));
}
```

### Designing for extension {point: 4}

Ask the interviewer which changes are likely, then design those as seams. Typical seams: new types of things (vehicle types, payment methods, notification channels) → interface + factory; changing rules (pricing, discounts, matching, eligibility) → strategy or rule objects evaluated in order; new reactions to events (send email, update loyalty points) → observer/event bus; new states → state pattern or a transition table.

Also design data for extension: use enums with behaviour or lookup tables rather than scattered switch statements; prefer composition (a Vehicle has a Size) over deep hierarchies. Close the interview with a short 'how this extends' tour: 'adding EV charging slots = new SlotType and a ChargingFee strategy; no changes to ParkingLot or Floor.'

### Error handling: result codes, exceptions and when to use each

A design has two kinds of failure, and mixing them is a common mistake. The first kind is something a user can cause by using the program normally: a seat that is taken, a card that is declined, a PIN that is wrong, a room that is full, a file that is not there. These are expected. The second kind is a mistake in the program or in the way it is used: a null where a value is required, a refill of a machine that is not in maintenance mode, an index out of range. These are bugs, or at least misuse.

Expected failures should be values. Return a result that the caller must look at: an enum (SaleStatus.SOLD_OUT), a record with a code and a payload (BookingResult with the conflicting seats, MeetingResult with the clashing ranges), or an Optional. The code reads naturally (if the result is not ok, show the message), the cases are listed in one place, a switch over the enum is checked by the compiler, and the failure carries what the caller needs to explain it: which seat, which range, how many tries are left.

Misuse and broken invariants should be exceptions. IllegalArgumentException for a bad argument (a negative price, a coupon above 100 percent), IllegalStateException for a call at the wrong time (a staff operation outside maintenance), and checked exceptions only when the caller must decide what to do with a failure that is outside its control, such as DispenseException from hardware that jammed after the bank approved the money.

Three habits. Validate at the boundary of the facade, before anything is changed, so a refused request leaves no trace. Make failures atomic: either everything happened or nothing did (a stay is booked for all its nights or none). And never swallow an exception silently; log it with context or translate it into a result.

Interviewers read your error handling as a sign of maturity. Say which failures are expected and show that each has a code and a test.

```
enum SaleStatus { DISPENSED, INSUFFICIENT_FUNDS, SOLD_OUT, UNKNOWN_CODE, NO_CHANGE, NO_MONEY, OUT_OF_SERVICE }

record Outcome(SaleStatus status, Product product, List<Coin> change) { }

// Expected: a normal result of pressing a button
Outcome o = machine.select("A1");
if (o.status() != SaleStatus.DISPENSED) show(o.status());

// Misuse: the operator called refill outside maintenance mode
private void requireStaff() {
    if (!state.staffAccess()) throw new IllegalStateException("staff operations need maintenance mode");
}
```

### Immutability and value objects

An immutable object never changes after it is built. That removes a whole category of bugs: no one can modify it behind your back, it can be shared by any number of threads without a lock, it can be used as a map key, and a test can compare it with equals.

A value object is a small immutable type that stands for a value and is compared by what it contains: Money, a time range, a seat id, a location, a coin, a debt. In Java 17 a record gives you this almost for free: the fields are final, equals, hashCode and toString are generated, and a compact constructor validates. A SeatId(row, number) can be a map key and prints as A5. A TimeRange rejects an end before its start in its constructor, so no invalid range can exist anywhere in the program.

Put behaviour on the value. TimeRange.overlaps, Location.distanceTo, Coin.cents, Recurrence.expand: the logic lives next to the data, and callers stop repeating it.

Use immutable types for what flows between components, and keep mutable state small, private and guarded: the seats of a show behind one lock, the balance behind the ledger. Return copies or unmodifiable views from methods that expose collections (List.copyOf, Collections.unmodifiableMap), so a caller cannot change your state through the list you gave them.

Prefer replacing to modifying when it is cheap. Moving a meeting creates a new Booking with the new range, because a Booking's list of ranges is immutable, and readers who hold the old one are safe. Money is an integer number of cents, never a double.

The cost is more objects, which is almost never a problem. The exception is a very hot loop, and then you measure before you change anything.

```
record SeatId(char row, int number) implements Comparable<SeatId> {
    static SeatId parse(String label) { /* validates, throws IllegalArgumentException */ return null; }
    public int compareTo(SeatId o) { return row != o.row ? Character.compare(row, o.row) : Integer.compare(number, o.number); }
    public String toString() { return "" + row + number; }
}

record TimeRange(long start, long end) {
    TimeRange {                                          // compact constructor validates
        if (end <= start) throw new IllegalArgumentException("a range must end after it starts");
    }
    boolean overlaps(TimeRange other) { return start < other.end && other.start < end; }
}

Group { members = Collections.unmodifiableMap(new TreeMap<>(members)); }   // defensive copy
```

### Event-driven design: observers, events and ordering

When something happens in one part of a system and several other parts care, calling them directly couples everything to everything. An event decouples them: the part where it happens publishes a small immutable message, and anyone who is interested subscribes. The booking service publishes HELD, CONFIRMED and CANCELLED, and the notification sender, the analytics job and a seat-map push all listen, without the booking service knowing any of them.

The basic form is the Observer pattern: a listener interface (onEvent), a list of listeners (CopyOnWriteArrayList, so adding one is safe at any time), and a publish method that loops over them. The event is a record: a type, the id of the thing, and the few fields a listener needs. Keep events small and immutable, and name them in the past tense, because they say what happened.

Four questions to answer in an interview. Where is the event published: inside the critical section, which keeps the order of events right, or after it, which keeps a slow listener from blocking the system? A common answer is to queue the event inside the lock and deliver it after the lock is released, as the key-value store does for watchers. Is delivery synchronous or asynchronous? Synchronous is simple and ordered; asynchronous needs a queue and tells you nothing about failure. What happens when a listener throws? Isolate it, so one bad listener cannot stop the others or roll back the business operation. What is the guarantee: at most once, at least once? At least once with idempotent listeners is the usual choice, and it is why events carry an id.

Events also give you history. A log of events (the audit log of the ATM, the history of an order) is the record of what happened and can be replayed to rebuild state, which is the idea behind the write-ahead log in the key-value store.

Do not overuse it. A direct method call is clearer when exactly one component must react and the result is needed at once.

```
interface BookingListener { void onEvent(BookingEvent event); }

record BookingEvent(String type, String bookingId, String userId) { }

private final List<BookingListener> listeners = new CopyOnWriteArrayList<>();

void subscribe(BookingListener listener) { listeners.add(listener); }

private void publish(String type, Booking b) {
    BookingEvent event = new BookingEvent(type, b.id(), b.userId());
    for (BookingListener l : listeners) l.onEvent(event);     // production: put the event on a queue instead
}
```

## Interview questions

- Model the order states of an e-commerce system and its legal transitions.
- Where would you put interfaces in a parking lot?
