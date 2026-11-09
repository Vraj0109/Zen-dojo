import type { LldProject } from "./types";

// Cab booking (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when it was written.

export const LLD_PROJECTS_D_CAB: Record<string, LldProject> = {
  "lldp-cab": {
    files: [
      {
        name: "TimeSource.java",
        code: `interface TimeSource {
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

    synchronized void advanceSeconds(long seconds) { now += seconds * 1000; }

    synchronized void advanceMinutes(long minutes) { now += minutes * 60_000; }
}
`,
      },
      {
        name: "Point.java",
        code: `// A position on a flat map in kilometres.
record Point(double x, double y) {
    double distanceTo(Point other) { return Math.hypot(x - other.x, y - other.y); }
}
`,
      },
      {
        name: "VehicleType.java",
        code: `// What a ride costs depends on the vehicle class. All money is in cents.
enum VehicleType {
    ECONOMY(3_000, 1_200, 200, 5_000),
    PREMIUM(5_000, 2_000, 350, 8_000),
    XL(6_000, 2_400, 400, 9_000);

    private final int baseCents;
    private final int perKmCents;
    private final int perMinuteCents;
    private final int minimumCents;

    VehicleType(int baseCents, int perKmCents, int perMinuteCents, int minimumCents) {
        this.baseCents = baseCents;
        this.perKmCents = perKmCents;
        this.perMinuteCents = perMinuteCents;
        this.minimumCents = minimumCents;
    }

    int baseCents() { return baseCents; }

    int perKmCents() { return perKmCents; }

    int perMinuteCents() { return perMinuteCents; }

    int minimumCents() { return minimumCents; }
}
`,
      },
      {
        name: "DriverStatus.java",
        code: `enum DriverStatus { OFFLINE, AVAILABLE, OFFERED, ON_TRIP }
`,
      },
      {
        name: "Driver.java",
        code: `import java.util.concurrent.atomic.AtomicReference;

// A driver. The status is claimed with compare-and-set, so several trips looking for drivers at once can never
// both get the same one. The location is volatile: the phone writes it, the matcher reads it.
final class Driver {
    final String id;
    final String name;
    final VehicleType vehicle;
    final double rating;
    private volatile Point location;
    private final AtomicReference<DriverStatus> status = new AtomicReference<>(DriverStatus.OFFLINE);

    Driver(String id, String name, VehicleType vehicle, double rating, Point location) {
        this.id = id;
        this.name = name;
        this.vehicle = vehicle;
        this.rating = rating;
        this.location = location;
    }

    Point location() { return location; }

    void setLocation(Point p) { location = p; }

    DriverStatus status() { return status.get(); }

    boolean goOnline() { return status.compareAndSet(DriverStatus.OFFLINE, DriverStatus.AVAILABLE); }

    boolean goOffline() { return status.compareAndSet(DriverStatus.AVAILABLE, DriverStatus.OFFLINE); }

    boolean tryOffer() { return status.compareAndSet(DriverStatus.AVAILABLE, DriverStatus.OFFERED); }

    boolean startTrip() { return status.compareAndSet(DriverStatus.OFFERED, DriverStatus.ON_TRIP); }

    // Back to AVAILABLE from an unanswered offer or a finished trip.
    boolean release() {
        return status.compareAndSet(DriverStatus.OFFERED, DriverStatus.AVAILABLE) || status.compareAndSet(DriverStatus.ON_TRIP, DriverStatus.AVAILABLE);
    }
}
`,
      },
      {
        name: "GridIndex.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// A spatial index: the map is cut into square cells of one kilometre, and each cell lists the drivers inside it.
// "Drivers within 3 km of here" then reads only the cells that the circle touches (about 40 of them) and never the
// whole fleet. A driver that moves is removed from the old cell and added to the new one.
final class GridIndex {
    static final double CELL_KM = 1.0;

    private final Map<Long, Set<Driver>> cells = new ConcurrentHashMap<>();
    private final Map<String, Long> cellOf = new ConcurrentHashMap<>();
    private volatile int cellsRead;   // how many cells the last query looked at, for the tests

    static long key(Point p) {
        long cx = (long) Math.floor(p.x() / CELL_KM);
        long cy = (long) Math.floor(p.y() / CELL_KM);
        return (cx << 32) ^ (cy & 0xffffffffL);
    }

    // Where in the grid a driver is. Called when the driver appears and on every location ping.
    synchronized void update(Driver driver) {
        long now = key(driver.location());
        Long before = cellOf.put(driver.id, now);
        if (before != null && before != now) cells.get(before).remove(driver);
        if (before == null || before != now) cells.computeIfAbsent(now, k -> ConcurrentHashMap.newKeySet()).add(driver);
    }

    synchronized void remove(Driver driver) {
        Long before = cellOf.remove(driver.id);
        if (before != null) cells.get(before).remove(driver);
    }

    // Drivers whose position is within radius km of the point (not sorted).
    List<Driver> near(Point p, double radiusKm) {
        List<Driver> found = new ArrayList<>();
        int reach = (int) Math.ceil(radiusKm / CELL_KM);
        long cx = (long) Math.floor(p.x() / CELL_KM);
        long cy = (long) Math.floor(p.y() / CELL_KM);
        int read = 0;
        for (long x = cx - reach; x <= cx + reach; x++) {
            for (long y = cy - reach; y <= cy + reach; y++) {
                read++;
                Set<Driver> cell = cells.get((x << 32) ^ (y & 0xffffffffL));
                if (cell == null) continue;
                for (Driver d : cell) if (d.location().distanceTo(p) <= radiusKm) found.add(d);
            }
        }
        cellsRead = read;
        return found;
    }

    int lastCellsRead() { return cellsRead; }
}
`,
      },
      {
        name: "TripStatus.java",
        code: `import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

// The life of a trip as a transition table (see the food delivery project for the same idea).
enum TripStatus {
    REQUESTED, DRIVER_ASSIGNED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED, NO_DRIVER;

    private static final Map<TripStatus, Set<TripStatus>> NEXT = new EnumMap<>(TripStatus.class);

    static {
        NEXT.put(REQUESTED, EnumSet.of(DRIVER_ASSIGNED, CANCELLED, NO_DRIVER));
        NEXT.put(DRIVER_ASSIGNED, EnumSet.of(ARRIVED, CANCELLED, REQUESTED));   // REQUESTED again when the driver cancels
        NEXT.put(ARRIVED, EnumSet.of(IN_PROGRESS, CANCELLED));
        NEXT.put(IN_PROGRESS, EnumSet.of(COMPLETED));
        NEXT.put(COMPLETED, EnumSet.noneOf(TripStatus.class));
        NEXT.put(CANCELLED, EnumSet.noneOf(TripStatus.class));
        NEXT.put(NO_DRIVER, EnumSet.noneOf(TripStatus.class));
    }

    boolean canMoveTo(TripStatus next) { return NEXT.get(this).contains(next); }

    boolean isFinal() { return NEXT.get(this).isEmpty(); }
}
`,
      },
      {
        name: "Trip.java",
        code: `import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// One ride request and everything that happens to it. Fields change only inside synchronized(trip) in RideService.
final class Trip {
    final String id;
    final String riderId;
    final Point pickup;
    final Point dropoff;
    final VehicleType type;
    final double surge;            // fixed when the rider asked, so the quote does not change while they wait
    final int estimateCents;
    final long requestedAt;

    TripStatus status = TripStatus.REQUESTED;
    String driverId;
    long assignedAt;
    long arrivedAt;
    long startedAt;
    long endedAt;
    double meteredKm;
    Point lastPoint;
    int fareCents;
    int cancelFeeCents;
    int round;                     // which matching round we are in
    double radiusKm = 2;
    long offerExpiresAt;
    long nextRoundAt;               // when to try again after a round in which nobody could be asked
    final Set<String> offeredTo = new HashSet<>();
    final Set<String> declined = new HashSet<>();
    final List<String> history = new ArrayList<>();

    Trip(String id, String riderId, Point pickup, Point dropoff, VehicleType type, double surge, int estimateCents, long now) {
        this.id = id;
        this.riderId = riderId;
        this.pickup = pickup;
        this.dropoff = dropoff;
        this.type = type;
        this.surge = surge;
        this.estimateCents = estimateCents;
        this.requestedAt = now;
        history.add(now + " REQUESTED");
    }

    boolean moveTo(TripStatus next, long now) {
        if (!status.canMoveTo(next)) return false;
        status = next;
        history.add(now + " " + next);
        return true;
    }
}
`,
      },
      {
        name: "FareBreakdown.java",
        code: `// Shown to the rider before and after a trip.
record FareBreakdown(int baseCents, int distanceCents, int timeCents, double surge, int totalCents) { }
`,
      },
      {
        name: "FareCalculator.java",
        code: `// Fare = (base + per km times distance + per minute times time), at least the minimum, times the surge multiplier.
// One class, so changing prices or adding a toll or an airport fee touches nothing else.
final class FareCalculator {
    FareBreakdown calculate(VehicleType type, double km, long minutes, double surge) {
        int distance = (int) Math.round(type.perKmCents() * km);
        int time = (int) (type.perMinuteCents() * minutes);
        int raw = Math.max(type.minimumCents(), type.baseCents() + distance + time);
        int total = (int) Math.round(raw * surge);
        return new FareBreakdown(type.baseCents(), distance, time, surge, total);
    }
}
`,
      },
      {
        name: "DemandTracker.java",
        code: `import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// Counts ride requests per area in a sliding window (the last five minutes). The surge looks at requests against
// available drivers in the same area.
final class DemandTracker {
    static final long WINDOW_MILLIS = 5 * 60_000;
    private final Map<Long, Deque<Long>> requests = new ConcurrentHashMap<>();

    // The area is a block of 3 by 3 grid cells, found by dividing the cell coordinates by 3.
    static long area(Point p) {
        long ax = (long) Math.floor(p.x() / (3 * GridIndex.CELL_KM));
        long ay = (long) Math.floor(p.y() / (3 * GridIndex.CELL_KM));
        return (ax << 32) ^ (ay & 0xffffffffL);
    }

    void record(Point p, long now) {
        Deque<Long> q = requests.computeIfAbsent(area(p), k -> new ArrayDeque<>());
        synchronized (q) {
            q.addLast(now);
        }
    }

    int recent(Point p, long now) {
        Deque<Long> q = requests.get(area(p));
        if (q == null) return 0;
        synchronized (q) {
            while (!q.isEmpty() && q.peekFirst() <= now - WINDOW_MILLIS) q.pollFirst();
            return q.size();
        }
    }
}
`,
      },
      {
        name: "SurgePolicy.java",
        code: `// The price multiplier for a place and a time, from demand and supply.
interface SurgePolicy {
    double multiplier(int recentRequests, int availableDrivers);
}
`,
      },
      {
        name: "DemandSupplySurge.java",
        code: `// Compares requests (plus the new one) with available drivers (plus one, so an empty area is not a division by zero).
// Steps rather than a smooth curve, so a rider can see and understand the price: 1.0, 1.25, 1.5, 2.0.
final class DemandSupplySurge implements SurgePolicy {
    @Override
    public double multiplier(int recentRequests, int availableDrivers) {
        double ratio = (recentRequests + 1.0) / (availableDrivers + 1.0);
        if (ratio <= 1.0) return 1.0;
        if (ratio <= 2.0) return 1.25;
        if (ratio <= 3.0) return 1.5;
        return 2.0;
    }
}
`,
      },
      {
        name: "PaymentGateway.java",
        code: `interface PaymentGateway {
    // True if the amount was charged.
    boolean charge(String riderId, int cents, String key);
}
`,
      },
      {
        name: "RideListener.java",
        code: `interface RideListener {
    void onEvent(String type, String tripId, String detail);
}
`,
      },
      {
        name: "RideCode.java",
        code: `enum RideCode {
    OK, UNKNOWN_TRIP, UNKNOWN_DRIVER, WRONG_STATE, NOT_YOUR_TRIP, NOT_OFFERED, OFFER_EXPIRED, NO_DRIVER, BAD_LOCATION, PAYMENT_FAILED
}
`,
      },
      {
        name: "RideResult.java",
        code: `record RideResult(RideCode code, Trip trip, int cents) {
    static RideResult of(RideCode code) { return new RideResult(code, null, 0); }

    boolean ok() { return code == RideCode.OK; }
}
`,
      },
      {
        name: "RideService.java",
        code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

// The facade for riders and drivers. Matching works in rounds: each round offers the trip to up to three nearby
// drivers AT THE SAME TIME for 15 seconds, and the first to accept gets it. Offering to several at once is faster than
// one by one, and it is safe because accepting is decided under the trip's lock and every driver is claimed with
// compare-and-set. Drivers who did not answer are released and the next round asks others, up to three rounds.
final class RideService {
    static final long OFFER_MILLIS = 15_000;
    static final int OFFERS_PER_ROUND = 3;
    static final int MAX_ROUNDS = 3;
    static final long RETRY_MILLIS = 10_000;
    static final int FREE_CANCEL_SECONDS = 120;
    static final int LATE_CANCEL_FEE_CENTS = 500;
    static final int ARRIVED_CANCEL_FEE_CENTS = 1_000;

    private final GridIndex index = new GridIndex();
    private final Map<String, Driver> drivers = new ConcurrentHashMap<>();
    private final Map<String, Trip> trips = new ConcurrentHashMap<>();
    private final Map<String, Trip> tripByDriver = new ConcurrentHashMap<>();
    private final List<RideListener> listeners = new CopyOnWriteArrayList<>();
    private final DemandTracker demand = new DemandTracker();
    private final FareCalculator fares = new FareCalculator();
    private final SurgePolicy surgePolicy;
    private final PaymentGateway payments;
    private final TimeSource clock;
    private final AtomicInteger nextId = new AtomicInteger(1);

    RideService(SurgePolicy surgePolicy, PaymentGateway payments, TimeSource clock) {
        this.surgePolicy = surgePolicy;
        this.payments = payments;
        this.clock = clock;
    }

    void subscribe(RideListener l) { listeners.add(l); }

    private void publish(String type, Trip t, String detail) {
        for (RideListener l : listeners) l.onEvent(type, t.id, detail);
    }

    GridIndex index() { return index; }

    Trip trip(String id) { return trips.get(id); }

    // ---------------------------------------------------------------- drivers

    void addDriver(Driver d) {
        drivers.put(d.id, d);
        index.update(d);
    }

    boolean goOnline(String driverId) { return drivers.get(driverId).goOnline(); }

    boolean goOffline(String driverId) { return drivers.get(driverId).goOffline(); }

    // Location ping from a driver's phone. Moves the driver in the index, and adds the distance driven to the meter
    // when the driver has a passenger on board.
    void location(String driverId, Point p) {
        Driver d = drivers.get(driverId);
        d.setLocation(p);
        index.update(d);
        Trip t = tripByDriver.get(driverId);
        if (t == null) return;
        synchronized (t) {
            if (t.status == TripStatus.IN_PROGRESS && t.lastPoint != null) t.meteredKm += t.lastPoint.distanceTo(p);
            if (t.status == TripStatus.IN_PROGRESS) t.lastPoint = p;
        }
    }

    // ---------------------------------------------------------------- riders

    int availableNear(Point p, VehicleType type, double radiusKm) {
        int n = 0;
        for (Driver d : index.near(p, radiusKm)) if (d.status() == DriverStatus.AVAILABLE && d.vehicle == type) n++;
        return n;
    }

    // The price the rider is shown: distance as the crow flies and ten minutes per 5 km, at the current surge.
    FareBreakdown quote(Point pickup, Point dropoff, VehicleType type) {
        double km = pickup.distanceTo(dropoff);
        double surge = surgePolicy.multiplier(demand.recent(pickup, clock.nowMillis()), availableNear(pickup, type, 3));
        return fares.calculate(type, km, Math.round(km * 2), surge);
    }

    RideResult requestTrip(String riderId, Point pickup, Point dropoff, VehicleType type) {
        if (pickup.distanceTo(dropoff) < 0.1) return RideResult.of(RideCode.BAD_LOCATION);
        long now = clock.nowMillis();
        FareBreakdown quote = quote(pickup, dropoff, type);
        demand.record(pickup, now);
        Trip trip = new Trip("T" + nextId.getAndIncrement(), riderId, pickup, dropoff, type, quote.surge(), quote.totalCents(), now);
        trips.put(trip.id, trip);
        publish("REQUESTED", trip, "estimate " + trip.estimateCents + " surge " + trip.surge);
        synchronized (trip) {
            dispatchRound(trip);
        }
        return new RideResult(RideCode.OK, trip, trip.estimateCents);
    }

    // One round of offers. Caller holds the trip's lock.
    private void dispatchRound(Trip trip) {
        trip.round++;
        while (trip.status == TripStatus.REQUESTED) {
            List<Driver> candidates = new ArrayList<>();
            for (Driver d : index.near(trip.pickup, trip.radiusKm)) {
                if (d.status() == DriverStatus.AVAILABLE && d.vehicle == trip.type && !trip.declined.contains(d.id)) candidates.add(d);
            }
            candidates.sort(Comparator.comparingDouble((Driver d) -> d.location().distanceTo(trip.pickup)).thenComparing(d -> d.id));
            for (Driver d : candidates) {
                if (trip.offeredTo.size() >= OFFERS_PER_ROUND) break;
                if (d.tryOffer()) {
                    trip.offeredTo.add(d.id);
                    publish("OFFERED", trip, d.id);
                }
            }
            if (!trip.offeredTo.isEmpty()) {
                trip.offerExpiresAt = clock.nowMillis() + OFFER_MILLIS;
                return;
            }
            // Nobody to ask: look further, then give up after the last round.
            if (trip.radiusKm < 5) {
                trip.radiusKm = 5;
                continue;
            }
            if (trip.round >= MAX_ROUNDS) {
                trip.moveTo(TripStatus.NO_DRIVER, clock.nowMillis());
                publish("NO_DRIVER", trip, "");
            } else {
                trip.nextRoundAt = clock.nowMillis() + RETRY_MILLIS;
            }
            return;
        }
    }

    // The driver's answer. Exactly one accept wins: the check of the status and the assignment happen under the lock.
    RideResult answer(String tripId, String driverId, boolean accept) {
        Trip trip = trips.get(tripId);
        if (trip == null) return RideResult.of(RideCode.UNKNOWN_TRIP);
        Driver driver = drivers.get(driverId);
        if (driver == null) return RideResult.of(RideCode.UNKNOWN_DRIVER);
        synchronized (trip) {
            if (trip.status != TripStatus.REQUESTED) return RideResult.of(RideCode.WRONG_STATE);
            if (!trip.offeredTo.contains(driverId)) return RideResult.of(RideCode.NOT_OFFERED);
            if (clock.nowMillis() >= trip.offerExpiresAt) return RideResult.of(RideCode.OFFER_EXPIRED);
            if (!accept) {
                trip.offeredTo.remove(driverId);
                trip.declined.add(driverId);
                driver.release();
                publish("DECLINED", trip, driverId);
                if (trip.offeredTo.isEmpty()) dispatchRound(trip);
                return new RideResult(RideCode.OK, trip, 0);
            }
            if (!driver.startTrip()) return RideResult.of(RideCode.WRONG_STATE);
            for (String other : trip.offeredTo) {
                if (!other.equals(driverId)) drivers.get(other).release();   // the others were not chosen
            }
            trip.offeredTo.clear();
            trip.driverId = driverId;
            trip.assignedAt = clock.nowMillis();
            trip.moveTo(TripStatus.DRIVER_ASSIGNED, trip.assignedAt);
            tripByDriver.put(driverId, trip);
            publish("ASSIGNED", trip, driverId);
            return new RideResult(RideCode.OK, trip, 0);
        }
    }

    // Time passes: offers nobody answered are released and the next round starts.
    void tick() {
        long now = clock.nowMillis();
        for (Trip trip : trips.values()) {
            synchronized (trip) {
                if (trip.status == TripStatus.REQUESTED && !trip.offeredTo.isEmpty() && now >= trip.offerExpiresAt) {
                    for (String id : trip.offeredTo) {
                        drivers.get(id).release();
                        trip.declined.add(id);
                        publish("OFFER_EXPIRED", trip, id);
                    }
                    trip.offeredTo.clear();
                    dispatchRound(trip);
                } else if (trip.status == TripStatus.REQUESTED && trip.offeredTo.isEmpty() && now >= trip.nextRoundAt) {
                    dispatchRound(trip);   // nobody was free last time: look again
                }
            }
        }
    }

    // ---------------------------------------------------------------- the trip itself

    RideResult arrived(String tripId, String driverId) {
        return step(tripId, driverId, TripStatus.ARRIVED, t -> t.arrivedAt = clock.nowMillis());
    }

    RideResult start(String tripId, String driverId) {
        return step(tripId, driverId, TripStatus.IN_PROGRESS, t -> {
            t.startedAt = clock.nowMillis();
            t.lastPoint = t.pickup;
        });
    }

    private RideResult step(String tripId, String driverId, TripStatus next, java.util.function.Consumer<Trip> effect) {
        Trip trip = trips.get(tripId);
        if (trip == null) return RideResult.of(RideCode.UNKNOWN_TRIP);
        synchronized (trip) {
            if (!driverId.equals(trip.driverId)) return RideResult.of(RideCode.NOT_YOUR_TRIP);
            if (!trip.moveTo(next, clock.nowMillis())) return RideResult.of(RideCode.WRONG_STATE);
            effect.accept(trip);
            publish(next.name(), trip, driverId);
            return new RideResult(RideCode.OK, trip, 0);
        }
    }

    // The trip ends. The fare comes from what really happened: the distance on the meter and the time on board.
    RideResult end(String tripId, String driverId) {
        Trip trip = trips.get(tripId);
        if (trip == null) return RideResult.of(RideCode.UNKNOWN_TRIP);
        synchronized (trip) {
            if (!driverId.equals(trip.driverId)) return RideResult.of(RideCode.NOT_YOUR_TRIP);
            if (!trip.moveTo(TripStatus.COMPLETED, clock.nowMillis())) return RideResult.of(RideCode.WRONG_STATE);
            trip.endedAt = clock.nowMillis();
            long minutes = Math.max(1, (trip.endedAt - trip.startedAt + 59_999) / 60_000);
            FareBreakdown fare = fares.calculate(trip.type, Math.round(trip.meteredKm * 10) / 10.0, minutes, trip.surge);
            trip.fareCents = fare.totalCents();
            tripByDriver.remove(driverId);
            drivers.get(driverId).release();
            boolean paid = payments.charge(trip.riderId, trip.fareCents, trip.id);
            publish("COMPLETED", trip, "fare " + trip.fareCents);
            return new RideResult(paid ? RideCode.OK : RideCode.PAYMENT_FAILED, trip, trip.fareCents);
        }
    }

    // The rider cancels. Free while nobody is assigned and for two minutes after; then a fee, higher once the driver is
    // waiting at the pickup. The fee goes to the driver in a real system.
    RideResult cancelByRider(String tripId, String riderId) {
        Trip trip = trips.get(tripId);
        if (trip == null) return RideResult.of(RideCode.UNKNOWN_TRIP);
        if (!trip.riderId.equals(riderId)) return RideResult.of(RideCode.NOT_YOUR_TRIP);
        synchronized (trip) {
            TripStatus before = trip.status;
            if (!trip.moveTo(TripStatus.CANCELLED, clock.nowMillis())) return RideResult.of(RideCode.WRONG_STATE);
            int fee = 0;
            if (before == TripStatus.DRIVER_ASSIGNED && clock.nowMillis() - trip.assignedAt > FREE_CANCEL_SECONDS * 1000L) fee = LATE_CANCEL_FEE_CENTS;
            if (before == TripStatus.ARRIVED) fee = ARRIVED_CANCEL_FEE_CENTS;
            trip.cancelFeeCents = fee;
            if (fee > 0) payments.charge(riderId, fee, trip.id + "-fee");
            for (String id : trip.offeredTo) drivers.get(id).release();
            trip.offeredTo.clear();
            if (trip.driverId != null) {
                tripByDriver.remove(trip.driverId);
                drivers.get(trip.driverId).release();
            }
            publish("CANCELLED", trip, "fee " + fee);
            return new RideResult(RideCode.OK, trip, fee);
        }
    }

    // The driver cancels after accepting. The rider is not charged; the trip goes back to matching without that driver.
    RideResult cancelByDriver(String tripId, String driverId) {
        Trip trip = trips.get(tripId);
        if (trip == null) return RideResult.of(RideCode.UNKNOWN_TRIP);
        synchronized (trip) {
            if (!driverId.equals(trip.driverId)) return RideResult.of(RideCode.NOT_YOUR_TRIP);
            if (!trip.moveTo(TripStatus.REQUESTED, clock.nowMillis())) return RideResult.of(RideCode.WRONG_STATE);
            trip.declined.add(driverId);
            trip.driverId = null;
            tripByDriver.remove(driverId);
            drivers.get(driverId).release();
            publish("DRIVER_CANCELLED", trip, driverId);
            trip.round = 0;
            dispatchRound(trip);
            return new RideResult(RideCode.OK, trip, 0);
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
        List<String> charges = new ArrayList<>();
        RideService service = new RideService(new DemandSupplySurge(), (rider, cents, key) -> charges.add(key + ":" + cents), clock);
        List<String> events = new ArrayList<>();
        service.subscribe((type, trip, detail) -> events.add(type + " " + detail));

        String[] ids = {"d1", "d2", "d3", "d4"};
        double[][] spots = {{0.5, 0.5}, {1.0, 0.0}, {1.0, 1.0}, {8.0, 8.0}};
        List<Driver> fleet = new ArrayList<>();
        for (int i = 0; i < ids.length; i++) {
            Driver d = new Driver(ids[i], "Driver " + ids[i], VehicleType.ECONOMY, 4.5, new Point(spots[i][0], spots[i][1]));
            fleet.add(d);
            service.addDriver(d);
            service.goOnline(ids[i]);
        }

        Point pickup = new Point(0, 0);
        Point dropoff = new Point(6, 8);
        System.out.println("Quote, economy, 10 km: " + service.quote(pickup, dropoff, VehicleType.ECONOMY).totalCents() + " cents");
        System.out.println("Drivers within 3 km: " + service.availableNear(pickup, VehicleType.ECONOMY, 3) + ", cells read: " + service.index().lastCellsRead());

        RideResult r = service.requestTrip("asha", pickup, dropoff, VehicleType.ECONOMY);
        Trip trip = r.trip();
        System.out.println("Trip requested, status " + trip.status + ", offered to " + new java.util.TreeSet<>(trip.offeredTo));
        System.out.println("Nearest declines: " + service.answer(trip.id, "d1", false).code() + ", offers left " + trip.offeredTo.size());
        System.out.println("d2 accepts: " + service.answer(trip.id, "d2", true).code() + ", d3 answers late: " + service.answer(trip.id, "d3", true).code());
        System.out.println("Status " + trip.status + " with " + trip.driverId + ", d3 is " + fleet.get(2).status());

        service.arrived(trip.id, "d2");
        service.start(trip.id, "d2");
        clock.advanceMinutes(12);
        service.location("d2", new Point(3, 4));
        service.location("d2", new Point(6, 8));
        RideResult done = service.end(trip.id, "d2");
        System.out.println("Trip ended: metered " + String.format("%.1f", trip.meteredKm) + " km in 12 min, fare " + done.cents() + " cents, charges " + charges);

        RideResult second = service.requestTrip("ben", pickup, new Point(0, 4), VehicleType.ECONOMY);
        service.answer(second.trip().id, "d1", true);
        clock.advanceSeconds(60);
        RideResult free = service.cancelByRider(second.trip().id, "ben");
        System.out.println("Ben cancels after 60 s: fee " + free.cents());

        RideResult third = service.requestTrip("chen", pickup, new Point(0, 4), VehicleType.ECONOMY);
        service.answer(third.trip().id, "d1", true);
        clock.advanceSeconds(180);
        System.out.println("Chen cancels after 180 s: fee " + service.cancelByRider(third.trip().id, "chen").cents());

        RideResult fourth = service.requestTrip("dev", pickup, new Point(0, 4), VehicleType.ECONOMY);
        service.answer(fourth.trip().id, "d1", true);
        service.cancelByDriver(fourth.trip().id, "d1");
        System.out.println("Driver cancels: trip is " + fourth.trip().status + " again, offered to " + new java.util.TreeSet<>(fourth.trip().offeredTo));

        RideResult nobody = service.requestTrip("eva", new Point(50, 50), new Point(52, 52), VehicleType.XL);
        System.out.println("Nobody near, XL: " + nobody.trip().status + " after round " + nobody.trip().round);
        clock.advanceSeconds(10);
        service.tick();
        clock.advanceSeconds(10);
        service.tick();
        System.out.println("Twenty seconds and two more rounds later: " + nobody.trip().status + " after round " + nobody.trip().round);
        System.out.println("Events: " + events.subList(0, 5));
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static final Point ORIGIN = new Point(0, 0);
    private static final Point FAR = new Point(3, 4);   // 5 km from the origin

    private static final class World {
        final ManualClock clock = new ManualClock(0);
        final List<String> charges = new ArrayList<>();
        boolean paymentWorks = true;
        final List<String> events = new ArrayList<>();
        final RideService service;

        World(SurgePolicy surge) {
            service = new RideService(surge, (rider, cents, key) -> {
                charges.add(key + ":" + cents);
                return paymentWorks;
            }, clock);
            service.subscribe((type, trip, detail) -> events.add(type + " " + detail));
        }

        World() { this((requests, drivers) -> 1.0); }

        Driver driver(String id, double x, double y) { return driver(id, x, y, VehicleType.ECONOMY); }

        Driver driver(String id, double x, double y, VehicleType type) {
            Driver d = new Driver(id, id, type, 4.5, new Point(x, y));
            service.addDriver(d);
            service.goOnline(id);
            return d;
        }

        Trip request(String rider) { return service.requestTrip(rider, ORIGIN, FAR, VehicleType.ECONOMY).trip(); }
    }

    public static void main(String[] args) throws Exception {
        gridQueries();
        gridMatchesBruteForce();
        fares();
        surgeSteps();
        demandWindow();
        statusTable();
        offersAreNearestFirstAndLimited();
        filtersByTypeAndAvailability();
        firstAcceptWins();
        declinesAndExpiry();
        rounds();
        metering();
        surgeIsFixedAtRequestTime();
        cancellationFees();
        driverCancels();
        paymentFailureAndAuthorisation();
        oneTripManyAcceptingDrivers();
        manyTripsFewDrivers();
        concurrentMovesKeepTheGridConsistent();
        if (failures > 0) System.exit(1);
    }

    private static void gridQueries() {
        GridIndex g = new GridIndex();
        Driver a = new Driver("a", "a", VehicleType.ECONOMY, 4, new Point(0.5, 0.5));
        Driver b = new Driver("b", "b", VehicleType.ECONOMY, 4, new Point(-0.5, -0.5));
        Driver c = new Driver("c", "c", VehicleType.ECONOMY, 4, new Point(10, 10));
        g.update(a);
        g.update(b);
        g.update(c);
        Set<String> ids = new HashSet<>();
        for (Driver d : g.near(ORIGIN, 1.5)) ids.add(d.id);
        check(ids.equals(Set.of("a", "b")), "a query finds drivers on both sides of zero and skips the far one");
        check(g.lastCellsRead() == 25, "a 1.5 km radius reads 5 by 5 cells, not the whole fleet");
        a.setLocation(new Point(20, 20));
        g.update(a);
        check(g.near(ORIGIN, 1.5).size() == 1 && g.near(new Point(20, 20), 1).size() == 1, "a driver who moves leaves the old cell and joins the new one");
        g.remove(b);
        check(g.near(ORIGIN, 3).isEmpty(), "a removed driver is gone");
    }

    private static void gridMatchesBruteForce() {
        Random random = new Random(5);
        GridIndex g = new GridIndex();
        List<Driver> fleet = new ArrayList<>();
        for (int i = 0; i < 2000; i++) {
            Driver d = new Driver("d" + i, "d", VehicleType.ECONOMY, 4, new Point(random.nextDouble() * 40 - 20, random.nextDouble() * 40 - 20));
            fleet.add(d);
            g.update(d);
        }
        boolean same = true;
        for (int q = 0; q < 50; q++) {
            Point p = new Point(random.nextDouble() * 40 - 20, random.nextDouble() * 40 - 20);
            double radius = 0.5 + random.nextDouble() * 4;
            Set<String> viaGrid = new HashSet<>();
            for (Driver d : g.near(p, radius)) viaGrid.add(d.id);
            Set<String> brute = new HashSet<>();
            for (Driver d : fleet) if (d.location().distanceTo(p) <= radius) brute.add(d.id);
            same &= viaGrid.equals(brute);
        }
        check(same, "50 random queries over 2000 drivers give exactly the same drivers as checking all of them");
    }

    private static void fares() {
        FareCalculator f = new FareCalculator();
        FareBreakdown ten = f.calculate(VehicleType.ECONOMY, 10, 20, 1.0);
        check(ten.baseCents() == 3_000 && ten.distanceCents() == 12_000 && ten.timeCents() == 4_000 && ten.totalCents() == 19_000, "10 km and 20 minutes: base, distance and time add up");
        check(f.calculate(VehicleType.ECONOMY, 0.3, 1, 1.0).totalCents() == 5_000, "a tiny trip costs the minimum");
        check(f.calculate(VehicleType.ECONOMY, 10, 20, 1.5).totalCents() == 28_500, "surge multiplies the whole fare");
        check(f.calculate(VehicleType.PREMIUM, 10, 20, 1.0).totalCents() > ten.totalCents(), "premium costs more than economy");
        check(f.calculate(VehicleType.ECONOMY, 1.04, 3, 1.0).distanceCents() == 1_248, "distance cents are rounded, not cut");
    }

    private static void surgeSteps() {
        DemandSupplySurge s = new DemandSupplySurge();
        check(s.multiplier(0, 3) == 1.0 && s.multiplier(2, 2) == 1.0, "balanced demand and supply: no surge");
        check(s.multiplier(5, 3) == 1.25 && s.multiplier(9, 3) == 1.5 && s.multiplier(20, 3) == 2.0, "steps 1.25, 1.5 and 2.0 as demand grows");
        check(s.multiplier(4, 0) == 2.0, "no drivers at all is the highest step, and there is no division by zero");
    }

    private static void demandWindow() {
        DemandTracker t = new DemandTracker();
        t.record(ORIGIN, 0);
        t.record(new Point(1, 1), 60_000);
        t.record(new Point(100, 100), 60_000);
        check(t.recent(ORIGIN, 120_000) == 2, "two requests in the same area count together, a request elsewhere does not");
        check(t.recent(ORIGIN, DemandTracker.WINDOW_MILLIS) == 1, "a request exactly five minutes old has left the window");
        check(t.recent(ORIGIN, DemandTracker.WINDOW_MILLIS + 60_000) == 0, "and later ones leave too");
    }

    private static void statusTable() {
        check(TripStatus.REQUESTED.canMoveTo(TripStatus.DRIVER_ASSIGNED) && TripStatus.ARRIVED.canMoveTo(TripStatus.IN_PROGRESS), "the normal path is allowed");
        check(!TripStatus.IN_PROGRESS.canMoveTo(TripStatus.CANCELLED), "a trip in progress cannot be cancelled");
        check(TripStatus.DRIVER_ASSIGNED.canMoveTo(TripStatus.REQUESTED), "a driver cancelling sends the trip back to matching");
        check(TripStatus.COMPLETED.isFinal() && TripStatus.NO_DRIVER.isFinal() && !TripStatus.ARRIVED.isFinal(), "final states are final");
    }

    private static void offersAreNearestFirstAndLimited() {
        World w = new World();
        w.driver("a", 0.2, 0);
        w.driver("b", 0.4, 0);
        w.driver("c", 0.6, 0);
        w.driver("d", 0.8, 0);
        Trip t = w.request("r");
        check(new HashSet<>(t.offeredTo).equals(Set.of("a", "b", "c")), "the three nearest drivers are asked");
        check(w.service.answer(t.id, "d", true).code() == RideCode.NOT_OFFERED, "the fourth was not asked and cannot accept");
        check(w.service.answer("T99", "a", true).code() == RideCode.UNKNOWN_TRIP && w.service.answer(t.id, "zz", true).code() == RideCode.UNKNOWN_DRIVER, "unknown trip and unknown driver");
    }

    private static void filtersByTypeAndAvailability() {
        World w = new World();
        w.driver("premium", 0.1, 0, VehicleType.PREMIUM);
        Driver off = w.driver("off", 0.2, 0);
        off.goOffline();
        w.driver("far", 4.0, 0);
        Trip t = w.request("r");
        check(t.offeredTo.equals(Set.of("far")), "only an available driver of the right type is asked, and the radius widened to find him");
        check(w.service.availableNear(ORIGIN, VehicleType.ECONOMY, 3) == 0 && w.service.availableNear(ORIGIN, VehicleType.PREMIUM, 3) == 1, "availability is counted per vehicle type");
    }

    private static void firstAcceptWins() {
        World w = new World();
        Driver a = w.driver("a", 0.2, 0);
        Driver b = w.driver("b", 0.4, 0);
        Trip t = w.request("r");
        check(w.service.answer(t.id, "b", true).ok() && t.driverId.equals("b"), "the first to accept gets the trip");
        check(w.service.answer(t.id, "a", true).code() == RideCode.WRONG_STATE, "a later accept is refused");
        check(b.status() == DriverStatus.ON_TRIP && a.status() == DriverStatus.AVAILABLE, "the winner is on a trip and the other driver is free again");
        check(t.status == TripStatus.DRIVER_ASSIGNED && t.offeredTo.isEmpty(), "the trip has a driver and no open offers");
    }

    private static void declinesAndExpiry() {
        World w = new World();
        Driver a = w.driver("a", 0.2, 0);
        Driver b = w.driver("b", 0.4, 0);
        w.driver("c", 1.0, 0);
        w.driver("d", 1.2, 0);
        Trip t = w.request("r");
        w.service.answer(t.id, "a", false);
        check(t.offeredTo.size() == 2 && a.status() == DriverStatus.AVAILABLE, "a decline frees the driver and the other offers stay open");
        w.clock.advanceSeconds(14);
        w.service.tick();
        check(t.offeredTo.size() == 2, "before 15 seconds nothing expires");
        w.clock.advanceSeconds(1);
        check(w.service.answer(t.id, "b", true).code() == RideCode.OFFER_EXPIRED, "an answer at the deadline is too late");
        w.service.tick();
        check(b.status() == DriverStatus.AVAILABLE, "unanswered offers are released");
        check(new HashSet<>(t.offeredTo).equals(Set.of("d")), "the next round asks only the driver who has not been asked before");
        check(t.round == 2, "that was round two");
    }

    private static void rounds() {
        World w = new World();
        Trip t = w.request("r");
        check(t.status == TripStatus.REQUESTED && t.radiusKm == 5, "no drivers: the radius widens to 5 km and the trip waits");
        w.service.tick();
        check(t.round == 1, "a tick before the retry time does nothing");
        w.clock.advanceSeconds(10);
        w.service.tick();
        w.clock.advanceSeconds(10);
        w.service.tick();
        check(t.status == TripStatus.NO_DRIVER && t.round == 3, "after three rounds the trip ends as NO_DRIVER");
        check(w.service.answer(t.id, "x", true).code() != RideCode.OK, "nobody can accept it now");
    }

    private static void metering() {
        World w = new World();
        w.driver("a", 0.2, 0);
        Trip t = w.request("r");
        w.service.answer(t.id, "a", true);
        w.service.location("a", new Point(1, 0));
        w.service.location("a", new Point(2, 0));
        check(t.meteredKm == 0, "driving to the pickup is not metered");
        check(w.service.start(t.id, "a").code() == RideCode.WRONG_STATE, "cannot start before arriving");
        w.service.arrived(t.id, "a");
        w.service.start(t.id, "a");
        w.service.location("a", new Point(3, 0));
        w.service.location("a", new Point(3, 4));
        check(Math.abs(t.meteredKm - 7.0) < 1e-9, "after the start, every ping adds the distance driven: 3 km east, then 4 km north");
        w.clock.advanceSeconds(61);
        RideResult done = w.service.end(t.id, "a");
        check(done.cents() == 3_000 + 8_400 + 400, "7 km and 61 seconds (2 started minutes): base + distance + time");
        check(w.charges.equals(List.of("T1:" + done.cents())) && w.service.index() != null, "the rider was charged the fare once");
        check(w.service.end(t.id, "a").code() == RideCode.WRONG_STATE, "a trip ends once");
        w.service.location("a", new Point(9, 9));
        check(t.meteredKm == 7.0, "pings after the end are harmless and not metered");
    }

    private static void surgeIsFixedAtRequestTime() {
        World w = new World((requests, drivers) -> requests >= 1 ? 2.0 : 1.0);
        w.driver("a", 0.2, 0);
        Trip first = w.request("r1");
        check(first.surge == 1.0, "the first request sees no demand yet");
        w.service.answer(first.id, "a", true);
        Trip second = w.service.requestTrip("r2", ORIGIN, FAR, VehicleType.ECONOMY).trip();
        check(second.surge == 2.0 && second.estimateCents == 2 * first.estimateCents, "the second request pays double: demand is counted");
        w.service.cancelByRider(second.id, "r2");
        w.service.arrived(first.id, "a");
        w.service.start(first.id, "a");
        w.service.location("a", FAR);
        w.clock.advanceMinutes(10);
        check(w.service.end(first.id, "a").cents() == first.estimateCents, "the first rider is charged at their own surge even though it rose meanwhile");
    }

    private static void cancellationFees() {
        World w = new World();
        w.driver("a", 0.2, 0);
        Trip searching = w.service.requestTrip("r0", ORIGIN, FAR, VehicleType.XL).trip();
        check(w.service.cancelByRider(searching.id, "r0").cents() == 0, "cancelling while nobody is assigned is free");

        Trip t1 = w.request("r1");
        w.service.answer(t1.id, "a", true);
        w.clock.advanceSeconds(120);
        check(w.service.cancelByRider(t1.id, "r1").cents() == 0, "within two minutes of the assignment it is free");

        Trip t2 = w.request("r2");
        w.service.answer(t2.id, "a", true);
        w.clock.advanceSeconds(121);
        RideResult late = w.service.cancelByRider(t2.id, "r2");
        check(late.cents() == 500 && w.charges.contains(t2.id + "-fee:500"), "later than that it costs 5.00, charged under its own key");

        Trip t3 = w.request("r3");
        w.service.answer(t3.id, "a", true);
        w.service.arrived(t3.id, "a");
        check(w.service.cancelByRider(t3.id, "r3").cents() == 1_000, "after the driver has arrived it costs 10.00");

        Trip t4 = w.request("r4");
        w.service.answer(t4.id, "a", true);
        w.service.arrived(t4.id, "a");
        w.service.start(t4.id, "a");
        check(w.service.cancelByRider(t4.id, "r4").code() == RideCode.WRONG_STATE, "no cancelling during the ride");
        check(w.service.cancelByRider(t4.id, "someone else").code() == RideCode.NOT_YOUR_TRIP, "only the rider can cancel");
    }

    private static void driverCancels() {
        World w = new World();
        Driver a = w.driver("a", 0.2, 0);
        Driver b = w.driver("b", 0.5, 0);
        Trip t = w.request("r");
        w.service.answer(t.id, "a", true);
        w.service.cancelByDriver(t.id, "a");
        check(t.status == TripStatus.REQUESTED && t.driverId == null && w.charges.isEmpty(), "the trip goes back to matching and the rider pays nothing");
        check(t.offeredTo.equals(Set.of("b")) && a.status() == DriverStatus.AVAILABLE, "the cancelling driver is not asked again, and is free");
        check(w.service.answer(t.id, "b", true).ok(), "another driver takes the trip");
        check(b.status() == DriverStatus.ON_TRIP, "and is on it");
    }

    private static void paymentFailureAndAuthorisation() {
        World w = new World();
        Driver a = w.driver("a", 0.2, 0);
        Trip t = w.request("r");
        w.service.answer(t.id, "a", true);
        check(w.service.arrived(t.id, "intruder").code() == RideCode.NOT_YOUR_TRIP, "only the assigned driver can report arrival");
        w.service.arrived(t.id, "a");
        w.service.start(t.id, "a");
        w.paymentWorks = false;
        RideResult end = w.service.end(t.id, "a");
        check(end.code() == RideCode.PAYMENT_FAILED && t.status == TripStatus.COMPLETED && a.status() == DriverStatus.AVAILABLE, "a failed payment is reported, but the trip is done and the driver is free");
        check(w.service.arrived("T99", "a").code() == RideCode.UNKNOWN_TRIP, "unknown trip");
        check(w.service.requestTrip("r", ORIGIN, new Point(0.01, 0), VehicleType.ECONOMY).code() == RideCode.BAD_LOCATION, "pickup and drop-off at the same place");
    }

    private static void oneTripManyAcceptingDrivers() throws InterruptedException {
        World w = new World();
        for (int i = 0; i < 3; i++) w.driver("d" + i, 0.1 * (i + 1), 0);
        Trip t = w.request("r");
        AtomicInteger winners = new AtomicInteger();
        Thread[] threads = new Thread[3];
        for (int i = 0; i < 3; i++) {
            final String id = "d" + i;
            threads[i] = new Thread(() -> {
                if (w.service.answer(t.id, id, true).ok()) winners.incrementAndGet();
            });
        }
        for (Thread th : threads) th.start();
        for (Thread th : threads) th.join();
        check(winners.get() == 1, "three drivers accepting the same trip at once: exactly one wins");
        long onTrip = java.util.stream.IntStream.range(0, 3).filter(i -> w.service.index().near(ORIGIN, 5).stream().anyMatch(d -> d.id.equals("d" + i) && d.status() == DriverStatus.ON_TRIP)).count();
        check(onTrip == 1, "and exactly one driver is on a trip");
    }

    private static void manyTripsFewDrivers() throws InterruptedException {
        World w = new World();
        for (int i = 0; i < 3; i++) w.driver("d" + i, 0.1 * (i + 1), 0);
        Thread[] threads = new Thread[30];
        List<Trip> trips = new java.util.concurrent.CopyOnWriteArrayList<>();
        for (int i = 0; i < threads.length; i++) {
            final String rider = "r" + i;
            threads[i] = new Thread(() -> trips.add(w.request(rider)));
        }
        for (Thread th : threads) th.start();
        for (Thread th : threads) th.join();
        Set<String> seen = new HashSet<>();
        boolean twice = false;
        for (Trip t : trips) {
            synchronized (t) {
                for (String id : t.offeredTo) twice |= !seen.add(id);
            }
        }
        check(!twice && seen.size() == 3, "30 trips asked at once for 3 drivers: every driver is offered to exactly one trip");
    }

    private static void concurrentMovesKeepTheGridConsistent() throws InterruptedException {
        World w = new World();
        int n = 100;
        for (int i = 0; i < n; i++) w.driver("m" + i, i % 10, i / 10);
        Thread[] threads = new Thread[8];
        for (int t = 0; t < threads.length; t++) {
            final int seed = t;
            threads[t] = new Thread(() -> {
                Random random = new Random(seed);
                for (int k = 0; k < 400; k++) {
                    int id = random.nextInt(n);
                    w.service.location("m" + id, new Point(random.nextDouble() * 12, random.nextDouble() * 12));
                    w.service.availableNear(new Point(6, 6), VehicleType.ECONOMY, 3);
                }
            });
        }
        for (Thread th : threads) th.start();
        for (Thread th : threads) th.join();
        check(w.service.index().near(new Point(6, 6), 20).size() == n, "after 3200 concurrent moves and queries every driver is in the index exactly once");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Quote, economy, 10 km: 19000 cents",
      "Drivers within 3 km: 3, cells read: 49",
      "Trip requested, status REQUESTED, offered to [d1, d2, d3]",
      "Nearest declines: OK, offers left 2",
      "d2 accepts: OK, d3 answers late: WRONG_STATE",
      "Status DRIVER_ASSIGNED with d2, d3 is AVAILABLE",
      "Trip ended: metered 10.0 km in 12 min, fare 17400 cents, charges [T1:17400]",
      "Ben cancels after 60 s: fee 0",
      "Chen cancels after 180 s: fee 500",
      "Driver cancels: trip is REQUESTED again, offered to [d3]",
      "Nobody near, XL: REQUESTED after round 1",
      "Twenty seconds and two more rounds later: NO_DRIVER after round 3",
      "Events: [REQUESTED estimate 19000 surge 1.0, OFFERED d1, OFFERED d2, OFFERED d3, DECLINED d1]",
    ],
  },
};
