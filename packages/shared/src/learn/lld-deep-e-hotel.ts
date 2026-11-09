import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the hotel reservation project in lld-projects-e-hotel.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const HOTEL_GUIDE: LldGuide = {
  requirements: [
    "Guests search room types for a range of dates and see the price of the whole stay. They book a type, not a physical room.",
    "Availability is counted per room type and per night. A booking of several nights is all or nothing.",
    "Pricing rules stack: season, weekend, long-stay discount. Rate plans decide the price and the cancellation terms.",
    "Overbooking: the hotel may sell a few more rooms than it has. Cancel, change dates, no-shows, and walking a guest when it goes wrong.",
    "A physical room is chosen at check-in (same type, or an upgrade). Housekeeping states decide which rooms can be given out. Check-out produces a bill.",
  ],
  entities: [
    "RoomType, Room (CLEAN, OCCUPIED, DIRTY, OUT_OF_ORDER), Inventory (booked count per night, one lock per type)",
    "Reservation (BOOKED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW, WALKED), PlanType, Offer",
    "RateRule (SeasonalRate, WeekendRate, LongStayDiscount), RateCalculator, CancellationPolicy, OverbookingPolicy",
    "Hotel (facade), HotelResult and HotelCode, Calendar (injected today)",
  ],
  patterns: [
    "Inventory counters per type and date instead of room-by-room calendars",
    "Chain of rate rules applied in order; strategy for cancellation and for overbooking",
    "One lock per room type; fixed lock order (type lock, then room lock)",
    "Room assignment as late as possible, with an upgrade rule",
    "Injected calendar for every date-dependent rule",
  ],
  code: `final class Inventory {
  final RoomType type; final int rooms;
  private final Map<LocalDate, Integer> booked = new HashMap<>();
  final ReentrantLock lock = new ReentrantLock();

  boolean tryBook(LocalDate checkIn, LocalDate checkOut, int limit) {       // caller holds the lock
    for (LocalDate n = checkIn; n.isBefore(checkOut); n = n.plusDays(1))
      if (booked.getOrDefault(n, 0) >= limit) return false;                // one full night refuses the stay
    for (LocalDate n = checkIn; n.isBefore(checkOut); n = n.plusDays(1)) booked.merge(n, 1, Integer::sum);
    return true;
  }
}

interface RateRule { int apply(LocalDate night, int cents, int nightsInStay); }

List<Integer> nightly(RoomType type, PlanType plan, LocalDate in, LocalDate out) {
  List<Integer> prices = new ArrayList<>();
  for (LocalDate night = in; night.isBefore(out); night = night.plusDays(1)) {
    int cents = type.baseCents();
    for (RateRule rule : rules) cents = rule.apply(night, cents, nights);   // each rule feeds the next
    prices.add(cents);
  }
  return prices;
}`,
  extensions: [
    "Group bookings and room blocks: several rooms in one reservation, with a release date for the unsold ones.",
    "Channel managers: the same inventory sold on several websites, with a counter that all channels decrement.",
    "Deposits and payments with a gateway, and invoices with taxes.",
    "Room preferences (floor, view, bed type) as a scoring step in room assignment.",
  ],
};

export const HOTEL_EXTRA: LldExtra = {
  recap: [
    "Inventory is a counter per room type and night, not a calendar per room. A stay is booked by checking every night against rooms plus the overbooking allowance, and incrementing them all, under the lock of the type.",
    "The price is the base rate passed through an ordered list of rules (season, weekend, long stay), then the plan's own discount. Nights are priced one by one, so a bill can show them.",
    "Cancellation depends on the plan and on the date. The guest pays the first night at booking, and that is all that can come back.",
    "A physical room is chosen at check-in: a clean room of the booked type, else an upgrade, else the guest is walked. No-shows release their nights.",
  ],
  flow: [
    "Asha searches three nights. For each room type that holds enough guests, the hotel looks at the booked count on every night, finds the tightest night and prices the stay with the rate rules.",
    "She books the standard room. Under the lock of that type, every night is compared with the limit (rooms plus overbooking). All are below it, so all three counters go up by one.",
    "A reservation with the total and a deposit of the first night is stored. Later she moves the stay a day: the old nights are released, the new ones are checked, and if they fail the old ones are put back.",
    "On the arrival day she checks in. The hotel picks a clean standard room, marks it occupied, and records the room number on the reservation.",
    "At check-out the bill is the total minus the deposit, plus extras, plus any extra nights. The room becomes DIRTY until housekeeping reports it clean.",
  ],
  edgeCases: [
    "A stay that touches one full night is refused and leaves no counter changed; a stay of exactly 30 nights is allowed, 31 is not.",
    "Overbooking limit that rounds down (one room with 50 percent allows no extra), search showing real rooms only.",
    "Cancelling on the day of arrival, exactly 7 days ahead on a strict plan, twice, or a non-refundable booking.",
    "Changing dates to a range that is taken (the old nights come back), after check-in, or to a weekend (the price difference).",
    "Upgrade when no standard room is clean, walking a guest when nothing is free, a dirty or out-of-order room, a no-show.",
    "Forty guests booking the only suite; sixty overlapping bookings and cancellations.",
  ],
};

