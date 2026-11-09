import { LLD_EXTRA_DIAGRAMS_A } from "./lld-diagrams-a";
import type { LldDeep, LldProject } from "./types";

// Full Java projects for LLD problems (plan 0013, batch A): parking lot, elevator. The vending machine and ATM moved to lld-projects-c-vending.ts.
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
        code: `// Immutable value object. Equality by plate, type and charging need comes for free from the record.
record Vehicle(String plate, VehicleType type, boolean electric) {
    // The common case: a vehicle that does not need a charger.
    Vehicle(String plate, VehicleType type) {
        this(plate, type, false);
    }

    static Vehicle ev(String plate, VehicleType type) {
        return new Vehicle(plate, type, true);
    }

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
        code: `import java.time.Instant;

// One parking spot. Its mutable state is who is parked here and who (if anyone) has reserved it. Both are guarded by
// the spot's own lock, so two gates racing for the same spot, or a gate racing a reservation, are decided inside
// tryPark and tryHold: exactly one of them wins. A reservation is a time-limited hold, so nothing has to clean it up:
// once "until" has passed it simply stops counting.
final class Spot {
    private final String id;
    private final int floor;
    private final SpotSize size;
    private final boolean ev; // has a charger
    private Vehicle parked;    // guarded by "this"
    private String holdPlate;  // guarded by "this"
    private Instant holdUntil; // guarded by "this"

    Spot(int floor, SpotSize size, int index) {
        this(floor, size, index, false);
    }

    Spot(int floor, SpotSize size, int index, boolean ev) {
        this.floor = floor;
        this.size = size;
        this.ev = ev;
        this.id = "F" + floor + "-" + size.name().charAt(0) + index + (ev ? "-EV" : "");
    }

    String id() { return id; }
    int floor() { return floor; }
    SpotSize size() { return size; }
    boolean isEv() { return ev; }

    // Nobody is parked here (a reservation does not count). Allocation strategies use this as a cheap first filter.
    synchronized boolean isFree() { return parked == null; }

    // Nobody is parked here and nobody holds it at this moment: the spot a new customer could really get.
    synchronized boolean isAvailableAt(Instant now) { return parked == null && !heldByOther(null, now); }

    private boolean heldByOther(String plate, Instant now) {
        return holdPlate != null && !holdPlate.equals(plate) && holdUntil.isAfter(now);
    }

    synchronized boolean tryPark(Vehicle vehicle, Instant now) {
        if (parked != null || heldByOther(vehicle.plate(), now)) return false;
        parked = vehicle;
        holdPlate = null;
        holdUntil = null;
        return true;
    }

    synchronized boolean tryHold(String plate, Instant until, Instant now) {
        if (parked != null || heldByOther(plate, now)) return false;
        holdPlate = plate;
        holdUntil = until;
        return true;
    }

