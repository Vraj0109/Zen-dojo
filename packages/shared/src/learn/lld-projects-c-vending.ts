import type { LldProject } from "./types";

// Vending machine and ATM, one project (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when it was written.

export const LLD_PROJECTS_C_VENDING: Record<string, LldProject> = {
  "lldp-vending-atm": {
    files: [
      {
        name: "TimeSource.java",
        code: `// The only way any class in this project learns the time. Production code passes the system clock; tests pass a
// ManualClock and move it by hand, so timeouts and daily limits are tested without sleeping.
interface TimeSource {
    long nowMillis();

    static TimeSource system() {
        return System::currentTimeMillis;
    }
}
`,
      },
      {
        name: "ManualClock.java",
        code: `// A clock that only moves when the test says so.
final class ManualClock implements TimeSource {
    private long now;

    ManualClock(long start) { this.now = start; }

    @Override
    public long nowMillis() { return now; }

    void advance(long millis) { now += millis; }
}
`,
      },
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
        code: `record Product(String name, int priceCents) {
    Product {
        if (priceCents <= 0) throw new IllegalArgumentException("price must be positive: " + priceCents);
    }
}
`,
      },
      {
        name: "SaleStatus.java",
        code: `// Every normal result of pressing Select. None of these is a program error, so none is an exception.
enum SaleStatus {
    DISPENSED, INSUFFICIENT_FUNDS, SOLD_OUT, UNKNOWN_CODE, NO_CHANGE, NO_MONEY, OUT_OF_SERVICE, CARD_DECLINED
}
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

// What is in the slots. It knows nothing about money. Each slot has a capacity, so a refill cannot overfill it.
final class Inventory {
    static final int SLOT_CAPACITY = 10;

    private final Map<String, Product> products = new HashMap<>();
    private final Map<String, Integer> quantity = new HashMap<>();

    // Adds stock to a slot and returns how many items really fit.
    int stock(String code, Product product, int count) {
        Product existing = products.get(code);
        if (existing != null && !existing.equals(product)) {
            throw new IllegalArgumentException("slot " + code + " already holds " + existing.name());
        }
        products.put(code, product);
        int room = SLOT_CAPACITY - quantity.getOrDefault(code, 0);
        int accepted = Math.max(0, Math.min(room, count));
        quantity.merge(code, accepted, Integer::sum);
        return accepted;
    }

    boolean knows(String code) { return products.containsKey(code); }

    Product product(String code) { return products.get(code); }

    int quantity(String code) { return quantity.getOrDefault(code, 0); }

    boolean available(String code) { return quantity(code) > 0; }

    void dispenseOne(String code) { quantity.merge(code, -1, Integer::sum); }
}
`,
      },
      {
        name: "Cashbox.java",
        code: `import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

// The coins the machine itself holds (its change float plus past takings). Customer coins are kept elsewhere
// until a sale succeeds.
final class Cashbox {
    private final EnumMap<Coin, Integer> coins = new EnumMap<>(Coin.class);

    Cashbox(Map<Coin, Integer> start) { coins.putAll(start); }

    EnumMap<Coin, Integer> snapshot() { return new EnumMap<>(coins); }

    void replaceWith(Map<Coin, Integer> next) {
        coins.clear();
        coins.putAll(next);
    }

    int totalCents() {
        int sum = 0;
        for (Map.Entry<Coin, Integer> e : coins.entrySet()) sum += e.getKey().cents() * e.getValue();
        return sum;
    }

    // Staff collection: take everything above "keep" coins of each kind, so the machine can still give change.
    List<Coin> collectAbove(int keep) {
        List<Coin> taken = new ArrayList<>();
        for (Coin coin : Coin.values()) {
            int have = coins.getOrDefault(coin, 0);
            for (int i = keep; i < have; i++) taken.add(coin);
            coins.put(coin, Math.min(have, keep));
        }
        return taken;
    }
}
`,
      },
      {
        name: "ChangeMaker.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

// Makes exact change from the coins that are really available. A plain greedy loop is not enough when stock is
// limited: with one quarter and three dimes, 30 cents needs three dimes, and "take the quarter first" fails.
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
        name: "Settlement.java",
        code: `import java.util.List;

// The answer of a payment session to "take this price". approved: the money moved and change is the change due.
// Not approved: status says why and refund is what goes back to the customer. Nothing was changed in that case.
record Settlement(boolean approved, SaleStatus status, List<Coin> change, List<Coin> refund) {
    static Settlement paid(List<Coin> change) {
        return new Settlement(true, SaleStatus.DISPENSED, change, List.of());
    }

    static Settlement failed(SaleStatus status, List<Coin> refund) {
        return new Settlement(false, status, List.of(), refund);
    }
}
`,
      },
      {
        name: "PaymentSession.java",
        code: `import java.util.List;

// Strategy for "how the customer pays". The machine only knows this interface: coins and cards are two
// implementations, and a phone wallet would be a third. One session lives from the first coin or tap to the end of
// the sale, a cancel or a timeout.
interface PaymentSession {
    String label();

    // Money available to spend. A card has no balance the machine can see, so it reports "unlimited" and the
    // gateway decides when the sale is attempted.
    int availableCents();

    // Tries to pay the price. Must change nothing unless it returns an approved Settlement.
    Settlement settle(int priceCents, Cashbox cashbox);

    // Gives back whatever the customer put in. Called on cancel, timeout and fault.
    List<Coin> abort();
}
`,
      },
      {
        name: "CashSession.java",
        code: `import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Optional;

// Coins the customer has put in. They stay in this list, apart from the cashbox, until the sale succeeds, so a
// refund is just "return the list".
final class CashSession implements PaymentSession {
    private final List<Coin> inserted = new ArrayList<>();

    void add(Coin coin) { inserted.add(coin); }

    @Override
    public String label() { return "cash"; }

    @Override
    public int availableCents() {
        int sum = 0;
        for (Coin coin : inserted) sum += coin.cents();
        return sum;
    }

    @Override
    public Settlement settle(int priceCents, Cashbox cashbox) {
        // Change may come from the customer's own coins too, so build the pool first and commit only on success.
        EnumMap<Coin, Integer> pool = cashbox.snapshot();
        for (Coin coin : inserted) pool.merge(coin, 1, Integer::sum);
        Optional<List<Coin>> change = ChangeMaker.make(availableCents() - priceCents, pool);
        if (change.isEmpty()) return Settlement.failed(SaleStatus.NO_CHANGE, abort());
        for (Coin coin : change.get()) pool.merge(coin, -1, Integer::sum);
        cashbox.replaceWith(pool);
        inserted.clear();
        return Settlement.paid(change.get());
    }

    @Override
    public List<Coin> abort() {
        List<Coin> back = new ArrayList<>(inserted);
        inserted.clear();
        return back;
    }
}
`,
      },
      {
        name: "CardGateway.java",
        code: `// The bank or card processor, seen from the machine. One method, so a test can fake it with a lambda.
interface CardGateway {
    // True if the amount was charged to the card.
    boolean charge(String cardId, int cents);
}
`,
      },
      {
        name: "CardSession.java",
        code: `import java.util.List;

// Card payment: nothing is held by the machine, the gateway is asked once, at sale time.
final class CardSession implements PaymentSession {
    private final String cardId;
    private final CardGateway gateway;

    CardSession(String cardId, CardGateway gateway) {
        this.cardId = cardId;
        this.gateway = gateway;
    }

    @Override
    public String label() { return "card " + cardId; }

    @Override
    public int availableCents() { return Integer.MAX_VALUE; }

    @Override
    public Settlement settle(int priceCents, Cashbox cashbox) {
        if (!gateway.charge(cardId, priceCents)) return Settlement.failed(SaleStatus.CARD_DECLINED, List.of());
        return Settlement.paid(List.of());
    }

    @Override
    public List<Coin> abort() { return List.of(); }
}
`,
      },
      {
        name: "VendingState.java",
        code: `import java.util.List;

// State pattern: what each button does depends on the state. The defaults describe "button does nothing here",
// so a state only overrides the buttons that mean something in it.
interface VendingState {
    String name();

    default boolean insert(VendingMachine machine, Coin coin) { return false; }

    default boolean tap(VendingMachine machine, String cardId) { return false; }

    default Outcome select(VendingMachine machine, String code) { return Outcome.of(SaleStatus.NO_MONEY); }

    default List<Coin> cancel(VendingMachine machine) { return List.of(); }

    // Called by whoever owns the clock. Only HasMoney cares.
    default List<Coin> tick(VendingMachine machine) { return List.of(); }

    // Staff may only open the machine when no customer is mid-sale.
    default boolean canStartMaintenance() { return false; }

    // Refilling and collecting cash are allowed only in maintenance.
    default boolean staffAccess() { return false; }
}
`,
      },
      {
        name: "IdleState.java",
        code: `final class IdleState implements VendingState {
    @Override
    public String name() { return "IDLE"; }

    @Override
    public boolean insert(VendingMachine machine, Coin coin) {
        machine.startCash().add(coin);
        machine.touch();
        machine.setState(new HasMoneyState());
        return true;
    }

    @Override
    public boolean tap(VendingMachine machine, String cardId) {
        machine.startCard(cardId);
        machine.touch();
        machine.setState(new HasMoneyState());
        return true;
    }

    @Override
    public boolean canStartMaintenance() { return true; }
}
`,
      },
      {
        name: "HasMoneyState.java",
        code: `import java.util.List;

// A customer is mid-sale: coins are in, or a card was tapped.
final class HasMoneyState implements VendingState {
    @Override
    public String name() { return "HAS_MONEY"; }

    @Override
    public boolean insert(VendingMachine machine, Coin coin) {
        CashSession cash = machine.cashSessionOrNull();
        if (cash == null) return false; // a card session cannot take coins
        cash.add(coin);
        machine.touch();
        return true;
    }

    @Override
    public Outcome select(VendingMachine machine, String code) {
        Outcome outcome = machine.trySell(code);
        // After a sale, a refund for missing change or a declined card, the machine is empty-handed again.
        switch (outcome.status()) {
            case DISPENSED, NO_CHANGE, CARD_DECLINED -> machine.setState(new IdleState());
            default -> machine.touch();
        }
        return outcome;
    }

    @Override
    public List<Coin> cancel(VendingMachine machine) {
        List<Coin> refund = machine.abortSession("cancelled");
        machine.setState(new IdleState());
        return refund;
    }

    @Override
    public List<Coin> tick(VendingMachine machine) {
        if (!machine.timedOut()) return List.of();
        List<Coin> refund = machine.abortSession("timeout");
        machine.setState(new IdleState());
        return refund;
    }
}
`,
      },
      {
        name: "OutOfServiceState.java",
        code: `// A fault was reported. Every customer button is refused: insert and tap return false, so coins are not accepted.
final class OutOfServiceState implements VendingState {
    @Override
    public String name() { return "OUT_OF_SERVICE"; }

    @Override
    public Outcome select(VendingMachine machine, String code) { return Outcome.of(SaleStatus.OUT_OF_SERVICE); }

    @Override
    public boolean canStartMaintenance() { return true; }
}
`,
      },
      {
        name: "MaintenanceState.java",
        code: `// A staff member has the door open. Customers are refused, staff operations are allowed.
final class MaintenanceState implements VendingState {
    @Override
    public String name() { return "MAINTENANCE"; }

    @Override
    public Outcome select(VendingMachine machine, String code) { return Outcome.of(SaleStatus.OUT_OF_SERVICE); }

    @Override
    public boolean staffAccess() { return true; }
}
`,
      },
      {
        name: "VendingMachine.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;

// One physical machine serves one customer at a time, so every public method is synchronized. The state objects
// hold no data, so they are cheap to create and safe to share. The clock is injected.
final class VendingMachine {
    private final Inventory inventory;
    private final Cashbox cashbox;
    private final TimeSource clock;
    private final CardGateway gateway;
    private final long timeoutMillis;
    private final List<String> journal = new ArrayList<>();
    private VendingState state = new IdleState();
    private PaymentSession session; // null when no customer is mid-sale
    private long lastActivity;

    VendingMachine(Inventory inventory, Map<Coin, Integer> startingCoins, CardGateway gateway, TimeSource clock, long timeoutMillis) {
        this.inventory = inventory;
        this.cashbox = new Cashbox(startingCoins);
        this.gateway = gateway;
        this.clock = clock;
        this.timeoutMillis = timeoutMillis;
    }

    // ---------------------------------------------------------------- customer buttons

    public synchronized boolean insert(Coin coin) { return state.insert(this, coin); }

    public synchronized boolean tapCard(String cardId) { return state.tap(this, cardId); }

    public synchronized Outcome select(String code) { return state.select(this, code); }

    public synchronized List<Coin> cancel() { return state.cancel(this); }

    // The owner of the clock calls this now and then (a scheduler in production, the test by hand).
    public synchronized List<Coin> tick() { return state.tick(this); }

    // ---------------------------------------------------------------- staff and fault

    public synchronized boolean startMaintenance() {
        if (!state.canStartMaintenance()) return false;
        state = new MaintenanceState();
        log("maintenance started");
        return true;
    }

    public synchronized int refill(String code, Product product, int count) {
        requireStaff();
        int accepted = inventory.stock(code, product, count);
        log("refill " + code + " +" + accepted);
        return accepted;
    }

    public synchronized List<Coin> collectCash(int keepPerCoin) {
        requireStaff();
        List<Coin> taken = cashbox.collectAbove(keepPerCoin);
        log("collected " + taken.size() + " coins");
        return taken;
    }

    public synchronized void finishMaintenance() {
        requireStaff();
        state = new IdleState();
        log("maintenance finished");
    }

    // A sensor says something is broken. Any customer money goes back and every button is refused.
    public synchronized List<Coin> reportFault(String reason) {
        List<Coin> refund = abortSession("fault");
        state = new OutOfServiceState();
        log("out of service: " + reason);
        return refund;
    }

    private void requireStaff() {
        if (!state.staffAccess()) throw new IllegalStateException("staff operations need maintenance mode, state is " + state.name());
    }

    // ---------------------------------------------------------------- reading

    public synchronized String stateName() { return state.name(); }

    public synchronized int cashboxCents() { return cashbox.totalCents(); }

    public synchronized int stockOf(String code) { return inventory.quantity(code); }

    public synchronized List<String> journal() { return List.copyOf(journal); }

    // ---------------------------------------------------------------- used by the states (package-private)

    void setState(VendingState next) { state = next; }

    void touch() { lastActivity = clock.nowMillis(); }

    boolean timedOut() { return clock.nowMillis() - lastActivity >= timeoutMillis; }

    CashSession startCash() {
        CashSession cash = new CashSession();
        session = cash;
        return cash;
    }

    void startCard(String cardId) { session = new CardSession(cardId, gateway); }

    CashSession cashSessionOrNull() { return session instanceof CashSession cash ? cash : null; }

    List<Coin> abortSession(String why) {
        if (session == null) return List.of();
        List<Coin> back = session.abort();
        log(why + ": " + session.label() + ", refund " + back.size() + " coins");
        session = null;
        return back;
    }

    Outcome trySell(String code) {
        if (!inventory.knows(code)) return Outcome.of(SaleStatus.UNKNOWN_CODE);
        if (!inventory.available(code)) return Outcome.of(SaleStatus.SOLD_OUT);
        Product product = inventory.product(code);
        if (session.availableCents() < product.priceCents()) return Outcome.of(SaleStatus.INSUFFICIENT_FUNDS);

        Settlement settlement = session.settle(product.priceCents(), cashbox);
        String label = session.label();
        session = null;
        if (!settlement.approved()) {
            log("sale of " + code + " failed: " + settlement.status());
            return new Outcome(settlement.status(), null, settlement.refund());
        }
        inventory.dispenseOne(code);
        log("sold " + code + " for " + label + ", change " + settlement.change().size() + " coins");
        return new Outcome(SaleStatus.DISPENSED, product, settlement.change());
    }

    private void log(String what) { journal.add(clock.nowMillis() + " " + what); }
}
`,
      },
      {
        name: "Note.java",
        code: `// Bank notes, largest first: CashDispenser tries them in this order.
enum Note {
    N2000(2000), N500(500), N200(200), N100(100);

    private final int value;

    Note(int value) { this.value = value; }

    int value() { return value; }

    static int smallest() { return N100.value; }
}
`,
      },
      {
        name: "Card.java",
        code: `// What the card reader reads: the card number and the account it belongs to. The PIN is never part of the card.
record Card(String number, String accountId) {
    // Only this form may appear in logs and receipts.
    String masked() {
        return "****" + number.substring(Math.max(0, number.length() - 4));
    }
}
`,
      },
      {
        name: "PinResult.java",
        code: `enum PinResult { OK, WRONG, CARD_BLOCKED }
`,
      },
      {
        name: "HoldResult.java",
        code: `enum HoldResult { APPROVED, INSUFFICIENT_FUNDS, DAILY_LIMIT_EXCEEDED, UNKNOWN_ACCOUNT }
`,
      },
      {
        name: "BankService.java",
        code: `// The bank, seen from the ATM. The ATM never touches balances directly: it asks for a hold, and only when the cash is
// really out does it ask to confirm. If the cash cannot be dispensed it asks to reverse. Every call that changes
// money carries a transaction id and is idempotent, so a retry after a timeout cannot debit twice.
interface BankService {
    PinResult verifyPin(Card card, String pin);

    void blockCard(String cardNumber);

    // Money the customer can still spend (balance minus holds).
    int available(String accountId);

    HoldResult hold(String accountId, int amount, String txId);

    void confirm(String txId);

    void reverse(String txId);
}
`,
      },
      {
        name: "InMemoryBank.java",
        code: `import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Map;
import java.util.Set;

// A small bank for the demo and the tests. It is shared by every ATM, so its methods are synchronized. A real bank
// would be a remote service behind the same interface.
final class InMemoryBank implements BankService {
    private static final long DAY_MILLIS = 86_400_000L;

    private static final class Account {
        long balance;
        long held;
        final int dailyLimit;
        long day = -1;
        int usedToday;

        Account(long balance, int dailyLimit) {
            this.balance = balance;
            this.dailyLimit = dailyLimit;
        }
    }

    private enum HoldState { HELD, CONFIRMED, REVERSED, REJECTED }

    private static final class Hold {
        final String accountId;
        final int amount;
        final long day;
        final HoldResult result;
        HoldState state;

        Hold(String accountId, int amount, long day, HoldResult result, HoldState state) {
            this.accountId = accountId;
            this.amount = amount;
            this.day = day;
            this.result = result;
            this.state = state;
        }
    }

    private record PinRecord(String salt, String hash) { }

    private final TimeSource clock;
    private final SecureRandom random = new SecureRandom();
    private final Map<String, Account> accounts = new HashMap<>();
    private final Map<String, Hold> holds = new HashMap<>();
    private final Map<String, PinRecord> pins = new HashMap<>();
    private final Set<String> blocked = new HashSet<>();

    InMemoryBank(TimeSource clock) { this.clock = clock; }

    synchronized void openAccount(String accountId, long balance, int dailyLimit) {
        accounts.put(accountId, new Account(balance, dailyLimit));
    }

    // Stores a salted hash of the PIN, never the PIN.
    synchronized Card issueCard(String number, String accountId, String pin) {
        byte[] saltBytes = new byte[8];
        random.nextBytes(saltBytes);
        String salt = HexFormat.of().formatHex(saltBytes);
        pins.put(number, new PinRecord(salt, hash(salt, pin)));
        return new Card(number, accountId);
    }

    private static String hash(String salt, String pin) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest((salt + ":" + pin).getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    @Override
    public synchronized PinResult verifyPin(Card card, String pin) {
        PinRecord record = pins.get(card.number());
        if (record == null || blocked.contains(card.number())) return PinResult.CARD_BLOCKED;
        byte[] expected = record.hash().getBytes(StandardCharsets.UTF_8);
        byte[] actual = hash(record.salt(), pin).getBytes(StandardCharsets.UTF_8);
        return MessageDigest.isEqual(expected, actual) ? PinResult.OK : PinResult.WRONG;
    }

    @Override
    public synchronized void blockCard(String cardNumber) { blocked.add(cardNumber); }

    @Override
    public synchronized int available(String accountId) {
        Account account = accounts.get(accountId);
        return account == null ? 0 : (int) (account.balance - account.held);
    }

    @Override
    public synchronized HoldResult hold(String accountId, int amount, String txId) {
        Hold prior = holds.get(txId);
        if (prior != null) return prior.result; // a retry gets the first answer and changes nothing

        long today = clock.nowMillis() / DAY_MILLIS;
        Account account = accounts.get(accountId);
        if (account == null) return reject(txId, accountId, amount, today, HoldResult.UNKNOWN_ACCOUNT);
        if (account.day != today) {
            account.day = today;
            account.usedToday = 0;
        }
        if (account.balance - account.held < amount) return reject(txId, accountId, amount, today, HoldResult.INSUFFICIENT_FUNDS);
        if (account.usedToday + amount > account.dailyLimit) return reject(txId, accountId, amount, today, HoldResult.DAILY_LIMIT_EXCEEDED);

        account.held += amount;
        account.usedToday += amount;
        holds.put(txId, new Hold(accountId, amount, today, HoldResult.APPROVED, HoldState.HELD));
        return HoldResult.APPROVED;
    }

    private HoldResult reject(String txId, String accountId, int amount, long day, HoldResult why) {
        holds.put(txId, new Hold(accountId, amount, day, why, HoldState.REJECTED));
        return why;
    }

    @Override
    public synchronized void confirm(String txId) {
        Hold hold = find(txId);
        if (hold.state == HoldState.CONFIRMED) return; // idempotent
        if (hold.state != HoldState.HELD) throw new IllegalStateException("transaction " + txId + " is " + hold.state);
        Account account = accounts.get(hold.accountId);
        account.held -= hold.amount;
        account.balance -= hold.amount;
        hold.state = HoldState.CONFIRMED;
    }

    @Override
    public synchronized void reverse(String txId) {
        Hold hold = find(txId);
        if (hold.state == HoldState.REVERSED) return; // idempotent
        if (hold.state != HoldState.HELD) throw new IllegalStateException("cannot reverse transaction " + txId + ", it is " + hold.state);
        Account account = accounts.get(hold.accountId);
        account.held -= hold.amount;
        if (account.day == hold.day) account.usedToday -= hold.amount; // give back today's limit, but only today's
        hold.state = HoldState.REVERSED;
    }

    private Hold find(String txId) {
        Hold hold = holds.get(txId);
        if (hold == null) throw new IllegalArgumentException("unknown transaction " + txId);
        return hold;
    }
}
`,
      },
      {
        name: "DispenseException.java",
        code: `// The cash mechanism failed (a jam, a sensor). Checked, because every caller must decide what to do with the money.
class DispenseException extends Exception {
    private static final long serialVersionUID = 1L;

    DispenseException(String message) { super(message); }
}
`,
      },
      {
        name: "NoteDispenser.java",
        code: `import java.util.Map;

// The hardware that pushes notes out. A test replaces it with FakeHardware to simulate a jam.
interface NoteDispenser {
    void dispense(Map<Note, Integer> notes) throws DispenseException;
}
`,
      },
      {
        name: "FakeHardware.java",
        code: `import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

// A dispenser that records what it was asked to give out and can be told to jam on the next call.
final class FakeHardware implements NoteDispenser {
    private boolean jamNext;
    private final List<Map<Note, Integer>> given = new ArrayList<>();

    void jamNextTime() { jamNext = true; }

    List<Map<Note, Integer>> given() { return given; }

    @Override
    public void dispense(Map<Note, Integer> notes) throws DispenseException {
        if (jamNext) {
            jamNext = false;
            throw new DispenseException("notes jammed in the shutter");
        }
        given.add(new EnumMap<>(notes));
    }
}
`,
      },
      {
        name: "CashDispenser.java",
        code: `import java.util.EnumMap;
import java.util.Map;
import java.util.Optional;

// The cassettes: how many notes of each value are loaded. plan() decides which notes to give for an amount WITHOUT
// taking them out; remove() takes them out after the hardware has really dispensed. Planning first is what lets the
// ATM refuse "I cannot pay this" before it has touched the customer's account.
final class CashDispenser {
    private final EnumMap<Note, Integer> cassettes = new EnumMap<>(Note.class);

    CashDispenser(Map<Note, Integer> loaded) { cassettes.putAll(loaded); }

    void load(Note note, int count) { cassettes.merge(note, count, Integer::sum); }

    int totalCash() {
        int sum = 0;
        for (Map.Entry<Note, Integer> e : cassettes.entrySet()) sum += e.getKey().value() * e.getValue();
        return sum;
    }

    int count(Note note) { return cassettes.getOrDefault(note, 0); }

    // Largest notes first, but with backtracking: with one 500 and three 200s, 600 cannot start with the 500 (100 is
    // left and there is no 100 note), so the search falls back to three 200s. Plain greedy would refuse the customer.
    Optional<Map<Note, Integer>> plan(int amount) {
        Note[] notes = Note.values();
        int[] used = new int[notes.length];
        if (!search(0, amount, notes, used)) return Optional.empty();
        EnumMap<Note, Integer> plan = new EnumMap<>(Note.class);
        for (int i = 0; i < notes.length; i++) {
            if (used[i] > 0) plan.put(notes[i], used[i]);
        }
        return Optional.of(plan);
    }

    private boolean search(int i, int left, Note[] notes, int[] used) {
        if (left == 0) return true;
        if (i == notes.length) return false;
        int most = Math.min(left / notes[i].value(), count(notes[i]));
        for (int n = most; n >= 0; n--) {
            used[i] = n;
            if (search(i + 1, left - n * notes[i].value(), notes, used)) return true;
        }
        used[i] = 0;
        return false;
    }

    void remove(Map<Note, Integer> plan) {
        for (Map.Entry<Note, Integer> e : plan.entrySet()) {
            int left = count(e.getKey()) - e.getValue();
            if (left < 0) throw new IllegalStateException("cassette " + e.getKey() + " would go negative");
            cassettes.put(e.getKey(), left);
        }
    }
}
`,
      },
      {
        name: "AtmStatus.java",
        code: `enum AtmStatus {
    OK, WRONG_PIN, CARD_CAPTURED, NO_CARD, CARD_IN_USE, NOT_AUTHENTICATED, INVALID_AMOUNT, EXCEEDS_TRANSACTION_LIMIT,
    ATM_CANNOT_PAY, INSUFFICIENT_FUNDS, DAILY_LIMIT_EXCEEDED, DISPENSE_FAILED, SESSION_EXPIRED
}
`,
      },
      {
        name: "AtmResponse.java",
        code: `import java.util.Map;

// What the screen shows after a button. notes is only filled for a withdrawal; balance is -1 when not applicable.
record AtmResponse(AtmStatus status, String message, Map<Note, Integer> notes, int balance) {
    static AtmResponse of(AtmStatus status, String message) {
        return new AtmResponse(status, message, Map.of(), -1);
    }
}
`,
      },
      {
        name: "AuditEntry.java",
        code: `record AuditEntry(long time, String event, String detail) {
    @Override
    public String toString() { return time + " " + event + " " + detail; }
}
`,
      },
      {
        name: "AuditLog.java",
        code: `import java.util.ArrayList;
import java.util.List;

// Append-only trail of what the ATM did, written for disputes ("the machine took my money"). It receives masked card
// numbers and never a PIN: the log must be safe to hand to support staff.
final class AuditLog {
    private final TimeSource clock;
    private final List<AuditEntry> entries = new ArrayList<>();

    AuditLog(TimeSource clock) { this.clock = clock; }

    synchronized void record(String event, String detail) {
        entries.add(new AuditEntry(clock.nowMillis(), event, detail));
    }

    synchronized List<AuditEntry> entries() { return List.copyOf(entries); }

    synchronized boolean contains(String event) {
        return entries.stream().anyMatch(e -> e.event().equals(event));
    }
}
`,
      },
      {
        name: "AtmState.java",
        code: `// Same idea as the vending machine: every button asks the current state. The defaults answer "not possible now".
interface AtmState {
    String name();

    default AtmResponse insertCard(Atm atm, Card card) {
        return AtmResponse.of(AtmStatus.CARD_IN_USE, "a card is already inserted");
    }

    default AtmResponse enterPin(Atm atm, String pin) {
        return AtmResponse.of(AtmStatus.NO_CARD, "insert a card first");
    }

    default AtmResponse withdraw(Atm atm, int amount) {
        return AtmResponse.of(AtmStatus.NOT_AUTHENTICATED, "enter your PIN first");
    }

    default AtmResponse balance(Atm atm) {
        return AtmResponse.of(AtmStatus.NOT_AUTHENTICATED, "enter your PIN first");
    }

    default AtmResponse eject(Atm atm) {
        return AtmResponse.of(AtmStatus.NO_CARD, "no card to return");
    }

    // The clock owner calls this. Sessions that wait too long are ended so a forgotten card is not left in the slot.
    default AtmResponse tick(Atm atm) {
        return AtmResponse.of(AtmStatus.OK, "nothing to do");
    }
}
`,
      },
      {
        name: "IdleAtmState.java",
        code: `final class IdleAtmState implements AtmState {
    @Override
    public String name() { return "IDLE"; }

    @Override
    public AtmResponse insertCard(Atm atm, Card card) {
        atm.beginSession(card);
        atm.setState(new CardInsertedState());
        return AtmResponse.of(AtmStatus.OK, "enter your PIN");
    }
}
`,
      },
      {
        name: "CardInsertedState.java",
        code: `// Waiting for the PIN. Three wrong tries and the card is captured and blocked at the bank.
final class CardInsertedState implements AtmState {
    @Override
    public String name() { return "CARD_INSERTED"; }

    @Override
    public AtmResponse enterPin(Atm atm, String pin) {
        PinResult result = atm.bank().verifyPin(atm.card(), pin);
        atm.touch();
        switch (result) {
            case OK -> {
                atm.audit().record("PIN_OK", atm.card().masked());
                atm.setState(new AuthenticatedState());
                return AtmResponse.of(AtmStatus.OK, "welcome");
            }
            case WRONG -> {
                int left = atm.registerWrongPin();
                atm.audit().record("PIN_WRONG", atm.card().masked() + " attempts left " + left);
                if (left > 0) return AtmResponse.of(AtmStatus.WRONG_PIN, "wrong PIN, " + left + " tries left");
                return atm.captureCard("too many wrong PINs");
            }
            default -> {
                return atm.captureCard("card is blocked");
            }
        }
    }

    @Override
    public AtmResponse eject(Atm atm) { return atm.endSession("card returned"); }

    @Override
    public AtmResponse tick(Atm atm) { return atm.expireIfIdle(); }
}
`,
      },
      {
        name: "AuthenticatedState.java",
        code: `import java.util.Map;

final class AuthenticatedState implements AtmState {
    @Override
    public String name() { return "AUTHENTICATED"; }

    @Override
    public AtmResponse withdraw(Atm atm, int amount) {
        atm.touch();
        return atm.doWithdraw(amount);
    }

    @Override
    public AtmResponse balance(Atm atm) {
        atm.touch();
        int available = atm.bank().available(atm.card().accountId());
        return new AtmResponse(AtmStatus.OK, "available balance", Map.of(), available);
    }

    @Override
    public AtmResponse eject(Atm atm) { return atm.endSession("card returned"); }

    @Override
    public AtmResponse tick(Atm atm) { return atm.expireIfIdle(); }
}
`,
      },
      {
        name: "Atm.java",
        code: `import java.util.Map;
import java.util.Optional;

// One ATM. It is the context of the state pattern and the place where a withdrawal is orchestrated:
//   plan the notes -> hold the money at the bank -> dispense -> take the notes out of the cassettes -> confirm.
// If dispensing fails after the hold, the hold is reversed. Public methods are synchronized: one customer at a time.
final class Atm {
    private final String id;
    private final BankService bank;
    private final CashDispenser dispenser;
    private final NoteDispenser hardware;
    private final TimeSource clock;
    private final AuditLog audit;
    private final int perTransactionLimit;
    private final long sessionTimeoutMillis;
    private AtmState state = new IdleAtmState();
    private Card card;
    private int wrongPins;
    private long lastActivity;
    private int transactionCounter;

    static final int MAX_PIN_TRIES = 3;

    Atm(String id, BankService bank, CashDispenser dispenser, NoteDispenser hardware, TimeSource clock,
            int perTransactionLimit, long sessionTimeoutMillis) {
        this.id = id;
        this.bank = bank;
        this.dispenser = dispenser;
        this.hardware = hardware;
        this.clock = clock;
        this.audit = new AuditLog(clock);
        this.perTransactionLimit = perTransactionLimit;
        this.sessionTimeoutMillis = sessionTimeoutMillis;
    }

    // ---------------------------------------------------------------- customer buttons

    public synchronized AtmResponse insertCard(Card newCard) { return state.insertCard(this, newCard); }

    public synchronized AtmResponse enterPin(String pin) { return state.enterPin(this, pin); }

    public synchronized AtmResponse withdraw(int amount) { return state.withdraw(this, amount); }

    public synchronized AtmResponse balance() { return state.balance(this); }

    public synchronized AtmResponse eject() { return state.eject(this); }

    public synchronized AtmResponse tick() { return state.tick(this); }

    public synchronized String stateName() { return state.name(); }

    // ---------------------------------------------------------------- used by the states

    BankService bank() { return bank; }

    AuditLog audit() { return audit; }

    Card card() { return card; }

    void setState(AtmState next) { state = next; }

    void touch() { lastActivity = clock.nowMillis(); }

    void beginSession(Card inserted) {
        card = inserted;
        wrongPins = 0;
        touch();
        audit.record("CARD_INSERTED", inserted.masked());
    }

    int registerWrongPin() {
        wrongPins++;
        return MAX_PIN_TRIES - wrongPins;
    }

    AtmResponse endSession(String why) {
        audit.record("CARD_RETURNED", card.masked() + " " + why);
        card = null;
        state = new IdleAtmState();
        return AtmResponse.of(AtmStatus.OK, why);
    }

    AtmResponse captureCard(String why) {
        bank.blockCard(card.number());
        audit.record("CARD_CAPTURED", card.masked() + " " + why);
        card = null;
        state = new IdleAtmState();
        return AtmResponse.of(AtmStatus.CARD_CAPTURED, "card kept: " + why);
    }

    AtmResponse expireIfIdle() {
        if (clock.nowMillis() - lastActivity < sessionTimeoutMillis) return AtmResponse.of(AtmStatus.OK, "session active");
        audit.record("SESSION_TIMEOUT", card.masked());
        endSession("timeout");
        return AtmResponse.of(AtmStatus.SESSION_EXPIRED, "session ended, card returned");
    }

    AtmResponse doWithdraw(int amount) {
        if (amount <= 0 || amount % Note.smallest() != 0) {
            return AtmResponse.of(AtmStatus.INVALID_AMOUNT, "amount must be a multiple of " + Note.smallest());
        }
        if (amount > perTransactionLimit) {
            return AtmResponse.of(AtmStatus.EXCEEDS_TRANSACTION_LIMIT, "at most " + perTransactionLimit + " per transaction");
        }
        // 1. Can this machine pay the amount at all? Decided before the bank is asked for anything.
        Optional<Map<Note, Integer>> plan = dispenser.plan(amount);
        if (plan.isEmpty()) return AtmResponse.of(AtmStatus.ATM_CANNOT_PAY, "this ATM cannot pay " + amount + " with its notes");

        // 2. Ask the bank to hold the money under a fresh transaction id.
        String txId = id + "-T" + (++transactionCounter);
        HoldResult hold = bank.hold(card.accountId(), amount, txId);
        audit.record("HOLD", txId + " " + amount + " " + hold);
        if (hold != HoldResult.APPROVED) return refusal(hold);

        // 3. Push the notes out. If the hardware fails, give the money back.
        try {
            hardware.dispense(plan.get());
        } catch (DispenseException e) {
            bank.reverse(txId);
            audit.record("REVERSED", txId + " " + e.getMessage());
            return AtmResponse.of(AtmStatus.DISPENSE_FAILED, "could not dispense, you were not charged");
        }

        // 4. The notes are out: update the cassettes and make the debit final.
        dispenser.remove(plan.get());
        bank.confirm(txId);
        audit.record("DISPENSED", txId + " " + plan.get());
        return new AtmResponse(AtmStatus.OK, "please take your cash", plan.get(), bank.available(card.accountId()));
    }

    private AtmResponse refusal(HoldResult hold) {
        return switch (hold) {
            case INSUFFICIENT_FUNDS -> AtmResponse.of(AtmStatus.INSUFFICIENT_FUNDS, "not enough balance");
            case DAILY_LIMIT_EXCEEDED -> AtmResponse.of(AtmStatus.DAILY_LIMIT_EXCEEDED, "daily limit reached");
            default -> AtmResponse.of(AtmStatus.INSUFFICIENT_FUNDS, "account problem");
        };
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.Map;

// Two demos in one project, because the vending machine and the ATM are the same design problem: a device that
// moves through states, where each button means something different in each state, and that must handle money exactly.
public class Main {
    private static String describe(Outcome outcome) {
        return switch (outcome.status()) {
            case DISPENSED -> "DISPENSED " + outcome.product().name() + ", change " + outcome.change();
            case NO_CHANGE -> "NO_CHANGE, refunded " + outcome.change();
            default -> outcome.status().name();
        };
    }

    public static void main(String[] args) {
        vendingDemo();
        System.out.println();
        atmDemo();
    }

    private static void vendingDemo() {
        ManualClock clock = new ManualClock(0);
        Inventory inventory = new Inventory();
        inventory.stock("A1", new Product("Cola", 150), 2);
        inventory.stock("A2", new Product("Chips", 100), 1);
        inventory.stock("B1", new Product("Gum", 50), 0);
        inventory.stock("C1", new Product("Candy", 75), 1);
        CardGateway gateway = (cardId, cents) -> !cardId.equals("stolen-card");

        VendingMachine machine = new VendingMachine(inventory, Map.of(Coin.QUARTER, 4, Coin.DIME, 4, Coin.NICKEL, 4), gateway, clock, 60_000);

        machine.insert(Coin.DOLLAR);
        machine.insert(Coin.DOLLAR);
        System.out.println("Select A1 with 200 inserted: " + describe(machine.select("A1")));

        machine.insert(Coin.QUARTER);
        System.out.println("Select A2 (25 inserted): " + describe(machine.select("A2")));
        machine.insert(Coin.DOLLAR);
        System.out.println("Select A2 (125 inserted): " + describe(machine.select("A2")));

        machine.insert(Coin.DIME);
        System.out.println("Select B1: " + describe(machine.select("B1")));
        System.out.println("Cancel refunds " + machine.cancel());
        System.out.println("Select A1 with no money: " + describe(machine.select("A1")));

        VendingMachine tight = new VendingMachine(inventory, Map.of(), gateway, clock, 60_000);
        tight.insert(Coin.DOLLAR);
        System.out.println("Select C1 on an exact-change machine: " + describe(tight.select("C1")));

        System.out.println("Card tap, stolen card: " + (machine.tapCard("stolen-card") ? describe(machine.select("A1")) : "tap refused"));
        machine.tapCard("my-card");
        System.out.println("Card tap, good card: " + describe(machine.select("A1")));
        System.out.println("Cola left in A1: " + machine.stockOf("A1"));

        machine.insert(Coin.DOLLAR);
        clock.advance(59_000);
        System.out.println("After 59 s the timeout refunds " + machine.tick());
        clock.advance(2_000);
        System.out.println("After 61 s the timeout refunds " + machine.tick() + ", state " + machine.stateName());

        machine.insert(Coin.QUARTER);
        System.out.println("Sensor fault refunds " + machine.reportFault("coin jam") + ", state " + machine.stateName());
        System.out.println("Select while broken: " + describe(machine.select("A1")));
        System.out.println("Insert while broken accepted: " + machine.insert(Coin.DIME));

        machine.startMaintenance();
        System.out.println("Staff refill A1 accepted: " + machine.refill("A1", new Product("Cola", 150), 20) + " of 20");
        System.out.println("Staff collect cash: " + machine.collectCash(2).size() + " coins, cashbox now " + machine.cashboxCents() + " cents");
        machine.finishMaintenance();
        System.out.println("State after maintenance: " + machine.stateName());
        System.out.println("Journal has " + machine.journal().size() + " entries");
    }

    private static void atmDemo() {
        ManualClock clock = new ManualClock(0);
        InMemoryBank bank = new InMemoryBank(clock);
        bank.openAccount("ACC-1", 15_000, 10_000);
        bank.openAccount("ACC-2", 500, 10_000);
        Card card = bank.issueCard("4111-1111-1111-2345", "ACC-1", "2580");
        Card poor = bank.issueCard("4111-1111-1111-9999", "ACC-2", "1357");

        FakeHardware hardware = new FakeHardware();
        CashDispenser cash = new CashDispenser(Map.of(Note.N2000, 5, Note.N500, 10, Note.N200, 10, Note.N100, 20));
        Atm atm = new Atm("ATM-7", bank, cash, hardware, clock, 12_000, 30_000);

        System.out.println("Withdraw with no card: " + atm.withdraw(500).status());
        atm.insertCard(card);
        System.out.println("Wrong PIN: " + atm.enterPin("0000").message());
        System.out.println("Right PIN: " + atm.enterPin("2580").status());
        System.out.println("Balance: " + atm.balance().balance());

        AtmResponse first = atm.withdraw(3_700);
        System.out.println("Withdraw 3700: " + first.status() + " " + first.notes() + ", balance " + first.balance());
        System.out.println("Withdraw 150: " + atm.withdraw(150).status());
        System.out.println("Withdraw 13000: " + atm.withdraw(13_000).status());

        hardware.jamNextTime();
        AtmResponse jam = atm.withdraw(1_000);
        System.out.println("Withdraw 1000 with a jam: " + jam.status() + ", balance still " + atm.balance().balance());
        System.out.println("Withdraw 7000 (daily limit 10000, 3700 used): " + atm.withdraw(7_000).status());
        System.out.println("Withdraw 6300: " + atm.withdraw(6_300).status());
        System.out.println("Cash left in the machine: " + cash.totalCash());
        System.out.println("Eject: " + atm.eject().status() + ", state " + atm.stateName());

        atm.insertCard(poor);
        atm.enterPin("1357");
        System.out.println("Withdraw 1000 from a 500 balance: " + atm.withdraw(1_000).status());
        atm.eject();

        atm.insertCard(card);
        atm.enterPin("1");
        atm.enterPin("2");
        System.out.println("Third wrong PIN: " + atm.enterPin("3").status() + ", state " + atm.stateName());
        atm.insertCard(card);
        System.out.println("Same card again: " + atm.enterPin("2580").status());

        CashDispenser small = new CashDispenser(Map.of(Note.N500, 1, Note.N200, 3));
        System.out.println("600 from one 500 and three 200s: " + small.plan(600).get());
        System.out.println("300 from the same notes: " + small.plan(300).map(Object::toString).orElse("impossible"));

        atm.insertCard(poor);
        clock.advance(31_000);
        System.out.println("Idle for 31 s: " + atm.tick().status() + ", state " + atm.stateName());

        boolean pinLeaked = atm.audit().entries().stream().anyMatch(e -> e.detail().contains("2580") || e.detail().contains("1357"));
        System.out.println("Audit entries: " + atm.audit().entries().size() + ", PIN in the log: " + pinLeaked);
    }
}
`,
      },
    ],
    tests: [
      {
        name: "Tests.java",
        code: `public class Tests {
    public static void main(String[] args) throws Exception {
        VendingTests.run();
        AtmTests.run();
        if (Check.failures() > 0) System.exit(1);
    }
}
`,
      },
      {
        name: "Check.java",
        code: `// Tiny assertion helper shared by the test classes.
final class Check {
    private static int failures = 0;

    private Check() { }

    static void that(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    static int failures() { return failures; }
}
`,
      },
      {
        name: "VendingTests.java",
        code: `import java.util.List;
import java.util.Map;
import java.util.Optional;

final class VendingTests {
    private VendingTests() { }

    private static final CardGateway ALWAYS = (id, cents) -> true;
    private static final CardGateway NEVER = (id, cents) -> false;

    private static VendingMachine machine(Map<Coin, Integer> coins, CardGateway gateway, ManualClock clock) {
        Inventory inventory = new Inventory();
        inventory.stock("A1", new Product("Cola", 150), 1);
        inventory.stock("B1", new Product("Gum", 50), 0);
        inventory.stock("C1", new Product("Candy", 75), 1);
        return new VendingMachine(inventory, coins, gateway, clock, 60_000);
    }

    private static VendingMachine machine(Map<Coin, Integer> coins) {
        return machine(coins, ALWAYS, new ManualClock(0));
    }

    static void run() {
        changeMakerBacktracksWhenGreedyFails();
        changeMakerGivesUpWhenImpossible();
        saleGivesChangeAndEmptiesTheState();
        noChangeRefundsTheCoins();
        soldOutAndUnknownCodes();
        cancelRefundsEverything();
        cardSaleNeedsNoChange();
        declinedCardEndsTheSession();
        cardSessionRefusesCoins();
        timeoutRefundsAfterTheLimit();
        timeoutDoesNotFireEarlyAndEachCoinRestartsIt();
        faultReturnsCoinsAndBlocksEverything();
        maintenanceIsTheOnlyWayToRefill();
        refillCannotOverfillASlot();
        collectKeepsAChangeFloat();
        cannotOpenMaintenanceMidSale();
        slotRefusesADifferentProduct();
    }

    private static void changeMakerBacktracksWhenGreedyFails() {
        Optional<List<Coin>> change = ChangeMaker.make(30, Map.of(Coin.QUARTER, 1, Coin.DIME, 3));
        Check.that(change.isPresent() && change.get().equals(List.of(Coin.DIME, Coin.DIME, Coin.DIME)),
                "30 cents from one quarter and three dimes is three dimes");
    }

    private static void changeMakerGivesUpWhenImpossible() {
        Check.that(ChangeMaker.make(30, Map.of(Coin.QUARTER, 1)).isEmpty(), "30 cents from one quarter is impossible");
        Check.that(ChangeMaker.make(0, Map.of()).get().isEmpty(), "zero change needs no coins");
    }

    private static void saleGivesChangeAndEmptiesTheState() {
        VendingMachine m = machine(Map.of(Coin.QUARTER, 4));
        m.insert(Coin.DOLLAR);
        m.insert(Coin.DOLLAR);
        Outcome o = m.select("A1");
        Check.that(o.status() == SaleStatus.DISPENSED && o.change().equals(List.of(Coin.QUARTER, Coin.QUARTER)), "150 cents from 200 gives two quarters");
        Check.that(m.select("A1").status() == SaleStatus.NO_MONEY, "after a sale the machine is idle again");
        Check.that(m.stockOf("A1") == 0, "the sale used up the stock");
    }

    private static void noChangeRefundsTheCoins() {
        VendingMachine m = machine(Map.of());
        m.insert(Coin.DOLLAR);
        Outcome o = m.select("C1");
        Check.that(o.status() == SaleStatus.NO_CHANGE && o.change().equals(List.of(Coin.DOLLAR)), "no way to make 25 cents: the dollar is refunded");
        Check.that(m.stockOf("C1") == 1 && m.cashboxCents() == 0, "a refused sale changes neither stock nor cashbox");
    }

    private static void soldOutAndUnknownCodes() {
        VendingMachine m = machine(Map.of(Coin.QUARTER, 4));
        m.insert(Coin.DOLLAR);
        Check.that(m.select("B1").status() == SaleStatus.SOLD_OUT, "a product with no stock is SOLD_OUT");
        Check.that(m.select("Z9").status() == SaleStatus.UNKNOWN_CODE, "an unknown code is rejected");
        Check.that(m.select("A1").status() == SaleStatus.INSUFFICIENT_FUNDS, "100 cents cannot buy a 150 cent product");
        Check.that(m.stateName().equals("HAS_MONEY"), "rejected selections keep the customer's money in place");
    }

    private static void cancelRefundsEverything() {
        VendingMachine m = machine(Map.of());
        m.insert(Coin.DIME);
        m.insert(Coin.NICKEL);
        Check.that(m.cancel().equals(List.of(Coin.DIME, Coin.NICKEL)), "cancel returns the coins in insertion order");
        Check.that(m.cancel().isEmpty(), "cancelling again returns nothing");
    }

    private static void cardSaleNeedsNoChange() {
        VendingMachine m = machine(Map.of(), ALWAYS, new ManualClock(0));
        Check.that(m.tapCard("card-1"), "a tap is accepted when idle");
        Outcome o = m.select("A1");
        Check.that(o.status() == SaleStatus.DISPENSED && o.change().isEmpty(), "a card sale dispenses with no change");
        Check.that(m.cashboxCents() == 0, "a card sale leaves the cashbox alone");
    }

    private static void declinedCardEndsTheSession() {
        VendingMachine m = machine(Map.of(), NEVER, new ManualClock(0));
        m.tapCard("card-1");
        Check.that(m.select("A1").status() == SaleStatus.CARD_DECLINED, "a declined card gives CARD_DECLINED");
        Check.that(m.stateName().equals("IDLE") && m.stockOf("A1") == 1, "after a decline the machine is idle and the stock is unchanged");
    }

    private static void cardSessionRefusesCoins() {
        VendingMachine m = machine(Map.of());
        m.tapCard("card-1");
        Check.that(!m.insert(Coin.DOLLAR), "coins are refused while a card session is open");
    }

    private static void timeoutRefundsAfterTheLimit() {
        ManualClock clock = new ManualClock(0);
        VendingMachine m = machine(Map.of(), ALWAYS, clock);
        m.insert(Coin.DOLLAR);
        clock.advance(60_000);
        Check.that(m.tick().equals(List.of(Coin.DOLLAR)), "after the timeout the dollar is refunded");
        Check.that(m.stateName().equals("IDLE"), "after a timeout the machine is idle");
    }

    private static void timeoutDoesNotFireEarlyAndEachCoinRestartsIt() {
        ManualClock clock = new ManualClock(0);
        VendingMachine m = machine(Map.of(), ALWAYS, clock);
        m.insert(Coin.DIME);
        clock.advance(50_000);
        Check.that(m.tick().isEmpty(), "no refund before the timeout");
        m.insert(Coin.DIME);
        clock.advance(50_000);
        Check.that(m.tick().isEmpty(), "inserting a coin restarts the timer");
        clock.advance(10_000);
        Check.that(m.tick().size() == 2, "both coins come back when it finally fires");
    }

    private static void faultReturnsCoinsAndBlocksEverything() {
        VendingMachine m = machine(Map.of());
        m.insert(Coin.QUARTER);
        Check.that(m.reportFault("jam").equals(List.of(Coin.QUARTER)), "a fault returns the customer's coins");
        Check.that(m.select("A1").status() == SaleStatus.OUT_OF_SERVICE, "selecting when broken is refused");
        Check.that(!m.insert(Coin.DIME) && !m.tapCard("c"), "coins and cards are refused when broken");
    }

    private static void maintenanceIsTheOnlyWayToRefill() {
        VendingMachine m = machine(Map.of());
        boolean refused = false;
        try {
            m.refill("A1", new Product("Cola", 150), 3);
        } catch (IllegalStateException e) {
            refused = true;
        }
        Check.that(refused, "refill outside maintenance throws");
        Check.that(m.startMaintenance(), "an idle machine can enter maintenance");
        Check.that(m.refill("A1", new Product("Cola", 150), 3) == 3, "refill works in maintenance");
        Check.that(m.select("A1").status() == SaleStatus.OUT_OF_SERVICE, "customers are refused during maintenance");
        m.finishMaintenance();
        Check.that(m.stateName().equals("IDLE"), "finishing maintenance returns to idle");
    }

    private static void refillCannotOverfillASlot() {
        VendingMachine m = machine(Map.of());
        m.startMaintenance();
        Check.that(m.refill("A1", new Product("Cola", 150), 50) == 9, "a slot holds at most 10, so 9 of 50 fit beside the 1 already there");
    }

    private static void collectKeepsAChangeFloat() {
        VendingMachine m = machine(Map.of(Coin.QUARTER, 5, Coin.DIME, 1));
        m.startMaintenance();
        List<Coin> taken = m.collectCash(2);
        Check.that(taken.equals(List.of(Coin.QUARTER, Coin.QUARTER, Coin.QUARTER)), "collection takes only what is above the float");
        Check.that(m.cashboxCents() == 60, "two quarters and one dime stay in the machine");
    }

    private static void cannotOpenMaintenanceMidSale() {
        VendingMachine m = machine(Map.of());
        m.insert(Coin.DIME);
        Check.that(!m.startMaintenance(), "maintenance is refused while a customer is mid-sale");
    }

    private static void slotRefusesADifferentProduct() {
        VendingMachine m = machine(Map.of());
        m.startMaintenance();
        boolean refused = false;
        try {
            m.refill("A1", new Product("Juice", 150), 1);
        } catch (IllegalArgumentException e) {
            refused = true;
        }
        Check.that(refused, "a slot cannot be refilled with a different product");
    }
}
`,
      },
      {
        name: "AtmTests.java",
        code: `import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;

final class AtmTests {
    private AtmTests() { }

    private static final class Fixture {
        final ManualClock clock = new ManualClock(0);
        final InMemoryBank bank = new InMemoryBank(clock);
        final FakeHardware hardware = new FakeHardware();
        final CashDispenser cash = new CashDispenser(Map.of(Note.N2000, 5, Note.N500, 10, Note.N200, 10, Note.N100, 20));
        final Atm atm = new Atm("T", bank, cash, hardware, clock, 12_000, 30_000);
        final Card card;

        Fixture() {
            bank.openAccount("A", 10_000, 8_000);
            card = bank.issueCard("1234-5678-0000-4242", "A", "2468");
        }

        Atm signedIn() {
            atm.insertCard(card);
            atm.enterPin("2468");
            return atm;
        }
    }

    static void run() {
        cashPlanBacktracks();
        cashPlanImpossibleAndPlanDoesNotTakeNotes();
        pinFlow();
        threeWrongPinsCapturesAndBlocks();
        stateGuards();
        withdrawalHappyPath();
        invalidAndTooLargeAmounts();
        atmThatCannotPayNeverTouchesTheBank();
        jamReversesTheHold();
        insufficientFundsAndDailyLimit();
        bankHoldIsIdempotent();
        reverseAfterConfirmIsRefused();
        sessionTimeoutReturnsTheCard();
        auditTrailHasNoPinAndMasksTheCard();
        concurrentWithdrawalsNeverOverdraw();
    }

    private static void cashPlanBacktracks() {
        CashDispenser d = new CashDispenser(Map.of(Note.N500, 1, Note.N200, 3));
        Optional<Map<Note, Integer>> plan = d.plan(600);
        Check.that(plan.isPresent() && plan.get().equals(Map.of(Note.N200, 3)), "600 from one 500 and three 200s uses the 200s");
    }

    private static void cashPlanImpossibleAndPlanDoesNotTakeNotes() {
        CashDispenser d = new CashDispenser(Map.of(Note.N500, 1, Note.N200, 3));
        Check.that(d.plan(300).isEmpty(), "300 cannot be paid from 500 and 200 notes");
        d.plan(600);
        Check.that(d.totalCash() == 1100, "planning does not remove any note");
    }

    private static void pinFlow() {
        Fixture f = new Fixture();
        f.atm.insertCard(f.card);
        AtmResponse wrong = f.atm.enterPin("0000");
        Check.that(wrong.status() == AtmStatus.WRONG_PIN && wrong.message().contains("2 tries"), "a wrong PIN leaves two tries");
        Check.that(f.atm.enterPin("2468").status() == AtmStatus.OK && f.atm.stateName().equals("AUTHENTICATED"), "the right PIN authenticates");
    }

    private static void threeWrongPinsCapturesAndBlocks() {
        Fixture f = new Fixture();
        f.atm.insertCard(f.card);
        f.atm.enterPin("1");
        f.atm.enterPin("2");
        Check.that(f.atm.enterPin("3").status() == AtmStatus.CARD_CAPTURED, "the third wrong PIN captures the card");
        Check.that(f.atm.stateName().equals("IDLE"), "the machine is idle after a capture");
        f.atm.insertCard(f.card);
        Check.that(f.atm.enterPin("2468").status() == AtmStatus.CARD_CAPTURED, "a captured card stays blocked even with the right PIN");
    }

    private static void stateGuards() {
        Fixture f = new Fixture();
        Check.that(f.atm.withdraw(100).status() == AtmStatus.NOT_AUTHENTICATED, "withdraw without a card is refused");
        f.atm.insertCard(f.card);
        Check.that(f.atm.withdraw(100).status() == AtmStatus.NOT_AUTHENTICATED, "withdraw before the PIN is refused");
        Check.that(f.atm.insertCard(f.card).status() == AtmStatus.CARD_IN_USE, "a second card is refused");
        Check.that(f.atm.eject().status() == AtmStatus.OK, "eject returns the card");
        Check.that(f.atm.eject().status() == AtmStatus.NO_CARD, "eject with no card says so");
    }

    private static void withdrawalHappyPath() {
        Fixture f = new Fixture();
        Atm atm = f.signedIn();
        AtmResponse r = atm.withdraw(2_700);
        Check.that(r.status() == AtmStatus.OK && r.notes().equals(Map.of(Note.N2000, 1, Note.N500, 1, Note.N200, 1)), "2700 is one 2000, one 500 and one 200");
        Check.that(r.balance() == 7_300 && atm.balance().balance() == 7_300, "the balance dropped by the amount");
        Check.that(f.cash.count(Note.N2000) == 4, "the cassette lost the dispensed notes");
        Check.that(f.hardware.given().size() == 1, "the hardware was asked once");
    }

    private static void invalidAndTooLargeAmounts() {
        Fixture f = new Fixture();
        Atm atm = f.signedIn();
        Check.that(atm.withdraw(150).status() == AtmStatus.INVALID_AMOUNT, "150 is not a multiple of 100");
        Check.that(atm.withdraw(0).status() == AtmStatus.INVALID_AMOUNT && atm.withdraw(-100).status() == AtmStatus.INVALID_AMOUNT, "zero and negative amounts are refused");
        Check.that(atm.withdraw(13_000).status() == AtmStatus.EXCEEDS_TRANSACTION_LIMIT, "over the per-transaction limit is refused");
    }

    private static void atmThatCannotPayNeverTouchesTheBank() {
        Fixture f = new Fixture();
        Atm atm = f.signedIn();
        AtomicInteger bankCalls = new AtomicInteger();
        // A bank wrapper that counts hold calls, to show the ATM decided before asking.
        BankService counting = new BankService() {
            public PinResult verifyPin(Card c, String p) { return f.bank.verifyPin(c, p); }
            public void blockCard(String n) { f.bank.blockCard(n); }
            public int available(String a) { return f.bank.available(a); }
            public HoldResult hold(String a, int amount, String tx) { bankCalls.incrementAndGet(); return f.bank.hold(a, amount, tx); }
            public void confirm(String tx) { f.bank.confirm(tx); }
            public void reverse(String tx) { f.bank.reverse(tx); }
        };
        CashDispenser few = new CashDispenser(Map.of(Note.N500, 1));
        Atm tiny = new Atm("X", counting, few, f.hardware, f.clock, 12_000, 30_000);
        tiny.insertCard(f.card);
        tiny.enterPin("2468");
        Check.that(tiny.withdraw(700).status() == AtmStatus.ATM_CANNOT_PAY, "an ATM without suitable notes cannot pay");
        Check.that(bankCalls.get() == 0, "and it never asked the bank for a hold");
        Check.that(atm.balance().balance() == 10_000, "so the account is untouched");
    }

    private static void jamReversesTheHold() {
        Fixture f = new Fixture();
        Atm atm = f.signedIn();
        f.hardware.jamNextTime();
        Check.that(atm.withdraw(1_000).status() == AtmStatus.DISPENSE_FAILED, "a jam gives DISPENSE_FAILED");
        Check.that(atm.balance().balance() == 10_000, "the customer was not charged");
        Check.that(f.cash.count(Note.N100) == 20 && f.cash.count(Note.N500) == 10, "no note left the cassettes");
        Check.that(atm.withdraw(1_000).status() == AtmStatus.OK, "the held amount was released, so a retry works");
        Check.that(f.atm.audit().contains("REVERSED"), "the reversal is in the audit log");
    }

    private static void insufficientFundsAndDailyLimit() {
        Fixture f = new Fixture();
        f.bank.openAccount("B", 300, 8_000);
        Card small = f.bank.issueCard("9999-0000-1111-2222", "B", "1111");
        f.atm.insertCard(small);
        f.atm.enterPin("1111");
        Check.that(f.atm.withdraw(500).status() == AtmStatus.INSUFFICIENT_FUNDS, "more than the balance is refused");
        f.atm.eject();

        Atm atm = f.signedIn();
        Check.that(atm.withdraw(6_000).status() == AtmStatus.OK, "6000 is within the daily limit of 8000");
        Check.that(atm.withdraw(3_000).status() == AtmStatus.DAILY_LIMIT_EXCEEDED, "another 3000 would pass the daily limit");
        f.clock.advance(86_400_000L);
        Check.that(atm.withdraw(3_000).status() == AtmStatus.OK, "the next day the limit starts again");
    }

    private static void bankHoldIsIdempotent() {
        Fixture f = new Fixture();
        Check.that(f.bank.hold("A", 4_000, "tx-1") == HoldResult.APPROVED, "first hold approved");
        Check.that(f.bank.hold("A", 4_000, "tx-1") == HoldResult.APPROVED, "a retry of the same transaction is approved again");
        Check.that(f.bank.available("A") == 6_000, "but only one hold was placed");
        f.bank.confirm("tx-1");
        f.bank.confirm("tx-1");
        Check.that(f.bank.available("A") == 6_000, "confirming twice debits once");
    }

    private static void reverseAfterConfirmIsRefused() {
        Fixture f = new Fixture();
        f.bank.hold("A", 1_000, "tx-9");
        f.bank.confirm("tx-9");
        boolean refused = false;
        try {
            f.bank.reverse("tx-9");
        } catch (IllegalStateException e) {
            refused = true;
        }
        Check.that(refused, "a confirmed transaction cannot be reversed");
        refused = false;
        try {
            f.bank.confirm("nope");
        } catch (IllegalArgumentException e) {
            refused = true;
        }
        Check.that(refused, "confirming an unknown transaction is an error");
    }

    private static void sessionTimeoutReturnsTheCard() {
        Fixture f = new Fixture();
        Atm atm = f.signedIn();
        f.clock.advance(29_000);
        Check.that(atm.tick().status() == AtmStatus.OK && atm.stateName().equals("AUTHENTICATED"), "the session survives 29 seconds");
        f.clock.advance(2_000);
        Check.that(atm.tick().status() == AtmStatus.SESSION_EXPIRED && atm.stateName().equals("IDLE"), "after 31 idle seconds the session ends");
    }

    private static void auditTrailHasNoPinAndMasksTheCard() {
        Fixture f = new Fixture();
        Atm atm = f.signedIn();
        atm.withdraw(500);
        List<AuditEntry> entries = f.atm.audit().entries();
        boolean leaked = entries.stream().anyMatch(e -> e.detail().contains("2468") || e.detail().contains("1234-5678"));
        Check.that(!leaked, "no PIN and no full card number in the audit log");
        Check.that(entries.stream().anyMatch(e -> e.detail().contains("****4242")), "the masked card number is there");
    }

    private static void concurrentWithdrawalsNeverOverdraw() {
        Fixture f = new Fixture();
        f.bank.openAccount("C", 1_000, 100_000);
        AtomicInteger approved = new AtomicInteger();
        Thread[] threads = new Thread[8];
        for (int t = 0; t < threads.length; t++) {
            final int n = t;
            threads[t] = new Thread(() -> {
                if (f.bank.hold("C", 300, "race-" + n) == HoldResult.APPROVED) approved.incrementAndGet();
            });
            threads[t].start();
        }
        for (Thread thread : threads) {
            try {
                thread.join();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        }
        Check.that(approved.get() == 3, "eight racing holds of 300 on a balance of 1000: exactly three succeed");
        Check.that(f.bank.available("C") == 100, "and 100 is left");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Select A1 with 200 inserted: DISPENSED Cola, change [QUARTER, QUARTER]",
      "Select A2 (25 inserted): INSUFFICIENT_FUNDS",
      "Select B1: SOLD_OUT",
      "Select A1 with no money: NO_MONEY",
      "Select C1 on an exact-change machine: NO_CHANGE, refunded [DOLLAR]",
      "Card tap, good card: DISPENSED Cola, change []",
      "After 59 s the timeout refunds []",
      "Sensor fault refunds [QUARTER], state OUT_OF_SERVICE",
      "Select while broken: OUT_OF_SERVICE",
      "Staff refill A1 accepted: 10 of 20",
      "State after maintenance: IDLE",
      "Withdraw with no card: NOT_AUTHENTICATED",
      "Wrong PIN: wrong PIN, 2 tries left",
      "Balance: 15000",
      "Withdraw 150: INVALID_AMOUNT",
      "Withdraw 13000: EXCEEDS_TRANSACTION_LIMIT",
      "Withdraw 7000 (daily limit 10000, 3700 used): DAILY_LIMIT_EXCEEDED",
      "Cash left in the machine: 9000",
      "Withdraw 1000 from a 500 balance: INSUFFICIENT_FUNDS",
      "Third wrong PIN: CARD_CAPTURED, state IDLE",
      "600 from one 500 and three 200s: {N200=3}",
      "Idle for 31 s: SESSION_EXPIRED, state IDLE",
    ],
  },
};
