import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the expense sharing project in lld-projects-c-splitwise.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const SPLITWISE_GUIDE: LldGuide = {
  requirements: [
    "Groups of people add expenses: who paid (one or several people), who shares it and how (equal, exact amounts, percentages, shares).",
    "Show who owes whom, per group and per person. Settle up with a payment. Delete an expense and have the balances go back exactly.",
    "Simplify debts: the fewest payments that clear everyone.",
    "Money is exact: the parts of a split always add up to the total to the cent, and the balances of a group always add up to zero.",
    "Several users add expenses at the same time without losing any.",
  ],
  entities: [
    "Group (members), Expense (paid, owed, total), Entry (an expense or a settlement plus the debts it created)",
    "SplitStrategy (EqualSplit, ExactSplit, PercentSplit, SharesSplit), Allocator (largest remainder)",
    "GroupLedger (pairwise debts, one lock per group), Debt (from, to, cents), DebtSimplifier (greedy, optimal)",
    "ExpenseService (facade, validation, listeners), ExpenseResult",
  ],
  patterns: [
    "Strategy for the split type",
    "Largest remainder method for exact rounding",
    "Ledger of debts with netting, entries that can be undone",
    "Observer for activity feeds; facade with result objects",
    "Subset DP for the optimal simplification, greedy as the fallback",
  ],
  code: `final class Allocator {
  static Map<String, Long> allocate(long total, Map<String, Long> weights) {
    long sumWeights = 0;
    for (long w : weights.values()) sumWeights += w;
    Map<String, Long> result = new TreeMap<>();
    Map<String, Long> remainder = new TreeMap<>();
    long assigned = 0;
    for (Map.Entry<String, Long> e : new TreeMap<>(weights).entrySet()) {
      long product = Math.multiplyExact(total, e.getValue());
      result.put(e.getKey(), product / sumWeights);      // rounded down
      remainder.put(e.getKey(), product % sumWeights);
      assigned += product / sumWeights;
    }
    List<String> order = new ArrayList<>(result.keySet());
    order.sort((a, b) -> remainder.get(b).compareTo(remainder.get(a)));   // biggest fraction first
    for (int i = 0; i < total - assigned; i++) result.merge(order.get(i), 1L, Long::sum);
    return result;
  }
}

interface SplitStrategy { Map<String, Long> split(long totalCents, List<String> participants); }

record Debt(String from, String to, long cents) { }

final class GroupLedger {
  synchronized void record(Entry entry) { entries.put(entry.id, entry); for (Debt d : entry.debts) addDebt(d.from(), d.to(), d.cents()); }
  synchronized boolean undo(String id) { /* apply the debts the other way round */ return true; }
}`,
  extensions: [
    "Multiple currencies: store the currency with each expense and convert at a rate captured when it was added.",
    "Recurring expenses: a scheduler that calls addExpense with the same arguments.",
    "Split by item (who ate what): a new SplitStrategy built from line items.",
    "Receipts and comments on an expense, and an activity feed built from the listener.",
  ],
};

export const SPLITWISE_EXTRA: LldExtra = {
  recap: [
    "Money is a long in cents. A split is exact by the largest remainder method: round every share down, then give the leftover cents to the biggest fractions.",
    "Each expense is stored as entered (paid, owed) and as the debts it created. Deleting applies the same debts in reverse, so the ledger returns exactly.",
    "Opposite debts between two people are netted as they arrive, so a pair has at most one direction. Net balances always add up to zero.",
    "Simplify: greedy (biggest debtor pays biggest creditor, at most n-1 payments) or optimal (the most independent zero-sum groups, found with a subset DP).",
  ],
  flow: [
    "Asha pays 400.00 for the hotel, shared equally by four. EqualSplit asks the Allocator for four equal weights and gets 100.00 each.",
    "The expense net is Asha +300.00, the others -100.00. DebtSimplifier.greedy turns that into three debts: each of the others owes Asha 100.00.",
    "GroupLedger.record stores the entry and adds each debt, netting against any opposite debt that already exists.",
    "Ben later pays Dev 50.00 in cash. settleUp records the debt the other way round (Dev owes Ben 50.00), which cancels part of what Ben owed.",
    "simplified() computes the net balances and returns the shortest list of payments that brings everyone to zero.",
  ],
  edgeCases: [
    "100.00 among three people (the odd cent), one cent among three, a total of zero.",
    "Exact amounts that do not add up, percentages that are not 100, all-zero shares, a participant outside the group.",
    "Two people paying for one expense; the payer also being a participant; two expenses whose debts cancel exactly.",
    "Delete an expense, delete it twice, delete a settlement; settle more than is owed (the debt turns around).",
    "Many threads adding expenses to one group; more than 15 people with a balance (optimal falls back to greedy).",
  ],
};

