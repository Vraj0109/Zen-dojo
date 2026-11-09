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

## Interview questions

- Model the order states of an e-commerce system and its legal transitions.
- Where would you put interfaces in a parking lot?
