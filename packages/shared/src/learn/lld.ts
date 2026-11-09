import { lesson, type LldGuide, type Lesson } from "./types";
import { URL_SHORTENER_GUIDE } from "./lld-deep-b-url";
import { VENDING_ATM_GUIDE } from "./lld-deep-c-vending";
import { BOOKING_GUIDE } from "./lld-deep-c-booking";
import { SPLITWISE_GUIDE } from "./lld-deep-c-splitwise";

// Low-level design: topic lessons and reference answers for the classic problems.

export const LLD_LESSONS: Record<string, Lesson> = {
  "lld-oop": lesson(
    "Object-oriented design is about putting behaviour next to the data it protects and depending on abstractions. In an LLD round, interviewers judge whether your classes have clear responsibilities and whether the design bends easily when requirements change.",
    [
      "Keep fields private and expose behaviour, not setters: account.withdraw(amount) checks the balance itself instead of callers doing setBalance(getBalance() - x). This keeps invariants in one place.",
      "Inheritance models 'is-a' and couples the subclass to the parent's internals; deep hierarchies get brittle. Composition ('has-a', delegating to a field) is more flexible: a Car has an Engine you can swap. Prefer composition, and use inheritance for true subtypes with shared behaviour.",
      "Callers work with an interface (PaymentMethod) and each implementation (Card, UPI, Wallet) behaves differently behind it. This removes if/else-on-type chains, and new types are added without touching callers.",
      "An interface is a pure contract with no state; a class can implement many, and it's the default for abstractions. An abstract class can hold shared state and partial implementation for closely related subclasses (template method). Program to interfaces.",
    ],
    ["Composition vs inheritance: give a case where inheritance goes wrong.", "Interface vs abstract class in Java?"],
  ),
  "lld-solid": lesson(
    "SOLID is five principles for code that's easy to change. Interviewers want each one with a concrete example, ideally from the design you're drawing, not textbook definitions.",
    [
      "A class should have one reason to change. An Invoice that calculates totals, saves to the database and sends emails changes for three reasons; split it into Invoice (totals), InvoiceRepository (persistence) and InvoiceMailer (email).",
      "Open for extension, closed for modification: add behaviour by adding code, not by editing working code. Pricing with if (vehicle == CAR) … else if (BIKE) … must be edited for every new type; a PricingStrategy interface with one class per type is extended instead.",
      "Subtypes must be usable wherever the base type is expected without surprises. The classic violation: Square extends Rectangle, where setting the width also changes the height, which breaks callers. Another: a ReadOnlyList subclass that throws on add(). If a subclass can't honour the parent's contract, it shouldn't be a subclass.",
      "Clients shouldn't depend on methods they don't use. A fat Worker interface with work() and eat() forces Robot to implement eat(). Split it into Workable and Feedable, or small role interfaces such as Printer, Scanner and Fax instead of one MultiFunctionDevice.",
      "High-level policy depends on abstractions, not concrete details: OrderService takes a PaymentGateway interface in its constructor rather than creating a StripeClient. This enables testing with fakes and swapping providers, and is what dependency injection is for.",
    ],
    ["Which SOLID principle does your parking lot pricing follow?", "Give an LSP violation you've seen."],
  ),
  "lld-patterns": lesson(
    "Patterns are named solutions to recurring design problems. Use them when the problem calls for them, name them as you use them, and know the one-line intent of each common one.",
    [
      "Define a family of interchangeable algorithms behind one interface and choose at runtime: pricing strategies, payment methods, elevator scheduling, rate-limit algorithms. It replaces conditionals on type.",
      "Subjects notify registered observers when something changes, so publishers don't know the concrete subscribers: notify display boards when a parking spot frees up, or send notifications on order status changes. Watch out for memory leaks from forgotten subscriptions, and for ordering.",
      "A factory centralizes object creation behind a method (VehicleFactory.create(type)), so callers don't call new on concrete classes. An abstract factory creates families of related objects (a UI toolkit's Button and Checkbox for Mac vs Windows).",
      "Build complex objects step by step with readable, optional parameters instead of telescoping constructors: new Pizza.Builder().size(L).cheese().build(). Validate in build(). Good for immutable objects with many fields.",
      "Ensures one instance with a global access point (configuration, a connection pool). Pitfalls: hidden global state, hard to test (can't swap it for a fake), and thread-safety of lazy creation. Prefer dependency injection; if you need one, use an enum or a holder class for thread-safe laziness.",
      "Wrap an object to add behaviour while keeping the same interface, stacking at runtime: new BufferedInputStream(new FileInputStream(f)), or a coffee with milk and sugar decorators, or logging and caching wrappers around a repository.",
      "An object changes behaviour when its internal state changes, with each state as a class: a vending machine (Idle → HasMoney → Dispensing), an order lifecycle, a TCP connection. It replaces big switch statements on a state enum and makes illegal transitions explicit.",
      "Encapsulate a request as an object so it can be queued, logged, retried or undone: text editor undo and redo, a job queue, elevator requests, transaction operations.",
      "Convert one interface to another that clients expect, wrapping a legacy or third-party API: a PaymentGateway adapter around the Stripe SDK, or an XML-to-JSON adapter.",
      "Pass a request along a chain of handlers until one handles it: middleware (auth → rate limit → logging → handler), approval workflows (manager → director → VP), ATM cash dispensing (2000s → 500s → 100s), logging levels.",
    ],
    ["Which patterns would you use in a vending machine?", "What's wrong with Singleton, and what would you do instead?", "Strategy vs State?"],
    ["Forcing patterns where a simple class would do."],
  ),
  "lld-modeling": lesson(
    "Modeling turns requirements into entities, relationships and states. Good models make illegal states hard to represent and keep the core flow simple to code in 20 minutes.",
    [
      "Find the nouns (entities: ParkingLot, Floor, Spot, Vehicle, Ticket) and verbs (operations: park, unpark, pay). Decide ownership and cardinality (a Lot has many Floors; a Ticket references one Spot and one Vehicle), and keep relationships one-directional where possible.",
      "Use enums for fixed sets (VehicleType, SpotSize, OrderStatus, Direction) instead of strings or ints. The type system catches typos, and switches over them stay exhaustive.",
      "Write down the allowed transitions (CREATED → PAID → SHIPPED → DELIVERED, with CANCELLED from CREATED or PAID) and enforce them in one place, rejecting invalid ones. This is often the heart of the problem (order, elevator, vending machine, booking).",
      "Validate inputs at the boundary (amount > 0, seat exists) and fail with specific exceptions (SeatAlreadyBookedException, InsufficientFundsException) instead of returning null or false. Decide what's a checked versus a runtime error, and keep the system consistent when something fails halfway.",
      "Identify what's likely to change (new vehicle types, pricing rules, payment methods, notification channels) and put an interface there. Don't add abstraction for things that won't change; say why you're adding each interface.",
    ],
    ["Model the order states of an e-commerce system and its legal transitions.", "Where would you put interfaces in a parking lot?"],
  ),
  "lld-concurrency": lesson(
    "LLD problems often end with 'now make it thread-safe'. Know the Java concurrency tools, where races hide in your design, and the classic thread-safe structures.",
    [
      "Processes are isolated, threads share memory (see Core CS). In LLD, the question is which of your objects are shared between threads (a parking lot's spot map, a cache, a counter) and therefore need protection.",
      "A mutex (synchronized, ReentrantLock) gives exclusive access to a critical section; ReentrantLock adds tryLock with a timeout, fairness and multiple conditions. A semaphore limits concurrent access to N (Semaphore(10) for 10 connections or 10 parking spots).",
      "Producers put work on a BlockingQueue and consumers take from it; put() blocks when full (backpressure) and take() blocks when empty. ArrayBlockingQueue (bounded) or LinkedBlockingQueue. This is the standard way to hand off work between threads.",
      "Creating a thread per task is expensive and unbounded. An ExecutorService (fixed thread pool) reuses threads and queues tasks; submit() returns a Future. Size pools by workload: about the core count for CPU-bound work, more for I/O-bound. Use CompletableFuture to compose async steps.",
      "Mutual exclusion, hold and wait, no preemption and circular wait (see Core CS). In code, always acquire multiple locks in a global order (by id), keep critical sections small, and never call out to unknown code while holding a lock.",
      "AtomicInteger and AtomicLong (incrementAndGet, compareAndSet) give lock-free counters; ConcurrentHashMap (computeIfAbsent, merge) gives thread-safe maps without locking the whole map. Check-then-act on a normal map (if (!map.containsKey(k)) map.put(…)) is a race; use putIfAbsent or compute instead.",
      "Thread-safe lazy singleton: the holder idiom (a static nested class holding the instance, initialized on first access by the class loader) or an enum. Thread-safe LRU cache: a HashMap plus a doubly linked list guarded by one lock, or a LinkedHashMap with accessOrder=true wrapped with a lock; ConcurrentHashMap alone doesn't give you LRU order.",
    ],
    ["Make your parking lot's spot allocation thread-safe.", "Implement a bounded blocking queue with wait/notify or locks and conditions.", "Why isn't ConcurrentHashMap enough for an LRU cache?"],
  ),
  "lld-testing": lesson(
    "Mentioning how you'd test your design shows seniority. Keep it short: what you'd unit test, the edge cases, and how dependency injection makes it testable.",
    [
      "Test behaviour through public methods: park assigns the smallest fitting spot, unpark frees it and computes the fee. One behaviour per test, arrange-act-assert, descriptive names (parksBikeInSmallestAvailableSpot).",
      "Empty and full states (no spots left), boundary values (exactly at the fee boundary), invalid input (negative amount, unknown ticket), duplicates (paying twice), and concurrency (two cars racing for the last spot).",
      "Replace dependencies (payment gateway, clock, notification sender) with fakes or mocks so tests are fast and deterministic. That's only possible if the dependencies are injected interfaces, which ties back to dependency inversion. Inject a Clock for any time-based logic.",
      "Integration tests check real wiring: repository against a real database (Testcontainers), API endpoints end to end, message flow through a queue. Fewer of them, covering the paths that unit tests with fakes can't prove.",
    ],
    ["How would you test fee calculation that depends on the current time?", "What would you mock in your design and why?"],
  ),
};

