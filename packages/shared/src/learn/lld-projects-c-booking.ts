import type { LldProject } from "./types";

// Movie ticket booking (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when it was written.

export const LLD_PROJECTS_C_BOOKING: Record<string, LldProject> = {
  "lldp-booking": {
    files: [
      {
        name: "TimeSource.java",
        code: `// The only way any class here learns the time. Tests pass a ManualClock and move it by hand, so hold expiry,
// refund tiers and peak pricing are checked without sleeping.
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
}
`,
      },
      {
        name: "SeatCategory.java",
        code: `enum SeatCategory { REGULAR, PREMIUM, RECLINER }
`,
      },
      {
        name: "SeatId.java",
        code: `// A seat label such as A5: a row letter and a number. A record gives equals, hashCode and toString for free, so it
// is safe as a map key and prints the way a customer would write it.
record SeatId(char row, int number) implements Comparable<SeatId> {
    static SeatId parse(String label) {
        if (label == null || label.length() < 2 || !Character.isLetter(label.charAt(0))) {
            throw new IllegalArgumentException("bad seat label: " + label);
        }
        try {
            return new SeatId(Character.toUpperCase(label.charAt(0)), Integer.parseInt(label.substring(1)));
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("bad seat label: " + label, e);
        }
    }

    @Override
    public int compareTo(SeatId other) {
        return row != other.row ? Character.compare(row, other.row) : Integer.compare(number, other.number);
    }

    @Override
    public String toString() { return "" + row + number; }
}
`,
      },
      {
        name: "Seat.java",
        code: `record Seat(SeatId id, SeatCategory category) { }
`,
      },
      {
        name: "Screen.java",
        code: `import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

// A physical auditorium: the seats it has and what kind each one is. It never changes, so any thread can read it.
final class Screen {
    private final String name;
    private final Map<SeatId, Seat> seats = new TreeMap<>();

    private Screen(String name) { this.name = name; }

    // rows A.. with seatsPerRow seats each. The last recliners rows are RECLINER, the next premiumRows are PREMIUM.
    static Screen grid(String name, int rows, int seatsPerRow, int premiumRows, int reclinerRows) {
        Screen screen = new Screen(name);
        for (int r = 0; r < rows; r++) {
            SeatCategory category = SeatCategory.REGULAR;
            if (r >= rows - reclinerRows) category = SeatCategory.RECLINER;
            else if (r >= rows - reclinerRows - premiumRows) category = SeatCategory.PREMIUM;
            for (int n = 1; n <= seatsPerRow; n++) {
                SeatId id = new SeatId((char) ('A' + r), n);
                screen.seats.put(id, new Seat(id, category));
            }
        }
        return screen;
    }

    String name() { return name; }

    Seat seat(SeatId id) { return seats.get(id); }

    List<Seat> allSeats() { return Collections.unmodifiableList(new ArrayList<>(seats.values())); }
}
`,
      },
      {
        name: "Movie.java",
        code: `record Movie(String id, String title, int minutes) { }
`,
      },
      {
        name: "Show.java",
        code: `import java.util.Map;

// One screening: a movie on a screen at a start time, with a price per seat category (in cents).
record Show(String id, Movie movie, String theatre, String city, Screen screen, long startMillis, Map<SeatCategory, Integer> prices) { }
`,
      },
      {
        name: "Catalog.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// What is playing where. Read often, written rarely, so a concurrent map and no locks of our own.
final class Catalog {
    private final Map<String, Show> shows = new ConcurrentHashMap<>();

    void add(Show show) { shows.put(show.id(), show); }

    Show show(String id) { return shows.get(id); }

    // Shows of a movie in a city that have not started yet, earliest first.
    List<Show> search(String title, String city, long afterMillis) {
        List<Show> found = new ArrayList<>();
        for (Show s : shows.values()) {
            if (s.movie().title().equalsIgnoreCase(title) && s.city().equalsIgnoreCase(city) && s.startMillis() > afterMillis) found.add(s);
        }
        found.sort((a, b) -> Long.compare(a.startMillis(), b.startMillis()));
        return found;
    }
}
`,
      },
      {
        name: "BookingStatus.java",
        code: `enum BookingStatus { HELD, PAYING, CONFIRMED, CANCELLED, EXPIRED }
`,
      },
      {
        name: "Booking.java",
        code: `import java.util.List;

// A customer's claim on seats of one show. The status moves only through BookingService, always while holding the
// lock of that show's seat inventory, so a booking never changes under a reader that holds the same lock.
final class Booking {
    private final String id;
    private final String userId;
    private final String showId;
    private final List<SeatId> seats;
    private final int amountCents;
    private final long holdUntil;
    private volatile BookingStatus status = BookingStatus.HELD;
    private volatile int refundedCents;

    Booking(String id, String userId, String showId, List<SeatId> seats, int amountCents, long holdUntil) {
        this.id = id;
        this.userId = userId;
        this.showId = showId;
        this.seats = List.copyOf(seats);
        this.amountCents = amountCents;
        this.holdUntil = holdUntil;
    }

    String id() { return id; }

    String userId() { return userId; }

    String showId() { return showId; }

    List<SeatId> seats() { return seats; }

    int amountCents() { return amountCents; }

    long holdUntil() { return holdUntil; }

    BookingStatus status() { return status; }

    int refundedCents() { return refundedCents; }

    void setStatus(BookingStatus next) { status = next; }

    void setRefundedCents(int cents) { refundedCents = cents; }
}
`,
      },
      {
        name: "SeatState.java",
        code: `// Per seat and per show: free, held by a booking until a time, or sold.
final class SeatState {
    enum Kind { AVAILABLE, HELD, BOOKED }

    Kind kind = Kind.AVAILABLE;
    String bookingId;
    long holdUntil;
}
`,
      },
      {
        name: "ShowSeats.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

// The seat inventory of ONE show. All changes happen inside synchronized methods, so the check "are all of these
// seats free" and the change "hold them all" are one atomic step: two customers can never both get seat A5, and a
// booking of three seats is all or nothing. Locking per show (not one global lock) lets different shows proceed
// in parallel.
final class ShowSeats {
    private final Map<SeatId, SeatState> states = new TreeMap<>();

    ShowSeats(Screen screen) {
        for (Seat seat : screen.allSeats()) states.put(seat.id(), new SeatState());
    }

    // Frees every hold whose time has passed. Returns the ids of the bookings that lost their seats.
    synchronized List<String> sweep(long now) {
        List<String> expired = new ArrayList<>();
        for (SeatState s : states.values()) {
            if (s.kind == SeatState.Kind.HELD && s.holdUntil <= now) {
                if (!expired.contains(s.bookingId)) expired.add(s.bookingId);
                s.kind = SeatState.Kind.AVAILABLE;
                s.bookingId = null;
            }
        }
        return expired;
    }

    // All or nothing. Returns the seats that were not free (empty means every seat is now held).
    synchronized List<SeatId> holdAll(List<SeatId> wanted, String bookingId, long until) {
        List<SeatId> taken = new ArrayList<>();
        for (SeatId id : wanted) {
            if (states.get(id).kind != SeatState.Kind.AVAILABLE) taken.add(id);
        }
        if (!taken.isEmpty()) return taken;
        for (SeatId id : wanted) {
            SeatState s = states.get(id);
            s.kind = SeatState.Kind.HELD;
            s.bookingId = bookingId;
            s.holdUntil = until;
        }
        return taken;
    }

    // While a payment is in flight the hold must not expire under it.
    synchronized void pin(String bookingId) {
        for (SeatState s : states.values()) {
            if (bookingId.equals(s.bookingId) && s.kind == SeatState.Kind.HELD) s.holdUntil = Long.MAX_VALUE;
        }
    }

    synchronized void unpin(String bookingId, long until) {
        for (SeatState s : states.values()) {
            if (bookingId.equals(s.bookingId) && s.kind == SeatState.Kind.HELD) s.holdUntil = until;
        }
    }

    synchronized void markBooked(String bookingId) {
        for (SeatState s : states.values()) {
            if (bookingId.equals(s.bookingId)) s.kind = SeatState.Kind.BOOKED;
        }
    }

    synchronized void release(String bookingId) {
        for (SeatState s : states.values()) {
            if (bookingId.equals(s.bookingId)) {
                s.kind = SeatState.Kind.AVAILABLE;
                s.bookingId = null;
            }
        }
    }

    synchronized int count(SeatState.Kind kind) {
        int n = 0;
        for (SeatState s : states.values()) if (s.kind == kind) n++;
        return n;
    }

    synchronized Map<SeatId, SeatState.Kind> snapshot() {
        Map<SeatId, SeatState.Kind> copy = new TreeMap<>();
        for (Map.Entry<SeatId, SeatState> e : states.entrySet()) copy.put(e.getKey(), e.getValue().kind);
        return copy;
    }
}
`,
      },
      {
        name: "PricingStrategy.java",
        code: `import java.util.List;

// Price of a set of seats for a show, in cents. Strategies wrap each other (decorator), so peak pricing and
// coupons stack without the booking service knowing how.
interface PricingStrategy {
    int price(Show show, List<Seat> seats);
}
`,
      },
      {
        name: "CategoryPricing.java",
        code: `import java.util.List;

// The base: each seat costs what its category costs in this show.
final class CategoryPricing implements PricingStrategy {
    @Override
    public int price(Show show, List<Seat> seats) {
        int sum = 0;
        for (Seat seat : seats) sum += show.prices().get(seat.category());
        return sum;
    }
}
`,
      },
      {
        name: "PeakSurcharge.java",
        code: `import java.time.DayOfWeek;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.List;

// Decorator: 20 percent more for evening shows (from 18:00) on Friday, Saturday and Sunday. UTC here to keep the
// example short; a real system uses the theatre's own time zone.
final class PeakSurcharge implements PricingStrategy {
    private final PricingStrategy inner;

    PeakSurcharge(PricingStrategy inner) { this.inner = inner; }

    @Override
    public int price(Show show, List<Seat> seats) {
        int base = inner.price(show, seats);
        ZonedDateTime start = Instant.ofEpochMilli(show.startMillis()).atZone(ZoneOffset.UTC);
        DayOfWeek day = start.getDayOfWeek();
        boolean weekend = day == DayOfWeek.FRIDAY || day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY;
        return weekend && start.getHour() >= 18 ? base * 120 / 100 : base;
    }
}
`,
      },
      {
        name: "CouponDiscount.java",
        code: `import java.util.List;

// Decorator: a percentage off, applied after the other rules. Rounds down so the customer never pays a fraction.
final class CouponDiscount implements PricingStrategy {
    private final PricingStrategy inner;
    private final int percentOff;

    CouponDiscount(PricingStrategy inner, int percentOff) {
        if (percentOff < 0 || percentOff > 100) throw new IllegalArgumentException("percent must be 0..100");
        this.inner = inner;
        this.percentOff = percentOff;
    }

    @Override
    public int price(Show show, List<Seat> seats) {
        return inner.price(show, seats) * (100 - percentOff) / 100;
    }
}
`,
      },
      {
        name: "PaymentGateway.java",
        code: `// The payment provider seen from the booking service. Both calls carry a key so a retry cannot charge twice.
interface PaymentGateway {
    // Returns a payment reference, or null when the payment was declined.
    String charge(String userId, int cents, String idempotencyKey);

    void refund(String paymentRef, int cents);
}
`,
      },
      {
        name: "FakePayments.java",
        code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// A payment provider for demos and tests: it can be told to decline, and it remembers charges by key.
final class FakePayments implements PaymentGateway {
    private final Map<String, String> chargesByKey = new HashMap<>();
    private final List<String> refunds = new ArrayList<>();
    private boolean decline;
    private int chargeCalls;

    synchronized void declineNext(boolean value) { decline = value; }

    synchronized int chargeCalls() { return chargeCalls; }

    synchronized List<String> refunds() { return List.copyOf(refunds); }

    @Override
    public synchronized String charge(String userId, int cents, String idempotencyKey) {
        chargeCalls++;
        if (decline) return null;
        return chargesByKey.computeIfAbsent(idempotencyKey, k -> "pay-" + (chargesByKey.size() + 1));
    }

    @Override
    public synchronized void refund(String paymentRef, int cents) { refunds.add(paymentRef + ":" + cents); }
}
`,
      },
      {
        name: "RefundPolicy.java",
        code: `// How much of the price comes back when a confirmed booking is cancelled, by how long before the show.
interface RefundPolicy {
    // Percent 0..100.
    int refundPercent(long millisBeforeShow);
}
`,
      },
      {
        name: "TieredRefundPolicy.java",
        code: `// 24 hours or more: everything. 4 hours or more: half. Closer than that: nothing.
final class TieredRefundPolicy implements RefundPolicy {
    private static final long HOUR = 3_600_000L;

    @Override
    public int refundPercent(long millisBeforeShow) {
        if (millisBeforeShow >= 24 * HOUR) return 100;
        if (millisBeforeShow >= 4 * HOUR) return 50;
        return 0;
    }
}
`,
      },
      {
        name: "BookingStatusCode.java",
        code: `// Every expected result of a booking call. Wrong input from a customer is a result, not an exception.
enum BookingStatusCode {
    OK, SEATS_TAKEN, TOO_MANY_SEATS, NO_SEATS, UNKNOWN_SHOW, UNKNOWN_SEAT, SHOW_STARTED, NOT_FOUND, NOT_YOUR_BOOKING,
    WRONG_STATE, HOLD_EXPIRED, PAYMENT_DECLINED
}
`,
      },
      {
        name: "BookingResult.java",
        code: `import java.util.List;

record BookingResult(BookingStatusCode code, Booking booking, List<SeatId> conflicts) {
    static BookingResult of(BookingStatusCode code) { return new BookingResult(code, null, List.of()); }

    static BookingResult of(BookingStatusCode code, Booking booking) { return new BookingResult(code, booking, List.of()); }

    boolean ok() { return code == BookingStatusCode.OK; }
}
`,
      },
      {
        name: "BookingEvent.java",
        code: `record BookingEvent(String type, String bookingId, String userId) { }
`,
      },
      {
        name: "BookingListener.java",
        code: `// Observer: notifications, analytics and seat-map pushes subscribe here and the service does not know them.
interface BookingListener {
    void onEvent(BookingEvent event);
}
`,
      },
      {
        name: "BookingService.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

// The facade a controller calls: hold seats, pay, cancel, look at the seat map.
//   hold    -> seats are held for a few minutes, nothing is charged
//   confirm -> pays; on success the seats are sold, on failure the hold goes back to waiting
//   cancel  -> frees the seats, and refunds a confirmed booking according to the policy
// Every change of seats is one call into the show's own ShowSeats, which is where the atomicity lives.
final class BookingService {
    static final int MAX_SEATS = 6;

    private final Catalog catalog;
    private final PricingStrategy pricing;
    private final PaymentGateway payments;
    private final RefundPolicy refundPolicy;
    private final TimeSource clock;
    private final long holdMillis;
    private final Map<String, ShowSeats> inventory = new ConcurrentHashMap<>();
    private final Map<String, Booking> bookings = new ConcurrentHashMap<>();
    private final Map<String, String> paymentRefs = new ConcurrentHashMap<>();
    private final List<BookingListener> listeners = new CopyOnWriteArrayList<>();
    private final AtomicInteger nextId = new AtomicInteger(1);

    BookingService(Catalog catalog, PricingStrategy pricing, PaymentGateway payments, RefundPolicy refundPolicy,
            TimeSource clock, long holdMillis) {
        this.catalog = catalog;
        this.pricing = pricing;
        this.payments = payments;
        this.refundPolicy = refundPolicy;
        this.clock = clock;
        this.holdMillis = holdMillis;
    }

    void subscribe(BookingListener listener) { listeners.add(listener); }

    private void publish(String type, Booking b) {
        BookingEvent event = new BookingEvent(type, b.id(), b.userId());
        for (BookingListener l : listeners) l.onEvent(event);
    }

    private ShowSeats seatsOf(Show show) {
        return inventory.computeIfAbsent(show.id(), id -> new ShowSeats(show.screen()));
    }

    // ---------------------------------------------------------------- hold

    BookingResult hold(String userId, String showId, List<String> labels) {
        Show show = catalog.show(showId);
        if (show == null) return BookingResult.of(BookingStatusCode.UNKNOWN_SHOW);
        if (labels.isEmpty()) return BookingResult.of(BookingStatusCode.NO_SEATS);
        if (labels.size() > MAX_SEATS) return BookingResult.of(BookingStatusCode.TOO_MANY_SEATS);
        if (show.startMillis() <= clock.nowMillis()) return BookingResult.of(BookingStatusCode.SHOW_STARTED);

        List<SeatId> ids = new ArrayList<>();
        List<Seat> seats = new ArrayList<>();
        for (String label : labels) {
            SeatId id;
            try {
                id = SeatId.parse(label);
            } catch (IllegalArgumentException e) {
                return BookingResult.of(BookingStatusCode.UNKNOWN_SEAT);
            }
            Seat seat = show.screen().seat(id);
            if (seat == null || ids.contains(id)) return BookingResult.of(BookingStatusCode.UNKNOWN_SEAT);
            ids.add(id);
            seats.add(seat);
        }

        ShowSeats stock = seatsOf(show);
        expire(stock);
        String bookingId = "B" + nextId.getAndIncrement();
        long until = clock.nowMillis() + holdMillis;
        List<SeatId> taken = stock.holdAll(ids, bookingId, until);
        if (!taken.isEmpty()) return new BookingResult(BookingStatusCode.SEATS_TAKEN, null, taken);

        Booking booking = new Booking(bookingId, userId, showId, ids, pricing.price(show, seats), until);
        bookings.put(bookingId, booking);
        publish("HELD", booking);
        return BookingResult.of(BookingStatusCode.OK, booking);
    }

    // Marks bookings whose hold ran out. Called before every hold and by a periodic sweep. The sweep that frees the
    // seats and the status change of the bookings must be one step under the show's lock; otherwise a confirm could slip
    // in between, see a HELD booking whose seats are already free, and sell seats it no longer holds.
    private void expire(ShowSeats stock) {
        synchronized (stock) {
            for (String bookingId : stock.sweep(clock.nowMillis())) {
                Booking b = bookings.get(bookingId);
                if (b != null && b.status() == BookingStatus.HELD) {
                    b.setStatus(BookingStatus.EXPIRED);
                    publish("EXPIRED", b);
                }
            }
        }
    }

    void expireAll() {
        for (ShowSeats stock : inventory.values()) expire(stock);
    }

    // ---------------------------------------------------------------- confirm

    BookingResult confirm(String userId, String bookingId) {
        Booking b = bookings.get(bookingId);
        if (b == null) return BookingResult.of(BookingStatusCode.NOT_FOUND);
        if (!b.userId().equals(userId)) return BookingResult.of(BookingStatusCode.NOT_YOUR_BOOKING);
        ShowSeats stock = inventory.get(b.showId());

        // Step 1, under the show's lock: still held? Then pin the hold so it cannot expire while we pay.
        synchronized (stock) {
            expire(stock);
            if (b.status() == BookingStatus.CONFIRMED) return BookingResult.of(BookingStatusCode.OK, b); // a repeat click
            if (b.status() == BookingStatus.EXPIRED) return BookingResult.of(BookingStatusCode.HOLD_EXPIRED);
            if (b.status() != BookingStatus.HELD) return BookingResult.of(BookingStatusCode.WRONG_STATE);
            stock.pin(b.id());
            b.setStatus(BookingStatus.PAYING);
        }

        // Step 2, outside the lock: the slow call. The booking id is the idempotency key.
        String ref = payments.charge(userId, b.amountCents(), b.id());

        // Step 3, under the lock again: record the result.
        synchronized (stock) {
            if (ref == null) {
                stock.unpin(b.id(), b.holdUntil());
                b.setStatus(BookingStatus.HELD);
                publish("PAYMENT_DECLINED", b);
                return BookingResult.of(BookingStatusCode.PAYMENT_DECLINED, b);
            }
            stock.markBooked(b.id());
            paymentRefs.put(b.id(), ref);
            b.setStatus(BookingStatus.CONFIRMED);
            publish("CONFIRMED", b);
            return BookingResult.of(BookingStatusCode.OK, b);
        }
    }

    // ---------------------------------------------------------------- cancel

    BookingResult cancel(String userId, String bookingId) {
        Booking b = bookings.get(bookingId);
        if (b == null) return BookingResult.of(BookingStatusCode.NOT_FOUND);
        if (!b.userId().equals(userId)) return BookingResult.of(BookingStatusCode.NOT_YOUR_BOOKING);
        Show show = catalog.show(b.showId());
        ShowSeats stock = inventory.get(b.showId());
        synchronized (stock) {
            expire(stock);
            switch (b.status()) {
                case HELD -> {
                    stock.release(b.id());
                    b.setStatus(BookingStatus.CANCELLED);
                }
                case CONFIRMED -> {
                    long before = show.startMillis() - clock.nowMillis();
                    int refund = b.amountCents() * refundPolicy.refundPercent(Math.max(0, before)) / 100;
                    if (refund > 0) payments.refund(paymentRefs.get(b.id()), refund);
                    b.setRefundedCents(refund);
                    stock.release(b.id());
                    b.setStatus(BookingStatus.CANCELLED);
                }
                default -> {
                    return BookingResult.of(BookingStatusCode.WRONG_STATE, b);
                }
            }
            publish("CANCELLED", b);
            return BookingResult.of(BookingStatusCode.OK, b);
        }
    }

    // ---------------------------------------------------------------- reading

    Map<SeatId, SeatState.Kind> seatMap(String showId) {
        Show show = catalog.show(showId);
        ShowSeats stock = seatsOf(show);
        expire(stock);
        return stock.snapshot();
    }

    int available(String showId) {
        return countOf(showId, SeatState.Kind.AVAILABLE);
    }

    int sold(String showId) {
        return countOf(showId, SeatState.Kind.BOOKED);
    }

    private int countOf(String showId, SeatState.Kind kind) {
        ShowSeats stock = seatsOf(catalog.show(showId));
        expire(stock);
        return stock.count(kind);
    }

    Booking booking(String id) { return bookings.get(id); }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class Main {
    private static final long HOUR = 3_600_000L;
    private static final long DAY = 24 * HOUR;

    public static void main(String[] args) {
        // Day 0 is Thursday 1 Jan 1970 UTC, so day 1 is Friday and day 3 is Sunday.
        ManualClock clock = new ManualClock(0);
        Screen screen = Screen.grid("Screen 1", 8, 10, 2, 1);
        Movie movie = new Movie("m1", "Orbit", 128);
        Map<SeatCategory, Integer> prices = Map.of(SeatCategory.REGULAR, 1000, SeatCategory.PREMIUM, 1500, SeatCategory.RECLINER, 2500);
        Catalog catalog = new Catalog();
        catalog.add(new Show("s-thursday", movie, "Grand", "Pune", screen, 19 * HOUR, prices));        // Thursday 19:00
        catalog.add(new Show("s-friday", movie, "Grand", "Pune", screen, 1 * DAY + 20 * HOUR, prices));   // Friday 20:00
        catalog.add(new Show("s-sunday", movie, "Grand", "Pune", screen, 3 * DAY + 10 * HOUR, prices));   // Sunday 10:00

        FakePayments payments = new FakePayments();
        PricingStrategy pricing = new PeakSurcharge(new CategoryPricing());
        BookingService service = new BookingService(catalog, pricing, payments, new TieredRefundPolicy(), clock, 5 * 60_000L);
        List<String> events = new ArrayList<>();
        service.subscribe(e -> events.add(e.type() + " " + e.bookingId()));

        System.out.println("Shows of Orbit in Pune: " + catalog.search("orbit", "pune", clock.nowMillis()).size());

        BookingResult a = service.hold("asha", "s-sunday", List.of("A1", "A2", "A3"));
        System.out.println("Asha holds A1 A2 A3: " + a.code() + ", amount " + a.booking().amountCents());
        BookingResult clash = service.hold("ben", "s-sunday", List.of("A3", "A4"));
        System.out.println("Ben asks for A3 A4: " + clash.code() + " " + clash.conflicts());
        System.out.println("A4 is still free for Ben alone: " + service.hold("ben", "s-sunday", List.of("A4")).code());

        System.out.println("Ben asks for 7 seats: " + service.hold("ben", "s-sunday", List.of("B1", "B2", "B3", "B4", "B5", "B6", "B7")).code());
        System.out.println("Ben asks for Z9: " + service.hold("ben", "s-sunday", List.of("Z9")).code());

        payments.declineNext(true);
        System.out.println("Asha pays, card declined: " + service.confirm("asha", a.booking().id()).code() + ", booking is " + a.booking().status());
        payments.declineNext(false);
        System.out.println("Asha pays again: " + service.confirm("asha", a.booking().id()).code() + ", booking is " + a.booking().status());
        System.out.println("Asha clicks pay twice: " + service.confirm("asha", a.booking().id()).code() + ", charges made: " + payments.chargeCalls());

        BookingResult c = service.hold("chen", "s-sunday", List.of("H1", "H2"));
        System.out.println("Chen holds two recliners: amount " + c.booking().amountCents());
        clock.advance(6 * 60_000L);
        System.out.println("Six minutes later Chen pays: " + service.confirm("chen", c.booking().id()).code());
        System.out.println("H1 is free again: " + service.hold("dev", "s-sunday", List.of("H1")).code());

        BookingResult fri = service.hold("eva", "s-friday", List.of("A1"));
        System.out.println("Friday 20:00 seat A1 costs " + fri.booking().amountCents() + " (weekend evening, +20 percent)");
        BookingResult sun = service.hold("eva", "s-sunday", List.of("A5"));
        System.out.println("Sunday 10:00 seat A5 costs " + sun.booking().amountCents());

        BookingService coupon = new BookingService(catalog, new CouponDiscount(pricing, 25), payments, new TieredRefundPolicy(), clock, 5 * 60_000L);
        System.out.println("With a 25 percent coupon A1 on Friday costs " + coupon.hold("zoe", "s-friday", List.of("A2")).booking().amountCents());

        BookingResult cancelled = service.cancel("asha", a.booking().id());
        System.out.println("Asha cancels more than 24 hours before: " + cancelled.code() + ", refund " + a.booking().refundedCents());
        clock.advance(80 * HOUR + 24 * 60_000L);
        BookingResult late = service.hold("ben", "s-sunday", List.of("C1"));
        System.out.println("Eighty and a half hours in, an hour and a half before the Sunday show, C1 is held: " + late.code());
        BookingResult last = service.confirm("ben", late.booking().id());
        System.out.println("Ben pays: " + last.code());
        System.out.println("Ben cancels 1.5 hours before the show: refund " + (service.cancel("ben", late.booking().id()).booking().refundedCents()));

        System.out.println("Sold seats now: " + service.sold("s-sunday") + ", available: " + service.available("s-sunday"));
        System.out.println("Events: " + events.subList(0, 4) + " ... " + events.size() + " in total");
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
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int failures = 0;
    private static final long HOUR = 3_600_000L;
    private static final long DAY = 24 * HOUR;
    private static final long HOLD = 5 * 60_000L;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    // A payment provider that runs a hook in the middle of a charge, to test what happens while a payment is in flight.
    private static final class HookedPayments implements PaymentGateway {
        final FakePayments inner = new FakePayments();
        Runnable duringCharge = () -> { };

        @Override
        public String charge(String userId, int cents, String key) {
            duringCharge.run();
            return inner.charge(userId, cents, key);
        }

        @Override
        public void refund(String ref, int cents) { inner.refund(ref, cents); }
    }

    private static final class World {
        final ManualClock clock = new ManualClock(0);
        final Catalog catalog = new Catalog();
        final HookedPayments payments = new HookedPayments();
        final Screen screen = Screen.grid("S1", 6, 8, 2, 1);
        final Map<SeatCategory, Integer> prices = Map.of(SeatCategory.REGULAR, 1000, SeatCategory.PREMIUM, 1500, SeatCategory.RECLINER, 2500);
        final BookingService service;

        World(PricingStrategy pricing) {
            catalog.add(new Show("far", new Movie("m", "Orbit", 120), "Grand", "Pune", screen, 3 * DAY + 10 * HOUR, prices));
            service = new BookingService(catalog, pricing, payments, new TieredRefundPolicy(), clock, HOLD);
        }

        World() { this(new CategoryPricing()); }
    }

    public static void main(String[] args) throws Exception {
        seatLabels();
        screenCategories();
        holdIsAllOrNothing();
        holdValidation();
        pricing();
        confirmSellsTheSeats();
        declinedPaymentKeepsTheHold();
        holdsExpire();
        paymentInFlightPinsTheHold();
        repeatedConfirmChargesOnce();
        ownershipAndUnknownIds();
        cancelRefundTiers();
        cancelEdgeCases();
        eventsAreOrdered();
        searchIsFilteredAndSorted();
        oneSeatManyThreads();
        overlappingRequestsNeverShareSeats();
        if (failures > 0) System.exit(1);
    }

    private static void seatLabels() {
        check(SeatId.parse("a12").equals(new SeatId('A', 12)), "labels are case-insensitive");
        boolean bad = false;
        try {
            SeatId.parse("7A");
        } catch (IllegalArgumentException e) {
            bad = true;
        }
        check(bad, "a label must start with a letter");
        check(new SeatId('B', 3).compareTo(new SeatId('A', 9)) > 0, "rows sort before numbers");
    }

    private static void screenCategories() {
        World w = new World();
        check(w.screen.allSeats().size() == 48, "6 rows of 8 seats");
        check(w.screen.seat(SeatId.parse("A1")).category() == SeatCategory.REGULAR, "the front rows are regular");
        check(w.screen.seat(SeatId.parse("D1")).category() == SeatCategory.PREMIUM, "two premium rows before the last");
        check(w.screen.seat(SeatId.parse("F8")).category() == SeatCategory.RECLINER, "the last row is recliners");
    }

    private static void holdIsAllOrNothing() {
        World w = new World();
        check(w.service.hold("u1", "far", List.of("A3")).ok(), "A3 is held");
        BookingResult r = w.service.hold("u2", "far", List.of("A2", "A3", "A4"));
        check(r.code() == BookingStatusCode.SEATS_TAKEN && r.conflicts().equals(List.of(new SeatId('A', 3))), "a request containing a taken seat is refused and names it");
        check(w.service.seatMap("far").get(new SeatId('A', 2)) == SeatState.Kind.AVAILABLE, "the free seats of that request were not held");
        check(w.service.available("far") == 47, "only A3 is out of stock");
    }

    private static void holdValidation() {
        World w = new World();
        check(w.service.hold("u", "nope", List.of("A1")).code() == BookingStatusCode.UNKNOWN_SHOW, "unknown show");
        check(w.service.hold("u", "far", List.of()).code() == BookingStatusCode.NO_SEATS, "no seats asked");
        check(w.service.hold("u", "far", List.of("A1", "A2", "A3", "A4", "A5", "A6", "A7")).code() == BookingStatusCode.TOO_MANY_SEATS, "more than 6 seats");
        check(w.service.hold("u", "far", List.of("Q1")).code() == BookingStatusCode.UNKNOWN_SEAT, "a row that does not exist");
        check(w.service.hold("u", "far", List.of("A1", "A1")).code() == BookingStatusCode.UNKNOWN_SEAT, "the same seat twice");
        check(w.service.hold("u", "far", List.of("A99")).code() == BookingStatusCode.UNKNOWN_SEAT, "a seat number that does not exist");
        w.clock.advance(3 * DAY + 10 * HOUR);
        check(w.service.hold("u", "far", List.of("A1")).code() == BookingStatusCode.SHOW_STARTED, "a show that has started");
    }

    private static void pricing() {
        World w = new World();
        BookingResult mixed = w.service.hold("u", "far", List.of("A1", "D1", "F1"));
        check(mixed.booking().amountCents() == 1000 + 1500 + 2500, "each seat costs its category price");

        Show sundayEvening = new Show("x", new Movie("m", "Orbit", 1), "T", "C", w.screen, 3 * DAY + 19 * HOUR, w.prices); // Sunday 19:00
        Show sundayMorning = new Show("y", new Movie("m", "Orbit", 1), "T", "C", w.screen, 3 * DAY + 10 * HOUR, w.prices);
        Show thursdayEvening = new Show("z", new Movie("m", "Orbit", 1), "T", "C", w.screen, 19 * HOUR, w.prices);
        List<Seat> one = List.of(w.screen.seat(SeatId.parse("A1")));
        PricingStrategy peak = new PeakSurcharge(new CategoryPricing());
        check(peak.price(sundayEvening, one) == 1200, "weekend evening costs 20 percent more");
        check(peak.price(sundayMorning, one) == 1000, "weekend morning does not");
        check(peak.price(thursdayEvening, one) == 1000, "weekday evening does not");
        check(new CouponDiscount(peak, 25).price(sundayEvening, one) == 900, "the coupon is applied after the surcharge");
        check(new CouponDiscount(new CategoryPricing(), 33).price(sundayMorning, one) == 670, "a coupon takes a percentage off the base price");
        boolean refused = false;
        try {
            new CouponDiscount(peak, 101);
        } catch (IllegalArgumentException e) {
            refused = true;
        }
        check(refused, "a coupon above 100 percent is refused");
    }

    private static void confirmSellsTheSeats() {
        World w = new World();
        BookingResult h = w.service.hold("u", "far", List.of("A1", "A2"));
        BookingResult c = w.service.confirm("u", h.booking().id());
        check(c.ok() && c.booking().status() == BookingStatus.CONFIRMED, "paying confirms the booking");
        check(w.service.sold("far") == 2 && w.service.available("far") == 46, "the seats count as sold");
        w.clock.advance(10 * HOLD);
        check(w.service.sold("far") == 2, "a sold seat is not released by the hold timer");
        check(w.service.hold("v", "far", List.of("A1")).code() == BookingStatusCode.SEATS_TAKEN, "a sold seat cannot be held");
    }

    private static void declinedPaymentKeepsTheHold() {
        World w = new World();
        BookingResult h = w.service.hold("u", "far", List.of("A1"));
        w.payments.inner.declineNext(true);
        check(w.service.confirm("u", h.booking().id()).code() == BookingStatusCode.PAYMENT_DECLINED, "a declined card is reported");
        check(h.booking().status() == BookingStatus.HELD, "the booking is back to HELD");
        check(w.service.hold("v", "far", List.of("A1")).code() == BookingStatusCode.SEATS_TAKEN, "the seat is still held for the first customer");
        w.payments.inner.declineNext(false);
        check(w.service.confirm("u", h.booking().id()).ok(), "a second attempt can succeed");
    }

    private static void holdsExpire() {
        World w = new World();
        BookingResult h = w.service.hold("u", "far", List.of("A1"));
        w.clock.advance(HOLD - 1);
        check(w.service.hold("v", "far", List.of("A1")).code() == BookingStatusCode.SEATS_TAKEN, "one millisecond before expiry the hold stands");
        w.clock.advance(1);
        check(w.service.hold("v", "far", List.of("A1")).ok(), "at the expiry time the seat is free for someone else");
        check(h.booking().status() == BookingStatus.EXPIRED, "the first booking is marked EXPIRED");
        check(w.service.confirm("u", h.booking().id()).code() == BookingStatusCode.HOLD_EXPIRED, "paying for an expired hold is refused");
    }

    private static void paymentInFlightPinsTheHold() {
        World w = new World();
        BookingResult h = w.service.hold("u", "far", List.of("A1"));
        List<BookingStatusCode> seenByOthers = new ArrayList<>();
        w.payments.duringCharge = () -> {
            w.clock.advance(10 * HOLD);  // the payment is slow: the hold time passes while we wait
            seenByOthers.add(w.service.hold("v", "far", List.of("A1")).code());
        };
        BookingResult c = w.service.confirm("u", h.booking().id());
        check(c.ok(), "a slow payment still succeeds although the hold time passed during it");
        check(seenByOthers.equals(List.of(BookingStatusCode.SEATS_TAKEN)), "and nobody else could take the seat meanwhile");
    }

    private static void repeatedConfirmChargesOnce() {
        World w = new World();
        BookingResult h = w.service.hold("u", "far", List.of("A1"));
        w.service.confirm("u", h.booking().id());
        BookingResult again = w.service.confirm("u", h.booking().id());
        check(again.ok() && w.payments.inner.chargeCalls() == 1, "a second click on Pay does not charge again");
    }

    private static void ownershipAndUnknownIds() {
        World w = new World();
        BookingResult h = w.service.hold("u", "far", List.of("A1"));
        check(w.service.confirm("mallory", h.booking().id()).code() == BookingStatusCode.NOT_YOUR_BOOKING, "someone else cannot pay for it");
        check(w.service.cancel("mallory", h.booking().id()).code() == BookingStatusCode.NOT_YOUR_BOOKING, "someone else cannot cancel it");
        check(w.service.confirm("u", "B999").code() == BookingStatusCode.NOT_FOUND, "an unknown booking id");
    }

    private static void cancelRefundTiers() {
        long[] beforeShow = {30 * HOUR, 10 * HOUR, 2 * HOUR};
        int[] expected = {2000, 1000, 0};
        for (int i = 0; i < beforeShow.length; i++) {
            World w = new World();
            BookingResult h = w.service.hold("u", "far", List.of("A1", "A2"));
            w.service.confirm("u", h.booking().id());
            w.clock.advance(3 * DAY + 10 * HOUR - beforeShow[i]);
            BookingResult c = w.service.cancel("u", h.booking().id());
            check(c.ok() && c.booking().refundedCents() == expected[i], "cancelling " + beforeShow[i] / HOUR + " hours before refunds " + expected[i]);
            check(w.payments.inner.refunds().size() == (expected[i] > 0 ? 1 : 0), "the provider was asked to refund only when something is due");
            check(w.service.available("far") == 48, "the seats are free again");
        }
    }

    private static void cancelEdgeCases() {
        World w = new World();
        BookingResult h = w.service.hold("u", "far", List.of("A1"));
        check(w.service.cancel("u", h.booking().id()).ok(), "a held booking can be cancelled");
        check(w.service.cancel("u", h.booking().id()).code() == BookingStatusCode.WRONG_STATE, "cancelling twice is refused");
        check(w.service.hold("v", "far", List.of("A1")).ok(), "the seat went back on sale");

        BookingResult e = w.service.hold("u", "far", List.of("B1"));
        w.clock.advance(HOLD);
        check(w.service.cancel("u", e.booking().id()).code() == BookingStatusCode.WRONG_STATE, "an expired booking cannot be cancelled");
    }

    private static void eventsAreOrdered() {
        World w = new World();
        List<String> events = new ArrayList<>();
        w.service.subscribe(e -> events.add(e.type()));
        BookingResult h = w.service.hold("u", "far", List.of("A1"));
        w.service.confirm("u", h.booking().id());
        w.service.cancel("u", h.booking().id());
        check(events.equals(List.of("HELD", "CONFIRMED", "CANCELLED")), "listeners see HELD, CONFIRMED, CANCELLED in order");
    }

    private static void searchIsFilteredAndSorted() {
        World w = new World();
        Screen s = w.screen;
        w.catalog.add(new Show("early", new Movie("m", "Orbit", 120), "Grand", "Pune", s, DAY, w.prices));
        w.catalog.add(new Show("other-city", new Movie("m", "Orbit", 120), "Plaza", "Mumbai", s, DAY, w.prices));
        w.catalog.add(new Show("other-movie", new Movie("n", "Tides", 90), "Grand", "Pune", s, DAY, w.prices));
        List<Show> found = w.catalog.search("orbit", "PUNE", 0);
        check(found.size() == 2 && found.get(0).id().equals("early") && found.get(1).id().equals("far"), "search filters by title and city and sorts by time");
        check(w.catalog.search("orbit", "pune", 2 * DAY).size() == 1, "shows that already started are left out");
    }

    private static void oneSeatManyThreads() throws InterruptedException {
        World w = new World();
        AtomicInteger winners = new AtomicInteger();
        Thread[] threads = new Thread[32];
        for (int i = 0; i < threads.length; i++) {
            final String user = "user" + i;
            threads[i] = new Thread(() -> {
                if (w.service.hold(user, "far", List.of("C4")).ok()) winners.incrementAndGet();
            });
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        check(winners.get() == 1, "32 threads racing for one seat: exactly one wins");
    }

    private static void overlappingRequestsNeverShareSeats() throws InterruptedException {
        World w = new World();
        Map<String, List<SeatId>> won = new ConcurrentHashMap<>();
        String[][] requests = {{"A1", "A2", "A3"}, {"A3", "A4", "A5"}, {"A5", "A6", "A7"}, {"A7", "A8", "B1"}, {"B1", "B2", "B3"}, {"A2", "B2", "C2"}};
        Thread[] threads = new Thread[60];
        for (int i = 0; i < threads.length; i++) {
            final int n = i;
            threads[i] = new Thread(() -> {
                BookingResult r = w.service.hold("user" + n, "far", List.of(requests[n % requests.length]));
                if (r.ok()) won.put(r.booking().id(), r.booking().seats());
            });
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        List<SeatId> all = new ArrayList<>();
        for (List<SeatId> seats : won.values()) all.addAll(seats);
        check(all.size() == new java.util.HashSet<>(all).size(), "no seat is held by two bookings");
        check(w.service.available("far") == 48 - all.size(), "the seat map agrees with the winning bookings");
        check(won.size() >= 1 && won.values().stream().allMatch(s -> s.size() == 3), "every winning booking got all of its seats");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Shows of Orbit in Pune: 3",
      "Asha holds A1 A2 A3: OK, amount 3000",
      "Ben asks for A3 A4: SEATS_TAKEN [A3]",
      "A4 is still free for Ben alone: OK",
      "Ben asks for 7 seats: TOO_MANY_SEATS",
      "Ben asks for Z9: UNKNOWN_SEAT",
      "Asha pays, card declined: PAYMENT_DECLINED, booking is HELD",
      "Asha pays again: OK, booking is CONFIRMED",
      "Asha clicks pay twice: OK, charges made: 2",
      "Chen holds two recliners: amount 5000",
      "Six minutes later Chen pays: HOLD_EXPIRED",
      "H1 is free again: OK",
      "Friday 20:00 seat A1 costs 1200 (weekend evening, +20 percent)",
      "Sunday 10:00 seat A5 costs 1000",
      "With a 25 percent coupon A1 on Friday costs 900",
      "Asha cancels more than 24 hours before: OK, refund 3000",
      "Eighty and a half hours in, an hour and a half before the Sunday show, C1 is held: OK",
      "Ben pays: OK",
      "Ben cancels 1.5 hours before the show: refund 0",
      "Sold seats now: 0, available: 80",
      "Events: [HELD B1, HELD B3, PAYMENT_DECLINED B1, CONFIRMED B1] ... 16 in total",
    ],
  },
};
