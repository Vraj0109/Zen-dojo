import type { LldProject } from "./types";

// Food delivery (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when it was written.

export const LLD_PROJECTS_D_FOOD: Record<string, LldProject> = {
  "lldp-food-cab": {
    files: [
      {
        name: "TimeSource.java",
        code: `// The only way any class here learns the time, so offer timeouts and refund rules are tested by moving a clock.
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

    synchronized void advanceSeconds(int seconds) { now += seconds * 1000L; }
}
`,
      },
      {
        name: "Location.java",
        code: `// A point on a flat map, in kilometres. Real systems use latitude and longitude and a road network; a flat plane keeps
// the design visible and the tests exact.
record Location(double x, double y) {
    double distanceTo(Location other) {
        return Math.hypot(x - other.x, y - other.y);
    }
}
`,
      },
      {
        name: "MenuItem.java",
        code: `record MenuItem(String id, String name, int priceCents) { }
`,
      },
      {
        name: "OrderLine.java",
        code: `record OrderLine(String itemId, int quantity) { }
`,
      },
      {
        name: "Restaurant.java",
        code: `import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// A restaurant: where it is, its menu, which items are sold out right now and whether it takes orders.
final class Restaurant {
    final String id;
    final String name;
    final Location location;
    private final Map<String, MenuItem> menu = new LinkedHashMap<>();
    private final Set<String> soldOut = ConcurrentHashMap.newKeySet();
    private volatile boolean open = true;

    Restaurant(String id, String name, Location location) {
        this.id = id;
        this.name = name;
        this.location = location;
    }

    Restaurant item(String id, String name, int priceCents) {
        menu.put(id, new MenuItem(id, name, priceCents));
        return this;
    }

    MenuItem find(String itemId) { return menu.get(itemId); }

    boolean isSoldOut(String itemId) { return soldOut.contains(itemId); }

    void setSoldOut(String itemId, boolean value) {
        if (value) soldOut.add(itemId);
        else soldOut.remove(itemId);
    }

    boolean isOpen() { return open; }

    void setOpen(boolean value) { open = value; }
}
`,
      },
      {
        name: "OrderStatus.java",
        code: `import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

// The life of an order. The legal moves are data, in one table, so a new state or a new rule is one line and the
// service never has an if-ladder of its own.
enum OrderStatus {
    PLACED, ACCEPTED, PREPARING, READY, PICKED_UP, DELIVERED, REJECTED, CANCELLED;

    private static final Map<OrderStatus, Set<OrderStatus>> NEXT = new EnumMap<>(OrderStatus.class);

    static {
        NEXT.put(PLACED, EnumSet.of(ACCEPTED, REJECTED, CANCELLED));
        NEXT.put(ACCEPTED, EnumSet.of(PREPARING, CANCELLED));
        NEXT.put(PREPARING, EnumSet.of(READY, CANCELLED));
        NEXT.put(READY, EnumSet.of(PICKED_UP, CANCELLED));
        NEXT.put(PICKED_UP, EnumSet.of(DELIVERED));
        NEXT.put(DELIVERED, EnumSet.noneOf(OrderStatus.class));
        NEXT.put(REJECTED, EnumSet.noneOf(OrderStatus.class));
        NEXT.put(CANCELLED, EnumSet.noneOf(OrderStatus.class));
    }

    boolean canMoveTo(OrderStatus next) { return NEXT.get(this).contains(next); }

    boolean isFinal() { return NEXT.get(this).isEmpty(); }
}
`,
      },
      {
        name: "Order.java",
        code: `import java.util.ArrayList;
import java.util.List;

// One order. Its status, courier and history change only inside synchronized(order) blocks of the service.
final class Order {
    final String id;
    final String customerId;
    final Restaurant restaurant;
    final Location dropoff;
    final List<OrderLine> lines;
    final int itemsCents;
    final int feeCents;
    final String paymentRef;
    private OrderStatus status = OrderStatus.PLACED;
    private volatile String courierId;     // volatile, not synchronized: the dispatcher sets it while holding its own lock
    private int refundedCents;
    private final List<String> history = new ArrayList<>();

    Order(String id, String customerId, Restaurant restaurant, Location dropoff, List<OrderLine> lines, int itemsCents, int feeCents, String paymentRef, long now) {
        this.id = id;
        this.customerId = customerId;
        this.restaurant = restaurant;
        this.dropoff = dropoff;
        this.lines = List.copyOf(lines);
        this.itemsCents = itemsCents;
        this.feeCents = feeCents;
        this.paymentRef = paymentRef;
        history.add(now + " PLACED");
    }

    int totalCents() { return itemsCents + feeCents; }

    synchronized OrderStatus status() { return status; }

    String courierId() { return courierId; }

    synchronized int refundedCents() { return refundedCents; }

    synchronized List<String> history() { return List.copyOf(history); }

    // Moves to the next status if the table allows it.
    synchronized boolean moveTo(OrderStatus next, long now) {
        if (!status.canMoveTo(next)) return false;
        status = next;
        history.add(now + " " + next);
        return true;
    }

    void assignCourier(String id) { courierId = id; }

    synchronized void recordRefund(int cents) { refundedCents = cents; }
}
`,
      },
      {
        name: "CourierStatus.java",
        code: `enum CourierStatus { AVAILABLE, OFFERED, BUSY, OFFLINE }
`,
      },
      {
        name: "Courier.java",
        code: `import java.util.concurrent.atomic.AtomicReference;

// A delivery person. The status is the one thing that many orders fight over, so it is an AtomicReference and every
// change is a compare-and-set: "if still AVAILABLE, make me OFFERED" succeeds for exactly one caller.
final class Courier {
    final String id;
    final String name;
    final double rating;
    private volatile Location location;
    private final AtomicReference<CourierStatus> status = new AtomicReference<>(CourierStatus.AVAILABLE);

    Courier(String id, String name, Location location, double rating) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.rating = rating;
    }

    Location location() { return location; }

    void moveTo(Location next) { location = next; }

    CourierStatus status() { return status.get(); }

    boolean tryOffer() { return status.compareAndSet(CourierStatus.AVAILABLE, CourierStatus.OFFERED); }

    boolean confirm() { return status.compareAndSet(CourierStatus.OFFERED, CourierStatus.BUSY); }

    boolean release() {
        return status.compareAndSet(CourierStatus.OFFERED, CourierStatus.AVAILABLE) || status.compareAndSet(CourierStatus.BUSY, CourierStatus.AVAILABLE);
    }

    void goOffline() { status.set(CourierStatus.OFFLINE); }

    boolean goOnline() { return status.compareAndSet(CourierStatus.OFFLINE, CourierStatus.AVAILABLE); }
}
`,
      },
      {
        name: "MatchingStrategy.java",
        code: `import java.util.List;

// Orders the candidate couriers from best to worst for one pickup point. The dispatcher offers the order to them one by
// one. New strategies (batching two orders, ETA from a routing service) are new classes.
interface MatchingStrategy {
    List<Courier> rank(Location pickup, List<Courier> candidates);
}
`,
      },
      {
        name: "NearestFirst.java",
        code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

final class NearestFirst implements MatchingStrategy {
    @Override
    public List<Courier> rank(Location pickup, List<Courier> candidates) {
        List<Courier> sorted = new ArrayList<>(candidates);
        sorted.sort(Comparator.comparingDouble((Courier c) -> c.location().distanceTo(pickup)).thenComparing(c -> c.id));
        return sorted;
    }
}
`,
      },
      {
        name: "BalancedScore.java",
        code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

// Distance matters most, but a courier with a much better rating may be worth a short detour: each rating point is
// worth half a kilometre here. Lower score is better.
final class BalancedScore implements MatchingStrategy {
    @Override
    public List<Courier> rank(Location pickup, List<Courier> candidates) {
        List<Courier> sorted = new ArrayList<>(candidates);
        sorted.sort(Comparator.comparingDouble((Courier c) -> c.location().distanceTo(pickup) - 0.5 * c.rating).thenComparing(c -> c.id));
        return sorted;
    }
}
`,
      },
      {
        name: "FeePolicy.java",
        code: `// What the customer pays for delivery, in cents. Inputs are the distance and the current demand and supply.
interface FeePolicy {
    int fee(double km, int openOrders, int freeCouriers);
}
`,
      },
      {
        name: "DistanceFee.java",
        code: `// A base fee plus a rate per kilometre, with a surge of 50 percent when open orders outnumber free couriers.
final class DistanceFee implements FeePolicy {
    @Override
    public int fee(double km, int openOrders, int freeCouriers) {
        int base = 30 + (int) Math.ceil(km) * 10;
        return openOrders > freeCouriers ? base * 3 / 2 : base;
    }
}
`,
      },
      {
        name: "PaymentGateway.java",
        code: `interface PaymentGateway {
    // A payment reference, or null if declined.
    String charge(String customerId, int cents, String idempotencyKey);

    void refund(String paymentRef, int cents);
}
`,
      },
      {
        name: "FakePayments.java",
        code: `import java.util.ArrayList;
import java.util.List;

final class FakePayments implements PaymentGateway {
    private final List<String> refunds = new ArrayList<>();
    private boolean decline;
    private int counter;

    synchronized void declineNext(boolean value) { decline = value; }

    synchronized List<String> refunds() { return List.copyOf(refunds); }

    @Override
    public synchronized String charge(String customerId, int cents, String key) {
        return decline ? null : "pay-" + (++counter);
    }

    @Override
    public synchronized void refund(String paymentRef, int cents) { refunds.add(paymentRef + ":" + cents); }
}
`,
      },
      {
        name: "Offer.java",
        code: `// "Courier X may take order Y until this time."
record Offer(String orderId, String courierId, long expiresAt) { }
`,
      },
      {
        name: "DeliveryListener.java",
        code: `interface DeliveryListener {
    void onEvent(String type, String orderId, String detail);
}
`,
      },
      {
        name: "Dispatcher.java",
        code: `import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

// Finds a courier for an order by offering it to one courier at a time. Each offer has a deadline. If the courier
// declines, does not answer in time, or was taken by another order meanwhile, the next candidate is tried. When nobody
// in the current radius is free, the radius doubles up to a maximum; then the order waits for the next tick.
// All of its state sits behind one lock: it is small, and a dispatch step is quick.
final class Dispatcher {
    static final long OFFER_MILLIS = 30_000;
    static final double START_RADIUS_KM = 3;
    static final double MAX_RADIUS_KM = 12;

    private static final class Pending {
        final Order order;
        final Deque<Courier> queue = new ArrayDeque<>();
        final Set<String> tried = new HashSet<>();
        double radius = START_RADIUS_KM;
        Offer current;

        Pending(Order order) { this.order = order; }
    }

    private final Map<String, Courier> couriers;
    private final MatchingStrategy strategy;
    private final TimeSource clock;
    private final DeliveryListener listener;
    private final Map<String, Pending> pending = new HashMap<>();

    Dispatcher(Map<String, Courier> couriers, MatchingStrategy strategy, TimeSource clock, DeliveryListener listener) {
        this.couriers = couriers;
        this.strategy = strategy;
        this.clock = clock;
        this.listener = listener;
    }

    synchronized void start(Order order) {
        Pending p = new Pending(order);
        pending.put(order.id, p);
        step(p);
    }

    // The courier answers an offer. True when the answer counted: an accept that made them the order's courier, or a decline.
    // False for an answer to an offer they do not hold or one that has run out.
    synchronized boolean respond(String orderId, String courierId, boolean accept) {
        Pending p = pending.get(orderId);
        if (p == null || p.current == null || !p.current.courierId().equals(courierId)) return false;
        if (clock.nowMillis() >= p.current.expiresAt()) return false;   // too late: tick will move on
        Courier courier = couriers.get(courierId);
        p.current = null;
        if (accept && courier.confirm()) {
            p.order.assignCourier(courierId);
            pending.remove(orderId);
            listener.onEvent("COURIER_ASSIGNED", orderId, courierId);
            return true;
        }
        courier.release();
        p.tried.add(courierId);
        listener.onEvent("OFFER_DECLINED", orderId, courierId);
        step(p);
        return !accept;
    }

    // Moves time forward: expired offers pass to the next courier, and orders without any candidate try again.
    synchronized void tick() {
        long now = clock.nowMillis();
        for (Pending p : new ArrayList<>(pending.values())) {
            if (p.current != null && now >= p.current.expiresAt()) {
                couriers.get(p.current.courierId()).release();
                p.tried.add(p.current.courierId());
                listener.onEvent("OFFER_EXPIRED", p.order.id, p.current.courierId());
                p.current = null;
                step(p);
            } else if (p.current == null) {
                step(p);
            }
        }
    }

    // The order is cancelled or finished: drop its search and free a courier that holds an open offer.
    synchronized void stop(String orderId) {
        Pending p = pending.remove(orderId);
        if (p != null && p.current != null) couriers.get(p.current.courierId()).release();
    }

    synchronized boolean isSearching(String orderId) { return pending.containsKey(orderId); }

    synchronized String currentOfferTo(String orderId) {
        Pending p = pending.get(orderId);
        return p == null || p.current == null ? null : p.current.courierId();
    }

    private void step(Pending p) {
        while (p.current == null) {
            Courier next = p.queue.pollFirst();
            if (next == null) {
                List<Courier> candidates = new ArrayList<>();
                for (Courier c : couriers.values()) {
                    boolean near = c.location().distanceTo(p.order.restaurant.location) <= p.radius;
                    if (c.status() == CourierStatus.AVAILABLE && near && !p.tried.contains(c.id)) candidates.add(c);
                }
                if (candidates.isEmpty()) {
                    if (p.radius >= MAX_RADIUS_KM) return;   // nobody: wait for the next tick
                    p.radius = Math.min(MAX_RADIUS_KM, p.radius * 2);
                    listener.onEvent("RADIUS_WIDENED", p.order.id, "" + p.radius);
                    continue;
                }
                p.queue.addAll(strategy.rank(p.order.restaurant.location, candidates));
                next = p.queue.pollFirst();
            }
            if (next.tryOffer()) {   // may fail: another order got this courier first
                p.current = new Offer(p.order.id, next.id, clock.nowMillis() + OFFER_MILLIS);
                listener.onEvent("OFFERED", p.order.id, next.id);
            }
        }
    }
}
`,
      },
      {
        name: "DeliveryResultCode.java",
        code: `enum DeliveryResultCode {
    OK, UNKNOWN_RESTAURANT, RESTAURANT_CLOSED, UNKNOWN_ITEM, ITEM_SOLD_OUT, BAD_QUANTITY, NO_ITEMS, PAYMENT_DECLINED,
    UNKNOWN_ORDER, NOT_YOUR_ORDER, WRONG_STATE, NOT_THE_COURIER
}
`,
      },
      {
        name: "DeliveryResult.java",
        code: `record DeliveryResult(DeliveryResultCode code, Order order, int cents) {
    static DeliveryResult of(DeliveryResultCode code) { return new DeliveryResult(code, null, 0); }

    boolean ok() { return code == DeliveryResultCode.OK; }
}
`,
      },
      {
        name: "DeliveryService.java",
        code: `import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

// The facade for customers, restaurants and couriers. Every status change goes through Order.moveTo, so the legal
// transitions are enforced in one place. A cancellation pays back according to how far the order has got.
final class DeliveryService {
    private final Map<String, Restaurant> restaurants = new ConcurrentHashMap<>();
    private final Map<String, Courier> couriers = new ConcurrentHashMap<>();
    private final Map<String, Order> orders = new ConcurrentHashMap<>();
    private final List<DeliveryListener> listeners = new CopyOnWriteArrayList<>();
    private final Dispatcher dispatcher;
    private final FeePolicy feePolicy;
    private final PaymentGateway payments;
    private final TimeSource clock;
    private final AtomicInteger nextId = new AtomicInteger(1);

    DeliveryService(MatchingStrategy strategy, FeePolicy feePolicy, PaymentGateway payments, TimeSource clock) {
        this.feePolicy = feePolicy;
        this.payments = payments;
        this.clock = clock;
        this.dispatcher = new Dispatcher(couriers, strategy, clock, this::publish);
    }

    void subscribe(DeliveryListener listener) { listeners.add(listener); }

    private void publish(String type, String orderId, String detail) {
        for (DeliveryListener l : listeners) l.onEvent(type, orderId, detail);
    }

    void addRestaurant(Restaurant r) { restaurants.put(r.id, r); }

    void addCourier(Courier c) { couriers.put(c.id, c); }

    Order order(String id) { return orders.get(id); }

    // ---------------------------------------------------------------- customer

    DeliveryResult placeOrder(String customerId, String restaurantId, Location dropoff, List<OrderLine> lines) {
        Restaurant r = restaurants.get(restaurantId);
        if (r == null) return DeliveryResult.of(DeliveryResultCode.UNKNOWN_RESTAURANT);
        if (!r.isOpen()) return DeliveryResult.of(DeliveryResultCode.RESTAURANT_CLOSED);
        if (lines.isEmpty()) return DeliveryResult.of(DeliveryResultCode.NO_ITEMS);
        int items = 0;
        for (OrderLine line : lines) {
            MenuItem item = r.find(line.itemId());
            if (item == null) return DeliveryResult.of(DeliveryResultCode.UNKNOWN_ITEM);
            if (r.isSoldOut(line.itemId())) return DeliveryResult.of(DeliveryResultCode.ITEM_SOLD_OUT);
            if (line.quantity() <= 0 || line.quantity() > 20) return DeliveryResult.of(DeliveryResultCode.BAD_QUANTITY);
            items += item.priceCents() * line.quantity();
        }
        int free = 0;
        for (Courier c : couriers.values()) if (c.status() == CourierStatus.AVAILABLE) free++;
        int open = 0;
        for (Order o : orders.values()) if (!o.status().isFinal()) open++;
        int fee = feePolicy.fee(r.location.distanceTo(dropoff), open, free);

        String id = "O" + nextId.getAndIncrement();
        String ref = payments.charge(customerId, items + fee, id);
        if (ref == null) return DeliveryResult.of(DeliveryResultCode.PAYMENT_DECLINED);
        Order order = new Order(id, customerId, r, dropoff, lines, items, fee, ref, clock.nowMillis());
        orders.put(id, order);
        publish("PLACED", id, customerId);
        return new DeliveryResult(DeliveryResultCode.OK, order, order.totalCents());
    }

    // Cancel by the customer. Refund: everything before cooking starts, half while it is being cooked, nothing once it is
    // ready for pickup or on the road (the food exists and the courier has worked).
    DeliveryResult cancel(String customerId, String orderId) {
        Order o = orders.get(orderId);
        if (o == null) return DeliveryResult.of(DeliveryResultCode.UNKNOWN_ORDER);
        if (!o.customerId.equals(customerId)) return DeliveryResult.of(DeliveryResultCode.NOT_YOUR_ORDER);
        synchronized (o) {
            OrderStatus before = o.status();
            if (!o.moveTo(OrderStatus.CANCELLED, clock.nowMillis())) return DeliveryResult.of(DeliveryResultCode.WRONG_STATE);
            int refund = switch (before) {
                case PLACED, ACCEPTED -> o.totalCents();
                case PREPARING -> o.totalCents() / 2;
                default -> 0;
            };
            refundAndFree(o, refund);
            publish("CANCELLED", o.id, "refund " + refund);
            return new DeliveryResult(DeliveryResultCode.OK, o, refund);
        }
    }

    private void refundAndFree(Order o, int refund) {
        if (refund > 0) payments.refund(o.paymentRef, refund);
        o.recordRefund(refund);
        dispatcher.stop(o.id);
        String courierId = o.courierId();
        if (courierId != null) couriers.get(courierId).release();
    }

    // ---------------------------------------------------------------- restaurant

    DeliveryResult accept(String orderId) {
        return advance(orderId, OrderStatus.ACCEPTED, o -> dispatcher.start(o));
    }

    DeliveryResult reject(String orderId) {
        Order o = orders.get(orderId);
        if (o == null) return DeliveryResult.of(DeliveryResultCode.UNKNOWN_ORDER);
        synchronized (o) {
            if (!o.moveTo(OrderStatus.REJECTED, clock.nowMillis())) return DeliveryResult.of(DeliveryResultCode.WRONG_STATE);
            refundAndFree(o, o.totalCents());
            publish("REJECTED", o.id, "full refund");
            return new DeliveryResult(DeliveryResultCode.OK, o, o.totalCents());
        }
    }

    DeliveryResult startPreparing(String orderId) { return advance(orderId, OrderStatus.PREPARING, o -> { }); }

    DeliveryResult markReady(String orderId) { return advance(orderId, OrderStatus.READY, o -> { }); }

    private DeliveryResult advance(String orderId, OrderStatus next, java.util.function.Consumer<Order> after) {
        Order o = orders.get(orderId);
        if (o == null) return DeliveryResult.of(DeliveryResultCode.UNKNOWN_ORDER);
        synchronized (o) {
            if (!o.moveTo(next, clock.nowMillis())) return DeliveryResult.of(DeliveryResultCode.WRONG_STATE);
            publish(next.name(), o.id, "");
            after.accept(o);
            return new DeliveryResult(DeliveryResultCode.OK, o, 0);
        }
    }

    // ---------------------------------------------------------------- courier

    boolean offerAnswer(String orderId, String courierId, boolean accept) { return dispatcher.respond(orderId, courierId, accept); }

    DeliveryResult pickUp(String orderId, String courierId) {
        Order o = orders.get(orderId);
        if (o == null) return DeliveryResult.of(DeliveryResultCode.UNKNOWN_ORDER);
        synchronized (o) {
            if (!courierId.equals(o.courierId())) return DeliveryResult.of(DeliveryResultCode.NOT_THE_COURIER);
            if (!o.moveTo(OrderStatus.PICKED_UP, clock.nowMillis())) return DeliveryResult.of(DeliveryResultCode.WRONG_STATE);
            publish("PICKED_UP", o.id, courierId);
            return new DeliveryResult(DeliveryResultCode.OK, o, 0);
        }
    }

    DeliveryResult deliver(String orderId, String courierId) {
        Order o = orders.get(orderId);
        if (o == null) return DeliveryResult.of(DeliveryResultCode.UNKNOWN_ORDER);
        synchronized (o) {
            if (!courierId.equals(o.courierId())) return DeliveryResult.of(DeliveryResultCode.NOT_THE_COURIER);
            if (!o.moveTo(OrderStatus.DELIVERED, clock.nowMillis())) return DeliveryResult.of(DeliveryResultCode.WRONG_STATE);
            couriers.get(courierId).release();
            publish("DELIVERED", o.id, courierId);
            return new DeliveryResult(DeliveryResultCode.OK, o, 0);
        }
    }

    // Time passes: offers that were not answered move on.
    void tick() { dispatcher.tick(); }

    String currentOfferTo(String orderId) { return dispatcher.currentOfferTo(orderId); }
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
        FakePayments payments = new FakePayments();
        DeliveryService service = new DeliveryService(new NearestFirst(), new DistanceFee(), payments, clock);
        List<String> events = new ArrayList<>();
        service.subscribe((type, order, detail) -> events.add(type + " " + detail));

        Restaurant spice = new Restaurant("spice", "Spice Route", new Location(0, 0));
        spice.item("biryani", "Biryani", 1_200).item("naan", "Naan", 300).item("lassi", "Lassi", 400);
        service.addRestaurant(spice);
        service.addCourier(new Courier("c1", "Chitra", new Location(1, 0), 4.5));
        service.addCourier(new Courier("c2", "Chirag", new Location(0.5, 0.5), 4.9));
        service.addCourier(new Courier("c3", "Chaitra", new Location(9, 0), 4.0));

        Location home = new Location(2, 2);
        System.out.println("Closed restaurant: " + closedCheck(service, spice, home));
        System.out.println("Sold out item: " + soldOutCheck(service, spice, home));

        DeliveryResult placed = service.placeOrder("asha", "spice", home, List.of(new OrderLine("biryani", 2), new OrderLine("naan", 4)));
        Order order = placed.order();
        System.out.println("Placed: items " + order.itemsCents + ", fee " + order.feeCents + ", total " + placed.cents() + ", status " + order.status());
        System.out.println("Restaurant accepts: " + service.accept(order.id).code() + ", first offer goes to " + service.currentOfferTo(order.id));
        System.out.println("Chirag declines: " + service.offerAnswer(order.id, "c2", false) + ", next offer goes to " + service.currentOfferTo(order.id));
        clock.advanceSeconds(31);
        service.tick();
        System.out.println("Chitra does not answer in 30 s; next offer goes to " + service.currentOfferTo(order.id));
        System.out.println("Chaitra accepts: " + service.offerAnswer(order.id, "c3", true) + ", courier of the order " + order.courierId());

        System.out.println("Cooking: " + service.startPreparing(order.id).code() + ", ready: " + service.markReady(order.id).code());
        System.out.println("Pick up by the wrong courier: " + service.pickUp(order.id, "c1").code());
        System.out.println("Pick up: " + service.pickUp(order.id, "c3").code() + ", cancel now: " + service.cancel("asha", order.id).code());
        System.out.println("Deliver: " + service.deliver(order.id, "c3").code() + ", status " + order.status());

        DeliveryResult second = service.placeOrder("ben", "spice", home, List.of(new OrderLine("lassi", 1)));
        service.accept(second.order().id);
        service.offerAnswer(second.order().id, "c2", true);
        service.startPreparing(second.order().id);
        DeliveryResult cancelled = service.cancel("ben", second.order().id);
        System.out.println("Cancelled while cooking: refund " + cancelled.cents() + " of " + second.order().totalCents());

        DeliveryResult third = service.placeOrder("chen", "spice", home, List.of(new OrderLine("naan", 1)));
        System.out.println("Restaurant rejects: " + service.reject(third.order().id).code() + ", refund " + third.order().refundedCents());
        System.out.println("History of the first order: " + order.history().size() + " steps, last " + order.history().get(order.history().size() - 1));
        System.out.println("Events: " + events.subList(0, 6));
    }

    private static DeliveryResultCode closedCheck(DeliveryService service, Restaurant r, Location home) {
        r.setOpen(false);
        DeliveryResultCode code = service.placeOrder("x", "spice", home, List.of(new OrderLine("naan", 1))).code();
        r.setOpen(true);
        return code;
    }

    private static DeliveryResultCode soldOutCheck(DeliveryService service, Restaurant r, Location home) {
        r.setSoldOut("lassi", true);
        DeliveryResultCode code = service.placeOrder("x", "spice", home, List.of(new OrderLine("lassi", 1))).code();
        r.setSoldOut("lassi", false);
        return code;
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
import java.util.concurrent.atomic.AtomicInteger;

public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static final Location HOME = new Location(2, 0);

    private static final class World {
        final ManualClock clock = new ManualClock(0);
        final FakePayments payments = new FakePayments();
        final Restaurant spice = new Restaurant("r", "Spice", new Location(0, 0));
        final List<String> events = new ArrayList<>();
        final DeliveryService service;

        World(MatchingStrategy strategy) {
            spice.item("b", "Biryani", 1_000).item("n", "Naan", 250);
            service = new DeliveryService(strategy, new DistanceFee(), payments, clock);
            service.addRestaurant(spice);
            service.subscribe((type, order, detail) -> events.add(type + " " + detail));
        }

        World() { this(new NearestFirst()); }

        Courier courier(String id, double x, double y, double rating) {
            Courier c = new Courier(id, id, new Location(x, y), rating);
            service.addCourier(c);
            return c;
        }

        Order place(String customer) {
            return service.placeOrder(customer, "r", HOME, List.of(new OrderLine("b", 1), new OrderLine("n", 2))).order();
        }
    }

    public static void main(String[] args) throws Exception {
        statusTable();
        placingValidation();
        feeAndTotals();
        rankingStrategies();
        offersGoOneAtATime();
        lateAndWrongAnswers();
        radiusWidens();
        nobodyAvailableThenSomeoneAppears();
        courierLifecycle();
        cancelRefunds();
        cancelReleasesCouriers();
        rejectAndAuthorisation();
        historyIsRecorded();
        oneCourierManyThreads();
        manyOrdersOneCourier();
        if (failures > 0) System.exit(1);
    }

    private static void statusTable() {
        check(OrderStatus.PLACED.canMoveTo(OrderStatus.ACCEPTED) && OrderStatus.READY.canMoveTo(OrderStatus.PICKED_UP), "the normal path is allowed");
        check(!OrderStatus.PLACED.canMoveTo(OrderStatus.READY) && !OrderStatus.DELIVERED.canMoveTo(OrderStatus.CANCELLED), "skipping steps and undoing a delivery are not");
        check(!OrderStatus.PICKED_UP.canMoveTo(OrderStatus.CANCELLED), "an order on the road cannot be cancelled");
        check(OrderStatus.DELIVERED.isFinal() && OrderStatus.REJECTED.isFinal() && !OrderStatus.READY.isFinal(), "final states are final");
    }

    private static void placingValidation() {
        World w = new World();
        List<OrderLine> one = List.of(new OrderLine("n", 1));
        check(w.service.placeOrder("u", "zz", HOME, one).code() == DeliveryResultCode.UNKNOWN_RESTAURANT, "unknown restaurant");
        check(w.service.placeOrder("u", "r", HOME, List.of()).code() == DeliveryResultCode.NO_ITEMS, "empty order");
        check(w.service.placeOrder("u", "r", HOME, List.of(new OrderLine("zz", 1))).code() == DeliveryResultCode.UNKNOWN_ITEM, "unknown item");
        check(w.service.placeOrder("u", "r", HOME, List.of(new OrderLine("n", 0))).code() == DeliveryResultCode.BAD_QUANTITY, "quantity zero");
        check(w.service.placeOrder("u", "r", HOME, List.of(new OrderLine("n", 21))).code() == DeliveryResultCode.BAD_QUANTITY, "more than 20 of one item");
        w.spice.setSoldOut("n", true);
        check(w.service.placeOrder("u", "r", HOME, one).code() == DeliveryResultCode.ITEM_SOLD_OUT, "sold out item");
        w.spice.setSoldOut("n", false);
        w.spice.setOpen(false);
        check(w.service.placeOrder("u", "r", HOME, one).code() == DeliveryResultCode.RESTAURANT_CLOSED, "closed restaurant");
        w.spice.setOpen(true);
        w.payments.declineNext(true);
        check(w.service.placeOrder("u", "r", HOME, one).code() == DeliveryResultCode.PAYMENT_DECLINED, "declined payment");
        w.payments.declineNext(false);
        check(w.service.order("O1") == null, "a refused order was not stored");
    }

    private static void feeAndTotals() {
        World w = new World();
        DeliveryResult r = w.service.placeOrder("u", "r", HOME, List.of(new OrderLine("b", 1), new OrderLine("n", 2)));
        check(r.order().itemsCents == 1_500, "items: one biryani and two naan");
        check(r.order().feeCents == 30 + 20 && r.cents() == 1_550, "fee: 0.30 plus 0.10 per km for 2 km, no surge with a free courier or no orders");
        DistanceFee fee = new DistanceFee();
        check(fee.fee(0.2, 0, 0) == 40 && fee.fee(2.0, 0, 0) == 50, "a started kilometre counts as a whole one");
        check(fee.fee(2.0, 5, 2) == 75 && fee.fee(2.0, 2, 2) == 50, "surge of 50 percent only when open orders outnumber free couriers");
    }

    private static void rankingStrategies() {
        World w = new World();
        Courier near = w.courier("a", 1, 0, 3.0);
        Courier far = w.courier("b", 1.3, 0, 5.0);
        Courier twin = w.courier("c", 1, 0, 4.0);
        Location pickup = new Location(0, 0);
        List<String> nearest = new NearestFirst().rank(pickup, List.of(far, twin, near)).stream().map(c -> c.id).toList();
        check(nearest.equals(List.of("a", "c", "b")), "nearest first, ties by id");
        List<String> balanced = new BalancedScore().rank(pickup, List.of(near, twin, far)).stream().map(c -> c.id).toList();
        check(balanced.equals(List.of("b", "c", "a")), "a much better rating can outweigh a 300 metre detour");
    }

    private static void offersGoOneAtATime() {
        World w = new World();
        w.courier("a", 1, 0, 4.0);
        w.courier("b", 0.5, 0, 4.0);
        Order o = w.place("u");
        w.service.accept(o.id);
        check("b".equals(w.service.currentOfferTo(o.id)), "the nearest courier gets the first offer");
        check(w.service.offerAnswer(o.id, "b", false), "a decline is a valid answer");
        check("a".equals(w.service.currentOfferTo(o.id)), "so the next courier is offered");
        w.clock.advanceSeconds(31);
        w.service.tick();
        check(w.service.currentOfferTo(o.id) == null, "an unanswered offer expires and the declined courier is not asked again");
        check(w.events.contains("OFFER_EXPIRED a") && w.events.contains("OFFER_DECLINED b"), "both are in the event stream");
    }

    private static void lateAndWrongAnswers() {
        World w = new World();
        w.courier("a", 1, 0, 4.0);
        w.courier("b", 2, 0, 4.0);
        Order o = w.place("u");
        w.service.accept(o.id);
        check(!w.service.offerAnswer(o.id, "b", true), "a courier who was not offered cannot take it");
        w.clock.advanceSeconds(30);
        check(!w.service.offerAnswer(o.id, "a", true), "an answer at the deadline is too late");
        w.service.tick();
        check("b".equals(w.service.currentOfferTo(o.id)), "after the tick, the next courier has the offer");
        check(w.service.offerAnswer(o.id, "b", true) && "b".equals(o.courierId()), "and accepting makes them the courier");
        check(w.service.currentOfferTo(o.id) == null, "the search has ended");
    }

    private static void radiusWidens() {
        World w = new World();
        w.courier("far", 9, 0, 4.0);
        Order o = w.place("u");
        w.service.accept(o.id);
        check("far".equals(w.service.currentOfferTo(o.id)), "a courier 9 km away is found after the radius widens");
        check(w.events.contains("RADIUS_WIDENED 6.0") && w.events.contains("RADIUS_WIDENED 12.0"), "3 km, then 6, then 12");
    }

    private static void nobodyAvailableThenSomeoneAppears() {
        World w = new World();
        Courier c = w.courier("a", 1, 0, 4.0);
        c.goOffline();
        Order o = w.place("u");
        w.service.accept(o.id);
        check(w.service.currentOfferTo(o.id) == null, "an offline courier is never offered");
        w.service.tick();
        check(w.service.currentOfferTo(o.id) == null, "still nobody, the order keeps waiting");
        c.goOnline();
        w.service.tick();
        check("a".equals(w.service.currentOfferTo(o.id)), "when a courier comes online, the next tick offers the order");
    }

    private static void courierLifecycle() {
        World w = new World();
        Courier c = w.courier("a", 1, 0, 4.0);
        Order o = w.place("u");
        w.service.accept(o.id);
        check(c.status() == CourierStatus.OFFERED, "an offered courier cannot be offered another order");
        w.service.offerAnswer(o.id, "a", true);
        check(c.status() == CourierStatus.BUSY, "an accepted courier is busy");
        w.service.startPreparing(o.id);
        w.service.markReady(o.id);
        check(w.service.pickUp(o.id, "a").ok() && w.service.deliver(o.id, "a").ok(), "pick up and deliver");
        check(c.status() == CourierStatus.AVAILABLE && o.status() == OrderStatus.DELIVERED, "the courier is free again");
        check(w.service.deliver(o.id, "a").code() == DeliveryResultCode.WRONG_STATE, "delivering twice is refused");
    }

    private static void cancelRefunds() {
        int[] expected = {1_550, 1_550, 775, 0};
        String[] steps = {"placed", "accepted", "preparing", "ready"};
        for (int i = 0; i < steps.length; i++) {
            World w = new World();
            w.courier("a", 1, 0, 4.0);
            Order o = w.place("u");
            if (i >= 1) {
                w.service.accept(o.id);
                w.service.offerAnswer(o.id, "a", true);
            }
            if (i >= 2) w.service.startPreparing(o.id);
            if (i >= 3) w.service.markReady(o.id);
            DeliveryResult c = w.service.cancel("u", o.id);
            check(c.ok() && c.cents() == expected[i] && o.refundedCents() == expected[i], "cancel when " + steps[i] + " refunds " + expected[i]);
            check(w.payments.refunds().size() == (expected[i] > 0 ? 1 : 0), "the gateway is asked to refund only when something is due");
        }
        World w = new World();
        w.courier("a", 1, 0, 4.0);
        Order o = w.place("u");
        w.service.accept(o.id);
        w.service.offerAnswer(o.id, "a", true);
        w.service.startPreparing(o.id);
        w.service.markReady(o.id);
        w.service.pickUp(o.id, "a");
        check(w.service.cancel("u", o.id).code() == DeliveryResultCode.WRONG_STATE, "no cancel once picked up");
    }

    private static void cancelReleasesCouriers() {
        World w = new World();
        Courier c = w.courier("a", 1, 0, 4.0);
        Order o = w.place("u");
        w.service.accept(o.id);
        check(c.status() == CourierStatus.OFFERED, "an offer is pending");
        w.service.cancel("u", o.id);
        check(c.status() == CourierStatus.AVAILABLE, "cancelling frees the courier who held the offer");

        Order o2 = w.place("v");
        w.service.accept(o2.id);
        w.service.offerAnswer(o2.id, "a", true);
        check(c.status() == CourierStatus.BUSY, "an assigned courier is busy");
        w.service.cancel("v", o2.id);
        check(c.status() == CourierStatus.AVAILABLE, "cancelling frees an assigned courier too");
    }

    private static void rejectAndAuthorisation() {
        World w = new World();
        w.courier("a", 1, 0, 4.0);
        Order o = w.place("u");
        check(w.service.reject(o.id).cents() == 1_550 && o.status() == OrderStatus.REJECTED, "a rejected order is refunded in full");
        check(w.service.accept(o.id).code() == DeliveryResultCode.WRONG_STATE, "a rejected order cannot be accepted");
        Order p = w.place("u");
        check(w.service.cancel("mallory", p.id).code() == DeliveryResultCode.NOT_YOUR_ORDER, "only the customer can cancel");
        check(w.service.accept("O99").code() == DeliveryResultCode.UNKNOWN_ORDER, "unknown order");
        w.service.accept(p.id);
        w.service.offerAnswer(p.id, "a", true);
        w.service.startPreparing(p.id);
        w.service.markReady(p.id);
        check(w.service.pickUp(p.id, "zed").code() == DeliveryResultCode.NOT_THE_COURIER, "only the assigned courier can pick up");
        check(w.service.markReady(p.id).code() == DeliveryResultCode.WRONG_STATE, "marking ready twice is refused");
    }

    private static void historyIsRecorded() {
        World w = new World();
        w.courier("a", 1, 0, 4.0);
        Order o = w.place("u");
        w.service.accept(o.id);
        w.clock.advanceSeconds(5);
        w.service.startPreparing(o.id);
        List<String> h = o.history();
        check(h.size() == 3 && h.get(0).endsWith("PLACED") && h.get(2).equals("5000 PREPARING"), "each status change is stamped in the history");
    }

    private static void oneCourierManyThreads() throws InterruptedException {
        Courier c = new Courier("x", "x", new Location(0, 0), 4.0);
        AtomicInteger winners = new AtomicInteger();
        Thread[] threads = new Thread[40];
        for (int i = 0; i < threads.length; i++) {
            threads[i] = new Thread(() -> {
                if (c.tryOffer()) winners.incrementAndGet();
            });
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        check(winners.get() == 1, "40 threads offering the same courier: exactly one succeeds");
    }

    private static void manyOrdersOneCourier() throws InterruptedException {
        World w = new World();
        Courier c = w.courier("only", 1, 0, 4.0);
        List<Order> orders = new ArrayList<>();
        for (int i = 0; i < 20; i++) orders.add(w.place("u" + i));
        Thread[] threads = new Thread[orders.size()];
        for (int i = 0; i < threads.length; i++) {
            final Order o = orders.get(i);
            threads[i] = new Thread(() -> {
                w.service.accept(o.id);
                w.service.offerAnswer(o.id, "only", true);
            });
        }
        for (Thread t : threads) t.start();
        for (Thread t : threads) t.join();
        long assigned = orders.stream().filter(o -> "only".equals(o.courierId())).count();
        check(assigned == 1, "20 orders accepted at once for one courier: exactly one gets them");
        check(c.status() == CourierStatus.BUSY, "and the courier is busy, not offered twice");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Closed restaurant: RESTAURANT_CLOSED",
      "Sold out item: ITEM_SOLD_OUT",
      "Placed: items 3600, fee 60, total 3660, status PLACED",
      "Restaurant accepts: OK, first offer goes to c2",
      "Chirag declines: true, next offer goes to c1",
      "Chitra does not answer in 30 s; next offer goes to c3",
      "Chaitra accepts: true, courier of the order c3",
      "Cooking: OK, ready: OK",
      "Pick up by the wrong courier: NOT_THE_COURIER",
      "Pick up: OK, cancel now: WRONG_STATE",
      "Deliver: OK, status DELIVERED",
      "Cancelled while cooking: refund 230 of 460",
      "Restaurant rejects: OK, refund 360",
      "History of the first order: 6 steps, last 31000 DELIVERED",
      "Events: [PLACED asha, ACCEPTED , OFFERED c2, OFFER_DECLINED c2, OFFERED c1, OFFER_EXPIRED c1]",
    ],
  },
};