export const HOTEL_DEEP: Record<string, LldDeep> = {
  "lldp-hotel": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `A hotel looks like the movie booking problem with dates, and that is half true. Both are about not selling the same thing twice. What is different is that the thing for sale is a range of nights, that hotels deliberately sell more than they have, and that the guest does not get a specific room until they arrive. Each of those changes the design.

Ask about the product. Do guests book a particular room or a type of room? A type is how real hotels work, and it lets the hotel move guests. How long can a stay be? Is the price the same every night, or does it depend on season, weekday and length of stay? Are there different plans with different cancellation terms? Ask about the rules of the business. Does the hotel overbook, and by how much? What happens to guests who do not arrive? What happens when everyone arrives and there are not enough rooms? Ask about the stay: check-in, extras, check-out, late departure, housekeeping.

The requirements we fix are in the guide above. Four decisions to say aloud. First, availability is a counter per room type and night. Second, a booking of a stay is checked and changed as one step, so nobody can end up with three of four nights. Third, a physical room is assigned at check-in, which is what makes upgrades and walk-outs possible. Fourth, everything that depends on a date reads it from an injected calendar, so cancellation windows and no-shows are tested by moving a date.

Money is in integer cents, a stay is the nights from check-in up to but not including check-out (so a guest leaving on the 5th and another arriving on the 5th do not clash), and the guest pays the first night when booking.`,
      },
      {
        title: "Inventory per type and night",
        body: `The first idea many candidates have is a calendar for each room: room 101 is free or taken on each date. To book a type, you then look for a room that is free on every night of the stay. It works for a small hotel and is wrong in two ways. It ties a guest to a room at booking time, and it can refuse a stay that would fit if rooms were rearranged: room 101 is free for nights 1 and 2, room 102 for nights 3 and 4, and a four-night stay has no single room even though the hotel has a free room every night.

The better model is a counter per room type per night: how many rooms of this type are booked on this date. Inventory holds the number of rooms and a map from date to booked count. A stay is available if, for every night, the booked count is below the limit. It is booked by adding one to every night. A cancellation subtracts one from every night. The rearranging is then done at check-in, when it is cheap to do.

Notice the loops. tryBook has two passes: the first checks every night, and only when all are below the limit does the second pass change any counter. That is the all or nothing rule. The test books a stay that includes one full night and checks that the other nights of the refused stay were not counted.

The limit is rooms plus the overbooking allowance. OverbookingPolicy is a strategy with one method: given the number of rooms, how many extra bookings may be taken. A percentage rounds down, so one room with 50 percent allows no extra, and ten rooms allow five. The search reports real rooms only, so the extra slack is a quiet rule of the hotel and is not advertised to guests.

Each room type has its own lock inside its Inventory. Bookings for different types never wait for each other, and a booking, a cancellation or a date change on one type is atomic with respect to the others of that type.`,
      },
      {
        title: "Pricing: rules in a chain",
        body: `A night has a base price from its room type, and then rules change it. A season multiplies the price for a range of dates. Friday and Saturday nights cost more. A long stay gets a discount. The tempting implementation is a big method with an if for each of these, and each new rule edits the method. The design that lasts is a list of rules.

RateRule has one method, apply(night, cents, nightsInStay), that takes the price so far and returns the price after the rule. SeasonalRate takes a first and last date, both inclusive, and a percentage, and multiplies the price for nights inside. WeekendRate adds 20 percent on Friday and Saturday. LongStayDiscount takes 10 percent off every night of a stay of seven nights or more, which is why the rule receives the length of the stay. RateCalculator starts with the base price, passes it through every rule in order, and then applies the plan's own adjustment: a non-refundable booking is 10 percent cheaper, because it cannot be cancelled.

The order matters, and it is a decision to state. A night in the spring season that is also a Friday costs 10000 times 1.5 times 1.2, which is 18000, and the test pins it. Because the rules take the price from the previous rule, they can be reordered or removed without touching each other, and a new rule such as a holiday surcharge or a member discount is one class.

The calculator returns a list with one price per night, not a total. That is what the search and the bill show, and what a change of dates needs. The total is the sum of the list. Everything is integer arithmetic with the division last, so rounding is the same every time.

The deposit is the price of the first night, computed with the same rules, and the guest pays it when booking.`,
      },
      {
        title: "Cancellation, changes and no-shows",
        body: `Cancelling means giving the nights back and deciding how much of the money comes back. The nights are always released, so the room can be sold again, and the refund depends on the plan. CancellationPolicy is a strategy chosen by the plan. The flexible plan refunds the whole deposit as long as the cancellation is before the day of arrival. The strict plan refunds half of it when the cancellation is at least seven days ahead, and nothing after that, and the test checks exactly seven and six days. The non-refundable plan never refunds. The refund cannot be more than the guest has paid, which is the deposit, and the policy says so by using it.

Changing dates is where atomicity matters again. The guest wants to move from one range to another. The code releases the old nights first, because they should count as free for the new range (a guest moving one day later should not clash with themselves). Then it tries to book the new nights. If that fails, it puts the old nights back and reports NOT_AVAILABLE, so the reservation is exactly as it was. If it succeeds, the dates, the total and the deposit are updated and the price difference is returned. A change is only possible while the reservation is still booked: after check-in it is WRONG_STATE.

No-shows are handled by a daily job, processNoShows. A reservation that is still BOOKED when its arrival date has passed becomes NO_SHOW, and its nights are released so that they can be sold. The guest loses the deposit. The job is safe to run twice, because the second run finds nothing in the BOOKED state, and the test says so. Guests who arrived, and those who arrive later, are not touched.

All three operations take the lock of the room type, re-check the status of the reservation inside it, and only then change anything. A cancellation that races with a no-show run cannot release the same nights twice.`,
      },
      {
        title: "Check-in: assigning a room, upgrades and walking a guest",
        body: `Until check-in the guest owns a place in the counters, not a room. When they arrive, the hotel picks a physical room. pickRoom looks at the rooms in order and returns the first room that is CLEAN and of the booked type. If there is none, it looks for the nearest higher type that has a clean room, and the guest is upgraded for free, with a note on the reservation. That is a real hotel practice, and it is the reason rooms are assigned late: with overbooking, some guests will be upgraded.

If there is no clean room of any suitable type, the hotel has overbooked and is out of luck. The reservation becomes WALKED, the nights are released, the deposit is returned and a note says that the guest was sent to another hotel. In practice the hotel also pays for the other room, which would be one more charge on the reservation. The test books four guests for two rooms with a hundred percent allowance, fills the other types, and checks that the third guest is walked and gets the deposit back.

Room status is a small state machine. A room is CLEAN, OCCUPIED, DIRTY or OUT_OF_ORDER. Check-in makes it OCCUPIED. Check-out makes it DIRTY, and only housekeeping can make it CLEAN again, so the next guest never gets a room that nobody cleaned. A broken room can be marked out of order unless a guest is in it, and when repaired it comes back as DIRTY, since it needs cleaning before use. The test covers each of those transitions and the refusals.

Check-in before the arrival date is TOO_EARLY, and checking in twice is WRONG_STATE. The room choice, the status change and the reservation update happen under the hotel's room lock, so two guests can never be given the same room.`,
      },
      {
        title: "Check-out and the bill",
        body: `addExtra adds a charge for something used during the stay (a minibar, parking), and is only allowed while the guest is checked in. At check-out the bill is what the guest has not yet paid: the total of the stay minus the deposit, plus the extras, plus the cost of any nights stayed beyond the booked check-out date, priced with the same rules as the rest. A guest who stays two nights longer pays two more nights at the rate of the room.

A guest who leaves early does not get money back: the nights were sold to them and the hotel turned other guests away. The test pins that, since it is a policy that people ask about. Check-out marks the room DIRTY and the reservation CHECKED_OUT, and the room goes back into circulation only when housekeeping reports it clean.

Now follow Main. Searching three nights from Monday shows the standard and the suite with their prices and the rooms left. The standard room costs 100.00 a night, the weekend nights from Thursday to Sunday cost 120.00 on Friday and Saturday, a seven-night stay gets the 10 percent discount (666.00 in total), and the spring nights on a Friday and a Saturday cost 180.00, which is the season and the weekend together. Four bookings are made for two rooms with a 50 percent allowance (three are allowed), and the fourth is refused. The search no longer offers the standard type for that night. Ben moves his stay one night later at no difference in price. Chen cancels a strict booking 20 days ahead and gets half the deposit back.

On Monday Asha and Dev are given rooms 101 and 102, and Eli, who booked a standard room, is upgraded to the suite. Asha pays an extra of 35.00 and at check-out her bill is 235.00. The no-show job finds one guest. A flexible booking cancelled on the day of arrival loses everything.`,
      },
      {
        title: "Concurrency, locks and testing",
        body: `Two guests ask for the last room at the same moment. The counters of a room type are changed under that type's lock, so one of them goes first, takes the last slot, and the other sees a full night and is refused. The test starts 40 threads booking the only suite for the same nights and exactly one wins, and each night is counted once.

The harder case is overlapping stays that are booked and cancelled at the same time. Sixty threads book standard rooms for ranges of one to three nights starting on different days, and a quarter of them cancel what they got. At the end, for each night, the counter must equal the number of active reservations that cover the night, and never exceed the limit. That is the invariant of the whole design, and it is checked by recomputing it from the reservations.

There are two kinds of lock. Each room type has an inventory lock, used by booking, cancelling, changing dates and no-shows. The physical rooms are guarded by one hotel-wide lock, used by check-in, check-out and housekeeping. Operations that need both, such as check-in (which may release nights when it walks a guest), take the type lock first and the room lock second, and nothing takes them in the other order, so they cannot deadlock. State the rule and the reason.

Why not one lock for everything? Booking is the hot path, and different room types are independent. Why not one lock per night? A stay covers several nights, and several locks would need an order and would add little, since each operation is a few map lookups.

The tests are organised by risk: the rate rules at their boundaries, search, validation of dates and guests, the all or nothing booking, overbooking, every cancellation policy, date changes, no-shows, room assignment with upgrades and walking, the bill, housekeeping and the two concurrency tests. The calendar is injected, so all of it runs in a fraction of a second.`,
      },
      {
        title: "Extensions and what interviewers probe",
        body: `Extensions fit without changing the core. Group bookings and room blocks reserve several rooms at once, with a date after which the unsold ones are released. A channel manager sells the same inventory on several websites, and the counters are the shared truth that every channel decrements, which is why they must be atomic. Payments are a gateway with a deposit and a final charge, as in the movie booking project. Taxes and invoices are a step after the bill. Room preferences (floor, view, bed type) become a score in pickRoom. A waiting list is a listener on cancellations.

Probes, with short answers. Why a counter per type and night and not a calendar per room? It does not tie the guest to a room, it cannot refuse a stay that fits after rearranging, and it is one map. Why assign at check-in? It allows upgrades, repairs and walk-outs. Why is overbooking acceptable? Some guests do not come, and the cost of an empty room is certain while the cost of walking a guest is rare. How do you stop the nights being half-booked? Check all, then change all, under one lock. How do you handle a change of dates? Release, try, and put back on failure, all under the lock. Why a rule chain for prices? Each rule is small and the order is explicit. Why an injected calendar? Because cancellation windows and no-shows are about dates, and tests must control them.

Scale: one inventory per type in one process is fine for one hotel. For a chain with a search across hotels, the counters move to a database with a row per hotel, type and night, and the booking becomes a conditional update: increment the booked count where the count is below the limit, for each night in one transaction. The design stays the same, and the database provides the atomicity.`,
      },
    ],
    classDiagram: `classDiagram
    class Hotel {
        +search(checkIn, checkOut, guests, plan) List
        +book(guest, typeId, guests, plan, checkIn, checkOut) HotelResult
        +changeDates(id, checkIn, checkOut) HotelResult
        +cancel(id) HotelResult
        +processNoShows() int
        +checkIn(id) HotelResult
        +addExtra(id, cents) HotelResult
        +checkOut(id) HotelResult
        +cleaned(roomNumber) HotelCode
        +outOfOrder(roomNumber, broken) HotelCode
    }
    class Inventory {
        type
        rooms
        lock
        +tryBook(checkIn, checkOut, limit) boolean
        +release(checkIn, checkOut)
        +minFree(checkIn, checkOut, limit) int
    }
    class Reservation {
        id
        plan
        checkIn
        checkOut
        totalCents
        depositCents
        status
        roomNumber
    }
    class Room {
        number
        status
    }
    class RoomType {
        <<record>>
        id
        capacity
        baseCents
        rank
    }
    class RateCalculator {
        +nightly(type, plan, checkIn, checkOut) List
        +total(type, plan, checkIn, checkOut) int
    }
    class RateRule {
        <<interface>>
        +apply(night, cents, nights) int
    }
    class CancellationPolicy {
        <<interface>>
        +refund(reservation, today) int
    }
    class OverbookingPolicy {
        <<interface>>
        +allowance(rooms) int
    }
    class Calendar {
        <<interface>>
        +today() LocalDate
    }
    Hotel --> Inventory
    Hotel --> Reservation
    Hotel --> Room
    Hotel --> RateCalculator
    Hotel --> OverbookingPolicy
    Hotel --> CancellationPolicy
    Hotel --> Calendar
    Inventory --> RoomType
    Room --> RoomType
    Reservation --> RoomType
    RateCalculator --> RateRule
    RateRule <|.. SeasonalRate
    RateRule <|.. WeekendRate
    RateRule <|.. LongStayDiscount`,
    sequenceDiagram: `sequenceDiagram
    actor Asha
    participant H as Hotel
    participant I as Inventory standard
    participant R as RateCalculator
    Asha->>H: search(Mon, Thu, 2 guests)
    H->>I: lock, minFree over the nights
    H->>R: nightly(type, plan, dates)
    H-->>Asha: Standard 2 left, 300.00 and the nightly list
    Asha->>H: book(std, Mon to Thu)
    H->>I: lock
    H->>I: tryBook: every night below the limit?
    I-->>H: yes, three counters + 1
    H->>R: nightly prices, deposit = first night
    H-->>Asha: OK, reservation R1, deposit 100.00
    H->>I: unlock`,
    stateDiagram: `stateDiagram-v2
    [*] --> BOOKED
    BOOKED --> CHECKED_IN: check-in, a room is assigned
    BOOKED --> CANCELLED: cancel, refund by plan
    BOOKED --> NO_SHOW: arrival date passed, nights released
    BOOKED --> WALKED: check-in with no room, deposit returned
    CHECKED_IN --> CHECKED_OUT: check-out, bill
    CHECKED_OUT --> [*]`,
    extraDiagrams: [
      {
        title: "Booking a stay is all or nothing",
        caption: "Check every night first. Only when all are below the limit are the counters changed.",
        source: `flowchart TD
    B["book(type, checkIn, checkOut)"] --> V{"Dates valid, not in the past, guests fit?"}
    V -- no --> E1["BAD_DATES, IN_THE_PAST or TOO_MANY_GUESTS"]
    V -- yes --> L["Lock the room type"]
    L --> C{"Every night: booked count below rooms + allowance?"}
    C -- no --> E2["NOT_AVAILABLE, nothing changed"]
    C -- yes --> I["Add one to every night"]
    I --> P["Price the nights, deposit = first night, store the reservation"]`,
      },
      {
        title: "Why counters beat a calendar per room",
        caption: "Two rooms are each free on different nights. A calendar per room refuses the stay, the counters accept it.",
        source: `flowchart LR
    A["Room 101: free nights 1 and 2"] --> X["Calendar per room: no single room has all four nights"]
    B["Room 102: free nights 3 and 4"] --> X
    A --> Y["Counters per night: one room free on every night"]
    B --> Y
    Y --> Z["Accept the stay, choose rooms at check-in"]`,
      },
      {
        title: "The price of one night",
        caption: "The base price flows through the rules in order, then the plan adjustment.",
        source: `flowchart LR
    B["Base price of the room type: 100.00"] --> S["SeasonalRate times 1.5"]
    S --> W["WeekendRate times 1.2 on Friday and Saturday"]
    W --> L["LongStayDiscount times 0.9 for 7 nights or more"]
    L --> P["Plan: non-refundable times 0.9"]
    P --> R["Price of the night, rounded down in cents"]`,
      },
      {
        title: "Cancellation by plan",
        caption: "The refund can never be more than the deposit that was paid.",
        source: `flowchart TD
    X["cancel(reservation)"] --> S{"Plan"}
    S -- FLEXIBLE --> F{"Before the arrival date?"}
    F -- yes --> F1["Refund the deposit"]
    F -- no --> F0["Refund nothing"]
    S -- STRICT --> T{"7 days or more before arrival?"}
    T -- yes --> T1["Refund half the deposit"]
    T -- no --> T0["Refund nothing"]
    S -- NON_REFUNDABLE --> N["Refund nothing"]
    F1 --> R["Release the nights, status CANCELLED"]
    F0 --> R
    T1 --> R
    T0 --> R
    N --> R`,
      },
      {
        title: "Changing dates without losing the booking",
        caption: "Release, try the new range, and put the old nights back if it does not fit.",
        source: `sequenceDiagram
    participant H as Hotel
    participant I as Inventory
    H->>I: lock
    H->>I: release(old nights)
    H->>I: tryBook(new nights)
    alt the new nights are free
        I-->>H: true
        H->>H: update dates, total and deposit, return the difference
    else a night is full
        I-->>H: false
        H->>I: put the old nights back
        H-->>H: NOT_AVAILABLE, reservation unchanged
    end
    H->>I: unlock`,
      },
      {
        title: "Choosing a room at check-in",
        caption: "Same type first, then the nearest higher type, then walk the guest.",
        source: `flowchart TD
    C["checkIn(reservation)"] --> D{"Today is the arrival date or later?"}
    D -- no --> E["TOO_EARLY"]
    D -- yes --> S{"A CLEAN room of the booked type?"}
    S -- yes --> A["Assign it, OCCUPIED"]
    S -- no --> U{"A CLEAN room of a higher type?"}
    U -- yes --> UP["Assign the nearest higher type, note: upgraded"]
    U -- no --> W["WALKED: release the nights, return the deposit"]`,
      },
      {
        title: "Room states",
        caption: "A room only becomes clean through housekeeping, and a broken room returns as dirty.",
        source: `stateDiagram-v2
    [*] --> CLEAN
    CLEAN --> OCCUPIED: guest checks in
    OCCUPIED --> DIRTY: guest checks out
    DIRTY --> CLEAN: housekeeping reports it clean
    CLEAN --> OUT_OF_ORDER: broken
    DIRTY --> OUT_OF_ORDER: broken
    OUT_OF_ORDER --> DIRTY: repaired`,
      },
      {
        title: "Object snapshot: standard rooms on Monday",
        caption: "Two rooms and a 50 percent allowance: the limit is 2, so the counter shows three bookings against two rooms.",
        source: `flowchart LR
    I["Inventory Standard: 2 rooms, limit 2 + 1"] --> N1["Mon: booked 3"]
    I --> N2["Tue: booked 2"]
    I --> N3["Wed: booked 1"]
    R1["Asha: Mon to Thu, FLEXIBLE"] --> N1
    R2["Ben: Mon to Wed, FLEXIBLE"] --> N1
    R3["Chen: Mon, STRICT"] --> N1
    RM["Rooms 101 and 102: CLEAN, room 201 and 301 in other inventories"] --> I`,
      },
      {
        title: "Where the extensions attach",
        caption: "Each follow-up question lands in one place.",
        source: `flowchart TD
    X["Follow-up questions"] --> G["Group blocks"]
    X --> CH["Channel manager"]
    X --> PY["Payments and invoices"]
    X --> PR["Room preferences"]
    G --> G1["Several counters in one booking, release date"]
    CH --> CH1["Channels call the same atomic tryBook"]
    PY --> PY1["Gateway for the deposit and the final bill"]
    PR --> PR1["Score in pickRoom"]`,
      },
    ],
    concurrency: [
      "Each room type has its own Inventory lock. Booking, cancelling, changing dates and the no-show job on one type are decided one at a time, and different types never wait for each other.",
      "tryBook checks every night before it changes any counter, under the lock, so a stay is booked for all its nights or none. 40 threads booking the only suite end with exactly one booking.",
      "Physical rooms are guarded by one hotel-wide lock used by check-in, check-out and housekeeping, so two guests can never get the same room.",
      "Lock order is fixed: the type lock first, then the room lock. Nothing takes them the other way round, so no deadlock is possible. Check-in may release nights, which is why it needs both.",
      "Every operation re-checks the reservation status inside the lock, so a cancellation racing with a no-show run cannot release the same nights twice.",
      "The date comes from an injected Calendar, so cancellation windows, arrival dates and no-shows are tested without waiting.",
    ],
  },
};
