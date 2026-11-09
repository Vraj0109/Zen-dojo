import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the vending machine and ATM project in lld-projects-c-vending.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const VENDING_ATM_GUIDE: LldGuide = {
  requirements: [
    "Vending machine: insert coins or tap a card, select a code, get the product and exact change; cancel refunds; refuse sold out, unknown code, too little money.",
    "If exact change cannot be made from the coins really in the machine, refuse the sale and give the coins back.",
    "Abandoned sessions time out and refund. A fault puts the machine out of service. Staff refill, collect cash and can open it only when idle.",
    "ATM: card then PIN (three tries, then the card is captured and blocked), balance, withdrawal in notes, per-transaction and daily limits.",
    "A withdrawal must never debit money without cash coming out, and never pay cash without a debit. Everything is audited without the PIN.",
  ],
  entities: [
    "VendingMachine (context), VendingState (Idle, HasMoney, OutOfService, Maintenance)",
    "PaymentSession (CashSession, CardSession), Cashbox, ChangeMaker, Inventory, Outcome",
    "Atm (context), AtmState (Idle, CardInserted, Authenticated), CashDispenser, NoteDispenser (hardware)",
    "BankService (hold, confirm, reverse), InMemoryBank, AuditLog, TimeSource (injected clock)",
  ],
  patterns: [
    "State: each button asks the current state, so there are no if-ladders",
    "Strategy: PaymentSession (cash or card), later a wallet",
    "Two-phase money movement: hold, then confirm or reverse",
    "Dependency injection of the clock and the hardware, so timeouts and jams are testable",
    "Backtracking search for exact change and for note planning",
  ],
  code: `interface VendingState {
  default boolean insert(VendingMachine m, Coin c) { return false; }
  default Outcome select(VendingMachine m, String code) { return Outcome.of(SaleStatus.NO_MONEY); }
  default List<Coin> cancel(VendingMachine m) { return List.of(); }
  default List<Coin> tick(VendingMachine m) { return List.of(); }
}

final class HasMoneyState implements VendingState {
  public Outcome select(VendingMachine m, String code) {
    Outcome o = m.trySell(code);
    if (o.status() == SaleStatus.DISPENSED || o.status() == SaleStatus.NO_CHANGE) m.setState(new IdleState());
    return o;
  }
}

class Atm {
  AtmResponse doWithdraw(int amount) {
    Optional<Map<Note, Integer>> plan = dispenser.plan(amount);   // can we pay it at all?
    if (plan.isEmpty()) return AtmResponse.of(AtmStatus.ATM_CANNOT_PAY, "cannot pay");
    String tx = id + "-T" + (++counter);
    if (bank.hold(card.accountId(), amount, tx) != HoldResult.APPROVED) return refusal();
    try { hardware.dispense(plan.get()); }
    catch (DispenseException e) { bank.reverse(tx); return AtmResponse.of(AtmStatus.DISPENSE_FAILED, "not charged"); }
    dispenser.remove(plan.get());
    bank.confirm(tx);
    return new AtmResponse(AtmStatus.OK, "take your cash", plan.get(), bank.available(card.accountId()));
  }
}`,
  extensions: [
    "More payment methods (a phone wallet) are new PaymentSession classes; nothing in VendingMachine changes.",
    "Deposits and transfers: the same hold, confirm, reverse protocol with a second account.",
    "A fleet of machines reports stock and faults to a server through an Observer that publishes events.",
    "Receipt printing and SMS alerts as listeners of the audit log.",
  ],
};

