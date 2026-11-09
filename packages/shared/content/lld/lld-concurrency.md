---
id: lld-concurrency
title: Concurrency in code
area: lld
section: Topics
---

## Overview

LLD problems often end with 'now make it thread-safe'. Know the Java concurrency tools, where races hide in your design, and the classic thread-safe structures.

## What to know

1. Threads vs processes :: Processes are isolated, threads share memory (see Core CS). In LLD, the question is which of your objects are shared between threads (a parking lot's spot map, a cache, a counter) and therefore need protection.

2. Mutex and semaphore :: A mutex (synchronized, ReentrantLock) gives exclusive access to a critical section; ReentrantLock adds tryLock with a timeout, fairness and multiple conditions. A semaphore limits concurrent access to N (Semaphore(10) for 10 connections or 10 parking spots).

3. Producer-consumer with a blocking queue :: Producers put work on a BlockingQueue and consumers take from it; put() blocks when full (backpressure) and take() blocks when empty. ArrayBlockingQueue (bounded) or LinkedBlockingQueue. This is the standard way to hand off work between threads.

4. Thread pools :: Creating a thread per task is expensive and unbounded. An ExecutorService (fixed thread pool) reuses threads and queues tasks; submit() returns a Future. Size pools by workload: about the core count for CPU-bound work, more for I/O-bound. Use CompletableFuture to compose async steps.

5. Deadlock conditions :: Mutual exclusion, hold and wait, no preemption and circular wait (see Core CS). In code, always acquire multiple locks in a global order (by id), keep critical sections small, and never call out to unknown code while holding a lock.

6. Atomic operations :: AtomicInteger and AtomicLong (incrementAndGet, compareAndSet) give lock-free counters; ConcurrentHashMap (computeIfAbsent, merge) gives thread-safe maps without locking the whole map. Check-then-act on a normal map (if (!map.containsKey(k)) map.put(…)) is a race; use putIfAbsent or compute instead.

7. Thread-safe singleton and LRU cache :: Thread-safe lazy singleton: the holder idiom (a static nested class holding the instance, initialized on first access by the class loader) or an enum. Thread-safe LRU cache: a HashMap plus a doubly linked list guarded by one lock, or a LinkedHashMap with accessOrder=true wrapped with a lock; ConcurrentHashMap alone doesn't give you LRU order.

## Recap

- Find the shared mutable state; protect it with one lock, or make it immutable/confined.
- Check-then-act must be atomic (synchronized block, CAS, putIfAbsent).
- BlockingQueue for producer-consumer; ExecutorService for thread pools.
- Deadlock needs 4 conditions; break circular wait with a global lock order.

## Go deeper

### Java concurrency toolbox {point: 0.5}

synchronized: intrinsic lock on an object; simple, reentrant, and also guarantees visibility of changes. ReentrantLock: explicit lock with tryLock (timeouts), fairness option and multiple Conditions; always unlock in finally. ReadWriteLock / StampedLock: many readers or one writer, for read-heavy shared data. volatile: visibility and ordering for a single variable (flags), but no atomic compound actions. Atomic classes (AtomicInteger, AtomicReference, LongAdder): lock-free CAS updates. Concurrent collections: ConcurrentHashMap (atomic compute/merge/putIfAbsent per key), CopyOnWriteArrayList (read-mostly listener lists), BlockingQueue implementations, ConcurrentSkipListMap (sorted, concurrent).

Executors: fixed thread pools for CPU-bound work; bounded queues to avoid unbounded memory; CompletableFuture for composing async tasks; virtual threads (Java 21) make blocking I/O code scale to many concurrent tasks. Coordination: CountDownLatch (wait for N events), CyclicBarrier, Semaphore (limit concurrent access, e.g. 10 parallel API calls).

```
class Counter {
    private final ConcurrentHashMap<String, LongAdder> counts = new ConcurrentHashMap<>();
    void hit(String key) { counts.computeIfAbsent(key, k -> new LongAdder()).increment(); }
    long get(String key) { LongAdder a = counts.get(key); return a == null ? 0 : a.sum(); }
}

Semaphore permits = new Semaphore(10);        // at most 10 concurrent calls
void callApi() throws InterruptedException {
    permits.acquire();
    try { client.call(); } finally { permits.release(); }
}
```

### Thread-safe slot allocation {point: 1}

Two cars arrive at once; both see slot 7 free and both park there. The check (isFree) and the act (occupy) must be one atomic step. Options: synchronized on the floor while choosing and occupying; or a ConcurrentLinkedQueue / BlockingQueue of free slots per type, where poll() atomically hands each slot to exactly one caller.

```
class Floor {
    private final Map<SlotType, BlockingQueue<Slot>> free = new EnumMap<>(SlotType.class);

    Optional<Slot> allocate(SlotType type) {
        Slot s = free.get(type).poll();          // atomic: one caller gets each slot
        return Optional.ofNullable(s);
    }
    void release(Slot s) { free.get(s.type()).offer(s); }
}
```

### Producer-consumer and thread pools {point: 2}

A bounded BlockingQueue gives backpressure for free: put() blocks when full, take() blocks when empty. Executors.newFixedThreadPool(n) for CPU-bound work (n ≈ cores); for I/O-bound work more threads or virtual threads (Java 21). Always bound queues and name threads.

For caches and counters prefer ConcurrentHashMap (compute/merge are atomic per key) and AtomicLong/LongAdder over synchronized blocks. Double-checked locking for a lazy singleton needs a volatile field; the holder-class idiom avoids the subtlety.

```
BlockingQueue<Job> queue = new ArrayBlockingQueue<>(1000);
ExecutorService workers = Executors.newFixedThreadPool(8);
for (int i = 0; i < 8; i++) workers.submit(() -> {
    while (!Thread.currentThread().isInterrupted()) {
        Job j = queue.take();                    // blocks when empty
        j.run();
    }
    return null;
});
queue.put(new Job());                            // blocks when full (backpressure)
```

### Common concurrency bugs to name {point: 4}

Race on check-then-act: if (!map.containsKey(k)) map.put(k, v) by two threads; use putIfAbsent/computeIfAbsent or a lock around both. Lost update on read-modify-write: count = count + 1; use atomics or locks. Visibility: a worker loops on a non-volatile boolean flag and never sees the change. Deadlock: two locks acquired in different orders. Starvation: unfair locks or a priority scheme that never lets low-priority work run. Livelock: threads keep yielding to each other.

Also: holding a lock while doing I/O (slow, invites deadlocks), unbounded thread creation (one thread per request), unbounded queues (memory blow-up), double-checked locking without volatile, and sharing non-thread-safe objects (SimpleDateFormat, HashMap) across threads. Prefer immutability and confinement: immutable objects need no locks, and data owned by a single thread needs none either.

### A thread-safe LRU cache, two ways {point: 6}

Simplest correct version: extend LinkedHashMap with accessOrder = true and override removeEldestEntry, then guard every method with one lock (Collections.synchronizedMap or synchronized methods). Note that get() mutates the order in access-order mode, so even reads need the lock; a read-write lock doesn't help here.

For higher concurrency, shard the cache into N segments by key hash, each an independent LRU with its own lock (eviction becomes approximately LRU overall), or use a library like Caffeine, which uses a concurrent hash map plus buffered, batched recency updates.

In an interview, write the simple locked version first, state its limitation (one lock serializes all access), then describe sharding as the scaling step.

```
class LruCache<K, V> {
    private final int capacity;
    private final LinkedHashMap<K, V> map;
    LruCache(int capacity) {
        this.capacity = capacity;
        this.map = new LinkedHashMap<>(16, 0.75f, true) {          // access order
            protected boolean removeEldestEntry(Map.Entry<K, V> e) { return size() > LruCache.this.capacity; }
        };
    }
    public synchronized V get(K key) { return map.get(key); }      // get reorders → needs the lock
    public synchronized void put(K key, V value) { map.put(key, value); }
}
```

### One lock per unit of contention, and a fixed lock order

The first question about shared state is: what is the smallest thing that must change atomically? In the movie booking project it is one show (all seats of one show), in the library it is a member and a title, in the hotel it is a room type, in the meeting scheduler it is a room schedule and a person schedule. Lock exactly that unit, and operations on other units never wait.

Too coarse a lock, one for the whole application, is correct and slow. Too fine a lock, one per seat, is fast and brings new problems: a booking of three seats needs three locks, and now you need an order. The rule of thumb is to start with the unit the business talks about (a show, an account, a room) and to refine only when a measurement says so.

When an operation needs two locks, deadlock becomes possible: thread A holds lock 1 and waits for lock 2, thread B holds lock 2 and waits for lock 1. The remedy is one global order. Sort by a key (member before title, or the smaller schedule key first), take the locks in that order, release in the reverse order. Put the ordering in one helper so nobody writes it the other way by accident. An operation that needs only one lock cannot take part in a cycle.

Two more rules. Never call out to slow or unknown code while holding a lock: in the movie booking project the payment call happens between two short critical sections, with the hold pinned so it cannot expire meanwhile. And keep every critical section free of I/O, so that its length is a few map lookups.

```
// The one place that knows the order: smaller key first
private <T> T withBoth(Schedule a, Schedule b, Supplier<T> body) {
    Schedule first = a.key.compareTo(b.key) <= 0 ? a : b;
    Schedule second = first == a ? b : a;
    first.lock.lock();
    try {
        second.lock.lock();
        try {
            return body.get();
        } finally {
            second.lock.unlock();
        }
    } finally {
        first.lock.unlock();
    }
}
```

### Atomics and compare-and-set: when a lock is too much

Some shared state is one field and one condition: a courier is free or busy, a counter, a slot that is empty or taken. For that, an atomic variable does the job without a lock. compareAndSet(expected, new) changes the value only if it still equals expected, and tells you whether it did, as one indivisible step. Offering a courier to an order is compareAndSet(AVAILABLE, OFFERED): of any number of threads, exactly one gets true, and the others move on to the next courier.

The usual shapes are these. A state machine on a single field: each legal transition is one compareAndSet from the old state to the new one. A counter: AtomicLong.incrementAndGet, or LongAdder when many threads count the same thing and contention is the problem. A claim: AtomicReference<String> owner with compareAndSet(null, me). A retry loop for updates that depend on the current value: read, compute, compareAndSet, and loop if it failed.

Compare-and-set does not combine. Two atomic variables cannot be changed together atomically, so as soon as an invariant spans two fields (a balance and a daily limit, a hold and a counter), you need a lock, or one object that holds both and is replaced as a whole.

The test for atomic code is a race: start forty threads that do the same compare-and-set and assert that exactly one succeeded. It does not prove the code correct, but it fails fast when the check and the change are separate steps.

```
final class Courier {
    private final AtomicReference<CourierStatus> status = new AtomicReference<>(CourierStatus.AVAILABLE);

    boolean tryOffer() { return status.compareAndSet(CourierStatus.AVAILABLE, CourierStatus.OFFERED); }
    boolean confirm()  { return status.compareAndSet(CourierStatus.OFFERED, CourierStatus.BUSY); }
    boolean release()  {
        return status.compareAndSet(CourierStatus.OFFERED, CourierStatus.AVAILABLE)
            || status.compareAndSet(CourierStatus.BUSY, CourierStatus.AVAILABLE);
    }
}
```

### Thread-safe collections do not make your code thread-safe

A ConcurrentHashMap makes each single operation safe. It does not make a sequence of operations safe, and the most common concurrency bug is exactly that: check then act.

if (!map.containsKey(k)) map.put(k, v) is wrong with a concurrent map, because another thread can put between the two calls. The map offers atomic combined operations for this: putIfAbsent, computeIfAbsent, compute, merge, replace(k, old, new). Use them. The URL shortener's codeByUrl.compute decides inside one call whether a link exists and is still active or needs a new code, so two threads shortening the same address end up with one code.

Reading is the other trap. Iterating a concurrent map while others change it does not throw, but the view is not a snapshot: you may see some changes and not others. When you need a consistent view of several entries, either take a lock for the read, copy under a lock, or use a structure with versions (the key-value store reads at a commit number and gets a consistent view for free).

Know what each collection promises. CopyOnWriteArrayList: a snapshot for every iteration, expensive writes, good for listener lists that are read far more often than they change. ConcurrentLinkedQueue and LinkedBlockingQueue: producer and consumer hand-over. TreeMap and HashMap inside a lock: fine, and often simpler than a concurrent version, because the lock already gives you atomic multi-step operations.

Last, immutable values are safe to share. A record with final fields can be handed to any thread. Most of the design work in a concurrent class is deciding which state is immutable and which is guarded, and writing that next to each field in a comment.

```
// Wrong: two threads can both see "absent" and both put
if (!codes.containsKey(url)) codes.put(url, newCode());

// Right: the decision and the change are one atomic call
String code = codes.computeIfAbsent(url, u -> newCode());

// A counter that many threads update
ConcurrentHashMap<String, LongAdder> clicks = new ConcurrentHashMap<>();
clicks.computeIfAbsent(code, c -> new LongAdder()).increment();
```

### Testing concurrent code

Concurrency bugs are timing bugs, so a test that passes once proves little. Three techniques make tests useful.

First, race a single decision. Start N threads released together that all try the same thing (book the last seat, claim the courier, take the last copy), join them, and assert the number of winners. The projects do this with 30 to 60 threads. It catches check-then-act bugs quickly, because the window is wide when many threads hit it.

Second, check an invariant after a mixed workload. Run several threads doing random operations (book, cancel, move, renew, return) for a few hundred rounds each, with a seeded Random so a failure can be repeated, and assert what must always be true afterwards: the sum of balances is unchanged, no room has two overlapping meetings, the number of copies on loan equals the number of active loans. The invariant is the specification of the design, written as code.

Third, make deadlock a test failure instead of a hang. Join each thread with a timeout and assert that none is still alive. If the lock order is wrong, the test reports it instead of freezing the build.

What not to do: sleep to wait for the other thread, and assert on the order in which threads happen to run. Time-dependent logic should read an injected clock, so that a test moves time by hand and never waits. Keep the thread tests small enough to run in a second, and keep their number of threads and rounds fixed, so the failures are comparable from run to run.

```
// Race one decision: exactly one winner
AtomicInteger winners = new AtomicInteger();
Thread[] threads = new Thread[40];
for (int i = 0; i < threads.length; i++) {
    threads[i] = new Thread(() -> { if (service.book(user(), "r1", range).ok()) winners.incrementAndGet(); });
}
for (Thread t : threads) t.start();
for (Thread t : threads) t.join();
assertEquals(1, winners.get());

// A deadlock shows up as a failed assertion, not a frozen build
for (Thread t : workers) { t.join(30_000); finished &= !t.isAlive(); }
```

## Interview questions

- Make your parking lot's spot allocation thread-safe.
- Implement a bounded blocking queue with wait/notify or locks and conditions.
- Why isn't ConcurrentHashMap enough for an LRU cache?
