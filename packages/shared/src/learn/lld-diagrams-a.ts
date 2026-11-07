import type { DiagramBlock } from "./types";

// Extra diagrams for the LLD projects of batch A (plan 0013): decision flows, more sequences, state machines,
// component views and extension maps. Mermaid; every diagram is parsed by apps/web/lib/diagrams-parse.test.ts.
// Rules: quote every node label, no semicolons or hash signs in text, and keep each diagram under 4,000 characters.

export const LLD_EXTRA_DIAGRAMS_A: Record<string, DiagramBlock[]> = {
  "lldp-parking-lot": [
    {
      title: "Entry decision flow",
      caption: "Every branch of ParkingLot.enter. The loop in the middle is why the strategy returns a list.",
      source: `flowchart TD
    A["Vehicle arrives at a gate"] --> B{"Plate already inside?"}
    B -- yes --> R1["Reject: already inside"]
    B -- no --> C["Strategy lists free spots that fit, best first"]
    C --> D{"Any candidate left?"}
    D -- no --> R2["Reject: lot full, release the plate"]
    D -- yes --> E["tryPark on the next candidate"]
    E --> F{"Taken by another gate meanwhile?"}
    F -- yes --> D
    F -- no --> G["Create ticket, store it, notify the display board"]
    G --> H["Open the barrier"]`,
    },
    {
      title: "Exit sequence",
      caption: "The ticket is removed from the map first. That removal is the atomic check that makes a ticket single-use.",
      source: `sequenceDiagram
    actor Driver
    participant Gate as Exit gate
    participant Lot as ParkingLot
    participant Pricing as PricingStrategy
    participant Spot
    participant Board as DisplayBoard
    Driver->>Gate: scan ticket T-1
    Gate->>Lot: exit(T-1)
    Lot->>Lot: active.remove(T-1) is atomic
    alt ticket unknown or already used
        Lot-->>Gate: InvalidTicketException
    else valid ticket
        Lot->>Pricing: fee(ticket, now)
        Pricing-->>Lot: 60
        Lot->>Spot: release()
        Lot->>Board: onChange(free counts)
        Lot-->>Gate: fee 60
        Gate-->>Driver: pay 60, open barrier
    end`,
    },
    {
      title: "Two gates racing for the same spot",
      caption: "No lock on the lot. The spot's own lock decides the winner and the loser moves to its next candidate.",
      source: `sequenceDiagram
    participant G1 as Gate 1
    participant G2 as Gate 2
    participant Lot as ParkingLot
    participant S1 as Spot F0-M0
    participant S2 as Spot F0-M1
    G1->>Lot: enter(car A)
    G2->>Lot: enter(car B)
    Lot->>S1: tryPark(A) for gate 1
    Lot->>S1: tryPark(B) for gate 2
    S1-->>Lot: true for A, the lock serialises the calls
    S1-->>Lot: false for B, already taken
    Lot->>S2: tryPark(B)
    S2-->>Lot: true
    Lot-->>G1: ticket for F0-M0
    Lot-->>G2: ticket for F0-M1`,
    },
    {
      title: "Component view",
      caption: "Who talks to whom. Policies and observers are behind interfaces, so they can change without touching the lot.",
      source: `flowchart LR
    subgraph Callers
        G["Entry and exit gates"]
        K["Payment kiosk"]
        W["Booking app"]
        O["Operator console"]
    end
    subgraph Router
        GA["Garage"]
    end
    subgraph Core
        L["ParkingLot"]
    end
    subgraph Policies
        A["SpotAllocationStrategy"]
        P["PricingStrategy"]
        Y["PaymentProcessor"]
    end
    subgraph Data
        S["Spots with parked and hold state"]
        T["Active tickets map"]
        N["Plates inside set"]
        V["Reservations by plate"]
        M["Revenue counters"]
    end
    subgraph Outside
        C["CardGateway"]
        B["DisplayBoard"]
    end
    G --> GA
    GA --> L
    G --> L
    K --> L
    W --> L
    O --> L
    L --> A
    L --> P
    L --> Y
    L --> S
    L --> T
    L --> N
    L --> V
    L --> M
    Y --> C
    L --> B`,
    },
    {
      title: "Pricing: rules wrapped by rules",
      caption: "DailyCapPricing and ChargingSurcharge are decorators. The lot sees one PricingStrategy and does not know how many are stacked.",
      source: `classDiagram
    class PricingStrategy {
        <<interface>>
        +fee(ticket, exit) long
    }
    class HourlyPricing {
        -centsPerHour Map
        +fee(ticket, exit) long
    }
    class DailyCapPricing {
        -inner PricingStrategy
        -capPerDay long
        +fee(ticket, exit) long
    }
    class ChargingSurcharge {
        -inner PricingStrategy
        -centsPerHour long
        +fee(ticket, exit) long
    }
    PricingStrategy <|.. HourlyPricing
    PricingStrategy <|.. DailyCapPricing
    PricingStrategy <|.. ChargingSurcharge
    DailyCapPricing o-- PricingStrategy : wraps any rule
    ChargingSurcharge o-- PricingStrategy : wraps any rule`,
    },
    {
      title: "Life of a spot",
      caption: "Three states. A hold is time limited, so an expired hold needs no clean-up job: it just stops counting.",
      source: `stateDiagram-v2
    [*] --> Free
    Free --> Held: tryHold for a plate
    Held --> Free: cancelled or the hold expires
    Held --> Occupied: tryPark by the holder
    Held --> Held: tryPark by another plate rejected
    Free --> Occupied: tryPark succeeds
    Occupied --> Occupied: tryPark and tryHold rejected
    Occupied --> Free: release after exit`,
    },
    {
      title: "Reservation, hold and arrival",
      caption: "The reservation and the gate meet at the spot, not at the lot. The spot's lock decides who gets it.",
      source: `sequenceDiagram
    actor App as Booking app
    participant Lot as ParkingLot
    participant Spot
    actor Gate as Gate
    App->>Lot: reserve(vehicle, 30 min)
    Lot->>Lot: reservations.compute(plate)
    Lot->>Spot: tryHold(plate, until, now)
    Spot-->>Lot: true
    Lot-->>App: Reservation R-1 for spot F0-M2
    Gate->>Lot: enter(other vehicle)
    Lot->>Spot: tryPark(other vehicle, now)
    Spot-->>Lot: false, held by another plate
    Lot-->>Gate: LotFullException
    Gate->>Lot: enter(holder vehicle)
    Lot->>Lot: reservations.remove(plate) is atomic
    Lot->>Spot: tryPark(holder vehicle, now)
    Spot-->>Lot: true, hold cleared
    Lot-->>Gate: Ticket T-3 for F0-M2`,
    },
    {
      title: "Checkout with payment",
      caption: "The ticket leaves the map first. A declined payment puts it back, so the customer can pay another way.",
      source: `sequenceDiagram
    actor Driver
    participant Lot as ParkingLot
    participant Pricing as PricingStrategy
    participant Pay as PaymentProcessor
    participant Spot
    Driver->>Lot: checkout(T-1, cash 10)
    Lot->>Lot: active.remove(T-1)
    Lot->>Pricing: fee(ticket, now)
    Pricing-->>Lot: 40
    Lot->>Pay: charge(40)
    Pay-->>Lot: declined
    Lot->>Lot: active.put(T-1) again
    Lot-->>Driver: PaymentFailedException
    Driver->>Lot: checkout(T-1, card 4242)
    Lot->>Lot: active.remove(T-1)
    Lot->>Pay: charge(40)
    Pay-->>Lot: approved
    Lot->>Spot: release()
    Lot->>Lot: add 40 to revenue
    Lot-->>Driver: Receipt T-1`,
    },
    {
      title: "Checkout activity",
      caption: "Every outcome of ParkingLot.checkout. Only an approved payment frees the spot and counts as revenue.",
      source: `flowchart TD
    A["checkout(ticketId, payment)"] --> B{"Ticket in the active map?"}
    B -- no --> R1["InvalidTicketException"]
    B -- yes --> C["Remove it, price the stay"]
    C --> D{"Pricing threw?"}
    D -- yes --> E["Free the spot anyway, rethrow"]
    D -- no --> F["payment.charge(fee)"]
    F --> G{"Approved?"}
    G -- no --> H["Put the ticket back"]
    H --> R2["PaymentFailedException"]
    G -- yes --> I["Add fee to revenue, count the stay"]
    I --> J["Release the spot, drop the plate, notify listeners"]
    J --> K["Return Receipt"]`,
    },
    {
      title: "Lost ticket",
      caption: "The ticket is found by plate. The customer pays the larger of the real fee and the flat penalty.",
      source: `flowchart TD
    A["lostTicket(plate, payment)"] --> B{"Active ticket with this plate?"}
    B -- no --> R1["InvalidTicketException"]
    B -- yes --> C{"active.remove succeeds?"}
    C -- no --> R1
    C -- yes --> D["fee = max(pricing fee, lost ticket penalty)"]
    D --> E["settle(ticket, fee, payment)"]
    E --> F["Same path as a normal checkout: charge, free, receipt"]`,
    },
    {
      title: "Garage: two lots, one door",
      caption: "The garage only routes. It keeps its own plate set so one vehicle cannot be inside two lots.",
      source: `flowchart TD
    A["garage.enter(vehicle)"] --> B{"Plate already in the garage?"}
    B -- yes --> R1["Reject: already inside"]
    B -- no --> C["Take the next lot in preference order"]
    C --> D["lot.enter(vehicle)"]
    D --> E{"LotFullException?"}
    E -- no --> F["GarageTicket: lot name slash ticket id"]
    E -- yes --> G{"Another lot left?"}
    G -- yes --> C
    G -- no --> H["Release the plate, reject: garage full"]`,
    },
    {
      title: "Package view",
      caption: "Which file depends on which. Arrows point at what is used. Nothing in the core imports a payment vendor.",
      source: `flowchart LR
    subgraph Domain
        VT["Vehicle, VehicleType"]
        SP["Spot, SpotSize"]
        TK["Ticket, Reservation, Receipt"]
    end
    subgraph Policies
        AL["SpotAllocationStrategy, NearestSpotStrategy, EvAwareStrategy"]
        PR["PricingStrategy, HourlyPricing, DailyCapPricing, ChargingSurcharge"]
        PM["PaymentProcessor, CashPayment, CardPayment, CardGateway"]
    end
    subgraph Facade
        PL["ParkingLot"]
        GA["Garage"]
    end
    subgraph Reports
        RP["LotReport, GarageReport"]
        OB["OccupancyListener, DisplayBoard"]
    end
    GA --> PL
    PL --> Domain
    PL --> Policies
    PL --> Reports
    Policies --> Domain`,
    },
    {
      title: "A snapshot at 09:10",
      caption: "Objects alive in the second part of Main just after the reserved car arrives. Compare it with the class diagram.",
      source: `flowchart LR
    subgraph Spots
        S0["Spot F0-M0-EV: parked E1, charger"]
        S1["Spot F0-M1: parked P1"]
        S2["Spot F0-M2: parked R1, hold cleared"]
    end
    subgraph AT["Active tickets"]
        T1["T-1: P1 on F0-M1, entry 09:00"]
        T2["T-2: E1 on F0-M0-EV, entry 09:00"]
        T3["T-3: R1 on F0-M2, entry 09:10"]
    end
    subgraph Reservations
        RS["empty: R-1 was consumed on arrival"]
    end
    T1 --> S1
    T2 --> S0
    T3 --> S2`,
    },
    {
      title: "Life of a ticket",
      source: `stateDiagram-v2
    [*] --> Active: issued on entry
    Active --> Redeemed: exit removes it from the map
    Redeemed --> [*]`,
    },
    {
      title: "Extension map",
      caption: "Where each follow-up landed in this code, and the ones that are still open.",
      source: `flowchart TD
    X["Follow-up request"] --> V["New vehicle type"]
    X --> E["Electric vehicle charging"]
    X --> R["Reservations"]
    X --> M["Several lots"]
    X --> Y["Payment and lost tickets"]
    X --> O["Still open"]
    V --> V1["Add enum constant, one case in Vehicle.minSize, one rate"]
    E --> E1["Done: Spot.isEv, EvAwareStrategy, ChargingSurcharge"]
    R --> R1["Done: Spot.tryHold, Reservation, ParkingLot.reserve"]
    M --> M1["Done: Garage routes to lots, ParkingLot unchanged"]
    Y --> Y1["Done: PaymentProcessor, checkout, lostTicket, LotReport"]
    O --> O1["Persistence behind a repository, faster allocation with free lists, valet and handicapped spots"]`,
    },
  ],

  "lldp-elevator": [
    {
      title: "What one tick does to a car",
      caption: "ElevatorCar.step as a decision flow. Each tick takes exactly one branch.",
      source: `flowchart TD
    S["step() called on a car"] --> D{"Doors open?"}
    D -- yes --> O{"Overloaded?"}
    O -- yes --> W["Log a warning, doors stay open"]
    O -- no --> C["Close the doors, state IDLE"]
    D -- no --> A{"Stop on this floor?"}
    A -- yes --> P["Remove the stop, open the doors, log"]
    A -- no --> N["nextDirection()"]
    N --> M{"Direction is IDLE?"}
    M -- yes --> I["Stay idle"]
    M -- no --> G["Move one floor, state MOVING"]`,
    },
    {
      title: "How the car chooses a direction",
      caption: "The LOOK rule: keep going while there is something ahead, reverse only when there is not.",
      source: `flowchart TD
    Q["Look at the stops above and below the current floor"] --> U{"Going up and a stop above?"}
    U -- yes --> KU["Keep going UP"]
    U -- no --> V{"Going down and a stop below?"}
    V -- yes --> KD["Keep going DOWN"]
    V -- no --> X{"Which sides have stops?"}
    X -- "only above" --> OU["Go UP"]
    X -- "only below" --> OD["Go DOWN"]
    X -- "both sides" --> NR["Go to the nearer side"]
    X -- "none" --> ID["Stay IDLE"]`,
    },
    {
      title: "Dispatch: scoring two cars for one call",
      caption: "The numbers from Main. The cost is distance plus two per pending stop plus four when heading the wrong way.",
      source: `sequenceDiagram
    actor Passenger
    participant Sys as ElevatorSystem
    participant Strat as NearestCarStrategy
    participant A as Car A at floor 0
    participant B as Car B at floor 9
    Passenger->>Sys: requestHall(8, DOWN)
    Sys->>Strat: choose(cars, call)
    Strat->>A: floor, pendingStops, direction
    A-->>Strat: cost 8 + 2 = 10
    Strat->>B: floor, pendingStops, direction
    B-->>Strat: cost 1
    Strat-->>Sys: Car B
    Sys->>B: addStop(8)
    Sys-->>Passenger: Car B is coming`,
    },
    {
      title: "Eleven ticks of Car A",
      caption: "The exact trace behind the line All cars idle after 11 ticks in Main.",
      source: `sequenceDiagram
    participant Clock
    participant A as Car A with stops 3 and 7
    Clock->>A: ticks 1 to 3
    A-->>A: moves from floor 0 to 3
    Clock->>A: tick 4
    A-->>A: doors open at floor 3
    Clock->>A: tick 5
    A-->>A: doors close
    Clock->>A: ticks 6 to 9
    A-->>A: moves from floor 3 to 7
    Clock->>A: tick 10
    A-->>A: doors open at floor 7
    Clock->>A: tick 11
    A-->>A: doors close, idle`,
    },
    {
      title: "Overloaded car",
      caption: "No new state was needed: DOORS_OPEN already means not leaving yet.",
      source: `sequenceDiagram
    participant Clock
    participant Sys as ElevatorSystem
    participant Car as Car A
    Sys->>Car: setLoad(800 kg), capacity is 600
    Clock->>Sys: tick()
    Sys->>Car: step()
    Car-->>Car: doors open at floor 7
    Clock->>Sys: tick()
    Sys->>Car: step()
    Car-->>Car: overloaded, doors stay open
    Sys->>Car: setLoad(300 kg)
    Clock->>Sys: tick()
    Sys->>Car: step()
    Car-->>Car: doors close`,
    },
    {
      title: "Component view",
      caption: "Buttons are method calls. The clock is the only thing that makes time pass.",
      source: `flowchart LR
    H["Hall buttons"] --> S["ElevatorSystem"]
    C["Cab buttons"] --> S
    K["Clock thread"] --> S
    S --> D["DispatchStrategy"]
    S --> A["Car A"]
    S --> B["Car B"]
    D -.-> A
    D -.-> B`,
    },
    {
      title: "Car taken out of service mid-trip",
      caption: "The extension from the walkthrough: hand the pending stops back to the controller and dispatch them again.",
      source: `sequenceDiagram
    participant Op as Operator
    participant Sys as ElevatorSystem
    participant Car as Car A
    participant Strat as DispatchStrategy
    participant Other as Car B
    Op->>Sys: setOutOfService(A, true)
    Sys->>Car: drainStops()
    Car-->>Sys: stops 5 and 9
    loop for each drained stop
        Sys->>Strat: choose(cars, call for that floor)
        Strat-->>Sys: Car B
        Sys->>Other: addStop(floor)
    end`,
    },
  ],

  "lldp-vending-atm": [
    {
      title: "What trySell decides",
      caption: "Every outcome of pressing Select, in the order the machine checks them.",
      source: `flowchart TD
    S["select(code) in HasMoney"] --> K{"Code known?"}
    K -- no --> U["UNKNOWN_CODE"]
    K -- yes --> A{"Any stock left?"}
    A -- no --> SO["SOLD_OUT"]
    A -- yes --> P{"Inserted money at least the price?"}
    P -- no --> IF["INSUFFICIENT_FUNDS, money stays"]
    P -- yes --> C{"Exact change possible from cashbox plus inserted coins?"}
    C -- no --> NC["NO_CHANGE, inserted coins refunded"]
    C -- yes --> D["Commit: update cashbox, clear inserted coins, reduce stock"]
    D --> OK["DISPENSED with change"]`,
    },
    {
      title: "No exact change",
      caption: "The refund path. Nothing is committed before change has been found.",
      source: `sequenceDiagram
    actor Customer
    participant M as VendingMachine
    participant C as ChangeMaker
    Customer->>M: insert(DOLLAR)
    Customer->>M: select(C1) priced 75
    M->>M: pool = cashbox + inserted coins
    M->>C: make(25 cents, pool)
    C-->>M: empty, not possible
    M-->>Customer: Outcome NO_CHANGE with the dollar back
    M->>M: state becomes Idle`,
    },
    {
      title: "Why greedy change fails with limited coins",
      caption: "30 cents from one quarter and three dimes. Taking the quarter first dead-ends, so the search backtracks.",
      source: `flowchart TD
    S["Need 30 cents: 1 quarter and 3 dimes available"] --> Q1["Use 1 quarter, 5 cents left"]
    S --> Q0["Use 0 quarters, 30 cents left"]
    Q1 --> F1["No nickels: dead end"]
    Q0 --> D3["Use 3 dimes, 0 left: success"]
    Q0 --> D2["Use 2 dimes, 10 left: dead end"]`,
    },
    {
      title: "Life of a customer's coins",
      caption: "Inserted coins stay apart from the cashbox until a sale succeeds, which is what makes refunds trivial.",
      source: `flowchart LR
    I["Customer inserts coins"] --> L["Inserted list"]
    L -->|"cancel or NO_CHANGE"| R["Refund"]
    L -->|"sale succeeds"| P["Pool with the cashbox"]
    P --> CB["Cashbox after change is removed"]
    P --> CH["Change returned to the customer"]`,
    },
    {
      title: "The ATM as the same state machine",
      caption: "Design only, not implemented as code. The button meanings change with the state, exactly as in the vending machine.",
      source: `stateDiagram-v2
    [*] --> Idle
    Idle --> CardInserted: card inserted
    CardInserted --> Authenticated: correct PIN
    CardInserted --> CardInserted: wrong PIN, attempts left
    CardInserted --> Idle: card retained after 3 wrong PINs
    Authenticated --> Transaction: withdraw, balance or deposit chosen
    Transaction --> Authenticated: transaction finished
    Authenticated --> Idle: card ejected`,
    },
    {
      title: "ATM withdrawal: hold, dispense, confirm or reverse",
      caption: "The debit and the cash can fail separately, so the bank hold is confirmed only after the notes are out.",
      source: `sequenceDiagram
    actor Customer
    participant ATM
    participant Bank
    participant Dispenser
    Customer->>ATM: withdraw 3000
    ATM->>Bank: hold 3000 with transaction id T9
    Bank-->>ATM: approved
    ATM->>Dispenser: dispense notes for 3000
    alt notes dispensed
        Dispenser-->>ATM: ok
        ATM->>Bank: confirm T9
    else jam or no notes
        Dispenser-->>ATM: failure
        ATM->>Bank: reverse T9
    end
    ATM-->>Customer: cash and receipt, or an error`,
    },
    {
      title: "ATM class sketch",
      caption: "Same shape as the vending machine: a context, a state interface and a policy for dispensing.",
      source: `classDiagram
    class Atm {
        +insertCard(card)
        +enterPin(pin)
        +withdraw(amount)
        +eject()
    }
    class AtmState {
        <<interface>>
        +enterPin(atm, pin)
        +withdraw(atm, amount)
    }
    class CashDispenser {
        +plan(amount) Optional
    }
    class BankService {
        <<interface>>
        +hold(account, amount, txId)
        +confirm(txId)
        +reverse(txId)
    }
    Atm --> AtmState
    AtmState <|.. IdleAtmState
    AtmState <|.. CardInsertedState
    AtmState <|.. AuthenticatedState
    Atm --> CashDispenser
    Atm --> BankService`,
    },
  ],
};
