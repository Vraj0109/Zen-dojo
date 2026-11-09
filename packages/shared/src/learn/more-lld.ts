import type { Section } from "./types";
import { MORE_LLD_C } from "./more-lld-c";

// More deeper sections for LLD topics (appended after deep-lld.ts). Code is Java.

const MORE_LLD_BASE: Record<string, Section[]> = {
  "lld-oop": [
    {
      title: "Abstraction, interfaces and abstract classes",
      body: "Abstraction means exposing what an object does and hiding how. In Java, an interface declares a capability (Comparable, Runnable, PaymentMethod) with no state; a class can implement many. Since Java 8, interfaces can have default methods for shared behaviour, but still no instance fields. An abstract class can hold state and constructors and partially implement behaviour, but a class extends only one.\n\nRule of thumb: use an interface for a role that unrelated classes may play (Notifier implemented by EmailNotifier, SmsNotifier). Use an abstract class when subclasses share real state and a template of steps (an AbstractReportGenerator with generate() calling abstract fetchData() and format(): the template method pattern). Program to interfaces in fields and parameters (List<Order> rather than ArrayList<Order>) so implementations can change.\n\nIn interviews, define the interfaces first for the parts that will vary (pricing, matching, notification channels), then write concrete classes.",
      code: `abstract class Report {
    // Template method: fixed order of steps, details left to subclasses
    public final String generate() {
        List<Row> rows = fetch();
        return header() + format(rows);
    }
    protected abstract List<Row> fetch();
    protected abstract String format(List<Row> rows);
    protected String header() { return "Report generated at " + Instant.now() + "\\n"; }
}

class SalesReport extends Report {
    protected List<Row> fetch() { return salesRepo.lastMonth(); }
    protected String format(List<Row> rows) { return Csv.of(rows); }
}`,
    },
    {
      title: "Polymorphism: overloading vs overriding",
      body: "Compile-time polymorphism (overloading): same method name with different parameter lists in one class (print(int), print(String)); the compiler picks based on static types. Runtime polymorphism (overriding): a subclass provides its own implementation of an inherited method; the JVM picks based on the object's actual class (dynamic dispatch). Overriding is what lets you replace conditionals with objects.\n\nOverriding rules: same signature, return type the same or a subtype (covariant), can't reduce visibility, can't throw broader checked exceptions; use @Override so the compiler catches mistakes. static methods are hidden, not overridden; private methods aren't inherited. Fields aren't polymorphic.\n\nequals and hashCode: if two objects are equal, their hash codes must match, or HashMap/HashSet break. Override both together for value objects (Money, Point, Coordinate), and keep them consistent with the fields that define identity. Prefer immutable value objects (Java records give equals/hashCode/toString for free).",
      code: `record Money(long cents, String currency) {
    Money {
        if (cents < 0) throw new IllegalArgumentException("negative amount");
        Objects.requireNonNull(currency);
    }
    Money plus(Money other) {
        if (!currency.equals(other.currency)) throw new IllegalArgumentException("currency mismatch");
        return new Money(cents + other.cents, currency);
    }
}
// records: immutable, equals/hashCode/toString generated from the fields`,
    },
    {
      title: "Cohesion, coupling and good class boundaries",
      body: "High cohesion: everything in a class serves one purpose (a Ticket knows its entry time, vehicle and slot, and how long it has been open). Low coupling: classes depend on few others, through narrow interfaces, so changes stay local.\n\nSmells in interview code: a God class (ParkingLotManager doing allocation, pricing, payments and printing), anemic models (classes with only getters/setters while all logic lives in a service), feature envy (a method mostly using another object's data, which suggests it belongs there), long parameter lists (introduce a parameter object), and primitive obsession (passing raw strings and ints for money, ids, statuses instead of types and enums).\n\nLaw of Demeter: talk to your direct collaborators, not their internals (lot.getFloor(2).getSlots().get(5).park(car) leaks structure; prefer lot.park(car) delegating down). Following these keeps the class diagram you draw in an interview clean and easy to extend.",
    },
  ],
  "lld-solid": [
    {
      title: "Single responsibility in practice",
      body: "'A class should have one reason to change' means one actor or concern drives its changes. An Invoice class that calculates totals, renders a PDF and emails it changes when tax rules change, when the PDF layout changes, and when the email provider changes: three reasons. Split into Invoice (data + totals), InvoiceRenderer, and InvoiceSender, each testable alone.\n\nDon't over-split: a class with one method per concept isn't the goal. SRP is about grouping things that change together and separating things that change for different reasons. In LLD answers, a good sign is that each class's name describes its single job without 'and'.",
      code: `class Invoice {                      // data + business rules only
    private final List<LineItem> items;
    Money total(TaxPolicy tax) { /* sum items, apply tax */ }
}
class InvoicePdfRenderer {           // presentation
    byte[] render(Invoice invoice) { /* layout */ }
}
class InvoiceMailer {                // delivery
    private final EmailClient email;
    void send(Invoice invoice, byte[] pdf, String to) { email.send(to, "Your invoice", pdf); }
}`,
    },
    {
      title: "Dependency injection without a framework",
      body: "Dependency inversion says high-level policy (OrderService) shouldn't depend on low-level details (MySQLOrderRepository, StripeGateway); both depend on abstractions (OrderRepository, PaymentGateway). Dependency injection is the technique: pass dependencies in (usually through the constructor) instead of creating them inside.\n\nBenefits: you can swap implementations (in-memory repository for tests, a new payment provider), dependencies are explicit in the constructor, and objects are easier to reason about. A composition root (main method, or a framework like Spring/Guice) wires concrete classes together in one place.\n\nIn an interview, write constructors that take interfaces, and mention that in production a DI container would wire them. Avoid service locators and static singletons for dependencies; they hide what a class needs and make tests painful.",
      code: `interface OrderRepository { void save(Order o); Optional<Order> find(String id); }
interface PaymentGateway { PaymentResult charge(Money amount, String token); }

class OrderService {
    private final OrderRepository orders;
    private final PaymentGateway payments;
    OrderService(OrderRepository orders, PaymentGateway payments) {   // injected
        this.orders = orders; this.payments = payments;
    }
    Order checkout(Cart cart, String cardToken) {
        PaymentResult r = payments.charge(cart.total(), cardToken);
        if (!r.ok()) throw new PaymentFailedException(r.reason());
        Order o = Order.from(cart, r.id());
        orders.save(o);
        return o;
    }
}
// main: new OrderService(new JdbcOrderRepository(ds), new StripeGateway(apiKey));
// test: new OrderService(new InMemoryOrderRepository(), new FakeGateway(true));`,
    },
    {
      title: "When SOLID is overkill, and how to say so",
      body: "Every abstraction has a cost: more files, indirection, and names to learn. In a 45-minute LLD round, apply SOLID where change is likely or stated by the interviewer (pricing rules, payment methods, notification channels, vehicle types, game rules) and keep the rest concrete.\n\nYAGNI ('you aren't gonna need it') balances OCP: don't add a strategy interface for something with one implementation and no expected variation. A good line: 'Pricing is a strategy because rates differ by lot and time; slot assignment I'll keep as a simple nearest-first method, but it's isolated in one class so we can turn it into a strategy if we need to.' This shows judgment, which interviewers value more than reciting principles.",
    },
  ],
  "lld-patterns": [
    {
      title: "Creational patterns: Factory, Builder, Singleton",
      body: "Factory method / simple factory: centralize object creation when the concrete class depends on input (VehicleFactory.create(type) returns Car, Bike or Truck). Callers depend on the interface, and adding a type changes one place. Abstract factory: create families of related objects that must match (a UI theme factory producing a matching Button and Checkbox).\n\nBuilder: construct complex objects step by step with readable, optional parameters, producing an immutable result and validating at build(). Ideal for objects with many optional fields (an HTTP request, a search query, a pizza order).\n\nSingleton: exactly one instance (a configuration registry, a connection pool manager). Implement safely with an enum or the holder idiom. Pitfalls: hidden global state, hard to test (can't swap it), and lifecycle problems; prefer creating one instance in the composition root and injecting it.",
      code: `class SearchQuery {
    private final String text; private final int limit; private final List<String> filters;
    private SearchQuery(Builder b) { text = b.text; limit = b.limit; filters = List.copyOf(b.filters); }
    static Builder builder(String text) { return new Builder(text); }
    static class Builder {
        private final String text; private int limit = 20; private final List<String> filters = new ArrayList<>();
        Builder(String text) { this.text = text; }
        Builder limit(int n) { if (n <= 0) throw new IllegalArgumentException(); limit = n; return this; }
        Builder filter(String f) { filters.add(f); return this; }
        SearchQuery build() { return new SearchQuery(this); }
    }
}
// SearchQuery q = SearchQuery.builder("shoes").limit(50).filter("brand:nike").build();

enum Config { INSTANCE; private final Properties props = load(); String get(String k) { return props.getProperty(k); } }`,
    },
    {
      title: "Behavioural patterns: Strategy, Observer, Command, Chain of Responsibility",
      body: "Strategy: a family of interchangeable algorithms behind one interface, chosen at runtime (pricing by hour vs flat, matching nearest vs best-rated). Observer: subjects publish events and observers subscribe (order shipped → notify customer, update analytics), decoupling the source from reactions; in distributed systems this becomes pub/sub. Command: encapsulate a request as an object with execute() (and undo()), enabling queues, logging, retries and undo stacks (text editors, smart home actions). Chain of Responsibility: pass a request along a chain of handlers until one handles it (logging levels, approval workflows by amount, middleware: auth → rate limit → validation → handler).\n\nState (covered with the vending machine) and Template Method (covered with reports) complete the set interviewers expect.",
      code: `interface Approver { void setNext(Approver next); void approve(Expense e); }
abstract class BaseApprover implements Approver {
    private Approver next;
    public void setNext(Approver next) { this.next = next; }
    protected void passOn(Expense e) {
        if (next == null) throw new IllegalStateException("No one can approve " + e.amount());
        next.approve(e);
    }
}
class Manager extends BaseApprover {
    public void approve(Expense e) { if (e.amount() <= 1_000) System.out.println("Manager approved"); else passOn(e); }
}
class Director extends BaseApprover {
    public void approve(Expense e) { if (e.amount() <= 10_000) System.out.println("Director approved"); else passOn(e); }
}
// manager.setNext(director); director.setNext(cfo); manager.approve(new Expense(5_000));`,
    },
    {
      title: "Structural patterns: Decorator, Adapter, Facade, Composite, Proxy",
      body: "Decorator: wrap an object to add behaviour while keeping its interface (a Notifier wrapped by RetryingNotifier and LoggingNotifier; Java I/O streams). Composable and avoids subclass explosion. Adapter: make an existing class fit the interface you need (wrap a third-party SMS SDK to implement your Notifier). Facade: a simple entry point over a complex subsystem (ParkingLotSystem.park(vehicle) hiding floors, allocation and tickets), often the class your LLD answer exposes to the 'client'. Composite: treat individual objects and groups uniformly (files and directories in a file system, both FileSystemNode with size()). Proxy: a stand-in controlling access (lazy loading, caching, access checks, remote calls).",
      code: `interface Notifier { void send(String to, String msg); }
class SmsNotifier implements Notifier { public void send(String to, String msg) { /* provider call */ } }

class RetryingNotifier implements Notifier {          // Decorator
    private final Notifier inner; private final int attempts;
    RetryingNotifier(Notifier inner, int attempts) { this.inner = inner; this.attempts = attempts; }
    public void send(String to, String msg) {
        for (int i = 1; ; i++) {
            try { inner.send(to, msg); return; }
            catch (RuntimeException e) { if (i == attempts) throw e; sleep(100L << i); }
        }
    }
}
// Notifier n = new LoggingNotifier(new RetryingNotifier(new SmsNotifier(), 3));`,
    },
  ],
  "lld-modeling": [
    {
      title: "From requirements to classes in 10 minutes",
      body: "1) List use cases as verbs with actors: 'customer books seats', 'admin adds a show', 'system releases expired holds'. 2) Underline nouns: Customer, Show, Seat, Booking, Screen, Payment. Some nouns are attributes (seat number), some are entities with identity and lifecycle (Booking), some are value objects (Money, TimeRange). 3) Decide relationships and multiplicities: a Screen has many Seats; a Show is a Movie on a Screen at a time; a Booking has many SeatHolds. 4) Assign behaviour to the class owning the data (Show.hold(seats), Booking.confirm(payment)). 5) Identify states with enums and their transitions. 6) Mark the extension points with interfaces. 7) Add a service or facade that orchestrates use cases and handles concurrency.\n\nSay these steps out loud while sketching; interviewers grade the process as much as the result.",
    },
    {
      title: "Validation and error handling",
      body: "Validate at boundaries and keep objects valid from construction: constructors and factory methods reject invalid input (negative amounts, end before start), so the rest of the code can trust its objects. Use specific exceptions or result types: SlotUnavailableException, InsufficientFundsException, InvalidTransitionException, rather than returning null or a generic RuntimeException.\n\nDecide on checked vs unchecked: many modern Java codebases use unchecked exceptions for business errors and document them; alternatively return Optional or a Result type for expected outcomes (no slot free is expected, not exceptional). Never swallow exceptions silently.\n\nFor operations with external side effects (payments), define what happens on partial failure: compensating actions, idempotency keys, and states like PAYMENT_PENDING that can be resolved later. Mentioning this in an LLD round connects your class design to real reliability concerns.",
      code: `sealed interface BookingResult permits Booked, Unavailable, PaymentDeclined {}
record Booked(Booking booking) implements BookingResult {}
record Unavailable(List<SeatId> taken) implements BookingResult {}
record PaymentDeclined(String reason) implements BookingResult {}

BookingResult book(ShowId show, List<SeatId> seats, PaymentToken token) {
    List<SeatId> taken = inventory.tryHold(show, seats);
    if (!taken.isEmpty()) return new Unavailable(taken);
    PaymentResult p = payments.charge(price(show, seats), token);
    if (!p.ok()) { inventory.release(show, seats); return new PaymentDeclined(p.reason()); }
    return new Booked(bookings.confirm(show, seats, p.id()));
}`,
    },
    {
      title: "Designing for extension",
      body: "Ask the interviewer which changes are likely, then design those as seams. Typical seams: new types of things (vehicle types, payment methods, notification channels) → interface + factory; changing rules (pricing, discounts, matching, eligibility) → strategy or rule objects evaluated in order; new reactions to events (send email, update loyalty points) → observer/event bus; new states → state pattern or a transition table.\n\nAlso design data for extension: use enums with behaviour or lookup tables rather than scattered switch statements; prefer composition (a Vehicle has a Size) over deep hierarchies. Close the interview with a short 'how this extends' tour: 'adding EV charging slots = new SlotType and a ChargingFee strategy; no changes to ParkingLot or Floor.'",
    },
  ],
  "lld-concurrency": [
    {
      title: "Java concurrency toolbox",
      body: "synchronized: intrinsic lock on an object; simple, reentrant, and also guarantees visibility of changes. ReentrantLock: explicit lock with tryLock (timeouts), fairness option and multiple Conditions; always unlock in finally. ReadWriteLock / StampedLock: many readers or one writer, for read-heavy shared data. volatile: visibility and ordering for a single variable (flags), but no atomic compound actions. Atomic classes (AtomicInteger, AtomicReference, LongAdder): lock-free CAS updates. Concurrent collections: ConcurrentHashMap (atomic compute/merge/putIfAbsent per key), CopyOnWriteArrayList (read-mostly listener lists), BlockingQueue implementations, ConcurrentSkipListMap (sorted, concurrent).\n\nExecutors: fixed thread pools for CPU-bound work; bounded queues to avoid unbounded memory; CompletableFuture for composing async tasks; virtual threads (Java 21) make blocking I/O code scale to many concurrent tasks. Coordination: CountDownLatch (wait for N events), CyclicBarrier, Semaphore (limit concurrent access, e.g. 10 parallel API calls).",
      code: `class Counter {
    private final ConcurrentHashMap<String, LongAdder> counts = new ConcurrentHashMap<>();
    void hit(String key) { counts.computeIfAbsent(key, k -> new LongAdder()).increment(); }
    long get(String key) { LongAdder a = counts.get(key); return a == null ? 0 : a.sum(); }
}

Semaphore permits = new Semaphore(10);        // at most 10 concurrent calls
void callApi() throws InterruptedException {
    permits.acquire();
    try { client.call(); } finally { permits.release(); }
}`,
    },
    {
      title: "A thread-safe LRU cache, two ways",
      body: "Simplest correct version: extend LinkedHashMap with accessOrder = true and override removeEldestEntry, then guard every method with one lock (Collections.synchronizedMap or synchronized methods). Note that get() mutates the order in access-order mode, so even reads need the lock; a read-write lock doesn't help here.\n\nFor higher concurrency, shard the cache into N segments by key hash, each an independent LRU with its own lock (eviction becomes approximately LRU overall), or use a library like Caffeine, which uses a concurrent hash map plus buffered, batched recency updates.\n\nIn an interview, write the simple locked version first, state its limitation (one lock serializes all access), then describe sharding as the scaling step.",
      code: `class LruCache<K, V> {
    private final int capacity;
    private final LinkedHashMap<K, V> map;
    LruCache(int capacity) {
        this.capacity = capacity;
        this.map = new LinkedHashMap<>(16, 0.75f, true) {          // access order
            protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > LruCache.this.capacity; }
        };
    }
    public synchronized V get(K key) { return map.get(key); }      // get reorders → needs the lock
    public synchronized void put(K key, V value) { map.put(key, value); }
}`,
    },
    {
      title: "Common concurrency bugs to name",
      body: "Race on check-then-act: if (!map.containsKey(k)) map.put(k, v) by two threads; use putIfAbsent/computeIfAbsent or a lock around both. Lost update on read-modify-write: count = count + 1; use atomics or locks. Visibility: a worker loops on a non-volatile boolean flag and never sees the change. Deadlock: two locks acquired in different orders. Starvation: unfair locks or a priority scheme that never lets low-priority work run. Livelock: threads keep yielding to each other.\n\nAlso: holding a lock while doing I/O (slow, invites deadlocks), unbounded thread creation (one thread per request), unbounded queues (memory blow-up), double-checked locking without volatile, and sharing non-thread-safe objects (SimpleDateFormat, HashMap) across threads. Prefer immutability and confinement: immutable objects need no locks, and data owned by a single thread needs none either.",
    },
  ],
  "lld-testing": [
    {
      title: "Designing tests for an LLD solution",
      body: "Organize tests by behaviour, with names that read as specifications: parks_vehicle_in_nearest_free_slot, rejects_when_no_slot_of_matching_type, charges_minimum_one_hour, releases_slot_on_exit. Use arrange-act-assert structure. Cover: the main happy path; boundary values (exactly at capacity, zero items, the first and last hour); invalid input (null, negative, unknown ids); state machine transitions, both allowed and forbidden; and concurrency (many threads competing for the last resource).\n\nTable-driven tests for rules: a list of (input, expected) cases run through one test, which is perfect for pricing and validation. Keep tests deterministic: inject the clock, random source and ids.",
      code: `@ParameterizedTest
@CsvSource({
    "0,   60",     // minutes parked, expected fee: first hour minimum
    "59,  60",
    "61,  120",
    "1440, 1200"   // daily cap
})
void hourly_pricing(int minutes, int expectedCents) {
    PricingStrategy p = new HourlyPricing(60, 1200);
    assertEquals(expectedCents, p.fee(Duration.ofMinutes(minutes)));
}`,
    },
    {
      title: "Mocks, fakes and stubs",
      body: "A stub returns canned answers (a PaymentGateway that always approves). A fake is a working lightweight implementation (an in-memory repository backed by a HashMap). A mock records interactions so you can verify calls (verify(notifier).send(\"user@x\", any())). Spy wraps a real object.\n\nPrefer fakes for repositories and stores (tests read naturally and don't break on refactors), stubs for external services, and mocks only when the interaction itself is the behaviour (we must notify the customer exactly once). Over-mocking couples tests to implementation details: if a refactor that keeps behaviour breaks tests, they're testing the wrong thing.\n\nTest the concurrency claim directly: start N threads with a CountDownLatch to release them together, have each try to book the last seat, and assert exactly one succeeded.",
      code: `@Test
void only_one_thread_gets_the_last_slot() throws Exception {
    ParkingLot lot = lotWithFreeSlots(1);
    int threads = 32;
    CountDownLatch start = new CountDownLatch(1);
    ExecutorService pool = Executors.newFixedThreadPool(threads);
    List<Future<Optional<Ticket>>> results = new ArrayList<>();
    for (int i = 0; i < threads; i++)
        results.add(pool.submit(() -> { start.await(); return lot.park(new Car("KA-" + UUID.randomUUID())); }));
    start.countDown();
    long parked = 0;
    for (var f : results) if (f.get().isPresent()) parked++;
    assertEquals(1, parked);
}`,
    },
    {
      title: "Integration and contract tests",
      body: "Unit tests check classes; integration tests check the wiring: real database queries (Testcontainers spins up Postgres in Docker), serialization of API requests and responses, message formats on queues, and transaction boundaries (does a failure roll back both writes?). Contract tests (Pact) verify that a provider still satisfies what its consumers expect, catching breaking API changes between services.\n\nEnd-to-end tests cover a few critical journeys through the real system; they're slow and flaky if overused, so keep the pyramid: many unit tests, fewer integration tests, very few end-to-end tests.\n\nIn an interview wrap-up, one sentence per level is enough: 'Unit tests for pricing and allocation with a fake clock; an integration test for the repository with Testcontainers; a concurrency test for slot allocation.'",
    },
  ],
};

// Plan 0025 step 6 appends lessons that the LLD projects lean on (concurrency, testing, error handling, immutability, events).
export const MORE_LLD: Record<string, Section[]> = Object.fromEntries(
  Object.keys({ ...MORE_LLD_BASE, ...MORE_LLD_C }).map((id) => [id, [...(MORE_LLD_BASE[id] ?? []), ...(MORE_LLD_C[id] ?? [])]]),
);
