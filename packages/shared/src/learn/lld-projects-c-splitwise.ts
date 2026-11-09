import type { LldProject } from "./types";

// Splitwise, expense sharing (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when it was written.

export const LLD_PROJECTS_C_SPLITWISE: Record<string, LldProject> = {
  "lldp-splitwise": {
    files: [
      {
        name: "Money.java",
        code: `// All amounts are whole cents in a long. Floating point cannot hold 0.1 exactly, and an expense app that loses a
// cent in every split ends up with balances that never reach zero.
final class Money {
    private Money() { }

    static String format(long cents) {
        String sign = cents < 0 ? "-" : "";
        long abs = Math.abs(cents);
        return sign + abs / 100 + "." + (abs % 100 < 10 ? "0" : "") + abs % 100;
    }
}
`,
      },
      {
        name: "InvalidSplitException.java",
        code: `// Thrown by a split strategy when the numbers it was given cannot form a split. ExpenseService turns it into a result.
class InvalidSplitException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    InvalidSplitException(String message) { super(message); }
}
`,
      },
      {
        name: "Allocator.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

// Shares a total of cents among people in proportion to weights, so that the shares add up to the total EXACTLY.
// This is the largest remainder method: everybody gets the rounded-down share, and the cents that are left over go to
// the people with the biggest fractional parts (ties by id, so the result is always the same).
final class Allocator {
    private Allocator() { }

    static Map<String, Long> allocate(long total, Map<String, Long> weights) {
        if (total < 0) throw new InvalidSplitException("total must not be negative");
        if (weights.isEmpty()) throw new InvalidSplitException("nobody to split between");
        long sumWeights = 0;
        for (long w : weights.values()) {
            if (w < 0) throw new InvalidSplitException("a weight is negative");
            sumWeights += w;
        }
        if (sumWeights == 0) throw new InvalidSplitException("all weights are zero");

        Map<String, Long> result = new TreeMap<>();
        List<String> byRemainder = new ArrayList<>();
        Map<String, Long> remainder = new TreeMap<>();
        long assigned = 0;
        for (Map.Entry<String, Long> e : new TreeMap<>(weights).entrySet()) {
            long product = Math.multiplyExact(total, e.getValue());
            long floor = product / sumWeights;
            result.put(e.getKey(), floor);
            remainder.put(e.getKey(), product % sumWeights);
            assigned += floor;
            byRemainder.add(e.getKey());
        }
        byRemainder.sort((a, b) -> {
            int byFraction = Long.compare(remainder.get(b), remainder.get(a));
            return byFraction != 0 ? byFraction : a.compareTo(b);
        });
        long left = total - assigned;
        for (int i = 0; i < left; i++) result.merge(byRemainder.get(i), 1L, Long::sum);
        return result;
    }
}
`,
      },
      {
        name: "SplitStrategy.java",
        code: `import java.util.List;
import java.util.Map;

// How one expense is divided among the people who share it. The result maps each participant to what they owe, and
// always adds up to the total. A new way to split (by item, by income) is a new class.
interface SplitStrategy {
    Map<String, Long> split(long totalCents, List<String> participants);
}
`,
      },
      {
        name: "EqualSplit.java",
        code: `import java.util.List;
import java.util.Map;
import java.util.TreeMap;

final class EqualSplit implements SplitStrategy {
    @Override
    public Map<String, Long> split(long totalCents, List<String> participants) {
        Map<String, Long> weights = new TreeMap<>();
        for (String p : participants) weights.put(p, 1L);
        return Allocator.allocate(totalCents, weights);
    }
}
`,
      },
      {
        name: "ExactSplit.java",
        code: `import java.util.List;
import java.util.Map;
import java.util.TreeMap;

// Everyone's amount is given. The amounts must add up to the total, and only participants may appear.
final class ExactSplit implements SplitStrategy {
    private final Map<String, Long> amounts;

    ExactSplit(Map<String, Long> amounts) { this.amounts = new TreeMap<>(amounts); }

    @Override
    public Map<String, Long> split(long totalCents, List<String> participants) {
        long sum = 0;
        for (Map.Entry<String, Long> e : amounts.entrySet()) {
            if (!participants.contains(e.getKey())) throw new InvalidSplitException(e.getKey() + " is not a participant");
            if (e.getValue() < 0) throw new InvalidSplitException("negative amount for " + e.getKey());
            sum += e.getValue();
        }
        if (sum != totalCents) throw new InvalidSplitException("amounts add up to " + Money.format(sum) + " but the expense is " + Money.format(totalCents));
        Map<String, Long> out = new TreeMap<>();
        for (String p : participants) out.put(p, amounts.getOrDefault(p, 0L));
        return out;
    }
}
`,
      },
      {
        name: "PercentSplit.java",
        code: `import java.util.List;
import java.util.Map;
import java.util.TreeMap;

// Percentages in basis points (hundredths of a percent): 3333 is 33.33 percent. Basis points are integers, so three
// shares of 33.33, 33.33 and 33.34 percent can be written exactly, and they must add up to 10000.
final class PercentSplit implements SplitStrategy {
    private final Map<String, Long> basisPoints;

    PercentSplit(Map<String, Long> basisPoints) { this.basisPoints = new TreeMap<>(basisPoints); }

    @Override
    public Map<String, Long> split(long totalCents, List<String> participants) {
        long sum = 0;
        for (Map.Entry<String, Long> e : basisPoints.entrySet()) {
            if (!participants.contains(e.getKey())) throw new InvalidSplitException(e.getKey() + " is not a participant");
            sum += e.getValue();
        }
        if (sum != 10_000) throw new InvalidSplitException("percentages add up to " + sum / 100.0 + ", not 100");
        return Allocator.allocate(totalCents, basisPoints);
    }
}
`,
      },
      {
        name: "SharesSplit.java",
        code: `import java.util.List;
import java.util.Map;
import java.util.TreeMap;

// "Two shares for me, one for you": proportional to weights. Useful for rooms of different sizes or kids at dinner.
final class SharesSplit implements SplitStrategy {
    private final Map<String, Long> shares;

    SharesSplit(Map<String, Long> shares) { this.shares = new TreeMap<>(shares); }

    @Override
    public Map<String, Long> split(long totalCents, List<String> participants) {
        for (String id : shares.keySet()) {
            if (!participants.contains(id)) throw new InvalidSplitException(id + " is not a participant");
        }
        return Allocator.allocate(totalCents, shares);
    }
}
`,
      },
      {
        name: "Debt.java",
        code: `// "from owes to cents". Always positive; the direction carries the sign.
record Debt(String from, String to, long cents) {
    @Override
    public String toString() { return from + " owes " + to + " " + Money.format(cents); }
}
`,
      },
      {
        name: "DebtSimplifier.java",
        code: `import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

// Turns net balances (positive: is owed money, negative: owes money, all adding up to zero) into a short list of
// payments. Two algorithms:
//   greedy:  repeatedly let the biggest debtor pay the biggest creditor. Fast, at most n - 1 payments.
//   optimal: finds the largest number of independent groups that each balance to zero. A group of k people needs
//            k - 1 payments, so the fewest payments overall is n minus the number of groups. Finding the best split into
//            groups is a subset problem (NP-hard in general), so it is done with a table over subsets and only for up
//            to 15 people with a non-zero balance. Bigger groups fall back to greedy.
final class DebtSimplifier {
    static final int MAX_EXACT = 15;

    private DebtSimplifier() { }

    static List<Debt> greedy(Map<String, Long> net) {
        TreeMap<String, Long> work = new TreeMap<>(net);
        List<Debt> out = new ArrayList<>();
        while (true) {
            String creditor = extreme(work, true);
            String debtor = extreme(work, false);
            if (creditor == null || debtor == null) return out;
            long pay = Math.min(work.get(creditor), -work.get(debtor));
            out.add(new Debt(debtor, creditor, pay));
            work.merge(creditor, -pay, Long::sum);
            work.merge(debtor, pay, Long::sum);
        }
    }

    // The person with the biggest positive (or most negative) balance, ties by id. Null when none is left.
    private static String extreme(Map<String, Long> net, boolean positive) {
        Comparator<Map.Entry<String, Long>> order = positive
                ? Comparator.comparingLong((Map.Entry<String, Long> e) -> e.getValue())
                : Comparator.comparingLong((Map.Entry<String, Long> e) -> -e.getValue());
        return net.entrySet().stream()
                .filter(e -> positive ? e.getValue() > 0 : e.getValue() < 0)
                .max(order.thenComparing(Map.Entry::getKey, Comparator.reverseOrder()))
                .map(Map.Entry::getKey)
                .orElse(null);
    }

    static List<Debt> optimal(Map<String, Long> net) {
        List<String> ids = new ArrayList<>();
        for (Map.Entry<String, Long> e : new TreeMap<>(net).entrySet()) if (e.getValue() != 0) ids.add(e.getKey());
        int n = ids.size();
        if (n > MAX_EXACT) return greedy(net);
        long[] value = new long[n];
        for (int i = 0; i < n; i++) value[i] = net.get(ids.get(i));

        int full = (1 << n) - 1;
        long[] sum = new long[full + 1];
        int[] best = new int[full + 1];   // most groups that can be closed while adding the people of this set one by one
        int[] last = new int[full + 1];   // which person was added last in that best order
        for (int mask = 1; mask <= full; mask++) {
            int low = Integer.numberOfTrailingZeros(mask);
            sum[mask] = sum[mask & (mask - 1)] + value[low];
            best[mask] = -1;
            for (int i = 0; i < n; i++) {
                if ((mask & (1 << i)) == 0) continue;
                if (best[mask ^ (1 << i)] > best[mask]) {
                    best[mask] = best[mask ^ (1 << i)];
                    last[mask] = i;
                }
            }
            if (sum[mask] == 0) best[mask]++;
        }

        // Rebuild the order in which people were added, then cut it into groups wherever the running sum is zero.
        int[] order = new int[n];
        int mask = full;
        for (int k = n - 1; k >= 0; k--) {
            order[k] = last[mask];
            mask ^= 1 << last[mask];
        }
        List<Debt> out = new ArrayList<>();
        Map<String, Long> group = new TreeMap<>();
        int running = 0;
        for (int k = 0; k < n; k++) {
            running |= 1 << order[k];
            group.put(ids.get(order[k]), value[order[k]]);
            if (sum[running] == 0) {
                out.addAll(greedy(group));
                group.clear();
            }
        }
        return out;
    }
}
`,
      },
      {
        name: "Group.java",
        code: `import java.util.Collections;
import java.util.Map;
import java.util.TreeMap;

// A set of people who share expenses. Membership is fixed after construction in this design.
record Group(String id, String name, Map<String, String> members) {
    Group {
        members = Collections.unmodifiableMap(new TreeMap<>(members));
    }

    boolean has(String userId) { return members.containsKey(userId); }
}
`,
      },
      {
        name: "Expense.java",
        code: `import java.util.Map;
import java.util.TreeMap;

// What happened, as the user entered it. paid and owed each add up to totalCents.
record Expense(String id, String groupId, String description, long totalCents, Map<String, Long> paid, Map<String, Long> owed, long createdAt) {
    // Positive: put in more than they used. Negative: used more than they put in.
    Map<String, Long> net() {
        Map<String, Long> net = new TreeMap<>();
        paid.forEach((u, v) -> net.merge(u, v, Long::sum));
        owed.forEach((u, v) -> net.merge(u, -v, Long::sum));
        net.values().removeIf(v -> v == 0);
        return net;
    }
}
`,
      },
      {
        name: "Entry.java",
        code: `import java.util.List;

// One line of a group's history: an expense and the debts it created, or a settlement. Deleted entries stay in the
// history (it is an audit trail) but no longer count.
final class Entry {
    final String id;
    final Expense expense;       // null for a settlement
    final List<Debt> debts;      // what this entry did to the ledger, kept so it can be undone
    boolean deleted;

    Entry(String id, Expense expense, List<Debt> debts) {
        this.id = id;
        this.expense = expense;
        this.debts = debts;
    }
}
`,
      },
      {
        name: "GroupLedger.java",
        code: `import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

// Who owes whom inside one group. owed[a][b] is what a owes b; at most one direction is ever positive for a pair,
// because opposite debts are netted as they arrive. Every method is synchronized: a group is the unit of locking.
final class GroupLedger {
    private final Group group;
    private final Map<String, Map<String, Long>> owed = new TreeMap<>();
    private final Map<String, Entry> entries = new LinkedHashMap<>();

    GroupLedger(Group group) { this.group = group; }

    Group group() { return group; }

    synchronized void record(Entry entry) {
        entries.put(entry.id, entry);
        for (Debt d : entry.debts) addDebt(d.from(), d.to(), d.cents());
    }

    // Undoing an entry applies its debts the other way round, which is exact because debts are only sums.
    synchronized boolean undo(String entryId) {
        Entry entry = entries.get(entryId);
        if (entry == null || entry.deleted) return false;
        for (Debt d : entry.debts) addDebt(d.to(), d.from(), d.cents());
        entry.deleted = true;
        return true;
    }

    private void addDebt(String from, String to, long cents) {
        long opposite = owed.getOrDefault(to, Map.of()).getOrDefault(from, 0L);
        if (opposite > 0) {
            long cancelled = Math.min(opposite, cents);
            setOwed(to, from, opposite - cancelled);
            cents -= cancelled;
        }
        if (cents > 0) setOwed(from, to, owed.getOrDefault(from, Map.of()).getOrDefault(to, 0L) + cents);
    }

    private void setOwed(String from, String to, long cents) {
        if (cents == 0) {
            Map<String, Long> row = owed.get(from);
            if (row != null) row.remove(to);
        } else {
            owed.computeIfAbsent(from, k -> new TreeMap<>()).put(to, cents);
        }
    }

    // The raw "a owes b" lines, sorted.
    synchronized List<Debt> pairwise() {
        List<Debt> out = new ArrayList<>();
        for (Map.Entry<String, Map<String, Long>> row : owed.entrySet()) {
            for (Map.Entry<String, Long> cell : row.getValue().entrySet()) out.add(new Debt(row.getKey(), cell.getKey(), cell.getValue()));
        }
        return out;
    }

    // Net balance of everyone: positive is owed money. Always adds up to zero.
    synchronized Map<String, Long> netBalances() {
        Map<String, Long> net = new TreeMap<>();
        for (String id : group.members().keySet()) net.put(id, 0L);
        for (Debt d : pairwise()) {
            net.merge(d.from(), -d.cents(), Long::sum);
            net.merge(d.to(), d.cents(), Long::sum);
        }
        return net;
    }

    synchronized List<Entry> history() { return new ArrayList<>(entries.values()); }

    synchronized Entry entry(String id) { return entries.get(id); }
}
`,
      },
      {
        name: "ExpenseStatus.java",
        code: `enum ExpenseStatus {
    OK, UNKNOWN_GROUP, NOT_A_MEMBER, NO_PAYER, BAD_AMOUNT, INVALID_SPLIT, NOT_FOUND, ALREADY_DELETED, SAME_PERSON
}
`,
      },
      {
        name: "ExpenseResult.java",
        code: `record ExpenseResult(ExpenseStatus status, String entryId, String message) {
    static ExpenseResult ok(String entryId) { return new ExpenseResult(ExpenseStatus.OK, entryId, ""); }

    static ExpenseResult of(ExpenseStatus status, String message) { return new ExpenseResult(status, null, message); }

    boolean ok() { return status == ExpenseStatus.OK; }
}
`,
      },
      {
        name: "ExpenseListener.java",
        code: `// Observer: push notifications and activity feeds subscribe here.
interface ExpenseListener {
    void onEvent(String type, String groupId, String entryId);
}
`,
      },
      {
        name: "ExpenseService.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

// The facade. All validation happens here, before the ledger is touched, so the ledger only ever receives numbers
// that are consistent: paid adds up to the total, owed adds up to the total.
final class ExpenseService {
    private final Map<String, GroupLedger> ledgers = new ConcurrentHashMap<>();
    private final List<ExpenseListener> listeners = new CopyOnWriteArrayList<>();
    private final AtomicLong nextId = new AtomicLong(1);
    private final TimeSource clock;

    ExpenseService(TimeSource clock) { this.clock = clock; }

    void createGroup(Group group) { ledgers.put(group.id(), new GroupLedger(group)); }

    void subscribe(ExpenseListener listener) { listeners.add(listener); }

    private void publish(String type, String groupId, String entryId) {
        for (ExpenseListener l : listeners) l.onEvent(type, groupId, entryId);
    }

    // paid: who put in how much. participants: who shares it. The split strategy divides the total among them.
    ExpenseResult addExpense(String groupId, String description, Map<String, Long> paid, List<String> participants, SplitStrategy split) {
        GroupLedger ledger = ledgers.get(groupId);
        if (ledger == null) return ExpenseResult.of(ExpenseStatus.UNKNOWN_GROUP, groupId);
        if (paid.isEmpty()) return ExpenseResult.of(ExpenseStatus.NO_PAYER, "somebody must have paid");
        long total = 0;
        for (Map.Entry<String, Long> e : paid.entrySet()) {
            if (!ledger.group().has(e.getKey())) return ExpenseResult.of(ExpenseStatus.NOT_A_MEMBER, e.getKey());
            if (e.getValue() <= 0) return ExpenseResult.of(ExpenseStatus.BAD_AMOUNT, "a payer paid " + Money.format(e.getValue()));
            total += e.getValue();
        }
        for (String p : participants) {
            if (!ledger.group().has(p)) return ExpenseResult.of(ExpenseStatus.NOT_A_MEMBER, p);
        }
        Map<String, Long> owed;
        try {
            owed = split.split(total, new ArrayList<>(participants));
        } catch (InvalidSplitException e) {
            return ExpenseResult.of(ExpenseStatus.INVALID_SPLIT, e.getMessage());
        }

        String id = "E" + nextId.getAndIncrement();
        Expense expense = new Expense(id, groupId, description, total, new TreeMap<>(paid), owed, clock.nowMillis());
        // The pairwise debts of this expense: let the people who put in too little pay the people who put in too much.
        ledger.record(new Entry(id, expense, DebtSimplifier.greedy(expense.net())));
        publish("EXPENSE_ADDED", groupId, id);
        return ExpenseResult.ok(id);
    }

    ExpenseResult deleteExpense(String groupId, String entryId) {
        GroupLedger ledger = ledgers.get(groupId);
        if (ledger == null) return ExpenseResult.of(ExpenseStatus.UNKNOWN_GROUP, groupId);
        Entry entry = ledger.entry(entryId);
        if (entry == null) return ExpenseResult.of(ExpenseStatus.NOT_FOUND, entryId);
        if (!ledger.undo(entryId)) return ExpenseResult.of(ExpenseStatus.ALREADY_DELETED, entryId);
        publish("EXPENSE_DELETED", groupId, entryId);
        return ExpenseResult.ok(entryId);
    }

    // "from paid to this much in cash": reduces what from owes to (or, if it was more, makes to owe from).
    ExpenseResult settleUp(String groupId, String from, String to, long cents) {
        GroupLedger ledger = ledgers.get(groupId);
        if (ledger == null) return ExpenseResult.of(ExpenseStatus.UNKNOWN_GROUP, groupId);
        if (!ledger.group().has(from)) return ExpenseResult.of(ExpenseStatus.NOT_A_MEMBER, from);
        if (!ledger.group().has(to)) return ExpenseResult.of(ExpenseStatus.NOT_A_MEMBER, to);
        if (from.equals(to)) return ExpenseResult.of(ExpenseStatus.SAME_PERSON, from);
        if (cents <= 0) return ExpenseResult.of(ExpenseStatus.BAD_AMOUNT, Money.format(cents));
        String id = "S" + nextId.getAndIncrement();
        // Paying someone is the reverse of owing them, so the debt recorded is "to owes from".
        ledger.record(new Entry(id, null, List.of(new Debt(to, from, cents))));
        publish("SETTLED", groupId, id);
        return ExpenseResult.ok(id);
    }

    Map<String, Long> balances(String groupId) { return ledgers.get(groupId).netBalances(); }

    List<Debt> whoOwesWhom(String groupId) { return ledgers.get(groupId).pairwise(); }

    List<Debt> simplified(String groupId) { return DebtSimplifier.optimal(ledgers.get(groupId).netBalances()); }

    List<Entry> history(String groupId) { return ledgers.get(groupId).history(); }

    // What one person is owed (positive) or owes (negative) over all groups.
    long balanceAcrossGroups(String userId) {
        long sum = 0;
        for (GroupLedger l : ledgers.values()) sum += l.netBalances().getOrDefault(userId, 0L);
        return sum;
    }
}
`,
      },
      {
        name: "TimeSource.java",
        code: `interface TimeSource {
    long nowMillis();
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.List;
import java.util.Map;

public class Main {
    private static String names(Map<String, Long> m) {
        StringBuilder sb = new StringBuilder();
        m.forEach((k, v) -> sb.append(sb.length() == 0 ? "" : ", ").append(k).append(' ').append(Money.format(v)));
        return sb.toString();
    }

    public static void main(String[] args) {
        ExpenseService service = new ExpenseService(() -> 0L);
        List<String> events = new java.util.ArrayList<>();
        service.subscribe((type, group, entry) -> events.add(type + " " + entry));
        service.createGroup(new Group("trip", "Goa trip", Map.of("asha", "Asha", "ben", "Ben", "chen", "Chen", "dev", "Dev")));
        List<String> all = List.of("asha", "ben", "chen", "dev");

        System.out.println("Split 100.00 three ways: " + names(new EqualSplit().split(10_000, List.of("asha", "ben", "chen"))));
        System.out.println("Shares 1:2:3 of 10.00: " + names(new SharesSplit(Map.of("asha", 1L, "ben", 2L, "chen", 3L)).split(1_000, List.of("asha", "ben", "chen"))));

        service.addExpense("trip", "Hotel", Map.of("asha", 40_000L), all, new EqualSplit());
        System.out.println("After the hotel: " + names(service.balances("trip")));

        service.addExpense("trip", "Dinner", Map.of("ben", 9_050L), List.of("asha", "ben", "chen"),
                new ExactSplit(Map.of("asha", 3_000L, "ben", 2_050L, "chen", 4_000L)));
        service.addExpense("trip", "Taxi", Map.of("chen", 10_000L), List.of("asha", "ben", "chen"),
                new PercentSplit(Map.of("asha", 5_000L, "ben", 3_000L, "chen", 2_000L)));
        ExpenseResult tickets = service.addExpense("trip", "Tickets", Map.of("dev", 20_000L, "asha", 10_000L), all, new EqualSplit());
        System.out.println("Tickets paid by two people: " + tickets.status());

        System.out.println("Net balances: " + names(service.balances("trip")));
        System.out.println("Who owes whom:");
        for (Debt d : service.whoOwesWhom("trip")) System.out.println("  " + d);
        System.out.println("Simplified:");
        for (Debt d : service.simplified("trip")) System.out.println("  " + d);

        System.out.println("Bad split: " + service.addExpense("trip", "Snacks", Map.of("ben", 1_000L), all,
                new ExactSplit(Map.of("asha", 300L, "ben", 300L))).message());
        System.out.println("Not a member: " + service.addExpense("trip", "Gift", Map.of("zed", 500L), all, new EqualSplit()).status());

        service.settleUp("trip", "ben", "dev", 5_000);
        System.out.println("After Ben pays Dev 50.00: " + names(service.balances("trip")));

        ExpenseResult hotel = service.deleteExpense("trip", "E1");
        System.out.println("Delete the hotel: " + hotel.status() + ", again: " + service.deleteExpense("trip", "E1").status());
        System.out.println("Net balances: " + names(service.balances("trip")));
        System.out.println("Sum of balances: " + service.balances("trip").values().stream().mapToLong(Long::longValue).sum());
        System.out.println("Events: " + events);
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
import java.util.Random;
import java.util.TreeMap;

public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static final List<String> FOUR = List.of("a", "b", "c", "d");

    private static ExpenseService service() {
        ExpenseService s = new ExpenseService(() -> 0L);
        s.createGroup(new Group("g", "Group", Map.of("a", "Asha", "b", "Ben", "c", "Chen", "d", "Dev")));
        s.createGroup(new Group("h", "Other", Map.of("a", "Asha", "b", "Ben")));
        return s;
    }

    private static long sum(Map<String, Long> m) {
        long s = 0;
        for (long v : m.values()) s += v;
        return s;
    }

    public static void main(String[] args) throws Exception {
        moneyFormat();
        allocatorIsExact();
        allocatorProperty();
        splitStrategies();
        singlePayer();
        severalPayers();
        oppositeDebtsNet();
        settleUp();
        deleteUndoesExactly();
        validation();
        balancesAlwaysSumToZero();
        simplifierGreedy();
        simplifierOptimalBeatsGreedy();
        simplifiedPaymentsClearEveryone();
        acrossGroups();
        listeners();
        manyThreads();
        if (failures > 0) System.exit(1);
    }

    private static void moneyFormat() {
        check(Money.format(0).equals("0.00") && Money.format(5).equals("0.05") && Money.format(1234).equals("12.34"), "cents print as money");
        check(Money.format(-250).equals("-2.50"), "negative amounts keep the sign");
    }

    private static void allocatorIsExact() {
        Map<String, Long> third = new EqualSplit().split(10_000, List.of("a", "b", "c"));
        check(third.equals(Map.of("a", 3334L, "b", 3333L, "c", 3333L)), "100.00 in three: the odd cent goes to the first by id");
        Map<String, Long> shares = new SharesSplit(Map.of("a", 1L, "b", 2L, "c", 3L)).split(1_000, List.of("a", "b", "c"));
        check(shares.equals(Map.of("a", 167L, "b", 333L, "c", 500L)), "shares 1:2:3 of 10.00 give 1.67, 3.33, 5.00");
        check(new EqualSplit().split(1, List.of("a", "b", "c")).equals(Map.of("a", 1L, "b", 0L, "c", 0L)), "one cent among three: one person gets it");
        check(sum(new EqualSplit().split(0, FOUR)) == 0, "zero splits into zeros");
    }

    private static void allocatorProperty() {
        Random random = new Random(42);
        boolean exact = true;
        boolean fair = true;
        for (int round = 0; round < 2000; round++) {
            int n = 1 + random.nextInt(7);
            long total = random.nextInt(1_000_000);
            Map<String, Long> weights = new TreeMap<>();
            long sumWeights = 0;
            for (int i = 0; i < n; i++) {
                long w = 1 + random.nextInt(50);
                weights.put("p" + i, w);
                sumWeights += w;
            }
            Map<String, Long> out = Allocator.allocate(total, weights);
            exact &= sum(out) == total;
            for (Map.Entry<String, Long> e : out.entrySet()) {
                double ideal = (double) total * weights.get(e.getKey()) / sumWeights;
                fair &= Math.abs(e.getValue() - ideal) < 1.0;
            }
        }
        check(exact, "2000 random splits: the parts always add up to the total");
        check(fair, "and no one is more than one cent from their exact share");
    }

    private static void splitStrategies() {
        List<String> abc = List.of("a", "b", "c");
        check(new ExactSplit(Map.of("a", 100L, "b", 200L)).split(300, abc).equals(Map.of("a", 100L, "b", 200L, "c", 0L)), "an exact split fills in zero for people left out");
        check(throwsInvalid(() -> new ExactSplit(Map.of("a", 100L)).split(300, abc)), "exact amounts that do not add up are refused");
        check(throwsInvalid(() -> new ExactSplit(Map.of("z", 300L)).split(300, abc)), "exact amount for a non-participant is refused");
        check(new PercentSplit(Map.of("a", 3333L, "b", 3333L, "c", 3334L)).split(10_000, abc).equals(Map.of("a", 3333L, "b", 3333L, "c", 3334L)), "33.33, 33.33 and 33.34 percent");
        check(throwsInvalid(() -> new PercentSplit(Map.of("a", 5000L, "b", 4000L)).split(100, abc)), "percentages that are not 100 are refused");
        check(throwsInvalid(() -> new SharesSplit(Map.of("a", 0L, "b", 0L)).split(100, abc)), "all-zero shares are refused");
        check(throwsInvalid(() -> Allocator.allocate(100, Map.of())), "nobody to split between is refused");
    }

    private static boolean throwsInvalid(Runnable r) {
        try {
            r.run();
            return false;
        } catch (InvalidSplitException e) {
            return true;
        }
    }

    private static void singlePayer() {
        ExpenseService s = service();
        check(s.addExpense("g", "Hotel", Map.of("a", 40_000L), FOUR, new EqualSplit()).ok(), "an expense is accepted");
        check(s.balances("g").equals(Map.of("a", 30_000L, "b", -10_000L, "c", -10_000L, "d", -10_000L)), "the payer is owed the other three shares");
        check(s.whoOwesWhom("g").size() == 3 && s.whoOwesWhom("g").stream().allMatch(d -> d.to().equals("a") && d.cents() == 10_000), "each of the others owes the payer 100.00");
    }

    private static void severalPayers() {
        ExpenseService s = service();
        s.addExpense("g", "Tickets", Map.of("d", 20_000L, "a", 10_000L), FOUR, new EqualSplit());
        check(s.balances("g").equals(Map.of("a", 2_500L, "b", -7_500L, "c", -7_500L, "d", 12_500L)), "two payers: each is owed what they put in beyond their share");
        check(sum(s.balances("g")) == 0, "and the balances add up to zero");
    }

    private static void oppositeDebtsNet() {
        ExpenseService s = service();
        s.addExpense("g", "Lunch", Map.of("a", 2_000L), List.of("a", "b"), new EqualSplit());   // b owes a 10.00
        s.addExpense("g", "Coffee", Map.of("b", 800L), List.of("a", "b"), new EqualSplit());    // a owes b 4.00
        check(s.whoOwesWhom("g").equals(List.of(new Debt("b", "a", 600))), "opposite debts are netted: Ben owes Asha 6.00");
        s.addExpense("g", "Tea", Map.of("b", 1_200L), List.of("a", "b"), new EqualSplit());    // a owes b 6.00 more
        check(s.whoOwesWhom("g").isEmpty(), "when they cancel exactly, the pair disappears");
        check(s.balances("g").values().stream().allMatch(v -> v == 0), "everyone is at zero");
    }

    private static void settleUp() {
        ExpenseService s = service();
        s.addExpense("g", "Hotel", Map.of("a", 40_000L), FOUR, new EqualSplit());
        check(s.settleUp("g", "b", "a", 4_000).ok(), "a part payment is accepted");
        check(s.whoOwesWhom("g").contains(new Debt("b", "a", 6_000)), "Ben now owes 60.00");
        s.settleUp("g", "b", "a", 7_000);
        check(s.whoOwesWhom("g").contains(new Debt("a", "b", 1_000)), "paying too much turns the debt around");
        check(s.settleUp("g", "b", "b", 100).status() == ExpenseStatus.SAME_PERSON, "paying yourself is refused");
        check(s.settleUp("g", "b", "a", 0).status() == ExpenseStatus.BAD_AMOUNT, "a zero payment is refused");
        check(s.settleUp("g", "b", "zed", 100).status() == ExpenseStatus.NOT_A_MEMBER, "paying a stranger is refused");
    }

    private static void deleteUndoesExactly() {
        ExpenseService s = service();
        s.addExpense("g", "Hotel", Map.of("a", 40_000L), FOUR, new EqualSplit());
        Map<String, Long> before = s.balances("g");
        List<Debt> pairsBefore = s.whoOwesWhom("g");
        ExpenseResult dinner = s.addExpense("g", "Dinner", Map.of("b", 9_050L), FOUR, new EqualSplit());
        check(!s.balances("g").equals(before), "the dinner changed the balances");
        check(s.deleteExpense("g", dinner.entryId()).ok(), "the dinner can be deleted");
        check(s.balances("g").equals(before) && s.whoOwesWhom("g").equals(pairsBefore), "deleting restores the ledger exactly");
        check(s.deleteExpense("g", dinner.entryId()).status() == ExpenseStatus.ALREADY_DELETED, "deleting twice is refused");
        check(s.deleteExpense("g", "E99").status() == ExpenseStatus.NOT_FOUND, "an unknown expense is refused");
        check(s.history("g").size() == 2 && s.history("g").get(1).deleted, "the history keeps the deleted entry, marked");

        ExpenseResult payment = s.settleUp("g", "b", "a", 5_000);
        s.deleteExpense("g", payment.entryId());
        check(s.balances("g").equals(before), "a settlement can be undone too");
    }

    private static void validation() {
        ExpenseService s = service();
        check(s.addExpense("nope", "x", Map.of("a", 100L), FOUR, new EqualSplit()).status() == ExpenseStatus.UNKNOWN_GROUP, "unknown group");
        check(s.addExpense("g", "x", Map.of(), FOUR, new EqualSplit()).status() == ExpenseStatus.NO_PAYER, "no payer");
        check(s.addExpense("g", "x", Map.of("z", 100L), FOUR, new EqualSplit()).status() == ExpenseStatus.NOT_A_MEMBER, "a payer outside the group");
        check(s.addExpense("g", "x", Map.of("a", 100L), List.of("a", "z"), new EqualSplit()).status() == ExpenseStatus.NOT_A_MEMBER, "a participant outside the group");
        check(s.addExpense("g", "x", Map.of("a", 0L), FOUR, new EqualSplit()).status() == ExpenseStatus.BAD_AMOUNT, "a payer who paid nothing");
        ExpenseResult bad = s.addExpense("g", "x", Map.of("a", 1_000L), FOUR, new ExactSplit(Map.of("a", 1L)));
        check(bad.status() == ExpenseStatus.INVALID_SPLIT && bad.message().contains("0.01"), "an invalid split explains itself");
        check(s.history("g").isEmpty() && s.balances("g").values().stream().allMatch(v -> v == 0), "a refused expense changes nothing");
    }

    private static void balancesAlwaysSumToZero() {
        ExpenseService s = service();
        Random random = new Random(7);
        boolean zero = true;
        for (int i = 0; i < 300; i++) {
            String payer = FOUR.get(random.nextInt(4));
            long amount = 1 + random.nextInt(50_000);
            List<String> people = new ArrayList<>(FOUR);
            people.remove(random.nextInt(4));
            s.addExpense("g", "e" + i, Map.of(payer, amount), people, new EqualSplit());
            if (i % 7 == 0) s.settleUp("g", FOUR.get(random.nextInt(4)), "a", 1 + random.nextInt(1000));
            zero &= sum(s.balances("g")) == 0;
        }
        check(zero, "after every one of 300 random expenses and settlements the balances add up to zero");
    }

    private static Map<String, Long> net(long... values) {
        Map<String, Long> m = new TreeMap<>();
        for (int i = 0; i < values.length; i++) m.put("p" + i, values[i] * 100);
        return m;
    }

    private static void simplifierGreedy() {
        List<Debt> out = DebtSimplifier.greedy(net(5, -2, -3));
        check(out.size() == 2 && out.contains(new Debt("p2", "p0", 300)) && out.contains(new Debt("p1", "p0", 200)), "one creditor, two debtors: two payments");
        check(DebtSimplifier.greedy(net(0, 0, 0)).isEmpty(), "nobody owes anything: no payments");
        check(DebtSimplifier.greedy(net(4, -4)).equals(List.of(new Debt("p1", "p0", 400))), "two people: one payment");
    }

    private static void simplifierOptimalBeatsGreedy() {
        Map<String, Long> hard = net(5, 4, -3, 5, -4, -7);
        int greedy = DebtSimplifier.greedy(hard).size();
        int optimal = DebtSimplifier.optimal(hard).size();
        check(greedy == 5 && optimal == 4, "a case where greedy needs 5 payments and the optimum is 4 (the pair 4 and -4 settles alone)");
        check(DebtSimplifier.optimal(net(4, -4)).size() == 1 && DebtSimplifier.optimal(net(0, 0)).isEmpty(), "small cases agree");
        boolean never = true;
        Random random = new Random(3);
        for (int round = 0; round < 300; round++) {
            Map<String, Long> m = new TreeMap<>();
            long total = 0;
            for (int i = 0; i < 7; i++) {
                long v = random.nextInt(21) - 10;
                m.put("p" + i, v);
                total += v;
            }
            m.merge("p0", -total, Long::sum);
            never &= DebtSimplifier.optimal(m).size() <= DebtSimplifier.greedy(m).size();
        }
        check(never, "over 300 random groups the optimal answer is never longer than the greedy one");
    }

    private static void simplifiedPaymentsClearEveryone() {
        Random random = new Random(11);
        boolean clears = true;
        for (int round = 0; round < 200; round++) {
            Map<String, Long> m = new TreeMap<>();
            long total = 0;
            for (int i = 0; i < 6; i++) {
                long v = random.nextInt(2001) - 1000;
                m.put("p" + i, v);
                total += v;
            }
            m.merge("p0", -total, Long::sum);
            Map<String, Long> after = new TreeMap<>(m);
            for (Debt d : DebtSimplifier.optimal(m)) {
                after.merge(d.from(), d.cents(), Long::sum);
                after.merge(d.to(), -d.cents(), Long::sum);
            }
            clears &= after.values().stream().allMatch(v -> v == 0);
        }
        check(clears, "paying the simplified debts brings every balance to exactly zero");
        Map<String, Long> big = new TreeMap<>();
        for (int i = 0; i < 20; i++) big.put("p" + i, i % 2 == 0 ? 100L : -100L);
        check(DebtSimplifier.optimal(big).size() <= 19, "more than 15 people falls back to the greedy answer");
    }

    private static void acrossGroups() {
        ExpenseService s = service();
        s.addExpense("g", "Hotel", Map.of("a", 40_000L), FOUR, new EqualSplit());
        s.addExpense("h", "Taxi", Map.of("b", 1_000L), List.of("a", "b"), new EqualSplit());
        check(s.balanceAcrossGroups("a") == 30_000 - 500, "Asha is owed 300.00 in one group and owes 5.00 in the other");
        check(s.balanceAcrossGroups("b") == -10_000 + 500, "Ben's two balances add up");
    }

    private static void listeners() {
        ExpenseService s = service();
        List<String> events = new ArrayList<>();
        s.subscribe((type, group, entry) -> events.add(type));
        ExpenseResult e = s.addExpense("g", "x", Map.of("a", 100L), FOUR, new EqualSplit());
        s.settleUp("g", "b", "a", 10);
        s.deleteExpense("g", e.entryId());
        check(events.equals(List.of("EXPENSE_ADDED", "SETTLED", "EXPENSE_DELETED")), "listeners are told about each change in order");
    }

    private static void manyThreads() throws InterruptedException {
        ExpenseService s = service();
        Thread[] threads = new Thread[8];
        for (int t = 0; t < threads.length; t++) {
            final int n = t;
            threads[t] = new Thread(() -> {
                for (int i = 0; i < 250; i++) {
                    s.addExpense("g", "e", Map.of(FOUR.get((n + i) % 4), 100L + i), FOUR, new EqualSplit());
                    if (i % 10 == 0) s.settleUp("g", FOUR.get(n % 4), FOUR.get((n + 1) % 4), 5);
                }
            });
            threads[t].start();
        }
        for (Thread t : threads) t.join();
        check(s.history("g").size() == 8 * 250 + 8 * 25, "2200 entries arrived from 8 threads, none lost");
        check(sum(s.balances("g")) == 0, "and the balances still add up to zero");
    }
}
`,
      },
    ],
    expectedOutput: [
      "Split 100.00 three ways: asha 33.34, ben 33.33, chen 33.33",
      "Shares 1:2:3 of 10.00: asha 1.67, ben 3.33, chen 5.00",
      "After the hotel: asha 300.00, ben -100.00, chen -100.00, dev -100.00",
      "Tickets paid by two people: OK",
      "Net balances: asha 245.00, ben -135.00, chen -135.00, dev 25.00",
      "Who owes whom:",
      "  ben owes asha 70.00",
      "  ben owes dev 75.00",
      "  chen owes asha 75.00",
      "  chen owes ben 10.00",
      "  chen owes dev 50.00",
      "  dev owes asha 100.00",
      "Simplified:",
      "  ben owes asha 135.00",
      "  chen owes asha 110.00",
      "  chen owes dev 25.00",
      "Bad split: amounts add up to 6.00 but the expense is 10.00",
      "Not a member: NOT_A_MEMBER",
      "After Ben pays Dev 50.00: asha 245.00, ben -85.00, chen -135.00, dev -25.00",
      "Delete the hotel: OK, again: ALREADY_DELETED",
      "Net balances: asha -55.00, ben 15.00, chen -35.00, dev 75.00",
      "Sum of balances: 0",
    ],
  },
};