export const SPLITWISE_DEEP: Record<string, LldDeep> = {
  "lldp-splitwise": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `Expense sharing looks like arithmetic and is really a modelling problem with one hard algorithm in the middle. Friends go on a trip, one person pays the hotel, another the dinner, a third the taxi. At the end everyone wants to know: who owes whom, and what is the smallest number of payments to settle everything?

Ask about scope. Are expenses inside groups, between individuals, or both? Can one expense be paid by several people? Which ways of splitting are needed: equally, by exact amounts, by percentages, by shares? Does an expense get edited or deleted, and must the balances go back exactly? Is there a settle up action? Are multiple currencies in scope? Does the app have to show the simplest possible payments? How many people can be in a group, and are there concurrent users?

The requirements we fix are in the guide above. The two decisions that shape everything come next. First, money is a long in cents. Floating point cannot hold 0.1 exactly, and an app that loses a cent in every split ends up with balances that never reach zero. Second, the system has an invariant that we test directly: the net balances of a group always add up to zero, because every debt has a creditor. If that sum is ever not zero, there is a bug, and it is easy to check after every operation.

Mention the user-facing promise too: when the app says Ben owes Asha 70.00, that number must be explainable from the list of expenses. That is why the ledger keeps each expense as entered and the debts it caused, and does not only keep running totals.`,
      },
      {
        title: "Entities and what is stored",
        body: `Group is a record of an id, a name and its members, a map from user id to display name. Membership is fixed in this design, and the constructor copies the map into an unmodifiable one so that nobody can change a group behind the service's back.

Expense is what the user entered: an id, a group, a description, the total in cents, the paid map (who put in how much), the owed map (what each participant's share is) and the time. Both maps add up to the total, and the record has a net() method: for every person, paid minus owed. A positive net means the person put in more than they used, so they are owed money. A negative net means they owe money. The net of one expense always adds up to zero.

Debt is a record of from, to and cents, always positive. Entry is one line in a group's history. It holds an expense (or null for a settlement), the list of debts that entry created in the ledger, and a deleted flag. Keeping the debts with the entry is what makes undo trivial, and it keeps the history as an audit trail: a deleted expense stays in the list, marked.

GroupLedger holds the live state of one group: a sorted map of maps, owed[a][b], meaning what a owes b. It is the only place where debts are added, and all its methods are synchronized, so a group is the unit of locking. ExpenseService is the facade that validates input, calls the strategies, builds the entry and publishes events to listeners. It holds one ledger per group in a concurrent map.

Notice what is not stored: nobody's balance is a field. Net balances are computed from the pairwise debts when asked, so there is only one source of truth and no way for two numbers to disagree.`,
      },
      {
        title: "Splitting exactly: the largest remainder method",
        body: `Split 100.00 among three people and the shares are 33.333... each. Rounding each to 33.33 loses a cent; rounding each up creates one. The money must add up, so some people pay 33.34 and the others 33.33, and the question is who and why.

Allocator.allocate does this with the largest remainder method, which is the standard fair answer. Every person gets the rounded-down share, computed in integers as total times weight divided by the sum of weights. The cents left over (the total minus what was handed out) go one each to the people with the largest fractional parts, which is the remainder of that division. Ties are broken by user id, so the same input always gives the same output, which matters for tests and for users who recompute by hand. The result always adds up to the total, and nobody is more than one cent from their exact share. Both properties are tested over 2000 random cases.

Every split type is the same call with different weights. EqualSplit uses a weight of one for each participant. SharesSplit uses the weights the user gave (two shares for me, one for you). PercentSplit uses basis points, hundredths of a percent, so 33.33 percent is 3333 and the three numbers 3333, 3333 and 3334 can be written exactly and must sum to 10000. ExactSplit does not allocate at all: it checks that the amounts given add up to the total and that only participants appear.

Each is a class behind SplitStrategy, which has one method, split(total, participants). Invalid input throws an InvalidSplitException with a message such as amounts add up to 6.00 but the expense is 10.00, and ExpenseService converts it into a result at the boundary. Adding a split by item or by income is one new class, and nothing else changes.`,
      },
      {
        title: "From an expense to debts, and netting",
        body: `Once an expense has a paid map and an owed map, its net says who is a creditor and who is a debtor in this expense. To turn that into debts, the service lets the people with a negative net pay the people with a positive net. That is exactly the greedy routine used later for simplifying, applied to one expense. For the common case with one payer it gives the obvious answer: each participant owes the payer their share. For two payers it chooses a valid pairing, and the choice is arbitrary but exact, so the nets are preserved to the cent.

The ledger adds each debt with addDebt(from, to, cents). Before it adds, it looks at the opposite direction. If Ben owes Asha 10.00 and a new debt says Asha owes Ben 4.00, the result is Ben owes Asha 6.00, not two opposite lines. If the two cancel exactly, the pair disappears. So at most one direction of a pair is ever positive, and the list of who owes whom is as short as it can be without involving a third person.

Settle up is the same operation: a payment from Ben to Asha is recorded as the debt Asha owes Ben, which cancels part of what Ben owed. If Ben pays more than he owed, the netting turns the debt around, and now Asha owes Ben. That is correct and a good edge case to mention, because it is what a real person would expect.

Deleting an entry applies its debts the other way round. Because debts are only sums, the undo is exact: after adding and deleting a dinner, the balances and the list of pairs are equal to what they were before. The test compares them with equals, not with a tolerance. A deleted entry stays in the history with a flag, and a second delete is refused.`,
      },
      {
        title: "Simplifying debts",
        body: `After a trip the pairwise list may have a dozen lines, and the user wants the shortest list of payments that clears everyone. Only the net balances matter for this: whether Ben pays Asha or pays Dev who pays Asha makes no difference to anyone's final position.

The greedy algorithm is the one most people know. Take the person who is owed the most and the person who owes the most. The debtor pays the creditor as much as possible, which is the smaller of the two amounts. At least one of them is now at zero. Repeat. Each payment finishes at least one person, and the last payment finishes two, so there are at most n minus 1 payments for n people with a non-zero balance. It is fast and usually good, but it is not always the fewest.

The exact answer comes from a different view. A set of people whose balances add up to zero can settle among themselves with k minus 1 payments for k people. So the fewest payments overall is n minus the largest number of such independent groups you can split the people into. Finding that split is a subset problem (it is NP-hard in general), but for a friend group it is small. DebtSimplifier.optimal fills a table over all subsets of the people with a non-zero balance: best[mask] is the largest number of zero-sum groups that can be closed while adding the people of that set in some order. It then rebuilds the order and cuts it wherever the running sum is zero, and solves each group with the greedy routine. The table has 2 to the power n entries, so it is limited to 15 people, and larger groups fall back to greedy.

The test has a case where greedy needs 5 payments and the optimum is 4: the balances 5, 4, minus 3, 5, minus 4, minus 7 contain the pair 4 and minus 4, which settles alone. Other tests check that over random groups the optimal answer is never longer than the greedy one, and that paying the simplified debts brings every balance to exactly zero.`,
      },
      {
        title: "The main flow, step by step",
        body: `Run Main and follow it. First the Allocator on its own: 100.00 among three gives 33.34, 33.33 and 33.33, with the odd cent to the first by id. Shares one to two to three of 10.00 give 1.67, 3.33 and 5.00. Then the trip. Asha pays 400.00 for the hotel, shared by four, so Asha is at plus 300.00 and the others at minus 100.00.

Ben pays the 90.50 dinner for three people, with exact amounts of 30.00, 20.50 and 40.00 that add up to the total, so Dev is not in it. Chen pays a 100.00 taxi split 50, 30 and 20 percent. Dev and Asha together pay 300.00 for tickets, shared by four, which is the two-payer case. The net balances are Asha plus 245.00, Ben minus 135.00, Chen minus 135.00 and Dev plus 25.00, and they add up to zero. The pairwise list has six lines, and the simplified list has three: Ben pays Asha 135.00, Chen pays Asha 110.00 and Chen pays Dev 25.00.

Then the failures. A split that does not add up is refused with its message, and a payer who is not in the group is refused as NOT_A_MEMBER. In both cases nothing changes in the ledger, because validation happens before the ledger is touched. Ben pays Dev 50.00 and his balance improves by that much. Deleting the hotel works once and is refused the second time, the balances change accordingly and still add up to zero. The listener saw six events in order.

All of this is covered by tests, including the ones that Main does not print: the property tests for the Allocator, the 300 random expenses after each of which the balances add up to zero, and eight threads adding 2000 expenses to one group.`,
      },
      {
        title: "Concurrency and testing",
        body: `Two people add expenses to the same group at the same moment. The ledger must not lose either, and the balances must still add up. GroupLedger does everything under one lock per group, because a ledger operation reads and updates several entries together: netting an opposite debt reads one cell and writes two. One lock per group is the right size. Different groups never wait for each other, and inside a group an operation takes microseconds.

ExpenseService itself holds almost no state. It has a concurrent map of ledgers, an atomic counter for ids and a copy-on-write list of listeners, so reads are cheap and subscribing is safe at any time. The validation and the split run before the lock is taken, and they only read immutable data, so the lock is held only for the update. The test starts eight threads that each add 250 expenses and 25 settlements to one group and checks that every one of the 2200 entries is in the history and that the balances add up to zero.

What to test and in which order, as the project does it. The pure parts first, with no service: money formatting, the Allocator (examples and a property test), each strategy including its errors, and the simplifier. Then the ledger through the service: a single payer, several payers, opposite debts, settle up, delete and undo. Then validation, where each refused request is a test and the test also checks that nothing changed. Then the invariants over random input: balances add up to zero, simplified payments clear everyone, optimal is never longer than greedy. Last, the thread test.

Notice that a seeded Random makes the property tests repeatable. A failing seed is a bug report you can run again.`,
      },
      {
        title: "Edge cases, extensions and what interviewers probe",
        body: `Edge cases worth naming: one cent among three people; a total of zero; the payer is also a participant (their own share cancels out in the net); the same person listed as payer and participant with different amounts; two debts that cancel exactly; settling more than is owed; deleting something twice; a group where everyone is at zero; a participant who is not in the group.

Extensions are small by design. Multiple currencies mean storing the currency on each expense and a rate captured when the expense is added, so that history does not change when rates do; balances are then kept per currency or converted at display time. Recurring expenses are a scheduler that calls addExpense. A split by item is a new SplitStrategy built from line items. Receipts and comments are fields on the entry. An activity feed is a listener. Friends outside any group are a group of two created on demand.

Probes, with short answers. Why integers and not BigDecimal? Cents are exact and fast, and the only operation that needs fractions is the split, which the Allocator handles. BigDecimal is also correct, but every comparison needs care. Why store debts with the entry? To undo exactly and to explain a balance. Why net opposite debts? So the list a user sees is as short as possible and a pair is never in both directions. Is greedy optimal? No, and the project has a counterexample; the optimal answer is NP-hard in general, so say what you would do for a big group, which is greedy. What if a user is deleted? Their balance must be settled first, so the group refuses removal while a balance is not zero. How would you scale it? A group is the unit of locking and of storage, so groups can be partitioned across servers, and the ledger becomes a table of entries with a sum query.`,
      },
    ],
    classDiagram: `classDiagram
    class ExpenseService {
        +createGroup(group)
        +addExpense(groupId, description, paid, participants, split) ExpenseResult
        +deleteExpense(groupId, entryId) ExpenseResult
        +settleUp(groupId, from, to, cents) ExpenseResult
        +balances(groupId) Map
        +whoOwesWhom(groupId) List
        +simplified(groupId) List
        +subscribe(listener)
    }
    class SplitStrategy {
        <<interface>>
        +split(totalCents, participants) Map
    }
    class Allocator {
        +allocate(total, weights) Map
    }
    class GroupLedger {
        +record(entry)
        +undo(entryId) boolean
        +pairwise() List
        +netBalances() Map
    }
    class Entry {
        id
        expense
        debts
        deleted
    }
    class Expense {
        <<record>>
        totalCents
        paid
        owed
        +net() Map
    }
    class Debt {
        <<record>>
        from
        to
        cents
    }
    class DebtSimplifier {
        +greedy(net) List
        +optimal(net) List
    }
    class Group {
        <<record>>
        members
        +has(userId) boolean
    }
    class ExpenseListener {
        <<interface>>
        +onEvent(type, groupId, entryId)
    }
    ExpenseService --> GroupLedger
    ExpenseService --> SplitStrategy
    ExpenseService --> DebtSimplifier
    ExpenseService --> ExpenseListener
    SplitStrategy <|.. EqualSplit
    SplitStrategy <|.. ExactSplit
    SplitStrategy <|.. PercentSplit
    SplitStrategy <|.. SharesSplit
    EqualSplit ..> Allocator
    PercentSplit ..> Allocator
    SharesSplit ..> Allocator
    GroupLedger --> Group
    GroupLedger --> Entry
    Entry --> Expense
    Entry --> Debt
    DebtSimplifier ..> Debt`,
    sequenceDiagram: `sequenceDiagram
    actor Asha
    participant S as ExpenseService
    participant P as SplitStrategy
    participant A as Allocator
    participant D as DebtSimplifier
    participant L as GroupLedger
    Asha->>S: addExpense(trip, Hotel, asha 400.00, four people, EqualSplit)
    S->>S: validate group, payers, participants
    S->>P: split(40000, participants)
    P->>A: allocate(40000, weights 1 1 1 1)
    A-->>P: 100.00 each
    P-->>S: owed map
    S->>S: expense.net() = asha +300, others -100
    S->>D: greedy(net)
    D-->>S: three debts to Asha
    S->>L: record(entry)
    L->>L: addDebt for each, netting opposites
    S-->>Asha: OK, entry E1`,
    stateDiagram: `stateDiagram-v2
    [*] --> Active: expense or settlement recorded
    Active --> Deleted: deleteExpense applies the debts in reverse
    Deleted --> Deleted: a second delete is refused`,
    extraDiagrams: [
      {
        title: "Largest remainder: 100.00 among three",
        caption: "Round every share down, then give the left-over cents to the biggest fractions, ties by id.",
        source: `flowchart TD
    T["total 10000 cents, weights 1 1 1"] --> F["Floor of each share: 3333, 3333, 3333"]
    F --> L["Left over: 10000 - 9999 = 1 cent"]
    L --> R["Remainders are all 1, so the tie goes to the smallest id: asha"]
    R --> O["Result: asha 3334, ben 3333, chen 3333"]`,
      },
      {
        title: "From paid and owed to debts",
        caption: "The net of one expense says who is a creditor and who a debtor. Debtors pay creditors until all are at zero.",
        source: `flowchart LR
    P["paid: dev 200.00, asha 100.00"] --> N["net = paid minus owed"]
    O["owed: 75.00 each for four"] --> N
    N --> C["Creditors: dev +125.00, asha +25.00"]
    N --> DB["Debtors: ben -75.00, chen -75.00"]
    C --> G["Greedy matching"]
    DB --> G
    G --> X["ben owes dev 75.00, chen owes dev 50.00, chen owes asha 25.00"]`,
      },
      {
        title: "Netting opposite debts",
        caption: "A pair never has debts in both directions. The new debt first cancels what exists the other way round.",
        source: `flowchart TD
    A["addDebt from, to, cents"] --> Q{"Does to already owe from?"}
    Q -- no --> S["Add cents to what from owes to"]
    Q -- yes --> M["Cancel min of the two amounts"]
    M --> R{"Anything left of the new debt?"}
    R -- yes --> S
    R -- no --> E["Done, the pair may have disappeared"]`,
      },
      {
        title: "Delete is an exact undo",
        caption: "The entry kept the debts it created, so undo applies them in the opposite direction.",
        source: `sequenceDiagram
    participant S as ExpenseService
    participant L as GroupLedger
    participant E as Entry E2
    S->>L: undo(E2)
    L->>E: read its debts
    E-->>L: ben owes asha 25.00, chen owes asha 25.00
    L->>L: addDebt asha to ben 25.00, asha to chen 25.00
    L->>E: deleted = true
    L-->>S: true
    S-->>S: publish EXPENSE_DELETED`,
      },
      {
        title: "Settle up, including overpaying",
        caption: "A payment is the reverse of a debt. Paying more than owed turns the debt around.",
        source: `flowchart LR
    S1["Ben owes Asha 100.00"] --> S2["Ben pays 40.00: Ben owes 60.00"]
    S2 --> S3["Ben pays 70.00 more: Asha owes Ben 10.00"]`,
      },
      {
        title: "Greedy simplification step by step",
        caption: "Balances: asha +245, dev +25, ben -135, chen -135. The biggest debtor pays the biggest creditor.",
        source: `flowchart TD
    S0["asha +245, dev +25, ben -135, chen -135"] --> S1["ben pays asha 135: asha +110, ben 0"]
    S1 --> S2["chen pays asha 110: asha 0, chen -25"]
    S2 --> S3["chen pays dev 25: all at zero"]`,
      },
      {
        title: "Why greedy is not always optimal",
        caption: "5, 4, -3, 5, -4, -7. The pair 4 and -4 settles alone, so the optimum is 4 payments and greedy needs 5.",
        source: `flowchart TD
    A["Whole group: 6 people"] --> G1["Group one: +4 and -4, one payment"]
    A --> G2["Group two: +5, +5, -3, -7, three payments"]
    G1 --> T["Total 4 payments = 6 people - 2 groups"]
    G2 --> T`,
      },
      {
        title: "Optimal simplification with a subset table",
        caption: "Add people one at a time, count how often the running sum hits zero, keep the order with the most zeros.",
        source: `flowchart TD
    A["People with a non-zero balance, at most 15"] --> B["sum[mask] for every subset"]
    B --> C["best[mask] = max over one person removed, plus 1 if sum[mask] is 0"]
    C --> D["Rebuild the best order of adding people"]
    D --> E["Cut the order where the running sum is zero"]
    E --> F["Each piece of k people: k - 1 greedy payments"]`,
      },
      {
        title: "Object snapshot: balances after the trip",
        caption: "Net balances are computed from the pairwise debts and always add up to zero.",
        source: `flowchart LR
    L["GroupLedger trip"] --> P1["ben owes asha 70.00"]
    L --> P2["ben owes dev 75.00"]
    L --> P3["chen owes asha 75.00"]
    L --> P4["chen owes ben 10.00"]
    L --> P5["chen owes dev 50.00"]
    L --> P6["dev owes asha 100.00"]
    L --> NB["Net: asha +245, dev +25, ben -135, chen -135, sum 0"]`,
      },
      {
        title: "Where the extensions attach",
        caption: "Each follow-up question lands in one place.",
        source: `flowchart TD
    X["Follow-up questions"] --> C["Currencies"]
    X --> I["Split by item"]
    X --> R["Recurring expenses"]
    X --> F["Activity feed and notifications"]
    C --> C1["Currency and a captured rate on Expense"]
    I --> I1["New SplitStrategy built from line items"]
    R --> R1["Scheduler calling addExpense"]
    F --> F1["ExpenseListener subscribers"]`,
      },
    ],
    concurrency: [
      "GroupLedger methods are synchronized: a group is the unit of locking, so different groups never wait for each other. An operation reads and writes several cells (netting), which is why one lock covers the whole ledger of the group.",
      "Validation and the split run before the lock is taken and only read immutable data, so the lock is held only while debts are added.",
      "ExpenseService has no mutable shared state of its own: a concurrent map of ledgers, an AtomicLong for ids and a copy-on-write list of listeners.",
      "Listeners run on the calling thread after the ledger update. A slow listener would slow the writer, so in production it only enqueues the event.",
      "The test runs eight threads adding 2200 entries to one group and checks that none is lost and that the balances add up to zero.",
      "Across servers, a group is also the unit of partitioning: all of its entries live in one place and the balance is a sum query over them.",
    ],
  },
};
