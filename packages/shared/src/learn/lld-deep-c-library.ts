import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the library management project in lld-projects-c-library.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const LIBRARY_GUIDE: LldGuide = {
  requirements: [
    "A catalogue of titles, each with several physical copies. Search by title or author with availability.",
    "Members of different tiers: loan limit, loan length, renewals and fine rate depend on the tier.",
    "Check out, return, renew. Late returns cost a fine; a lost book costs its replacement price plus any late fine.",
    "Reservations: when no copy is free, members queue. A returned copy is held for the first in line for three days, then passes on.",
    "Blocking rules: overdue loans, unpaid fines of 5.00 or more, the loan limit. Many members act at once without deadlocks or double loans.",
  ],
  entities: [
    "Title (isbn, author, copies, reservation queue, lock), Copy (status, held for), Member (tier, loans, fines, lock)",
    "Loan (due date, renewals, returned), MembershipTier (limits), FinePolicy (DailyFine)",
    "Library (facade), LibraryResult and LibraryCode, LibraryListener, TimeSource",
  ],
  patterns: [
    "Two locks per operation in a fixed order (member, then title) to avoid deadlock",
    "Strategy for fines; enum with fields for tier rules",
    "Queue with hold expiry (a lease) and lazy sweeping",
    "Observer for notifications; result codes instead of exceptions",
  ],
  code: `final class Library {
  private <T> T locked(Member member, Title title, Supplier<T> body) {
    member.lock.lock();                 // always the member first ...
    try {
      title.lock.lock();                // ... then the title: one global order, so no deadlock
      try { return body.get(); } finally { title.lock.unlock(); }
    } finally { member.lock.unlock(); }
  }

  LibraryResult giveBack(String loanId) {
    Loan loan = loans.get(loanId);
    Member member = members.get(loan.memberId);
    Title title = titles.get(loan.isbn);
    return locked(member, title, () -> {
      if (!loan.active()) return LibraryResult.of(LibraryCode.ALREADY_RETURNED);
      long fine = finePolicy.fine(member.tier, loan.dueAt, clock.nowMillis());
      member.fineCents += fine;
      loan.returnedAt = clock.nowMillis();
      member.loans.remove(loan.id);
      offerCopy(title, title.copies.get(loan.copyId));     // next in the queue, or back on the shelf
      return new LibraryResult(LibraryCode.OK, loan, fine);
    });
  }
}

interface FinePolicy { long fine(MembershipTier tier, long dueAt, long returnedAt); }`,
  extensions: [
    "Digital loans: a Copy that never runs out but has a licence count, behind the same checkout call.",
    "Barcode scanning: copies are found by id, and checkout(memberId, copyId) is a second entry point.",
    "Inter-library loans and branch transfers: a Copy has a branch and a status IN_TRANSIT.",
    "Recommendations or e-mail reminders as listeners on the event stream.",
  ],
};

export const LIBRARY_EXTRA: LldExtra = {
  recap: [
    "Three nouns: a Title (the work), its Copies (the objects) and a Loan (a copy with a member and a due date). Reservations belong to the title, not to a copy.",
    "A returned copy goes to the front of the queue as a three-day hold. A hold is a lease that is swept lazily and by a periodic call.",
    "Locks: one per member and one per title, always taken member first. Operations that need only one take only that one.",
    "Fines are a strategy; tier rules are an enum; the clock is injected, so due dates and hold expiry are tested by moving it.",
  ],
  flow: [
    "Chen asks for Dune. checkout locks Chen, then the Dune title, sweeps expired holds and runs the blocking rules. No copy is free, so the result is NOT_AVAILABLE.",
    "Chen reserves: his id goes to the end of the title's queue and the answer says position 1.",
    "Asha returns her copy 6 days late. giveBack locks Asha and the title, charges 6 days of fine, closes the loan and calls offerCopy.",
    "offerCopy takes Chen from the queue, marks the copy ON_HOLD for him until now plus 3 days and publishes HOLD_READY.",
    "If Chen collects it in time, checkout finds the copy held for him and lends it. Otherwise sweepHolds expires the hold and offers the copy to the next member or puts it back on the shelf.",
  ],
  edgeCases: [
    "A walk-in tries to take a copy that is held for someone else (refused). The holder cancels while the copy is held (it moves on).",
    "A renewal while somebody waits, a renewal when overdue, more renewals than the tier allows.",
    "A fine below and above the 5.00 threshold, paying part of a fine, paying more than owed.",
    "A lost book (copy written off, replacement price charged), returning a loan twice, a member who already has a copy of the title.",
    "Thirty members racing for one copy; twelve threads mixing every operation on four titles.",
  ],
};