export const VENDING_ATM_EXTRA: LldExtra = {
  recap: [
    "Both devices are a state machine whose buttons change meaning by state. One class per state, the context forwards every button.",
    "Money is handled in two phases. Vending: build a pool, search for change, commit only on success. ATM: plan the notes, hold at the bank, dispense, then confirm or reverse.",
    "Greedy change fails with limited stock (30 cents from one quarter and three dimes), so both ChangeMaker and CashDispenser backtrack.",
    "Time is injected (TimeSource), so timeouts, daily limits and expiry are tested without sleeping. Hardware is injected too, so a jam is a test line.",
  ],
  flow: [
    "Vending: the customer inserts two dollars. IdleState starts a CashSession, the state becomes HasMoney, and the timeout timer is stamped.",
    "select A1: the machine checks the code, the stock and the money. CashSession builds a pool of the cashbox and the inserted coins and asks ChangeMaker for 50 cents.",
    "Two quarters are found, so the cashbox is replaced by the pool, the inserted coins are cleared, the stock drops and the outcome is DISPENSED. The state is Idle again.",
    "ATM: insert the card, enter the PIN (the bank compares salted hashes), withdraw 3700. The dispenser plans one 2000, three 500 and one 200 without taking them out.",
    "The bank places a hold under the transaction id, the hardware dispenses, the cassettes are updated and the bank confirms. If the hardware had jammed, the bank would be told to reverse the hold.",
  ],
  edgeCases: [
    "Vending: no exact change, card declined, a coin inserted during a card session, timeout exactly at the limit, a coin that restarts the timer, a fault with coins inside.",
    "Vending: refilling past the slot capacity, refilling a slot with a different product, staff operations while a customer is mid-sale.",
    "ATM: amount not a multiple of the smallest note, zero or negative amount, above the per-transaction limit, ATM cannot pay (decided before the bank is asked).",
    "ATM: jam after the hold (reverse), daily limit across midnight, the same transaction id sent twice (idempotent), reverse after confirm (refused), PIN never logged.",
  ],
};

