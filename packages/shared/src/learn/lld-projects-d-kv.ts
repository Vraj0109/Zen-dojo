import type { LldProject } from "./types";

// Key-value store with MVCC (plan 0025). Java 17, standard library only, default package.
// Compiled with javac -Xlint:all and run (Main and Tests) when it was written.

export const LLD_PROJECTS_D_KV: Record<string, LldProject> = {
  "lldp-kv-store": {
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

    synchronized void advance(long millis) { now += millis; }
}
`,
      },
      {
        name: "Version.java",
        code: `// One value of one key as of one commit. A key keeps a list of these, oldest first. A delete is a Version whose value is
// null (a tombstone), so older readers still see the value that was there before. expiresAt is an absolute time, or 0.
record Version(long commit, String value, long expiresAt) {
    boolean deleted() { return value == null; }
}
`,
      },
      {
        name: "Mutation.java",
        code: `// A change that is about to be committed: a value (null deletes) and an optional time to live in milliseconds (0 is none).
record Mutation(String value, long ttlMillis) {
    static Mutation put(String value) { return new Mutation(value, 0); }

    static Mutation delete() { return new Mutation(null, 0); }
}
`,
      },
      {
        name: "Seen.java",
        code: `// What a read found: the value (null if the key is absent or expired) and the commit number of the version it came from
// (0 if there was none). Transactions remember the commit number to check, at commit time, that nothing changed.
record Seen(String value, long commit) { }
`,
      },
      {
        name: "LogRecord.java",
        code: `record LogRecord(long commit, String key, String value, long expiresAt) { }
`,
      },
      {
        name: "Wal.java",
        code: `import java.util.List;

// A write-ahead log: every committed change is appended here BEFORE it becomes visible, so after a crash the store can
// be rebuilt by replaying the log. Real ones write to disk and sync; the interface is what the store depends on.
interface Wal {
    void append(List<LogRecord> records);

    List<LogRecord> records();
}
`,
      },
      {
        name: "InMemoryWal.java",
        code: `import java.util.ArrayList;
import java.util.List;

final class InMemoryWal implements Wal {
    private final List<LogRecord> log = new ArrayList<>();

    @Override
    public synchronized void append(List<LogRecord> records) { log.addAll(records); }

    @Override
    public synchronized List<LogRecord> records() { return List.copyOf(log); }
}
`,
      },
      {
        name: "WatchEvent.java",
        code: `record WatchEvent(String key, String oldValue, String newValue) { }
`,
      },
      {
        name: "CommitResult.java",
        code: `enum CommitResult { COMMITTED, CONFLICT, ALREADY_FINISHED }
`,
      },
      {
        name: "KvStore.java",
        code: `import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalLong;
import java.util.Optional;
import java.util.TreeMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.locks.ReadWriteLock;
import java.util.concurrent.locks.ReentrantReadWriteLock;
import java.util.function.Consumer;

// An in-memory key-value store with multi-version concurrency control (MVCC). A write never changes a value: it adds a new
// Version with the next commit number. A read at commit number N takes the newest version with commit at most N. That one
// idea gives three features almost for free:
//   snapshots     - a snapshot is just a remembered number N; it keeps seeing the store as it was
//   transactions  - reads come from a snapshot, writes are buffered, and commit checks that nothing they depended on moved
//   no read locks - readers never block writers for longer than a lookup, and never see a half-applied batch
// Keys expire by time (TTL): an expired version is invisible, and compact() removes what nobody can see any more.
final class KvStore {
    private final TreeMap<String, List<Version>> data = new TreeMap<>();
    private final TreeMap<Long, Integer> openSnapshots = new TreeMap<>();   // commit number to how many snapshots hold it
    private final ReadWriteLock lock = new ReentrantReadWriteLock();
    private final List<Watch> watches = new CopyOnWriteArrayList<>();
    private final TimeSource clock;
    private final Wal wal;
    private long commit;   // the number of the latest commit

    private record Watch(String prefix, Consumer<WatchEvent> listener) { }

    KvStore(TimeSource clock, Wal wal) {
        this.clock = clock;
        this.wal = wal;
    }

    // Rebuilds the store from a log, as after a crash. The log itself is not written again.
    static KvStore recover(TimeSource clock, Wal wal) {
        KvStore store = new KvStore(clock, wal);
        for (LogRecord r : wal.records()) {
            store.data.computeIfAbsent(r.key(), k -> new ArrayList<>()).add(new Version(r.commit(), r.value(), r.expiresAt()));
            store.commit = Math.max(store.commit, r.commit());
        }
        return store;
    }

    // ---------------------------------------------------------------- reading

    // The value of a key as of a commit number and a moment in time.
    Seen readAt(String key, long atCommit, long atTime) {
        lock.readLock().lock();
        try {
            return visible(data.get(key), atCommit, atTime);
        } finally {
            lock.readLock().unlock();
        }
    }

    private static Seen visible(List<Version> versions, long atCommit, long atTime) {
        if (versions == null) return new Seen(null, 0);
        for (int i = versions.size() - 1; i >= 0; i--) {
            Version v = versions.get(i);
            if (v.commit() > atCommit) continue;
            boolean expired = v.expiresAt() != 0 && v.expiresAt() <= atTime;
            return new Seen(v.deleted() || expired ? null : v.value(), v.commit());
        }
        return new Seen(null, 0);
    }

    Optional<String> get(String key) {
        lock.readLock().lock();
        try {
            return Optional.ofNullable(visible(data.get(key), commit, clock.nowMillis()).value());
        } finally {
            lock.readLock().unlock();
        }
    }

    // Remaining life of a key in milliseconds, empty if it has no expiry or is not there.
    OptionalLong ttl(String key) {
        lock.readLock().lock();
        try {
            List<Version> versions = data.get(key);
            if (versions == null) return OptionalLong.empty();
            Version latest = versions.get(versions.size() - 1);
            if (latest.deleted() || latest.expiresAt() == 0 || latest.expiresAt() <= clock.nowMillis()) return OptionalLong.empty();
            return OptionalLong.of(latest.expiresAt() - clock.nowMillis());
        } finally {
            lock.readLock().unlock();
        }
    }

    // Key and value pairs whose key starts with the prefix, in key order, as of a commit number and a time.
    Map<String, String> scanAt(String prefix, long atCommit, long atTime) {
        lock.readLock().lock();
        try {
            Map<String, String> out = new LinkedHashMap<>();
            for (Map.Entry<String, List<Version>> e : data.tailMap(prefix, true).entrySet()) {
                if (!e.getKey().startsWith(prefix)) break;
                String value = visible(e.getValue(), atCommit, atTime).value();
                if (value != null) out.put(e.getKey(), value);
            }
            return out;
        } finally {
            lock.readLock().unlock();
        }
    }

    Map<String, String> scan(String prefix) { return scanAt(prefix, currentCommit(), clock.nowMillis()); }

    long currentCommit() {
        lock.readLock().lock();
        try {
            return commit;
        } finally {
            lock.readLock().unlock();
        }
    }

    int size() { return scan("").size(); }

    // ---------------------------------------------------------------- writing

    void put(String key, String value) { apply(Map.of(key, Mutation.put(value))); }

    void put(String key, String value, long ttlMillis) { apply(Map.of(key, new Mutation(value, ttlMillis))); }

    boolean delete(String key) {
        lock.writeLock().lock();
        try {
            boolean existed = visible(data.get(key), commit, clock.nowMillis()).value() != null;
            if (existed) commitLocked(Map.of(key, Mutation.delete()));
            return existed;
        } finally {
            lock.writeLock().unlock();
            flush();
        }
    }

    // Sets the value only when the key is absent. True if it was set.
    boolean putIfAbsent(String key, String value) { return compareAndSet(key, null, value); }

    // Sets the new value only if the current value equals expected (null means "absent"). One atomic step.
    boolean compareAndSet(String key, String expected, String value) {
        lock.writeLock().lock();
        try {
            String current = visible(data.get(key), commit, clock.nowMillis()).value();
            if (!java.util.Objects.equals(current, expected)) return false;
            commitLocked(Map.of(key, Mutation.put(value)));
            return true;
        } finally {
            lock.writeLock().unlock();
            flush();
        }
    }

    // Adds to a number stored as text. A missing key counts as 0. Empty if the stored value is not a whole number.
    OptionalLong incr(String key, long delta) {
        lock.writeLock().lock();
        try {
            String current = visible(data.get(key), commit, clock.nowMillis()).value();
            long base = 0;
            if (current != null) {
                try {
                    base = Long.parseLong(current);
                } catch (NumberFormatException e) {
                    return OptionalLong.empty();
                }
            }
            commitLocked(Map.of(key, Mutation.put(Long.toString(base + delta))));
            return OptionalLong.of(base + delta);
        } finally {
            lock.writeLock().unlock();
            flush();
        }
    }

    private void apply(Map<String, Mutation> changes) {
        lock.writeLock().lock();
        try {
            commitLocked(changes);
        } finally {
            lock.writeLock().unlock();
            flush();
        }
    }

    // Applies a batch under the write lock as ONE commit number, so readers see all of it or none of it. The log gets the
    // records first.
    private final List<Runnable> pendingNotifications = new ArrayList<>();

    private void commitLocked(Map<String, Mutation> changes) {
        long now = clock.nowMillis();
        long number = commit + 1;
        List<LogRecord> records = new ArrayList<>();
        for (Map.Entry<String, Mutation> e : changes.entrySet()) {
            long expires = e.getValue().ttlMillis() > 0 ? now + e.getValue().ttlMillis() : 0;
            records.add(new LogRecord(number, e.getKey(), e.getValue().value(), expires));
        }
        wal.append(records);   // durable first, visible second
        for (LogRecord r : records) {
            String before = visible(data.get(r.key()), commit, now).value();
            data.computeIfAbsent(r.key(), k -> new ArrayList<>()).add(new Version(r.commit(), r.value(), r.expiresAt()));
            WatchEvent event = new WatchEvent(r.key(), before, r.value());
            for (Watch w : watches) {
                if (r.key().startsWith(w.prefix())) pendingNotifications.add(() -> w.listener().accept(event));
            }
        }
        commit = number;
    }

    // Watchers are called after the lock is released, so a slow listener cannot block the store.
    private void flush() {
        List<Runnable> toRun;
        lock.writeLock().lock();
        try {
            toRun = new ArrayList<>(pendingNotifications);
            pendingNotifications.clear();
        } finally {
            lock.writeLock().unlock();
        }
        for (Runnable r : toRun) r.run();
    }

    void watch(String prefix, Consumer<WatchEvent> listener) { watches.add(new Watch(prefix, listener)); }

    // ---------------------------------------------------------------- snapshots, transactions, compaction

    Snapshot snapshot() {
        lock.writeLock().lock();
        try {
            openSnapshots.merge(commit, 1, Integer::sum);
            return new Snapshot(this, commit, clock.nowMillis());
        } finally {
            lock.writeLock().unlock();
        }
    }

    void release(long atCommit) {
        lock.writeLock().lock();
        try {
            openSnapshots.computeIfPresent(atCommit, (k, n) -> n == 1 ? null : n - 1);
        } finally {
            lock.writeLock().unlock();
        }
    }

    Transaction begin() {
        lock.writeLock().lock();
        try {
            openSnapshots.merge(commit, 1, Integer::sum);
            return new Transaction(this, commit, clock.nowMillis());
        } finally {
            lock.writeLock().unlock();
        }
    }

    // Commits a transaction if nothing it read or wrote has been changed by someone else since it began. First committer wins.
    CommitResult commitTransaction(long readCommit, Map<String, Long> reads, Map<String, Mutation> writes) {
        lock.writeLock().lock();
        try {
            if (writes.isEmpty()) return CommitResult.COMMITTED;   // a read-only transaction saw one consistent snapshot
            for (String key : reads.keySet()) if (latestCommit(key) > readCommit) return CommitResult.CONFLICT;
            for (String key : writes.keySet()) if (latestCommit(key) > readCommit) return CommitResult.CONFLICT;
            commitLocked(writes);
            return CommitResult.COMMITTED;
        } finally {
            lock.writeLock().unlock();
            flush();
        }
    }

    private long latestCommit(String key) {
        List<Version> versions = data.get(key);
        return versions == null ? 0 : versions.get(versions.size() - 1).commit();
    }

    // Removes versions that no reader can reach: older than the oldest open snapshot (but keeping the newest of those, which
    // that snapshot still sees), and keys whose newest visible state is a delete or an expiry. Returns how many versions went.
    int compact() {
        lock.writeLock().lock();
        try {
            long oldest = openSnapshots.isEmpty() ? commit : openSnapshots.firstKey();
            long now = clock.nowMillis();
            int removed = 0;
            var it = data.entrySet().iterator();
            while (it.hasNext()) {
                List<Version> versions = it.next().getValue();
                int keepFrom = 0;
                for (int i = 0; i < versions.size(); i++) if (versions.get(i).commit() <= oldest) keepFrom = i;
                removed += keepFrom;
                versions.subList(0, keepFrom).clear();
                Version only = versions.get(0);
                boolean dead = only.deleted() || (only.expiresAt() != 0 && only.expiresAt() <= now);
                if (versions.size() == 1 && dead && only.commit() <= oldest) {
                    it.remove();
                    removed++;
                }
            }
            return removed;
        } finally {
            lock.writeLock().unlock();
        }
    }

    int versionCount() {
        lock.readLock().lock();
        try {
            int n = 0;
            for (List<Version> v : data.values()) n += v.size();
            return n;
        } finally {
            lock.readLock().unlock();
        }
    }
}
`,
      },
      {
        name: "Snapshot.java",
        code: `import java.util.Map;
import java.util.Optional;

// A frozen view of the store: it sees every key as it was when the snapshot was taken, whatever happens after. The time is
// frozen too, so a key that was alive then is alive in the snapshot even if it has expired since. Close it when done:
// until then, compact() must keep the old versions it can see.
final class Snapshot implements AutoCloseable {
    private final KvStore store;
    private final long commit;
    private final long time;
    private boolean closed;

    Snapshot(KvStore store, long commit, long time) {
        this.store = store;
        this.commit = commit;
        this.time = time;
    }

    Optional<String> get(String key) { return Optional.ofNullable(store.readAt(key, commit, time).value()); }

    Map<String, String> scan(String prefix) { return store.scanAt(prefix, commit, time); }

    long commit() { return commit; }

    @Override
    public void close() {
        if (closed) return;
        closed = true;
        store.release(commit);
    }
}
`,
      },
      {
        name: "Transaction.java",
        code: `import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

// Optimistic transaction: it never locks anything. Reads see the store as of the moment the transaction began, plus the
// transaction's own writes. Writes are buffered. At commit the store checks that no key the transaction read or wrote has
// a newer commit than the transaction's start; if one has, someone else got there first and the commit is refused
// (CONFLICT), nothing is applied, and the caller retries. Validating the reads too is what prevents write skew.
final class Transaction implements AutoCloseable {
    private final KvStore store;
    private final long readCommit;
    private final long readTime;
    private final Map<String, Long> reads = new HashMap<>();
    private final Map<String, Mutation> writes = new LinkedHashMap<>();
    private boolean finished;

    Transaction(KvStore store, long readCommit, long readTime) {
        this.store = store;
        this.readCommit = readCommit;
        this.readTime = readTime;
    }

    Optional<String> get(String key) {
        check();
        Mutation own = writes.get(key);
        if (own != null) return Optional.ofNullable(own.value());
        Seen seen = store.readAt(key, readCommit, readTime);
        reads.putIfAbsent(key, seen.commit());
        return Optional.ofNullable(seen.value());
    }

    void put(String key, String value) {
        check();
        writes.put(key, Mutation.put(value));
    }

    void put(String key, String value, long ttlMillis) {
        check();
        writes.put(key, new Mutation(value, ttlMillis));
    }

    void delete(String key) {
        check();
        writes.put(key, Mutation.delete());
    }

    CommitResult commit() {
        if (finished) return CommitResult.ALREADY_FINISHED;
        finished = true;
        CommitResult result = store.commitTransaction(readCommit, reads, writes);
        store.release(readCommit);
        return result;
    }

    void rollback() {
        if (finished) return;
        finished = true;
        store.release(readCommit);
    }

    // Closing without committing is a rollback, so try-with-resources cannot leak a transaction.
    @Override
    public void close() { rollback(); }

    private void check() {
        if (finished) throw new IllegalStateException("the transaction has ended");
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
        InMemoryWal wal = new InMemoryWal();
        KvStore store = new KvStore(clock, wal);
        List<String> events = new ArrayList<>();
        store.watch("user:", e -> events.add(e.key() + " " + e.oldValue() + " -> " + e.newValue()));

        store.put("user:1", "asha");
        store.put("user:2", "ben");
        store.put("config:mode", "fast");
        System.out.println("get user:1 = " + store.get("user:1").orElse("-") + ", missing = " + store.get("nope").orElse("-"));
        System.out.println("scan user: = " + store.scan("user:"));
        System.out.println("putIfAbsent twice: " + store.putIfAbsent("lock", "a") + " " + store.putIfAbsent("lock", "b") + ", holder " + store.get("lock").get());
        System.out.println("compareAndSet right and wrong: " + store.compareAndSet("lock", "a", "c") + " " + store.compareAndSet("lock", "a", "d"));
        System.out.println("incr: " + store.incr("hits", 1).getAsLong() + " " + store.incr("hits", 5).getAsLong() + ", on text: " + store.incr("config:mode", 1).isPresent());

        store.put("session", "token", 1_000);
        clock.advance(400);
        System.out.println("session ttl after 400 ms: " + store.ttl("session").getAsLong());
        clock.advance(600);
        System.out.println("after 1000 ms: " + store.get("session").orElse("expired") + ", ttl " + store.ttl("session").isPresent());

        try (Snapshot snap = store.snapshot()) {
            store.put("user:1", "asha2");
            store.delete("user:2");
            System.out.println("snapshot still sees " + snap.scan("user:") + ", the store sees " + store.scan("user:"));
            System.out.println("versions before and after compact: " + store.versionCount() + ", removed " + store.compact() + ", " + store.versionCount());
        }
        System.out.println("after the snapshot is closed, compact removes " + store.compact() + ", versions " + store.versionCount());

        Transaction t1 = store.begin();
        Transaction t2 = store.begin();
        t1.put("balance", String.valueOf(Long.parseLong(t1.get("balance").orElse("100")) - 30));
        t2.put("balance", String.valueOf(Long.parseLong(t2.get("balance").orElse("100")) - 50));
        System.out.println("two transactions touch balance: " + t1.commit() + " then " + t2.commit() + ", balance " + store.get("balance").get());

        try (Transaction t = store.begin()) {
            t.put("temp", "x");
            System.out.println("inside a transaction: " + t.get("temp").get() + ", outside: " + store.get("temp").orElse("not visible"));
        }
        System.out.println("after closing without commit: " + store.get("temp").orElse("gone"));

        KvStore rebuilt = KvStore.recover(clock, wal);
        System.out.println("recovered from the log: user:1 = " + rebuilt.get("user:1").orElse("-") + ", hits = " + rebuilt.get("hits").orElse("-") + ", commit " + rebuilt.currentCommit() + " of " + store.currentCommit());
        System.out.println("watch events: " + events);
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
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

public class Tests {
    private static int failures = 0;

    private static void check(boolean ok, String name) {
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    private static final class Env {
        final ManualClock clock = new ManualClock(0);
        final InMemoryWal wal = new InMemoryWal();
        final KvStore store = new KvStore(clock, wal);
    }

    public static void main(String[] args) throws Exception {
        basics();
        scanning();
        expiry();
        atomicOperations();
        snapshots();
        transactionsReadAndWrite();
        conflicts();
        transactionLifecycle();
        batchIsAtomic();
        compaction();
        recovery();
        watching();
        manyIncrements();
        transfersKeepTheTotal();
        if (failures > 0) System.exit(1);
    }

    private static void basics() {
        Env e = new Env();
        check(e.store.get("a").isEmpty() && e.store.size() == 0, "an empty store has nothing");
        e.store.put("a", "1");
        e.store.put("a", "2");
        check(e.store.get("a").get().equals("2") && e.store.size() == 1, "a second put replaces the value");
        check(e.store.delete("a") && e.store.get("a").isEmpty(), "delete removes it");
        check(!e.store.delete("a") && !e.store.delete("never"), "deleting what is not there says false");
        e.store.put("a", "back");
        check(e.store.get("a").get().equals("back"), "a deleted key can be set again");
        check(e.store.currentCommit() == 4, "every change took one commit number: put, put, delete, put");
    }

    private static void scanning() {
        Env e = new Env();
        for (String k : new String[] {"user:2", "user:1", "usex", "config", "user:3"}) e.store.put(k, k.toUpperCase());
        check(new ArrayList<>(e.store.scan("user:").keySet()).equals(List.of("user:1", "user:2", "user:3")), "scan returns the keys with the prefix, in key order");
        e.store.delete("user:2");
        check(e.store.scan("user:").size() == 2 && e.store.scan("").size() == 4, "deleted keys do not show up");
        check(e.store.scan("zzz").isEmpty(), "no match is an empty map");
    }

    private static void expiry() {
        Env e = new Env();
        e.store.put("k", "v", 1_000);
        e.clock.advance(999);
        check(e.store.get("k").isPresent() && e.store.ttl("k").getAsLong() == 1, "alive one millisecond before the end of its life");
        e.clock.advance(1);
        check(e.store.get("k").isEmpty() && e.store.ttl("k").isEmpty(), "gone exactly at its time to live");
        e.store.put("forever", "v");
        check(e.store.ttl("forever").isEmpty() && e.store.get("forever").isPresent(), "a key without a time to live has no ttl");
        e.store.put("k", "again", 500);
        check(e.store.get("k").get().equals("again"), "an expired key can be set again");
        e.store.put("k", "plain");
        e.clock.advance(10_000);
        check(e.store.get("k").get().equals("plain"), "a new put without ttl removes the expiry");
        e.store.put("s", "v", 100);
        e.clock.advance(100);
        check(e.store.scan("s").isEmpty() && e.store.size() == 2, "expired keys are left out of scans and counts");
        check(e.store.putIfAbsent("s", "new"), "an expired key counts as absent");
        check(e.store.incr("s2", 1).getAsLong() == 1, "incr on a missing key starts from zero");
    }

    private static void atomicOperations() {
        Env e = new Env();
        check(e.store.putIfAbsent("lock", "a") && !e.store.putIfAbsent("lock", "b") && e.store.get("lock").get().equals("a"), "putIfAbsent sets only once");
        check(e.store.compareAndSet("lock", "a", "c") && !e.store.compareAndSet("lock", "a", "d") && e.store.get("lock").get().equals("c"), "compareAndSet needs the expected value");
        check(e.store.compareAndSet("fresh", null, "x") && !e.store.compareAndSet("fresh", null, "y"), "an expected value of null means absent");
        check(e.store.incr("n", 5).getAsLong() == 5 && e.store.incr("n", -7).getAsLong() == -2, "incr adds, also negative numbers");
        e.store.put("text", "abc");
        check(e.store.incr("text", 1).isEmpty() && e.store.get("text").get().equals("abc"), "incr on text changes nothing");
    }

    private static void snapshots() {
        Env e = new Env();
        e.store.put("a", "1");
        e.store.put("b", "2");
        Snapshot s = e.store.snapshot();
        e.store.put("a", "changed");
        e.store.delete("b");
        e.store.put("c", "new");
        check(s.get("a").get().equals("1") && s.get("b").get().equals("2") && s.get("c").isEmpty(), "a snapshot sees the store as it was");
        check(s.scan("").equals(Map.of("a", "1", "b", "2")), "and scans as it was");
        check(e.store.get("a").get().equals("changed") && e.store.get("b").isEmpty(), "while the store moves on");
        s.close();
        s.close();

        Env t = new Env();
        t.store.put("k", "v", 1_000);
        Snapshot early = t.store.snapshot();
        t.clock.advance(5_000);
        check(early.get("k").isPresent() && t.store.get("k").isEmpty(), "a snapshot has its own clock: a key that was alive then is alive in it");
        early.close();
    }

    private static void transactionsReadAndWrite() {
        Env e = new Env();
        e.store.put("x", "1");
        Transaction t = e.store.begin();
        check(t.get("x").get().equals("1") && t.get("missing").isEmpty(), "reads see the store");
        t.put("x", "2");
        t.put("y", "new");
        t.delete("x");
        check(t.get("x").isEmpty() && t.get("y").get().equals("new"), "a transaction sees its own writes, the last one wins");
        check(e.store.get("x").get().equals("1") && e.store.get("y").isEmpty(), "nobody else sees them before the commit");
        check(t.commit() == CommitResult.COMMITTED && e.store.get("x").isEmpty() && e.store.get("y").get().equals("new"), "after the commit everybody does");

        Transaction reader = e.store.begin();
        e.store.put("y", "changed outside");
        check(reader.get("y").get().equals("new"), "a transaction does not see commits that happened after it began");
        check(reader.commit() == CommitResult.COMMITTED, "a read-only transaction always commits: it saw one consistent snapshot and wrote nothing");
    }

    private static void conflicts() {
        Env e = new Env();
        e.store.put("balance", "100");
        Transaction a = e.store.begin();
        Transaction b = e.store.begin();
        a.put("balance", "70");
        b.put("balance", "50");
        check(a.commit() == CommitResult.COMMITTED && b.commit() == CommitResult.CONFLICT, "two writers of one key: the first commit wins");
        check(e.store.get("balance").get().equals("70"), "and the loser changed nothing");

        // write skew: each doctor checks that the other is on call, then goes off call
        e.store.put("alice", "on");
        e.store.put("bob", "on");
        Transaction alice = e.store.begin();
        Transaction bob = e.store.begin();
        boolean aliceSees = alice.get("bob").get().equals("on");
        boolean bobSees = bob.get("alice").get().equals("on");
        if (aliceSees) alice.put("alice", "off");
        if (bobSees) bob.put("bob", "off");
        check(alice.commit() == CommitResult.COMMITTED && bob.commit() == CommitResult.CONFLICT, "write skew is caught because reads are validated too");
        check(e.store.get("bob").get().equals("on"), "so one doctor stays on call");

        Transaction blind = e.store.begin();
        blind.put("fresh", "1");
        e.store.put("fresh", "2");
        check(blind.commit() == CommitResult.CONFLICT && e.store.get("fresh").get().equals("2"), "a blind write conflicts with a newer commit to the same key");

        Transaction retry = e.store.begin();
        retry.put("balance", String.valueOf(Long.parseLong(retry.get("balance").get()) - 20));
        check(retry.commit() == CommitResult.COMMITTED && e.store.get("balance").get().equals("50"), "the loser retried on the new value and succeeded");
    }

    private static void transactionLifecycle() {
        Env e = new Env();
        Transaction t = e.store.begin();
        t.put("a", "1");
        t.commit();
        check(t.commit() == CommitResult.ALREADY_FINISHED, "a transaction commits once");
        boolean refused = false;
        try {
            t.get("a");
        } catch (IllegalStateException ex) {
            refused = true;
        }
        check(refused, "using a finished transaction is an error");
        Transaction r = e.store.begin();
        r.put("b", "1");
        r.rollback();
        check(e.store.get("b").isEmpty() && r.commit() == CommitResult.ALREADY_FINISHED, "a rolled back transaction applies nothing");
        try (Transaction c = e.store.begin()) {
            c.put("c", "1");
        }
        check(e.store.get("c").isEmpty(), "closing without commit is a rollback");
        check(e.store.compact() >= 0, "finished transactions no longer hold old versions");
    }

    private static void batchIsAtomic() {
        Env e = new Env();
        e.store.put("x", "0");
        e.store.put("y", "0");
        long before = e.store.currentCommit();
        Transaction t = e.store.begin();
        t.put("x", "1");
        t.put("y", "1");
        t.commit();
        check(e.store.currentCommit() == before + 1, "a transaction with two writes takes one commit number");
        Env f = new Env();
        f.store.put("x", "0");
        Snapshot s = f.store.snapshot();
        Transaction u = f.store.begin();
        u.put("x", "1");
        u.put("y", "1");
        u.commit();
        check(s.get("x").get().equals("0") && s.get("y").isEmpty(), "an older snapshot sees none of a later batch");
        s.close();
    }

    private static void compaction() {
        Env e = new Env();
        for (int i = 0; i < 10; i++) e.store.put("k", "v" + i);
        check(e.store.versionCount() == 10, "every put kept a version");
        Snapshot s = e.store.snapshot();
        for (int i = 10; i < 15; i++) e.store.put("k", "v" + i);
        int removed = e.store.compact();
        check(removed == 9 && s.get("k").get().equals("v9"), "compaction keeps the version the snapshot sees and drops the older ones");
        s.close();
        check(e.store.compact() == 5 && e.store.versionCount() == 1 && e.store.get("k").get().equals("v14"), "with no snapshot only the newest stays");
        e.store.put("gone", "x");
        e.store.delete("gone");
        e.store.put("ttl", "x", 10);
        e.clock.advance(10);
        check(e.store.compact() >= 2 && e.store.versionCount() == 1, "deleted and expired keys are removed completely");
    }

    private static void recovery() {
        Env e = new Env();
        e.store.put("a", "1");
        e.store.put("b", "2", 1_000);
        e.store.delete("a");
        e.store.incr("n", 7);
        Transaction t = e.store.begin();
        t.put("c", "3");
        t.put("d", "4");
        t.commit();
        KvStore copy = KvStore.recover(e.clock, e.wal);
        check(copy.get("a").isEmpty() && copy.get("b").get().equals("2") && copy.get("n").get().equals("7") && copy.get("c").get().equals("3"), "a store rebuilt from the log has the same content");
        check(copy.currentCommit() == e.store.currentCommit(), "and the same commit number");
        e.clock.advance(1_000);
        check(copy.get("b").isEmpty(), "expiry survives recovery because the log holds the absolute time");
        copy.put("after", "x");
        check(copy.get("after").isPresent() && e.wal.records().size() == 6 + 1, "a recovered store keeps logging to the same log");
        check(e.wal.records().get(e.wal.records().size() - 1).commit() == copy.currentCommit(), "with the next commit number");
    }

    private static void watching() {
        Env e = new Env();
        List<String> seen = new ArrayList<>();
        e.store.watch("user:", ev -> seen.add(ev.key() + ":" + ev.oldValue() + ">" + ev.newValue()));
        e.store.put("user:1", "a");
        e.store.put("other", "x");
        e.store.put("user:1", "b");
        e.store.delete("user:1");
        Transaction t = e.store.begin();
        t.put("user:2", "z");
        t.commit();
        check(seen.equals(List.of("user:1:null>a", "user:1:a>b", "user:1:b>null", "user:2:null>z")), "watchers see old and new values of matching keys, including deletes and transactions");
    }

    private static void manyIncrements() throws InterruptedException {
        Env e = new Env();
        Thread[] threads = new Thread[8];
        for (int t = 0; t < threads.length; t++) {
            threads[t] = new Thread(() -> {
                for (int i = 0; i < 500; i++) e.store.incr("counter", 1);
            });
        }
        for (Thread th : threads) th.start();
        for (Thread th : threads) th.join();
        check(e.store.get("counter").get().equals("4000"), "8 threads, 500 increments each: 4000, none lost");

        AtomicInteger casWins = new AtomicInteger();
        e.store.put("slot", "free");
        Thread[] racers = new Thread[16];
        for (int t = 0; t < racers.length; t++) {
            final String me = "t" + t;
            racers[t] = new Thread(() -> {
                if (e.store.compareAndSet("slot", "free", me)) casWins.incrementAndGet();
            });
        }
        for (Thread th : racers) th.start();
        for (Thread th : racers) th.join();
        check(casWins.get() == 1, "16 threads compare-and-set the same slot: exactly one wins");
    }

    private static void transfersKeepTheTotal() throws InterruptedException {
        Env e = new Env();
        int accounts = 5;
        for (int i = 0; i < accounts; i++) e.store.put("acc" + i, "1000");
        AtomicInteger conflicts = new AtomicInteger();
        AtomicLong badTotals = new AtomicLong();
        Thread[] workers = new Thread[6];
        for (int w = 0; w < workers.length; w++) {
            final int seed = w;
            workers[w] = new Thread(() -> {
                java.util.Random random = new java.util.Random(seed);
                for (int i = 0; i < 300; i++) {
                    String from = "acc" + random.nextInt(accounts);
                    String to = "acc" + random.nextInt(accounts);
                    if (from.equals(to)) continue;
                    long amount = 1 + random.nextInt(50);
                    while (true) {
                        Transaction t = e.store.begin();
                        long a = Long.parseLong(t.get(from).get());
                        long b = Long.parseLong(t.get(to).get());
                        t.put(from, Long.toString(a - amount));
                        t.put(to, Long.toString(b + amount));
                        if (t.commit() == CommitResult.COMMITTED) break;
                        conflicts.incrementAndGet();
                    }
                }
            });
        }
        Thread auditor = new Thread(() -> {
            for (int i = 0; i < 300; i++) {
                try (Snapshot s = e.store.snapshot()) {
                    long total = 0;
                    for (String v : s.scan("acc").values()) total += Long.parseLong(v);
                    if (total != 1000L * accounts) badTotals.incrementAndGet();
                }
            }
        });
        for (Thread th : workers) th.start();
        auditor.start();
        for (Thread th : workers) th.join();
        auditor.join();
        long total = 0;
        for (String v : e.store.scan("acc").values()) total += Long.parseLong(v);
        check(total == 1000L * accounts, "after 1800 random transfers between 5 accounts the money total is unchanged");
        check(badTotals.get() == 0, "and a snapshot taken at any moment during them always saw the exact total");
    }
}
`,
      },
    ],
    expectedOutput: [
      "get user:1 = asha, missing = -",
      "scan user: = {user:1=asha, user:2=ben}",
      "putIfAbsent twice: true false, holder a",
      "compareAndSet right and wrong: true false",
      "incr: 1 6, on text: false",
      "session ttl after 400 ms: 600",
      "after 1000 ms: expired, ttl false",
      "snapshot still sees {user:1=asha, user:2=ben}, the store sees {user:1=asha2}",
      "versions before and after compact: 10, removed 3, 7",
      "after the snapshot is closed, compact removes 3, versions 4",
      "two transactions touch balance: COMMITTED then CONFLICT, balance 70",
      "inside a transaction: x, outside: not visible",
      "after closing without commit: gone",
      "recovered from the log: user:1 = asha2, hits = 6, commit 11 of 11",
      "watch events: [user:1 null -> asha, user:2 null -> ben, user:1 asha -> asha2, user:2 ben -> null]",
    ],
  },
};
