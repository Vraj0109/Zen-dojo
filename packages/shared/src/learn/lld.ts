import type { LldGuide } from "./types";
import { URL_SHORTENER_GUIDE } from "./lld-deep-b-url";
import { VENDING_ATM_GUIDE } from "./lld-deep-c-vending";
import { BOOKING_GUIDE } from "./lld-deep-c-booking";
import { SPLITWISE_GUIDE } from "./lld-deep-c-splitwise";
import { LIBRARY_GUIDE } from "./lld-deep-c-library";
import { FOOD_GUIDE } from "./lld-deep-d-food";
import { CAB_GUIDE } from "./lld-deep-d-cab";
import { GAMES_GUIDE } from "./lld-deep-d-games";
import { FILESYSTEM_GUIDE } from "./lld-deep-d-filesystem";
import { KV_GUIDE } from "./lld-deep-d-kv";
import { HOTEL_GUIDE } from "./lld-deep-e-hotel";
import { MEETING_GUIDE } from "./lld-deep-e-meeting";
import { PUBSUB_GUIDE, ORDERBOOK_GUIDE, TEXT_EDITOR_GUIDE, JOB_SCHEDULER_GUIDE } from "./lld-deep-f";

// Low-level design: topic lessons and reference answers for the classic problems.

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
  "lldp-games": GAMES_GUIDE,
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
  "lldp-food-cab": FOOD_GUIDE,
  "lldp-file-system-kv": FILESYSTEM_GUIDE,
  "lldp-library": LIBRARY_GUIDE,
  "lldp-cab": CAB_GUIDE,
  "lldp-kv-store": KV_GUIDE,
  "lldp-hotel": HOTEL_GUIDE,
  "lldp-meeting-rooms": MEETING_GUIDE,
  "lldp-pubsub": PUBSUB_GUIDE,
  "lldp-orderbook": ORDERBOOK_GUIDE,
  "lldp-text-editor": TEXT_EDITOR_GUIDE,
  "lldp-job-scheduler": JOB_SCHEDULER_GUIDE,
};
