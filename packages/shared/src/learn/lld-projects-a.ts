import type { LldDeep, LldProject } from "./types";

// Full Java projects for LLD problems (plan 0013, batch A): parking lot, elevator, vending machine / ATM.
// Java 17, standard library only, default package, one top-level type per file. apps/web/lib/lld-projects.test.ts
// compiles every project, runs Main and Tests, and checks that Main prints every line of expectedOutput.

export const LLD_PROJECTS_A: Record<string, LldProject> = {
  "lldp-parking-lot": {
    files: [
      {
        name: "VehicleType.java",
        code: `enum VehicleType { BIKE, CAR, TRUCK }
`,
      },
      {
        name: "SpotSize.java",
        code: `enum SpotSize { SMALL, MEDIUM, LARGE }
`,
      },
      {
        name: "Vehicle.java",
        code: `// Immutable value object. Equality by plate and type comes for free from the record.
record Vehicle(String plate, VehicleType type) {
    // The smallest spot this vehicle fits in. A bigger spot also works; a smaller one never does.
    SpotSize minSize() {
        return switch (type) {
            case BIKE -> SpotSize.SMALL;
            case CAR -> SpotSize.MEDIUM;
            case TRUCK -> SpotSize.LARGE;
        };
    }
}
`,
      },
      {
        name: "Spot.java",
        code: `// One parking spot. The only mutable state is who is parked here, and it is guarded by the spot's own lock,
// so two gates racing for the same spot are decided by tryPark: exactly one of them wins.
final class Spot {
    private final String id;
    private final int floor;
    private final SpotSize size;
    private Vehicle parked; // guarded by "this"

    Spot(int floor, SpotSize size, int index) {
        this.floor = floor;
        this.size = size;
        this.id = "F" + floor + "-" + size.name().charAt(0) + index;
    }

    String id() { return id; }
    int floor() { return floor; }
    SpotSize size() { return size; }

    synchronized boolean isFree() { return parked == null; }

    synchronized boolean tryPark(Vehicle vehicle) {
        if (parked != null) return false;
        parked = vehicle;
        return true;
    }

    synchronized void release() { parked = null; }
}
`,
      },
      {
        name: "Ticket.java",
        code: `import java.time.Instant;

record Ticket(String id, Vehicle vehicle, Spot spot, Instant entry) { }
`,
      },
      {
        name: "LotFullException.java",
        code: `class LotFullException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    LotFullException(VehicleType type) {
        super("No free spot for " + type);
    }
}
`,
      },
      {
        name: "InvalidTicketException.java",
        code: `class InvalidTicketException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    InvalidTicketException(String ticketId) {
        super("Unknown or already used ticket: " + ticketId);
    }
}
`,
      },
      {
        name: "SpotAllocationStrategy.java",
        code: `import java.util.List;

// Strategy: how to pick a spot. It returns the candidates in order of preference; the lot tries them one by one
// because another gate may take a candidate between "look" and "park".
interface SpotAllocationStrategy {
    List<Spot> candidates(List<Spot> spots, Vehicle vehicle);
}
`,
      },
      {
        name: "NearestSpotStrategy.java",
        code: `import java.util.Comparator;
import java.util.List;

// Smallest spot that fits (do not waste a large spot on a bike), then the lowest floor, then by id.
final class NearestSpotStrategy implements SpotAllocationStrategy {
    @Override
    public List<Spot> candidates(List<Spot> spots, Vehicle vehicle) {
        SpotSize need = vehicle.minSize();
        return spots.stream()
                .filter(s -> s.isFree() && s.size().ordinal() >= need.ordinal())
                .sorted(Comparator.comparingInt((Spot s) -> s.size().ordinal())
                        .thenComparingInt(Spot::floor)
                        .thenComparing(Spot::id))
                .toList();
    }
}
`,
      },
      {
        name: "PricingStrategy.java",
        code: `import java.time.Instant;

// Strategy: how much a stay costs. Money is a long in the smallest unit (cents), never a double.
interface PricingStrategy {
    long fee(Ticket ticket, Instant exit);
}
`,
      },
      {
        name: "HourlyPricing.java",
        code: `import java.time.Duration;
import java.time.Instant;
import java.util.Map;

// Every started hour is charged in full, with a minimum of one hour.
final class HourlyPricing implements PricingStrategy {
    private final Map<VehicleType, Long> centsPerHour;

    HourlyPricing(Map<VehicleType, Long> centsPerHour) {
        this.centsPerHour = Map.copyOf(centsPerHour);
    }

    @Override
    public long fee(Ticket ticket, Instant exit) {
        long minutes = Duration.between(ticket.entry(), exit).toMinutes();
        long hours = Math.max(1, (minutes + 59) / 60);
        return hours * centsPerHour.get(ticket.vehicle().type());
    }
}
`,
      },
      {
        name: "DailyCapPricing.java",
        code: `import java.time.Duration;
import java.time.Instant;

// Decorator: wraps any pricing rule and never charges more than capPerDay for each started 24 hours.
final class DailyCapPricing implements PricingStrategy {
    private final PricingStrategy inner;
    private final long capPerDay;

    DailyCapPricing(PricingStrategy inner, long capPerDay) {
        this.inner = inner;
        this.capPerDay = capPerDay;
    }

    @Override
    public long fee(Ticket ticket, Instant exit) {
        long minutes = Duration.between(ticket.entry(), exit).toMinutes();
        long days = Math.max(1, (minutes + 1439) / 1440);
        return Math.min(inner.fee(ticket, exit), days * capPerDay);
    }
}
`,
      },
      {
        name: "MutableClock.java",
        code: `import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

// A clock you can move by hand, so tests and demos do not depend on real time.
final class MutableClock extends Clock {
    private volatile Instant now;

    MutableClock(Instant start) { this.now = start; }

    void advance(Duration d) { now = now.plus(d); }

    @Override public Instant instant() { return now; }
    @Override public ZoneId getZone() { return ZoneOffset.UTC; }
    @Override public Clock withZone(ZoneId zone) { return this; }
}
`,
      },
      {
        name: "OccupancyListener.java",
        code: `import java.util.Map;

// Observer: anything that wants to know when free spot counts change (display boards, dashboards).
interface OccupancyListener {
    void onChange(Map<SpotSize, Long> freeBySize);
}
`,
      },
      {
        name: "DisplayBoard.java",
        code: `import java.util.Map;

final class DisplayBoard implements OccupancyListener {
    private volatile Map<SpotSize, Long> latest = Map.of();

    @Override
    public void onChange(Map<SpotSize, Long> freeBySize) { latest = freeBySize; }

    String text() {
        StringBuilder sb = new StringBuilder();
        for (SpotSize size : SpotSize.values()) {
            if (sb.length() > 0) sb.append(' ');
            sb.append(size).append('=').append(latest.getOrDefault(size, 0L));
        }
        return sb.toString();
    }
}
`,
      },
      {
        name: "ParkingLot.java",
        code: `import java.time.Clock;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

// The facade. It owns the rules of entry and exit; spots, pricing and allocation are injected.
// Thread safety: no global lock. A spot decides races itself (Spot.tryPark), tickets live in a concurrent map,
// and active.remove is atomic, so a ticket can be redeemed only once even if two gates scan it at the same time.
final class ParkingLot {
    private final List<Spot> spots;
    private final SpotAllocationStrategy allocation;
    private final PricingStrategy pricing;
    private final Clock clock;
    private final Map<String, Ticket> active = new ConcurrentHashMap<>();
    private final Set<String> platesInside = ConcurrentHashMap.newKeySet();
    private final List<OccupancyListener> listeners = new CopyOnWriteArrayList<>();
    private final AtomicLong sequence = new AtomicLong();

    ParkingLot(List<Spot> spots, SpotAllocationStrategy allocation, PricingStrategy pricing, Clock clock) {
        this.spots = List.copyOf(spots);
        this.allocation = allocation;
        this.pricing = pricing;
        this.clock = clock;
    }

    void addListener(OccupancyListener listener) { listeners.add(listener); }

    Ticket enter(Vehicle vehicle) {
        if (!platesInside.add(vehicle.plate())) {
            throw new IllegalStateException("Vehicle already inside: " + vehicle.plate());
        }
        Ticket ticket = null;
        try {
            ticket = park(vehicle);
        } finally {
            if (ticket == null) platesInside.remove(vehicle.plate()); // failed: let the vehicle try again later
        }
        notifyListeners();
        return ticket;
    }

    private Ticket park(Vehicle vehicle) {
        for (Spot spot : allocation.candidates(spots, vehicle)) {
            if (spot.tryPark(vehicle)) {
                Ticket ticket = new Ticket("T-" + sequence.incrementAndGet(), vehicle, spot, clock.instant());
                active.put(ticket.id(), ticket);
                return ticket;
            }
        }
        throw new LotFullException(vehicle.type());
    }

    // Returns the fee. The ticket is consumed even if pricing throws, so a bad rule cannot trap a car forever.
    long exit(String ticketId) {
        Ticket ticket = active.remove(ticketId);
        if (ticket == null) throw new InvalidTicketException(ticketId);
        try {
            return pricing.fee(ticket, clock.instant());
        } finally {
            ticket.spot().release();
            platesInside.remove(ticket.vehicle().plate());
            notifyListeners();
        }
    }

    Map<SpotSize, Long> freeCounts() {
        Map<SpotSize, Long> counts = new EnumMap<>(SpotSize.class);
        for (SpotSize size : SpotSize.values()) counts.put(size, 0L);
        for (Spot spot : spots) {
            if (spot.isFree()) counts.merge(spot.size(), 1L, Long::sum);
        }
        return counts;
    }

    private void notifyListeners() {
        Map<SpotSize, Long> free = freeCounts();
        for (OccupancyListener listener : listeners) listener.onChange(free);
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public class Main {
    public static void main(String[] args) {
        // Two floors; per floor the number of small, medium and large spots.
        int[][] layout = {{2, 2, 1}, {1, 3, 1}};
        List<Spot> spots = new ArrayList<>();
        for (int floor = 0; floor < layout.length; floor++) {
            for (SpotSize size : SpotSize.values()) {
                for (int i = 0; i < layout[floor][size.ordinal()]; i++) spots.add(new Spot(floor, size, i));
            }
        }

        Map<VehicleType, Long> rates = new EnumMap<>(VehicleType.class);
        rates.put(VehicleType.BIKE, 10L);
        rates.put(VehicleType.CAR, 20L);
        rates.put(VehicleType.TRUCK, 50L);

        MutableClock clock = new MutableClock(Instant.parse("2024-03-01T08:00:00Z"));
        ParkingLot lot = new ParkingLot(spots, new NearestSpotStrategy(), new HourlyPricing(rates), clock);
        DisplayBoard board = new DisplayBoard();
        lot.addListener(board);

        System.out.println("Free: " + lot.freeCounts());
        Ticket car = lot.enter(new Vehicle("KA01AB1234", VehicleType.CAR));
        Ticket bike = lot.enter(new Vehicle("KA02ZZ0001", VehicleType.BIKE));
        Ticket truck = lot.enter(new Vehicle("MH12XY9999", VehicleType.TRUCK));
        for (Ticket t : List.of(car, bike, truck)) {
            System.out.println("Ticket " + t.id() + ": " + t.vehicle().type() + " " + t.vehicle().plate() + " -> " + t.spot().id());
        }
        System.out.println("Free: " + lot.freeCounts());

        clock.advance(Duration.ofMinutes(150));
        long fee = lot.exit(car.id());
        System.out.println("Exit " + car.vehicle().plate() + " after 150 min: fee " + fee);

        try {
            lot.enter(new Vehicle("KA02ZZ0001", VehicleType.BIKE));
        } catch (IllegalStateException e) {
            System.out.println("Rejected: " + e.getMessage());
        }

        Ticket second = lot.enter(new Vehicle("GJ05TR0002", VehicleType.TRUCK));
        System.out.println("Ticket " + second.id() + ": TRUCK GJ05TR0002 -> " + second.spot().id());
        try {
            lot.enter(new Vehicle("RJ14TR0003", VehicleType.TRUCK));
        } catch (LotFullException e) {
            System.out.println("Rejected: " + e.getMessage());
        }
        System.out.println("Board: " + board.text());
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

// Plain self-checking tests: no JUnit needed. Exit code 1 if anything fails.
public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static List<Spot> spots(int small, int medium, int large) {
        List<Spot> list = new ArrayList<>();
        for (int i = 0; i < small; i++) list.add(new Spot(0, SpotSize.SMALL, i));
        for (int i = 0; i < medium; i++) list.add(new Spot(0, SpotSize.MEDIUM, i));
        for (int i = 0; i < large; i++) list.add(new Spot(0, SpotSize.LARGE, i));
        return list;
    }

    private static MutableClock clock() { return new MutableClock(Instant.parse("2024-01-01T08:00:00Z")); }

    private static PricingStrategy hourly() {
        return new HourlyPricing(Map.of(VehicleType.BIKE, 10L, VehicleType.CAR, 20L, VehicleType.TRUCK, 50L));
    }

    private static ParkingLot lot(List<Spot> spots, MutableClock clock) {
        return new ParkingLot(spots, new NearestSpotStrategy(), hourly(), clock);
    }

    public static void main(String[] args) throws Exception {
        smallestFittingSpotWins();
        fullLotRejectsTheNextVehicle();
        feeRoundsUpToWholeHours();
        dailyCapLimitsTheFee();
        sameVehicleCannotEnterTwice();
        ticketCanOnlyBeUsedOnce();
        concurrentEntriesNeverOverbook();
        if (failures > 0) System.exit(1);
    }

    private static void smallestFittingSpotWins() {
        ParkingLot lot = lot(spots(1, 1, 1), clock());
        Ticket car = lot.enter(new Vehicle("C1", VehicleType.CAR));
        check(car.spot().size() == SpotSize.MEDIUM, "a car takes the medium spot, not the large one");
        Ticket bike = lot.enter(new Vehicle("B1", VehicleType.BIKE));
        check(bike.spot().size() == SpotSize.SMALL, "a bike takes the small spot");
    }

    private static void fullLotRejectsTheNextVehicle() {
        ParkingLot lot = lot(spots(0, 0, 1), clock());
        lot.enter(new Vehicle("T1", VehicleType.TRUCK));
        boolean full = false;
        try {
            lot.enter(new Vehicle("T2", VehicleType.TRUCK));
        } catch (LotFullException e) {
            full = true;
        }
        check(full, "a second truck is rejected when the only large spot is taken");
    }

    private static void feeRoundsUpToWholeHours() {
        MutableClock clock = clock();
        ParkingLot lot = lot(spots(0, 3, 0), clock);
        Ticket a = lot.enter(new Vehicle("A", VehicleType.CAR));
        Ticket b = lot.enter(new Vehicle("B", VehicleType.CAR));
        Ticket c = lot.enter(new Vehicle("C", VehicleType.CAR));
        check(lot.exit(c.id()) == 20L, "0 minutes is charged as one hour");
        clock.advance(Duration.ofMinutes(60));
        check(lot.exit(b.id()) == 20L, "exactly 60 minutes is one hour");
        clock.advance(Duration.ofMinutes(1));
        check(lot.exit(a.id()) == 40L, "61 minutes is two hours");
    }

    private static void dailyCapLimitsTheFee() {
        MutableClock clock = clock();
        ParkingLot lot = new ParkingLot(spots(0, 1, 0), new NearestSpotStrategy(), new DailyCapPricing(hourly(), 100L), clock);
        Ticket t = lot.enter(new Vehicle("A", VehicleType.CAR));
        clock.advance(Duration.ofHours(30));
        check(lot.exit(t.id()) == 200L, "30 hours is capped at two days of the daily cap");
    }

    private static void sameVehicleCannotEnterTwice() {
        ParkingLot lot = lot(spots(0, 2, 0), clock());
        lot.enter(new Vehicle("A", VehicleType.CAR));
        boolean rejected = false;
        try {
            lot.enter(new Vehicle("A", VehicleType.CAR));
        } catch (IllegalStateException e) {
            rejected = true;
        }
        check(rejected, "a plate that is already inside cannot enter again");
    }

    private static void ticketCanOnlyBeUsedOnce() {
        ParkingLot lot = lot(spots(0, 1, 0), clock());
        Ticket t = lot.enter(new Vehicle("A", VehicleType.CAR));
        lot.exit(t.id());
        boolean rejected = false;
        try {
            lot.exit(t.id());
        } catch (InvalidTicketException e) {
            rejected = true;
        }
        check(rejected, "a ticket cannot be redeemed twice");
        check(lot.freeCounts().get(SpotSize.MEDIUM) == 1L, "the spot is free again after exit");
    }

    private static void concurrentEntriesNeverOverbook() throws Exception {
        ParkingLot lot = lot(spots(0, 20, 0), clock());
        ExecutorService pool = Executors.newFixedThreadPool(8);
        AtomicInteger parked = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            final int n = i;
            futures.add(pool.submit(() -> {
                try {
                    lot.enter(new Vehicle("CAR-" + n, VehicleType.CAR));
                    parked.incrementAndGet();
                } catch (LotFullException ignored) {
                    // expected for the cars that arrive after the lot is full
                }
            }));
        }
        for (Future<?> f : futures) f.get();
        pool.shutdown();
        check(parked.get() == 20, "100 cars racing for 20 spots: exactly 20 get one");
        check(lot.freeCounts().get(SpotSize.MEDIUM) == 0L, "no free spot is left over");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Free: {SMALL=3, MEDIUM=5, LARGE=2}",
      "Ticket T-1: CAR KA01AB1234 -> F0-M0",
      "Ticket T-2: BIKE KA02ZZ0001 -> F0-S0",
      "Ticket T-3: TRUCK MH12XY9999 -> F0-L0",
      "Free: {SMALL=2, MEDIUM=4, LARGE=1}",
      "Exit KA01AB1234 after 150 min: fee 60",
      "Rejected: Vehicle already inside: KA02ZZ0001",
      "Ticket T-4: TRUCK GJ05TR0002 -> F1-L0",
      "Rejected: No free spot for TRUCK",
      "Board: SMALL=2 MEDIUM=5 LARGE=0",
    ],
  },
  "lldp-elevator": {
    files: [
      {
        name: "Direction.java",
        code: `enum Direction { UP, DOWN, IDLE }
`,
      },
      {
        name: "CarState.java",
        code: `enum CarState { IDLE, MOVING, DOORS_OPEN }
`,
      },
      {
        name: "HallCall.java",
        code: `// A press of the up or down button on a floor.
record HallCall(int floor, Direction direction) { }
`,
      },
      {
        name: "ElevatorCar.java",
        code: `import java.util.TreeSet;
import java.util.function.Consumer;

// One car. It keeps a sorted set of floors to stop at and moves one floor per tick (LOOK / SCAN style): keep
// going in the current direction while there is a stop ahead, reverse only when nothing is left ahead.
// Not thread safe on its own: ElevatorSystem serialises every call.
final class ElevatorCar {
    private final String id;
    private final int capacityKg;
    private final Consumer<String> log;
    private final TreeSet<Integer> stops = new TreeSet<>();
    private int floor;
    private Direction direction = Direction.IDLE;
    private CarState state = CarState.IDLE;
    private int loadKg;
    private boolean outOfService;

    ElevatorCar(String id, int startFloor, int capacityKg, Consumer<String> log) {
        this.id = id;
        this.floor = startFloor;
        this.capacityKg = capacityKg;
        this.log = log;
    }

    String id() { return id; }
    int floor() { return floor; }
    Direction direction() { return direction; }
    CarState state() { return state; }
    int pendingStops() { return stops.size(); }
    boolean outOfService() { return outOfService; }
    boolean isIdle() { return state == CarState.IDLE && stops.isEmpty(); }

    void addStop(int target) { stops.add(target); }
    void setLoad(int kg) { loadKg = kg; }
    void setOutOfService(boolean value) { outOfService = value; }

    // One tick of simulated time.
    void step() {
        if (state == CarState.DOORS_OPEN) {
            if (loadKg > capacityKg) {
                log.accept("Car " + id + ": overloaded (" + loadKg + " kg > " + capacityKg + " kg), doors stay open");
                return;
            }
            state = CarState.IDLE; // doors close
            return;
        }
        if (stops.remove(floor)) { // we are at a requested floor
            state = CarState.DOORS_OPEN;
            log.accept("Car " + id + ": doors open at floor " + floor);
            return;
        }
        direction = nextDirection();
        if (direction == Direction.IDLE) {
            state = CarState.IDLE;
            return;
        }
        floor += direction == Direction.UP ? 1 : -1;
        state = CarState.MOVING;
    }

    private Direction nextDirection() {
        Integer above = stops.higher(floor);
        Integer below = stops.lower(floor);
        if (direction == Direction.UP && above != null) return Direction.UP;
        if (direction == Direction.DOWN && below != null) return Direction.DOWN;
        if (above != null && below == null) return Direction.UP;
        if (below != null && above == null) return Direction.DOWN;
        if (above != null) { // both sides have stops and we have no direction to keep: go to the nearer one
            return (above - floor) <= (floor - below) ? Direction.UP : Direction.DOWN;
        }
        return Direction.IDLE;
    }
}
`,
      },
      {
        name: "DispatchStrategy.java",
        code: `import java.util.List;

// Strategy: which car answers a hall call. Returns null when no car is in service.
interface DispatchStrategy {
    ElevatorCar choose(List<ElevatorCar> cars, HallCall call);
}
`,
      },
      {
        name: "NearestCarStrategy.java",
        code: `import java.util.List;

// Cost = distance to the call + a penalty per stop the car already has + a penalty for a car that is currently
// heading the other way. Lowest cost wins; ties go to the first car in the list.
final class NearestCarStrategy implements DispatchStrategy {
    @Override
    public ElevatorCar choose(List<ElevatorCar> cars, HallCall call) {
        ElevatorCar best = null;
        int bestCost = Integer.MAX_VALUE;
        for (ElevatorCar car : cars) {
            if (car.outOfService()) continue;
            int cost = Math.abs(car.floor() - call.floor()) + 2 * car.pendingStops();
            if (car.direction() != Direction.IDLE && car.direction() != call.direction()) cost += 4;
            if (cost < bestCost) {
                best = car;
                bestCost = cost;
            }
        }
        return best;
    }
}
`,
      },
      {
        name: "ElevatorSystem.java",
        code: `import java.util.List;

// The controller. Every public method is synchronized, so button presses from many threads and the clock thread
// that calls tick() never see a half-updated car. One lock is fine: the work inside is tiny.
final class ElevatorSystem {
    private final int floors;
    private final List<ElevatorCar> cars;
    private final DispatchStrategy strategy;

    ElevatorSystem(int floors, List<ElevatorCar> cars, DispatchStrategy strategy) {
        this.floors = floors;
        this.cars = List.copyOf(cars);
        this.strategy = strategy;
    }

    // Returns the id of the car that will come.
    synchronized String requestHall(HallCall call) {
        checkFloor(call.floor());
        ElevatorCar car = strategy.choose(cars, call);
        if (car == null) throw new IllegalStateException("No car in service");
        car.addStop(call.floor());
        return car.id();
    }

    // A passenger inside a car presses a floor button.
    synchronized void selectFloor(String carId, int floor) {
        checkFloor(floor);
        find(carId).addStop(floor);
    }

    synchronized void tick() {
        for (ElevatorCar car : cars) car.step();
    }

    synchronized boolean allIdle() {
        for (ElevatorCar car : cars) {
            if (!car.isIdle()) return false;
        }
        return true;
    }

    synchronized void setLoad(String carId, int kg) { find(carId).setLoad(kg); }

    synchronized void setOutOfService(String carId, boolean value) { find(carId).setOutOfService(value); }

    synchronized String describe(String carId) {
        ElevatorCar car = find(carId);
        return "Car " + car.id() + " at floor " + car.floor() + " is " + car.state();
    }

    private ElevatorCar find(String carId) {
        for (ElevatorCar car : cars) {
            if (car.id().equals(carId)) return car;
        }
        throw new IllegalArgumentException("No such car: " + carId);
    }

    private void checkFloor(int floor) {
        if (floor < 0 || floor >= floors) throw new IllegalArgumentException("No such floor: " + floor);
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.List;
import java.util.function.Consumer;

public class Main {
    public static void main(String[] args) {
        Consumer<String> log = System.out::println;
        ElevatorSystem system = new ElevatorSystem(10,
                List.of(new ElevatorCar("A", 0, 600, log), new ElevatorCar("B", 9, 600, log)),
                new NearestCarStrategy());

        System.out.println("Hall call 3 UP -> Car " + system.requestHall(new HallCall(3, Direction.UP)));
        System.out.println("Hall call 8 DOWN -> Car " + system.requestHall(new HallCall(8, Direction.DOWN)));
        system.selectFloor("A", 7); // the passenger who boarded car A at floor 3 wants floor 7

        int ticks = 0;
        while (!system.allIdle() && ticks < 100) {
            system.tick();
            ticks++;
        }
        System.out.println("All cars idle after " + ticks + " ticks");

        // Car A is now at floor 7. Someone presses 7 again while the car is overloaded.
        system.setLoad("A", 800);
        system.selectFloor("A", 7);
        system.tick(); // doors open
        system.tick(); // overloaded: the doors must stay open
        system.setLoad("A", 300);
        system.tick(); // doors close
        System.out.println(system.describe("A"));
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
import java.util.function.Consumer;

public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static ElevatorSystem system(Consumer<String> log, int... startFloors) {
        List<ElevatorCar> cars = new ArrayList<>();
        for (int i = 0; i < startFloors.length; i++) {
            cars.add(new ElevatorCar(String.valueOf((char) ('A' + i)), startFloors[i], 600, log));
        }
        return new ElevatorSystem(10, cars, new NearestCarStrategy());
    }

    private static void runUntilIdle(ElevatorSystem system) {
        int guard = 0;
        while (!system.allIdle() && guard++ < 200) system.tick();
    }

    public static void main(String[] args) {
        nearestIdleCarGetsTheCall();
        stopsAreServedInSweepOrder();
        carServesTheNearerSideFirstThenReverses();
        carOutOfServiceIsSkipped();
        invalidFloorIsRejected();
        overloadKeepsTheDoorsOpen();
        if (failures > 0) System.exit(1);
    }

    private static void nearestIdleCarGetsTheCall() {
        ElevatorSystem s = system(msg -> { }, 0, 9);
        check(s.requestHall(new HallCall(8, Direction.DOWN)).equals("B"), "the idle car on floor 9 answers a call from floor 8");
    }

    private static void stopsAreServedInSweepOrder() {
        List<String> events = new ArrayList<>();
        ElevatorSystem s = system(events::add, 0);
        s.selectFloor("A", 7);
        s.selectFloor("A", 3);
        runUntilIdle(s);
        int at3 = events.indexOf("Car A: doors open at floor 3");
        int at7 = events.indexOf("Car A: doors open at floor 7");
        check(at3 >= 0 && at7 > at3, "floors 3 then 7 are served in the order the car passes them");
    }

    private static void carServesTheNearerSideFirstThenReverses() {
        List<String> events = new ArrayList<>();
        ElevatorSystem s = system(events::add, 5);
        s.selectFloor("A", 2);
        s.selectFloor("A", 8);
        runUntilIdle(s);
        int at8 = events.indexOf("Car A: doors open at floor 8");
        int at2 = events.indexOf("Car A: doors open at floor 2");
        check(at8 >= 0 && at2 > at8, "from floor 5 with stops at 8 and 2 (tie) it goes up first, then reverses");
    }

    private static void carOutOfServiceIsSkipped() {
        ElevatorSystem s = system(msg -> { }, 0, 9);
        s.setOutOfService("A", true);
        check(s.requestHall(new HallCall(1, Direction.UP)).equals("B"), "a car out of service never gets a call");
    }

    private static void invalidFloorIsRejected() {
        ElevatorSystem s = system(msg -> { }, 0);
        boolean rejected = false;
        try {
            s.selectFloor("A", 99);
        } catch (IllegalArgumentException e) {
            rejected = true;
        }
        check(rejected, "a floor that does not exist is rejected");
    }

    private static void overloadKeepsTheDoorsOpen() {
        List<String> events = new ArrayList<>();
        ElevatorSystem s = system(events::add, 4);
        s.setLoad("A", 900);
        s.selectFloor("A", 4);
        s.tick();
        s.tick();
        boolean complained = events.stream().anyMatch(e -> e.contains("overloaded"));
        check(complained && s.describe("A").contains("DOORS_OPEN"), "an overloaded car keeps its doors open");
        s.setLoad("A", 100);
        s.tick();
        check(s.describe("A").contains("IDLE"), "the doors close once the load is back under the limit");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Hall call 3 UP -> Car A",
      "Hall call 8 DOWN -> Car B",
      "Car B: doors open at floor 8",
      "Car A: doors open at floor 3",
      "Car A: doors open at floor 7",
      "All cars idle after 11 ticks",
      "Car A: overloaded (800 kg > 600 kg), doors stay open",
      "Car A at floor 7 is IDLE",
    ],
  },

  "lldp-vending-atm": {
    files: [
      {
        name: "Coin.java",
        code: `// Largest first: ChangeMaker relies on values() being in descending order.
enum Coin {
    DOLLAR(100), QUARTER(25), DIME(10), NICKEL(5);

    private final int cents;

    Coin(int cents) { this.cents = cents; }

    int cents() { return cents; }
}
`,
      },
      {
        name: "Product.java",
        code: `record Product(String name, int priceCents) { }
`,
      },
      {
        name: "SaleStatus.java",
        code: `enum SaleStatus { DISPENSED, INSUFFICIENT_FUNDS, SOLD_OUT, UNKNOWN_CODE, NO_CHANGE, NO_MONEY }
`,
      },
      {
        name: "Outcome.java",
        code: `import java.util.List;

// What a button press returns. For DISPENSED, change is the change given. For NO_CHANGE, change is the refund.
record Outcome(SaleStatus status, Product product, List<Coin> change) {
    static Outcome of(SaleStatus status) { return new Outcome(status, null, List.of()); }
}
`,
      },
      {
        name: "Inventory.java",
        code: `import java.util.HashMap;
import java.util.Map;

final class Inventory {
    private final Map<String, Product> products = new HashMap<>();
    private final Map<String, Integer> quantity = new HashMap<>();

    void stock(String code, Product product, int count) {
        products.put(code, product);
        quantity.merge(code, count, Integer::sum);
    }

    boolean knows(String code) { return products.containsKey(code); }

    Product product(String code) { return products.get(code); }

    boolean available(String code) { return quantity.getOrDefault(code, 0) > 0; }

    void dispenseOne(String code) { quantity.merge(code, -1, Integer::sum); }
}
`,
      },
      {
        name: "ChangeMaker.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// Makes exact change from the coins that are really in the machine. A plain greedy loop is not enough when stock
// is limited: with one quarter and three dimes, 30 cents needs three dimes, and "take the quarter first" fails.
// So this tries the largest coins first but backtracks. With four coin types the search is tiny.
final class ChangeMaker {
    private ChangeMaker() { }

    static Optional<List<Coin>> make(int cents, Map<Coin, Integer> available) {
        Coin[] coins = Coin.values();
        int[] used = new int[coins.length];
        if (!search(0, cents, coins, available, used)) return Optional.empty();
        List<Coin> out = new ArrayList<>();
        for (int i = 0; i < coins.length; i++) {
            for (int k = 0; k < used[i]; k++) out.add(coins[i]);
        }
        return Optional.of(out);
    }

    private static boolean search(int i, int left, Coin[] coins, Map<Coin, Integer> available, int[] used) {
        if (left == 0) return true;
        if (i == coins.length) return false;
        int most = Math.min(left / coins[i].cents(), available.getOrDefault(coins[i], 0));
        for (int n = most; n >= 0; n--) {
            used[i] = n;
            if (search(i + 1, left - n * coins[i].cents(), coins, available, used)) return true;
        }
        used[i] = 0;
        return false;
    }
}
`,
      },
      {
        name: "VendingState.java",
        code: `import java.util.List;

// State pattern: what each button does depends on the state, so the machine holds no if/else ladders.
interface VendingState {
    void insert(VendingMachine machine, Coin coin);

    Outcome select(VendingMachine machine, String code);

    List<Coin> cancel(VendingMachine machine);
}
`,
      },
      {
        name: "IdleState.java",
        code: `import java.util.List;

final class IdleState implements VendingState {
    @Override
    public void insert(VendingMachine machine, Coin coin) {
        machine.accept(coin);
        machine.setState(new HasMoneyState());
    }

    @Override
    public Outcome select(VendingMachine machine, String code) {
        return Outcome.of(SaleStatus.NO_MONEY);
    }

    @Override
    public List<Coin> cancel(VendingMachine machine) {
        return List.of();
    }
}
`,
      },
      {
        name: "HasMoneyState.java",
        code: `import java.util.List;

final class HasMoneyState implements VendingState {
    @Override
    public void insert(VendingMachine machine, Coin coin) {
        machine.accept(coin);
    }

    @Override
    public Outcome select(VendingMachine machine, String code) {
        Outcome outcome = machine.trySell(code);
        // After a sale, or after a refund because no change could be made, the machine is empty-handed again.
        if (outcome.status() == SaleStatus.DISPENSED || outcome.status() == SaleStatus.NO_CHANGE) {
            machine.setState(new IdleState());
        }
        return outcome;
    }

    @Override
    public List<Coin> cancel(VendingMachine machine) {
        List<Coin> refund = machine.refund();
        machine.setState(new IdleState());
        return refund;
    }
}
`,
      },
      {
        name: "VendingMachine.java",
        code: `import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// One physical machine serves one customer at a time, so the public methods are simply synchronized.
final class VendingMachine {
    private final Inventory inventory;
    private final EnumMap<Coin, Integer> cashbox = new EnumMap<>(Coin.class);
    private final List<Coin> inserted = new ArrayList<>(); // this customer's coins, not yet part of the cashbox
    private VendingState state = new IdleState();

    VendingMachine(Inventory inventory, Map<Coin, Integer> startingCoins) {
        this.inventory = inventory;
        this.cashbox.putAll(startingCoins);
    }

    public synchronized void insert(Coin coin) { state.insert(this, coin); }

    public synchronized Outcome select(String code) { return state.select(this, code); }

    public synchronized List<Coin> cancel() { return state.cancel(this); }

    // The methods below are called by the states.

    void setState(VendingState next) { state = next; }

    void accept(Coin coin) { inserted.add(coin); }

    List<Coin> refund() {
        List<Coin> back = new ArrayList<>(inserted);
        inserted.clear();
        return back;
    }

    private int insertedCents() {
        int sum = 0;
        for (Coin coin : inserted) sum += coin.cents();
        return sum;
    }

    Outcome trySell(String code) {
        if (!inventory.knows(code)) return Outcome.of(SaleStatus.UNKNOWN_CODE);
        if (!inventory.available(code)) return Outcome.of(SaleStatus.SOLD_OUT);
        Product product = inventory.product(code);
        int paid = insertedCents();
        if (paid < product.priceCents()) return Outcome.of(SaleStatus.INSUFFICIENT_FUNDS);

        // Change may come from the customer's own coins too, so build the pool first and only commit on success.
        EnumMap<Coin, Integer> pool = new EnumMap<>(cashbox);
        for (Coin coin : inserted) pool.merge(coin, 1, Integer::sum);
        Optional<List<Coin>> change = ChangeMaker.make(paid - product.priceCents(), pool);
        if (change.isEmpty()) return new Outcome(SaleStatus.NO_CHANGE, null, refund());

        for (Coin coin : change.get()) pool.merge(coin, -1, Integer::sum);
        cashbox.clear();
        cashbox.putAll(pool);
        inserted.clear();
        inventory.dispenseOne(code);
        return new Outcome(SaleStatus.DISPENSED, product, change.get());
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.Map;

public class Main {
    private static String describe(Outcome outcome) {
        return switch (outcome.status()) {
            case DISPENSED -> "DISPENSED " + outcome.product().name() + ", change " + outcome.change();
            case NO_CHANGE -> "NO_CHANGE, refunded " + outcome.change();
            default -> outcome.status().name();
        };
    }

    public static void main(String[] args) {
        Inventory inventory = new Inventory();
        inventory.stock("A1", new Product("Cola", 150), 2);
        inventory.stock("A2", new Product("Chips", 100), 1);
        inventory.stock("B1", new Product("Gum", 50), 0);
        inventory.stock("C1", new Product("Candy", 75), 1);

        VendingMachine machine = new VendingMachine(inventory, Map.of(Coin.QUARTER, 4, Coin.DIME, 4, Coin.NICKEL, 4));

        machine.insert(Coin.DOLLAR);
        machine.insert(Coin.DOLLAR);
        System.out.println("Select A1: " + describe(machine.select("A1")));

        machine.insert(Coin.QUARTER);
        System.out.println("Select A2 (25 inserted): " + describe(machine.select("A2")));
        machine.insert(Coin.DOLLAR);
        System.out.println("Select A2 (125 inserted): " + describe(machine.select("A2")));

        machine.insert(Coin.DIME);
        System.out.println("Select B1: " + describe(machine.select("B1")));
        System.out.println("Refund " + machine.cancel());

        System.out.println("Select A1 with no money: " + describe(machine.select("A1")));

        VendingMachine tight = new VendingMachine(inventory, Map.of());
        tight.insert(Coin.DOLLAR);
        System.out.println("Select C1 (exact change machine): " + describe(tight.select("C1")));
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.util.List;
import java.util.Map;
import java.util.Optional;

public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static VendingMachine machine(Map<Coin, Integer> coins) {
        Inventory inventory = new Inventory();
        inventory.stock("A1", new Product("Cola", 150), 1);
        inventory.stock("B1", new Product("Gum", 50), 0);
        inventory.stock("C1", new Product("Candy", 75), 1);
        return new VendingMachine(inventory, coins);
    }

    public static void main(String[] args) {
        changeMakerBacktracksWhenGreedyFails();
        changeMakerGivesUpWhenImpossible();
        saleGivesChangeAndEmptiesTheState();
        noChangeRefundsTheCoins();
        soldOutAndUnknownCodes();
        cancelRefundsEverything();
        if (failures > 0) System.exit(1);
    }

    private static void changeMakerBacktracksWhenGreedyFails() {
        Optional<List<Coin>> change = ChangeMaker.make(30, Map.of(Coin.QUARTER, 1, Coin.DIME, 3));
        check(change.isPresent() && change.get().equals(List.of(Coin.DIME, Coin.DIME, Coin.DIME)),
                "30 cents from one quarter and three dimes is three dimes");
    }

    private static void changeMakerGivesUpWhenImpossible() {
        check(ChangeMaker.make(30, Map.of(Coin.QUARTER, 1)).isEmpty(), "30 cents from one quarter is impossible");
        check(ChangeMaker.make(0, Map.of()).get().isEmpty(), "zero change needs no coins");
    }

    private static void saleGivesChangeAndEmptiesTheState() {
        VendingMachine m = machine(Map.of(Coin.QUARTER, 4));
        m.insert(Coin.DOLLAR);
        m.insert(Coin.DOLLAR);
        Outcome o = m.select("A1");
        check(o.status() == SaleStatus.DISPENSED && o.change().equals(List.of(Coin.QUARTER, Coin.QUARTER)), "150 cents from 200 gives two quarters");
        check(m.select("A1").status() == SaleStatus.NO_MONEY, "after a sale the machine is idle again");
    }

    private static void noChangeRefundsTheCoins() {
        VendingMachine m = machine(Map.of());
        m.insert(Coin.DOLLAR);
        Outcome o = m.select("C1");
        check(o.status() == SaleStatus.NO_CHANGE && o.change().equals(List.of(Coin.DOLLAR)), "no way to make 25 cents: the dollar is refunded");
    }

    private static void soldOutAndUnknownCodes() {
        VendingMachine m = machine(Map.of(Coin.QUARTER, 4));
        m.insert(Coin.DOLLAR);
        check(m.select("B1").status() == SaleStatus.SOLD_OUT, "a product with no stock is SOLD_OUT");
        check(m.select("Z9").status() == SaleStatus.UNKNOWN_CODE, "an unknown code is rejected");
        check(m.select("A1").status() == SaleStatus.INSUFFICIENT_FUNDS, "100 cents cannot buy a 150 cent product");
    }

    private static void cancelRefundsEverything() {
        VendingMachine m = machine(Map.of());
        m.insert(Coin.DIME);
        m.insert(Coin.NICKEL);
        check(m.cancel().equals(List.of(Coin.DIME, Coin.NICKEL)), "cancel returns the coins in insertion order");
        check(m.cancel().isEmpty(), "cancelling again returns nothing");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Select A1: DISPENSED Cola, change [QUARTER, QUARTER]",
      "Select A2 (25 inserted): INSUFFICIENT_FUNDS",
      "Select A2 (125 inserted): DISPENSED Chips, change [QUARTER]",
      "Select B1: SOLD_OUT",
      "Refund [DIME]",
      "Select A1 with no money: NO_MONEY",
      "Select C1 (exact change machine): NO_CHANGE, refunded [DOLLAR]",
    ],
  },
};

export const LLD_DEEP_A: Record<string, LldDeep> = {
  "lldp-parking-lot": {
    walkthrough: [
      {
        title: "What to clarify before drawing anything",
        body: `Parking lot is the most common LLD question because it is small enough to finish and rich enough to show judgement. The first five minutes decide the rest, so spend them asking.

Ask about the vehicles: which types exist, and does a bigger vehicle ever fit in a bigger spot? (Yes in our design: a car may use a large spot if no medium one is free, but never the other way round.) Ask about the building: one floor or many, one entrance or several. Several entrances is the quiet requirement that forces you to think about concurrency, so get it said out loud. Ask about money: is the price per hour, per day, or flat, and does it differ by vehicle type? Ask what happens when the lot is full: reject, or queue? And ask what is out of scope: payment gateways, reservations, CCTV and number plate recognition can all be waved away if the interviewer agrees.

Write the agreed requirements as four or five short lines on the board. Everything you build afterwards should trace back to one of those lines, and when the interviewer later says "now make it support electric vehicle charging" you can point at the line that changes.`,
      },
      {
        title: "The entities and why they look like this",
        body: `Underline the nouns in the requirements: vehicle, spot, floor, ticket, lot, price. That list is a starting point, not a design, and the skill is deciding which nouns deserve a class.

Vehicle becomes a record with a plate and a type. It has no behaviour except computing the smallest spot it fits, and it never changes, so a record is exactly right. We deliberately do not create Car, Bike and Truck subclasses. They would differ only in one number, and a new vehicle type would then mean a new class instead of a new enum constant.

Spot is the only mutable object, and its only mutable field is who is parked there. Everything else (id, floor, size) is final. Because it owns its own state, it can also own the lock for that state, which is the key idea in the concurrency section.

Floor is a noun in the requirements but not a class here. A floor would be a list of spots with no behaviour of its own, so we store the floor number on each spot and sort by it when we want the nearest one. If floors later get behaviour (a display per floor, a barrier per floor) then a Floor class earns its place; until then it is ceremony. Saying this out loud in an interview is a strength: you are showing that you add classes for reasons.

Ticket is a record linking the vehicle, the spot and the entry time. ParkingLot is the facade that enforces the rules of entry and exit, and is the only class a caller needs.`,
      },
      {
        title: "Patterns used, and the ones we rejected",
        body: `Strategy appears twice. SpotAllocationStrategy decides where to park; PricingStrategy decides what it costs. Both are things the business will change (park near the lift, charge more at weekends), and Strategy lets them change without touching ParkingLot. HourlyPricing and DailyCapPricing show the point: the second one wraps any other pricing rule and limits it to a daily maximum, which is the Decorator pattern, and neither the lot nor the first rule knows about it.

Observer appears once: OccupancyListener. The display board at the entrance wants to know when counts change, and the lot should not know that a display board exists. Today there is one listener that stores the latest counts. Tomorrow it could be a mobile app feed.

Patterns we rejected on purpose. Singleton for the lot: it hides a dependency, makes tests share state, and gains nothing, because Main simply creates one lot and passes it around. Factory for tickets: creating a ticket is one line and has no variation, so a factory would only be a place to hide that line. Inheritance for vehicles, for the reason above. State pattern for spots: a spot has two states and one flag does that job. Naming what you did not use, and why, earns more than listing patterns you did.`,
      },
      {
        title: "The main flow, step by step",
        body: `Entry. The caller invokes enter(vehicle). The lot first adds the plate to a set of plates currently inside; if the add fails, the same vehicle is already in the building and the request is rejected. Then the allocation strategy returns the free spots that fit, ordered by preference: smallest fitting size first, then lowest floor, then id. The lot walks that list and calls tryPark on each spot until one succeeds. The first success creates a ticket with a sequence number and the current time from the injected clock, stores it in the active map, and notifies listeners. If the list runs out, the lot throws LotFullException and the plate is removed from the set so the driver can come back later.

Exit. The caller invokes exit(ticketId). The lot removes the ticket from the active map; the removal is the single moment that decides whether the ticket is valid, so a second scan of the same ticket finds nothing and is rejected. Then the pricing strategy computes the fee from the ticket and the current time, the spot is released, the plate leaves the set, and listeners are notified. The fee is returned.

Run Main to see it: a car, a bike and a truck enter and are assigned F0-M0, F0-S0 and F0-L0, a car that stayed 150 minutes pays for three hours, the same bike plate is turned away because it is already inside, and a third truck is rejected when both large spots are taken.`,
      },
      {
        title: "Money, time and testing",
        body: `Money is a long in the smallest unit. Doubles cannot represent 0.10 exactly, and the errors show up as a missing cent on a receipt. Whenever an interviewer sees a double next to a price, they note it.

Time comes from a Clock that is passed in. The lot never calls Instant.now(), so a test can use MutableClock, advance it by 61 minutes, and assert the fee without sleeping. This is the cheapest improvement you can make to a design and it is worth doing in every problem that involves time.

The tests run without JUnit so you can copy the files into a folder and run them. They cover: the smallest fitting spot wins; a full lot rejects the next vehicle; fees round up to whole hours (0 minutes costs one hour, 60 minutes one hour, 61 minutes two hours); the daily cap; a plate cannot enter twice; a ticket cannot be redeemed twice; and one hundred cars racing for twenty spots yields exactly twenty tickets. The last test is the one that fails if you replace tryPark with a check-then-act, which is a good thing to demonstrate to an interviewer.`,
      },
      {
        title: "How to extend it",
        body: `Each extension below should touch as little code as possible, and saying which classes change is the answer the interviewer wants.

A new vehicle type, such as a van: add a constant to VehicleType, add its case in Vehicle.minSize, add its rate to the pricing map. Nothing else changes.

Electric vehicle charging spots: add a boolean or a capability set to Spot, and a new allocation strategy that filters on it. Pricing may need to add the energy used; that is a new PricingStrategy.

Reservations: a reservation holds a spot for a time window. Add a reserved-until field to Spot and make tryPark respect it, or hold reservations in a separate structure. The honest answer is that this changes the model, because a spot is no longer simply free or taken.

Several lots: introduce a Garage that owns lots and routes by location. ParkingLot stays unchanged.

Persistence: replace the in-memory map of active tickets with a repository interface. The lot should not care whether tickets live in memory or in a database. If the lot must survive a restart, spots and tickets need to be reloaded consistently.

Payment: exit would return the fee, and a separate step would confirm payment before opening the barrier. Keep it outside the lot; the lot should not know about card networks.`,
      },
      {
        title: "What interviewers probe, and short answers",
        body: `Why is there no global lock? Because the contention is per spot, not per lot. A global lock makes entries from several gates queue behind each other, while per-spot locking lets them proceed in parallel and only serialises two gates that want the same spot.

What if the strategy returns a spot that another gate takes first? That is why the strategy returns a list and the lot calls tryPark on each: a failed tryPark just moves to the next candidate.

Why is the ticket removed from the map before computing the fee? So that the removal acts as the atomic check, making a ticket single-use even under concurrency.

How do you scale this to a hundred lots? Each lot is independent, so shard by lot id. The only shared data is the plate set per lot, which stays inside the lot.

How would you find a nearby spot faster than scanning all of them? Keep a free list per size, as a priority queue ordered by floor, so allocation is logarithmic instead of linear. We scan because the interviewer's lot has hundreds of spots, not millions, and the scan is simple; say so and offer the optimisation.

What happens if the process crashes with cars inside? In memory, you lose the tickets. State what you would persist: spots and active tickets, written before the barrier opens.`,
      },
    ],
    classDiagram: `classDiagram
    class ParkingLot {
        +enter(vehicle) Ticket
        +exit(ticketId) long
        +freeCounts() Map
        +addListener(listener)
    }
    class Spot {
        +tryPark(vehicle) boolean
        +release()
        +isFree() boolean
    }
    class Ticket {
        <<record>>
        id
        vehicle
        spot
        entry
    }
    class Vehicle {
        <<record>>
        plate
        type
        +minSize() SpotSize
    }
    class SpotAllocationStrategy {
        <<interface>>
        +candidates(spots, vehicle) List
    }
    class PricingStrategy {
        <<interface>>
        +fee(ticket, exit) long
    }
    class OccupancyListener {
        <<interface>>
        +onChange(freeBySize)
    }
    ParkingLot o-- Spot
    ParkingLot ..> Ticket : issues
    ParkingLot --> SpotAllocationStrategy
    ParkingLot --> PricingStrategy
    ParkingLot --> OccupancyListener
    Ticket --> Spot
    Ticket --> Vehicle
    SpotAllocationStrategy <|.. NearestSpotStrategy
    PricingStrategy <|.. HourlyPricing
    PricingStrategy <|.. DailyCapPricing
    DailyCapPricing o-- PricingStrategy : wraps
    OccupancyListener <|.. DisplayBoard`,
    sequenceDiagram: `sequenceDiagram
    actor Driver
    participant Lot as ParkingLot
    participant Alloc as SpotAllocationStrategy
    participant Spot
    participant Board as DisplayBoard
    Driver->>Lot: enter(vehicle)
    Lot->>Lot: plate already inside? reject
    Lot->>Alloc: candidates(spots, vehicle)
    Alloc-->>Lot: free spots, best first
    loop until one is taken
        Lot->>Spot: tryPark(vehicle)
        Spot-->>Lot: true or false
    end
    Lot->>Lot: store ticket in the active map
    Lot->>Board: onChange(free counts)
    Lot-->>Driver: Ticket`,
    concurrency: [
      "Two gates choosing the same spot: Spot.tryPark is synchronized on the spot, so exactly one wins and the other moves to its next candidate. There is no lock on the lot.",
      "The same ticket scanned twice: active.remove on a ConcurrentHashMap is atomic, so only one caller gets the ticket and the other is rejected with InvalidTicketException.",
      "The same vehicle entering twice at once: the plate set uses an atomic add, so the second attempt fails before any spot is touched.",
      "Display boards: listeners receive an immutable snapshot of the counts, and the list of listeners is copy-on-write, so adding a listener never blocks entries.",
      "What is not guaranteed: freeCounts() is a snapshot, so it can be slightly stale by the time you read it. That is fine for a display, and wrong for deciding whether a car fits. Always decide through tryPark.",
    ],
  },

  "lldp-elevator": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `An elevator is not one problem, it is three: how a single car decides where to go next, how a building with several cars decides which car answers a call, and how all of that behaves when requests arrive from different threads. Clarify which of them the interviewer cares about, and fix the scope in writing.

Ask: how many floors and cars? Are there two buttons per floor (up and down) or one? Is there a button panel inside the car? Do we care about weight limits, doors, emergency stop and maintenance mode? Is this a simulation or real control software? The answer to the last one matters most. We build a simulation with a clock: time advances in ticks, and each tick every car does one thing, either moving one floor or handling its doors. That keeps the design testable and deterministic.

State your assumptions as requirements: ten floors numbered 0 to 9, two cars, a hall call carries a floor and a direction, passengers inside press floor buttons, a car has a weight limit, and a car can be taken out of service.`,
      },
      {
        title: "Responsibilities: who knows what",
        body: `ElevatorCar owns everything about one car: its floor, its direction, its door state, its load and its set of stops. It knows nothing about other cars or about how requests were chosen. That separation is the whole design, so it is worth stating: the car decides how to serve its stops, and someone else decides which stops it gets.

ElevatorSystem is the controller and the only public entry point. It accepts hall calls and floor selections, asks the strategy which car should take a call, drives the clock with tick(), and validates floors.

DispatchStrategy answers one question: given the cars and a call, which car? It is an interface because this is the part every real building tunes, and because it is easy to swap in an interview extension.

HallCall is a record of a floor and a direction. Direction and CarState are enums. Notice what is missing: no Floor class, no Button class, no Door class. Buttons are method calls, doors are a state, and a floor is an int. A reader should be able to see the shape of the whole system in a minute.`,
      },
      {
        title: "How one car decides where to go",
        body: `The simplest policy, first come first served, is also the worst: a car at floor 1 asked for 9, then 2, then 8 would run up and down for no reason. Real elevators use the sweep idea known as SCAN or LOOK: keep moving in the current direction while there are stops ahead, serve them in the order you pass them, and reverse only when nothing is left ahead.

The car keeps its stops in a TreeSet, which is sorted. nextDirection asks two cheap questions: is there a stop above (higher) and is there a stop below (lower)? If it was going up and there is still a stop above, it keeps going up. If it was going down and there is one below, it keeps going down. If only one side has stops, it goes that way. If both sides have stops and it has no direction to keep, it chooses the nearer side.

Trace it. A car at floor 0 holds stops 3 and 7. Ticks 1 to 3: it moves to 1, 2, 3. Tick 4: floor 3 is a stop, so it opens its doors and removes the stop. Tick 5: the doors close. Ticks 6 to 9: it moves to 4, 5, 6, 7. Tick 10: it opens at 7. Tick 11: the doors close, no stops are left, the car is idle. A TreeSet makes each decision O(log n) and removes the need for separate up and down lists.

LOOK can starve a request in theory if people keep adding stops ahead, but with a bounded number of floors a stop behind the car is reached after at most one sweep, so waiting is bounded. That is the property to quote.`,
      },
      {
        title: "How a building picks a car",
        body: `NearestCarStrategy assigns each call a cost and picks the lowest. The cost is the distance from the car to the call, plus two for each stop the car already has (a busy car is slower than it looks), plus four if the car is currently heading the opposite way to the call. Cars out of service are skipped. Ties go to the first car in the list, which keeps behaviour deterministic.

Example from Main: cars A at floor 0 and B at floor 9. A hall call at floor 3 going up costs 3 for A and 6 for B, so A takes it. A second call at floor 8 going down costs 8 + 2 (A already has a stop) = 10 for A and 1 for B, so B takes it. The numbers are arbitrary, and you should say so: what matters is that distance, load and direction all enter the cost and that the weights are in one place that can be tuned.

Be ready to name the alternatives. Zoning assigns cars to floor ranges and is simple and predictable. Destination dispatch, used in tall buildings, asks passengers for their destination floor before they board and groups people going to the same place, which raises throughput a lot at the price of a keypad in every lobby. A scoring function like ours is the middle path.

The strategy is a pure function of the cars' state, which means you can unit-test it without a clock: build cars at known floors, make a call, and check the answer.`,
      },
      {
        title: "State, ticks and doors",
        body: `A car has three states: IDLE, MOVING and DOORS_OPEN. Each tick does exactly one thing. If the doors are open, close them, unless the car is overloaded, in which case log a warning and keep them open. Otherwise, if the car is at a floor it was asked to stop at, open the doors. Otherwise decide a direction and move one floor, or stay idle if there is nothing to do.

Why a tick-driven design instead of timers and threads inside each car? Because it is deterministic. A test that calls tick() eleven times and asserts the log is exact, while a test that sleeps is slow and flaky. In production the same code would be driven by a scheduler: one tick every second.

The overload rule shows how a new requirement lands in the design: it is a single check at the door-closing step. The car stays in DOORS_OPEN until the load falls under the capacity. No new state was needed, because "doors open" already means "not leaving yet".

Run Main to see the whole thing: both hall calls are assigned, the cars sweep to their stops, everything is idle after 11 ticks, and then car A, overloaded at floor 7, keeps its doors open until the load is reduced.`,
      },
      {
        title: "Concurrency, testing and extensions",
        body: `Button presses come from many threads and the clock comes from another. The design uses one lock: every public method of ElevatorSystem is synchronized. That is correct and fast enough, because each call does a handful of operations on small collections. Cars are not thread safe by themselves, and the comment says so; they are only ever touched while holding the controller's lock.

A different answer, which many people prefer, is to have all requests go through a queue consumed by a single control thread, so the cars need no locks at all. State both options, and note the trade: the lock is simpler, the queue scales better and makes ordering explicit.

Tests cover: the nearest idle car gets the call; stops are served in sweep order; a car with stops on both sides picks the nearer first and then reverses; an out-of-service car never gets a call; an invalid floor is rejected; an overloaded car keeps its doors open and closes them once the load is fixed.

Extensions: a car taken out of service mid-trip should hand its pending stops back to the controller, which reassigns them; add this by draining the stop set and calling the strategy again. Express elevators and skipped floors become a per-car set of allowed floors. VIP or fire-service mode becomes a new strategy plus a car state. Energy saving can park idle cars at the busiest floor by a strategy that runs when the system is idle. Each of these leaves the sweep logic inside the car untouched.`,
      },
    ],
    classDiagram: `classDiagram
    class ElevatorSystem {
        +requestHall(call) String
        +selectFloor(carId, floor)
        +tick()
        +allIdle() boolean
        +setLoad(carId, kg)
        +setOutOfService(carId, value)
    }
    class ElevatorCar {
        -stops TreeSet
        -floor int
        -direction Direction
        -state CarState
        +addStop(floor)
        +step()
    }
    class DispatchStrategy {
        <<interface>>
        +choose(cars, call) ElevatorCar
    }
    class HallCall {
        <<record>>
        floor
        direction
    }
    class Direction {
        <<enumeration>>
        UP
        DOWN
        IDLE
    }
    class CarState {
        <<enumeration>>
        IDLE
        MOVING
        DOORS_OPEN
    }
    ElevatorSystem o-- ElevatorCar
    ElevatorSystem --> DispatchStrategy
    DispatchStrategy <|.. NearestCarStrategy
    ElevatorSystem ..> HallCall
    ElevatorCar --> Direction
    ElevatorCar --> CarState`,
    sequenceDiagram: `sequenceDiagram
    actor Passenger
    participant Sys as ElevatorSystem
    participant Strat as DispatchStrategy
    participant Car as ElevatorCar
    participant Clock
    Passenger->>Sys: requestHall(floor 3, UP)
    Sys->>Strat: choose(cars, call)
    Strat-->>Sys: Car A
    Sys->>Car: addStop(3)
    Sys-->>Passenger: Car A is coming
    loop every tick
        Clock->>Sys: tick()
        Sys->>Car: step()
        Car->>Car: move one floor or open the doors
    end`,
    stateDiagram: `stateDiagram-v2
    [*] --> Idle
    Idle --> Moving: a stop exists on another floor
    Idle --> DoorsOpen: a stop exists on this floor
    Moving --> Moving: next floor is not a stop
    Moving --> DoorsOpen: arrived at a stop
    DoorsOpen --> DoorsOpen: overloaded
    DoorsOpen --> Idle: doors close`,
    concurrency: [
      "All public methods of ElevatorSystem are synchronized, so requests from many threads and the clock thread never interleave inside a car. Cars are only touched while the controller's lock is held.",
      "Alternative to mention: route every request through a queue read by one control thread. Cars then need no locking at all, and the order of events is explicit and replayable.",
      "tick() steps every car under the same lock, so a hall call can never observe two cars half-updated, and the dispatch cost is computed on a consistent view.",
      "Never call out to listeners or logging that might block while holding the lock in a real system. Here the log is a Consumer; a slow consumer would stall the whole building, so in production hand events to a queue.",
    ],
  },

  "lldp-vending-atm": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `The title pairs a vending machine with an ATM because they are the same problem in two costumes: a device that moves through a small number of states, where each button means something different depending on the state, and that handles money exactly. We implement the vending machine in full and map the ATM onto the same design at the end.

Ask: which coins or notes does the machine accept, and does it give change? What if it cannot make exact change? Can a customer cancel and get their money back? What is shown when a product is sold out? Is stock refilled by a staff member, and is that in scope? Is there card payment? One customer at a time, or several?

Fix the requirements: coins of 5, 10, 25 and 100 cents; products addressed by a code such as A1; insert coins, select a code, receive the product and change; cancel returns the coins; a sale is refused if the product is unknown or sold out, or if the money is not enough; and if exact change cannot be made, the sale is refused and the coins are returned.`,
      },
      {
        title: "Why the State pattern fits",
        body: `Consider what the Select button does. With no money inserted it should say "insert money". With enough money it should dispense. With too little it should say how much is missing and keep the money. Write that as a single method and you get a ladder of if statements on a status field, and every new state or button multiplies the ladder.

The State pattern turns each state into a class that implements the same interface, VendingState, with one method per button: insert, select, cancel. The machine holds a reference to the current state and forwards every button to it. IdleState and HasMoneyState each contain only the rules for their situation, and changing state is a single assignment.

In this machine the interesting transitions are: Idle goes to HasMoney when a coin is inserted; HasMoney stays in HasMoney on more coins, on an insufficient-funds selection and on a sold-out selection; HasMoney goes back to Idle after a sale, after a cancel, or after a refund caused by missing change. It is a small state machine, and you can draw it in ten seconds, which is a good sign.

Be honest about when this is overkill. With two states, a boolean might do. The pattern pays for itself when you add states (out of service, maintenance, dispensing) or when interviewers ask for them, which they will.`,
      },
      {
        title: "Entities",
        body: `Coin is an enum with its value in cents, ordered from largest to smallest on purpose, because the change-making code relies on that order.

Product is a record of a name and a price in cents. Prices are integers: a price of 1.50 is 150, for the same reason as in the parking lot.

Inventory maps a code to a product and a quantity. It answers four questions: do you know this code, is any left, which product is it, and dispense one. It does not know about money.

Outcome is the result of pressing Select. It carries a status, the product if one was dispensed, and a list of coins: the change on a sale, or the refund when no change could be made. Returning a value is better than throwing an exception here, because "sold out" and "insufficient funds" are normal outcomes of a button press, not errors in the program. SaleStatus lists them all.

VendingMachine ties them together. It owns the cashbox (coins the machine holds), the list of coins this customer has inserted but not yet committed, the inventory reference and the current state. Keeping the customer's coins apart from the cashbox is what makes refunds simple: a refund is just returning that list.`,
      },
      {
        title: "Making change, and why greedy is not enough",
        body: `When the customer overpays, the machine must return exact change from the coins it actually holds. The classic shortcut is to take the largest coin that fits, repeatedly. For US coins with unlimited supply that is optimal. But the machine's supply is limited, and then it can fail where an answer exists: with one quarter and three dimes, 30 cents needs three dimes, yet greedy takes the quarter first and is stuck with 5 cents it cannot make.

ChangeMaker therefore searches: for each coin type from the largest down, try to use as many as allowed, then as many minus one, and so on down to zero, recursing on the rest. The first complete answer found uses the largest coins possible, and if none exists the search reports that. With four coin types the search tree is tiny, so the cost is irrelevant, but the correctness is not, and it is the kind of detail interviewers hope you will notice.

There is a second subtlety. The customer's own coins can be used to make change. If someone pays 200 for a 150 product and the machine has quarters, the quarters go out; but if the machine has no coins at all and the customer inserts a dollar for a 75 cent product, no change is possible and the sale is refused. The machine builds a pool of its cashbox plus the inserted coins, searches in the pool, and only commits (updating the cashbox and the inventory) if a solution exists. Committing last is what keeps a failed sale from leaving the machine half-updated.`,
      },
      {
        title: "The main flow, step by step",
        body: `Run Main and follow it. The customer inserts two dollars: IdleState accepts the coin and the machine moves to HasMoney. Select A1 (Cola, 150): HasMoneyState asks the machine to try the sale. The machine checks the code exists, that stock is left, and that 200 is at least 150. It builds the pool, asks ChangeMaker for 50 cents, finds two quarters, removes them from the pool, replaces the cashbox with the pool, clears the customer's coins, reduces the stock, and returns DISPENSED with the change. The state goes back to Idle.

Next, a quarter then A2 (Chips, 100): INSUFFICIENT_FUNDS, and the money stays, because the state remains HasMoney. A dollar more makes 125, and the sale succeeds with a quarter of change. A dime then B1 (Gum, sold out): SOLD_OUT, and a cancel returns the dime. Pressing Select with no money gives NO_MONEY. And a second machine with an empty cashbox is given a dollar for the 75 cent candy: it cannot make 25 cents, so the result is NO_CHANGE and the dollar comes back.

Every line in this trace is a test in Tests.java, which also checks the greedy-failure case directly on ChangeMaker.`,
      },
      {
        title: "Mapping it to an ATM",
        body: `An ATM has the same skeleton. States: Idle, CardInserted, Authenticated (PIN accepted), and Transaction in progress, with a path back to Idle when the card is ejected or retained. The buttons change meaning by state: a digit is a PIN digit in one state and an amount digit in another. The State pattern handles that exactly as above.

What changes is the money. Instead of coins in a cashbox there are notes in cassettes, for example 2000, 500 and 100, and cash dispensing is the same bounded change-making problem, with the same trap: a greedy choice of big notes can fail when stock is limited. A common structure is a chain of handlers, one per denomination, each taking as many notes as it can and passing the remainder on; for exactness you again need the search from this project.

The part that is new is the account. A withdrawal must debit the account and dispense cash as one logical operation, and the two can fail separately: the bank may approve and the dispenser jam. Real ATMs handle this by recording the debit first with a transaction id, dispensing, and then confirming, so that a failure can be reversed. Mention idempotency (a retried request must not debit twice), daily limits, retaining a card after three wrong PINs, and that the PIN is never stored or logged. If the interviewer takes the ATM direction, start from this section and reuse the state machine.`,
      },
      {
        title: "Edge cases, extensions and what interviewers probe",
        body: `Edge cases worth naming: a customer who inserts coins and walks away (add a timeout that refunds, driven by the clock rather than a thread); two products at the same price; stock that runs out during the sale; a product with price zero; and exact money, where no change is needed and the search returns an empty list immediately.

Extensions: an out-of-service state that rejects every button, which is one new class and one transition; staff refill and cashbox collection, which add operations that are only valid in a maintenance state; card payment, which becomes a payment strategy beside the coin one; and several payment methods in one machine, where the machine holds the customer's balance in cents instead of a list of coins.

Probes, with short answers. Why not one big switch on the status? Every new state edits the same method; the pattern localises the change. Why return an Outcome and not throw? Because sold out is a normal result, not an error. Why synchronized? One physical machine serves one customer at a time, so a simple lock makes the buttons safe if the UI uses several threads; the design needs nothing more. How would you test it? Exactly like Tests.java: build a machine with a known cashbox, press buttons, and assert outcomes and the refunds. And what would you do if there were many machines? Each is independent, so nothing here changes; a server would receive their sales and stock levels, which is a different design.`,
      },
    ],
    classDiagram: `classDiagram
    class VendingMachine {
        +insert(coin)
        +select(code) Outcome
        +cancel() List
        ~trySell(code) Outcome
        ~refund() List
    }
    class VendingState {
        <<interface>>
        +insert(machine, coin)
        +select(machine, code) Outcome
        +cancel(machine) List
    }
    class Inventory {
        +stock(code, product, count)
        +available(code) boolean
        +dispenseOne(code)
    }
    class ChangeMaker {
        +make(cents, available) Optional
    }
    class Outcome {
        <<record>>
        status
        product
        change
    }
    class Coin {
        <<enumeration>>
        DOLLAR
        QUARTER
        DIME
        NICKEL
    }
    VendingMachine --> VendingState
    VendingState <|.. IdleState
    VendingState <|.. HasMoneyState
    VendingMachine --> Inventory
    VendingMachine ..> ChangeMaker
    VendingMachine ..> Outcome
    ChangeMaker --> Coin`,
    sequenceDiagram: `sequenceDiagram
    actor Customer
    participant M as VendingMachine
    participant S as HasMoneyState
    participant Inv as Inventory
    participant C as ChangeMaker
    Customer->>M: insert(DOLLAR) twice
    M->>M: state becomes HasMoney
    Customer->>M: select(A1)
    M->>S: select(machine, A1)
    S->>M: trySell(A1)
    M->>Inv: knows, available, product
    M->>C: make(50 cents, pool)
    C-->>M: two quarters
    M->>Inv: dispenseOne(A1)
    M-->>Customer: Outcome DISPENSED with change
    M->>M: state becomes Idle`,
    stateDiagram: `stateDiagram-v2
    [*] --> Idle
    Idle --> HasMoney: insert coin
    HasMoney --> HasMoney: insert coin, or a rejected selection
    HasMoney --> Idle: sale completed
    HasMoney --> Idle: cancel or refund`,
    concurrency: [
      "One physical machine serves one customer at a time, so the three public methods are synchronized and nothing else is needed. The states themselves hold no data, so they are safe to share and cheap to create.",
      "The sale is committed last: the pool of coins is a copy, and the cashbox, the customer's coins and the inventory are updated only after change has been found. A failed sale changes nothing.",
      "For a fleet of machines, do not share one Inventory object. Each machine owns its stock, and a server collects reports; sharing would turn a local lock into a distributed one for no benefit.",
      "A timeout that refunds an abandoned customer should be an event on the same lock (a clock tick), not a separate thread that mutates the machine.",
    ],
  },
};
