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

## Interview questions

- Make your parking lot's spot allocation thread-safe.
- Implement a bounded blocking queue with wait/notify or locks and conditions.
- Why isn't ConcurrentHashMap enough for an LRU cache?