    synchronized void clearHold(String plate) {
        if (plate.equals(holdPlate)) {
            holdPlate = null;
            holdUntil = null;
        }
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
        name: "Reservation.java",
        code: `import java.time.Instant;

// A promise that a particular spot is kept for a plate until "expires".
record Reservation(String id, String plate, Spot spot, Instant expires) { }
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
        name: "PaymentFailedException.java",
        code: `// Thrown when the customer's payment is declined. The ticket stays valid, so the customer can try another way to pay.
class PaymentFailedException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    PaymentFailedException(String ticketId, String reason) {
        super("Payment declined for " + ticketId + ": " + reason);
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
        name: "EvAwareStrategy.java",
        code: `import java.util.ArrayList;
import java.util.List;

// Decorator over any allocation strategy. An electric vehicle is offered charger spots first; every other vehicle is
// offered charger spots last, so a petrol car does not block the only charger unless the lot has nothing else.
// The inner strategy keeps deciding the order inside each group.
final class EvAwareStrategy implements SpotAllocationStrategy {
    private final SpotAllocationStrategy inner;

    EvAwareStrategy(SpotAllocationStrategy inner) {
        this.inner = inner;
    }

    @Override
    public List<Spot> candidates(List<Spot> spots, Vehicle vehicle) {
        List<Spot> preferred = new ArrayList<>();
        List<Spot> fallback = new ArrayList<>();
        for (Spot spot : inner.candidates(spots, vehicle)) {
            if (spot.isEv() == vehicle.electric()) preferred.add(spot);
            else fallback.add(spot);
        }
        // An electric vehicle can park on a plain spot (it just will not charge), so the fallback is kept.
        preferred.addAll(fallback);
        return preferred;
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
        name: "ChargingSurcharge.java",
        code: `import java.time.Duration;
import java.time.Instant;

// Decorator: adds a charging fee per started hour when the ticket's spot has a charger. It wraps any other rule,
// so "hourly + charging" and "daily cap + hourly + charging" are just different ways of stacking decorators.
final class ChargingSurcharge implements PricingStrategy {
    private final PricingStrategy inner;
    private final long centsPerHour;

    ChargingSurcharge(PricingStrategy inner, long centsPerHour) {
        this.inner = inner;
        this.centsPerHour = centsPerHour;
    }

    @Override
    public long fee(Ticket ticket, Instant exit) {
        long base = inner.fee(ticket, exit);
        if (!ticket.spot().isEv()) return base;
        long minutes = Duration.between(ticket.entry(), exit).toMinutes();
        long hours = Math.max(1, (minutes + 59) / 60);
        return base + hours * centsPerHour;
    }
}
`,
      },
      {
        name: "PaymentResult.java",
        code: `// What a payment attempt came back with. changeCents is only used by cash.
record PaymentResult(boolean approved, String method, long changeCents, String note) {
    static PaymentResult approved(String method, long changeCents, String note) {
        return new PaymentResult(true, method, changeCents, note);
    }

    static PaymentResult declined(String method, String note) {
        return new PaymentResult(false, method, 0, note);
    }
}
`,
      },
      {
        name: "PaymentProcessor.java",
        code: `// Strategy: how a customer pays. The lot only asks "charge this many cents" and reads the answer, so it knows nothing
// about card networks or cash drawers. A processor may be called again for the same ticket after a decline.
interface PaymentProcessor {
    PaymentResult charge(long amountCents);

    // For flows where the fee was already settled elsewhere (a season pass, a prepaid app).
    static PaymentProcessor prepaid() {
        return cents -> PaymentResult.approved("PREPAID", 0, "settled elsewhere");
    }
}
`,
      },
      {
        name: "CashPayment.java",
        code: `final class CashPayment implements PaymentProcessor {
    private final long tenderedCents;

    CashPayment(long tenderedCents) {
        this.tenderedCents = tenderedCents;
    }

    @Override
    public PaymentResult charge(long amountCents) {
        if (tenderedCents < amountCents) {
            return PaymentResult.declined("CASH", "tendered " + tenderedCents + " is less than " + amountCents);
        }
        return PaymentResult.approved("CASH", tenderedCents - amountCents, "change given");
    }
}
`,
      },
      {
        name: "CardGateway.java",
        code: `// The outside world: a card network. Kept as an interface so tests use a fake and the lot never imports a vendor SDK.
interface CardGateway {
    boolean authorize(String cardLast4, long amountCents);
}
`,
      },
      {
        name: "CardPayment.java",
        code: `final class CardPayment implements PaymentProcessor {
    private final String cardLast4;
    private final CardGateway gateway;

    CardPayment(String cardLast4, CardGateway gateway) {
        this.cardLast4 = cardLast4;
        this.gateway = gateway;
    }

    @Override
    public PaymentResult charge(long amountCents) {
        if (gateway.authorize(cardLast4, amountCents)) {
            return PaymentResult.approved("CARD", 0, "card " + cardLast4);
        }
        return PaymentResult.declined("CARD", "card " + cardLast4 + " was declined");
    }
}
`,
      },
      {
        name: "Receipt.java",
        code: `import java.time.Instant;

record Receipt(String ticketId, String plate, String spotId, long feeCents, String method, long changeCents, Instant exit) { }
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
        name: "LotReport.java",
        code: `import java.util.Map;

// A read-only summary for the operator: money taken, stays completed, tickets still open, free spots right now.
record LotReport(long revenueCents, long completedStays, long openTickets,
                 Map<VehicleType, Long> revenueByType, Map<SpotSize, Long> freeBySize) { }
`,
      },
      {
        name: "ParkingLot.java",
        code: `import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.atomic.LongAdder;

// The facade. It owns the rules of entry, reservation and exit; spots, pricing, allocation and payment are injected.
// Thread safety: no global lock. A spot decides races itself (Spot.tryPark and Spot.tryHold), tickets live in a
// concurrent map, and active.remove is atomic, so a ticket can be redeemed only once even if two gates scan it at the
// same time. Reservations are changed with ConcurrentHashMap.compute, so one plate cannot hold two spots.
final class ParkingLot {
    static final long DEFAULT_LOST_TICKET_CENTS = 500;

    private final List<Spot> spots;
    private final SpotAllocationStrategy allocation;
    private final PricingStrategy pricing;
    private final Clock clock;
    private final long lostTicketCents;
    private final Map<String, Ticket> active = new ConcurrentHashMap<>();
    private final Map<String, Reservation> reservations = new ConcurrentHashMap<>(); // by plate
    private final Set<String> platesInside = ConcurrentHashMap.newKeySet();
    private final List<OccupancyListener> listeners = new CopyOnWriteArrayList<>();
    private final AtomicLong ticketSequence = new AtomicLong();
    private final AtomicLong reservationSequence = new AtomicLong();
    private final LongAdder revenue = new LongAdder();
    private final LongAdder stays = new LongAdder();
    private final Map<VehicleType, LongAdder> revenueByType = new EnumMap<>(VehicleType.class);

    ParkingLot(List<Spot> spots, SpotAllocationStrategy allocation, PricingStrategy pricing, Clock clock) {
        this(spots, allocation, pricing, clock, DEFAULT_LOST_TICKET_CENTS);
    }

    ParkingLot(List<Spot> spots, SpotAllocationStrategy allocation, PricingStrategy pricing, Clock clock,
               long lostTicketCents) {
        this.spots = List.copyOf(spots);
        this.allocation = allocation;
        this.pricing = pricing;
        this.clock = clock;
        this.lostTicketCents = lostTicketCents;
        for (VehicleType type : VehicleType.values()) revenueByType.put(type, new LongAdder()); // never changes later
    }

    void addListener(OccupancyListener listener) { listeners.add(listener); }

    // ---- entry ---------------------------------------------------------------------------------------------

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
        Instant now = clock.instant();
        // A vehicle with a live reservation goes to the spot that was kept for it.
        Reservation reserved = reservations.remove(vehicle.plate());
        if (reserved != null) {
            if (reserved.expires().isAfter(now) && reserved.spot().tryPark(vehicle, now)) {
                return issue(vehicle, reserved.spot(), now);
            }
            reserved.spot().clearHold(vehicle.plate()); // expired: give the spot back and park like anyone else
        }
        for (Spot spot : allocation.candidates(spots, vehicle)) {
            if (spot.tryPark(vehicle, now)) return issue(vehicle, spot, now);
        }
        throw new LotFullException(vehicle.type());
    }

    private Ticket issue(Vehicle vehicle, Spot spot, Instant now) {
        Ticket ticket = new Ticket("T-" + ticketSequence.incrementAndGet(), vehicle, spot, now);
        active.put(ticket.id(), ticket);
        return ticket;
    }

    // ---- reservations --------------------------------------------------------------------------------------

    // Keeps a spot for the vehicle until now + hold. The spot is chosen the same way as at the gate.
    Reservation reserve(Vehicle vehicle, Duration hold) {
        Instant now = clock.instant();
        Instant until = now.plus(hold);
        if (platesInside.contains(vehicle.plate())) {
            throw new IllegalStateException("Vehicle already inside: " + vehicle.plate());
        }
        Reservation[] made = new Reservation[1];
        reservations.compute(vehicle.plate(), (plate, existing) -> {
            if (existing != null && existing.expires().isAfter(now)) {
                throw new IllegalStateException("Already reserved: " + plate);
            }
            if (existing != null) existing.spot().clearHold(plate); // the old hold ran out
            for (Spot spot : allocation.candidates(spots, vehicle)) {
                if (spot.tryHold(plate, until, now)) {
                    made[0] = new Reservation("R-" + reservationSequence.incrementAndGet(), plate, spot, until);
                    return made[0];
                }
            }
            return null; // nothing to hold: leaves no entry behind
        });
        if (made[0] == null) throw new LotFullException(vehicle.type());
        notifyListeners();
        return made[0];
    }

    void cancelReservation(String plate) {
        Reservation r = reservations.remove(plate);
        if (r != null) {
            r.spot().clearHold(plate);
            notifyListeners();
        }
    }

    // ---- exit and payment ----------------------------------------------------------------------------------

    // Old entry point: the fee is settled elsewhere. Returns the fee.
    long exit(String ticketId) {
        return checkout(ticketId, PaymentProcessor.prepaid()).feeCents();
    }

    // Normal exit: price the stay, take the payment, then open the barrier. The ticket is removed first, which is the
    // atomic "only one caller wins" step. If the payment is declined the ticket goes back, so the customer can try
    // another way to pay. If pricing itself throws, the car is let out: a bad rule must not trap a car forever.
    Receipt checkout(String ticketId, PaymentProcessor payment) {
        Ticket ticket = active.remove(ticketId);
        if (ticket == null) throw new InvalidTicketException(ticketId);
        Instant now = clock.instant();
        long fee;
        try {
            fee = pricing.fee(ticket, now);
        } catch (RuntimeException e) {
            free(ticket);
            throw e;
        }
        return settle(ticket, fee, payment, now);
    }

    // The customer lost the ticket. We find it by plate and charge the larger of the real fee and a flat penalty.
    // (A real lot would also check the driver's ID against the registration. That is out of scope here.)
    Receipt lostTicket(String plate, PaymentProcessor payment) {
        Ticket found = null;
        for (Ticket t : active.values()) {
            if (t.vehicle().plate().equals(plate)) found = t;
        }
        if (found == null || active.remove(found.id()) == null) throw new InvalidTicketException("plate " + plate);
        Instant now = clock.instant();
        return settle(found, Math.max(pricing.fee(found, now), lostTicketCents), payment, now);
    }

    private Receipt settle(Ticket ticket, long fee, PaymentProcessor payment, Instant now) {
        PaymentResult result;
        try {
            result = payment.charge(fee);
        } catch (RuntimeException e) {
            active.put(ticket.id(), ticket); // the processor crashed: nothing was taken, keep the ticket valid
            throw e;
        }
        if (!result.approved()) {
            active.put(ticket.id(), ticket);
            throw new PaymentFailedException(ticket.id(), result.note());
        }
        revenue.add(fee);
        revenueByType.get(ticket.vehicle().type()).add(fee);
        stays.increment();
        free(ticket);
        return new Receipt(ticket.id(), ticket.vehicle().plate(), ticket.spot().id(), fee,
                result.method(), result.changeCents(), now);
    }

    private void free(Ticket ticket) {
        ticket.spot().release();
        platesInside.remove(ticket.vehicle().plate());
        notifyListeners();
    }

    // ---- reading -------------------------------------------------------------------------------------------

    Map<SpotSize, Long> freeCounts() {
        Instant now = clock.instant();
        Map<SpotSize, Long> counts = new EnumMap<>(SpotSize.class);
        for (SpotSize size : SpotSize.values()) counts.put(size, 0L);
        for (Spot spot : spots) {
            if (spot.isAvailableAt(now)) counts.merge(spot.size(), 1L, Long::sum);
        }
        return counts;
    }

    LotReport report() {
        Map<VehicleType, Long> byType = new EnumMap<>(VehicleType.class);
        revenueByType.forEach((type, adder) -> byType.put(type, adder.sum()));
        return new LotReport(revenue.sum(), stays.sum(), active.size(), byType, freeCounts());
    }

    private void notifyListeners() {
        Map<SpotSize, Long> free = freeCounts();
        for (OccupancyListener listener : listeners) listener.onChange(free);
    }
}
`,
      },
      {
        name: "GarageTicket.java",
        code: `// A ticket from one of the garage's lots. The id carries the lot name, so every lot may number its tickets from 1.
record GarageTicket(String id, String lotName, Ticket ticket) { }
`,
      },
      {
        name: "GarageReport.java",
        code: `import java.util.Map;

record GarageReport(long revenueCents, long openTickets, Map<String, LotReport> byLot) { }
`,
      },
      {
        name: "Garage.java",
        code: `import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// Several lots behind one door (a campus with a north and a south lot). It only routes: the first lot, in the order
// they were given, that has room takes the vehicle. Each ParkingLot is unchanged and knows nothing about the garage.
// The garage keeps its own set of plates, because one vehicle must not be inside two different lots.
final class Garage {
    private final Map<String, ParkingLot> lots; // never modified after construction, iteration order is the preference
    private final Set<String> platesInside = ConcurrentHashMap.newKeySet();

    Garage(Map<String, ParkingLot> lots) {
        this.lots = new LinkedHashMap<>(lots);
    }

    GarageTicket enter(Vehicle vehicle) {
        if (!platesInside.add(vehicle.plate())) {
            throw new IllegalStateException("Vehicle already inside: " + vehicle.plate());
        }
        for (Map.Entry<String, ParkingLot> e : lots.entrySet()) {
            try {
                Ticket ticket = e.getValue().enter(vehicle);
                return new GarageTicket(e.getKey() + "/" + ticket.id(), e.getKey(), ticket);
            } catch (LotFullException full) {
                // this lot has no room for this vehicle: try the next one
            }
        }
        platesInside.remove(vehicle.plate());
        throw new LotFullException(vehicle.type());
    }

    Receipt checkout(String garageTicketId, PaymentProcessor payment) {
        int slash = garageTicketId.indexOf('/');
        ParkingLot lot = slash < 0 ? null : lots.get(garageTicketId.substring(0, slash));
        if (lot == null) throw new InvalidTicketException(garageTicketId);
        Receipt receipt = lot.checkout(garageTicketId.substring(slash + 1), payment);
        platesInside.remove(receipt.plate());
        return receipt;
    }

    GarageReport report() {
        Map<String, LotReport> byLot = new LinkedHashMap<>();
        long revenue = 0;
        long open = 0;
        for (Map.Entry<String, ParkingLot> e : lots.entrySet()) {
            LotReport r = e.getValue().report();
            byLot.put(e.getKey(), r);
            revenue += r.revenueCents();
            open += r.openTickets();
        }
        return new GarageReport(revenue, open, byLot);
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
import java.util.LinkedHashMap;
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

        // ---- Part 2: a charger, a reservation, payment, a lost ticket and the operator report ----------------
        // One floor, three medium spots, the first one has a charger. Hourly rate plus 15 per hour on the charger.
        MutableClock clock2 = new MutableClock(Instant.parse("2024-03-01T09:00:00Z"));
        List<Spot> bay = List.of(new Spot(0, SpotSize.MEDIUM, 0, true), new Spot(0, SpotSize.MEDIUM, 1), new Spot(0, SpotSize.MEDIUM, 2));
        PricingStrategy pricing = new ChargingSurcharge(new HourlyPricing(rates), 15L);
        ParkingLot evLot = new ParkingLot(bay, new EvAwareStrategy(new NearestSpotStrategy()), pricing, clock2);

        Ticket petrol = evLot.enter(new Vehicle("P1", VehicleType.CAR));
        Ticket electric = evLot.enter(Vehicle.ev("E1", VehicleType.CAR));
        System.out.println("Petrol car " + petrol.vehicle().plate() + " -> " + petrol.spot().id());
        System.out.println("Electric car " + electric.vehicle().plate() + " -> " + electric.spot().id());

        Reservation held = evLot.reserve(new Vehicle("R1", VehicleType.CAR), Duration.ofMinutes(30));
        System.out.println("Reserved " + held.spot().id() + " for " + held.plate() + " until " + held.expires());
        try {
            evLot.enter(new Vehicle("X1", VehicleType.CAR));
        } catch (LotFullException e) {
            System.out.println("Rejected: " + e.getMessage() + " (the last spot is reserved)");
        }
        clock2.advance(Duration.ofMinutes(10));
        Ticket arrived = evLot.enter(new Vehicle("R1", VehicleType.CAR));
        System.out.println("Reserved car " + arrived.vehicle().plate() + " -> " + arrived.spot().id());

        clock2.advance(Duration.ofMinutes(110)); // it is 11:00 now
        try {
            evLot.checkout(petrol.id(), new CashPayment(10));
        } catch (PaymentFailedException e) {
            System.out.println(e.getMessage());
        }
        System.out.println(describe(evLot.checkout(petrol.id(), new CardPayment("4242", (card, cents) -> cents <= 100))));
        System.out.println(describe(evLot.checkout(electric.id(), new CashPayment(100))));
        Receipt lost = evLot.lostTicket("R1", new CashPayment(1000));
        System.out.println("Lost ticket " + lost.plate() + ": fee " + lost.feeCents() + " change " + lost.changeCents());
        LotReport report = evLot.report();
        System.out.println("Report: revenue " + report.revenueCents() + ", stays " + report.completedStays()
                + ", open " + report.openTickets() + ", free " + report.freeBySize());

        // ---- Part 3: two lots behind one garage -----------------------------------------------------------------
        MutableClock clock3 = new MutableClock(Instant.parse("2024-03-01T12:00:00Z"));
        Map<String, ParkingLot> lots = new LinkedHashMap<>();
        lots.put("North", new ParkingLot(List.of(new Spot(0, SpotSize.MEDIUM, 0)), new NearestSpotStrategy(), new HourlyPricing(rates), clock3));
        lots.put("South", new ParkingLot(List.of(new Spot(0, SpotSize.MEDIUM, 0)), new NearestSpotStrategy(), new HourlyPricing(rates), clock3));
        Garage garage = new Garage(lots);
        GarageTicket g1 = garage.enter(new Vehicle("G1", VehicleType.CAR));
        GarageTicket g2 = garage.enter(new Vehicle("G2", VehicleType.CAR));
        System.out.println("Garage tickets: " + g1.id() + " " + g2.id());
        try {
            garage.enter(new Vehicle("G3", VehicleType.CAR));
        } catch (LotFullException e) {
            System.out.println("Rejected: " + e.getMessage() + " (garage full)");
        }
        Receipt gr = garage.checkout(g1.id(), new CashPayment(20));
        System.out.println("Garage checkout " + g1.id() + " fee " + gr.feeCents());
        GarageReport gReport = garage.report();
        System.out.println("Garage: revenue " + gReport.revenueCents() + ", open " + gReport.openTickets()
                + ", North stays " + gReport.byLot().get("North").completedStays()
                + ", South stays " + gReport.byLot().get("South").completedStays());
    }

    private static String describe(Receipt r) {
        return "Receipt " + r.ticketId() + " " + r.plate() + " fee " + r.feeCents() + " " + r.method()
                + (r.changeCents() > 0 ? " change " + r.changeCents() : "");
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
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

    private static Vehicle car(String plate) { return new Vehicle(plate, VehicleType.CAR); }

    public static void main(String[] args) throws Exception {
        smallestFittingSpotWins();
        fullLotRejectsTheNextVehicle();
        feeRoundsUpToWholeHours();
        dailyCapLimitsTheFee();
        sameVehicleCannotEnterTwice();
        ticketCanOnlyBeUsedOnce();
        concurrentEntriesNeverOverbook();
        electricVehicleGetsTheCharger();
        chargingSurchargeIsPerStartedHour();
        reservedSpotIsKeptForItsPlate();
        reservationExpires();
        cancelledReservationFreesTheSpot();
        oneReservationPerPlate();
        declinedPaymentKeepsTheTicketValid();
        cashGivesChange();
        lostTicketPaysTheLargerOfPenaltyAndFee();
        reportAddsUpRevenue();
        garageOverflowsToTheNextLot();
        concurrentReservationsNeverShareASpot();
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

    // ---- chargers ----------------------------------------------------------------------------------------

    private static ParkingLot evLot(MutableClock clock) {
        List<Spot> bay = List.of(new Spot(0, SpotSize.MEDIUM, 0, true), new Spot(0, SpotSize.MEDIUM, 1));
        return new ParkingLot(bay, new EvAwareStrategy(new NearestSpotStrategy()),
                new ChargingSurcharge(hourly(), 15L), clock);
    }

    private static void electricVehicleGetsTheCharger() {
        ParkingLot lot = evLot(clock());
        Ticket petrol = lot.enter(car("P"));
        check(!petrol.spot().isEv(), "a petrol car is kept off the charger while a plain spot is free");
        lot.exit(petrol.id());
        Ticket first = lot.enter(Vehicle.ev("E1", VehicleType.CAR));
        check(first.spot().isEv(), "an electric car is offered the charger first");
        Ticket second = lot.enter(Vehicle.ev("E2", VehicleType.CAR));
        check(!second.spot().isEv(), "a second electric car still parks on a plain spot when the charger is taken");
        lot.exit(first.id());
        Ticket petrolAgain = lot.enter(car("P2"));
        check(!petrolAgain.spot().isEv() || lot.freeCounts().get(SpotSize.MEDIUM) == 0L,
                "a petrol car uses the charger only when nothing else is left");
    }

    private static void chargingSurchargeIsPerStartedHour() {
        MutableClock clock = clock();
        ParkingLot lot = evLot(clock);
        Ticket e = lot.enter(Vehicle.ev("E", VehicleType.CAR));
        clock.advance(Duration.ofMinutes(61));
        check(lot.exit(e.id()) == 2 * 20L + 2 * 15L, "61 minutes on a charger: two hours of parking plus two of charging");
        Ticket p = lot.enter(car("P"));
        clock.advance(Duration.ofMinutes(61));
        check(lot.exit(p.id()) == 2 * 20L, "no charging fee on a plain spot");
    }

    // ---- reservations ------------------------------------------------------------------------------------

    private static void reservedSpotIsKeptForItsPlate() {
        ParkingLot lot = lot(spots(0, 1, 0), clock());
        Reservation r = lot.reserve(car("VIP"), Duration.ofMinutes(30));
        check(lot.freeCounts().get(SpotSize.MEDIUM) == 0L, "a reserved spot does not count as free");
        boolean rejected = false;
        try {
            lot.enter(car("OTHER"));
        } catch (LotFullException e) {
            rejected = true;
        }
        check(rejected, "another car cannot take a reserved spot");
        Ticket t = lot.enter(car("VIP"));
        check(t.spot() == r.spot(), "the holder gets the reserved spot");
    }

    private static void reservationExpires() {
        MutableClock clock = clock();
        ParkingLot lot = lot(spots(0, 1, 0), clock);
        lot.reserve(car("LATE"), Duration.ofMinutes(30));
        clock.advance(Duration.ofMinutes(31));
        check(lot.freeCounts().get(SpotSize.MEDIUM) == 1L, "an expired reservation frees the spot at once");
        Ticket other = lot.enter(car("OTHER"));
        check(other.spot().size() == SpotSize.MEDIUM, "another car can park after the hold ran out");
        lot.exit(other.id());
        Ticket late = lot.enter(car("LATE"));
        check(late != null, "the late holder is treated like any other car");
    }

    private static void cancelledReservationFreesTheSpot() {
        ParkingLot lot = lot(spots(0, 1, 0), clock());
        lot.reserve(car("A"), Duration.ofMinutes(30));
        lot.cancelReservation("A");
        check(lot.freeCounts().get(SpotSize.MEDIUM) == 1L, "cancelling gives the spot back");
        check(lot.enter(car("B")) != null, "someone else can take it");
    }

    private static void oneReservationPerPlate() {
        ParkingLot lot = lot(spots(0, 2, 0), clock());
        lot.reserve(car("A"), Duration.ofMinutes(30));
        boolean rejected = false;
        try {
            lot.reserve(car("A"), Duration.ofMinutes(30));
        } catch (IllegalStateException e) {
            rejected = true;
        }
        check(rejected, "a plate cannot hold two reservations");
        check(lot.freeCounts().get(SpotSize.MEDIUM) == 1L, "the rejected request did not hold a second spot");
    }

    // ---- payment, lost tickets and reports ---------------------------------------------------------------

    private static void declinedPaymentKeepsTheTicketValid() {
        MutableClock clock = clock();
        ParkingLot lot = lot(spots(0, 1, 0), clock);
        Ticket t = lot.enter(car("A"));
        clock.advance(Duration.ofMinutes(90));
        boolean declined = false;
        try {
            lot.checkout(t.id(), new CashPayment(10));
        } catch (PaymentFailedException e) {
            declined = true;
        }
        check(declined, "cash that does not cover the fee is declined");
        check(lot.freeCounts().get(SpotSize.MEDIUM) == 0L, "the car is still inside after a declined payment");
        Receipt r = lot.checkout(t.id(), new CardPayment("1111", (card, cents) -> true));
        check(r.feeCents() == 40L && r.method().equals("CARD"), "the same ticket can be paid again with a card");
        check(lot.freeCounts().get(SpotSize.MEDIUM) == 1L, "the spot is free after a successful payment");
        check(lot.report().revenueCents() == 40L, "a declined attempt adds nothing to the revenue");
    }

    private static void cashGivesChange() {
        ParkingLot lot = lot(spots(0, 1, 0), clock());
        Ticket t = lot.enter(car("A"));
        Receipt r = lot.checkout(t.id(), new CashPayment(100));
        check(r.feeCents() == 20L && r.changeCents() == 80L, "100 tendered for a fee of 20 gives 80 change");
    }

    private static void lostTicketPaysTheLargerOfPenaltyAndFee() {
        MutableClock clock = clock();
        ParkingLot lot = lot(spots(0, 2, 0), clock);
        lot.enter(car("SHORT"));
        Receipt shortStay = lot.lostTicket("SHORT", new CashPayment(1000));
        check(shortStay.feeCents() == ParkingLot.DEFAULT_LOST_TICKET_CENTS, "a short stay with a lost ticket pays the flat penalty");
        lot.enter(car("LONG"));
        clock.advance(Duration.ofHours(30));
        Receipt longStay = lot.lostTicket("LONG", new CashPayment(1000));
        check(longStay.feeCents() == 30 * 20L, "a long stay pays the real fee when it is higher than the penalty");
        boolean rejected = false;
        try {
            lot.lostTicket("NOBODY", new CashPayment(1000));
        } catch (InvalidTicketException e) {
            rejected = true;
        }
        check(rejected, "a plate that is not inside has no ticket to settle");
    }

    private static void reportAddsUpRevenue() {
        ParkingLot lot = lot(spots(1, 1, 0), clock());
        Ticket c = lot.enter(car("C"));
        Ticket b = lot.enter(new Vehicle("B", VehicleType.BIKE));
        lot.checkout(c.id(), PaymentProcessor.prepaid());
        LotReport mid = lot.report();
        check(mid.revenueCents() == 20L && mid.completedStays() == 1L && mid.openTickets() == 1L, "report after one exit");
        lot.checkout(b.id(), PaymentProcessor.prepaid());
        LotReport end = lot.report();
        check(end.revenueByType().get(VehicleType.CAR) == 20L && end.revenueByType().get(VehicleType.BIKE) == 10L,
                "revenue is split by vehicle type");
        check(end.revenueCents() == 30L && end.openTickets() == 0L, "the totals add up");
    }

    // ---- garage ------------------------------------------------------------------------------------------

    private static void garageOverflowsToTheNextLot() {
        MutableClock clock = clock();
        Map<String, ParkingLot> lots = new LinkedHashMap<>();
        lots.put("A", lot(spots(0, 1, 0), clock));
        lots.put("B", lot(spots(0, 1, 0), clock));
        Garage garage = new Garage(lots);
        GarageTicket first = garage.enter(car("1"));
        GarageTicket second = garage.enter(car("2"));
        check(first.lotName().equals("A") && second.lotName().equals("B"), "the second car goes to the next lot");
        boolean rejected = false;
        try {
            garage.enter(car("3"));
        } catch (LotFullException e) {
            rejected = true;
        }
        check(rejected, "a full garage rejects the next car");
        boolean twice = false;
        try {
            garage.enter(car("1"));
        } catch (IllegalStateException e) {
            twice = true;
        }
        check(twice, "one plate cannot be inside two lots of the same garage");
        garage.checkout(first.id(), PaymentProcessor.prepaid());
        check(garage.enter(car("1")).lotName().equals("A"), "after leaving, the plate can enter again");
        check(garage.report().openTickets() == 2L, "the garage report counts open tickets of all lots");
    }

    private static void concurrentReservationsNeverShareASpot() throws Exception {
        ParkingLot lot = lot(spots(0, 10, 0), clock());
        ExecutorService pool = Executors.newFixedThreadPool(8);
        Set<String> spotIds = ConcurrentHashMap.newKeySet();
        AtomicInteger reserved = new AtomicInteger();
        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            final int n = i;
            futures.add(pool.submit(() -> {
                try {
                    Reservation r = lot.reserve(car("R-" + n), Duration.ofMinutes(30));
                    spotIds.add(r.spot().id());
                    reserved.incrementAndGet();
                } catch (LotFullException ignored) {
                    // expected for the plates that ask after the lot is fully reserved
                }
            }));
        }
        for (Future<?> f : futures) f.get();
        pool.shutdown();
        check(reserved.get() == 10, "50 plates racing for 10 spots: exactly 10 reservations are made");
        check(spotIds.size() == 10, "no two reservations share a spot");
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
      "Petrol car P1 -> F0-M1",
      "Electric car E1 -> F0-M0-EV",
      "Reserved F0-M2 for R1 until 2024-03-01T09:30:00Z",
      "Rejected: No free spot for CAR (the last spot is reserved)",
      "Reserved car R1 -> F0-M2",
      "Payment declined for T-1: tendered 10 is less than 40",
      "Receipt T-1 P1 fee 40 CARD",
      "Receipt T-2 E1 fee 70 CASH change 30",
      "Lost ticket R1: fee 500 change 500",
      "Report: revenue 610, stays 3, open 0, free {SMALL=0, MEDIUM=3, LARGE=0}",
      "Garage tickets: North/T-1 South/T-1",
      "Rejected: No free spot for CAR (garage full)",
      "Garage checkout North/T-1 fee 20",
      "Garage: revenue 20, open 1, North stays 1, South stays 0",
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
        name: "Want.java",
        code: `// Why a car has to stop at a floor. INSIDE: a passenger in the car pressed this floor, so the car stops whichever way it
// is going. UP or DOWN: someone on the floor pressed that hall button, so the car should stop only when it is going
// that way (or when it has nothing left ahead and is about to turn round anyway).
enum Want {
    INSIDE, UP, DOWN;

    static Want of(Direction direction) {
        if (direction == Direction.IDLE) throw new IllegalArgumentException("A hall call needs UP or DOWN");
        return direction == Direction.UP ? UP : DOWN;
    }

    Direction asDirection() {
        return switch (this) {
            case UP -> Direction.UP;
            case DOWN -> Direction.DOWN;
            case INSIDE -> Direction.IDLE;
        };
    }
}
`,
      },
      {
        name: "HallCall.java",
        code: `// A press of the up or down button on a floor. A call must have a direction: IDLE is not a button.
record HallCall(int floor, Direction direction) {
    HallCall {
        if (direction == Direction.IDLE) throw new IllegalArgumentException("A hall call needs UP or DOWN");
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

// Cost = distance to the call + 2 per stop the car already has + 4 when the car is heading the other way + 4 more when
// it has already passed the floor. Cars out of service, and cars that do not stop at that floor, are skipped.
// Lowest cost wins; ties go to the first car in the list. Returns null when no car can answer.
final class NearestCarStrategy implements DispatchStrategy {
    @Override
    public ElevatorCar choose(List<ElevatorCar> cars, HallCall call) {
        ElevatorCar best = null;
        int bestCost = Integer.MAX_VALUE;
        for (ElevatorCar car : cars) {
            if (car.outOfService() || !car.servesFloor(call.floor())) continue;
            int cost = Math.abs(car.floor() - call.floor()) + 2 * car.pendingStops();
            if (car.direction() != Direction.IDLE) {
                if (car.direction() != call.direction()) cost += 4;
                boolean alreadyPassed = (car.direction() == Direction.UP && call.floor() < car.floor())
                        || (car.direction() == Direction.DOWN && call.floor() > car.floor());
                if (alreadyPassed) cost += 4;
            }
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
        name: "EventType.java",
        code: `enum EventType {
    DOORS_OPEN, DOORS_CLOSE, OVERLOAD,
    CALL_ASSIGNED, CALL_REASSIGNED, CALL_UNASSIGNED,
    CAR_OUT_OF_SERVICE, CAR_IN_SERVICE,
    FIRE_RECALL, FIRE_PARKED, FIRE_RESET,
    REJECTED
}
`,
      },
      {
        name: "ElevatorEvent.java",
        code: `// One thing that happened, with the tick it happened on. source is a car id, or "-" for the controller itself.
record ElevatorEvent(long tick, String source, EventType type, int floor, String message) { }
`,
      },
      {
        name: "ElevatorListener.java",
        code: `// Observer: anything that wants to hear what the elevators do (a console, an event log, a dashboard, an alarm panel).
// The cars and the controller only know this interface. Listeners are called while the controller holds its lock,
// so they must be quick and must not call back into the system.
interface ElevatorListener {
    void onEvent(ElevatorEvent event);
}
`,
      },
      {
        name: "EventLog.java",
        code: `import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

// Keeps every event, in order. Tests ask it what happened instead of parsing printed text.
final class EventLog implements ElevatorListener {
    private final List<ElevatorEvent> events = new CopyOnWriteArrayList<>();

    @Override
    public void onEvent(ElevatorEvent event) { events.add(event); }

    List<ElevatorEvent> events() { return List.copyOf(events); }

    long count(EventType type) {
        return events.stream().filter(e -> e.type() == type).count();
    }

    // The floors of all events of one type from one source, in the order they happened.
    List<Integer> floorsOf(EventType type, String source) {
        return events.stream()
                .filter(e -> e.type() == type && e.source().equals(source))
                .map(ElevatorEvent::floor)
                .toList();
    }
}
`,
      },
      {
        name: "ConsoleListener.java",
        code: `import java.util.EnumSet;
import java.util.Set;
import java.util.function.Consumer;

// Prints the message of the event types it was asked to show. Everything else is ignored.
final class ConsoleListener implements ElevatorListener {
    private final Set<EventType> show;
    private final Consumer<String> out;

    ConsoleListener(Set<EventType> show, Consumer<String> out) {
        this.show = EnumSet.copyOf(show);
        this.out = out;
    }

    @Override
    public void onEvent(ElevatorEvent event) {
        if (show.contains(event.type())) out.accept(event.message());
    }
}
`,
      },
      {
        name: "CompositeListener.java",
        code: `import java.util.List;

// Several listeners behind one. The cars and the controller still see a single ElevatorListener.
final class CompositeListener implements ElevatorListener {
    private final List<ElevatorListener> listeners;

    CompositeListener(ElevatorListener... listeners) {
        this.listeners = List.of(listeners);
    }

    @Override
    public void onEvent(ElevatorEvent event) {
        for (ElevatorListener listener : listeners) listener.onEvent(event);
    }
}
`,
      },
      {
        name: "CarStats.java",
        code: `// A read-only snapshot of one car, for the operator.
record CarStats(String carId, int floor, int floorsTravelled, int doorOpenings, int pendingStops, boolean outOfService) { }
`,
      },
      {
        name: "ElevatorCar.java",
        code: `import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

// One car. It keeps its stops in a sorted map (floor to the reasons for stopping there) and moves one floor per tick,
// LOOK style: keep going in the current direction while there is a stop ahead, reverse only when nothing is left
// ahead. A hall call is only served when the car is going the way the caller wants, or when the car has nothing
// further ahead and is about to turn round anyway. A passenger's own button is served either way.
// Not thread safe on its own: ElevatorSystem serialises every call.
final class ElevatorCar {
    private final String id;
    private final int capacityKg;
    private final ElevatorListener listener;
    private final Set<Integer> allowedFloors; // null means the car stops at every floor
    private final TreeMap<Integer, EnumSet<Want>> stops = new TreeMap<>();
    private int floor;
    private Direction direction = Direction.IDLE;
    private CarState state = CarState.IDLE;
    private int loadKg;
    private boolean outOfService;
    private boolean recalled; // fire service: go to recallFloor, open the doors and stay there
    private int recallFloor;
    private long now;         // the tick of the most recent step, stamped on events
    private int floorsTravelled;
    private int doorOpenings;

    ElevatorCar(String id, int startFloor, int capacityKg, ElevatorListener listener) {
        this(id, startFloor, capacityKg, listener, null);
    }

    // An express car stops only at the floors in allowedFloors (it may still pass the others).
    ElevatorCar(String id, int startFloor, int capacityKg, ElevatorListener listener, Set<Integer> allowedFloors) {
        this.id = id;
        this.floor = startFloor;
        this.capacityKg = capacityKg;
        this.listener = listener;
        this.allowedFloors = allowedFloors == null ? null : Set.copyOf(allowedFloors);
    }

    String id() { return id; }
    int floor() { return floor; }
    Direction direction() { return direction; }
    CarState state() { return state; }
    int pendingStops() { return stops.size(); }
    boolean outOfService() { return outOfService; }
    boolean servesFloor(int target) { return allowedFloors == null || allowedFloors.contains(target); }

    // Nothing left to do: idle with no stops, or parked with the doors open at the fire recall floor.
    boolean isIdle() {
        return (state == CarState.IDLE && stops.isEmpty()) || (recalled && state == CarState.DOORS_OPEN && floor == recallFloor);
    }

    CarStats stats() {
        return new CarStats(id, floor, floorsTravelled, doorOpenings, stops.size(), outOfService);
    }

    void addStop(int target, Want want) {
        if (!servesFloor(target)) throw new IllegalArgumentException("Car " + id + " does not stop at floor " + target);
        stops.computeIfAbsent(target, k -> EnumSet.noneOf(Want.class)).add(want);
    }

    void setLoad(int kg) { loadKg = kg; }
    void setOutOfService(boolean value) { outOfService = value; }

    // Takes the hall calls off this car so the controller can give them to other cars. The passengers' own stops stay:
    // the people inside still get out where they asked.
    List<HallCall> drainHallCalls() {
        List<HallCall> handedBack = new ArrayList<>();
        var entries = stops.entrySet().iterator();
        while (entries.hasNext()) {
            Map.Entry<Integer, EnumSet<Want>> entry = entries.next();
            for (Want want : EnumSet.of(Want.UP, Want.DOWN)) {
                if (entry.getValue().remove(want)) handedBack.add(new HallCall(entry.getKey(), want.asDirection()));
            }
            if (entry.getValue().isEmpty()) entries.remove();
        }
        return handedBack;
    }

    // Fire service: forget everything, go to the recall floor and wait there with the doors open.
    void recall(int targetFloor) {
        recalled = true;
        recallFloor = targetFloor;
        stops.clear();
        stops.put(targetFloor, EnumSet.of(Want.INSIDE));
    }

    void clearRecall() { recalled = false; }

    // One tick of simulated time.
    void step(long tick) {
        now = tick;
        if (state == CarState.DOORS_OPEN) {
            if (recalled && floor == recallFloor) return; // parked with the doors open until the alarm is reset
            if (!recalled && loadKg > capacityKg) {
                emit(EventType.OVERLOAD, "Car " + id + ": overloaded (" + loadKg + " kg > " + capacityKg + " kg), doors stay open");
                return;
            }
            state = CarState.IDLE; // doors close
            emit(EventType.DOORS_CLOSE, "Car " + id + ": doors close at floor " + floor);
            return;
        }
        if (recalled && floor == recallFloor) {
            stops.clear();
            state = CarState.DOORS_OPEN;
            doorOpenings++;
            emit(EventType.FIRE_PARKED, "Car " + id + ": parked at floor " + floor + " with doors open (fire service)");
            return;
        }
        if (serveStopsHere()) {
            state = CarState.DOORS_OPEN;
            doorOpenings++;
            emit(EventType.DOORS_OPEN, "Car " + id + ": doors open at floor " + floor);
            return;
        }
        direction = nextDirection();
        if (direction == Direction.IDLE) {
            state = CarState.IDLE;
            return;
        }
        floor += direction == Direction.UP ? 1 : -1;
        floorsTravelled++;
        state = CarState.MOVING;
    }

    // Removes the reasons that this car should serve at its current floor. Returns true when it should open the doors.
    private boolean serveStopsHere() {
        EnumSet<Want> wants = stops.get(floor);
        if (wants == null) return false;
        boolean serveEverything = direction == Direction.IDLE || !hasStopsAhead();
        boolean served = wants.remove(Want.INSIDE);
        if (serveEverything) {
            served |= !wants.isEmpty();
            wants.clear();
        } else {
            served |= wants.remove(direction == Direction.UP ? Want.UP : Want.DOWN);
        }
        if (wants.isEmpty()) stops.remove(floor);
        return served;
    }

    private boolean hasStopsAhead() {
        return switch (direction) {
            case UP -> stops.higherKey(floor) != null;
            case DOWN -> stops.lowerKey(floor) != null;
            case IDLE -> false;
        };
    }

    private Direction nextDirection() {
        Integer above = stops.higherKey(floor);
        Integer below = stops.lowerKey(floor);
        if (direction == Direction.UP && above != null) return Direction.UP;
        if (direction == Direction.DOWN && below != null) return Direction.DOWN;
        if (above != null && below == null) return Direction.UP;
        if (below != null && above == null) return Direction.DOWN;
        if (above != null) { // both sides have stops and we have no direction to keep: go to the nearer one
            return (above - floor) <= (floor - below) ? Direction.UP : Direction.DOWN;
        }
        return Direction.IDLE;
    }

    private void emit(EventType type, String message) {
        listener.onEvent(new ElevatorEvent(now, id, type, floor, message));
    }
}
`,
      },
      {
        name: "ElevatorSystem.java",
        code: `import java.util.ArrayList;
import java.util.List;

// The controller. Every public method is synchronized, so button presses from many threads and the clock thread
// that calls tick() never see a half-updated car. One lock is fine: the work inside is tiny.
// It also owns the rules that involve more than one car: dispatching hall calls, handing calls back when a car is
// taken out of service, and the building-wide fire recall.
final class ElevatorSystem {
    private final int floors;
    private final List<ElevatorCar> cars;
    private final DispatchStrategy strategy;
    private final ElevatorListener listener;
    private final List<HallCall> unassigned = new ArrayList<>(); // handed back with no car left to take them
    private long tick;
    private boolean fire;

    ElevatorSystem(int floors, List<ElevatorCar> cars, DispatchStrategy strategy, ElevatorListener listener) {
        this.floors = floors;
        this.cars = List.copyOf(cars);
        this.strategy = strategy;
        this.listener = listener;
    }

    // Returns the id of the car that will come.
    synchronized String requestHall(HallCall call) {
        requireNoFire();
        checkFloor(call.floor());
        String carId = dispatch(call, false);
        if (carId == null) {
            emit(EventType.REJECTED, "-", call.floor(), "No car can serve floor " + call.floor());
            throw new IllegalStateException("No car can serve floor " + call.floor());
        }
        return carId;
    }

    // A passenger inside a car presses a floor button.
    synchronized void selectFloor(String carId, int floor) {
        requireNoFire();
        checkFloor(floor);
        find(carId).addStop(floor, Want.INSIDE);
    }

    synchronized void tick() {
        tick++;
        for (ElevatorCar car : cars) car.step(tick);
    }

    synchronized boolean allIdle() {
        for (ElevatorCar car : cars) {
            if (!car.isIdle()) return false;
        }
        return true;
    }

    synchronized void setLoad(String carId, int kg) { find(carId).setLoad(kg); }

    // Taking a car out of service hands its hall calls to the other cars. The passengers inside are still delivered.
    // Bringing it back retries any call that had nowhere to go.
    synchronized void setOutOfService(String carId, boolean value) {
        ElevatorCar car = find(carId);
        car.setOutOfService(value);
        if (!value) {
            emit(EventType.CAR_IN_SERVICE, carId, car.floor(), "Car " + carId + " is back in service");
            List<HallCall> waiting = new ArrayList<>(unassigned);
            unassigned.clear();
            for (HallCall call : waiting) {
                if (dispatch(call, true) == null) unassigned.add(call);
            }
            return;
        }
        List<HallCall> handedBack = car.drainHallCalls();
        emit(EventType.CAR_OUT_OF_SERVICE, carId, car.floor(),
                "Car " + carId + " out of service: handing back " + handedBack.size() + " hall call(s)");
        for (HallCall call : handedBack) {
            if (dispatch(call, true) == null) {
                unassigned.add(call);
                emit(EventType.CALL_UNASSIGNED, "-", call.floor(),
                        "Hall call " + call.floor() + " " + call.direction() + " is waiting for a car");
            }
        }
    }

    // Fire alarm: every car forgets its stops, goes to the recall floor and parks there with the doors open.
    // Calls are ignored until resetFire().
    synchronized void fireAlarm(int recallFloor) {
        checkFloor(recallFloor);
        fire = true;
        unassigned.clear();
        for (ElevatorCar car : cars) car.recall(recallFloor);
        emit(EventType.FIRE_RECALL, "-", recallFloor, "Fire alarm: all cars recalled to floor " + recallFloor);
    }

    synchronized void resetFire() {
        fire = false;
        for (ElevatorCar car : cars) car.clearRecall();
        emit(EventType.FIRE_RESET, "-", 0, "Fire alarm reset: cars return to normal service");
    }

    synchronized String describe(String carId) {
        ElevatorCar car = find(carId);
        return "Car " + car.id() + " at floor " + car.floor() + " is " + car.state();
    }

    synchronized List<CarStats> stats() {
        List<CarStats> all = new ArrayList<>();
        for (ElevatorCar car : cars) all.add(car.stats());
        return all;
    }

    // Returns the id of the car that took the call, or null when no car can.
    private String dispatch(HallCall call, boolean reassigned) {
        ElevatorCar car = strategy.choose(cars, call);
        if (car == null) return null;
        car.addStop(call.floor(), Want.of(call.direction()));
        emit(reassigned ? EventType.CALL_REASSIGNED : EventType.CALL_ASSIGNED, car.id(), call.floor(),
                "Hall call " + call.floor() + " " + call.direction() + (reassigned ? " reassigned to Car " : " assigned to Car ") + car.id());
        return car.id();
    }

    private void requireNoFire() {
        if (fire) {
            emit(EventType.REJECTED, "-", 0, "Fire service: calls are ignored");
            throw new IllegalStateException("Fire service: calls are ignored");
        }
    }

    private void emit(EventType type, String source, int floor, String message) {
        listener.onEvent(new ElevatorEvent(tick, source, type, floor, message));
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
        code: `import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class Main {
    private static ElevatorListener listener(EventLog log, EventType... shown) {
        return new CompositeListener(log, new ConsoleListener(EnumSet.copyOf(List.of(shown)), System.out::println));
    }

    private static void runUntilIdle(ElevatorSystem system) {
        int guard = 0;
        while (!system.allIdle() && guard++ < 200) system.tick();
    }

    public static void main(String[] args) {
        // ---- Part 1: two cars, hall calls, passenger buttons and an overload -------------------------------
        EventLog log = new EventLog();
        ElevatorListener both = listener(log, EventType.DOORS_OPEN, EventType.OVERLOAD);
        ElevatorSystem system = new ElevatorSystem(10,
                List.of(new ElevatorCar("A", 0, 600, both), new ElevatorCar("B", 9, 600, both)),
                new NearestCarStrategy(), both);

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
        for (CarStats s : system.stats()) {
            System.out.println("Stats " + s.carId() + ": travelled " + s.floorsTravelled() + " floors, opened doors " + s.doorOpenings() + " times");
        }

        // ---- Part 2: a hall call only stops a car that is going the right way ---------------------------------
        System.out.println("-- Direction-aware hall calls");
        EventLog log2 = new EventLog();
        ElevatorListener l2 = listener(log2, EventType.DOORS_OPEN);
        ElevatorSystem s2 = new ElevatorSystem(10, List.of(new ElevatorCar("C", 0, 600, l2)), new NearestCarStrategy(), l2);
        s2.selectFloor("C", 6);
        s2.requestHall(new HallCall(3, Direction.DOWN)); // car C will pass floor 3 on its way up and must not stop
        runUntilIdle(s2);
        System.out.println("Car C opened its doors at floors " + log2.floorsOf(EventType.DOORS_OPEN, "C"));

        // ---- Part 3: a car is taken out of service on its way to a call ---------------------------------------
        System.out.println("-- A car taken out of service");
        EventLog log3 = new EventLog();
        ElevatorListener l3 = listener(log3, EventType.CAR_OUT_OF_SERVICE, EventType.CALL_REASSIGNED, EventType.DOORS_OPEN);
        ElevatorSystem s3 = new ElevatorSystem(10,
                List.of(new ElevatorCar("A", 2, 600, l3), new ElevatorCar("B", 8, 600, l3)), new NearestCarStrategy(), l3);
        s3.requestHall(new HallCall(4, Direction.UP)); // A is nearer
        s3.selectFloor("A", 6);                         // and a passenger is already inside A
        s3.tick();
        s3.setOutOfService("A", true);                  // the call goes to B, the passenger is still delivered
        runUntilIdle(s3);
        System.out.println("Car A served floors " + log3.floorsOf(EventType.DOORS_OPEN, "A")
                + " and car B served floors " + log3.floorsOf(EventType.DOORS_OPEN, "B"));

        // ---- Part 4: an express car and the fire recall ---------------------------------------------------------
        System.out.println("-- Express car and fire service");
        EventLog log4 = new EventLog();
        ElevatorListener l4 = listener(log4, EventType.FIRE_RECALL, EventType.FIRE_PARKED, EventType.FIRE_RESET);
        // L is a low-rise car (floors 0 to 9). X is an express car that only stops at 0, 10 and 20.
        Set<Integer> lowRise = IntStream.rangeClosed(0, 9).boxed().collect(Collectors.toSet());
        ElevatorCar local = new ElevatorCar("L", 5, 600, l4, lowRise);
        ElevatorCar express = new ElevatorCar("X", 0, 600, l4, Set.of(0, 10, 20));
        ElevatorSystem s4 = new ElevatorSystem(21, List.of(local, express), new NearestCarStrategy(), l4);
        System.out.println("Hall call 20 DOWN -> Car " + s4.requestHall(new HallCall(20, Direction.DOWN)));
        System.out.println("Hall call 7 UP -> Car " + s4.requestHall(new HallCall(7, Direction.UP)));
        try {
            s4.selectFloor("X", 7);
        } catch (IllegalArgumentException e) {
            System.out.println("Rejected: " + e.getMessage());
        }
        s4.tick();
        s4.tick();
        s4.fireAlarm(0);
        runUntilIdle(s4);
        try {
            s4.requestHall(new HallCall(3, Direction.UP));
        } catch (IllegalStateException e) {
            System.out.println("Rejected: " + e.getMessage());
        }
        s4.resetFire();
        s4.tick();
        System.out.println(s4.describe("L") + ", " + s4.describe("X"));
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
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static ElevatorSystem system(EventLog log, int... startFloors) {
        List<ElevatorCar> cars = new ArrayList<>();
        for (int i = 0; i < startFloors.length; i++) {
            cars.add(new ElevatorCar(String.valueOf((char) ('A' + i)), startFloors[i], 600, log));
        }
        return new ElevatorSystem(10, cars, new NearestCarStrategy(), log);
    }

    private static void runUntilIdle(ElevatorSystem system) {
        int guard = 0;
        while (!system.allIdle() && guard++ < 500) system.tick();
    }

    private static List<Integer> opened(EventLog log, String car) { return log.floorsOf(EventType.DOORS_OPEN, car); }

    public static void main(String[] args) throws Exception {
        nearestIdleCarGetsTheCall();
        stopsAreServedInSweepOrder();
        carServesTheNearerSideFirstThenReverses();
        carOutOfServiceIsSkipped();
        invalidFloorIsRejected();
        overloadKeepsTheDoorsOpen();
        callInTheCarsDirectionIsServedOnTheWay();
        callInTheOppositeDirectionWaitsForTheReturn();
        callAtTheEndOfTheSweepIsServedAtOnce();
        outOfServiceCarHandsItsCallsBack();
        callWithNoCarLeftWaitsUntilACarReturns();
        expressCarOnlyStopsAtItsFloors();
        fireRecallParksEveryCarAndIgnoresCalls();
        statsCountMovesAndDoorOpenings();
        concurrentButtonsAndTicksNeverLoseACall();
        if (failures > 0) System.exit(1);
    }

    private static void nearestIdleCarGetsTheCall() {
        ElevatorSystem s = system(new EventLog(), 0, 9);
        check(s.requestHall(new HallCall(8, Direction.DOWN)).equals("B"), "the idle car on floor 9 answers a call from floor 8");
    }

    private static void stopsAreServedInSweepOrder() {
        EventLog log = new EventLog();
        ElevatorSystem s = system(log, 0);
        s.selectFloor("A", 7);
        s.selectFloor("A", 3);
        runUntilIdle(s);
        check(opened(log, "A").equals(List.of(3, 7)), "floors 3 then 7 are served in the order the car passes them");
    }

    private static void carServesTheNearerSideFirstThenReverses() {
        EventLog log = new EventLog();
        ElevatorSystem s = system(log, 5);
        s.selectFloor("A", 2);
        s.selectFloor("A", 8);
        runUntilIdle(s);
        check(opened(log, "A").equals(List.of(8, 2)), "from floor 5 with stops at 8 and 2 (tie) it goes up first, then reverses");
    }

    private static void carOutOfServiceIsSkipped() {
        ElevatorSystem s = system(new EventLog(), 0, 9);
        s.setOutOfService("A", true);
        check(s.requestHall(new HallCall(1, Direction.UP)).equals("B"), "a car out of service never gets a call");
    }

    private static void invalidFloorIsRejected() {
        ElevatorSystem s = system(new EventLog(), 0);
        boolean rejected = false;
        try {
            s.selectFloor("A", 99);
        } catch (IllegalArgumentException e) {
            rejected = true;
        }
        check(rejected, "a floor that does not exist is rejected");
        boolean noButton = false;
        try {
            new HallCall(3, Direction.IDLE);
        } catch (IllegalArgumentException e) {
            noButton = true;
        }
        check(noButton, "a hall call without a direction is rejected");
    }

    private static void overloadKeepsTheDoorsOpen() {
        EventLog log = new EventLog();
        ElevatorSystem s = system(log, 4);
        s.setLoad("A", 900);
        s.selectFloor("A", 4);
        s.tick();
        s.tick();
        check(log.count(EventType.OVERLOAD) >= 1 && s.describe("A").contains("DOORS_OPEN"), "an overloaded car keeps its doors open");
        s.setLoad("A", 100);
        s.tick();
        check(s.describe("A").contains("IDLE"), "the doors close once the load is back under the limit");
    }

    // ---- direction-aware hall calls ----------------------------------------------------------------------

    private static void callInTheCarsDirectionIsServedOnTheWay() {
        EventLog log = new EventLog();
        ElevatorSystem s = system(log, 0);
        s.selectFloor("A", 6);
        s.requestHall(new HallCall(3, Direction.UP));
        runUntilIdle(s);
        check(opened(log, "A").equals(List.of(3, 6)), "an UP call at floor 3 is served by a car going up past it");
    }

    private static void callInTheOppositeDirectionWaitsForTheReturn() {
        EventLog log = new EventLog();
        ElevatorSystem s = system(log, 0);
        s.selectFloor("A", 6);
        s.requestHall(new HallCall(3, Direction.DOWN));
        runUntilIdle(s);
        check(opened(log, "A").equals(List.of(6, 3)), "a DOWN call at floor 3 is not served by a car going up: it waits for the way back");
    }

    private static void callAtTheEndOfTheSweepIsServedAtOnce() {
        EventLog log = new EventLog();
        ElevatorSystem s = system(log, 0);
        s.requestHall(new HallCall(5, Direction.DOWN));
        runUntilIdle(s);
        check(opened(log, "A").equals(List.of(5)), "with nothing further ahead the car serves the DOWN call where it turns round");
    }

    // ---- out of service ----------------------------------------------------------------------------------

    private static void outOfServiceCarHandsItsCallsBack() {
        EventLog log = new EventLog();
        ElevatorSystem s = system(log, 0, 9);
        check(s.requestHall(new HallCall(2, Direction.UP)).equals("A"), "car A is nearer to the call at floor 2");
        s.selectFloor("A", 6);
        s.tick();
        s.setOutOfService("A", true);
        runUntilIdle(s);
        check(log.count(EventType.CALL_REASSIGNED) == 1, "the hall call was handed to another car");
        check(opened(log, "B").equals(List.of(2)), "car B came for the call");
        check(opened(log, "A").equals(List.of(6)), "car A still delivered its passenger");
    }

    private static void callWithNoCarLeftWaitsUntilACarReturns() {
        EventLog log = new EventLog();
        ElevatorSystem s = system(log, 0);
        s.requestHall(new HallCall(3, Direction.UP));
        s.setOutOfService("A", true);
        check(log.count(EventType.CALL_UNASSIGNED) == 1, "with no other car the call is kept, not lost");
        s.setOutOfService("A", false);
        runUntilIdle(s);
        check(opened(log, "A").equals(List.of(3)), "the kept call is served once the car is back");
    }

    // ---- express and fire --------------------------------------------------------------------------------

    private static void expressCarOnlyStopsAtItsFloors() {
        EventLog log = new EventLog();
        Set<Integer> lowRise = IntStream.rangeClosed(0, 9).boxed().collect(Collectors.toSet());
        ElevatorCar local = new ElevatorCar("L", 5, 600, log, lowRise);
        ElevatorCar express = new ElevatorCar("X", 0, 600, log, Set.of(0, 10, 20));
        ElevatorSystem s = new ElevatorSystem(21, List.of(local, express), new NearestCarStrategy(), log);
        check(s.requestHall(new HallCall(20, Direction.DOWN)).equals("X"), "only the express car can answer a call from floor 20");
        check(s.requestHall(new HallCall(7, Direction.UP)).equals("L"), "the express car is never sent to floor 7");
        boolean rejected = false;
        try {
            s.selectFloor("X", 7);
        } catch (IllegalArgumentException e) {
            rejected = true;
        }
        check(rejected, "a passenger cannot select a floor the express car does not stop at");
    }

    private static void fireRecallParksEveryCarAndIgnoresCalls() {
        EventLog log = new EventLog();
        ElevatorSystem s = system(log, 5, 8);
        s.selectFloor("A", 9);
        s.requestHall(new HallCall(2, Direction.UP));
        s.tick();
        s.fireAlarm(0);
        runUntilIdle(s);
        check(log.count(EventType.FIRE_PARKED) == 2, "both cars end up parked at the recall floor");
        check(s.describe("A").contains("floor 0") && s.describe("B").contains("floor 0")
                && s.describe("A").contains("DOORS_OPEN"), "they wait there with the doors open");
        boolean ignored = false;
        try {
            s.requestHall(new HallCall(3, Direction.UP));
        } catch (IllegalStateException e) {
            ignored = true;
        }
        check(ignored, "calls are refused during a fire alarm");
        s.resetFire();
        s.tick();
        check(s.describe("A").contains("IDLE"), "after the reset the doors close");
        check(s.requestHall(new HallCall(3, Direction.UP)) != null, "calls work again after the reset");
    }

    // ---- stats and threads -------------------------------------------------------------------------------

    private static void statsCountMovesAndDoorOpenings() {
        EventLog log = new EventLog();
        ElevatorSystem s = system(log, 0);
        s.selectFloor("A", 4);
        runUntilIdle(s);
        CarStats stats = s.stats().get(0);
        check(stats.floorsTravelled() == 4 && stats.doorOpenings() == 1 && stats.floor() == 4 && stats.pendingStops() == 0,
                "stats: 4 floors travelled, doors opened once, no stops left");
    }

    private static void concurrentButtonsAndTicksNeverLoseACall() throws Exception {
        EventLog log = new EventLog();
        ElevatorSystem s = system(log, 0, 4, 9);
        ExecutorService pool = Executors.newFixedThreadPool(8);
        List<Future<?>> futures = new ArrayList<>();
        for (int t = 0; t < 6; t++) {
            final int offset = t;
            futures.add(pool.submit(() -> {
                for (int i = 0; i < 40; i++) {
                    int floor = (i * 7 + offset) % 10;
                    s.requestHall(new HallCall(floor, floor % 2 == 0 ? Direction.UP : Direction.DOWN));
                }
            }));
        }
        futures.add(pool.submit(() -> {
            for (int i = 0; i < 200; i++) s.tick();
        }));
        for (Future<?> f : futures) f.get();
        pool.shutdown();
        runUntilIdle(s);
        int pending = 0;
        for (CarStats c : s.stats()) pending += c.pendingStops();
        check(s.allIdle() && pending == 0, "240 calls and 200 ticks from 7 threads: every car ends idle with nothing pending");
        check(log.count(EventType.CALL_ASSIGNED) == 240, "every one of the 240 calls was assigned to a car");
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
      "Car A: doors open at floor 7",
      "Car A: overloaded (800 kg > 600 kg), doors stay open",
      "Car A at floor 7 is IDLE",
      "Stats A: travelled 7 floors, opened doors 3 times",
      "Stats B: travelled 1 floors, opened doors 1 times",
      "-- Direction-aware hall calls",
      "Car C: doors open at floor 6",
      "Car C: doors open at floor 3",
      "Car C opened its doors at floors [6, 3]",
      "-- A car taken out of service",
      "Car A out of service: handing back 1 hall call(s)",
      "Hall call 4 UP reassigned to Car B",
      "Car A: doors open at floor 6",
      "Car B: doors open at floor 4",
      "Car A served floors [6] and car B served floors [4]",
      "-- Express car and fire service",
      "Hall call 20 DOWN -> Car X",
      "Hall call 7 UP -> Car L",
      "Rejected: Car X does not stop at floor 7",
      "Fire alarm: all cars recalled to floor 0",
      "Car X: parked at floor 0 with doors open (fire service)",
      "Car L: parked at floor 0 with doors open (fire service)",
      "Rejected: Fire service: calls are ignored",
      "Fire alarm reset: cars return to normal service",
      "Car L at floor 0 is IDLE, Car X at floor 0 is IDLE",
    ],
  },
};

const LLD_DEEP_A_BASE: Record<string, LldDeep> = {
  "lldp-parking-lot": {
    walkthrough: [
      {
        title: "What to clarify before drawing anything",
        body: `Parking lot is the most common LLD question because it is small enough to finish and rich enough to show judgement. The first five minutes decide the rest, so spend them asking.

Ask about the vehicles: which types exist, and does a bigger vehicle ever fit in a bigger spot? (Yes in our design: a car may use a large spot if no medium one is free, but never the other way round.) Ask about the building: one floor or many, one entrance or several. Several entrances is the quiet requirement that forces you to think about concurrency, so get it said out loud. Ask about money: is the price per hour, per day, or flat, and does it differ by vehicle type? Ask what happens when the lot is full: reject, or queue? And ask what is out of scope: CCTV and number plate recognition can be waved away if the interviewer agrees.

Then ask which follow-ups are in play. Electric vehicle chargers, reservations, paying at the exit, lost tickets, an operator report and several lots are the usual ones, and this solution includes all of them. Build the core first (enter, exit, fee), get it working, and only then add each follow-up as a separate step. An interviewer who sees the core finished and then extended without a rewrite learns far more about you than one who watches you design everything at once.

Write the agreed requirements as four or five short lines on the board. Everything you build afterwards should trace back to one of those lines, and when the interviewer later says "now make it support electric vehicle charging" you can point at the line that changes.`,
      },
      {
        title: "The entities and why they look like this",
        body: `Underline the nouns in the requirements: vehicle, spot, floor, ticket, lot, price, reservation, payment, receipt. That list is a starting point, not a design, and the skill is deciding which nouns deserve a class.

Vehicle becomes a record with a plate, a type and a flag for whether it needs a charger. It has no behaviour except computing the smallest spot it fits, and it never changes, so a record is exactly right. A second constructor keeps the common case short: new Vehicle("KA01", CAR) is a petrol car, Vehicle.ev("KA02", CAR) is an electric one. We deliberately do not create Car, Bike and Truck subclasses. They would differ only in one number, and a new vehicle type would then mean a new class instead of a new enum constant.

Spot is the only mutable domain object. It has two mutable facts: who is parked there, and which plate (if any) holds it until a given time. Everything else (id, floor, size, whether it has a charger) is final. Because the spot owns its own state, it can also own the lock for that state, and that is what lets a gate and a booking app race for the same spot without any lock on the lot. This is the key idea in the concurrency section.

Floor is a noun in the requirements but not a class here. A floor would be a list of spots with no behaviour of its own, so we store the floor number on each spot and sort by it when we want the nearest one. If floors later get behaviour (a display per floor, a barrier per floor) then a Floor class earns its place; until then it is ceremony. Saying this out loud in an interview is a strength: you are showing that you add classes for reasons.

Ticket, Reservation and Receipt are records. A ticket links the vehicle, the spot and the entry time. A reservation links a plate to a spot until a deadline. A receipt is what the customer gets back from a successful checkout: fee, payment method and change. ParkingLot is the facade that enforces the rules of entry, reservation and exit, and is the only class a caller needs. Garage sits above it and only routes.`,
      },
      {
        title: "Patterns used, and the ones we rejected",
        body: `Strategy appears three times. SpotAllocationStrategy decides where to park, PricingStrategy decides what it costs, and PaymentProcessor decides how the customer pays. All three are things the business will change (park near the lift, charge more at weekends, add a new card network), and Strategy lets them change without touching ParkingLot.

Decorator appears three times as well, and it is the pattern that carries the follow-ups. DailyCapPricing wraps any pricing rule and limits it to a daily maximum. ChargingSurcharge wraps any pricing rule and adds a per-hour fee when the spot has a charger. EvAwareStrategy wraps any allocation strategy and reorders its candidates so that electric vehicles see chargers first and petrol cars see them last. Each decorator implements the same interface as the thing it wraps, so the lot never learns how many are stacked, and stacking them in Main is one line each.

Observer appears once: OccupancyListener. The display board at the entrance wants to know when counts change, and the lot should not know that a display board exists. Today there is one listener that stores the latest counts. Tomorrow it could be a mobile app feed.

Facade and Adapter are in there quietly. ParkingLot is a facade over spots, tickets, pricing and payment. CardPayment is an adapter: it turns the lot's question "charge this many cents" into the card network's question "authorize this card for this amount", and the network itself sits behind the small CardGateway interface so tests can fake it.

Patterns we rejected on purpose. Singleton for the lot: it hides a dependency, makes tests share state, and gains nothing, because Main simply creates one lot and passes it around. Factory for tickets: creating a ticket is one line and has no variation, so a factory would only be a place to hide that line. Inheritance for vehicles, for the reason above. A full State pattern for spots: a spot has three situations (free, held, occupied), but a failed move changes nothing and two fields describe all of them, so a state class per situation would be more code than the logic it replaces. Naming what you did not use, and why, earns more than listing patterns you did.`,
      },
      {
        title: "The main flow, step by step",
        body: `Entry. The caller invokes enter(vehicle). The lot first adds the plate to a set of plates currently inside; if the add fails, the same vehicle is already in the building and the request is rejected. Next it looks for a reservation for this plate and removes it from the map in the same step. If there is one and it has not expired, the lot tries to park the vehicle in the spot that was kept for it. Otherwise (no reservation, an expired one, or a hold that somehow failed) the allocation strategy returns the free spots that fit, ordered by preference, and the lot walks that list and calls tryPark on each spot until one succeeds. The first success creates a ticket with a sequence number and the current time from the injected clock, stores it in the active map, and notifies listeners. If the list runs out, the lot throws LotFullException and the plate is removed from the set so the driver can come back later.

Reservation. The caller invokes reserve(vehicle, hold). The lot asks the same allocation strategy for candidates and calls tryHold on each until one accepts, then stores the reservation by plate. The whole step runs inside ConcurrentHashMap.compute, so two requests for the same plate cannot both succeed. Someone else's tryPark on a held spot returns false until the deadline passes, which is how the spot stays kept without any timer.

Checkout. The caller invokes checkout(ticketId, payment). The lot removes the ticket from the active map; the removal is the single moment that decides whether the ticket is valid, so a second scan of the same ticket finds nothing and is rejected. Then the pricing strategy computes the fee from the ticket and the current time, and the payment processor is asked to charge that amount. If the payment is declined the ticket is put back, so the customer can try another way to pay. If it is approved, the fee is added to the revenue counters, the spot is released, the plate leaves the set, listeners are notified and a Receipt is returned. The old exit(ticketId) still exists for flows where the money was settled elsewhere: it is checkout with a processor that always approves.

Run Main to see it. The first half is the original scenario: a car, a bike and a truck enter and are assigned F0-M0, F0-S0 and F0-L0, a car that stayed 150 minutes pays for three hours, the same bike plate is turned away because it is already inside, and a third truck is rejected when both large spots are taken. The second half uses a small bay with one charger: a petrol car is kept off the charger, an electric car gets it, a reservation keeps the last spot from a stranger and gives it to its owner ten minutes later, a short cash payment is declined and then a card payment works, the electric car pays the charging surcharge, a lost ticket costs the flat penalty, and the report adds the three payments up. The third part puts two lots behind one garage.`,
      },
      {
        title: "Chargers, reservations and the garage",
        body: `Chargers need two small additions and no change to the lot. The spot gets a final flag, isEv, and the pricing and allocation each get a decorator. EvAwareStrategy splits the inner strategy's candidates into two groups, those whose charger flag matches the vehicle and those that do not, and returns the first group followed by the second. So an electric car is offered chargers first and plain spots after, and a petrol car the other way round. An electric car is allowed to take a plain spot because turning it away from a lot with free spots would be worse than not charging it. ChargingSurcharge adds a per-started-hour fee when the ticket's spot has a charger, and because it is a decorator, "hourly plus charging" and "daily cap on hourly plus charging" are one line each in Main. The order of wrapping matters and is worth a sentence in an interview: capping outside the surcharge caps the total, capping inside it caps only the parking.

Reservations are the one follow-up that changes the model, because a spot is no longer simply free or taken. The design keeps the change inside Spot. A spot has an optional hold: a plate and a deadline. tryPark refuses any vehicle whose plate is not the holder while the deadline is in the future, and tryHold refuses when the spot is occupied or held by someone else. Both read and write under the spot's own lock, which is the whole point: a booking app and a gate that want the same spot meet at the spot, and one of them wins. A hold needs no cleanup job, because a deadline in the past simply stops mattering. freeCounts counts a held spot as unavailable, so the display board does not promise a spot that is kept for someone else.

The lot stores reservations by plate in a concurrent map. reserve runs inside compute for that plate, which makes "one reservation per plate" a property of the map and not a hope. enter removes the reservation with the same atomic step, so a reservation can be used only once, and an expired one is cleared and the vehicle parks like anyone else.

The Garage is the smallest design in the project and the one that shows restraint. It holds named lots in a fixed order and tries each in turn until one accepts the vehicle. It keeps its own set of plates because each lot only knows about its own, and one vehicle must not be inside two lots. Its ticket id is the lot name, a slash and the lot's ticket id, so every lot can number its tickets from one. ParkingLot does not know the garage exists. If the rule were "closest lot to the driver" or "emptiest lot", only the order in which the garage tries the lots would change.`,
      },
      {
        title: "Payment, lost tickets and the operator report",
        body: `Payment is a Strategy called PaymentProcessor with one method, charge(amountCents), that returns a PaymentResult: approved or declined, the method name, the change and a note. CashPayment compares the money handed over with the fee and returns the change. CardPayment asks a CardGateway to authorize the amount and reports the answer. The lot never imports a card SDK, and the tests pass a lambda as the gateway, so a decline is one line to set up. A processor that throws is treated like a decline for the ticket's sake: the ticket is put back and the exception is rethrown, so a crash in the payment code can never swallow a ticket.

Why does the ticket leave the map before payment, and come back after a decline? Because the removal is what makes only one caller own the checkout at a time. While one caller is mid-payment, a second scan of the same ticket gets InvalidTicketException instead of racing the first. If the first caller fails to pay, the ticket returns and the customer, or the next try, can pay again. The cost is a short window where a valid ticket looks invalid. That is a deliberate trade: the alternative, a per-ticket lock held during a network call, would block a gate on a slow card terminal.

A lost ticket is found by plate. The lot scans the active tickets for the plate, removes that ticket (if the removal fails, another gate got it first and the request is rejected), and charges the larger of the real fee and a flat penalty. A short stay pays the penalty, which is the point, and a very long stay pays what it actually cost, so losing a ticket never makes parking cheaper. A real lot would also check the driver's identity against the registration. That is out of scope here and worth saying so.

The report is for the operator. The lot keeps LongAdder counters for revenue and completed stays and one per vehicle type, all updated only after an approved payment, so a declined attempt adds nothing. LotReport is an immutable snapshot: revenue, stays, open tickets, revenue by type and the free spots at that moment. The Garage report sums the lots and keeps each lot's own report next to the total. LongAdder is chosen because many gates add at once and almost nobody reads, which is the case it is built for.`,
      },
      {
        title: "Money, time and testing",
        body: `Money is a long in the smallest unit. Doubles cannot represent 0.10 exactly, and the errors show up as a missing cent on a receipt. Whenever an interviewer sees a double next to a price, they note it.

Time comes from a Clock that is passed in. The lot never calls Instant.now(), so a test can use MutableClock, advance it by 61 minutes, and assert the fee without sleeping. The same clock drives reservation deadlines: the test that reserves a spot for 30 minutes, advances 31 and sees the spot free again takes no time at all. This is the cheapest improvement you can make to a design and it is worth doing in every problem that involves time.

The tests run without JUnit so you can copy the files into a folder and run them. They cover the core: the smallest fitting spot wins; a full lot rejects the next vehicle; fees round up to whole hours (0 minutes costs one hour, 60 minutes one hour, 61 minutes two hours); the daily cap; a plate cannot enter twice; a ticket cannot be redeemed twice; and one hundred cars racing for twenty spots yields exactly twenty tickets. They also cover the follow-ups: an electric car is offered the charger first and a petrol car is not; the charging surcharge counts started hours; a reserved spot is kept for its plate, a stranger is turned away and the holder gets it; a reservation expires and can be cancelled; one plate cannot hold two reservations; a declined payment keeps the ticket valid and a later card payment succeeds; cash returns change; a lost ticket pays the larger of the penalty and the real fee; the report adds up by vehicle type; the garage overflows to its second lot and refuses one plate in two lots; and fifty plates racing for ten spots make exactly ten reservations on ten different spots.

Two of these tests are the ones that fail if you take a shortcut. The hundred-cars test fails if you replace tryPark with a check and then a write, and the fifty-plates test fails if you check a spot's hold outside its lock. Showing an interviewer a test that your own design makes pass, and the broken version makes fail, is a strong move.`,
      },
      {
        title: "How to extend it",
        body: `Each extension below should touch as little code as possible, and saying which classes change is the answer the interviewer wants. The first few are already built here, so you can point at the code.

A new vehicle type, such as a van: add a constant to VehicleType, add its case in Vehicle.minSize, add its rate to the pricing map. Nothing else changes.

Electric vehicle charging spots: built. The capability is a flag on Spot, the allocation change is EvAwareStrategy, the pricing change is ChargingSurcharge. If chargers need energy-based pricing, ChargingSurcharge is the class to replace, and it needs the kilowatt hours from somewhere, which is a new input to the ticket or a meter service.

Reservations: built, inside Spot. If reservations must survive a restart, Reservation becomes a stored entity and the hold is rebuilt from it at start-up.

Payment, lost tickets and reports: built. If receipts must be emailed or printed, that is an observer on checkout, not a change to checkout. If refunds are needed, a Receipt is the thing to refund against, which is why it carries the ticket id and the method.

Several lots: built as Garage. A smarter routing rule changes only the order in which Garage tries lots.

Persistence: replace the in-memory map of active tickets with a repository interface. The lot should not care whether tickets live in memory or in a database. If the lot must survive a restart, spots, tickets and reservations need to be reloaded consistently, and the write that matters most is the ticket, written before the barrier opens.

Still open and worth naming: valet and handicapped spots (a capability on Spot, like the charger), monthly passes (a PaymentProcessor or a PricingStrategy that recognises the plate), and faster allocation, where a free list per size ordered by floor replaces the scan.`,
      },
      {
        title: "What interviewers probe, and short answers",
        body: `Why is there no global lock? Because the contention is per spot, not per lot. A global lock makes entries from several gates queue behind each other, while per-spot locking lets them proceed in parallel and only serialises two gates that want the same spot.

What if the strategy returns a spot that another gate takes first? That is why the strategy returns a list and the lot calls tryPark on each: a failed tryPark just moves to the next candidate. The same holds for a spot that gets reserved between listing and parking: tryPark refuses it and the lot moves on.

How does a reservation race with a gate? Both go through the spot's lock. tryHold and tryPark each check "occupied or held by someone else" and then write, as one step, so there is no moment where both can believe they won.

Why is the ticket removed from the map before computing the fee? So that the removal acts as the atomic check, making a ticket single-use even under concurrency. A declined payment puts the ticket back.

What if the payment succeeds but the process dies before the spot is released? The customer has paid and the car is still marked inside. That is the argument for writing the payment record and the release in one transaction when the lot is backed by a database, and for making release idempotent.

How do you scale this to a hundred lots? Each lot is independent, so shard by lot id. The only shared data is the plate set per lot, which stays inside the lot, and the garage's own plate set if lots share a garage.

How would you find a nearby spot faster than scanning all of them? Keep a free list per size, as a priority queue ordered by floor, so allocation is logarithmic instead of linear. We scan because the interviewer's lot has hundreds of spots, not millions, and the scan is simple; say so and offer the optimisation.

What happens if the process crashes with cars inside? In memory, you lose the tickets. State what you would persist: spots, active tickets and reservations, written before the barrier opens.

Why LongAdder for revenue? Many gates add and rarely anyone reads. LongAdder spreads the contention over cells and sums them on read, which beats a single AtomicLong under load, at the cost of a sum that is not a point-in-time snapshot while writes continue.`,
      },
    ],
    classDiagram: `classDiagram
    class ParkingLot {
        +enter(vehicle) Ticket
        +reserve(vehicle, hold) Reservation
        +cancelReservation(plate)
        +checkout(ticketId, payment) Receipt
        +lostTicket(plate, payment) Receipt
        +exit(ticketId) long
        +freeCounts() Map
        +report() LotReport
        +addListener(listener)
    }
    class Garage {
        +enter(vehicle) GarageTicket
        +checkout(ticketId, payment) Receipt
        +report() GarageReport
    }
    class Spot {
        +tryPark(vehicle, now) boolean
        +tryHold(plate, until, now) boolean
        +clearHold(plate)
        +release()
        +isFree() boolean
        +isAvailableAt(now) boolean
        +isEv() boolean
    }
    class Ticket {
        <<record>>
        id
        vehicle
        spot
        entry
    }
    class Reservation {
        <<record>>
        id
        plate
        spot
        expires
    }
    class Receipt {
        <<record>>
        ticketId
        feeCents
        method
        changeCents
    }
    class Vehicle {
        <<record>>
        plate
        type
        electric
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
    class PaymentProcessor {
        <<interface>>
        +charge(amountCents) PaymentResult
    }
    class CardGateway {
        <<interface>>
        +authorize(card, amountCents) boolean
    }
    class OccupancyListener {
        <<interface>>
        +onChange(freeBySize)
    }
    Garage o-- ParkingLot
    ParkingLot o-- Spot
    ParkingLot ..> Ticket : issues
    ParkingLot ..> Reservation : keeps
    ParkingLot ..> Receipt : returns
    ParkingLot --> SpotAllocationStrategy
    ParkingLot --> PricingStrategy
    ParkingLot --> PaymentProcessor
    ParkingLot --> OccupancyListener
    Ticket --> Spot
    Ticket --> Vehicle
    Reservation --> Spot
    SpotAllocationStrategy <|.. NearestSpotStrategy
    SpotAllocationStrategy <|.. EvAwareStrategy
    EvAwareStrategy o-- SpotAllocationStrategy : wraps
    PricingStrategy <|.. HourlyPricing
    PricingStrategy <|.. DailyCapPricing
    PricingStrategy <|.. ChargingSurcharge
    DailyCapPricing o-- PricingStrategy : wraps
    ChargingSurcharge o-- PricingStrategy : wraps
    PaymentProcessor <|.. CashPayment
    PaymentProcessor <|.. CardPayment
    CardPayment --> CardGateway
    OccupancyListener <|.. DisplayBoard`,
    sequenceDiagram: `sequenceDiagram
    actor Driver
    participant Lot as ParkingLot
    participant Alloc as SpotAllocationStrategy
    participant Spot
    participant Board as DisplayBoard
    Driver->>Lot: enter(vehicle)
    Lot->>Lot: plate already inside? reject
    Lot->>Lot: reservations.remove(plate)
    alt live reservation
        Lot->>Spot: tryPark on the reserved spot
        Spot-->>Lot: true
    else none, expired or failed
        Lot->>Alloc: candidates(spots, vehicle)
        Alloc-->>Lot: free spots, best first
        loop until one is taken
            Lot->>Spot: tryPark(vehicle, now)
            Spot-->>Lot: true or false
        end
    end
    Lot->>Lot: store ticket in the active map
    Lot->>Board: onChange(free counts)
    Lot-->>Driver: Ticket`,
    concurrency: [
      "Two gates choosing the same spot: Spot.tryPark is synchronized on the spot, so exactly one wins and the other moves to its next candidate. There is no lock on the lot.",
      "A reservation and a gate wanting the same spot: tryHold and tryPark both check and write under the spot's own lock, so there is no moment where both can win. A hold by one plate makes tryPark fail for every other plate until its deadline.",
      "Two reservations for the same plate: reserve runs inside ConcurrentHashMap.compute for that plate, so the second caller sees the first one's reservation and is rejected. Different plates do not block each other.",
      "The same ticket scanned twice: active.remove on a ConcurrentHashMap is atomic, so only one caller gets the ticket and the other is rejected with InvalidTicketException. A declined payment puts the ticket back, which opens a short window where a valid ticket looks invalid. That is the price of never holding a lock during a payment call.",
      "The same vehicle entering twice at once: the plate set uses an atomic add, so the second attempt fails before any spot is touched. The garage keeps its own plate set for the same reason across lots.",
      "Revenue counters: LongAdder cells are updated only after an approved payment, so a declined attempt never counts. A report taken while writes continue is a consistent-enough sum, not a snapshot.",
      "Display boards: listeners receive an immutable snapshot of the counts, and the list of listeners is copy-on-write, so adding a listener never blocks entries.",
      "What is not guaranteed: freeCounts() is a snapshot, so it can be slightly stale by the time you read it. That is fine for a display, and wrong for deciding whether a car fits. Always decide through tryPark or tryHold.",
    ],
  },

  "lldp-elevator": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `An elevator is not one problem, it is three: how a single car decides where to go next, how a building with several cars decides which car answers a call, and how all of that behaves when requests arrive from different threads. Clarify which of them the interviewer cares about, and fix the scope in writing.

Ask: how many floors and cars? Are there two buttons per floor (up and down) or one? Is there a button panel inside the car? Do we care about weight limits, doors, emergency stop and maintenance mode? Do some cars skip floors? What happens in a fire? Is this a simulation or real control software? The answer to the last one matters most. We build a simulation with a clock: time advances in ticks, and each tick every car does one thing, either moving one floor or handling its doors. That keeps the design testable and deterministic.

State your assumptions as requirements: floors numbered from 0, several cars, a hall call carries a floor and a direction, passengers inside press floor buttons, a car has a weight limit, a car can be taken out of service, a car may be an express car that stops only at some floors, and a fire alarm sends every car to one floor. Then build in layers. First one car and its sweep, then dispatch across cars, then the follow-ups one at a time. The code in this project is built in that order, and each layer is a separate section below.`,
      },
      {
        title: "Responsibilities: who knows what",
        body: `ElevatorCar owns everything about one car: its floor, its direction, its door state, its load, the floors it may stop at and its map of stops. It knows nothing about other cars or about how requests were chosen. That separation is the whole design, so it is worth stating: the car decides how to serve its stops, and someone else decides which stops it gets.

ElevatorSystem is the controller and the only public entry point. It accepts hall calls and floor selections, asks the strategy which car should take a call, drives the clock with tick(), validates floors, and owns the rules that involve more than one car: handing calls back when a car leaves service, and the building-wide fire recall.

DispatchStrategy answers one question: given the cars and a call, which car? It is an interface because this is the part every real building tunes, and because it is easy to swap in an interview extension.

Want is a small enum that records why a car has to stop at a floor: a passenger inside pressed it (INSIDE), or someone on the floor pressed UP or DOWN. It is the reason a stop is a map entry and not just a number. HallCall is a record of a floor and a direction, and it refuses IDLE because a button with no direction does not exist.

ElevatorListener is the observer. The cars and the controller report what they do as ElevatorEvent records, and anything may listen: ConsoleListener prints the event types it is asked to show, EventLog keeps everything for tests, CompositeListener fans one event out to several listeners. CarStats is the read-only snapshot for an operator.

Notice what is missing: no Floor class, no Button class, no Door class. Buttons are method calls, doors are a state, and a floor is an int. A reader should be able to see the shape of the whole system in a minute.`,
      },
      {
        title: "How one car decides where to go",
        body: `The simplest policy, first come first served, is also the worst: a car at floor 1 asked for 9, then 2, then 8 would run up and down for no reason. Real elevators use the sweep idea known as SCAN or LOOK: keep moving in the current direction while there are stops ahead, serve them in the order you pass them, and reverse only when nothing is left ahead.

The car keeps its stops in a TreeMap from floor to the set of reasons for stopping there, which is sorted by floor. nextDirection asks two cheap questions: is there a stop above (higherKey) and is there a stop below (lowerKey)? If it was going up and there is still a stop above, it keeps going up. If it was going down and there is one below, it keeps going down. If only one side has stops, it goes that way. If both sides have stops and it has no direction to keep, it chooses the nearer side.

Trace it. A car at floor 0 holds stops 3 and 7. Ticks 1 to 3: it moves to 1, 2, 3. Tick 4: floor 3 is a stop, so it opens its doors and removes the stop. Tick 5: the doors close. Ticks 6 to 9: it moves to 4, 5, 6, 7. Tick 10: it opens at 7. Tick 11: the doors close, no stops are left, the car is idle. A sorted map makes each decision O(log n) and removes the need for separate up and down lists.

LOOK can starve a request in theory if people keep adding stops ahead, but with a bounded number of floors a stop behind the car is reached after at most one sweep, so waiting is bounded. That is the property to quote.`,
      },
      {
        title: "Direction-aware hall calls",
        body: `The first version of this design treated every stop alike, and that has a visible bug. A person on floor 3 presses DOWN. A car heading up from floor 0 to floor 6 passes floor 3, sees a stop there, and opens its doors. The person steps in, and the car carries them up to 6, away from where they wanted to go. A stop must remember why it exists.

That is what Want is for. A passenger's own button is INSIDE: the car stops whichever way it is going, because the person is already aboard. A hall button is UP or DOWN, and the car should stop for it only when it is going that way. When a car arrives at a floor with stops, serveStopsHere decides what to serve. It always serves INSIDE. It serves a hall call whose direction matches the car's direction. And it serves everything when the car has nothing further ahead, or when the car is idle, because a car that is about to turn round at this floor is about to go the caller's way anyway.

The scenario in Main shows all three branches. Car C starts at floor 0 with a passenger going to 6 and a DOWN call at 3. It rises through 3 without stopping, because a DOWN call does not fit a car going up and there is a stop (6) still ahead. It opens at 6, reverses, and opens at 3 on the way down, where the stop is served because the car is now going down. Had there been a UP call at 3, the car would have stopped on the way up. And a lone DOWN call at 5 with nothing else pending is served on arrival, because nothing lies ahead and the car is about to turn.

The rule has a cost in the dispatch strategy too. A car that is already moving away from the call, or moving the other way, will reach it late, so NearestCarStrategy adds a penalty for both. The two classes agree on what "on the way" means, and a good answer in an interview says so: the sweep rule is local to the car, the cost rule predicts it from outside.`,
      },
      {
        title: "How a building picks a car",
        body: `NearestCarStrategy assigns each call a cost and picks the lowest. The cost is the distance from the car to the call, plus two for each stop the car already has (a busy car is slower than it looks), plus four if the car is currently heading the opposite way to the call, plus four more if it has already passed the floor. Cars out of service are skipped, and so are cars that do not stop at the call's floor. Ties go to the first car in the list, which keeps behaviour deterministic. If no car qualifies the strategy returns null and the controller rejects the call.

Example from Main: cars A at floor 0 and B at floor 9. A hall call at floor 3 going up costs 3 for A and 6 for B, so A takes it. A second call at floor 8 going down costs 8 + 2 (A already has a stop) = 10 for A and 1 for B, so B takes it. The numbers are arbitrary, and you should say so: what matters is that distance, load, direction and floor access all enter the cost and that the weights are in one place that can be tuned.

Be ready to name the alternatives. Zoning assigns cars to floor ranges and is simple and predictable. Destination dispatch, used in tall buildings, asks passengers for their destination floor before they board and groups people going to the same place, which raises throughput a lot at the price of a keypad in every lobby. A scoring function like ours is the middle path.

The strategy is a pure function of the cars' state, which means you can unit-test it without a clock: build cars at known floors, make a call, and check the answer.`,
      },
      {
        title: "Out of service, express cars and fire recall",
        body: `Out of service. Taking a car out of service in the middle of a trip raises a question: what happens to the people who pressed buttons? The design answers it in two parts. The hall calls the car had accepted are handed back: the car's drainHallCalls removes every UP and DOWN reason from its map and returns them, and the controller dispatches each one again through the strategy, which now skips that car. The passengers inside are still delivered: their INSIDE stops stay, so the car finishes its trip and then stays where it is. If no other car can take a handed-back call, the controller keeps it in a waiting list, reports CALL_UNASSIGNED, and tries again when a car comes back into service. A call is never silently lost, and the test for it is one of the more useful ones.

Express cars. A car may be given a set of floors it stops at. servesFloor answers whether it does, addStop refuses a floor outside the set (so a passenger cannot press a button the express car does not stop at), and the dispatch strategy skips the car for calls at other floors. This is a small change, but it is a good illustration of putting a rule where the data lives: the car knows its floors, so the car enforces them, and the strategy only asks. In Main the low-rise car stops at floors 0 to 9 and the express car only at 0, 10 and 20, so a call from floor 20 can only go to the express car and a call from 7 can only go to the low-rise car.

Fire recall. A fire alarm overrides everything. fireAlarm(floor) tells every car to recall: the car forgets all its stops, gets one stop at the recall floor, and the controller starts refusing all calls with a clear message. When a recalled car arrives it opens its doors and stays open, reporting FIRE_PARKED, and it counts as idle so a loop that waits for the building to settle can end. A car that has its doors open elsewhere closes them (ignoring the overload rule) and goes. resetFire clears the recall, and the next tick closes the doors. Two details are worth saying out loud. The recall is a car-level mode and not a new CarState, because the car still moves and opens doors in the usual way; the mode only changes what it is allowed to want. And the real standard (recall, then firefighter-controlled service) has more phases than this, which we leave out and say so.`,
      },
      {
        title: "State, ticks, doors and events",
        body: `A car has three states: IDLE, MOVING and DOORS_OPEN. Each tick does exactly one thing. If the doors are open, close them, unless the car is overloaded, in which case report a warning and keep them open. Otherwise, if the car is at a floor it was asked to stop at (and the direction rule says to serve it), open the doors. Otherwise decide a direction and move one floor, or stay idle if there is nothing to do.

Why a tick-driven design instead of timers and threads inside each car? Because it is deterministic. A test that calls tick() eleven times and asserts what happened is exact, while a test that sleeps is slow and flaky. In production the same code would be driven by a scheduler: one tick every second.

The overload rule shows how a new requirement lands in the design: it is a single check at the door-closing step. The car stays in DOORS_OPEN until the load falls under the capacity. No new state was needed, because "doors open" already means "not leaving yet".

Everything the system does is also an event: doors opening and closing, an overload, a call assigned or reassigned, a car leaving or rejoining service, the fire recall. Cars and the controller send events to an ElevatorListener and know nothing about who is listening. The tests listen with EventLog and ask questions such as "at which floors did car C open its doors, in order?", which is much more robust than comparing printed strings. Main listens with ConsoleListener and chooses which event types to print, so the same run can be quiet or chatty. Events carry the tick they happened on, which also makes a replayable audit trail.

Run Main to see the whole thing. Part 1: both hall calls are assigned, the cars sweep to their stops, everything is idle after 11 ticks, and car A, overloaded at floor 7, keeps its doors open until the load is reduced; the stats show car A travelled 7 floors and opened its doors 3 times. Part 2: the DOWN call waits for the way back. Part 3: car A leaves service and its call goes to car B. Part 4: the express car takes the call from floor 20, a button it does not serve is refused, a fire alarm parks both cars at floor 0 and refuses calls, and a reset brings them back.`,
      },
      {
        title: "Concurrency and testing",
        body: `Button presses come from many threads and the clock comes from another. The design uses one lock: every public method of ElevatorSystem is synchronized. That is correct and fast enough, because each call does a handful of operations on small collections. Cars are not thread safe by themselves, and the comment says so; they are only ever touched while holding the controller's lock. Listeners are called under that lock too, so a listener must be quick, and the contract says it must not call back into the system.

A different answer, which many people prefer, is to have all requests go through a queue consumed by a single control thread, so the cars need no locks at all. State both options, and note the trade: the lock is simpler, the queue scales better and makes ordering explicit.

The tests (28 checks, no JUnit) cover the sweep: the nearest idle car gets the call; stops are served in sweep order; a car with stops on both sides picks the nearer first and then reverses; an out-of-service car never gets a call; an invalid floor and a hall call without a direction are rejected; an overloaded car keeps its doors open and closes them once the load is fixed. They cover the direction rule: an UP call is served on the way up, a DOWN call waits for the return, and a call at the end of the sweep is served at once. They cover the follow-ups: an out-of-service car hands its calls to another car and still delivers its passenger; a call with no car left waits until a car returns; an express car only stops at its floors and a passenger cannot select another; a fire alarm parks every car with its doors open, refuses calls, and a reset restores service; the stats count floors and door openings. The last test sends 240 hall calls from six threads while a seventh thread ticks the clock, and then checks that every call was assigned and every car ends idle with nothing pending.

Two of these are worth showing off. The DOWN-call test fails against the first version of the car, where every stop was served the same way, so it documents the bug the direction rule fixes. And the concurrency test exists to catch a missing lock: without synchronized on the controller, a car's stop map could be changed by one thread while another is stepping the car, which is a data race that shows up as an exception or a lost call.`,
      },
      {
        title: "Extensions and short answers",
        body: `Built here, so you can point at the code: a car taken out of service hands its calls back (ElevatorSystem.setOutOfService and ElevatorCar.drainHallCalls), express cars (the allowed floors on the car), fire service (recall and resetFire), direction-aware hall calls (Want), an event trail (ElevatorListener, EventLog) and per-car stats (CarStats).

Still open and worth naming. Energy saving: park idle cars at the busiest floor with a strategy that runs when the system is idle. Door obstruction and the door-open button: a new input to the DOORS_OPEN state that restarts the dwell time. A dwell time: right now doors close after one tick, and a real car holds them for a few. Priority modes such as VIP or service lifts: a strategy or a car mode, like fire recall. Persistence: events are already the natural thing to store, and a car's state can be rebuilt by replaying them.

How would you test the dispatch strategy without a clock? Build cars at known floors and call choose. It is a function of the cars' state.

What if two calls arrive in the same tick for the same floor? The second adds the same reason to the same set, which changes nothing. A stop is a set of reasons, so repeated presses are free.

Why is Want a set per floor and not a list of requests? Because what the car needs to know is which reasons exist for stopping at a floor, not how many people pressed. It keeps the map small and the sweep logic simple.

What stops a call from being starved? The sweep. A call behind the car is reached after at most one pass over the building, and the dispatch cost keeps assigning calls to the cars that are closest and least busy.

What would you change for a real controller? Replace ticks with a scheduler, make the dwell time configurable, put the control loop on one thread with a queue, persist the event stream, and make the dispatch strategy aware of load (passengers per car) and not only of stops.`,
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
        +fireAlarm(floor)
        +resetFire()
        +stats() List
    }
    class ElevatorCar {
        -stops TreeMap
        -floor int
        -direction Direction
        -state CarState
        -allowedFloors Set
        +addStop(floor, want)
        +drainHallCalls() List
        +recall(floor)
        +servesFloor(floor) boolean
        +step(tick)
    }
    class DispatchStrategy {
        <<interface>>
        +choose(cars, call) ElevatorCar
    }
    class ElevatorListener {
        <<interface>>
        +onEvent(event)
    }
    class HallCall {
        <<record>>
        floor
        direction
    }
    class ElevatorEvent {
        <<record>>
        tick
        source
        type
        floor
        message
    }
    class CarStats {
        <<record>>
        carId
        floorsTravelled
        doorOpenings
    }
    class Want {
        <<enumeration>>
        INSIDE
        UP
        DOWN
    }
    class EventType {
        <<enumeration>>
        DOORS_OPEN
        OVERLOAD
        CALL_REASSIGNED
        FIRE_RECALL
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
    ElevatorSystem --> ElevatorListener
    ElevatorCar --> ElevatorListener
    DispatchStrategy <|.. NearestCarStrategy
    ElevatorListener <|.. ConsoleListener
    ElevatorListener <|.. EventLog
    ElevatorListener <|.. CompositeListener
    CompositeListener o-- ElevatorListener
    ElevatorSystem ..> HallCall
    ElevatorSystem ..> CarStats
    ElevatorCar ..> ElevatorEvent : emits
    ElevatorCar --> Want
    ElevatorCar --> Direction
    ElevatorCar --> CarState
    ElevatorEvent --> EventType`,
    sequenceDiagram: `sequenceDiagram
    actor Passenger
    participant Sys as ElevatorSystem
    participant Strat as DispatchStrategy
    participant Car as ElevatorCar
    participant L as ElevatorListener
    participant Clock
    Passenger->>Sys: requestHall(floor 3, UP)
    Sys->>Strat: choose(cars, call)
    Strat-->>Sys: Car A
    Sys->>Car: addStop(3, UP)
    Sys->>L: onEvent(CALL_ASSIGNED)
    Sys-->>Passenger: Car A is coming
    loop every tick
        Clock->>Sys: tick()
        Sys->>Car: step(tick)
        Car->>Car: serve the stop here or move one floor
        Car->>L: onEvent(DOORS_OPEN) when it opens
    end`,
    stateDiagram: `stateDiagram-v2
    [*] --> Idle
    Idle --> Moving: a stop exists on another floor
    Idle --> DoorsOpen: a stop exists on this floor
    Moving --> Moving: next floor is not served here
    Moving --> DoorsOpen: arrived at a stop it serves
    DoorsOpen --> DoorsOpen: overloaded
    DoorsOpen --> Idle: doors close
    DoorsOpen --> DoorsOpen: parked at the fire recall floor
    DoorsOpen --> Idle: fire alarm reset`,
    concurrency: [
      "All public methods of ElevatorSystem are synchronized, so requests from many threads and the clock thread never interleave inside a car. Cars are only touched while the controller's lock is held.",
      "Alternative to mention: route every request through a queue read by one control thread. Cars then need no locking at all, and the order of events is explicit and replayable.",
      "tick() steps every car under the same lock, so a hall call can never observe two cars half-updated, and the dispatch cost is computed on a consistent view.",
      "Handing calls back when a car leaves service happens inside one synchronized method: the car's calls are drained and re-dispatched before any other thread can add a stop, so a call is never in two cars or in none.",
      "Listeners run while the lock is held. A slow listener would stall the whole building, so in production an event listener should only put the event on a queue. The EventLog here uses a copy-on-write list, so reading it from a test thread never blocks.",
      "The fire alarm sets one flag under the lock. Every later call sees it and is refused, so there is no window where a call sneaks in half-way through the recall.",
    ],
  },
};

export const LLD_DEEP_A: Record<string, LldDeep> = Object.fromEntries(
  Object.entries(LLD_DEEP_A_BASE).map(([id, d]) => [id, { ...d, extraDiagrams: LLD_EXTRA_DIAGRAMS_A[id] ?? [] }]),
);
