import type { LldProject } from "./types";

// Full Java project for the LRU cache + rate limiter LLD problem (plan 0013, batch B). Java 17, standard library only,
// default package, one top-level type per file. apps/web/lib/lld-projects.test.ts compiles it with javac -Xlint:all,
// runs Main and Tests, and checks that Main prints every line of expectedOutput. Generated from real, compiled source.

export const LLD_PROJECTS_B: Record<string, LldProject> = {
  "lldp-lru-rate-limiter": {
    files: [
      {
        name: "TimeSource.java",
        code: `// Where "now" comes from. Production code passes System::currentTimeMillis; tests pass a ManualTime they can move by hand.
// Every class that cares about time takes one of these instead of calling the system clock, which is what makes the
// time-based code (TTL, rate-limit windows) testable without sleeping.
@FunctionalInterface
interface TimeSource {
    long nowMillis();
}
`,
      },
      {
        name: "ManualTime.java",
        code: `// A clock that only moves when you tell it to. Used by Main and Tests.
final class ManualTime implements TimeSource {
    private long now;

    ManualTime(long start) {
        this.now = start;
    }

    @Override
    public synchronized long nowMillis() {
        return now;
    }

    synchronized void advance(long millis) {
        if (millis < 0) throw new IllegalArgumentException("time cannot go backwards");
        now += millis;
    }

    synchronized void set(long millis) {
        now = millis;
    }
}
`,
      },
      {
        name: "CacheStats.java",
        code: `// Counters a cache keeps about itself. Not thread-safe on purpose: the cache that owns it is either used by one thread
// or wrapped in SynchronizedCache, which holds a lock around every call.
final class CacheStats {
    private long hits;
    private long misses;
    private long evictions;
    private long expirations;

    void hit() {
        hits++;
    }

    void miss() {
        misses++;
    }

    void eviction() {
        evictions++;
    }

    void expiration() {
        expirations++;
    }

    long hits() {
        return hits;
    }

    long misses() {
        return misses;
    }

    long evictions() {
        return evictions;
    }

    long expirations() {
        return expirations;
    }

    // Share of lookups that found something. 0 before the first lookup, not NaN.
    double hitRate() {
        long total = hits + misses;
        return total == 0 ? 0.0 : (double) hits / total;
    }

    @Override
    public String toString() {
        return "hits=" + hits + " misses=" + misses + " evictions=" + evictions + " expirations=" + expirations
                + " hitRate=" + String.format("%.2f", hitRate());
    }
}
`,
      },
      {
        name: "EvictionListener.java",
        code: `// Told when a cache throws an entry away to make room (not when you remove it yourself). A real system might write the
// value to a slower tier here, or just count evictions.
@FunctionalInterface
interface EvictionListener<K, V> {
    void onEvict(K key, V value);
}
`,
      },
      {
        name: "Cache.java",
        code: `// The contract every cache here follows. get returns null for "not there"; null values are not allowed, so null is never
// ambiguous. Implementations differ only in what they throw away when full (LRU, LFU) or when too old (TTL).
interface Cache<K, V> {
    V get(K key);

    void put(K key, V value);

    boolean remove(K key);

    int size();

    CacheStats stats();
}
`,
      },
      {
        name: "LruCache.java",
        code: `import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

// Least-recently-used cache with O(1) get and put. A HashMap finds the entry; a doubly linked list keeps the entries in
// order of use, most recent at the front. Each get or put moves its entry to the front, so the entry just before the
// tail is always the one to evict. Two sentinel nodes (head and tail) mean no insert or unlink ever has to ask
// "is this the first or last node?".
//
// Not thread-safe: wrap it in SynchronizedCache if several threads share it.
final class LruCache<K, V> implements Cache<K, V> {
    private static final class Node<K, V> {
        final K key;
        V value;
        Node<K, V> prev;
        Node<K, V> next;

        Node(K key, V value) {
            this.key = key;
            this.value = value;
        }
    }

    private final int capacity;
    private final Map<K, Node<K, V>> index = new HashMap<>();
    private final Node<K, V> head = new Node<>(null, null); // head.next is the most recently used
    private final Node<K, V> tail = new Node<>(null, null); // tail.prev is the least recently used
    private final CacheStats stats = new CacheStats();
    private final EvictionListener<K, V> listener;

    LruCache(int capacity) {
        this(capacity, (k, v) -> { });
    }

    LruCache(int capacity, EvictionListener<K, V> listener) {
        if (capacity < 1) throw new IllegalArgumentException("capacity must be at least 1");
        this.capacity = capacity;
        this.listener = Objects.requireNonNull(listener);
        head.next = tail;
        tail.prev = head;
    }

    @Override
    public V get(K key) {
        Node<K, V> node = index.get(key);
        if (node == null) {
            stats.miss();
            return null;
        }
        unlink(node);
        addFront(node);
        stats.hit();
        return node.value;
    }

    @Override
    public void put(K key, V value) {
        Objects.requireNonNull(key);
        Objects.requireNonNull(value, "null values are not allowed");
        Node<K, V> node = index.get(key);
        if (node != null) {
            node.value = value;
            unlink(node);
            addFront(node);
            return;
        }
        if (index.size() == capacity) evictOldest();
        node = new Node<>(key, value);
        index.put(key, node);
        addFront(node);
    }

    @Override
    public boolean remove(K key) {
        Node<K, V> node = index.remove(key);
        if (node == null) return false;
        unlink(node);
        return true;
    }

    @Override
    public int size() {
        return index.size();
    }

    @Override
    public CacheStats stats() {
        return stats;
    }

    // Look at a value without counting it as a use. Handy for tests and debugging.
    V peek(K key) {
        Node<K, V> node = index.get(key);
        return node == null ? null : node.value;
    }

    // Keys from most to least recently used.
    java.util.List<K> keysByRecency() {
        java.util.List<K> keys = new java.util.ArrayList<>();
        for (Node<K, V> n = head.next; n != tail; n = n.next) keys.add(n.key);
        return keys;
    }

    private void evictOldest() {
        Node<K, V> victim = tail.prev;
        unlink(victim);
        index.remove(victim.key);
        stats.eviction();
        listener.onEvict(victim.key, victim.value);
    }

    private void unlink(Node<K, V> n) {
        n.prev.next = n.next;
        n.next.prev = n.prev;
    }

    private void addFront(Node<K, V> n) {
        n.next = head.next;
        n.prev = head;
        head.next.prev = n;
        head.next = n;
    }
}
`,
      },
      {
        name: "LfuCache.java",
        code: `import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;

// Least-frequently-used cache. Keeps a use count per key and groups keys into buckets by count; within a bucket the
// keys stay in insertion order, so ties go to the one that has waited longest. minFreq always points at the lowest
// non-empty bucket, which makes eviction O(1).
//
// Frequency alone has a weakness: a key that was hot an hour ago keeps its high count and is never evicted. Real
// systems age the counts or combine LFU with recency; this class keeps the textbook version.
final class LfuCache<K, V> implements Cache<K, V> {
    private final int capacity;
    private final Map<K, V> values = new HashMap<>();
    private final Map<K, Integer> counts = new HashMap<>();
    private final Map<Integer, LinkedHashSet<K>> buckets = new HashMap<>();
    private final CacheStats stats = new CacheStats();
    private final EvictionListener<K, V> listener;
    private int minFreq;

    LfuCache(int capacity) {
        this(capacity, (k, v) -> { });
    }

    LfuCache(int capacity, EvictionListener<K, V> listener) {
        if (capacity < 1) throw new IllegalArgumentException("capacity must be at least 1");
        this.capacity = capacity;
        this.listener = Objects.requireNonNull(listener);
    }

    @Override
    public V get(K key) {
        V value = values.get(key);
        if (value == null) {
            stats.miss();
            return null;
        }
        touch(key);
        stats.hit();
        return value;
    }

    @Override
    public void put(K key, V value) {
        Objects.requireNonNull(key);
        Objects.requireNonNull(value, "null values are not allowed");
        if (values.containsKey(key)) {
            values.put(key, value);
            touch(key);
            return;
        }
        if (values.size() == capacity) evictLeastFrequent();
        values.put(key, value);
        counts.put(key, 1);
        buckets.computeIfAbsent(1, f -> new LinkedHashSet<>()).add(key);
        minFreq = 1;
    }

    @Override
    public boolean remove(K key) {
        if (!values.containsKey(key)) return false;
        values.remove(key);
        int freq = counts.remove(key);
        dropFromBucket(key, freq);
        if (buckets.get(minFreq) == null) {
            // The lowest bucket may have just emptied: find the new lowest one.
            minFreq = buckets.keySet().stream().mapToInt(Integer::intValue).min().orElse(0);
        }
        return true;
    }

    @Override
    public int size() {
        return values.size();
    }

    @Override
    public CacheStats stats() {
        return stats;
    }

    // How many times a key has been used (a put counts as the first use). 0 if the key is not cached.
    int frequency(K key) {
        return counts.getOrDefault(key, 0);
    }

    private void touch(K key) {
        int freq = counts.get(key);
        dropFromBucket(key, freq);
        if (freq == minFreq && buckets.get(freq) == null) minFreq = freq + 1;
        counts.put(key, freq + 1);
        buckets.computeIfAbsent(freq + 1, f -> new LinkedHashSet<>()).add(key);
    }

    private void dropFromBucket(K key, int freq) {
        LinkedHashSet<K> bucket = buckets.get(freq);
        bucket.remove(key);
        if (bucket.isEmpty()) buckets.remove(freq);
    }

    private void evictLeastFrequent() {
        LinkedHashSet<K> bucket = buckets.get(minFreq);
        K victim = bucket.iterator().next(); // oldest in the lowest bucket
        bucket.remove(victim);
        if (bucket.isEmpty()) buckets.remove(minFreq);
        V value = values.remove(victim);
        counts.remove(victim);
        stats.eviction();
        listener.onEvict(victim, value);
    }
}
`,
      },
      {
        name: "TtlCache.java",
        code: `// An LRU cache whose entries also expire. Each value is stored with the time it stops being valid. Expiry is lazy: we
// do not run a background sweeper, an expired entry is simply treated as missing the next time someone asks for it
// (and removed then). Entries nobody asks for again are pushed out by LRU eviction when the cache is full, so memory
// stays bounded either way.
final class TtlCache<K, V> implements Cache<K, V> {
    private record Timed<V>(V value, long expiresAt) { }

    private final LruCache<K, Timed<V>> inner;
    private final long ttlMillis;
    private final TimeSource clock;
    private final CacheStats stats = new CacheStats();

    TtlCache(int capacity, long ttlMillis, TimeSource clock) {
        if (ttlMillis < 1) throw new IllegalArgumentException("ttl must be positive");
        this.inner = new LruCache<>(capacity, (k, v) -> stats.eviction());
        this.ttlMillis = ttlMillis;
        this.clock = clock;
    }

    @Override
    public V get(K key) {
        Timed<V> entry = inner.get(key);
        if (entry == null) {
            stats.miss();
            return null;
        }
        if (clock.nowMillis() >= entry.expiresAt()) {
            inner.remove(key);
            stats.expiration();
            stats.miss();
            return null;
        }
        stats.hit();
        return entry.value();
    }

    @Override
    public void put(K key, V value) {
        inner.put(key, new Timed<>(value, clock.nowMillis() + ttlMillis));
    }

    @Override
    public boolean remove(K key) {
        return inner.remove(key);
    }

    // Counts entries that are stored, including ones that have expired but not been looked at yet.
    @Override
    public int size() {
        return inner.size();
    }

    @Override
    public CacheStats stats() {
        return stats;
    }
}
`,
      },
      {
        name: "SynchronizedCache.java",
        code: `import java.util.concurrent.locks.ReentrantLock;

// Makes any Cache safe to share between threads by holding one lock around every call. This is a decorator: it
// implements Cache and wraps a Cache, so callers cannot tell the difference.
//
// Why a lock and not a ConcurrentHashMap: a plain LRU cache changes its list on every READ (it moves the entry to the
// front), so reads are writes and cannot run in parallel anyway. One lock is the simple, correct answer. Under real
// load you would split the cache into several shards, each with its own lock, and pick the shard by key hash.
final class SynchronizedCache<K, V> implements Cache<K, V> {
    private final Cache<K, V> inner;
    private final ReentrantLock lock = new ReentrantLock();

    SynchronizedCache(Cache<K, V> inner) {
        this.inner = inner;
    }

    @Override
    public V get(K key) {
        lock.lock();
        try {
            return inner.get(key);
        } finally {
            lock.unlock();
        }
    }

    @Override
    public void put(K key, V value) {
        lock.lock();
        try {
            inner.put(key, value);
        } finally {
            lock.unlock();
        }
    }

    @Override
    public boolean remove(K key) {
        lock.lock();
        try {
            return inner.remove(key);
        } finally {
            lock.unlock();
        }
    }

    @Override
    public int size() {
        lock.lock();
        try {
            return inner.size();
        } finally {
            lock.unlock();
        }
    }

    @Override
    public CacheStats stats() {
        return inner.stats();
    }
}
`,
      },
      {
        name: "Decision.java",
        code: `// The answer a rate limiter gives: yes or no, how many more calls would be allowed right now, and (when the answer is
// no) how long to wait before trying again. The last two are what an HTTP service turns into the X-RateLimit-Remaining
// and Retry-After headers, so a limiter that only returns a boolean is not enough for real use.
record Decision(boolean allowed, int remaining, long retryAfterMillis) {
    static Decision allow(int remaining) {
        return new Decision(true, Math.max(0, remaining), 0);
    }

    static Decision deny(long retryAfterMillis) {
        return new Decision(false, 0, Math.max(1, retryAfterMillis));
    }
}
`,
      },
      {
        name: "RateLimiter.java",
        code: `// One request from one caller (identified by a key such as a user id or an IP address). Each algorithm below keeps its
// own small state per key and answers with a Decision. All implementations are safe to call from many threads.
interface RateLimiter {
    Decision tryAcquire(String key);

    default boolean allow(String key) {
        return tryAcquire(key).allowed();
    }
}
`,
      },
      {
        name: "FixedWindowLimiter.java",
        code: `// Fixed window: time is cut into equal windows (for example every 1000 ms on the clock). Each key may make \`limit\`
// calls per window; the count resets when a new window starts. Tiny state (two numbers per key) and very fast, but it
// has a famous flaw: a caller can make \`limit\` calls at the end of one window and \`limit\` more at the start of the
// next, so twice the limit gets through in a short burst across the boundary.
//
// Per-key state lives in an LruCache with a maximum number of keys, so a flood of different keys cannot use unlimited
// memory. The price: a key that was evicted starts again with a fresh allowance.
final class FixedWindowLimiter implements RateLimiter {
    private static final class State {
        long windowStart;
        int count;
    }

    private final int limit;
    private final long windowMillis;
    private final TimeSource clock;
    private final Cache<String, State> states;

    FixedWindowLimiter(int limit, long windowMillis, TimeSource clock, int maxKeys) {
        if (limit < 1 || windowMillis < 1) throw new IllegalArgumentException("limit and window must be positive");
        this.limit = limit;
        this.windowMillis = windowMillis;
        this.clock = clock;
        this.states = new LruCache<>(maxKeys);
    }

    @Override
    public synchronized Decision tryAcquire(String key) {
        long now = clock.nowMillis();
        long windowStart = now - Math.floorMod(now, windowMillis);
        State s = states.get(key);
        if (s == null || s.windowStart != windowStart) {
            s = new State();
            s.windowStart = windowStart;
            states.put(key, s);
        }
        if (s.count < limit) {
            s.count++;
            return Decision.allow(limit - s.count);
        }
        return Decision.deny(windowStart + windowMillis - now);
    }
}
`,
      },
      {
        name: "SlidingWindowLogLimiter.java",
        code: `import java.util.ArrayDeque;
import java.util.Deque;

// Sliding window log: remember the time of every allowed call in the last window and count them. Exact, with no
// boundary burst: at any moment, no more than \`limit\` calls happened in the previous \`windowMillis\`. The cost is memory:
// up to \`limit\` timestamps per key, which is fine for a limit of 100 and painful for a limit of a million.
final class SlidingWindowLogLimiter implements RateLimiter {
    private final int limit;
    private final long windowMillis;
    private final TimeSource clock;
    private final Cache<String, Deque<Long>> logs;

    SlidingWindowLogLimiter(int limit, long windowMillis, TimeSource clock, int maxKeys) {
        if (limit < 1 || windowMillis < 1) throw new IllegalArgumentException("limit and window must be positive");
        this.limit = limit;
        this.windowMillis = windowMillis;
        this.clock = clock;
        this.logs = new LruCache<>(maxKeys);
    }

    @Override
    public synchronized Decision tryAcquire(String key) {
        long now = clock.nowMillis();
        Deque<Long> log = logs.get(key);
        if (log == null) {
            log = new ArrayDeque<>();
            logs.put(key, log);
        }
        // Forget calls that have slid out of the window. A call at time t counts until t + window.
        while (!log.isEmpty() && log.peekFirst() <= now - windowMillis) log.pollFirst();
        if (log.size() < limit) {
            log.addLast(now);
            return Decision.allow(limit - log.size());
        }
        return Decision.deny(log.peekFirst() + windowMillis - now);
    }
}
`,
      },
      {
        name: "SlidingWindowCounterLimiter.java",
        code: `// Sliding window counter: a cheap approximation of the sliding log. Keep only two counts per key, the current fixed
// window and the one before it, and estimate the number of calls in the last \`windowMillis\` as
//     previous * (share of the previous window still inside the sliding window) + current.
// It smooths the boundary burst of the fixed window using constant memory. The estimate assumes the previous window's
// calls were spread evenly, so it can be a little wrong, which is the trade for not storing timestamps.
final class SlidingWindowCounterLimiter implements RateLimiter {
    private static final class State {
        long windowStart;
        int current;
        int previous;
    }

    private final int limit;
    private final long windowMillis;
    private final TimeSource clock;
    private final Cache<String, State> states;

    SlidingWindowCounterLimiter(int limit, long windowMillis, TimeSource clock, int maxKeys) {
        if (limit < 1 || windowMillis < 1) throw new IllegalArgumentException("limit and window must be positive");
        this.limit = limit;
        this.windowMillis = windowMillis;
        this.clock = clock;
        this.states = new LruCache<>(maxKeys);
    }

    @Override
    public synchronized Decision tryAcquire(String key) {
        long now = clock.nowMillis();
        long windowStart = now - Math.floorMod(now, windowMillis);
        State s = states.get(key);
        if (s == null) {
            s = new State();
            s.windowStart = windowStart;
            states.put(key, s);
        }
        if (s.windowStart != windowStart) {
            // Moved into a later window. If it is the very next one, the old count becomes "previous"; if we skipped
            // a whole window or more, the previous window had no calls at all.
            s.previous = (windowStart - s.windowStart == windowMillis) ? s.current : 0;
            s.current = 0;
            s.windowStart = windowStart;
        }
        double previousShare = (double) (windowMillis - (now - windowStart)) / windowMillis;
        double estimate = s.previous * previousShare + s.current;
        if (estimate + 1 <= limit) {
            s.current++;
            return Decision.allow((int) Math.floor(limit - estimate - 1));
        }
        // Simple, slightly pessimistic hint: the next window starts at this time.
        return Decision.deny(windowStart + windowMillis - now);
    }
}
`,
      },
      {
        name: "TokenBucketLimiter.java",
        code: `// Token bucket: each key owns a bucket that holds up to \`capacity\` tokens and refills at \`refillPerSecond\`. A call
// takes one token; with an empty bucket the call is refused. It allows bursts (a full bucket can serve \`capacity\` calls
// at once) and then settles to the refill rate, which is what most APIs want. State per key is two numbers: the token
// count and the time we last refilled. We never run a timer: on each call we work out how many tokens arrived since the
// last call.
final class TokenBucketLimiter implements RateLimiter {
    private static final class State {
        double tokens;
        long lastRefill;
    }

    private final int capacity;
    private final double refillPerSecond;
    private final TimeSource clock;
    private final Cache<String, State> states;

    TokenBucketLimiter(int capacity, double refillPerSecond, TimeSource clock, int maxKeys) {
        if (capacity < 1 || refillPerSecond <= 0) throw new IllegalArgumentException("capacity and refill must be positive");
        this.capacity = capacity;
        this.refillPerSecond = refillPerSecond;
        this.clock = clock;
        this.states = new LruCache<>(maxKeys);
    }

    @Override
    public synchronized Decision tryAcquire(String key) {
        long now = clock.nowMillis();
        State s = states.get(key);
        if (s == null) {
            s = new State();
            s.tokens = capacity; // a new caller starts with a full bucket
            s.lastRefill = now;
            states.put(key, s);
        } else {
            double arrived = (now - s.lastRefill) * refillPerSecond / 1000.0;
            s.tokens = Math.min(capacity, s.tokens + arrived);
            s.lastRefill = now;
        }
        if (s.tokens >= 1) {
            s.tokens -= 1;
            return Decision.allow((int) s.tokens);
        }
        long waitMillis = (long) Math.ceil((1 - s.tokens) / refillPerSecond * 1000.0);
        return Decision.deny(waitMillis);
    }
}
`,
      },
      {
        name: "LeakyBucketLimiter.java",
        code: `// Leaky bucket (as a meter): each key has a bucket of size \`capacity\` that drains at \`leakPerSecond\`. A call adds one
// unit of water; if that would overflow the bucket, the call is refused. It looks like the token bucket upside down,
// and the long-run rate is the same, but the effect differs: a token bucket lets a burst through immediately, while a
// leaky bucket used as a QUEUE would release calls at a steady drip. This version is the meter variant (it refuses
// instead of queuing), which is the one used for rate limiting; the queue variant is used for traffic shaping.
final class LeakyBucketLimiter implements RateLimiter {
    private static final class State {
        double level;
        long lastLeak;
    }

    private final int capacity;
    private final double leakPerSecond;
    private final TimeSource clock;
    private final Cache<String, State> states;

    LeakyBucketLimiter(int capacity, double leakPerSecond, TimeSource clock, int maxKeys) {
        if (capacity < 1 || leakPerSecond <= 0) throw new IllegalArgumentException("capacity and leak rate must be positive");
        this.capacity = capacity;
        this.leakPerSecond = leakPerSecond;
        this.clock = clock;
        this.states = new LruCache<>(maxKeys);
    }

    @Override
    public synchronized Decision tryAcquire(String key) {
        long now = clock.nowMillis();
        State s = states.get(key);
        if (s == null) {
            s = new State();
            s.lastLeak = now;
            states.put(key, s);
        } else {
            double leaked = (now - s.lastLeak) * leakPerSecond / 1000.0;
            s.level = Math.max(0, s.level - leaked);
            s.lastLeak = now;
        }
        if (s.level + 1 <= capacity) {
            s.level += 1;
            return Decision.allow((int) Math.floor(capacity - s.level));
        }
        long waitMillis = (long) Math.ceil((s.level + 1 - capacity) / leakPerSecond * 1000.0);
        return Decision.deny(waitMillis);
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Random;

// A tour of the caches and the rate limiters. Everything time-based runs on ManualTime, so the output is the same on
// every run and nothing sleeps.
public class Main {
    public static void main(String[] args) throws Exception {
        lruDemo();
        lfuDemo();
        ttlDemo();
        threadsDemo();
        windowDemo();
        bucketDemo();
        keyDemo();
    }

    static void lruDemo() {
        System.out.println("== LRU cache, capacity 3 ==");
        LruCache<String, Integer> cache = new LruCache<>(3, (k, v) -> System.out.println("  evicted " + k + "=" + v));
        cache.put("a", 1);
        cache.put("b", 2);
        cache.put("c", 3);
        cache.get("a"); // a is now the most recently used
        System.out.println("put d (cache is full):");
        cache.put("d", 4);
        System.out.println("order, newest first: " + cache.keysByRecency());
        System.out.println("get b -> " + cache.get("b"));
        System.out.println("LRU stats: " + cache.stats());
    }

    static void lfuDemo() {
        System.out.println("== LFU cache, capacity 2 ==");
        LfuCache<String, String> cache = new LfuCache<>(2);
        cache.put("x", "1");
        cache.put("y", "2");
        cache.get("x");
        cache.get("x");
        System.out.println("x has been used " + cache.frequency("x") + " times, y " + cache.frequency("y") + " time");
        cache.put("z", "3");
        System.out.println("after put z: x=" + cache.get("x") + " y=" + cache.get("y") + " z=" + cache.get("z"));
    }

    static void ttlDemo() {
        System.out.println("== TTL cache, entries live 1000 ms ==");
        ManualTime time = new ManualTime(0);
        TtlCache<String, String> cache = new TtlCache<>(10, 1000, time);
        cache.put("session", "token-1");
        time.advance(500);
        System.out.println("at 500 ms: " + cache.get("session"));
        time.advance(600);
        System.out.println("at 1100 ms: " + cache.get("session"));
        System.out.println("TTL stats: " + cache.stats());
    }

    static void threadsDemo() throws InterruptedException {
        System.out.println("== Eight threads sharing one cache ==");
        Cache<Integer, Integer> cache = new SynchronizedCache<>(new LruCache<>(50));
        List<Thread> threads = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            final long seed = t;
            Thread thread = new Thread(() -> {
                Random random = new Random(seed);
                for (int i = 0; i < 10_000; i++) {
                    int key = random.nextInt(200);
                    if (random.nextBoolean()) cache.put(key, key);
                    else cache.get(key);
                }
            });
            threads.add(thread);
            thread.start();
        }
        for (Thread thread : threads) thread.join();
        boolean consistent = true;
        for (int key = 0; key < 200; key++) {
            Integer value = cache.get(key);
            if (value != null && value != key) consistent = false;
        }
        System.out.println("size is exactly the capacity: " + (cache.size() == 50));
        System.out.println("every stored value matches its key: " + consistent);
    }

    // Runs n calls for one key and summarises the answers.
    static String burst(RateLimiter limiter, String key, int n) {
        int allowed = 0;
        int denied = 0;
        long retry = 0;
        for (int i = 0; i < n; i++) {
            Decision d = limiter.tryAcquire(key);
            if (d.allowed()) allowed++;
            else {
                denied++;
                retry = d.retryAfterMillis();
            }
        }
        return "allowed=" + allowed + " denied=" + denied + (denied > 0 ? " (retry after " + retry + " ms)" : "");
    }

    static void windowDemo() {
        System.out.println("== Window limiters, 3 calls per 1000 ms ==");
        ManualTime time = new ManualTime(900);
        RateLimiter fixed = new FixedWindowLimiter(3, 1000, time, 100);
        System.out.println("fixed window, 3 calls at t=900:    " + burst(fixed, "alice", 3));
        time.set(1000);
        System.out.println("fixed window, 3 calls at t=1000:   " + burst(fixed, "alice", 3) + "  <- 6 calls in 100 ms");

        time.set(900);
        RateLimiter log = new SlidingWindowLogLimiter(3, 1000, time, 100);
        System.out.println("sliding log, 3 calls at t=900:     " + burst(log, "alice", 3));
        time.set(1000);
        System.out.println("sliding log, 3 calls at t=1000:    " + burst(log, "alice", 3));
        time.set(1900);
        System.out.println("sliding log, 3 calls at t=1900:    " + burst(log, "alice", 3));

        time.set(0);
        RateLimiter counter = new SlidingWindowCounterLimiter(4, 1000, time, 100);
        System.out.println("sliding counter (limit 4), t=0:    " + burst(counter, "alice", 4));
        time.set(1000);
        System.out.println("sliding counter, t=1000:           " + burst(counter, "alice", 1));
        time.set(1500);
        System.out.println("sliding counter, t=1500:           " + burst(counter, "alice", 3));
    }

    static void bucketDemo() {
        System.out.println("== Bucket limiters ==");
        ManualTime time = new ManualTime(0);
        RateLimiter tokens = new TokenBucketLimiter(5, 1.0, time, 100);
        System.out.println("token bucket (5, refill 1/s), 7 calls at t=0:  " + burst(tokens, "alice", 7));
        time.advance(2000);
        System.out.println("token bucket, 3 calls at t=2000:               " + burst(tokens, "alice", 3));
        time.advance(60_000);
        System.out.println("token bucket, 8 calls after a long quiet time: " + burst(tokens, "alice", 8));

        time.set(0);
        RateLimiter leaky = new LeakyBucketLimiter(3, 1.0, time, 100);
        System.out.println("leaky bucket (3, leak 1/s), 5 calls at t=0:    " + burst(leaky, "alice", 5));
        time.set(1500);
        System.out.println("leaky bucket, 2 calls at t=1500:               " + burst(leaky, "alice", 2));
    }

    static void keyDemo() {
        System.out.println("== One limiter, many callers ==");
        ManualTime time = new ManualTime(0);
        RateLimiter limiter = new TokenBucketLimiter(2, 1.0, time, 100);
        System.out.println("alice, 3 calls: " + burst(limiter, "alice", 3));
        System.out.println("bob, 1 call:    " + burst(limiter, "bob", 1));

        RateLimiter tiny = new FixedWindowLimiter(1, 1000, time, 2); // room for only two callers' state
        tiny.allow("alice");
        System.out.println("alice, second call in the window: " + burst(tiny, "alice", 1));
        tiny.allow("bob");
        tiny.allow("carol"); // pushes alice's state out
        System.out.println("alice, after her state was evicted: " + burst(tiny, "alice", 1));
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

// Self-checking tests (no JUnit needed). Prints PASS or FAIL per check; exits with 1 if anything failed.
public class Tests {
    static int failures;
    static int total;

    static void check(String name, boolean ok) {
        total++;
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    static boolean throwsIllegalArgument(Runnable r) {
        try {
            r.run();
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }

    public static void main(String[] args) {
        lru();
        lfu();
        ttl();
        sync();
        fixedWindow();
        slidingLog();
        slidingCounter();
        tokenBucket();
        leakyBucket();
        keys();
        if (failures > 0) {
            System.out.println(failures + " of " + total + " checks did not pass");
            System.exit(1);
        }
        System.out.println("all " + total + " checks passed");
    }

    static void lru() {
        LruCache<String, Integer> c = new LruCache<>(2);
        c.put("a", 1);
        c.put("b", 2);
        c.put("c", 3);
        check("lru: the least recently used entry is evicted", c.peek("a") == null && c.peek("b") == 2 && c.peek("c") == 3);

        c = new LruCache<>(2);
        c.put("a", 1);
        c.put("b", 2);
        c.get("a");
        c.put("c", 3);
        check("lru: get refreshes an entry", c.peek("a") != null && c.peek("b") == null);

        c = new LruCache<>(2);
        c.put("a", 1);
        c.put("b", 2);
        c.put("a", 10);
        c.put("c", 3);
        check("lru: put on an existing key updates it and refreshes it", c.peek("a") == 10 && c.peek("b") == null);

        c = new LruCache<>(1);
        c.put("a", 1);
        c.put("b", 2);
        check("lru: capacity 1 keeps only the newest", c.size() == 1 && c.peek("b") == 2 && c.peek("a") == null);

        c = new LruCache<>(3);
        c.put("a", 1);
        c.put("b", 2);
        check("lru: remove returns whether something was removed", c.remove("a") && !c.remove("a") && c.size() == 1);
        c.put("c", 3);
        c.put("d", 4);
        c.put("e", 5);
        check("lru: a removed entry frees its slot", c.size() == 3 && c.peek("b") == null);

        c = new LruCache<>(3);
        c.put("a", 1);
        c.put("b", 2);
        c.put("c", 3);
        c.get("a");
        check("lru: keysByRecency lists newest first", c.keysByRecency().equals(List.of("a", "c", "b")));

        List<String> evicted = new ArrayList<>();
        LruCache<String, Integer> listened = new LruCache<>(1, (k, v) -> evicted.add(k + "=" + v));
        listened.put("a", 1);
        listened.put("b", 2);
        listened.remove("b");
        check("lru: the listener hears about evictions but not removals", evicted.equals(List.of("a=1")));

        LruCache<String, Integer> counted = new LruCache<>(2);
        counted.put("a", 1);
        counted.get("a");
        counted.get("zzz");
        check("lru: stats count hits, misses and evictions", counted.stats().hits() == 1 && counted.stats().misses() == 1 && counted.stats().hitRate() == 0.5);

        check("lru: a capacity below 1 is rejected", throwsIllegalArgument(() -> new LruCache<String, String>(0)));
        boolean rejected = false;
        try {
            new LruCache<String, String>(2).put("a", null);
        } catch (NullPointerException e) {
            rejected = true;
        }
        check("lru: null values are rejected, so null always means a miss", rejected);
    }

    static void lfu() {
        LfuCache<String, Integer> c = new LfuCache<>(2);
        c.put("a", 1);
        c.put("b", 2);
        c.get("a");
        c.put("c", 3);
        check("lfu: the least frequently used entry is evicted", c.get("b") == null && c.get("a") != null && c.get("c") != null);

        c = new LfuCache<>(2);
        c.put("a", 1);
        c.put("b", 2);
        c.put("c", 3);
        check("lfu: a tie is broken by evicting the oldest", c.get("a") == null && c.get("b") != null);

        c = new LfuCache<>(2);
        c.put("a", 1);
        c.get("a");
        c.put("a", 5);
        check("lfu: put on an existing key counts as a use", c.frequency("a") == 3 && c.get("a") == 5);

        c = new LfuCache<>(2);
        c.put("a", 1);
        c.put("b", 2);
        c.remove("a");
        c.remove("b");
        c.put("c", 3);
        c.put("d", 4);
        c.put("e", 5);
        check("lfu: removing the only entries of the lowest bucket does not break the next eviction", c.size() == 2 && c.get("c") == null && c.get("e") != null);

        check("lfu: frequency of an unknown key is 0", new LfuCache<String, String>(1).frequency("nope") == 0);
        check("lfu: a capacity below 1 is rejected", throwsIllegalArgument(() -> new LfuCache<String, String>(0)));
    }

    static void ttl() {
        ManualTime time = new ManualTime(1000);
        TtlCache<String, String> c = new TtlCache<>(5, 100, time);
        c.put("k", "v");
        time.advance(99);
        check("ttl: an entry is valid until just before its deadline", "v".equals(c.get("k")));
        time.advance(1);
        check("ttl: an entry expires exactly at its deadline", c.get("k") == null && c.stats().expirations() == 1);
        check("ttl: an expired entry is removed when looked at", c.size() == 0);

        c.put("k", "v1");
        time.advance(90);
        c.put("k", "v2");
        time.advance(90);
        check("ttl: put again restarts the clock", "v2".equals(c.get("k")));

        TtlCache<String, String> small = new TtlCache<>(1, 1000, time);
        small.put("a", "1");
        small.put("b", "2");
        check("ttl: capacity still applies, and evictions are counted", small.get("a") == null && small.stats().evictions() == 1);
        check("ttl: a ttl below 1 is rejected", throwsIllegalArgument(() -> new TtlCache<String, String>(1, 0, time)));
    }

    static void sync() {
        Cache<Integer, Integer> c = new SynchronizedCache<>(new LruCache<>(10));
        Thread[] threads = new Thread[4];
        for (int t = 0; t < threads.length; t++) {
            final int offset = t * 1000;
            threads[t] = new Thread(() -> {
                for (int i = 0; i < 5000; i++) c.put(offset + i, i);
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
        check("synchronized: the size never exceeds the capacity", c.size() == 10);
    }

    static void fixedWindow() {
        ManualTime time = new ManualTime(0);
        RateLimiter l = new FixedWindowLimiter(2, 1000, time, 10);
        check("fixed: allows up to the limit", l.allow("k") && l.allow("k"));
        Decision denied = l.tryAcquire("k");
        check("fixed: refuses the next call and says when to retry", !denied.allowed() && denied.retryAfterMillis() == 1000);
        time.advance(1000);
        check("fixed: a new window resets the count", l.allow("k"));
        time.set(1999);
        l.allow("k");
        time.set(2000);
        check("fixed: the boundary allows a burst of twice the limit", l.allow("k") && l.allow("k"));
        check("fixed: remaining counts down", new FixedWindowLimiter(3, 1000, new ManualTime(0), 10).tryAcquire("k").remaining() == 2);
        check("fixed: bad arguments are rejected", throwsIllegalArgument(() -> new FixedWindowLimiter(0, 1000, new ManualTime(0), 10)));
    }

    static void slidingLog() {
        ManualTime time = new ManualTime(0);
        RateLimiter l = new SlidingWindowLogLimiter(2, 1000, time, 10);
        l.allow("k");
        time.set(500);
        l.allow("k");
        time.set(999);
        Decision d = l.tryAcquire("k");
        check("log: refuses when the window is full and reports the wait", !d.allowed() && d.retryAfterMillis() == 1);
        time.set(1000);
        check("log: the oldest call slides out exactly one window later", l.allow("k"));
        check("log: but only one slot is free, since the call at 500 is still inside", !l.allow("k"));
    }

    static void slidingCounter() {
        ManualTime time = new ManualTime(0);
        RateLimiter l = new SlidingWindowCounterLimiter(4, 1000, time, 10);
        for (int i = 0; i < 4; i++) l.allow("k");
        check("counter: refuses the fifth call in a window", !l.allow("k"));
        time.set(1000);
        check("counter: right after the window ends the old window still counts fully", !l.allow("k"));
        time.set(1500);
        check("counter: half a window later half of the old count has faded", l.allow("k") && l.allow("k") && !l.allow("k"));
        time.set(5000);
        check("counter: after a long gap the history is forgotten", l.allow("k") && l.allow("k") && l.allow("k") && l.allow("k"));
    }

    static void tokenBucket() {
        ManualTime time = new ManualTime(0);
        RateLimiter l = new TokenBucketLimiter(3, 2.0, time, 10); // 2 tokens per second
        check("token: a new caller gets a full bucket", l.allow("k") && l.allow("k") && l.allow("k"));
        Decision d = l.tryAcquire("k");
        check("token: an empty bucket refuses and reports the wait", !d.allowed() && d.retryAfterMillis() == 500);
        time.advance(500);
        check("token: tokens arrive with time", l.allow("k") && !l.allow("k"));
        time.advance(1_000_000);
        int allowed = 0;
        for (int i = 0; i < 10; i++) if (l.allow("k")) allowed++;
        check("token: the bucket never holds more than its capacity", allowed == 3);
        check("token: bad arguments are rejected", throwsIllegalArgument(() -> new TokenBucketLimiter(1, 0, new ManualTime(0), 10)));
    }

    static void leakyBucket() {
        ManualTime time = new ManualTime(0);
        RateLimiter l = new LeakyBucketLimiter(2, 1.0, time, 10);
        check("leaky: fills up to its capacity", l.allow("k") && l.allow("k"));
        Decision d = l.tryAcquire("k");
        check("leaky: overflow is refused with the time to drain one unit", !d.allowed() && d.retryAfterMillis() == 1000);
        time.advance(1000);
        check("leaky: one unit drained, so one more call fits", l.allow("k") && !l.allow("k"));
    }

    static void keys() {
        ManualTime time = new ManualTime(0);
        RateLimiter l = new TokenBucketLimiter(1, 1.0, time, 10);
        l.allow("alice");
        check("keys: one caller's use does not affect another", !l.allow("alice") && l.allow("bob"));

        RateLimiter tiny = new FixedWindowLimiter(1, 1000, time, 2);
        tiny.allow("alice");
        tiny.allow("bob");
        tiny.allow("carol");
        check("keys: when too many keys appear the least recently used one is forgotten", tiny.allow("alice"));
    }
}
`,
      },
    ],
    expectedOutput: [
      "evicted b=2",
      "order, newest first: [d, a, c]",
      "LRU stats: hits=1 misses=1 evictions=1 expirations=0 hitRate=0.50",
      "after put z: x=1 y=null z=3",
      "at 1100 ms: null",
      "TTL stats: hits=1 misses=1 evictions=0 expirations=1 hitRate=0.50",
      "size is exactly the capacity: true",
      "every stored value matches its key: true",
      "fixed window, 3 calls at t=1000:   allowed=3 denied=0  <- 6 calls in 100 ms",
      "sliding log, 3 calls at t=1000:    allowed=0 denied=3 (retry after 900 ms)",
      "sliding counter, t=1500:           allowed=2 denied=1 (retry after 500 ms)",
      "token bucket (5, refill 1/s), 7 calls at t=0:  allowed=5 denied=2 (retry after 1000 ms)",
      "token bucket, 8 calls after a long quiet time: allowed=5 denied=3 (retry after 1000 ms)",
      "leaky bucket, 2 calls at t=1500:               allowed=1 denied=1 (retry after 500 ms)",
      "alice, after her state was evicted: allowed=1 denied=0"
],
  },
};
