import type { LldProject } from "./types";

// Hotel reservation (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when it was written.

export const LLD_PROJECTS_E_HOTEL: Record<string, LldProject> = {
  "lldp-hotel": {
    files: [
      {
        name: "Calendar.java",
        code: `import java.time.LocalDate;

// The only way any class here learns today's date, so cancellation windows, no-shows and check-in are tested by moving it.
interface Calendar {
    LocalDate today();
}
`,
      },
      {
        name: "ManualCalendar.java",
        code: `import java.time.LocalDate;

final class ManualCalendar implements Calendar {
    private LocalDate today;

    ManualCalendar(LocalDate start) { this.today = start; }

    @Override
    public synchronized LocalDate today() { return today; }

    synchronized void set(LocalDate date) { today = date; }

    synchronized void advanceDays(int days) { today = today.plusDays(days); }
}
`,
      },
      {
        name: "RoomType.java",
        code: `// A kind of room that guests book (Standard, Deluxe, Suite). Guests book a type for dates; a physical room is chosen at
// check-in. baseCents is the price of one night before any rule is applied.
record RoomType(String id, String name, int capacity, int baseCents, int rank) { }
`,
      },
      {
        name: "RoomStatus.java",
        code: `enum RoomStatus { CLEAN, OCCUPIED, DIRTY, OUT_OF_ORDER }
`,
      },
      {
        name: "Room.java",
        code: `// A physical room. Guarded by the lock of the Hotel (assignment and housekeeping are quick and rare compared with booking).
final class Room {
    final String number;
    final RoomType type;
    RoomStatus status = RoomStatus.CLEAN;
    String guest;

    Room(String number, RoomType type) {
        this.number = number;
        this.type = type;
    }
}
`,
      },
      {
        name: "PlanType.java",
        code: `// The rate plan a guest chooses at booking. It decides the price and what a cancellation costs.
enum PlanType { FLEXIBLE, STRICT, NON_REFUNDABLE }
`,
      },
      {
        name: "StayStatus.java",
        code: `enum StayStatus { BOOKED, CHECKED_IN, CHECKED_OUT, CANCELLED, NO_SHOW, WALKED }
`,
      },
      {
        name: "Reservation.java",
        code: `import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

// A guest's claim on a room type for the nights from checkIn up to (not including) checkOut. All changes to a reservation
// happen inside the Hotel's methods.
final class Reservation {
    final String id;
    final String guest;
    final RoomType type;
    final PlanType plan;
    LocalDate checkIn;
    LocalDate checkOut;
    int totalCents;            // price of all nights
    int depositCents;          // paid at booking: the first night
    int refundedCents;
    int extrasCents;           // minibar, parking and the like, added during the stay
    StayStatus status = StayStatus.BOOKED;
    String roomNumber;
    final List<String> notes = new ArrayList<>();

    Reservation(String id, String guest, RoomType type, PlanType plan, LocalDate checkIn, LocalDate checkOut) {
        this.id = id;
        this.guest = guest;
        this.type = type;
        this.plan = plan;
        this.checkIn = checkIn;
        this.checkOut = checkOut;
    }

    int nights() { return (int) java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut); }
}
`,
      },
      {
        name: "RateRule.java",
        code: `import java.time.LocalDate;

// One rule that changes the price of one night. Rules are applied one after another, in order, so the result of one is the
// input of the next. A new rule (holiday, event, member discount) is a new class.
interface RateRule {
    int apply(LocalDate night, int cents, int nightsInStay);
}
`,
      },
      {
        name: "SeasonalRate.java",
        code: `import java.time.LocalDate;

// A multiplier in percent for nights inside a date range (inclusive): 150 means 50 percent more.
final class SeasonalRate implements RateRule {
    private final LocalDate from;
    private final LocalDate to;
    private final int percent;

    SeasonalRate(LocalDate from, LocalDate to, int percent) {
        this.from = from;
        this.to = to;
        this.percent = percent;
    }

    @Override
    public int apply(LocalDate night, int cents, int nights) {
        return !night.isBefore(from) && !night.isAfter(to) ? cents * percent / 100 : cents;
    }
}
`,
      },
      {
        name: "WeekendRate.java",
        code: `import java.time.DayOfWeek;
import java.time.LocalDate;

// Friday and Saturday nights cost 20 percent more.
final class WeekendRate implements RateRule {
    @Override
    public int apply(LocalDate night, int cents, int nights) {
        DayOfWeek d = night.getDayOfWeek();
        return d == DayOfWeek.FRIDAY || d == DayOfWeek.SATURDAY ? cents * 120 / 100 : cents;
    }
}
`,
      },
      {
        name: "LongStayDiscount.java",
        code: `import java.time.LocalDate;

// 10 percent off every night of a stay of seven nights or more.
final class LongStayDiscount implements RateRule {
    @Override
    public int apply(LocalDate night, int cents, int nights) { return nights >= 7 ? cents * 90 / 100 : cents; }
}
`,
      },
      {
        name: "RateCalculator.java",
        code: `import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

// Prices a stay: the base price of the room type, then every rule in turn, then the plan's own adjustment. The result is a
// list with one price per night, so a bill can show them and a change of dates can recompute only what changed.
final class RateCalculator {
    private final List<RateRule> rules;

    RateCalculator(List<RateRule> rules) { this.rules = List.copyOf(rules); }

    List<Integer> nightly(RoomType type, PlanType plan, LocalDate checkIn, LocalDate checkOut) {
        int nights = (int) java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut);
        List<Integer> prices = new ArrayList<>();
        for (LocalDate night = checkIn; night.isBefore(checkOut); night = night.plusDays(1)) {
            int cents = type.baseCents();
            for (RateRule rule : rules) cents = rule.apply(night, cents, nights);
            if (plan == PlanType.NON_REFUNDABLE) cents = cents * 90 / 100;   // cheaper, because it cannot be cancelled
            prices.add(cents);
        }
        return prices;
    }

    int total(RoomType type, PlanType plan, LocalDate checkIn, LocalDate checkOut) {
        return nightly(type, plan, checkIn, checkOut).stream().mapToInt(Integer::intValue).sum();
    }
}
`,
      },
      {
        name: "CancellationPolicy.java",
        code: `import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

// How much of what the guest has paid comes back when they cancel. At booking the guest pays the first night (the
// deposit), so that is the most there is to give back. A strategy per plan.
interface CancellationPolicy {
    int refund(Reservation r, LocalDate today);

    static CancellationPolicy forPlan(PlanType plan) {
        return switch (plan) {
            case FLEXIBLE -> (r, today) -> today.isBefore(r.checkIn) ? r.depositCents : 0;                                // up to the day before
            case STRICT -> (r, today) -> ChronoUnit.DAYS.between(today, r.checkIn) >= 7 ? r.depositCents / 2 : 0;       // half, a week ahead
            case NON_REFUNDABLE -> (r, today) -> 0;
        };
    }
}
`,
      },
      {
        name: "Inventory.java",
        code: `import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

// How many rooms of one type are booked on each night. One lock per room type: bookings of different types never wait for
// each other, and a booking of a range is checked and changed as one step, so a stay is never booked for only some nights.
// The limit per night is the number of rooms plus the overbooking allowance.
final class Inventory {
    final RoomType type;
    final int rooms;
    private final Map<LocalDate, Integer> booked = new HashMap<>();
    final ReentrantLock lock = new ReentrantLock();

    Inventory(RoomType type, int rooms) {
        this.type = type;
        this.rooms = rooms;
    }

    int bookedOn(LocalDate night) { return booked.getOrDefault(night, 0); }

    // Caller holds the lock. All nights or none.
    boolean tryBook(LocalDate checkIn, LocalDate checkOut, int limit) {
        for (LocalDate n = checkIn; n.isBefore(checkOut); n = n.plusDays(1)) {
            if (bookedOn(n) >= limit) return false;
        }
        for (LocalDate n = checkIn; n.isBefore(checkOut); n = n.plusDays(1)) booked.merge(n, 1, Integer::sum);
        return true;
    }

    void release(LocalDate checkIn, LocalDate checkOut) {
        for (LocalDate n = checkIn; n.isBefore(checkOut); n = n.plusDays(1)) booked.merge(n, -1, Integer::sum);
    }

    int minFree(LocalDate checkIn, LocalDate checkOut, int limit) {
        int free = Integer.MAX_VALUE;
        for (LocalDate n = checkIn; n.isBefore(checkOut); n = n.plusDays(1)) free = Math.min(free, limit - bookedOn(n));
        return free;
    }
}
`,
      },
      {
        name: "OverbookingPolicy.java",
        code: `// Hotels sell more rooms than they have, because some guests do not come. The policy says how many extra bookings a room
// type may take. The extra is a business risk: when everybody comes, someone is "walked" to another hotel.
interface OverbookingPolicy {
    int allowance(int rooms);

    static OverbookingPolicy percent(int percent) { return rooms -> rooms * percent / 100; }

    static OverbookingPolicy none() { return rooms -> 0; }
}
`,
      },
      {
        name: "HotelCode.java",
        code: `enum HotelCode {
    OK, UNKNOWN_TYPE, UNKNOWN_RESERVATION, BAD_DATES, IN_THE_PAST, NOT_AVAILABLE, TOO_MANY_GUESTS, WRONG_STATE, TOO_EARLY,
    NO_ROOM, UNKNOWN_ROOM, NOT_YOUR_RESERVATION
}
`,
      },
      {
        name: "HotelResult.java",
        code: `record HotelResult(HotelCode code, Reservation reservation, int cents) {
    static HotelResult of(HotelCode code) { return new HotelResult(code, null, 0); }

    boolean ok() { return code == HotelCode.OK; }
}
`,
      },
      {
        name: "Offer.java",
        code: `import java.util.List;

// One line of an availability search: a room type, how many rooms are left on the tightest night, the price of the stay.
record Offer(RoomType type, int roomsLeft, int totalCents, List<Integer> nightly) { }
`,
      },
      {
        name: "Hotel.java",
        code: `import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

// The facade. Booking works on room TYPES and dates (inventory counters); a physical room is picked at check-in, which is
// how hotels work and what lets them move guests around. Locking: bookings take the lock of the room type only. Anything
// that touches physical rooms (check-in, check-out, housekeeping) takes the hotel lock. When both are needed the order is
// always the type lock first, then the hotel lock, so they cannot deadlock.
final class Hotel {
    static final int MAX_NIGHTS = 30;

    private final Calendar calendar;
    private final RateCalculator rates;
    private final OverbookingPolicy overbooking;
    private final Map<String, Inventory> inventory = new LinkedHashMap<>();
    private final Map<String, Room> rooms = new LinkedHashMap<>();
    private final Map<String, Reservation> reservations = new ConcurrentHashMap<>();
    private final Object roomLock = new Object();
    private final AtomicInteger nextId = new AtomicInteger(1);

    Hotel(Calendar calendar, RateCalculator rates, OverbookingPolicy overbooking) {
        this.calendar = calendar;
        this.rates = rates;
        this.overbooking = overbooking;
    }

    // Setup, before any guest uses the hotel.
    void addRoomType(RoomType type, List<String> roomNumbers) {
        inventory.put(type.id(), new Inventory(type, roomNumbers.size()));
        for (String number : roomNumbers) rooms.put(number, new Room(number, type));
    }

    private int limit(Inventory inv) { return inv.rooms + overbooking.allowance(inv.rooms); }

    // ---------------------------------------------------------------- searching and booking

    // Room types that can take the whole stay, cheapest first.
    List<Offer> search(LocalDate checkIn, LocalDate checkOut, int guests, PlanType plan) {
        List<Offer> offers = new ArrayList<>();
        if (!validDates(checkIn, checkOut)) return offers;
        for (Inventory inv : inventory.values()) {
            if (inv.type.capacity() < guests) continue;
            inv.lock.lock();
            try {
                int free = inv.minFree(checkIn, checkOut, inv.rooms);   // searching counts real rooms, not the overbooking slack
                if (free > 0) {
                    List<Integer> nightly = rates.nightly(inv.type, plan, checkIn, checkOut);
                    offers.add(new Offer(inv.type, free, nightly.stream().mapToInt(Integer::intValue).sum(), nightly));
                }
            } finally {
                inv.lock.unlock();
            }
        }
        offers.sort(Comparator.comparingInt(Offer::totalCents));
        return offers;
    }

    private boolean validDates(LocalDate in, LocalDate out) {
        return in != null && out != null && out.isAfter(in) && java.time.temporal.ChronoUnit.DAYS.between(in, out) <= MAX_NIGHTS;
    }

    HotelResult book(String guest, String typeId, int guests, PlanType plan, LocalDate checkIn, LocalDate checkOut) {
        Inventory inv = inventory.get(typeId);
        if (inv == null) return HotelResult.of(HotelCode.UNKNOWN_TYPE);
        if (!validDates(checkIn, checkOut)) return HotelResult.of(HotelCode.BAD_DATES);
        if (checkIn.isBefore(calendar.today())) return HotelResult.of(HotelCode.IN_THE_PAST);
        if (guests > inv.type.capacity()) return HotelResult.of(HotelCode.TOO_MANY_GUESTS);

        inv.lock.lock();
        try {
            // With the overbooking allowance the limit is above the real room count; bookings beyond it are refused.
            if (!inv.tryBook(checkIn, checkOut, limit(inv))) return HotelResult.of(HotelCode.NOT_AVAILABLE);
            Reservation r = new Reservation("R" + nextId.getAndIncrement(), guest, inv.type, plan, checkIn, checkOut);
            List<Integer> nightly = rates.nightly(inv.type, plan, checkIn, checkOut);
            r.totalCents = nightly.stream().mapToInt(Integer::intValue).sum();
            r.depositCents = nightly.get(0);
            reservations.put(r.id, r);
            return new HotelResult(HotelCode.OK, r, r.depositCents);
        } finally {
            inv.lock.unlock();
        }
    }

    // Moves a booked reservation to other dates, keeping the type and plan. Atomic: either the new nights are available and
    // the old ones are released, or nothing changes. The nights the stay already holds count as free for the new range.
    HotelResult changeDates(String id, LocalDate checkIn, LocalDate checkOut) {
        Reservation r = reservations.get(id);
        if (r == null) return HotelResult.of(HotelCode.UNKNOWN_RESERVATION);
        if (!validDates(checkIn, checkOut)) return HotelResult.of(HotelCode.BAD_DATES);
        if (checkIn.isBefore(calendar.today())) return HotelResult.of(HotelCode.IN_THE_PAST);
        Inventory inv = inventory.get(r.type.id());
        inv.lock.lock();
        try {
            if (r.status != StayStatus.BOOKED) return HotelResult.of(HotelCode.WRONG_STATE);
            inv.release(r.checkIn, r.checkOut);
            if (!inv.tryBook(checkIn, checkOut, limit(inv))) {
                inv.tryBook(r.checkIn, r.checkOut, Integer.MAX_VALUE);   // put the old nights back
                return HotelResult.of(HotelCode.NOT_AVAILABLE);
            }
            r.checkIn = checkIn;
            r.checkOut = checkOut;
            int newTotal = rates.total(r.type, r.plan, checkIn, checkOut);
            int difference = newTotal - r.totalCents;
            r.totalCents = newTotal;
            r.depositCents = rates.nightly(r.type, r.plan, checkIn, checkOut).get(0);
            return new HotelResult(HotelCode.OK, r, difference);
        } finally {
            inv.lock.unlock();
        }
    }

    HotelResult cancel(String id) {
        Reservation r = reservations.get(id);
        if (r == null) return HotelResult.of(HotelCode.UNKNOWN_RESERVATION);
        Inventory inv = inventory.get(r.type.id());
        inv.lock.lock();
        try {
            if (r.status != StayStatus.BOOKED) return HotelResult.of(HotelCode.WRONG_STATE);
            int refund = CancellationPolicy.forPlan(r.plan).refund(r, calendar.today());
            inv.release(r.checkIn, r.checkOut);
            r.status = StayStatus.CANCELLED;
            r.refundedCents = refund;
            return new HotelResult(HotelCode.OK, r, refund);
        } finally {
            inv.lock.unlock();
        }
    }

    // At the end of the day, guests who did not arrive are marked NO_SHOW. They lose the first night, and their remaining
    // nights are released for sale again.
    int processNoShows() {
        LocalDate today = calendar.today();
        int count = 0;
        for (Reservation r : reservations.values()) {
            if (r.status != StayStatus.BOOKED || !r.checkIn.isBefore(today)) continue;
            Inventory inv = inventory.get(r.type.id());
            inv.lock.lock();
            try {
                if (r.status != StayStatus.BOOKED) continue;
                r.status = StayStatus.NO_SHOW;
                inv.release(r.checkIn, r.checkOut);
                count++;
            } finally {
                inv.lock.unlock();
            }
        }
        return count;
    }

    // ---------------------------------------------------------------- the stay

    // Gives the guest a physical room. A clean room of the booked type if there is one, otherwise a free upgrade to a clean
    // room of a higher type. If there is none at all, the hotel has overbooked and the guest is walked to another hotel.
    HotelResult checkIn(String id) {
        Reservation r = reservations.get(id);
        if (r == null) return HotelResult.of(HotelCode.UNKNOWN_RESERVATION);
        Inventory inv = inventory.get(r.type.id());
        inv.lock.lock();
        try {
            synchronized (roomLock) {
                if (r.status != StayStatus.BOOKED) return HotelResult.of(HotelCode.WRONG_STATE);
                if (calendar.today().isBefore(r.checkIn)) return HotelResult.of(HotelCode.TOO_EARLY);
                Room room = pickRoom(r.type);
                if (room == null) {
                    r.status = StayStatus.WALKED;
                    inv.release(r.checkIn, r.checkOut);
                    r.refundedCents = r.depositCents;
                    r.notes.add("walked to another hotel, deposit returned");
                    return HotelResult.of(HotelCode.NO_ROOM);
                }
                room.status = RoomStatus.OCCUPIED;
                room.guest = r.guest;
                r.roomNumber = room.number;
                r.status = StayStatus.CHECKED_IN;
                if (!room.type.equals(r.type)) r.notes.add("upgraded to " + room.type.name());
                return new HotelResult(HotelCode.OK, r, 0);
            }
        } finally {
            inv.lock.unlock();
        }
    }

    // Caller holds roomLock. Same type first, then the nearest higher type.
    private Room pickRoom(RoomType wanted) {
        Room upgrade = null;
        for (Room room : rooms.values()) {
            if (room.status != RoomStatus.CLEAN) continue;
            if (room.type.equals(wanted)) return room;
            if (room.type.rank() > wanted.rank() && (upgrade == null || room.type.rank() < upgrade.type.rank())) upgrade = room;
        }
        return upgrade;
    }

    HotelResult addExtra(String id, int cents) {
        Reservation r = reservations.get(id);
        if (r == null) return HotelResult.of(HotelCode.UNKNOWN_RESERVATION);
        synchronized (roomLock) {
            if (r.status != StayStatus.CHECKED_IN) return HotelResult.of(HotelCode.WRONG_STATE);
            r.extrasCents += cents;
            return new HotelResult(HotelCode.OK, r, r.extrasCents);
        }
    }

    // The bill is what has not been paid yet: the nights after the deposit, plus the extras. Staying longer than booked is
    // charged at the rate of the type, and leaving early does not give money back (the nights were sold to this guest).
    HotelResult checkOut(String id) {
        Reservation r = reservations.get(id);
        if (r == null) return HotelResult.of(HotelCode.UNKNOWN_RESERVATION);
        Inventory inv = inventory.get(r.type.id());
        inv.lock.lock();
        try {
            synchronized (roomLock) {
                if (r.status != StayStatus.CHECKED_IN) return HotelResult.of(HotelCode.WRONG_STATE);
                LocalDate today = calendar.today();
                int late = 0;
                if (today.isAfter(r.checkOut)) late = rates.total(r.type, r.plan, r.checkOut, today);
                int bill = r.totalCents - r.depositCents + r.extrasCents + late;
                Room room = rooms.get(r.roomNumber);
                room.status = RoomStatus.DIRTY;
                room.guest = null;
                r.status = StayStatus.CHECKED_OUT;
                return new HotelResult(HotelCode.OK, r, bill);
            }
        } finally {
            inv.lock.unlock();
        }
    }

    // Housekeeping reports a room clean again, so it can be given to the next guest.
    HotelCode cleaned(String roomNumber) {
        synchronized (roomLock) {
            Room room = rooms.get(roomNumber);
            if (room == null) return HotelCode.UNKNOWN_ROOM;
            if (room.status != RoomStatus.DIRTY) return HotelCode.WRONG_STATE;
            room.status = RoomStatus.CLEAN;
            return HotelCode.OK;
        }
    }

    HotelCode outOfOrder(String roomNumber, boolean broken) {
        synchronized (roomLock) {
            Room room = rooms.get(roomNumber);
            if (room == null) return HotelCode.UNKNOWN_ROOM;
            if (broken && room.status == RoomStatus.OCCUPIED) return HotelCode.WRONG_STATE;
            room.status = broken ? RoomStatus.OUT_OF_ORDER : RoomStatus.DIRTY;
            return HotelCode.OK;
        }
    }

    RoomStatus statusOf(String roomNumber) {
        synchronized (roomLock) {
            return rooms.get(roomNumber).status;
        }
    }

    int bookedOn(String typeId, LocalDate night) {
        Inventory inv = inventory.get(typeId);
        inv.lock.lock();
        try {
            return inv.bookedOn(night);
        } finally {
            inv.lock.unlock();
        }
    }

    Reservation reservation(String id) { return reservations.get(id); }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.time.LocalDate;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        LocalDate monday = LocalDate.of(2026, 3, 2);   // 2 March 2026 is a Monday
        ManualCalendar calendar = new ManualCalendar(monday.minusDays(20));
        RateCalculator rates = new RateCalculator(List.of(
                new SeasonalRate(LocalDate.of(2026, 3, 20), LocalDate.of(2026, 3, 31), 150),
                new WeekendRate(),
                new LongStayDiscount()));
        Hotel hotel = new Hotel(calendar, rates, OverbookingPolicy.percent(50));
        RoomType standard = new RoomType("std", "Standard", 2, 10_000, 1);
        RoomType suite = new RoomType("suite", "Suite", 4, 25_000, 2);
        hotel.addRoomType(standard, List.of("101", "102"));
        hotel.addRoomType(suite, List.of("201"));

        System.out.println("Search 3 nights from Monday for 2 guests:");
        for (Offer o : hotel.search(monday, monday.plusDays(3), 2, PlanType.FLEXIBLE)) System.out.println("  " + o.type().name() + ": " + o.roomsLeft() + " left, " + o.totalCents() + " " + o.nightly());
        System.out.println("Weekend stay Thursday to Sunday, standard: " + hotel.search(monday.plusDays(3), monday.plusDays(6), 2, PlanType.FLEXIBLE).get(0).nightly());
        System.out.println("Non-refundable is 10 percent cheaper: " + hotel.search(monday, monday.plusDays(1), 2, PlanType.NON_REFUNDABLE).get(0).totalCents());
        System.out.println("Seven nights get the long-stay discount: " + hotel.search(monday, monday.plusDays(7), 2, PlanType.FLEXIBLE).get(0).totalCents());
        System.out.println("Spring season nights: " + hotel.search(LocalDate.of(2026, 3, 20), LocalDate.of(2026, 3, 22), 2, PlanType.FLEXIBLE).get(0).nightly());

        HotelResult a = hotel.book("Asha", "std", 2, PlanType.FLEXIBLE, monday, monday.plusDays(3));
        HotelResult b = hotel.book("Ben", "std", 2, PlanType.FLEXIBLE, monday, monday.plusDays(2));
        HotelResult c = hotel.book("Chen", "std", 2, PlanType.STRICT, monday, monday.plusDays(1));
        HotelResult d = hotel.book("Dev", "std", 2, PlanType.FLEXIBLE, monday, monday.plusDays(1));
        System.out.println("Four bookings for two rooms (50 percent overbooking = 3 allowed): " + a.code() + " " + b.code() + " " + c.code() + " " + d.code());
        System.out.println("Search now shows standard rooms: " + hotel.search(monday, monday.plusDays(1), 2, PlanType.FLEXIBLE).stream().map(o -> o.type().name()).toList());
        System.out.println("Too many guests: " + hotel.book("X", "std", 3, PlanType.FLEXIBLE, monday, monday.plusDays(1)).code() + ", past: " + hotel.book("X", "std", 2, PlanType.FLEXIBLE, monday.minusDays(30), monday.minusDays(28)).code());

        HotelResult moved = hotel.changeDates(b.reservation().id, monday.plusDays(1), monday.plusDays(3));
        System.out.println("Ben moves one night later: " + moved.code() + ", price difference " + moved.cents());
        System.out.println("Chen cancels 20 days before (strict, 7 days or more): refund " + hotel.cancel(c.reservation().id).cents());

        HotelResult d2 = hotel.book("Dev", "std", 2, PlanType.FLEXIBLE, monday, monday.plusDays(1));
        HotelResult e = hotel.book("Eli", "std", 2, PlanType.FLEXIBLE, monday, monday.plusDays(1));
        System.out.println("After Chen cancelled, Dev and Eli fit: " + d2.code() + " " + e.code());
        calendar.set(monday);
        System.out.println("Asha checks in: " + hotel.checkIn(a.reservation().id).code() + " room " + a.reservation().roomNumber);
        System.out.println("Dev checks in: " + hotel.checkIn(d2.reservation().id).code() + " room " + d2.reservation().roomNumber);
        System.out.println("Eli checks in, both standard rooms are taken: " + hotel.checkIn(e.reservation().id).code() + " room " + e.reservation().roomNumber + " " + e.reservation().notes);
        hotel.addExtra(a.reservation().id, 3_500);
        calendar.advanceDays(3);
        HotelResult out = hotel.checkOut(a.reservation().id);
        System.out.println("Asha checks out on time: bill " + out.cents() + " (rest of the stay and extras), room " + hotel.statusOf("101") + ", cleaned: " + hotel.cleaned("101"));
        System.out.println("No-shows processed: " + hotel.processNoShows());
        System.out.println("Late cancel of a flexible booking loses the first night: " + lateCancel(hotel, calendar));
        System.out.println("Reservation status of Dev: " + d2.reservation().status);
    }

    private static String lateCancel(Hotel hotel, ManualCalendar calendar) {
        LocalDate in = calendar.today().plusDays(1);
        HotelResult r = hotel.book("Zoe", "suite", 2, PlanType.FLEXIBLE, in, in.plusDays(3));
        calendar.advanceDays(1);
        return "deposit " + r.cents() + ", total " + r.reservation().totalCents + ", refund " + hotel.cancel(r.reservation().id).cents();
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static final LocalDate MON = LocalDate.of(2026, 3, 2);   // a Monday
    private static final RoomType STD = new RoomType("std", "Standard", 2, 10_000, 1);
    private static final RoomType DLX = new RoomType("dlx", "Deluxe", 3, 15_000, 2);
    private static final RoomType SUITE = new RoomType("suite", "Suite", 4, 25_000, 3);

    private static final class World {
        final ManualCalendar calendar = new ManualCalendar(MON.minusDays(30));
        final Hotel hotel;

        World(OverbookingPolicy policy, List<RateRule> rules) {
            hotel = new Hotel(calendar, new RateCalculator(rules), policy);
            hotel.addRoomType(STD, List.of("101", "102"));
            hotel.addRoomType(DLX, List.of("201"));
            hotel.addRoomType(SUITE, List.of("301"));
        }

        World() { this(OverbookingPolicy.none(), List.of()); }

        HotelResult book(String guest, RoomType type, int fromDay, int nights) {
            return hotel.book(guest, type.id(), 2, PlanType.FLEXIBLE, MON.plusDays(fromDay), MON.plusDays(fromDay + nights));
        }
    }

    public static void main(String[] args) throws Exception {
        rateRules();
        searching();
        bookingValidation();
        inventoryIsAllOrNothing();
        overbooking();
        cancellationPolicies();
        changingDates();
        noShows();
        checkInAssignment();
        walkingAGuest();
        checkOutAndBill();
        housekeeping();
        manyGuestsOneRoom();
        overlappingStays();
        if (failures > 0) System.exit(1);
    }

    private static void rateRules() {
        RateCalculator base = new RateCalculator(List.of());
        check(base.nightly(STD, PlanType.FLEXIBLE, MON, MON.plusDays(3)).equals(List.of(10_000, 10_000, 10_000)), "no rules: the base price for each night");
        RateCalculator weekend = new RateCalculator(List.of(new WeekendRate()));
        check(weekend.nightly(STD, PlanType.FLEXIBLE, MON.plusDays(3), MON.plusDays(7)).equals(List.of(10_000, 12_000, 12_000, 10_000)), "Thursday normal, Friday and Saturday dearer, Sunday normal");
        RateCalculator season = new RateCalculator(List.of(new SeasonalRate(MON.plusDays(1), MON.plusDays(2), 150)));
        check(season.nightly(STD, PlanType.FLEXIBLE, MON, MON.plusDays(4)).equals(List.of(10_000, 15_000, 15_000, 10_000)), "a season includes both end dates");
        RateCalculator both = new RateCalculator(List.of(new SeasonalRate(MON, MON.plusDays(10), 150), new WeekendRate()));
        check(both.nightly(STD, PlanType.FLEXIBLE, MON.plusDays(4), MON.plusDays(5)).equals(List.of(18_000)), "rules apply in order: 10000 times 1.5 times 1.2");
        RateCalculator longStay = new RateCalculator(List.of(new LongStayDiscount()));
        check(longStay.nightly(STD, PlanType.FLEXIBLE, MON, MON.plusDays(6)).get(0) == 10_000 && longStay.nightly(STD, PlanType.FLEXIBLE, MON, MON.plusDays(7)).get(0) == 9_000, "seven nights get 10 percent off, six do not");
        check(base.total(STD, PlanType.NON_REFUNDABLE, MON, MON.plusDays(2)) == 18_000, "the non-refundable plan is 10 percent cheaper");
        check(base.nightly(SUITE, PlanType.FLEXIBLE, MON, MON.plusDays(1)).get(0) == 25_000, "each type has its own base price");
    }

    private static void searching() {
        World w = new World();
        List<Offer> offers = w.hotel.search(MON, MON.plusDays(2), 2, PlanType.FLEXIBLE);
        check(offers.size() == 3 && offers.get(0).type().equals(STD) && offers.get(2).type().equals(SUITE), "all three types, cheapest first");
        check(w.hotel.search(MON, MON.plusDays(2), 4, PlanType.FLEXIBLE).size() == 1, "only the suite takes four guests");
        w.book("a", STD, 0, 2);
        w.book("b", STD, 1, 2);
        Offer std = w.hotel.search(MON, MON.plusDays(3), 2, PlanType.FLEXIBLE).get(0);
        check(std.roomsLeft() == 0 || std.type().equals(DLX), "a type that is full on one night is not offered for a stay that includes it");
        check(w.hotel.search(MON, MON.plusDays(1), 2, PlanType.FLEXIBLE).stream().filter(o -> o.type().equals(STD)).findFirst().get().roomsLeft() == 1, "rooms left is counted on the tightest night");
        check(w.hotel.search(MON, MON, 2, PlanType.FLEXIBLE).isEmpty() && w.hotel.search(MON.plusDays(2), MON, 2, PlanType.FLEXIBLE).isEmpty(), "invalid dates give no offers");
    }

    private static void bookingValidation() {
        World w = new World();
        check(w.hotel.book("g", "nope", 1, PlanType.FLEXIBLE, MON, MON.plusDays(1)).code() == HotelCode.UNKNOWN_TYPE, "unknown room type");
        check(w.hotel.book("g", "std", 1, PlanType.FLEXIBLE, MON, MON).code() == HotelCode.BAD_DATES, "a stay of zero nights");
        check(w.hotel.book("g", "std", 1, PlanType.FLEXIBLE, MON.plusDays(2), MON).code() == HotelCode.BAD_DATES, "check-out before check-in");
        check(w.hotel.book("g", "std", 1, PlanType.FLEXIBLE, MON, MON.plusDays(31)).code() == HotelCode.BAD_DATES, "more than 30 nights");
        check(w.hotel.book("g", "std", 1, PlanType.FLEXIBLE, MON, MON.plusDays(30)).ok(), "exactly 30 nights is allowed");
        check(w.hotel.book("g", "std", 3, PlanType.FLEXIBLE, MON, MON.plusDays(1)).code() == HotelCode.TOO_MANY_GUESTS, "more guests than the room holds");
        w.calendar.set(MON);
        check(w.hotel.book("g", "dlx", 1, PlanType.FLEXIBLE, MON.minusDays(1), MON.plusDays(1)).code() == HotelCode.IN_THE_PAST, "a check-in in the past");
        check(w.hotel.book("g", "dlx", 1, PlanType.FLEXIBLE, MON, MON.plusDays(1)).ok(), "today is allowed");
        HotelResult r = w.book("h", SUITE, 2, 3);
        check(r.reservation().totalCents == 75_000 && r.cents() == 25_000 && r.reservation().depositCents == 25_000, "the deposit is the first night");
    }

    private static void inventoryIsAllOrNothing() {
        World w = new World();
        w.book("a", DLX, 2, 1);   // the only deluxe room is taken on night 2
        check(w.book("b", DLX, 0, 4).code() == HotelCode.NOT_AVAILABLE, "a stay that includes a full night is refused");
        check(w.hotel.bookedOn("dlx", MON) == 0 && w.hotel.bookedOn("dlx", MON.plusDays(1)) == 0 && w.hotel.bookedOn("dlx", MON.plusDays(3)) == 0, "and none of its other nights were counted");
        check(w.book("c", DLX, 0, 2).ok() && w.book("d", DLX, 3, 2).ok(), "stays around the taken night work");
        check(w.book("e", STD, 0, 1).ok() && w.book("f", STD, 0, 1).ok() && w.book("g", STD, 0, 1).code() == HotelCode.NOT_AVAILABLE, "two standard rooms, a third booking is refused");
        check(w.book("h", STD, 1, 1).ok(), "the next night is free");
    }

    private static void overbooking() {
        World w = new World(OverbookingPolicy.percent(50), List.of());
        check(w.book("a", STD, 0, 1).ok() && w.book("b", STD, 0, 1).ok() && w.book("c", STD, 0, 1).ok(), "two rooms and 50 percent allowance: three bookings");
        check(w.book("d", STD, 0, 1).code() == HotelCode.NOT_AVAILABLE, "the fourth is refused");
        check(w.hotel.search(MON, MON.plusDays(1), 2, PlanType.FLEXIBLE).stream().noneMatch(o -> o.type().equals(STD)), "search offers real rooms only, so the overbooking is not advertised");
        check(w.book("e", DLX, 0, 1).ok() && w.book("f", DLX, 0, 1).code() == HotelCode.NOT_AVAILABLE, "one deluxe room: 50 percent of one rounds down to no extra booking");
        check(OverbookingPolicy.percent(50).allowance(1) == 0 && OverbookingPolicy.percent(50).allowance(10) == 5, "the allowance rounds down");
    }

    private static void cancellationPolicies() {
        World w = new World();
        HotelResult flex = w.hotel.book("a", "std", 2, PlanType.FLEXIBLE, MON, MON.plusDays(2));
        check(w.hotel.cancel(flex.reservation().id).cents() == 10_000 && w.hotel.bookedOn("std", MON) == 0, "flexible, before the day of arrival: the deposit comes back and the nights are freed");
        check(w.hotel.cancel(flex.reservation().id).code() == HotelCode.WRONG_STATE, "cancelling twice is refused");

        HotelResult late = w.hotel.book("b", "std", 2, PlanType.FLEXIBLE, MON, MON.plusDays(2));
        w.calendar.set(MON);
        check(w.hotel.cancel(late.reservation().id).cents() == 0, "flexible, on the day of arrival: nothing back");

        World s = new World();
        HotelResult strictFar = s.hotel.book("c", "std", 2, PlanType.STRICT, MON, MON.plusDays(2));
        HotelResult strictNear = s.hotel.book("d", "std", 2, PlanType.STRICT, MON.plusDays(10), MON.plusDays(12));
        s.calendar.set(MON.minusDays(7));
        check(s.hotel.cancel(strictFar.reservation().id).cents() == 5_000, "strict, exactly 7 days before: half the deposit");
        s.calendar.set(MON.plusDays(4));
        check(s.hotel.cancel(strictNear.reservation().id).cents() == 0, "strict, 6 days before: nothing");

        World n = new World();
        HotelResult nr = n.hotel.book("e", "std", 2, PlanType.NON_REFUNDABLE, MON, MON.plusDays(2));
        check(nr.reservation().totalCents == 18_000 && n.hotel.cancel(nr.reservation().id).cents() == 0, "non-refundable: cheaper and nothing back");
        check(n.hotel.cancel("R99").code() == HotelCode.UNKNOWN_RESERVATION, "unknown reservation");
    }

    private static void changingDates() {
        World w = new World(OverbookingPolicy.none(), List.of(new WeekendRate()));
        HotelResult r = w.book("a", DLX, 0, 2);   // Monday and Tuesday, 30000
        HotelResult moved = w.hotel.changeDates(r.reservation().id, MON.plusDays(1), MON.plusDays(3));
        check(moved.ok() && moved.cents() == 0 && w.hotel.bookedOn("dlx", MON) == 0 && w.hotel.bookedOn("dlx", MON.plusDays(2)) == 1, "moving one day later keeps the price and moves the nights");
        HotelResult weekend = w.hotel.changeDates(r.reservation().id, MON.plusDays(4), MON.plusDays(6));   // Friday and Saturday
        check(weekend.ok() && weekend.cents() == 36_000 - 30_000 && r.reservation().depositCents == 18_000, "moving to a weekend costs more, and the deposit follows the first night");
        w.book("b", DLX, 0, 2);
        HotelResult clash = w.hotel.changeDates(r.reservation().id, MON.plusDays(1), MON.plusDays(3));
        check(clash.code() == HotelCode.NOT_AVAILABLE && r.reservation().checkIn.equals(MON.plusDays(4)), "a range with a taken night is refused and the booking is unchanged");
        check(w.hotel.bookedOn("dlx", MON.plusDays(4)) == 1 && w.hotel.bookedOn("dlx", MON.plusDays(5)) == 1 && w.hotel.bookedOn("dlx", MON.plusDays(2)) == 0, "the old nights were put back, the new ones were not kept");
        check(w.hotel.changeDates(r.reservation().id, MON, MON).code() == HotelCode.BAD_DATES, "bad dates");
        HotelResult q = w.book("q", STD, 1, 1);
        w.calendar.set(MON.plusDays(1));
        w.hotel.checkIn(q.reservation().id);
        check(w.hotel.changeDates(q.reservation().id, MON.plusDays(8), MON.plusDays(9)).code() == HotelCode.WRONG_STATE, "no changes after check-in");
        check(w.hotel.bookedOn("std", MON.plusDays(8)) == 0, "and the refused change left no nights behind");
    }

    private static void noShows() {
        World w = new World();
        HotelResult come = w.book("comes", STD, 0, 2);
        HotelResult skip = w.book("skips", STD, 0, 3);
        HotelResult later = w.book("later", STD, 5, 1);
        w.calendar.set(MON);
        w.hotel.checkIn(come.reservation().id);
        w.calendar.set(MON.plusDays(1));
        check(w.hotel.processNoShows() == 1 && skip.reservation().status == StayStatus.NO_SHOW, "the guest who did not arrive is a no-show");
        check(come.reservation().status == StayStatus.CHECKED_IN && later.reservation().status == StayStatus.BOOKED, "guests who arrived or arrive later are not");
        check(w.hotel.bookedOn("std", MON.plusDays(2)) == 0 && w.hotel.bookedOn("std", MON.plusDays(1)) == 1, "the no-show's nights are released for sale");
        check(w.hotel.processNoShows() == 0, "a second run changes nothing");
    }

    private static void checkInAssignment() {
        World w = new World();
        HotelResult a = w.book("a", STD, 0, 1);
        HotelResult b = w.book("b", STD, 0, 1);
        check(w.hotel.checkIn(a.reservation().id).code() == HotelCode.TOO_EARLY, "check-in before the arrival date");
        w.calendar.set(MON);
        check(w.hotel.checkIn(a.reservation().id).ok() && a.reservation().roomNumber.equals("101"), "the first clean room of the booked type");
        check(w.hotel.checkIn(b.reservation().id).ok() && b.reservation().roomNumber.equals("102") && w.hotel.statusOf("101") == RoomStatus.OCCUPIED, "the next guest gets the other one");
        check(w.hotel.checkIn(a.reservation().id).code() == HotelCode.WRONG_STATE, "no second check-in");
        HotelResult c = w.hotel.book("c", "std", 2, PlanType.FLEXIBLE, MON, MON.plusDays(1));
        check(c.code() == HotelCode.NOT_AVAILABLE, "with no overbooking nothing more can be sold");

        World u = new World(OverbookingPolicy.percent(50), List.of());
        u.calendar.set(MON);
        HotelResult x = u.book("x", STD, 0, 1);
        HotelResult y = u.book("y", STD, 0, 1);
        HotelResult z = u.book("z", STD, 0, 1);
        u.hotel.checkIn(x.reservation().id);
        u.hotel.checkIn(y.reservation().id);
        check(u.hotel.checkIn(z.reservation().id).ok() && z.reservation().roomNumber.equals("201") && z.reservation().notes.contains("upgraded to Deluxe"), "no standard room is left, so the guest is upgraded to the nearest higher type");
    }

    private static void walkingAGuest() {
        World w = new World(OverbookingPolicy.percent(100), List.of());
        w.calendar.set(MON);
        List<HotelResult> all = new ArrayList<>();
        for (int i = 0; i < 4; i++) all.add(w.book("g" + i, STD, 0, 2));
        check(all.stream().allMatch(HotelResult::ok), "100 percent overbooking: four bookings for two rooms");
        w.hotel.checkIn(all.get(0).reservation().id);
        w.hotel.checkIn(all.get(1).reservation().id);
        // the deluxe and suite rooms are taken by other guests
        w.hotel.checkIn(w.book("d", DLX, 0, 1).reservation().id);
        w.hotel.checkIn(w.book("s", SUITE, 0, 1).reservation().id);
        HotelResult walked = w.hotel.checkIn(all.get(2).reservation().id);
        check(walked.code() == HotelCode.NO_ROOM && all.get(2).reservation().status == StayStatus.WALKED, "when every room is taken, the guest is walked");
        check(all.get(2).reservation().refundedCents == 10_000 && all.get(2).reservation().notes.size() == 1, "and gets the deposit back");
        check(w.hotel.bookedOn("std", MON) == 3, "their nights are released");
    }

    private static void checkOutAndBill() {
        World w = new World();
        w.calendar.set(MON);
        HotelResult r = w.book("a", STD, 0, 3);
        check(w.hotel.checkOut(r.reservation().id).code() == HotelCode.WRONG_STATE && w.hotel.addExtra(r.reservation().id, 100).code() == HotelCode.WRONG_STATE, "no bill and no extras before check-in");
        w.hotel.checkIn(r.reservation().id);
        w.hotel.addExtra(r.reservation().id, 1_500);
        w.hotel.addExtra(r.reservation().id, 500);
        w.calendar.set(MON.plusDays(3));
        HotelResult out = w.hotel.checkOut(r.reservation().id);
        check(out.cents() == 30_000 - 10_000 + 2_000 && r.reservation().status == StayStatus.CHECKED_OUT, "the bill is the rest of the stay plus the extras");
        check(w.hotel.statusOf("101") == RoomStatus.DIRTY, "the room is dirty after check-out");

        World late = new World();
        late.calendar.set(MON);
        HotelResult l = late.book("b", STD, 0, 2);
        late.hotel.checkIn(l.reservation().id);
        late.calendar.set(MON.plusDays(4));
        check(late.hotel.checkOut(l.reservation().id).cents() == 20_000 - 10_000 + 20_000, "staying two extra nights is charged at the rate of the room");
        World early = new World();
        early.calendar.set(MON);
        HotelResult e = early.book("c", STD, 0, 3);
        early.hotel.checkIn(e.reservation().id);
        early.calendar.set(MON.plusDays(1));
        check(early.hotel.checkOut(e.reservation().id).cents() == 20_000, "leaving early does not reduce the bill: the nights were sold");
    }

    private static void housekeeping() {
        World w = new World(OverbookingPolicy.percent(100), List.of());
        w.calendar.set(MON);
        w.hotel.outOfOrder("301", true);
        HotelResult a = w.book("a", DLX, 0, 1);
        HotelResult b = w.book("b", DLX, 0, 1);
        w.hotel.checkIn(a.reservation().id);
        check(w.hotel.cleaned("201") == HotelCode.WRONG_STATE, "an occupied room cannot be reported clean");
        check(w.hotel.outOfOrder("201", true) == HotelCode.WRONG_STATE, "nor taken out of order while a guest is in it");
        w.hotel.checkOut(a.reservation().id);
        check(w.hotel.checkIn(b.reservation().id).code() == HotelCode.NO_ROOM, "a dirty room is not given to the next guest, and nothing else is free");
        check(w.hotel.cleaned("201") == HotelCode.OK && w.hotel.statusOf("201") == RoomStatus.CLEAN, "after cleaning it can be given out");
        HotelResult c = w.book("c", DLX, 0, 1);
        check(c.ok() && w.hotel.checkIn(c.reservation().id).ok() && c.reservation().roomNumber.equals("201"), "the next guest gets it");
        check(w.hotel.cleaned("999") == HotelCode.UNKNOWN_ROOM && w.hotel.outOfOrder("999", true) == HotelCode.UNKNOWN_ROOM, "unknown room");
        HotelResult s = w.book("s", SUITE, 0, 1);
        check(w.hotel.checkIn(s.reservation().id).code() == HotelCode.NO_ROOM && w.hotel.outOfOrder("301", false) == HotelCode.OK && w.hotel.statusOf("301") == RoomStatus.DIRTY, "a room that is out of order is not assigned, and returns as dirty when repaired");
    }

    private static void manyGuestsOneRoom() throws InterruptedException {
        World w = new World(OverbookingPolicy.none(), List.of());
        AtomicInteger winners = new AtomicInteger();
        Thread[] threads = new Thread[40];
        for (int i = 0; i < threads.length; i++) {
            final int n = i;
            threads[i] = new Thread(() -> {
                if (w.book("g" + n, SUITE, 0, 3).ok()) winners.incrementAndGet();
            });
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        check(winners.get() == 1, "40 guests booking the only suite for the same nights: exactly one gets it");
        check(w.hotel.bookedOn("suite", MON) == 1 && w.hotel.bookedOn("suite", MON.plusDays(2)) == 1, "and each night is counted once");
    }

    private static void overlappingStays() throws InterruptedException {
        World w = new World(OverbookingPolicy.percent(50), List.of());
        List<HotelResult> results = new java.util.concurrent.CopyOnWriteArrayList<>();
        Thread[] threads = new Thread[60];
        for (int i = 0; i < threads.length; i++) {
            final int n = i;
            threads[i] = new Thread(() -> {
                HotelResult r = w.book("g" + n, STD, n % 5, 1 + n % 3);
                if (r.ok()) results.add(r);
                if (r.ok() && n % 4 == 0) w.hotel.cancel(r.reservation().id);
            });
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        boolean consistent = true;
        for (int day = 0; day < 8; day++) {
            LocalDate night = MON.plusDays(day);
            int expected = 0;
            for (HotelResult r : results) {
                Reservation x = r.reservation();
                if (x.status == StayStatus.BOOKED && !night.isBefore(x.checkIn) && night.isBefore(x.checkOut)) expected++;
            }
            int counted = w.hotel.bookedOn("std", night);
            consistent &= counted == expected && counted <= 3;
        }
        check(consistent, "after 60 racing bookings and cancellations each night's counter equals the active stays covering it, and never exceeds 3");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Search 3 nights from Monday for 2 guests:",
      "  Standard: 2 left, 30000 [10000, 10000, 10000]",
      "  Suite: 1 left, 75000 [25000, 25000, 25000]",
      "Weekend stay Thursday to Sunday, standard: [10000, 12000, 12000]",
      "Non-refundable is 10 percent cheaper: 9000",
      "Seven nights get the long-stay discount: 66600",
      "Spring season nights: [18000, 18000]",
      "Four bookings for two rooms (50 percent overbooking = 3 allowed): OK OK OK NOT_AVAILABLE",
      "Search now shows standard rooms: [Suite]",
      "Too many guests: TOO_MANY_GUESTS, past: IN_THE_PAST",
      "Ben moves one night later: OK, price difference 0",
      "Chen cancels 20 days before (strict, 7 days or more): refund 5000",
      "After Chen cancelled, Dev and Eli fit: OK OK",
      "Asha checks in: OK room 101",
      "Dev checks in: OK room 102",
      "Eli checks in, both standard rooms are taken: OK room 201 [upgraded to Suite]",
      "Asha checks out on time: bill 23500 (rest of the stay and extras), room DIRTY, cleaned: OK",
      "No-shows processed: 1",
      "Late cancel of a flexible booking loses the first night: deposit 30000, total 85000, refund 0",
      "Reservation status of Dev: CHECKED_IN",
    ],
  },
};
