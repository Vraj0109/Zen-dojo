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
    end
    subgraph Core
        L["ParkingLot"]
    end
    subgraph Policies
        A["SpotAllocationStrategy"]
        P["PricingStrategy"]
    end
    subgraph Data
        S["Spots"]
        T["Active tickets map"]
        N["Plates inside set"]
    end
    subgraph Observers
        B["DisplayBoard"]
    end
    G --> L
    K --> L
    L --> A
    L --> P
    L --> S
    L --> T
    L --> N
    L --> B`,
    },
    {
      title: "Pricing: a rule wrapped by a rule",
      caption: "DailyCapPricing is a decorator. The lot sees one PricingStrategy and does not know how many are stacked.",
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
    PricingStrategy <|.. HourlyPricing
    PricingStrategy <|.. DailyCapPricing
    DailyCapPricing o-- PricingStrategy : wraps any rule`,
    },
    {
      title: "Life of a spot",
      caption: "Two states, and a failed tryPark changes nothing. That is why a boolean field is enough and State would be overkill.",
      source: `stateDiagram-v2
    [*] --> Free
    Free --> Occupied: tryPark succeeds
    Occupied --> Occupied: tryPark rejected
    Occupied --> Free: release after exit`,
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
      caption: "Where each likely follow-up lands. Most of them add a class and change one line in Main.",
      source: `flowchart TD
    X["Follow-up request"] --> V["New vehicle type"]
    X --> E["Electric vehicle charging"]
    X --> R["Reservations"]
    X --> M["Several lots"]
    X --> Y["Payment"]
    V --> V1["Add enum constant, one case in Vehicle.minSize, one rate"]
    E --> E1["Capability on Spot, a new allocation strategy, a pricing rule for energy"]
    R --> R1["Reserved-until on Spot and a tryPark that respects it"]
    M --> M1["A Garage that routes to lots, ParkingLot unchanged"]
    Y --> Y1["Separate service called by the exit gate, the lot stays unaware"]`,
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
