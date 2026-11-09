import type { LldProject } from "./types";

// Library management (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when it was written.

export const LLD_PROJECTS_C_LIBRARY: Record<string, LldProject> = {
  "lldp-library": {
    files: [
      {
        name: "TimeSource.java",
        code: `// The only way any class here learns the time, so due dates, fines and hold expiry are tested by moving a clock.
interface TimeSource {
    long nowMillis();
}
`,
      },
      {
        name: "ManualClock.java",
        code: `final class ManualClock implements TimeSource {
    private long now;

    ManualClock(long start) { this.now = start; }

    @Override
    public synchronized long nowMillis() { return now; }

    synchronized void advance(long millis) { now += millis; }

    synchronized void advanceDays(int days) { now += days * 86_400_000L; }
}
`,
      },
      {
        name: "MembershipTier.java",
        code: `// The rules that differ by kind of member. An enum with fields is enough while there are a few tiers; if each tier
// needed behaviour of its own, it would become a class hierarchy or a policy object.
enum MembershipTier {
    STUDENT(3, 14, 2, 25, 1_000),
    STAFF(6, 28, 3, 10, 500);

    private final int maxLoans;
    private final int loanDays;
    private final int maxRenewals;
    private final int finePerDayCents;
    private final int fineCapCents;

    MembershipTier(int maxLoans, int loanDays, int maxRenewals, int finePerDayCents, int fineCapCents) {
        this.maxLoans = maxLoans;
        this.loanDays = loanDays;
        this.maxRenewals = maxRenewals;
        this.finePerDayCents = finePerDayCents;
        this.fineCapCents = fineCapCents;
    }

    int maxLoans() { return maxLoans; }

    int loanDays() { return loanDays; }

    int maxRenewals() { return maxRenewals; }

    int finePerDayCents() { return finePerDayCents; }

    int fineCapCents() { return fineCapCents; }
}
`,
      },
      {
        name: "CopyStatus.java",
        code: `enum CopyStatus { AVAILABLE, ON_LOAN, ON_HOLD, LOST }
`,
      },
      {
        name: "Copy.java",
        code: `// One physical book. A title ("Dune") has several copies. Mutable fields are guarded by the lock of the Title.
final class Copy {
    final String id;
    final String isbn;
    CopyStatus status = CopyStatus.AVAILABLE;
    String heldFor;     // member id, when status is ON_HOLD
    long holdUntil;

    Copy(String id, String isbn) {
        this.id = id;
        this.isbn = isbn;
    }
}
`,
      },
      {
        name: "Title.java",
        code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

// A book as a work: author, replacement price, its copies and the queue of members waiting for one. Everything that
// can change is guarded by this title's lock, so two members racing for the last copy are decided inside it.
final class Title {
    final String isbn;
    final String name;
    final String author;
    final int replacementCents;
    final Map<String, Copy> copies = new LinkedHashMap<>();
    final Deque<String> queue = new ArrayDeque<>();
    final ReentrantLock lock = new ReentrantLock();

    Title(String isbn, String name, String author, int replacementCents) {
        this.isbn = isbn;
        this.name = name;
        this.author = author;
        this.replacementCents = replacementCents;
    }
}
`,
      },
      {
        name: "Loan.java",
        code: `// One borrowing. Its fields change only while the member's and the title's locks are both held, but they are
// volatile so a report can read them without any lock.
final class Loan {
    final String id;
    final String copyId;
    final String isbn;
    final String memberId;
    final long borrowedAt;
    volatile long dueAt;
    volatile int renewals;
    volatile long returnedAt = -1;
    volatile boolean lost;

    Loan(String id, String copyId, String isbn, String memberId, long borrowedAt, long dueAt) {
        this.id = id;
        this.copyId = copyId;
        this.isbn = isbn;
        this.memberId = memberId;
        this.borrowedAt = borrowedAt;
        this.dueAt = dueAt;
    }

    boolean active() { return returnedAt < 0; }
}
`,
      },
      {
        name: "Member.java",
        code: `import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

// A library member: their tier, current loans and unpaid fines. Guarded by the member's own lock.
final class Member {
    final String id;
    final String name;
    final MembershipTier tier;
    final Map<String, Loan> loans = new LinkedHashMap<>();   // active loans by loan id
    long fineCents;
    final ReentrantLock lock = new ReentrantLock();

    Member(String id, String name, MembershipTier tier) {
        this.id = id;
        this.name = name;
        this.tier = tier;
    }
}
`,
      },
      {
        name: "FinePolicy.java",
        code: `// How much a late return costs. A strategy, because libraries argue about this more than about anything else.
interface FinePolicy {
    long fine(MembershipTier tier, long dueAt, long returnedAt);
}
`,
      },
      {
        name: "DailyFine.java",
        code: `// A fixed amount per started day late, up to a cap. Returning one minute late costs one day; the cap stops a book
// that was forgotten for a year from costing more than the book.
final class DailyFine implements FinePolicy {
    private static final long DAY = 86_400_000L;

    @Override
    public long fine(MembershipTier tier, long dueAt, long returnedAt) {
        if (returnedAt <= dueAt) return 0;
        long daysLate = (returnedAt - dueAt + DAY - 1) / DAY;
        return Math.min(daysLate * tier.finePerDayCents(), tier.fineCapCents());
    }
}
`,
      },
      {
        name: "LibraryCode.java",
        code: `enum LibraryCode {
    OK, UNKNOWN_MEMBER, UNKNOWN_TITLE, UNKNOWN_LOAN, NOT_AVAILABLE, ALREADY_BORROWED, LIMIT_REACHED, HAS_OVERDUE,
    FINES_DUE, ALREADY_RESERVED, AVAILABLE_NOW, NOT_RESERVED, ALREADY_RETURNED, RENEWAL_LIMIT, OVERDUE,
    RESERVED_BY_OTHER, BAD_AMOUNT, MORE_THAN_OWED
}
`,
      },
      {
        name: "LibraryResult.java",
        code: `// What every call returns. loan is set for a checkout or renew; cents carries a fine charged or a number such as the
// position in the queue; message says more where a code needs it.
record LibraryResult(LibraryCode code, Loan loan, long cents) {
    static LibraryResult of(LibraryCode code) { return new LibraryResult(code, null, 0); }

    boolean ok() { return code == LibraryCode.OK; }
}
`,
      },
      {
        name: "LibraryListener.java",
        code: `// Observer: e-mail, SMS and dashboards subscribe here and the library does not know them.
interface LibraryListener {
    void onEvent(String type, String memberId, String detail);
}
`,
      },
      {
        name: "Library.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;

// The facade. Every operation that touches a member and a title takes TWO locks, always in the same order: the
// member's first, then the title's. A fixed order means two threads can never each hold one lock and wait for the
// other's, which is the classic deadlock. Operations that touch only one of them take just that lock.
final class Library {
    static final long DAY = 86_400_000L;
    static final long HOLD_MILLIS = 3 * DAY;
    static final long FINES_BLOCK_AT_CENTS = 500;

    private final TimeSource clock;
    private final FinePolicy finePolicy;
    private final Map<String, Title> titles = new ConcurrentHashMap<>();
    private final Map<String, Member> members = new ConcurrentHashMap<>();
    private final Map<String, Loan> loans = new ConcurrentHashMap<>();
    private final List<LibraryListener> listeners = new CopyOnWriteArrayList<>();
    private final AtomicInteger nextLoan = new AtomicInteger(1);

    Library(TimeSource clock, FinePolicy finePolicy) {
        this.clock = clock;
        this.finePolicy = finePolicy;
    }

    void subscribe(LibraryListener listener) { listeners.add(listener); }

    private void publish(String type, String memberId, String detail) {
        for (LibraryListener l : listeners) l.onEvent(type, memberId, detail);
    }

    // ---------------------------------------------------------------- catalogue

    void addTitle(String isbn, String name, String author, int replacementCents, int copies) {
        Title title = titles.computeIfAbsent(isbn, k -> new Title(isbn, name, author, replacementCents));
        title.lock.lock();
        try {
            for (int i = 0; i < copies; i++) {
                String id = isbn + "-" + (title.copies.size() + 1);
                title.copies.put(id, new Copy(id, isbn));
            }
        } finally {
            title.lock.unlock();
        }
    }

    void addMember(String id, String name, MembershipTier tier) { members.put(id, new Member(id, name, tier)); }

    // Titles whose name or author contains the text, with how many copies are free right now.
    List<String> search(String text) {
        String needle = text.toLowerCase();
        List<String> found = new ArrayList<>();
        for (Title t : titles.values()) {
            if (!t.name.toLowerCase().contains(needle) && !t.author.toLowerCase().contains(needle)) continue;
            t.lock.lock();
            try {
                sweepHolds(t);
                long free = t.copies.values().stream().filter(c -> c.status == CopyStatus.AVAILABLE).count();
                found.add(t.name + " by " + t.author + ": " + free + " of " + t.copies.size() + " available, " + t.queue.size() + " waiting");
            } finally {
                t.lock.unlock();
            }
        }
        found.sort(String::compareTo);
        return found;
    }

    // ---------------------------------------------------------------- lending

    LibraryResult checkout(String memberId, String isbn) {
        Member member = members.get(memberId);
        if (member == null) return LibraryResult.of(LibraryCode.UNKNOWN_MEMBER);
        Title title = titles.get(isbn);
        if (title == null) return LibraryResult.of(LibraryCode.UNKNOWN_TITLE);
        return locked(member, title, () -> {
            sweepHolds(title);
            long now = clock.nowMillis();
            if (member.fineCents >= FINES_BLOCK_AT_CENTS) return LibraryResult.of(LibraryCode.FINES_DUE);
            for (Loan l : member.loans.values()) {
                if (l.dueAt < now) return LibraryResult.of(LibraryCode.HAS_OVERDUE);
                if (l.isbn.equals(isbn)) return LibraryResult.of(LibraryCode.ALREADY_BORROWED);
            }
            if (member.loans.size() >= member.tier.maxLoans()) return LibraryResult.of(LibraryCode.LIMIT_REACHED);

            Copy copy = copyFor(title, memberId);
            if (copy == null) return LibraryResult.of(LibraryCode.NOT_AVAILABLE);
            copy.status = CopyStatus.ON_LOAN;
            copy.heldFor = null;
            title.queue.remove(memberId);   // picking up a reserved copy ends the reservation
            Loan loan = new Loan("L" + nextLoan.getAndIncrement(), copy.id, isbn, memberId, now, now + member.tier.loanDays() * DAY);
            member.loans.put(loan.id, loan);
            loans.put(loan.id, loan);
            publish("CHECKED_OUT", memberId, title.name + " due " + (loan.dueAt / DAY));
            return new LibraryResult(LibraryCode.OK, loan, 0);
        });
    }

    // A copy that is on hold for this member comes first; otherwise any free copy. Never a copy held for someone else.
    private static Copy copyFor(Title title, String memberId) {
        Copy free = null;
        for (Copy c : title.copies.values()) {
            if (c.status == CopyStatus.ON_HOLD && memberId.equals(c.heldFor)) return c;
            if (c.status == CopyStatus.AVAILABLE && free == null) free = c;
        }
        return free;
    }

    LibraryResult giveBack(String loanId) {
        Loan loan = loans.get(loanId);
        if (loan == null) return LibraryResult.of(LibraryCode.UNKNOWN_LOAN);
        Member member = members.get(loan.memberId);
        Title title = titles.get(loan.isbn);
        return locked(member, title, () -> {
            if (!loan.active()) return LibraryResult.of(LibraryCode.ALREADY_RETURNED);
            long now = clock.nowMillis();
            long fine = finePolicy.fine(member.tier, loan.dueAt, now);
            member.fineCents += fine;
            loan.returnedAt = now;
            member.loans.remove(loan.id);
            if (fine > 0) publish("FINE_ADDED", member.id, title.name + " " + fine);
            publish("RETURNED", member.id, title.name);
            offerCopy(title, title.copies.get(loan.copyId));
            return new LibraryResult(LibraryCode.OK, loan, fine);
        });
    }

    LibraryResult renew(String loanId) {
        Loan loan = loans.get(loanId);
        if (loan == null) return LibraryResult.of(LibraryCode.UNKNOWN_LOAN);
        Member member = members.get(loan.memberId);
        Title title = titles.get(loan.isbn);
        return locked(member, title, () -> {
            if (!loan.active()) return LibraryResult.of(LibraryCode.ALREADY_RETURNED);
            if (clock.nowMillis() > loan.dueAt) return LibraryResult.of(LibraryCode.OVERDUE);
            if (loan.renewals >= member.tier.maxRenewals()) return LibraryResult.of(LibraryCode.RENEWAL_LIMIT);
            if (!title.queue.isEmpty()) return LibraryResult.of(LibraryCode.RESERVED_BY_OTHER);
            loan.dueAt += member.tier.loanDays() * DAY;
            loan.renewals++;
            publish("RENEWED", member.id, title.name);
            return new LibraryResult(LibraryCode.OK, loan, 0);
        });
    }

    // A lost book: the member pays the replacement price plus any late fine, and the copy is written off.
    LibraryResult reportLost(String loanId) {
        Loan loan = loans.get(loanId);
        if (loan == null) return LibraryResult.of(LibraryCode.UNKNOWN_LOAN);
        Member member = members.get(loan.memberId);
        Title title = titles.get(loan.isbn);
        return locked(member, title, () -> {
            if (!loan.active()) return LibraryResult.of(LibraryCode.ALREADY_RETURNED);
            long now = clock.nowMillis();
            long charge = finePolicy.fine(member.tier, loan.dueAt, now) + title.replacementCents;
            member.fineCents += charge;
            loan.returnedAt = now;
            loan.lost = true;
            member.loans.remove(loan.id);
            title.copies.get(loan.copyId).status = CopyStatus.LOST;
            publish("LOST", member.id, title.name + " " + charge);
            return new LibraryResult(LibraryCode.OK, loan, charge);
        });
    }

    // ---------------------------------------------------------------- reservations

    LibraryResult reserve(String memberId, String isbn) {
        Member member = members.get(memberId);
        if (member == null) return LibraryResult.of(LibraryCode.UNKNOWN_MEMBER);
        Title title = titles.get(isbn);
        if (title == null) return LibraryResult.of(LibraryCode.UNKNOWN_TITLE);
        return locked(member, title, () -> {
            sweepHolds(title);
            for (Loan l : member.loans.values()) if (l.isbn.equals(isbn)) return LibraryResult.of(LibraryCode.ALREADY_BORROWED);
            if (title.queue.contains(memberId)) return LibraryResult.of(LibraryCode.ALREADY_RESERVED);
            if (copyFor(title, memberId) != null) return LibraryResult.of(LibraryCode.AVAILABLE_NOW);
            title.queue.addLast(memberId);
            publish("RESERVED", memberId, title.name + " position " + title.queue.size());
            return new LibraryResult(LibraryCode.OK, null, title.queue.size());
        });
    }

    LibraryResult cancelReservation(String memberId, String isbn) {
        Member member = members.get(memberId);
        if (member == null) return LibraryResult.of(LibraryCode.UNKNOWN_MEMBER);
        Title title = titles.get(isbn);
        if (title == null) return LibraryResult.of(LibraryCode.UNKNOWN_TITLE);
        return locked(member, title, () -> {
            boolean removed = title.queue.remove(memberId);
            for (Copy c : title.copies.values()) {
                if (c.status == CopyStatus.ON_HOLD && memberId.equals(c.heldFor)) {
                    removed = true;
                    offerCopy(title, c);   // the held copy goes to the next in line, or back on the shelf
                }
            }
            return LibraryResult.of(removed ? LibraryCode.OK : LibraryCode.NOT_RESERVED);
        });
    }

    // A copy has become free (a return, a cancelled hold, an expired hold): give it to the next member in the queue,
    // for three days, or put it back on the shelf. Caller holds the title's lock.
    private void offerCopy(Title title, Copy copy) {
        String next = title.queue.pollFirst();
        if (next == null) {
            copy.status = CopyStatus.AVAILABLE;
            copy.heldFor = null;
            return;
        }
        copy.status = CopyStatus.ON_HOLD;
        copy.heldFor = next;
        copy.holdUntil = clock.nowMillis() + HOLD_MILLIS;
        publish("HOLD_READY", next, title.name + " until " + (copy.holdUntil / DAY));
    }

    // Holds that were not picked up in time pass on. Called under the title's lock before anything reads the copies.
    private void sweepHolds(Title title) {
        long now = clock.nowMillis();
        for (Copy c : title.copies.values()) {
            if (c.status == CopyStatus.ON_HOLD && c.holdUntil <= now) {
                publish("HOLD_EXPIRED", c.heldFor, title.name);
                offerCopy(title, c);
            }
        }
    }

    // A scheduler calls this now and then so that expired holds are noticed even when nobody asks for the title.
    void sweepAll() {
        for (Title t : titles.values()) {
            t.lock.lock();
            try {
                sweepHolds(t);
            } finally {
                t.lock.unlock();
            }
        }
    }

    // ---------------------------------------------------------------- fines and reports

    LibraryResult payFine(String memberId, long cents) {
        Member member = members.get(memberId);
        if (member == null) return LibraryResult.of(LibraryCode.UNKNOWN_MEMBER);
        if (cents <= 0) return LibraryResult.of(LibraryCode.BAD_AMOUNT);
        member.lock.lock();
        try {
            if (cents > member.fineCents) return LibraryResult.of(LibraryCode.MORE_THAN_OWED);
            member.fineCents -= cents;
            publish("FINE_PAID", memberId, "" + cents);
            return new LibraryResult(LibraryCode.OK, null, member.fineCents);
        } finally {
            member.lock.unlock();
        }
    }

    long fineOf(String memberId) {
        Member m = members.get(memberId);
        m.lock.lock();
        try {
            return m.fineCents;
        } finally {
            m.lock.unlock();
        }
    }

    // Loans that are past their due date and not returned, oldest due date first.
    List<Loan> overdue() {
        long now = clock.nowMillis();
        List<Loan> out = new ArrayList<>();
        for (Loan l : loans.values()) if (l.active() && l.dueAt < now) out.add(l);
        out.sort((a, b) -> Long.compare(a.dueAt, b.dueAt));
        return out;
    }

    int copiesWithStatus(String isbn, CopyStatus status) {
        Title t = titles.get(isbn);
        t.lock.lock();
        try {
            sweepHolds(t);
            return (int) t.copies.values().stream().filter(c -> c.status == status).count();
        } finally {
            t.lock.unlock();
        }
    }

    int activeLoans(String memberId) {
        Member m = members.get(memberId);
        m.lock.lock();
        try {
            return m.loans.size();
        } finally {
            m.lock.unlock();
        }
    }

    // ---------------------------------------------------------------- locking

    private <T> T locked(Member member, Title title, Supplier<T> body) {
        member.lock.lock();
        try {
            title.lock.lock();
            try {
                return body.get();
            } finally {
                title.lock.unlock();
            }
        } finally {
            member.lock.unlock();
        }
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.ArrayList;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        ManualClock clock = new ManualClock(0);
        Library library = new Library(clock, new DailyFine());
        List<String> events = new ArrayList<>();
        library.subscribe((type, member, detail) -> events.add(type + " " + member));

        library.addTitle("978-1", "Dune", "Frank Herbert", 2_000, 2);
        library.addTitle("978-2", "Emma", "Jane Austen", 1_500, 1);
        library.addMember("asha", "Asha", MembershipTier.STUDENT);
        library.addMember("ben", "Ben", MembershipTier.STUDENT);
        library.addMember("chen", "Chen", MembershipTier.STAFF);

        System.out.println("Search dune: " + library.search("dune"));
        LibraryResult a = library.checkout("asha", "978-1");
        LibraryResult b = library.checkout("ben", "978-1");
        System.out.println("Asha and Ben borrow Dune: " + a.code() + " " + b.code() + ", copies free: " + library.copiesWithStatus("978-1", CopyStatus.AVAILABLE));
        System.out.println("Asha borrows Dune again: " + library.checkout("asha", "978-1").code());
        System.out.println("Chen borrows Dune: " + library.checkout("chen", "978-1").code());
        LibraryResult first = library.reserve("chen", "978-1");
        System.out.println("Chen reserves Dune: " + first.code() + ", position " + first.cents() + ", second try: " + library.reserve("chen", "978-1").code());
        System.out.println("Ben renews Dune with a reservation waiting: " + library.renew(b.loan().id).code());

        clock.advanceDays(20);
        System.out.println("Day 20, overdue loans: " + library.overdue().size());
        LibraryResult returned = library.giveBack(a.loan().id);
        System.out.println("Asha returns Dune 6 days late: fine " + returned.cents() + " cents, her balance " + library.fineOf("asha"));
        System.out.println("Dune copies on hold: " + library.copiesWithStatus("978-1", CopyStatus.ON_HOLD) + " (held for Chen)");
        System.out.println("Ben, overdue himself, borrows Emma: " + library.checkout("ben", "978-2").code());

        clock.advanceDays(4);
        System.out.println("Four days later Chen has not come. Dune copies free: " + library.copiesWithStatus("978-1", CopyStatus.AVAILABLE));
        LibraryResult chen = library.checkout("chen", "978-1");
        System.out.println("Chen borrows Dune: " + chen.code() + ", due in " + (chen.loan().dueAt - clock.nowMillis()) / Library.DAY + " days");
        System.out.println("Chen renews: " + library.renew(chen.loan().id).code() + ", due in " + (chen.loan().dueAt - clock.nowMillis()) / Library.DAY + " days");

        LibraryResult lost = library.reportLost(b.loan().id);
        System.out.println("Ben loses Dune: charge " + lost.cents() + " cents, fine balance " + library.fineOf("ben"));
        System.out.println("Ben borrows Emma: " + library.checkout("ben", "978-2").code());
        System.out.println("Ben pays 2000 and then 99999: " + library.payFine("ben", 2_000).code() + " then " + library.payFine("ben", 99_999).code());
        System.out.println("Ben pays the rest, borrows Emma: " + library.payFine("ben", library.fineOf("ben")).code() + " " + library.checkout("ben", "978-2").code());
        System.out.println("Search by author: " + library.search("austen"));
        System.out.println("Events: " + events.size() + " in total, first five " + events.subList(0, 5));
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int failures = 0;
    private static final long DAY = Library.DAY;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static final class Shelf {
        final ManualClock clock = new ManualClock(0);
        final Library library = new Library(clock, new DailyFine());
        final List<String> events = new ArrayList<>();

        Shelf() {
            library.subscribe((type, member, detail) -> events.add(type + ":" + member));
            library.addTitle("t1", "Dune", "Frank Herbert", 2_000, 1);
            library.addTitle("t2", "Emma", "Jane Austen", 1_500, 2);
            library.addTitle("t3", "Ulysses", "James Joyce", 1_000, 1);
            library.addTitle("t4", "Walden", "Henry Thoreau", 800, 1);
            library.addMember("a", "Asha", MembershipTier.STUDENT);
            library.addMember("b", "Ben", MembershipTier.STUDENT);
            library.addMember("c", "Chen", MembershipTier.STAFF);
            library.addMember("d", "Dev", MembershipTier.STUDENT);
        }
    }

    public static void main(String[] args) throws Exception {
        fineCalculation();
        checkoutBasics();
        limitsByTier();
        blockingRules();
        returning();
        reservationsAreFirstComeFirstServed();
        heldCopyBelongsToTheHolder();
        holdsExpireAndPassOn();
        cancellingReservations();
        renewing();
        lostBooks();
        paymentsOfFines();
        searchAndReports();
        eventsAreOrdered();
        oneCopyManyThreads();
        mixedWorkloadDoesNotDeadlock();
        if (failures > 0) System.exit(1);
    }

    private static void fineCalculation() {
        DailyFine f = new DailyFine();
        MembershipTier s = MembershipTier.STUDENT;
        check(f.fine(s, 1000, 1000) == 0 && f.fine(s, 1000, 500) == 0, "on time or early: no fine");
        check(f.fine(s, 0, 1) == 25, "one millisecond late counts as one day");
        check(f.fine(s, 0, DAY) == 25, "exactly one day late is one day");
        check(f.fine(s, 0, DAY + 1) == 50, "one day and a bit is two days");
        check(f.fine(s, 0, 400 * DAY) == 1_000, "the fine stops at the cap");
        check(f.fine(MembershipTier.STAFF, 0, 3 * DAY) == 30, "staff pay less per day");
    }

    private static void checkoutBasics() {
        Shelf s = new Shelf();
        LibraryResult r = s.library.checkout("a", "t1");
        check(r.ok() && r.loan().dueAt == 14 * DAY, "a student gets 14 days");
        check(s.library.checkout("c", "t2").loan().dueAt == 28 * DAY, "staff get 28 days");
        check(s.library.checkout("nobody", "t1").code() == LibraryCode.UNKNOWN_MEMBER, "unknown member");
        check(s.library.checkout("b", "zzz").code() == LibraryCode.UNKNOWN_TITLE, "unknown title");
        check(s.library.checkout("b", "t1").code() == LibraryCode.NOT_AVAILABLE, "the only copy is out");
        check(s.library.copiesWithStatus("t1", CopyStatus.ON_LOAN) == 1, "and it shows as on loan");
    }

    private static void limitsByTier() {
        Shelf s = new Shelf();
        s.library.addTitle("t5", "Hamlet", "W. Shakespeare", 500, 1);
        check(s.library.checkout("a", "t1").ok() && s.library.checkout("a", "t2").ok() && s.library.checkout("a", "t3").ok(), "a student can borrow three");
        check(s.library.checkout("a", "t4").code() == LibraryCode.LIMIT_REACHED, "the fourth is refused");
        check(s.library.activeLoans("a") == 3, "and the count is still three");
        Shelf staff = new Shelf();
        staff.library.addTitle("t5", "Hamlet", "W. Shakespeare", 500, 1);
        for (String isbn : new String[] {"t1", "t2", "t3", "t4", "t5"}) staff.library.checkout("c", isbn);
        check(staff.library.activeLoans("c") == 5, "staff can borrow more");
    }

    private static void blockingRules() {
        Shelf s = new Shelf();
        LibraryResult first = s.library.checkout("a", "t2");
        check(s.library.checkout("a", "t2").code() == LibraryCode.ALREADY_BORROWED, "no second copy of the same title");
        s.clock.advanceDays(15);
        check(s.library.checkout("a", "t3").code() == LibraryCode.HAS_OVERDUE, "an overdue loan blocks new loans");
        s.library.giveBack(first.loan().id);
        check(s.library.checkout("a", "t3").ok(), "after returning it, borrowing works again");

        // fines at or above 5.00 block borrowing until paid down
        s.library.reportLost(s.library.checkout("b", "t4").loan().id);
        check(s.library.fineOf("b") == 800, "losing a book costs its replacement price");
        check(s.library.checkout("b", "t2").code() == LibraryCode.FINES_DUE, "a fine of 8.00 blocks borrowing");
        s.library.payFine("b", 400);
        check(s.library.checkout("b", "t2").ok(), "paying it below 5.00 unblocks borrowing");
    }

    private static void returning() {
        Shelf s = new Shelf();
        LibraryResult r = s.library.checkout("a", "t1");
        s.clock.advanceDays(16);   // two days late
        LibraryResult back = s.library.giveBack(r.loan().id);
        check(back.ok() && back.cents() == 50 && s.library.fineOf("a") == 50, "two days late: 0.50 charged to the member");
        check(s.library.copiesWithStatus("t1", CopyStatus.AVAILABLE) == 1, "the copy is back on the shelf");
        check(s.library.giveBack(r.loan().id).code() == LibraryCode.ALREADY_RETURNED, "returning twice is refused");
        check(s.library.giveBack("L99").code() == LibraryCode.UNKNOWN_LOAN, "unknown loan");
        check(s.library.activeLoans("a") == 0, "no active loans left");
    }

    private static void reservationsAreFirstComeFirstServed() {
        Shelf s = new Shelf();
        LibraryResult loan = s.library.checkout("a", "t1");
        check(s.library.reserve("b", "t1").cents() == 1 && s.library.reserve("c", "t1").cents() == 2 && s.library.reserve("d", "t1").cents() == 3, "queue positions are 1, 2, 3");
        check(s.library.reserve("b", "t1").code() == LibraryCode.ALREADY_RESERVED, "a member cannot queue twice");
        check(s.library.reserve("a", "t1").code() == LibraryCode.ALREADY_BORROWED, "the borrower cannot reserve their own book");
        check(s.library.reserve("a", "t2").code() == LibraryCode.AVAILABLE_NOW, "no need to reserve a title with a free copy");
        s.library.giveBack(loan.loan().id);
        check(s.library.checkout("c", "t1").code() == LibraryCode.NOT_AVAILABLE, "the next in line is Ben, not Chen");
        check(s.library.checkout("b", "t1").ok(), "Ben gets it");
    }

    private static void heldCopyBelongsToTheHolder() {
        Shelf s = new Shelf();
        LibraryResult loan = s.library.checkout("a", "t1");
        s.library.reserve("b", "t1");
        s.library.giveBack(loan.loan().id);
        check(s.library.copiesWithStatus("t1", CopyStatus.ON_HOLD) == 1 && s.library.copiesWithStatus("t1", CopyStatus.AVAILABLE) == 0, "the returned copy is on hold, not on the shelf");
        check(s.library.checkout("d", "t1").code() == LibraryCode.NOT_AVAILABLE, "a walk-in cannot take a held copy");
        check(s.library.reserve("d", "t1").ok(), "but can join the queue");
        s.clock.advanceDays(2);
        check(s.library.checkout("b", "t1").ok(), "the holder can still collect it on day two");
        check(s.library.copiesWithStatus("t1", CopyStatus.ON_HOLD) == 0, "the hold is gone once collected");
    }

    private static void holdsExpireAndPassOn() {
        Shelf s = new Shelf();
        LibraryResult loan = s.library.checkout("a", "t1");
        s.library.reserve("b", "t1");
        s.library.reserve("c", "t1");
        s.library.giveBack(loan.loan().id);       // held for Ben until day 3
        s.clock.advanceDays(3);
        check(s.library.checkout("c", "t1").ok(), "after three days the hold passes to Chen, who is next");
        check(s.events.contains("HOLD_EXPIRED:b") && s.events.contains("HOLD_READY:c"), "both events were published");

        Shelf t = new Shelf();
        LibraryResult second = t.library.checkout("a", "t1");
        t.library.reserve("b", "t1");
        t.library.giveBack(second.loan().id);
        t.clock.advanceDays(10);
        t.library.sweepAll();
        check(t.events.contains("HOLD_EXPIRED:b"), "sweepAll notices an expired hold nobody asked about");
        check(t.library.copiesWithStatus("t1", CopyStatus.AVAILABLE) == 1, "and the copy goes back on the shelf");
    }

    private static void cancellingReservations() {
        Shelf s = new Shelf();
        LibraryResult loan = s.library.checkout("a", "t1");
        s.library.reserve("b", "t1");
        s.library.reserve("c", "t1");
        check(s.library.cancelReservation("b", "t1").ok(), "Ben cancels while waiting");
        check(s.library.cancelReservation("b", "t1").code() == LibraryCode.NOT_RESERVED, "cancelling again says so");
        s.library.giveBack(loan.loan().id);
        check(s.library.checkout("c", "t1").ok(), "Chen is first now");

        Shelf t = new Shelf();
        LibraryResult l2 = t.library.checkout("a", "t1");
        t.library.reserve("b", "t1");
        t.library.reserve("d", "t1");
        t.library.giveBack(l2.loan().id);   // held for Ben
        check(t.library.cancelReservation("b", "t1").ok(), "Ben cancels while the copy is held for him");
        check(t.library.checkout("d", "t1").ok(), "the copy moves on to Dev");
    }

    private static void renewing() {
        Shelf s = new Shelf();
        LibraryResult r = s.library.checkout("a", "t1");
        check(s.library.renew(r.loan().id).ok() && r.loan().dueAt == 28 * DAY, "a renewal adds another 14 days");
        check(s.library.renew(r.loan().id).ok() && s.library.renew(r.loan().id).code() == LibraryCode.RENEWAL_LIMIT, "a student can renew twice, not three times");
        LibraryResult r2 = s.library.checkout("a", "t2");
        s.clock.advanceDays(15);
        check(s.library.renew(r2.loan().id).code() == LibraryCode.OVERDUE, "an overdue loan cannot be renewed");
        Shelf t = new Shelf();
        LibraryResult r3 = t.library.checkout("a", "t1");
        t.library.reserve("b", "t1");
        check(t.library.renew(r3.loan().id).code() == LibraryCode.RESERVED_BY_OTHER, "a reservation stops renewals");
    }

    private static void lostBooks() {
        Shelf s = new Shelf();
        LibraryResult r = s.library.checkout("a", "t1");
        s.clock.advanceDays(16);
        LibraryResult lost = s.library.reportLost(r.loan().id);
        check(lost.cents() == 50 + 2_000 && s.library.fineOf("a") == 2_050, "lost: replacement price plus the late fine");
        check(s.library.copiesWithStatus("t1", CopyStatus.LOST) == 1 && s.library.copiesWithStatus("t1", CopyStatus.AVAILABLE) == 0, "the copy is written off");
        check(s.library.reportLost(r.loan().id).code() == LibraryCode.ALREADY_RETURNED, "reporting twice is refused");
        check(s.library.activeLoans("a") == 0, "the loan is closed");
    }

    private static void paymentsOfFines() {
        Shelf s = new Shelf();
        s.library.reportLost(s.library.checkout("a", "t1").loan().id);   // 2000
        check(s.library.payFine("a", 0).code() == LibraryCode.BAD_AMOUNT && s.library.payFine("a", -5).code() == LibraryCode.BAD_AMOUNT, "zero and negative payments");
        check(s.library.payFine("a", 2_001).code() == LibraryCode.MORE_THAN_OWED, "paying more than owed is refused");
        check(s.library.payFine("a", 500).cents() == 1_500, "a part payment returns the new balance");
        check(s.library.payFine("zed", 5).code() == LibraryCode.UNKNOWN_MEMBER, "unknown member");
    }

    private static void searchAndReports() {
        Shelf s = new Shelf();
        s.library.checkout("a", "t2");
        List<String> found = s.library.search("AUSTEN");
        check(found.size() == 1 && found.get(0).equals("Emma by Jane Austen: 1 of 2 available, 0 waiting"), "search by author, ignoring case, with availability");
        check(s.library.search("zzz").isEmpty(), "no match, no result");

        LibraryResult x = s.library.checkout("b", "t1");
        s.clock.advanceDays(5);
        LibraryResult y = s.library.checkout("c", "t3");
        s.clock.advanceDays(30);
        List<Loan> overdue = s.library.overdue();
        check(overdue.size() == 3 && overdue.get(0).dueAt <= overdue.get(1).dueAt, "the overdue report lists late loans, oldest due date first");
        s.library.giveBack(x.loan().id);
        s.library.giveBack(y.loan().id);
        check(s.library.overdue().size() == 1, "returned loans leave the report");
    }

    private static void eventsAreOrdered() {
        Shelf s = new Shelf();
        LibraryResult r = s.library.checkout("a", "t1");
        s.library.reserve("b", "t1");
        s.clock.advanceDays(15);
        s.library.giveBack(r.loan().id);
        check(s.events.equals(List.of("CHECKED_OUT:a", "RESERVED:b", "FINE_ADDED:a", "RETURNED:a", "HOLD_READY:b")), "events arrive in the order things happened");
    }

    private static void oneCopyManyThreads() throws InterruptedException {
        Shelf s = new Shelf();
        for (int i = 0; i < 30; i++) s.library.addMember("m" + i, "M" + i, MembershipTier.STUDENT);
        AtomicInteger winners = new AtomicInteger();
        Thread[] threads = new Thread[30];
        for (int i = 0; i < threads.length; i++) {
            final String id = "m" + i;
            threads[i] = new Thread(() -> {
                if (s.library.checkout(id, "t1").ok()) winners.incrementAndGet();
            });
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        check(winners.get() == 1, "30 members racing for the only copy: exactly one gets it");
        check(s.library.copiesWithStatus("t1", CopyStatus.ON_LOAN) == 1, "and exactly one copy is on loan");
    }

    private static void mixedWorkloadDoesNotDeadlock() throws InterruptedException {
        Shelf s = new Shelf();
        String[] isbns = {"t1", "t2", "t3", "t4"};
        int members = 12;
        for (int i = 0; i < members; i++) s.library.addMember("w" + i, "W" + i, MembershipTier.STAFF);
        Thread[] threads = new Thread[members];
        for (int i = 0; i < members; i++) {
            final String id = "w" + i;
            final int seed = i;
            threads[i] = new Thread(() -> {
                for (int round = 0; round < 300; round++) {
                    String isbn = isbns[(seed + round) % isbns.length];
                    LibraryResult r = s.library.checkout(id, isbn);
                    if (r.ok()) {
                        if (round % 3 == 0) s.library.renew(r.loan().id);
                        s.library.giveBack(r.loan().id);
                    } else {
                        s.library.reserve(id, isbn);
                        s.library.cancelReservation(id, isbn);
                    }
                }
            });
        }
        for (Thread t : threads) t.start();
        boolean finished = true;
        for (Thread t : threads) {
            t.join(30_000);
            finished &= !t.isAlive();
        }
        check(finished, "12 threads mixing checkouts, renewals, returns and reservations finish: no deadlock");
        int onLoan = 0;
        int active = 0;
        for (String isbn : isbns) onLoan += s.library.copiesWithStatus(isbn, CopyStatus.ON_LOAN);
        for (int i = 0; i < members; i++) active += s.library.activeLoans("w" + i);
        check(onLoan == active, "afterwards the copies on loan match the members' active loans");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Search dune: [Dune by Frank Herbert: 2 of 2 available, 0 waiting]",
      "Asha and Ben borrow Dune: OK OK, copies free: 0",
      "Asha borrows Dune again: ALREADY_BORROWED",
      "Chen borrows Dune: NOT_AVAILABLE",
      "Chen reserves Dune: OK, position 1, second try: ALREADY_RESERVED",
      "Ben renews Dune with a reservation waiting: RESERVED_BY_OTHER",
      "Day 20, overdue loans: 2",
      "Asha returns Dune 6 days late: fine 150 cents, her balance 150",
      "Dune copies on hold: 1 (held for Chen)",
      "Ben, overdue himself, borrows Emma: HAS_OVERDUE",
      "Four days later Chen has not come. Dune copies free: 1",
      "Chen borrows Dune: OK, due in 28 days",
      "Chen renews: OK, due in 56 days",
      "Ben loses Dune: charge 2250 cents, fine balance 2250",
      "Ben borrows Emma: FINES_DUE",
      "Ben pays 2000 and then 99999: OK then MORE_THAN_OWED",
      "Ben pays the rest, borrows Emma: OK OK",
      "Search by author: [Emma by Jane Austen: 0 of 1 available, 0 waiting]",
      "Events: 13 in total, first five [CHECKED_OUT asha, CHECKED_OUT ben, RESERVED chen, FINE_ADDED asha, RETURNED asha]",
    ],
  },
};
