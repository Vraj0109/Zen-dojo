import type { Section } from "./types";

// Concept lessons that the LLD projects of plan 0025 lean on: concurrency in code, testing with fakes, error handling and
// result types, immutability and value objects, event-driven design. Appended after more-lld.ts. Code is Java.
// Rules: no backticks or dollar-brace in the text; quote every Mermaid node label.

export const MORE_LLD_C: Record<string, Section[]> = {
  "lld-concurrency": [
    {
      title: "One lock per unit of contention, and a fixed lock order",
      body: `The first question about shared state is: what is the smallest thing that must change atomically? In the movie booking project it is one show (all seats of one show), in the library it is a member and a title, in the hotel it is a room type, in the meeting scheduler it is a room schedule and a person schedule. Lock exactly that unit, and operations on other units never wait.

Too coarse a lock, one for the whole application, is correct and slow. Too fine a lock, one per seat, is fast and brings new problems: a booking of three seats needs three locks, and now you need an order. The rule of thumb is to start with the unit the business talks about (a show, an account, a room) and to refine only when a measurement says so.

When an operation needs two locks, deadlock becomes possible: thread A holds lock 1 and waits for lock 2, thread B holds lock 2 and waits for lock 1. The remedy is one global order. Sort by a key (member before title, or the smaller schedule key first), take the locks in that order, release in the reverse order. Put the ordering in one helper so nobody writes it the other way by accident. An operation that needs only one lock cannot take part in a cycle.

Two more rules. Never call out to slow or unknown code while holding a lock: in the movie booking project the payment call happens between two short critical sections, with the hold pinned so it cannot expire meanwhile. And keep every critical section free of I/O, so that its length is a few map lookups.`,
      code: `// The one place that knows the order: smaller key first
private <T> T withBoth(Schedule a, Schedule b, Supplier<T> body) {
    Schedule first = a.key.compareTo(b.key) <= 0 ? a : b;
    Schedule second = first == a ? b : a;
    first.lock.lock();
    try {
        second.lock.lock();
        try {
            return body.get();
        } finally {
            second.lock.unlock();
        }
    } finally {
        first.lock.unlock();
    }
}`,
    },
    {
      title: "Atomics and compare-and-set: when a lock is too much",
      body: `Some shared state is one field and one condition: a courier is free or busy, a counter, a slot that is empty or taken. For that, an atomic variable does the job without a lock. compareAndSet(expected, new) changes the value only if it still equals expected, and tells you whether it did, as one indivisible step. Offering a courier to an order is compareAndSet(AVAILABLE, OFFERED): of any number of threads, exactly one gets true, and the others move on to the next courier.

The usual shapes are these. A state machine on a single field: each legal transition is one compareAndSet from the old state to the new one. A counter: AtomicLong.incrementAndGet, or LongAdder when many threads count the same thing and contention is the problem. A claim: AtomicReference<String> owner with compareAndSet(null, me). A retry loop for updates that depend on the current value: read, compute, compareAndSet, and loop if it failed.

Compare-and-set does not combine. Two atomic variables cannot be changed together atomically, so as soon as an invariant spans two fields (a balance and a daily limit, a hold and a counter), you need a lock, or one object that holds both and is replaced as a whole.

The test for atomic code is a race: start forty threads that do the same compare-and-set and assert that exactly one succeeded. It does not prove the code correct, but it fails fast when the check and the change are separate steps.`,
      code: `final class Courier {
    private final AtomicReference<CourierStatus> status = new AtomicReference<>(CourierStatus.AVAILABLE);

    boolean tryOffer() { return status.compareAndSet(CourierStatus.AVAILABLE, CourierStatus.OFFERED); }
    boolean confirm()  { return status.compareAndSet(CourierStatus.OFFERED, CourierStatus.BUSY); }
    boolean release()  {
        return status.compareAndSet(CourierStatus.OFFERED, CourierStatus.AVAILABLE)
            || status.compareAndSet(CourierStatus.BUSY, CourierStatus.AVAILABLE);
    }
}`,
    },
    {
      title: "Thread-safe collections do not make your code thread-safe",
      body: `A ConcurrentHashMap makes each single operation safe. It does not make a sequence of operations safe, and the most common concurrency bug is exactly that: check then act.

if (!map.containsKey(k)) map.put(k, v) is wrong with a concurrent map, because another thread can put between the two calls. The map offers atomic combined operations for this: putIfAbsent, computeIfAbsent, compute, merge, replace(k, old, new). Use them. The URL shortener's codeByUrl.compute decides inside one call whether a link exists and is still active or needs a new code, so two threads shortening the same address end up with one code.

Reading is the other trap. Iterating a concurrent map while others change it does not throw, but the view is not a snapshot: you may see some changes and not others. When you need a consistent view of several entries, either take a lock for the read, copy under a lock, or use a structure with versions (the key-value store reads at a commit number and gets a consistent view for free).

Know what each collection promises. CopyOnWriteArrayList: a snapshot for every iteration, expensive writes, good for listener lists that are read far more often than they change. ConcurrentLinkedQueue and LinkedBlockingQueue: producer and consumer hand-over. TreeMap and HashMap inside a lock: fine, and often simpler than a concurrent version, because the lock already gives you atomic multi-step operations.

Last, immutable values are safe to share. A record with final fields can be handed to any thread. Most of the design work in a concurrent class is deciding which state is immutable and which is guarded, and writing that next to each field in a comment.`,
      code: `// Wrong: two threads can both see "absent" and both put
if (!codes.containsKey(url)) codes.put(url, newCode());

// Right: the decision and the change are one atomic call
String code = codes.computeIfAbsent(url, u -> newCode());

// A counter that many threads update
ConcurrentHashMap<String, LongAdder> clicks = new ConcurrentHashMap<>();
clicks.computeIfAbsent(code, c -> new LongAdder()).increment();`,
    },
    {
      title: "Testing concurrent code",
      body: `Concurrency bugs are timing bugs, so a test that passes once proves little. Three techniques make tests useful.

First, race a single decision. Start N threads released together that all try the same thing (book the last seat, claim the courier, take the last copy), join them, and assert the number of winners. The projects do this with 30 to 60 threads. It catches check-then-act bugs quickly, because the window is wide when many threads hit it.

Second, check an invariant after a mixed workload. Run several threads doing random operations (book, cancel, move, renew, return) for a few hundred rounds each, with a seeded Random so a failure can be repeated, and assert what must always be true afterwards: the sum of balances is unchanged, no room has two overlapping meetings, the number of copies on loan equals the number of active loans. The invariant is the specification of the design, written as code.

Third, make deadlock a test failure instead of a hang. Join each thread with a timeout and assert that none is still alive. If the lock order is wrong, the test reports it instead of freezing the build.

What not to do: sleep to wait for the other thread, and assert on the order in which threads happen to run. Time-dependent logic should read an injected clock, so that a test moves time by hand and never waits. Keep the thread tests small enough to run in a second, and keep their number of threads and rounds fixed, so the failures are comparable from run to run.`,
      code: `// Race one decision: exactly one winner
AtomicInteger winners = new AtomicInteger();
Thread[] threads = new Thread[40];
for (int i = 0; i < threads.length; i++) {
    threads[i] = new Thread(() -> { if (service.book(user(), "r1", range).ok()) winners.incrementAndGet(); });
}
for (Thread t : threads) t.start();
for (Thread t : threads) t.join();
assertEquals(1, winners.get());

// A deadlock shows up as a failed assertion, not a frozen build
for (Thread t : workers) { t.join(30_000); finished &= !t.isAlive(); }`,
    },
  ],
  "lld-testing": [
    {
      title: "Inject the clock and the other edges, then fake them",
      body: `Most hard-to-test code is hard to test because it reaches out for something it should have been given: the current time, a random number, a payment provider, a file. The fix is the same each time. Define a small interface for what the class needs (TimeSource with nowMillis, PaymentGateway with charge and refund, Dice with roll), pass an implementation in through the constructor, and use a fake in tests.

The clock is the most valuable one. Code that calls System.currentTimeMillis cannot be tested for expiry, timeouts, refund windows or daily limits without sleeping, and sleeping makes tests slow and flaky. With an injected clock, a test creates a ManualClock, calls advance(60_000), and the next line asserts the result. Every project in this section does it: holds expire, offers time out, fines grow, leases lapse, and none of the tests waits.

Fakes beat mocks for these edges. A FakePayments class that can be told to decline and that records its calls is a few lines, reads like a specification, and does not break when the implementation is refactored. A mocking library that checks which methods were called in which order ties the test to the implementation.

Write the fake so that it can misbehave on demand: decline the next charge, jam the next dispense, fail the next send. The tests worth writing are the ones for failure, and the failure paths are where most designs are wrong. A hook that runs in the middle of a call (the payment provider advancing the clock while a charge is in flight) lets you test an interleaving without any threads.

Name what you do not fake: the classes under test and their close collaborators run for real. Only the edges are replaced.`,
      code: `interface TimeSource { long nowMillis(); }

final class ManualClock implements TimeSource {
    private long now;
    ManualClock(long start) { now = start; }
    public synchronized long nowMillis() { return now; }
    synchronized void advance(long millis) { now += millis; }
}

final class FakePayments implements PaymentGateway {
    private boolean decline;
    synchronized void declineNext(boolean value) { decline = value; }
    public synchronized String charge(String user, int cents, String key) { return decline ? null : "pay-1"; }
    public synchronized void refund(String ref, int cents) { refunds.add(ref + ":" + cents); }
}`,
    },
    {
      title: "In-memory repositories and testing through the public API",
      body: `A class that talks to a database is tested with an in-memory version of the same interface. A Repository interface with find, save and putIfAbsent has two implementations: the real one (SQL, a key-value store) and an in-memory one backed by a ConcurrentHashMap. The tests use the in-memory one, run in microseconds, and still exercise all the logic of the class that uses it. A small number of integration tests then check that the real implementation behaves like the in-memory one.

Keep the interface honest. If the real database can fail, or return nothing, or refuse a duplicate key, the interface must say so (an Optional, a boolean from putIfAbsent), so that the in-memory version and the tests can produce those cases.

Test through the public API of the class, the way a caller would, and not through its private helpers. Book a seat, pay, cancel, and assert what a user could see. When the behaviour is right, you are free to refactor the inside. When you feel the need to test a private method, it often wants to be its own small class with its own tests: ChangeMaker, Allocator and DebtSimplifier were extracted this way, and each is tested directly with the cases that are hard to reach from the outside (30 cents from one quarter and three dimes).

Name tests as sentences that state the rule: a refused stay leaves no night counted, a declined card returns the booking to held, an answer at the deadline is too late. A failing test then tells you which rule broke.

Table of what to cover for each class: the normal path; each refusal code; each boundary (one before, exactly at, one after); idempotency (doing it twice); and the invariant after a failure (nothing was changed).`,
      code: `interface UrlRepository {
    boolean putIfAbsent(ShortLink link);          // false when the code is taken
    Optional<ShortLink> find(String code);
    void delete(String code);
}

final class InMemoryUrlRepository implements UrlRepository {
    private final ConcurrentHashMap<String, ShortLink> links = new ConcurrentHashMap<>();
    public boolean putIfAbsent(ShortLink link) { return links.putIfAbsent(link.code(), link) == null; }
    public Optional<ShortLink> find(String code) { return Optional.ofNullable(links.get(code)); }
    public void delete(String code) { links.remove(code); }
}`,
    },
    {
      title: "Properties, invariants and seeded randomness",
      body: `Examples test the cases you thought of. Properties test the ones you did not. A property is a statement that must hold for any input, and a test generates many inputs and checks it. With a seeded Random the inputs are the same on every run, so a failure can be reproduced.

Good properties for the LLD problems. The parts of a split always add up to the total, for 2000 random totals and weights (expense sharing), and nobody is more than one cent from their exact share. A fast check agrees with a slow, obviously right one: the two-neighbour overlap check against comparing with every booking, the grid index against checking every driver, chess move generation against the published perft numbers (20, 400, 8902). Round trips: recovering a store from its log gives the same content. Conservation: after random transfers between accounts the total is unchanged. Ordering: the optimal debt simplification is never longer than the greedy one. No-overlap: after a mixed workload no room has two meetings at the same time.

The pattern is always the same: build a reference that is too slow or too simple to ship but easy to trust, generate inputs, and compare. The reference is often a plain loop.

Seeds matter. Print the seed when a test fails, or use a fixed one, because a random test that fails once and never again is worse than no test. Keep generated sizes small enough to finish in a second or two.

Finally, invariants are not only for tests. A method such as netBalances can assert that the sum is zero in a debug build, and a reconciliation job in production can check the same property over real data. Writing the invariant down is the design activity, and the test is a by-product.`,
      code: `Random random = new Random(42);                      // fixed seed: failures repeat
for (int round = 0; round < 2000; round++) {
    long total = random.nextInt(1_000_000);
    Map<String, Long> weights = randomWeights(random);
    Map<String, Long> parts = Allocator.allocate(total, weights);
    assertEquals(total, sum(parts));                 // property: parts add up to the total
    for (String id : parts.keySet()) {
        double ideal = (double) total * weights.get(id) / sumOf(weights);
        assertTrue(Math.abs(parts.get(id) - ideal) < 1.0);   // property: within one cent
    }
}`,
    },
  ],
  "lld-modeling": [
    {
      title: "Error handling: result codes, exceptions and when to use each",
      body: `A design has two kinds of failure, and mixing them is a common mistake. The first kind is something a user can cause by using the program normally: a seat that is taken, a card that is declined, a PIN that is wrong, a room that is full, a file that is not there. These are expected. The second kind is a mistake in the program or in the way it is used: a null where a value is required, a refill of a machine that is not in maintenance mode, an index out of range. These are bugs, or at least misuse.

Expected failures should be values. Return a result that the caller must look at: an enum (SaleStatus.SOLD_OUT), a record with a code and a payload (BookingResult with the conflicting seats, MeetingResult with the clashing ranges), or an Optional. The code reads naturally (if the result is not ok, show the message), the cases are listed in one place, a switch over the enum is checked by the compiler, and the failure carries what the caller needs to explain it: which seat, which range, how many tries are left.

Misuse and broken invariants should be exceptions. IllegalArgumentException for a bad argument (a negative price, a coupon above 100 percent), IllegalStateException for a call at the wrong time (a staff operation outside maintenance), and checked exceptions only when the caller must decide what to do with a failure that is outside its control, such as DispenseException from hardware that jammed after the bank approved the money.

Three habits. Validate at the boundary of the facade, before anything is changed, so a refused request leaves no trace. Make failures atomic: either everything happened or nothing did (a stay is booked for all its nights or none). And never swallow an exception silently; log it with context or translate it into a result.

Interviewers read your error handling as a sign of maturity. Say which failures are expected and show that each has a code and a test.`,
      code: `enum SaleStatus { DISPENSED, INSUFFICIENT_FUNDS, SOLD_OUT, UNKNOWN_CODE, NO_CHANGE, NO_MONEY, OUT_OF_SERVICE }

record Outcome(SaleStatus status, Product product, List<Coin> change) { }

// Expected: a normal result of pressing a button
Outcome o = machine.select("A1");
if (o.status() != SaleStatus.DISPENSED) show(o.status());

// Misuse: the operator called refill outside maintenance mode
private void requireStaff() {
    if (!state.staffAccess()) throw new IllegalStateException("staff operations need maintenance mode");
}`,
    },
    {
      title: "Immutability and value objects",
      body: `An immutable object never changes after it is built. That removes a whole category of bugs: no one can modify it behind your back, it can be shared by any number of threads without a lock, it can be used as a map key, and a test can compare it with equals.

A value object is a small immutable type that stands for a value and is compared by what it contains: Money, a time range, a seat id, a location, a coin, a debt. In Java 17 a record gives you this almost for free: the fields are final, equals, hashCode and toString are generated, and a compact constructor validates. A SeatId(row, number) can be a map key and prints as A5. A TimeRange rejects an end before its start in its constructor, so no invalid range can exist anywhere in the program.

Put behaviour on the value. TimeRange.overlaps, Location.distanceTo, Coin.cents, Recurrence.expand: the logic lives next to the data, and callers stop repeating it.

Use immutable types for what flows between components, and keep mutable state small, private and guarded: the seats of a show behind one lock, the balance behind the ledger. Return copies or unmodifiable views from methods that expose collections (List.copyOf, Collections.unmodifiableMap), so a caller cannot change your state through the list you gave them.

Prefer replacing to modifying when it is cheap. Moving a meeting creates a new Booking with the new range, because a Booking's list of ranges is immutable, and readers who hold the old one are safe. Money is an integer number of cents, never a double.

The cost is more objects, which is almost never a problem. The exception is a very hot loop, and then you measure before you change anything.`,
      code: `record SeatId(char row, int number) implements Comparable<SeatId> {
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

Group { members = Collections.unmodifiableMap(new TreeMap<>(members)); }   // defensive copy`,
    },
    {
      title: "Event-driven design: observers, events and ordering",
      body: `When something happens in one part of a system and several other parts care, calling them directly couples everything to everything. An event decouples them: the part where it happens publishes a small immutable message, and anyone who is interested subscribes. The booking service publishes HELD, CONFIRMED and CANCELLED, and the notification sender, the analytics job and a seat-map push all listen, without the booking service knowing any of them.

The basic form is the Observer pattern: a listener interface (onEvent), a list of listeners (CopyOnWriteArrayList, so adding one is safe at any time), and a publish method that loops over them. The event is a record: a type, the id of the thing, and the few fields a listener needs. Keep events small and immutable, and name them in the past tense, because they say what happened.

Four questions to answer in an interview. Where is the event published: inside the critical section, which keeps the order of events right, or after it, which keeps a slow listener from blocking the system? A common answer is to queue the event inside the lock and deliver it after the lock is released, as the key-value store does for watchers. Is delivery synchronous or asynchronous? Synchronous is simple and ordered; asynchronous needs a queue and tells you nothing about failure. What happens when a listener throws? Isolate it, so one bad listener cannot stop the others or roll back the business operation. What is the guarantee: at most once, at least once? At least once with idempotent listeners is the usual choice, and it is why events carry an id.

Events also give you history. A log of events (the audit log of the ATM, the history of an order) is the record of what happened and can be replayed to rebuild state, which is the idea behind the write-ahead log in the key-value store.

Do not overuse it. A direct method call is clearer when exactly one component must react and the result is needed at once.`,
      code: `interface BookingListener { void onEvent(BookingEvent event); }

record BookingEvent(String type, String bookingId, String userId) { }

private final List<BookingListener> listeners = new CopyOnWriteArrayList<>();

void subscribe(BookingListener listener) { listeners.add(listener); }

private void publish(String type, Booking b) {
    BookingEvent event = new BookingEvent(type, b.id(), b.userId());
    for (BookingListener l : listeners) l.onEvent(event);     // production: put the event on a queue instead
}`,
    },
  ],
};