export const VENDING_ATM_DEEP: Record<string, LldDeep> = {
  "lldp-vending-atm": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `The title pairs a vending machine with an ATM because they are one problem in two costumes: a device that moves through a small number of states, where every button means something different depending on the state, and that must handle money exactly. This project builds both, so you can start from either one in an interview and use the other as the extension.

Ask for the vending machine: which coins does it accept, and does it give change? What happens when it cannot make exact change? Can the customer cancel? What if they walk away with money inside? Is there card payment? Who restocks it, and who collects the cash? Is it one customer at a time? What happens when something breaks?

Ask for the ATM: which notes are loaded, what are the per-transaction and daily limits, how many PIN attempts are allowed, what happens to a card after too many wrong PINs, and what must happen if the cash mechanism jams after the bank has approved the money? That last question is the heart of the ATM problem, and a candidate who asks it early stands out.

The requirements we fix are in the guide above. Two decisions matter most. First, a refused sale or a failed withdrawal is a normal result, not an error: sold out, no change, wrong PIN and daily limit reached are all things a user can cause by pressing buttons, so they come back as values (an Outcome or an AtmResponse), and exceptions are kept for misuse by the program, such as refilling a machine that is not in maintenance mode. Second, time and hardware are inputs. The clock is an interface (TimeSource) and the note dispenser is an interface (NoteDispenser), so a test can move time forward and make the hardware jam.`,
      },
      {
        title: "Why the State pattern fits",
        body: `Look at what the Select button does. With no money it should say insert money. With enough money it should dispense. With too little it should keep the money and say so. With the machine broken it should refuse. Written as one method, that is an if ladder on a status field, and every new state or button makes the ladder longer and puts every old branch at risk.

The State pattern gives each state its own class behind one interface, VendingState, with one method per button: insert, tap, select, cancel and tick. The machine holds the current state and forwards every button to it. IdleState starts a payment session on the first coin or tap. HasMoneyState takes more coins, tries the sale and handles cancel and timeout. OutOfServiceState and MaintenanceState refuse customers. The interface uses default methods that mean the button does nothing here, so a state overrides only the buttons that matter in it. That keeps every state class short and makes the question what does this button do in this state answerable by reading one small class.

The transitions are few. Idle goes to HasMoney on the first coin or card tap. HasMoney stays there on more coins and on a rejected selection (unknown code, sold out, too little money), and goes back to Idle after a sale, a cancel, a timeout, a refund for missing change or a declined card. Any state can go to OutOfService when a fault is reported, and Idle or OutOfService can go to Maintenance when staff open the door. That is a state diagram you can draw in half a minute, which is a good sign that the design is the right size.

Be honest about when this is overkill. With only two states, a boolean could do. The pattern pays for itself when states multiply, and here they already have: maintenance and out of service are the ones interviewers ask for next.`,
      },
      {
        title: "Payment as a strategy, and where the money lives",
        body: `The first version of a vending machine takes coins. The first follow-up is card payment. If the machine stores a list of coins and every method reads it, adding a card means touching every method. Instead the machine talks to a PaymentSession interface with four methods: label, availableCents, settle and abort. CashSession holds the coins the customer has inserted. CardSession holds a card id and a CardGateway and has no money of its own.

The important rule is where the customer's money lives. Inserted coins stay in the session, apart from the cashbox, until a sale succeeds. That makes the refund paths trivial: cancel, timeout and fault all call session.abort(), which returns the list. It also makes a failed sale harmless, because the cashbox was never touched.

settle(price, cashbox) must change nothing unless it approves. For cash it builds a pool, which is a copy of the cashbox plus the inserted coins, because change may be paid with the customer's own coins. It asks ChangeMaker for the change, and only when change exists does it replace the cashbox with the pool minus the change and clear the inserted list. For a card it asks the gateway to charge, and a refusal produces CARD_DECLINED with an empty refund. Settlement is a small record that says approved or not, why, the change due and the refund.

The machine's trySell then reads like a checklist: is the code known, is there stock, is there enough money, then settle. Notice that it ends the session in every outcome of the settle call, and that a card session reports Integer.MAX_VALUE as available, because the machine cannot see a card balance and the gateway is the only judge.`,
      },
      {
        title: "Making change, and why greedy is not enough",
        body: `When the customer overpays, the machine must return exact change from the coins it really holds. The classic shortcut is to take the largest coin that fits, again and again. With unlimited coins of a canonical system such as US coins that is optimal. With limited stock it can fail where an answer exists: with one quarter and three dimes, 30 cents needs three dimes, but greedy takes the quarter first and is stuck with 5 cents it cannot make.

ChangeMaker therefore searches. For each coin from the largest down, it tries to use as many as allowed, then one fewer, and so on down to zero, recursing on what is left. The first complete answer uses the largest coins possible, and if none exists the search says so. With four coin types the tree is tiny, so the cost is irrelevant, but the correctness is not, and it is the kind of detail interviewers hope you notice. State the cost if asked: the worst case is the product of the stock counts, which is small for a real machine, and a dynamic programming table would be the answer if the coin set were large.

The same idea returns in the ATM as CashDispenser.plan. With one 500 note and three 200 notes, 600 cannot start with the 500, because the 100 that remains cannot be paid, so the search falls back to three 200 notes. The project tests exactly this case in both places. The second lesson is the pool: the customer's own coins are part of the supply, which is why a dollar for a 75 cent product can succeed in a machine whose cashbox holds nickels and quarters, and fail in a machine that is empty.`,
      },
      {
        title: "The vending flow, step by step",
        body: `Run Main and follow the first lines. The customer inserts two dollars. IdleState creates a CashSession, adds the first coin, stamps the activity time and moves to HasMoneyState. The second dollar is accepted by HasMoneyState. Select A1 reaches HasMoneyState.select, which asks the machine to try the sale. The machine finds the product, sees stock, compares 200 with 150, and calls session.settle. The pool is the cashbox plus two dollars, ChangeMaker finds two quarters for the 50 cents, the pool loses them, the cashbox becomes the pool, the stock of A1 drops by one and the outcome is DISPENSED with the quarters as change. The state becomes Idle.

The next lines show the rejections that keep the customer's money in place: a quarter and then A2 gives INSUFFICIENT_FUNDS, and another dollar makes the sale succeed with a quarter back. A dime and then B1 gives SOLD_OUT, and cancel returns the dime. A second machine with an empty cashbox is given a dollar for a 75 cent candy and answers NO_CHANGE with the dollar refunded.

Then the newer parts. A tap with a stolen card id reaches the gateway and gives CARD_DECLINED, after which the machine is idle. A good card buys the last cola with no change. A dollar is inserted and the clock moves 59 seconds: tick refunds nothing. Two seconds later tick refunds the dollar and the state is Idle, because the timeout is driven by the injected clock and no thread sleeps. A fault returns the quarter inside and puts the machine out of service, where select answers OUT_OF_SERVICE and insert returns false. Staff then enter maintenance, refill (only 10 of 20 fit, because a slot holds 10), collect cash above a float of two coins of each kind, and finish. The journal records every step with a time stamp.`,
      },
      {
        title: "The ATM: the same skeleton, a harder money problem",
        body: `An ATM has the same skeleton. The states are Idle, CardInserted and Authenticated. A digit key is a PIN digit in one state and an amount in another, and the State pattern again keeps that out of if statements. The Atm class is the context, and its public methods are synchronized because one customer uses it at a time.

What changes is the money. A vending machine keeps its own coins, and a failure leaves nothing to undo. An ATM is a gateway to a bank, and two systems must agree. The withdrawal code in Atm.doWithdraw therefore follows a fixed order: validate the amount (positive, a multiple of the smallest note, under the per-transaction limit); plan the notes with the CashDispenser without taking them out; ask the bank to hold the amount under a fresh transaction id; tell the hardware to dispense; remove the notes from the cassettes; confirm the hold. If the hardware throws a DispenseException, the ATM tells the bank to reverse the hold and answers DISPENSE_FAILED, and the customer is never charged.

Planning before holding matters. An ATM that cannot pay 700 because it only has 500 notes should say so before it touches the customer's account, and the test checks that the bank was never called. The hold, confirm and reverse protocol matters for the other reason: if the program crashed between dispensing and confirming, the bank still has an open hold with a transaction id, and a reconciliation job can compare it with the ATM's audit log. Confirm and reverse are idempotent, and a hold with a transaction id seen before returns the first answer, so a retry after a network timeout cannot debit twice.

The PIN is checked by the bank, which stores a salted SHA-256 hash and compares in constant time. The ATM counts wrong tries, and on the third it captures the card and asks the bank to block it, so the same card is refused at every other ATM. The AuditLog stores masked card numbers and never a PIN, and a test scans the log for both.`,
      },
      {
        title: "Concurrency, time and testing",
        body: `Each device serves one person at a time, so a lock on the public methods is enough, and the state objects hold no data. The shared object is the bank, which many ATMs talk to. It is synchronized, and the hold method checks the balance, the held amount and the daily limit inside one critical section. The last test starts eight threads that each ask for a hold of 300 on a balance of 1000 and checks that exactly three win. If the balance check and the hold were two steps, more than three could win.

Time is the reason for TimeSource. The vending machine's timeout and the ATM's session timeout are decided by comparing the clock with the last activity, and the bank's daily limit depends on the day. A ManualClock lets a test move 59 seconds, then 2 more, or a full day, and check the result immediately. Nothing sleeps, so the suite is fast and cannot flake. The bank day here is computed from epoch milliseconds for brevity; a real bank would use the account's time zone.

How to test it, in the order of the project: unit tests for ChangeMaker and CashDispenser, including the greedy trap; one test per state transition; one test per refusal; the refund and reversal paths; the clock tests; and the race test. Notice what is not mocked: the state classes and the sessions run for real, and only the edges (clock, gateway, hardware, bank) are replaced. A test that fails points at a cause, because each class has one job.

What you would add in production: persist the audit log before dispensing, so a crash leaves evidence; a reconciliation job for open holds; encrypted PIN entry with a hardware module so the PIN never reaches the ATM software in plain text; and metrics for cassette levels so a technician is sent before the machine runs out.`,
      },
      {
        title: "Edge cases, extensions and what interviewers probe",
        body: `Edge cases worth naming: coins inserted during a card session (refused, since a card has no change tray in this design); a decline after the customer selected; exact money, where the search returns an empty list immediately; two products at one price; a timeout exactly at the limit (the code uses greater than or equal, so the limit itself counts); a refill larger than the slot (the surplus is refused, and the call says how many fit); a staff member who opens the door during a sale (refused by canStartMaintenance); a daily limit that crosses midnight (the next day starts at zero, and a reversed hold gives back only today's usage).

Extensions: more payment methods are new PaymentSession classes. A fleet of machines needs a reporting channel, which is an observer on the journal. Dispensing can fail on the vending side too; the machine could take the money and reverse it the way the ATM does, if you want symmetry. Deposits and transfers are the same hold, confirm and reverse protocol on two accounts. Receipts and SMS alerts are listeners of the audit log.

Probes, with short answers. Why not one big switch on a status field? Every new state edits the same method; the pattern localises the change. Why return an Outcome and not throw? Because sold out is a normal result. Why plan before holding? So the ATM refuses what it cannot pay without touching the customer's account. Why hold then confirm, rather than debit then dispense? A debit that is followed by a jam needs a refund, which is a new transaction that can itself fail; a hold can be released. Why is the PIN hashed with a salt? So a stolen table does not reveal PINs, and equal PINs do not look equal. Why inject the clock? So timeouts and limits are tested in microseconds. What would you do for a thousand ATMs? Nothing in this design changes, because each is independent; the bank becomes a service with a database, and the hold protocol is what keeps the two sides consistent.`,
      },
    ],
    classDiagram: `classDiagram
    class VendingMachine {
        +insert(coin) boolean
        +tapCard(id) boolean
        +select(code) Outcome
        +cancel() List
        +tick() List
        +startMaintenance() boolean
        +refill(code, product, count) int
        +reportFault(reason) List
    }
    class VendingState {
        <<interface>>
        +insert(machine, coin)
        +select(machine, code)
        +cancel(machine)
        +tick(machine)
    }
    class PaymentSession {
        <<interface>>
        +availableCents() int
        +settle(price, cashbox) Settlement
        +abort() List
    }
    class Atm {
        +insertCard(card) AtmResponse
        +enterPin(pin) AtmResponse
        +withdraw(amount) AtmResponse
        +eject() AtmResponse
        +tick() AtmResponse
    }
    class AtmState {
        <<interface>>
        +enterPin(atm, pin)
        +withdraw(atm, amount)
    }
    class BankService {
        <<interface>>
        +verifyPin(card, pin)
        +hold(account, amount, txId)
        +confirm(txId)
        +reverse(txId)
    }
    class CashDispenser {
        +plan(amount) Optional
        +remove(plan)
    }
    class Cashbox
    class ChangeMaker
    class Inventory
    class AuditLog
    class TimeSource {
        <<interface>>
        +nowMillis() long
    }
    VendingMachine --> VendingState
    VendingState <|.. IdleState
    VendingState <|.. HasMoneyState
    VendingState <|.. OutOfServiceState
    VendingState <|.. MaintenanceState
    VendingMachine --> PaymentSession
    PaymentSession <|.. CashSession
    PaymentSession <|.. CardSession
    VendingMachine --> Cashbox
    VendingMachine --> Inventory
    CashSession ..> ChangeMaker
    VendingMachine --> TimeSource
    Atm --> AtmState
    AtmState <|.. IdleAtmState
    AtmState <|.. CardInsertedState
    AtmState <|.. AuthenticatedState
    Atm --> BankService
    BankService <|.. InMemoryBank
    Atm --> CashDispenser
    Atm --> AuditLog
    Atm --> TimeSource`,
    sequenceDiagram: `sequenceDiagram
    actor Customer
    participant M as VendingMachine
    participant S as HasMoneyState
    participant P as CashSession
    participant C as ChangeMaker
    participant I as Inventory
    Customer->>M: insert(DOLLAR) twice
    M->>M: Idle to HasMoney, stamp the clock
    Customer->>M: select(A1)
    M->>S: select(machine, A1)
    S->>M: trySell(A1)
    M->>I: knows, available, product
    M->>P: settle(150, cashbox)
    P->>P: pool = cashbox + inserted coins
    P->>C: make(50, pool)
    C-->>P: two quarters
    P-->>M: approved, change two quarters
    M->>I: dispenseOne(A1)
    M-->>Customer: Outcome DISPENSED with change
    M->>M: state becomes Idle`,
    stateDiagram: `stateDiagram-v2
    [*] --> Idle
    Idle --> HasMoney: coin inserted or card tapped
    HasMoney --> HasMoney: more coins, or a rejected selection
    HasMoney --> Idle: sale done
    HasMoney --> Idle: cancel, timeout, refund or card declined
    Idle --> Maintenance: staff opens the door
    OutOfService --> Maintenance: staff opens the door
    Maintenance --> Idle: staff finishes
    Idle --> OutOfService: fault
    HasMoney --> OutOfService: fault, coins refunded`,
    extraDiagrams: [
      {
        title: "What trySell decides",
        caption: "Every outcome of pressing Select in the HasMoney state, in the order the machine checks them.",
        source: `flowchart TD
    S["select(code) in HasMoney"] --> K{"Code known?"}
    K -- no --> U["UNKNOWN_CODE, money stays"]
    K -- yes --> A{"Any stock left?"}
    A -- no --> SO["SOLD_OUT, money stays"]
    A -- yes --> P{"Money available at least the price?"}
    P -- no --> IF["INSUFFICIENT_FUNDS, money stays"]
    P -- yes --> T{"settle: cash or card"}
    T -- "cash, change impossible" --> NC["NO_CHANGE, coins refunded, Idle"]
    T -- "card declined" --> CD["CARD_DECLINED, Idle"]
    T -- approved --> D["Cashbox updated, stock reduced"]
    D --> OK["DISPENSED with change, Idle"]`,
      },
      {
        title: "No exact change",
        caption: "The refund path. Nothing is committed before change has been found.",
        source: `sequenceDiagram
    actor Customer
    participant M as VendingMachine
    participant P as CashSession
    participant C as ChangeMaker
    Customer->>M: insert(DOLLAR)
    Customer->>M: select(C1) priced 75
    M->>P: settle(75, cashbox)
    P->>P: pool = empty cashbox + the dollar
    P->>C: make(25, pool)
    C-->>P: empty, not possible
    P-->>M: failed NO_CHANGE with the dollar as refund
    M-->>Customer: Outcome NO_CHANGE and the dollar back
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
        title: "Where the customer's money lives",
        caption: "Inserted coins stay in the session until a sale succeeds, which is what makes every refund path trivial.",
        source: `flowchart LR
    I["Customer inserts coins"] --> L["CashSession inserted list"]
    L -->|"cancel, timeout, fault, NO_CHANGE"| R["abort returns the list"]
    L -->|"sale succeeds"| P["Pool = cashbox + inserted"]
    P --> CB["Cashbox = pool minus change"]
    P --> CH["Change returned to the customer"]`,
      },
      {
        title: "Timeout driven by the clock",
        caption: "No thread sleeps. Whoever owns the clock calls tick, and the state decides. Each coin restarts the timer.",
        source: `sequenceDiagram
    participant T as Scheduler or test
    participant M as VendingMachine
    participant S as HasMoneyState
    participant Q as Clock
    T->>M: tick()
    M->>S: tick(machine)
    S->>M: timedOut()
    M->>Q: nowMillis()
    Q-->>M: 59000
    M-->>S: false, 59 s since the last coin
    S-->>T: nothing to refund
    T->>M: tick() two seconds later
    S->>M: abortSession("timeout")
    M-->>T: coins refunded, state Idle`,
      },
      {
        title: "Object snapshot: the machine mid-sale",
        caption: "What the objects hold after two dollars were inserted and before Select is pressed.",
        source: `flowchart LR
    VM["VendingMachine: state = HasMoney, lastActivity = 0"] --> CS["CashSession: inserted = DOLLAR, DOLLAR"]
    VM --> CB["Cashbox: QUARTER 4, DIME 4, NICKEL 4"]
    VM --> IN["Inventory: A1 Cola x2, A2 Chips x1, B1 Gum x0, C1 Candy x1"]
    VM --> TS["TimeSource: ManualClock"]`,
      },
      {
        title: "Vending machine states and who may do what",
        caption: "Customers act in Idle and HasMoney. Staff act only in Maintenance. A fault stops everything.",
        source: `flowchart TD
    F["Fault sensor"] --> OOS["OutOfService: customer buttons refused"]
    ST["Staff opens the door"] --> M1{"State allows it?"}
    M1 -- "Idle or OutOfService" --> MT["Maintenance: refill, collect cash"]
    M1 -- "HasMoney" --> NO["Refused, a customer is mid-sale"]
    MT --> DONE["finishMaintenance returns to Idle"]`,
      },
      {
        title: "ATM states",
        caption: "The same shape as the vending machine. A button's meaning depends on the state.",
        source: `stateDiagram-v2
    [*] --> Idle
    Idle --> CardInserted: card inserted
    CardInserted --> Authenticated: correct PIN
    CardInserted --> CardInserted: wrong PIN, tries left
    CardInserted --> Idle: card captured and blocked
    CardInserted --> Idle: eject or timeout
    Authenticated --> Authenticated: balance or withdrawal
    Authenticated --> Idle: eject or timeout`,
      },
      {
        title: "ATM withdrawal: hold, dispense, confirm or reverse",
        caption: "The debit and the cash can fail separately, so the bank hold is confirmed only after the notes are out.",
        source: `sequenceDiagram
    actor Customer
    participant A as Atm
    participant D as CashDispenser
    participant B as BankService
    participant H as NoteDispenser
    Customer->>A: withdraw(3700)
    A->>D: plan(3700)
    D-->>A: one 2000, three 500, one 200
    A->>B: hold(account, 3700, ATM-7-T1)
    B-->>A: APPROVED
    A->>H: dispense(plan)
    alt notes dispensed
        H-->>A: ok
        A->>D: remove(plan)
        A->>B: confirm(ATM-7-T1)
        A-->>Customer: cash and new balance
    else jam
        H-->>A: DispenseException
        A->>B: reverse(ATM-7-T1)
        A-->>Customer: DISPENSE_FAILED, not charged
    end`,
      },
      {
        title: "Withdrawal decisions, in order",
        caption: "Cheap local checks first, then the plan, then the bank, then the hardware.",
        source: `flowchart TD
    W["withdraw(amount)"] --> V{"Positive and a multiple of 100?"}
    V -- no --> I1["INVALID_AMOUNT"]
    V -- yes --> L{"Within the per-transaction limit?"}
    L -- no --> I2["EXCEEDS_TRANSACTION_LIMIT"]
    L -- yes --> PL{"CashDispenser.plan finds notes?"}
    PL -- no --> I3["ATM_CANNOT_PAY, bank not called"]
    PL -- yes --> H{"Bank hold approved?"}
    H -- "no balance" --> I4["INSUFFICIENT_FUNDS"]
    H -- "limit" --> I5["DAILY_LIMIT_EXCEEDED"]
    H -- yes --> HW{"Hardware dispensed?"}
    HW -- no --> RV["Bank reverse, DISPENSE_FAILED"]
    HW -- yes --> CF["Remove notes, bank confirm, OK"]`,
      },
      {
        title: "Planning notes with backtracking",
        caption: "600 from one 500 note and three 200 notes. Starting with the 500 leaves 100, which cannot be paid.",
        source: `flowchart TD
    S["Pay 600: one 500 and three 200"] --> A["Take one 500, 100 left"]
    S --> B["Take no 500, 600 left"]
    A --> A1["No 100 note: dead end"]
    B --> B1["Take three 200, 0 left: success"]`,
      },
      {
        title: "States of a bank hold",
        caption: "A hold is released by reverse or made final by confirm. Both are idempotent, and neither can undo the other.",
        source: `stateDiagram-v2
    [*] --> Held: hold approved
    [*] --> Rejected: hold refused
    Held --> Confirmed: confirm after the notes are out
    Held --> Reversed: reverse after a jam
    Confirmed --> Confirmed: confirm again, no effect
    Reversed --> Reversed: reverse again, no effect`,
      },
      {
        title: "Where the extensions attach",
        caption: "Each follow-up question lands in one place. Nothing needs a change to the existing state classes.",
        source: `flowchart TD
    X["Follow-up questions"] --> P["Phone wallet payment"]
    X --> D["Deposits and transfers"]
    X --> R["Remote monitoring"]
    X --> S["Statements and receipts"]
    P --> P1["New PaymentSession class"]
    D --> D1["Same hold, confirm, reverse with a second account"]
    R --> R1["Observer on the journal and the audit log"]
    S --> S1["Listener on AuditLog entries"]`,
      },
    ],
    concurrency: [
      "One machine serves one customer, so the public methods of VendingMachine and Atm are synchronized. The state objects hold no data and need nothing else.",
      "The bank is shared by every ATM. hold checks balance, held amount and the daily limit inside one synchronized method. The race test starts eight threads asking for 300 on a balance of 1000 and exactly three win.",
      "A sale is committed last. The pool is a copy, the cashbox is replaced only after change is found, and a failed settle changes nothing.",
      "Hold, confirm and reverse carry a transaction id and are idempotent, so a retry after a timeout cannot debit twice and a late reverse cannot undo a confirm.",
      "Timeouts are driven by tick on the same lock, not by a separate thread that mutates the machine. The clock is injected so tests move time by hand.",
      "For a fleet, do not share one Inventory or one cassette object across machines. Each owns its state and a server collects reports.",
    ],
  },
};