export const LIBRARY_DEEP: Record<string, LldDeep> = {
  "lldp-library": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `A library looks like a table of books and a table of loans, and an interviewer expects you to go beyond that quickly. The interesting questions are about rules and about what happens when a book is wanted by more than one person.

Ask about the objects. Is a book one thing or many? A library owns several copies of a popular title, so there is a difference between the work and the physical object, and people reserve the work while they carry the object. Ask about people. Are there different kinds of members, with different limits? Ask about lending. How long is a loan, can it be renewed, and what stops a renewal? Ask about trouble. What happens when a book is late, how is the fine computed, does it block the member, and what is charged for a lost book? Ask about demand. If every copy is out, can a member queue, what do they get when a copy comes back, and for how long is it kept for them?

The requirements we fix are in the guide above. Three early decisions shape the code. First, money is in integer cents. Second, expected refusals (limit reached, fines due, not available) are result codes, not exceptions, because a counter clerk sees them every hour. Third, time is injected: due dates, fines and hold expiry all depend on it, and a test must be able to move a clock by 20 days without waiting.

Say aloud what is out of scope: branches, barcodes, digital loans and payment gateways. They are extensions, and the design is meant to take them without rewriting the core.`,
      },
      {
        title: "Entities: title, copy, loan, member",
        body: `Title is the work: ISBN, name, author, a replacement price, its copies and a queue of members who are waiting for one. Copy is the physical object with an id such as 978-1-2, a status and, when it is on hold, the member it is held for and the time the hold ends. CopyStatus has four values: AVAILABLE, ON_LOAN, ON_HOLD and LOST. Reservations live on the title and not on a copy, because a member waits for any copy, and the queue is first come, first served.

Loan joins a copy and a member: id, borrowed time, due time, a renewal count and a returned time. Its fields are volatile so that the overdue report can read them without any lock. Member holds the tier, the active loans by id and the unpaid fines in cents.

MembershipTier is an enum with fields: loan limit, days per loan, renewals allowed, fine per day and fine cap. An enum is the right size while the tiers differ only in numbers. If a tier needed behaviour of its own, such as a different rule for which books it may borrow, it would become a policy object.

FinePolicy is a strategy with one method: given the tier, the due time and the return time, how many cents. DailyFine charges a fixed amount for each started day, up to a cap. One minute late costs a day, exactly one day late costs one day, and a year late costs the cap, so a forgotten novel never costs more than a few books. The tests pin each of these.

Library is the facade. It holds concurrent maps of titles, members and loans, and it is the only class that changes anything.`,
      },
      {
        title: "Checking out and the blocking rules",
        body: `checkout(member, isbn) is a list of questions in a fixed order, and each refusal has its own code, so the counter screen can say exactly why. First, are there unpaid fines of 5.00 or more? Then FINES_DUE. Does the member have a loan that is already past its due date? Then HAS_OVERDUE. Do they already have this title? Then ALREADY_BORROWED. Are they at the tier's limit? Then LIMIT_REACHED. Is there a copy for them? Then NOT_AVAILABLE. Only when every answer is fine does the code change anything: the copy becomes ON_LOAN, a Loan is created with a due time of now plus the tier's days, and a CHECKED_OUT event is published.

Which copy does a member get? The private helper copyFor looks for a copy that is on hold for this member first, and otherwise takes any available copy. It never returns a copy held for somebody else. That one rule gives reservations their meaning: a held copy is invisible to everyone but its holder, and the test checks that a walk-in is told NOT_AVAILABLE while the copy sits on the hold shelf.

Collecting a held copy also ends the member's place in the queue, which is why checkout removes the member from the queue after lending. A different order of the rules would give a different user experience: checking the limit before the fines would tell a blocked member the wrong problem. State the order you chose and why.

The tests go through every code, because each refusal is a rule a librarian could argue about. Notice that a refused checkout changes nothing, so a test can ask for the same thing again.`,
      },
      {
        title: "Returns, renewals, fines and lost books",
        body: `giveBack(loanId) closes the loan and settles money. It computes the fine through the strategy, adds it to the member's balance, marks the loan returned, removes it from the member's active loans and publishes events. Then it hands the freed copy to offerCopy, which is where reservations come in (next section). A second return of the same loan is refused as ALREADY_RETURNED, and an unknown loan id is UNKNOWN_LOAN.

renew(loanId) extends the due date by one more loan period, if three rules allow it: the loan is not already overdue, the member has not used all the renewals of their tier, and nobody is waiting in the queue for the title. The last rule is the fair one: someone who reserved the book should not be kept waiting by a borrower who renews forever. The codes are OVERDUE, RENEWAL_LIMIT and RESERVED_BY_OTHER.

reportLost(loanId) charges the replacement price of the title plus whatever late fine has built up, writes the copy off as LOST (it never comes back on the shelf), and closes the loan. The charge goes into the same fine balance, so the blocking rule applies: a student who loses a 20.00 book cannot borrow again until they pay it down below 5.00.

payFine accepts a positive amount that is not more than what is owed, and answers with the new balance. Refusing an overpayment is a product decision, and it is the safer one: a credit balance needs a refund process that this library does not have.

All of these are small methods, and each is the same shape: look things up, take the locks, check, change, publish. If you can say that sentence about your own code, it will be easy to review.`,
      },
      {
        title: "Reservations and holds",
        body: `When every copy of a title is out, a member reserves. The title keeps a deque of member ids. reserve refuses a member who already has the title (ALREADY_BORROWED), who is already queued (ALREADY_RESERVED), or when a copy is free for them right now (AVAILABLE_NOW, which tells the clerk to lend it instead). Otherwise the member goes to the end of the queue and the answer carries their position.

When a copy becomes free, whether by a return, a cancelled hold or an expired hold, the library calls offerCopy. It takes the first member from the queue and, if there is one, marks the copy ON_HOLD for that member with a deadline of now plus three days, and publishes HOLD_READY so that an e-mail can be sent. If the queue is empty, the copy goes back to AVAILABLE. Taking the member from the queue at that moment means a hold has one owner and the queue only contains people who are still waiting.

A hold is a lease, and it needs an owner for its expiry. Instead of a background thread, every operation that reads a title first calls sweepHolds: any copy ON_HOLD whose deadline has passed publishes HOLD_EXPIRED and is offered to the next member. A scheduler can also call sweepAll() so that a hold nobody asks about is still noticed. The test uses both paths. The deadline is inclusive, as with any lease: at exactly three days the hold is gone.

Cancelling a reservation has two cases. If the member is still in the queue, they are removed. If the copy is already held for them, it is released through offerCopy, so it moves to the next person immediately. Both are tested.`,
      },
      {
        title: "Concurrency: two locks and a fixed order",
        body: `Two librarians check out the last copy of Dune for two members at the same moment. Which one succeeds? The answer must be exactly one, and that is a concurrency question. The title's state (its copies and its queue) is shared, and so is the member's state (their loans and fines), and most operations need both: a checkout reads the member's loans and changes the title's copy.

One global lock would be correct and simple, and it would serialise a whole library for no reason. One lock per title and one per member is finer, but it brings the classic danger: thread A holds a member's lock and waits for a title's lock while thread B holds that title's lock and waits for the same member. That is a deadlock. The fix is a lock order. Every operation that needs both takes the member's lock first and then the title's lock, through one helper called locked(member, title, body). With one global order no cycle can form. Operations that need only one lock, such as paying a fine or sweeping holds, take just that lock, which cannot create a cycle either, because they never wait for a second lock while holding the first.

Why member first? The order itself is arbitrary, and what matters is that there is one. Put it in a helper so that nobody can write the opposite order by accident, and comment it.

The tests check both halves. Thirty members race for one copy and exactly one wins. Twelve threads then run 300 rounds each of checkout, renew, return, reserve and cancel over four titles, with a 30 second limit; if the lock order were wrong this test would hang rather than fail, so the test asserts that every thread finished. Afterwards it checks an invariant: the number of copies ON_LOAN equals the number of active loans over all members.`,
      },
      {
        title: "Testing, step by step",
        body: `Run Main and read it as a story. Asha and Ben borrow the two copies of Dune, so none is left. Asha cannot borrow it twice, Chen is told NOT_AVAILABLE and reserves, and Ben's renewal is refused because somebody is waiting. Twenty days pass. Both loans are overdue (the student loan is 14 days). Asha returns her copy six days late and pays 1.50 in fines, and the freed copy is on hold for Chen. Ben, who is overdue himself, is refused a new loan.

Four days later Chen has not come, the hold has expired and the copy is free again. Chen borrows it now, as staff for 28 days, and renews it for 28 more. Ben loses his copy: 2000 cents for the book and 250 for ten late days, so 22.50 in fines, which blocks him from borrowing. He pays 20.00, and then a payment larger than his remaining balance is refused. He pays the rest and can borrow Emma.

The tests follow the same risks. First the fine strategy at its boundaries: one millisecond late, exactly a day, a day and a millisecond, the cap and a different tier. Then checkout, the limits for both tiers and each blocking rule. Then return, with a fine, twice, and unknown. Then the queue: positions, first come first served, a held copy that belongs to its holder, expiry that passes the copy on, cancellation in both cases. Then renewals, lost books, payments, search and the overdue report sorted by due date. Last, the event order and the two concurrency tests.

Everything that depends on time uses the ManualClock, so the longest test is the thread test.`,
      },
      {
        title: "Extensions and what interviewers probe",
        body: `Extensions are small by design. A barcode at the counter means a second entry point, checkout by copy id, which finds the title and then runs the same rules. Branches add a branch to the Copy and a status IN_TRANSIT, and the search shows the nearest branch. Digital loans are a Title whose copies never run out but which has a licence count, behind the same call. Fines could be paid through a payment gateway, in which case payFine becomes a two-step call like the movie booking. Reminders that a book is due are a scheduled job that reads the overdue and due-soon lists and publishes events, and recommendations are a listener.

Probes, with short answers. Why separate a title from its copies? People reserve the work and carry the object, and a library has several copies. Why not one lock for the whole library? It would make unrelated members wait for each other. Why two locks and in which order? Most operations touch a member and a title, and a fixed order prevents deadlock. Why result codes? Refusals are normal events at a counter. Why integer cents? Because a fine is money. Why does a renewal stop when somebody waits? So that reservations are fair. Why not a background thread for hold expiry? A lazy sweep is deterministic, it needs no lifecycle and it is easy to test. What would change with many servers? The per-title and per-member locks become row locks in a database, the queue becomes an ordered table, and the hold deadline becomes a column that a conditional update checks.

Finally, mention what you would measure in production: the number of holds that expire (a sign that members are not told in time), the average queue length and the share of loans that end with a fine.`,
      },
    ],
    classDiagram: `classDiagram
    class Library {
        +addTitle(isbn, name, author, price, copies)
        +checkout(memberId, isbn) LibraryResult
        +giveBack(loanId) LibraryResult
        +renew(loanId) LibraryResult
        +reportLost(loanId) LibraryResult
        +reserve(memberId, isbn) LibraryResult
        +cancelReservation(memberId, isbn) LibraryResult
        +payFine(memberId, cents) LibraryResult
        +search(text) List
        +overdue() List
        +sweepAll()
    }
    class Title {
        isbn
        author
        replacementCents
        queue
        lock
    }
    class Copy {
        id
        status
        heldFor
        holdUntil
    }
    class Member {
        id
        tier
        loans
        fineCents
        lock
    }
    class Loan {
        id
        dueAt
        renewals
        returnedAt
    }
    class MembershipTier {
        <<enumeration>>
        STUDENT
        STAFF
    }
    class FinePolicy {
        <<interface>>
        +fine(tier, dueAt, returnedAt) long
    }
    class LibraryListener {
        <<interface>>
        +onEvent(type, memberId, detail)
    }
    class TimeSource {
        <<interface>>
        +nowMillis() long
    }
    Library --> Title
    Library --> Member
    Library --> Loan
    Library --> FinePolicy
    Library --> LibraryListener
    Library --> TimeSource
    Title --> Copy
    Member --> MembershipTier
    Member --> Loan
    Loan --> Copy
    FinePolicy <|.. DailyFine`,
    sequenceDiagram: `sequenceDiagram
    actor Asha
    participant L as Library
    participant M as Member lock
    participant T as Title lock
    participant F as FinePolicy
    Asha->>L: giveBack(L1)
    L->>M: lock member
    L->>T: lock title
    L->>F: fine(tier, dueAt, now)
    F-->>L: 150 cents
    L->>L: member.fineCents += 150, loan returned
    L->>L: offerCopy: next in queue is Chen
    L->>L: copy ON_HOLD for Chen, 3 days
    L-->>Asha: OK, fine 150
    L->>T: unlock title
    L->>M: unlock member`,
    stateDiagram: `stateDiagram-v2
    [*] --> AVAILABLE
    AVAILABLE --> ON_LOAN: checkout
    ON_LOAN --> AVAILABLE: return, queue empty
    ON_LOAN --> ON_HOLD: return, someone is waiting
    ON_HOLD --> ON_LOAN: the holder collects it
    ON_HOLD --> ON_HOLD: hold expires, next in line
    ON_HOLD --> AVAILABLE: hold expires or is cancelled, queue empty
    ON_LOAN --> LOST: reported lost`,
    extraDiagrams: [
      {
        title: "The questions checkout asks, in order",
        caption: "Each refusal has its own code. Nothing is changed until every question has passed.",
        source: `flowchart TD
    S["checkout(member, isbn)"] --> F{"Unpaid fines 5.00 or more?"}
    F -- yes --> R1["FINES_DUE"]
    F -- no --> O{"Any loan past its due date?"}
    O -- yes --> R2["HAS_OVERDUE"]
    O -- no --> A{"Already has this title?"}
    A -- yes --> R3["ALREADY_BORROWED"]
    A -- no --> L{"At the tier loan limit?"}
    L -- yes --> R4["LIMIT_REACHED"]
    L -- no --> C{"A copy held for this member, or a free one?"}
    C -- no --> R5["NOT_AVAILABLE"]
    C -- yes --> OK["Copy ON_LOAN, loan created, leave the queue"]`,
      },
      {
        title: "A reservation from queue to loan",
        caption: "Chen waits, Asha returns, the copy is held for Chen, and Chen collects it before the deadline.",
        source: `sequenceDiagram
    actor Chen
    actor Asha
    participant L as Library
    Chen->>L: checkout(Dune)
    L-->>Chen: NOT_AVAILABLE
    Chen->>L: reserve(Dune)
    L-->>Chen: OK, position 1
    Asha->>L: giveBack(loan)
    L->>L: offerCopy takes Chen from the queue
    L->>L: copy ON_HOLD for Chen until day 23
    L-->>Chen: event HOLD_READY
    Chen->>L: checkout(Dune)
    L->>L: copyFor finds the copy held for Chen
    L-->>Chen: OK, loan due in 28 days`,
      },
      {
        title: "Hold expiry and passing on",
        caption: "No thread runs in the background. Any read of the title sweeps, and a scheduler may call sweepAll.",
        source: `flowchart TD
    A["Copy ON_HOLD for Ben until day 3"] --> B{"Is now at or after day 3?"}
    B -- no --> K["Keep the hold"]
    B -- yes --> E["Publish HOLD_EXPIRED for Ben"]
    E --> Q{"Anyone else in the queue?"}
    Q -- yes --> H["ON_HOLD for the next member, new 3 day deadline"]
    Q -- no --> S["AVAILABLE on the shelf"]`,
      },
      {
        title: "Lock order prevents deadlock",
        caption: "Both threads take the member lock first, so neither can wait on the other while holding the second lock.",
        source: `sequenceDiagram
    participant A as Thread A, Asha returns Dune
    participant B as Thread B, Ben checks out Dune
    participant MA as Lock Asha
    participant MB as Lock Ben
    participant T as Lock Dune
    A->>MA: lock
    B->>MB: lock
    A->>T: lock title
    Note over B,T: Ben waits here, still holding only his own member lock
    A->>T: unlock title
    A->>MA: unlock
    B->>T: lock title
    B->>T: unlock title
    B->>MB: unlock`,
      },
      {
        title: "Fines and tiers",
        caption: "The same strategy gives different amounts for each tier. The cap stops a forgotten book from costing more than it is worth.",
        source: `flowchart LR
    R["returnedAt, dueAt, tier"] --> D["Days late = started days"]
    D --> M["days times the tier rate"]
    M --> C["Smaller of that and the tier cap"]
    C --> F["Fine added to the member balance"]
    F --> B{"Balance 5.00 or more?"}
    B -- yes --> X["Borrowing blocked until paid down"]
    B -- no --> Y["Borrowing allowed"]`,
      },
      {
        title: "Object snapshot on day 20",
        caption: "State of the library just before Asha returns her copy. Chen is waiting, both loans are past due.",
        source: `flowchart LR
    T["Title Dune: 2 copies"] --> C1["978-1-1 ON_LOAN"]
    T --> C2["978-1-2 ON_LOAN"]
    T --> Q["Queue: chen"]
    C1 --> L1["Loan L1: asha, due day 14"]
    C2 --> L2["Loan L2: ben, due day 14"]
    MA["Member asha, STUDENT, fines 0"] --> L1
    MB["Member ben, STUDENT, fines 0"] --> L2`,
      },
      {
        title: "Lost book",
        caption: "The copy is written off and the charge goes into the same fine balance, so the borrowing block applies.",
        source: `flowchart TD
    A["reportLost(loan)"] --> B["Charge = late fine + replacement price"]
    B --> C["Add to the member fine balance"]
    C --> D["Copy status LOST, never offered again"]
    D --> E["Loan closed, marked lost"]
    E --> F{"Balance 5.00 or more?"}
    F -- yes --> G["Member cannot borrow until they pay down"]
    F -- no --> H["Member continues as normal"]`,
      },
      {
        title: "Where the extensions attach",
        caption: "Each follow-up question lands in one place.",
        source: `flowchart TD
    X["Follow-up questions"] --> BC["Barcodes at the counter"]
    X --> BR["Branches and transfers"]
    X --> DG["Digital loans"]
    X --> NT["Reminders and recommendations"]
    BC --> BC1["checkout by copy id, same rules"]
    BR --> BR1["Branch on Copy, status IN_TRANSIT"]
    DG --> DG1["Title with a licence count instead of copies"]
    NT --> NT1["Scheduled job and LibraryListener subscribers"]`,
      },
    ],
    concurrency: [
      "State is guarded by two kinds of lock: one per Title (copies and queue) and one per Member (loans and fines). Different titles and different members never wait for each other.",
      "Every operation that needs both locks takes the member lock first and the title lock second, through one helper. With one global order a deadlock cannot form. Operations that need only one lock take only that one.",
      "The last copy of a title is decided inside the title lock, so two members racing for it get exactly one winner. The test uses 30 threads.",
      "Hold expiry is a lazy sweep under the title lock before any read, plus an optional sweepAll() from a scheduler. No background thread has to be managed or stopped.",
      "Loan fields are volatile, so the overdue report can read them without taking any lock. A report may see a loan just before it is returned, which is fine for a report.",
      "Listeners are called while the locks are held, which keeps the order of events. A slow listener would hold up the counter, so in production listeners only put events on a queue.",
    ],
  },
};
