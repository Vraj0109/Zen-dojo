import type { LessonExtra } from "./types";

// Deeper material for LLD topics. Code is Java, matching the LLD reference answers.

export const DEEP_LLD: Record<string, LessonExtra> = {
  "lld-oop": {
    recap: [
      "Encapsulation: private state, public behaviour; validate in one place.",
      "Prefer composition (has-a) over inheritance (is-a) unless substitution truly holds.",
      "Polymorphism: call through an interface; add a class instead of an if/else branch.",
      "Interface = capability contract; abstract class = shared partial implementation.",
    ],
    deeper: [
      {
        title: "Inheritance gone wrong, composition instead",
        body: "Classic trap: class Bird { fly() }, class Penguin extends Bird → Penguin.fly() throws. The hierarchy encoded a capability that not every subtype has. Composition models capabilities as parts: a Bird has a MovementStrategy (Flying, Swimming, Walking). New combinations need no new subclasses, and behaviour can change at runtime.\n\nUse inheritance for true 'is-a' with shared invariants (ArrayList is a List), and keep hierarchies shallow.",
        code: `interface Movement { void move(); }
class Flying implements Movement { public void move() { System.out.println("flap"); } }
class Swimming implements Movement { public void move() { System.out.println("paddle"); } }

class Bird {
    private final String name;
    private final Movement movement;          // has-a, swappable
    Bird(String name, Movement movement) { this.name = name; this.movement = movement; }
    void travel() { movement.move(); }
}
// new Bird("penguin", new Swimming()); new Bird("eagle", new Flying());`,
      },
      {
        title: "Encapsulation that protects invariants",
        body: "A BankAccount with a public balance field lets any caller make it negative. Make balance private and expose withdraw(amount) that checks the rule in one place; there's no setter. Return unmodifiable views of internal collections so callers can't add items behind your back.\n\nIn interviews, when you draw a class, say which invariant each method protects ('a slot can be occupied by at most one vehicle').",
      },
    ],
  },
  "lld-solid": {
    recap: [
      "S: one reason to change per class. O: extend with new classes, not edits.",
      "L: subtypes must honour the base contract (no surprise exceptions or stronger preconditions).",
      "I: small, focused interfaces. D: depend on abstractions, inject them.",
      "Name a concrete violation and its fix for each letter.",
    ],
    deeper: [
      {
        title: "Open/closed + dependency inversion in one example",
        body: "A checkout that does if (type == CARD) … else if (type == UPI) … must be edited for every new payment method. Extract PaymentMethod with pay(amount); Checkout depends on the interface and receives implementations (constructor injection or a registry). Adding Wallet means adding a class, not touching Checkout (OCP), and Checkout can be unit-tested with a fake (DIP).",
        code: `interface PaymentMethod { Receipt pay(Money amount); }
class CardPayment implements PaymentMethod { public Receipt pay(Money a) { /* gateway call */ return new Receipt(); } }
class UpiPayment implements PaymentMethod { public Receipt pay(Money a) { /* UPI collect */ return new Receipt(); } }

class Checkout {
    private final Map<String, PaymentMethod> methods;     // injected
    Checkout(Map<String, PaymentMethod> methods) { this.methods = methods; }
    Receipt pay(String method, Money amount) {
        PaymentMethod m = methods.get(method);
        if (m == null) throw new IllegalArgumentException("Unsupported: " + method);
        return m.pay(amount);
    }
}`,
      },
      {
        title: "Liskov and interface segregation, concretely",
        body: "LSP: Square extends Rectangle breaks callers that set width and height independently (setWidth on a square also changes height). The fix is not to inherit; model Shape with area().\n\nISP: a fat Machine interface with print(), scan(), fax() forces a simple printer to implement fax() by throwing. Split into Printer, Scanner, Fax; a multifunction device implements all three. Throwing UnsupportedOperationException from an interface method is the smell that points to both principles.",
      },
    ],
  },
  "lld-patterns": {
    recap: [
      "Strategy: swap an algorithm (pricing, matching). State: behaviour depends on a state object.",
      "Observer: notify subscribers of events. Command: an action as an object (undo, queue).",
      "Factory: hide which class to create. Builder: many optional parameters, immutable result.",
      "Decorator: add behaviour by wrapping. Adapter: convert one interface to another.",
    ],
    deeper: [
      {
        title: "State pattern for a vending machine",
        body: "Without it, every method has a switch on state. With it, each state is a class handling the events that make sense and moving the machine to the next state; invalid actions are rejected in one obvious place per state.",
        code: `interface State {
    default void insertCoin(Machine m, int cents) { throw new IllegalStateException("Can't insert now"); }
    default void select(Machine m, String code)  { throw new IllegalStateException("Insert money first"); }
}
class Idle implements State {
    public void insertCoin(Machine m, int c) { m.addCredit(c); m.setState(new HasCredit()); }
}
class HasCredit implements State {
    public void insertCoin(Machine m, int c) { m.addCredit(c); }
    public void select(Machine m, String code) {
        Item item = m.inventory().get(code);
        if (item.price() > m.credit()) throw new IllegalStateException("Not enough credit");
        m.dispense(item);                         // returns change, decrements stock
        m.setState(new Idle());
    }
}`,
      },
      {
        title: "Picking a pattern in an interview",
        body: "Say the force first, then the pattern: 'pricing rules will change per lot, so pricing is a Strategy'; 'many things must react when an order ships, so Observer/events'; 'the elevator behaves differently when moving vs idle vs maintenance, so State'; 'undo in the editor, so Command with an undo stack'; 'notification channels need retries and logging added uniformly, so Decorators around a Notifier'.\n\nSingleton: mention it for a single shared resource, then mention its costs (global state, hard to test) and prefer injecting one instance.",
      },
    ],
  },
  "lld-modeling": {
    recap: [
      "Nouns → entities; verbs → methods on the class that owns the data.",
      "Enums for finite states; a transition table rejects illegal moves.",
      "Validate at boundaries; throw specific exceptions; keep objects always valid.",
      "Identify the extension points up front (new vehicle type, new pricing) and put interfaces there.",
    ],
    deeper: [
      {
        title: "A state machine with an explicit transition table",
        body: "Order states: CREATED → PAID → SHIPPED → DELIVERED, with CANCELLED reachable from CREATED or PAID. Encode allowed moves in one map so every transition is checked the same way, and history/audit is easy to add.",
        code: `enum OrderStatus { CREATED, PAID, SHIPPED, DELIVERED, CANCELLED }

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
}`,
      },
      {
        title: "Relationships and ownership",
        body: "Decide who owns what: a ParkingLot has Floors, a Floor has Slots (composition: slots don't exist without the floor). A Ticket references a Vehicle and a Slot (association). Put behaviour where the data is: Slot.park(vehicle) checks fit and occupancy; the lot only chooses which slot.\n\nKeep IDs and value objects (Money, TimeRange) immutable; avoid primitives for money (use long cents or BigDecimal) and for time ranges.",
      },
    ],
  },
  "lld-concurrency": {
    recap: [
      "Find the shared mutable state; protect it with one lock, or make it immutable/confined.",
      "Check-then-act must be atomic (synchronized block, CAS, putIfAbsent).",
      "BlockingQueue for producer-consumer; ExecutorService for thread pools.",
      "Deadlock needs 4 conditions; break circular wait with a global lock order.",
    ],
    deeper: [
      {
        title: "Thread-safe slot allocation",
        body: "Two cars arrive at once; both see slot 7 free and both park there. The check (isFree) and the act (occupy) must be one atomic step. Options: synchronized on the floor while choosing and occupying; or a ConcurrentLinkedQueue / BlockingQueue of free slots per type, where poll() atomically hands each slot to exactly one caller.",
        code: `class Floor {
    private final Map<SlotType, BlockingQueue<Slot>> free = new EnumMap<>(SlotType.class);

    Optional<Slot> allocate(SlotType type) {
        Slot s = free.get(type).poll();          // atomic: one caller gets each slot
        return Optional.ofNullable(s);
    }
    void release(Slot s) { free.get(s.type()).offer(s); }
}`,
      },
      {
        title: "Producer-consumer and thread pools",
        body: "A bounded BlockingQueue gives backpressure for free: put() blocks when full, take() blocks when empty. Executors.newFixedThreadPool(n) for CPU-bound work (n ≈ cores); for I/O-bound work more threads or virtual threads (Java 21). Always bound queues and name threads.\n\nFor caches and counters prefer ConcurrentHashMap (compute/merge are atomic per key) and AtomicLong/LongAdder over synchronized blocks. Double-checked locking for a lazy singleton needs a volatile field; the holder-class idiom avoids the subtlety.",
        code: `BlockingQueue<Job> queue = new ArrayBlockingQueue<>(1000);
ExecutorService workers = Executors.newFixedThreadPool(8);
for (int i = 0; i < 8; i++) workers.submit(() -> {
    while (!Thread.currentThread().isInterrupted()) {
        Job j = queue.take();                    // blocks when empty
        j.run();
    }
    return null;
});
queue.put(new Job());                            // blocks when full (backpressure)`,
      },
    ],
  },
  "lld-testing": {
    recap: [
      "Test behaviour through the public API: happy path, boundaries, invalid input, state transitions.",
      "Mock only what you don't own or what's slow (clock, payment gateway, random).",
      "Inject Clock and Random so time and randomness are testable.",
      "Integration tests for wiring: DB queries, serialization, concurrency under load.",
    ],
    deeper: [
      {
        title: "Testing a rate limiter with an injected clock",
        body: "A limiter that calls System.currentTimeMillis() can only be tested with sleeps. Inject a Clock (or a LongSupplier) and advance it in the test. Cover: allows up to the limit, rejects the next, refills after time passes, separate keys are independent, concurrent callers never exceed the limit (run N threads and count allowed).",
        code: `class FakeClock implements LongSupplier { long now; public long getAsLong() { return now; } }

@Test void refillsAfterOneSecond() {
    FakeClock clock = new FakeClock();
    TokenBucket b = new TokenBucket(2, 2.0, clock);   // capacity 2, 2 tokens/s
    assertTrue(b.tryAcquire()); assertTrue(b.tryAcquire());
    assertFalse(b.tryAcquire());
    clock.now += 500;                                 // half a second → 1 token
    assertTrue(b.tryAcquire());
    assertFalse(b.tryAcquire());
}`,
      },
      {
        title: "What to say about tests in an LLD round",
        body: "List 4-6 named cases for your design: 'park when full returns empty', 'exit computes fee across midnight', 'two threads can't take the same slot', 'unknown ticket throws'. Mention that strategies (pricing, matching) are unit-tested in isolation with table-driven cases, and that the facade gets a few end-to-end tests.\n\nThat shows the design is testable, which is usually the real point of the question.",
      },
    ],
  },
};