export const LLD_GUIDES: Record<string, LldGuide> = {
  "lldp-url-shortener": URL_SHORTENER_GUIDE,
  "lldp-parking-lot": {
    requirements: [
      "Multiple floors, each with spots of sizes SMALL (bike), MEDIUM (car), LARGE (truck/bus).",
      "Entry issues a ticket and assigns the smallest available fitting spot; exit computes the fee and frees the spot.",
      "Hourly pricing that differs by vehicle type; pluggable pricing.",
      "Thread-safe: multiple entry gates in parallel. Display free counts per floor (nice to have).",
    ],
    entities: ["ParkingLot (singleton-ish, holds floors)", "Floor (spots by size)", "Spot (id, size, occupied)", "Vehicle (plate, type)", "Ticket (id, vehicle, spot, entry time)", "PricingStrategy", "SpotAllocator"],
    patterns: ["Strategy for pricing and spot allocation", "Factory for tickets", "Observer for free-spot display boards"],
    code: `enum VehicleType { BIKE, CAR, TRUCK }
enum SpotSize { SMALL, MEDIUM, LARGE }

record Vehicle(String plate, VehicleType type) {
  SpotSize minSize() {
    return switch (type) { case BIKE -> SpotSize.SMALL; case CAR -> SpotSize.MEDIUM; case TRUCK -> SpotSize.LARGE; };
  }
}

class Spot {
  final String id; final SpotSize size;
  private Vehicle vehicle;
  Spot(String id, SpotSize size) { this.id = id; this.size = size; }
  boolean isFree() { return vehicle == null; }
  void assign(Vehicle v) { vehicle = v; }
  void release() { vehicle = null; }
}

record Ticket(String id, Vehicle vehicle, Spot spot, Instant entry) {}

interface PricingStrategy { long fee(Ticket t, Instant exit); }

class HourlyPricing implements PricingStrategy {
  private final Map<VehicleType, Long> perHour;
  HourlyPricing(Map<VehicleType, Long> perHour) { this.perHour = perHour; }
  public long fee(Ticket t, Instant exit) {
    long hours = Math.max(1, (Duration.between(t.entry(), exit).toMinutes() + 59) / 60);
    return hours * perHour.get(t.vehicle().type());
  }
}

class ParkingLot {
  private final List<Spot> spots;              // all floors, sorted by size
  private final Map<String, Ticket> active = new ConcurrentHashMap<>();
  private final PricingStrategy pricing;
  private final Clock clock;

  ParkingLot(List<Spot> spots, PricingStrategy pricing, Clock clock) {
    this.spots = spots.stream().sorted(Comparator.comparing(s -> s.size)).toList();
    this.pricing = pricing; this.clock = clock;
  }

  public synchronized Ticket park(Vehicle v) {     // one lock: simple and correct
    Spot spot = spots.stream()
        .filter(s -> s.isFree() && s.size.compareTo(v.minSize()) >= 0)
        .findFirst().orElseThrow(() -> new IllegalStateException("Lot full"));
    spot.assign(v);
    Ticket t = new Ticket(UUID.randomUUID().toString(), v, spot, clock.instant());
    active.put(t.id(), t);
    return t;
  }

  public synchronized long unpark(String ticketId) {
    Ticket t = Optional.ofNullable(active.remove(ticketId)).orElseThrow(() -> new IllegalArgumentException("Unknown ticket"));
    t.spot().release();
    return pricing.fee(t, clock.instant());
  }
}`,
    extensions: [
      "Finer-grained locking: one free-spot queue per size (ConcurrentLinkedQueue) so gates don't contend on one lock.",
      "Electric-charging spots: add a feature set to Spot and a matching rule to the allocator.",
      "Payment: a PaymentProcessor interface (card, cash, UPI) called on exit before releasing the spot.",
      "Display boards subscribe (Observer) to spot assigned / released events.",
    ],
  },
  "lldp-elevator": {
    requirements: [
      "N elevators, M floors. Hall calls (floor + direction) and car calls (destination buttons inside).",
      "A dispatcher assigns each hall call to an elevator; each elevator serves requests in its direction (SCAN / LOOK).",
      "Elevator state: IDLE, MOVING_UP, MOVING_DOWN, DOORS_OPEN, MAINTENANCE.",
      "Pluggable dispatch strategy; simulation by ticks.",
    ],
    entities: ["ElevatorSystem (dispatcher)", "Elevator (current floor, direction, state, up/down stop sets)", "Request (floor, direction)", "DispatchStrategy"],
    patterns: ["Strategy for dispatching", "State for elevator behaviour", "Command for requests (queue them)"],
    code: `enum Direction { UP, DOWN, IDLE }

record HallCall(int floor, Direction dir) {}

class Elevator {
  final int id; int floor = 0; Direction dir = Direction.IDLE;
  private final TreeSet<Integer> up = new TreeSet<>(), down = new TreeSet<>();
  Elevator(int id) { this.id = id; }

  synchronized void addStop(int target) {
    if (target > floor) up.add(target); else if (target < floor) down.add(target);
    if (dir == Direction.IDLE) dir = target >= floor ? Direction.UP : Direction.DOWN;
  }

  /** LOOK: keep going while there are stops ahead, then reverse. */
  synchronized void step() {
    if (dir == Direction.UP) {
      if (up.isEmpty()) { dir = down.isEmpty() ? Direction.IDLE : Direction.DOWN; return; }
      floor++;
      if (up.remove(floor)) openDoors();
    } else if (dir == Direction.DOWN) {
      if (down.isEmpty()) { dir = up.isEmpty() ? Direction.IDLE : Direction.UP; return; }
      floor--;
      if (down.remove(floor)) openDoors();
    }
  }
  int pendingStops() { return up.size() + down.size(); }
  private void openDoors() { /* notify passengers, wait, close */ }
}

interface DispatchStrategy { Elevator choose(List<Elevator> elevators, HallCall call); }

/** Nearest elevator that is idle or already moving toward the call in the same direction. */
class NearestCarStrategy implements DispatchStrategy {
  public Elevator choose(List<Elevator> es, HallCall c) {
    return es.stream().min(Comparator.comparingInt(e -> cost(e, c))).orElseThrow();
  }
  private int cost(Elevator e, HallCall c) {
    int d = Math.abs(e.floor - c.floor());
    boolean onTheWay = e.dir == Direction.IDLE
        || (e.dir == Direction.UP && c.dir() == Direction.UP && c.floor() >= e.floor)
        || (e.dir == Direction.DOWN && c.dir() == Direction.DOWN && c.floor() <= e.floor);
    return onTheWay ? d : d + 20 + 2 * e.pendingStops();   // penalize detours (tunable)
  }
}

class ElevatorSystem {
  private final List<Elevator> elevators; private final DispatchStrategy strategy;
  ElevatorSystem(List<Elevator> es, DispatchStrategy s) { elevators = es; strategy = s; }
  void hallCall(HallCall c) { strategy.choose(elevators, c).addStop(c.floor()); }
  void carCall(int elevatorId, int floor) { elevators.get(elevatorId).addStop(floor); }
  void tick() { elevators.forEach(Elevator::step); }
}`,
    extensions: [
      "Capacity and weight limits; skip hall calls when full.",
      "Maintenance / emergency state that rejects new stops.",
      "Different strategies for peak hours (zoning: some cars serve only high floors).",
      "Thread safety: dispatcher on one thread, each elevator on its own thread consuming a BlockingQueue of commands.",
    ],
  },
  "lldp-booking": BOOKING_GUIDE,
  "lldp-lru-rate-limiter": {
    requirements: [
      "LRU cache with capacity N: get and put in O(1); evict the least recently used entry when full.",
      "Rate limiter class: allow(clientId) using a token bucket (capacity, refill rate) per client.",
      "Both thread-safe; time injected for testing.",
    ],
    entities: ["LRUCache<K,V> (HashMap + doubly linked list)", "Node<K,V>", "RateLimiter interface", "TokenBucketLimiter (bucket per client)", "Clock"],
    patterns: ["Strategy for rate-limit algorithms (token bucket, sliding window)", "Dependency injection of the clock"],
    code: `class LRUCache<K, V> {
  private final class Node { K key; V val; Node prev, next; Node(K k, V v) { key = k; val = v; } }
  private final int capacity;
  private final Map<K, Node> map = new HashMap<>();
  private final Node head = new Node(null, null), tail = new Node(null, null);   // sentinels

  LRUCache(int capacity) { this.capacity = capacity; head.next = tail; tail.prev = head; }

  public synchronized V get(K key) {
    Node n = map.get(key);
    if (n == null) return null;
    unlink(n); addFront(n);
    return n.val;
  }

  public synchronized void put(K key, V val) {
    Node n = map.get(key);
    if (n != null) { n.val = val; unlink(n); addFront(n); return; }
    if (map.size() == capacity) { Node lru = tail.prev; unlink(lru); map.remove(lru.key); }
    n = new Node(key, val); map.put(key, n); addFront(n);
  }

  private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
  private void addFront(Node n) { n.next = head.next; n.prev = head; head.next.prev = n; head.next = n; }
}

interface RateLimiter { boolean allow(String clientId); }

class TokenBucketLimiter implements RateLimiter {
  private static final class Bucket { double tokens; long lastNanos; }
  private final double capacity, refillPerNano;
  private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
  private final LongSupplier nanoClock;

  TokenBucketLimiter(int capacity, double perSecond, LongSupplier nanoClock) {
    this.capacity = capacity; this.refillPerNano = perSecond / 1e9; this.nanoClock = nanoClock;
  }

  public boolean allow(String clientId) {
    Bucket b = buckets.computeIfAbsent(clientId, k -> { Bucket nb = new Bucket(); nb.tokens = capacity; nb.lastNanos = nanoClock.getAsLong(); return nb; });
    synchronized (b) {                                   // lock per client, not global
      long now = nanoClock.getAsLong();
      b.tokens = Math.min(capacity, b.tokens + (now - b.lastNanos) * refillPerNano);
      b.lastNanos = now;
      if (b.tokens < 1) return false;
      b.tokens -= 1;
      return true;
    }
  }
}`,
    extensions: [
      "LRU with TTL per entry; LFU variant (frequency buckets) for stable popularity.",
      "Higher concurrency: segment the cache into N shards by key hash, each with its own lock.",
      "Sliding-window-counter limiter as a second Strategy; evict idle buckets to bound memory.",
      "Distributed limiter: move the bucket into Redis with an atomic Lua script.",
    ],
  },
  "lldp-splitwise": SPLITWISE_GUIDE,
  "lldp-games": {
    requirements: [
      "Tic-tac-toe on an N×N board for 2 players (generalizes to chess / snake): make moves, validate, detect win or draw.",
      "Players can be human or bot.",
      "Undo the last move (nice to have).",
    ],
    entities: ["Game (board, players, turn, status)", "Board (grid, place, isFull)", "Player interface (Human, Bot)", "Move (row, col, symbol)", "WinningStrategy (rows, cols, diagonals)", "GameStatus enum"],
    patterns: ["Strategy for players (human input vs bot) and win checks", "Command for moves (enables undo)", "State for game status"],
    code: `enum Symbol { X, O }
enum Status { IN_PROGRESS, WON, DRAW }

record Move(int row, int col, Symbol symbol) {}

interface Player { Symbol symbol(); Move nextMove(Board board); }

class Board {
  final int n; private final Symbol[][] cells;
  Board(int n) { this.n = n; cells = new Symbol[n][n]; }
  boolean isEmpty(int r, int c) { return cells[r][c] == null; }
  void place(Move m) {
    if (m.row() < 0 || m.row() >= n || m.col() < 0 || m.col() >= n || !isEmpty(m.row(), m.col()))
      throw new IllegalArgumentException("Invalid move");
    cells[m.row()][m.col()] = m.symbol();
  }
  void clear(Move m) { cells[m.row()][m.col()] = null; }
}

class Game {
  private final Board board; private final List<Player> players; private final Deque<Move> history = new ArrayDeque<>();
  private final int[] rows, cols; private int diag, anti, turn;     // +1 for X, -1 for O: O(1) win check
  Status status = Status.IN_PROGRESS;

  Game(int n, List<Player> players) { board = new Board(n); this.players = players; rows = new int[n]; cols = new int[n]; }

  void playTurn() {
    if (status != Status.IN_PROGRESS) throw new IllegalStateException("Game over");
    Player p = players.get(turn % players.size());
    Move m = p.nextMove(board);
    board.place(m); history.push(m);
    int v = m.symbol() == Symbol.X ? 1 : -1, n = board.n;
    rows[m.row()] += v; cols[m.col()] += v;
    if (m.row() == m.col()) diag += v;
    if (m.row() + m.col() == n - 1) anti += v;
    if (Math.abs(rows[m.row()]) == n || Math.abs(cols[m.col()]) == n || Math.abs(diag) == n || Math.abs(anti) == n) status = Status.WON;
    else if (history.size() == n * n) status = Status.DRAW;
    turn++;
  }
}`,
    extensions: [
      "Undo: pop the history, clear the cell, reverse the counters and the turn (Command pattern).",
      "Chess: Piece hierarchy with per-piece move generation (Strategy), check/checkmate validation, special moves.",
      "Snake: deque for the body, set for O(1) collision checks, food spawning; game loop with ticks.",
      "Bot difficulty levels as different Player strategies (random, minimax).",
    ],
  },
  "lldp-vending-atm": VENDING_ATM_GUIDE,
  "lldp-logger-notifications": {
    requirements: [
      "Logger: log(level, message) with levels DEBUG < INFO < WARN < ERROR; per-logger minimum level; multiple sinks (console, file, remote).",
      "Formatting is pluggable; logging must not block the caller for slow sinks.",
      "Notification variant: send events to users via email, SMS and push based on their preferences, with retries.",
    ],
    entities: ["Logger", "Level enum", "LogRecord", "Appender/Sink interface (Console, File, Remote)", "Formatter", "AsyncAppender (queue + worker)", "NotificationService, Channel interface, Preference store"],
    patterns: ["Chain of Responsibility or level filtering", "Observer / publish-subscribe for sinks", "Strategy for formatters and channels", "Decorator for async and batching wrappers"],
    code: `enum Level { DEBUG, INFO, WARN, ERROR }
record LogRecord(Instant time, Level level, String logger, String message) {}

interface Formatter { String format(LogRecord r); }
interface Sink { void write(String line); }

class ConsoleSink implements Sink { public void write(String line) { System.out.println(line); } }

/** Decorator: makes any sink non-blocking with a bounded queue and one writer thread. */
class AsyncSink implements Sink {
  private final BlockingQueue<String> queue = new ArrayBlockingQueue<>(10_000);
  AsyncSink(Sink inner) {
    Thread t = new Thread(() -> {
      try { while (true) inner.write(queue.take()); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
    }, "log-writer");
    t.setDaemon(true); t.start();
  }
  public void write(String line) { queue.offer(line); }   // drop when full rather than block callers
}

class Logger {
  private final String name; private volatile Level min;
  private final List<Sink> sinks; private final Formatter fmt; private final Clock clock;
  Logger(String name, Level min, List<Sink> sinks, Formatter fmt, Clock clock) {
    this.name = name; this.min = min; this.sinks = List.copyOf(sinks); this.fmt = fmt; this.clock = clock;
  }
  void log(Level level, String msg) {
    if (level.compareTo(min) < 0) return;
    String line = fmt.format(new LogRecord(clock.instant(), level, name, msg));
    for (Sink s : sinks) s.write(line);
  }
  void info(String m) { log(Level.INFO, m); }
  void error(String m) { log(Level.ERROR, m); }
}

// Notifications: same shape, Channel instead of Sink
interface Channel { boolean send(String userId, String message); }   // Email, Sms, Push implement it

class NotificationService {
  private final Map<String, Channel> channels; private final PreferenceStore prefs;
  NotificationService(Map<String, Channel> channels, PreferenceStore prefs) { this.channels = channels; this.prefs = prefs; }
  void notify(String userId, String message) {
    for (String ch : prefs.channelsFor(userId)) {
      Channel c = channels.get(ch);
      if (c != null && !c.send(userId, message)) { /* enqueue for retry with backoff */ }
    }
  }
}`,
    extensions: [
      "Log rotation for the file sink (by size or day); structured JSON logs with MDC context (request id).",
      "Backpressure policy for the async queue: drop DEBUG first, block on ERROR.",
      "Notifications: templates per channel, rate limiting per user, dedup by event id, quiet hours.",
    ],
  },
  "lldp-food-cab": {
    requirements: [
      "Cab booking (small scope): rider requests a ride from A to B; match the nearest available driver; trip lifecycle; fare.",
      "Driver states: OFFLINE, AVAILABLE, ON_TRIP. Trip states: REQUESTED → ACCEPTED → STARTED → COMPLETED / CANCELLED.",
      "Pluggable matching and pricing (surge). Food delivery is the same shape with restaurant + order prep.",
    ],
    entities: ["Rider", "Driver (location, status)", "Location", "Trip (rider, driver, pickup, drop, status, fare)", "MatchingStrategy", "PricingStrategy", "TripService"],
    patterns: ["Strategy for matching and pricing", "State for trip lifecycle", "Observer to notify rider and driver"],
    code: `enum DriverStatus { OFFLINE, AVAILABLE, ON_TRIP }
enum TripStatus { REQUESTED, ACCEPTED, STARTED, COMPLETED, CANCELLED }

record Location(double lat, double lng) {
  double distanceTo(Location o) { return Math.hypot(lat - o.lat, lng - o.lng); }   // haversine in real life
}

class Driver {
  final String id; volatile Location location; DriverStatus status = DriverStatus.OFFLINE;
  Driver(String id, Location l) { this.id = id; location = l; }
}

class Trip {
  final String id; final String riderId; final Location pickup, drop; Driver driver;
  TripStatus status = TripStatus.REQUESTED; long fare;
  Trip(String id, String riderId, Location p, Location d) { this.id = id; this.riderId = riderId; pickup = p; drop = d; }

  void transition(TripStatus next) {
    boolean ok = switch (status) {
      case REQUESTED -> next == TripStatus.ACCEPTED || next == TripStatus.CANCELLED;
      case ACCEPTED -> next == TripStatus.STARTED || next == TripStatus.CANCELLED;
      case STARTED -> next == TripStatus.COMPLETED;
      default -> false;
    };
    if (!ok) throw new IllegalStateException(status + " -> " + next);
    status = next;
  }
}

interface MatchingStrategy { Optional<Driver> match(Location pickup, Collection<Driver> drivers); }

class NearestDriver implements MatchingStrategy {
  public Optional<Driver> match(Location pickup, Collection<Driver> drivers) {
    return drivers.stream().filter(d -> d.status == DriverStatus.AVAILABLE)
        .min(Comparator.comparingDouble(d -> d.location.distanceTo(pickup)));
  }
}

interface PricingStrategy { long fare(Trip t); }

class TripService {
  private final Map<String, Driver> drivers = new ConcurrentHashMap<>();
  private final MatchingStrategy matching; private final PricingStrategy pricing;
  TripService(MatchingStrategy m, PricingStrategy p) { matching = m; pricing = p; }

  synchronized Trip request(String riderId, Location from, Location to) {   // one lock: no driver double-booked
    Trip t = new Trip(UUID.randomUUID().toString(), riderId, from, to);
    Driver d = matching.match(from, drivers.values()).orElseThrow(() -> new IllegalStateException("No drivers nearby"));
    d.status = DriverStatus.ON_TRIP; t.driver = d; t.transition(TripStatus.ACCEPTED);
    return t;
  }

  synchronized void complete(Trip t) {
    t.transition(TripStatus.COMPLETED);
    t.fare = pricing.fare(t);
    t.driver.status = DriverStatus.AVAILABLE;
  }
}`,
    extensions: [
      "Driver acceptance with a timeout: offer to the nearest, fall back to the next.",
      "Spatial index (grid / geohash cells) instead of scanning all drivers.",
      "Surge pricing strategy based on demand/supply per cell; ratings after trips.",
      "Food delivery: Order states (PLACED → PREPARING → PICKED_UP → DELIVERED), assign a rider when the food is nearly ready.",
    ],
  },
  "lldp-file-system-kv": {
    requirements: [
      "In-memory file system: mkdir -p, ls, create/append/read file content, by absolute paths like /a/b/c.",
      "ls on a file returns its name; on a directory returns sorted children.",
      "Variant: in-memory key-value store with get, set, delete and transactions (begin / commit / rollback, nested).",
    ],
    entities: ["Node (abstract: name)", "Directory (children map)", "File (content)", "FileSystem (root, path resolution)", "KVStore (data map + transaction stack)"],
    patterns: ["Composite for files and directories", "Command or memento-style transaction stack for the KV store"],
    code: `abstract class Node { final String name; Node(String n) { name = n; } }
class FileNode extends Node { final StringBuilder content = new StringBuilder(); FileNode(String n) { super(n); } }
class Dir extends Node { final TreeMap<String, Node> children = new TreeMap<>(); Dir(String n) { super(n); } }

class FileSystem {
  private final Dir root = new Dir("");

  public List<String> ls(String path) {
    Node n = resolve(path, false);
    return n instanceof Dir d ? new ArrayList<>(d.children.keySet()) : List.of(n.name);
  }
  public void mkdir(String path) { resolve(path, true); }
  public void append(String path, String text) {
    Dir parent = (Dir) resolve(parentOf(path), true);
    Node n = parent.children.computeIfAbsent(nameOf(path), FileNode::new);
    if (!(n instanceof FileNode f)) throw new IllegalArgumentException("Is a directory");
    f.content.append(text);
  }
  public String read(String path) {
    if (!(resolve(path, false) instanceof FileNode f)) throw new IllegalArgumentException("Not a file");
    return f.content.toString();
  }

  private Node resolve(String path, boolean create) {
    Node cur = root;
    for (String part : path.split("/")) {
      if (part.isEmpty()) continue;
      if (!(cur instanceof Dir d)) throw new IllegalArgumentException("Not a directory: " + part);
      Node next = d.children.get(part);
      if (next == null) {
        if (!create) throw new NoSuchElementException(path);
        next = new Dir(part); d.children.put(part, next);
      }
      cur = next;
    }
    return cur;
  }
  private static String parentOf(String p) { int i = p.lastIndexOf('/'); return i <= 0 ? "/" : p.substring(0, i); }
  private static String nameOf(String p) { return p.substring(p.lastIndexOf('/') + 1); }
}

/** Key-value store with nested transactions: each level records the old values it overwrote. */
class KVStore {
  private static final Object ABSENT = new Object();
  private final Map<String, String> data = new HashMap<>();
  private final Deque<Map<String, Object>> undo = new ArrayDeque<>();

  String get(String k) { return data.get(k); }
  void set(String k, String v) { remember(k); data.put(k, v); }
  void delete(String k) { remember(k); data.remove(k); }
  void begin() { undo.push(new HashMap<>()); }
  void rollback() {
    if (undo.isEmpty()) throw new IllegalStateException("No transaction");
    undo.pop().forEach((k, old) -> { if (old == ABSENT) data.remove(k); else data.put(k, (String) old); });
  }
  void commit() { undo.clear(); }                     // commits all levels
  private void remember(String k) {
    if (!undo.isEmpty()) undo.peek().putIfAbsent(k, data.containsKey(k) ? data.get(k) : ABSENT);
  }
}`,
    extensions: [
      "rm, mv, file sizes, permissions; a path cache for deep trees.",
      "Thread safety: a read-write lock on the tree, or per-directory locks with ordered acquisition for mv.",
      "KV store: TTL per key (min-heap of expiries), snapshots to disk, count of values (secondary map value → count).",
    ],
  },
};
