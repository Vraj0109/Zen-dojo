import type { LldDeep } from "./types";

// Walkthrough, diagrams and concurrency notes for the LRU cache + rate limiter project in lld-projects-b.ts.
// Rules: no backticks or dollar-brace in the text (it is a template literal), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const LLD_DEEP_B: Record<string, LldDeep> = {
  "lldp-lru-rate-limiter": {
    walkthrough: [
      {
        title: "What to clarify before writing code",
        body: `This question is really two small questions with one idea in common: both keep a little state per key and both must be fast. Start by asking which one the interviewer wants, because the answer changes how you spend the 45 minutes. Often it is "build an LRU cache", and then "now add a rate limiter on top" as the follow-up.

For the cache, ask what the operations are (get, put, maybe remove), what capacity means (number of entries, not bytes), what happens on a miss (return null, or call a loader), and whether it is shared between threads. Ask for the complexity target: the expected answer is O(1) for get and put, and that single sentence rules out scanning a list or sorting by timestamp. Ask whether entries can expire, because a time-to-live changes the design more than it first seems to.

For the rate limiter, ask who is being limited (a user, an API key, an IP address), what the limit looks like (100 calls per minute, or 10 per second with bursts allowed), and what the caller needs back. A bare yes or no is rarely enough: an HTTP service wants to say how many calls remain and how long to wait, so our limiter returns a Decision with allowed, remaining and retryAfterMillis. Finally ask whether this is one process or many servers. A single process can keep counters in memory; many servers need a shared store such as Redis, and that is a different conversation (the concurrency section covers it).

Write the agreed requirements on the board in five lines. Everything below traces back to them.`,
      },
      {
        title: "The LRU cache: why a hash map and a linked list",
        body: `Two requirements pull in opposite directions. Finding a key in O(1) needs a hash map. Knowing which entry was used least recently, and updating that order on every access, needs an ordered structure. A hash map alone has no order. A list alone makes lookup O(n). Combining them gives both: the map points from each key straight to its node in a doubly linked list, and the list holds the nodes in order of use.

LruCache keeps the most recently used node right after a head sentinel and the least recently used node right before a tail sentinel. A get finds the node through the map, unlinks it, and re-inserts it at the front. A put on a new key evicts the node before the tail if the cache is full, then inserts the new node at the front. Each of these is a handful of pointer changes, so the cost does not depend on how many entries there are.

The sentinels are a small trick with a big payoff. Without them every unlink and insert needs an if for "is this the first node?" and "is this the last node?". With a permanent head and tail, every real node always has a neighbour on both sides, and the code has no special cases. Interviewers notice this.

Two decisions are worth saying out loud. The list must be doubly linked, because removing a node from the middle needs its predecessor and a singly linked list would have to search for it. And null values are rejected: if a null value were allowed, get returning null could mean "not cached" or "cached as null", and callers could not tell which. Rejecting null keeps the contract simple. Java's LinkedHashMap with access order does the same job in a few lines, and it is fine to mention that and then write the version by hand, since that is the point of the exercise.`,
      },
      {
        title: "LFU, TTL and the thread-safe wrapper: three variations, three shapes",
        body: `Each follow-up question is answered by a different tool, and naming the tool is most of the answer.

LFU evicts the least frequently used entry instead of the least recently used one. Keeping a count per key and scanning for the minimum would be O(n), so LfuCache groups keys into buckets by count (a map from count to an insertion-ordered set of keys) and remembers the lowest non-empty count in minFreq. A hit moves the key from bucket n to bucket n+1; an eviction takes the oldest key from the lowest bucket. Everything is O(1) again. The detail that trips people up is removal: if you remove the last key in the lowest bucket, minFreq now points at an empty bucket and the next eviction would fail. remove() therefore recomputes minFreq, and a test covers exactly that path. Also mention the weakness: a key that was very popular once keeps its high count for ever, so real systems age the counts.

TTL is a decorator in spirit: TtlCache stores each value with the time it expires and checks that time on every get. It is lazy, with no background thread. An expired entry is treated as missing and removed the moment someone asks for it, and entries nobody asks for are eventually pushed out by LRU eviction, so memory stays bounded. The deadline is inclusive: at exactly the expiry time the entry is gone, which a test pins down.

SynchronizedCache is a classic decorator: it implements Cache, wraps a Cache, and holds one lock around every call. The interesting question is why not a concurrent map. An LRU cache changes its list on every read, because reading moves the entry to the front. Reads are writes, so they cannot safely run in parallel. One lock is the correct simple answer; at high load you shard the cache into several independent LRU caches, each with its own lock, and choose the shard by the key's hash.`,
      },
      {
        title: "Five rate-limiting algorithms and when each fits",
        body: `Every limiter implements one interface, RateLimiter.tryAcquire(key), so the caller does not care which algorithm sits behind it. That is the Strategy pattern, and it is why adding a sixth algorithm touches no existing code.

Fixed window cuts time into equal windows and counts calls in the current one. It is the cheapest (two numbers per key) but has a famous flaw: a caller can use the whole limit at the end of one window and the whole limit again at the start of the next. Main shows this: three calls at t=900 and three more at t=1000 are all allowed, six calls in 100 ms against a limit of three per second.

Sliding window log stores the time of every allowed call and counts those inside the last window. It is exact, with no boundary burst, but it holds up to limit timestamps per key, which is fine for 100 and painful for a million.

Sliding window counter is the compromise. It keeps only the current and previous window counts and estimates the sliding total as previous count times the share of the previous window still in range, plus the current count. Constant memory, and it smooths the boundary burst, at the cost of assuming calls were evenly spread inside the previous window.

Token bucket gives each key a bucket of tokens that refills at a steady rate and costs one token per call. A full bucket allows a burst, then the rate settles to the refill speed. This is the default choice for APIs because bursts are usually harmless and users like them. There is no timer: on each call the code works out how many tokens arrived since the last call.

Leaky bucket, in the meter form used here, adds one unit of water per call and drains at a steady rate; a call that would overflow is refused. The long-run rate matches the token bucket, but think of it as a way to cap the sustained level of load rather than to permit bursts. Its queue form, which releases requests at a fixed drip, is for traffic shaping rather than limiting.`,
      },
      {
        title: "What the two halves share: per-key state and a useful answer",
        body: `The limiters need a map from key to state, and that map can grow without bound: an attacker who sends one request from a million different addresses would create a million entries. The fix is already written. Each limiter keeps its per-key state in an LruCache with a maximum number of keys, so the least recently seen callers are forgotten first and memory has a hard ceiling.

This is a real trade-off and worth saying plainly. A forgotten caller starts again with a fresh allowance, so a determined abuser could try to push their own state out by using many keys. Main demonstrates it: alice is refused her second call, then bob and carol push her state out of a two-key cache, and her next call is allowed. In production the ceiling is set high enough that honest callers are never evicted, and abuse by key flooding is handled by a coarser limit in front, for example per IP before per user.

The second shared idea is the Decision record. A limiter that returns only a boolean forces the caller to guess what to tell the client. With remaining and retryAfterMillis the HTTP layer can fill in the X-RateLimit-Remaining and Retry-After headers directly. Computing the retry hint takes a line of arithmetic per algorithm: the window end for fixed windows, the oldest timestamp plus the window for the log, and the time to refill one token for the bucket. Doing this unprompted is a strong signal: you have thought about what the caller does with the answer.`,
      },
      {
        title: "Time is a dependency: how the tests never sleep",
        body: `Anything that depends on the clock is hard to test if it calls System.currentTimeMillis directly: you either sleep in tests (slow and flaky) or you cannot test the edges. Here every time-aware class takes a TimeSource, a one-method interface. Production code passes System::currentTimeMillis. Tests and Main pass a ManualTime that only moves when told to.

That makes the boundary cases easy to pin down. The tests advance the clock to one millisecond before an entry expires and check it is still valid, then to exactly the deadline and check it is gone. They move the clock to 999 and 1000 to prove the fixed window allows a double burst and the sliding log does not. They advance a million milliseconds and check the token bucket still holds only its capacity, never more. None of this needs a thread to wait.

Notice how small the change is: the clock is passed in through the constructor, a form of dependency injection that needs no framework. The same trick appears in the parking lot and elevator problems in this app, and it is worth stating as a general habit: pass in what varies (time, randomness, the network), and the code underneath becomes deterministic.`,
      },
      {
        title: "Concurrency, and what changes with many servers",
        body: `Inside one process, each limiter method is synchronized, and each cache sits behind either its owner's lock (the limiters) or a SynchronizedCache. The Main demo runs eight threads for ten thousand operations each against a shared cache and then checks two invariants: the size is exactly the capacity, and every stored value still matches its key. That is the shape of a good concurrency test: you cannot assert the exact interleaving, but you can assert what must always be true.

One lock per limiter is simple and correct, but it serialises all callers, including callers with different keys. If that becomes the bottleneck, lock per key (a striped array of locks chosen by key hash) lets unrelated callers proceed in parallel. Say this as the next step, and say that you would measure first.

With several servers behind a load balancer, in-memory counters are no longer enough: each server only sees part of a caller's traffic, so the real limit becomes the limit times the number of servers. The standard answer is a shared store, usually Redis, with the check-and-update done atomically: a small Lua script for the token bucket, or INCR with EXPIRE for a fixed window. The interface does not change, only an implementation of RateLimiter that talks to Redis instead of a map. That is the payoff of coding to an interface, and it is the natural bridge to the rate limiter system design question.`,
      },
      {
        title: "Follow-ups to expect, and the tests that back this design",
        body: `Likely follow-ups, in rough order. Support several limits at once, for example 10 per second and 100 per minute: a composite limiter that asks each in turn. Note the subtlety to mention: if the second limiter refuses after the first already consumed a token, you have spent a token on a refused call, so a careful version checks all limits first and only then commits. Make the cache generic over a loader, so a miss calls a function and stores the result, and ask what happens when ten threads miss the same key at once (a stampede; the answer is to let one thread load and make the others wait on its result). Add a weighted limiter where an expensive call costs several tokens. Add metrics: the cache already counts hits, misses, evictions and expirations, and the hit rate is the number to watch.

The Tests class has 47 checks and each one names the behaviour it protects. For the LRU cache: eviction order, that get and put both refresh, capacity one, removal freeing a slot, the eviction listener, rejected nulls. For LFU: the tie-break, and the removal path that once left minFreq pointing at an empty bucket. For TTL: the inclusive deadline and a put restarting the clock. For the limiters: the exact retry hints, the double burst of the fixed window, the sliding log's refusal at the same moment, the counter's fade, the token bucket's cap after a long idle time, and eviction of idle keys.

If you only have time to write one test in an interview, write the one for the bug you are most afraid of in your own code. For the LRU cache that is the eviction order after a get, because it is the line most often written backwards.`,
      },
    ],
    classDiagram: `classDiagram
    class Cache {
        <<interface>>
        +get(K) V
        +put(K, V) void
        +remove(K) boolean
        +size() int
        +stats() CacheStats
    }
    class LruCache
    class LfuCache
    class TtlCache
    class SynchronizedCache
    class CacheStats
    class EvictionListener {
        <<interface>>
        +onEvict(K, V) void
    }
    class TimeSource {
        <<interface>>
        +nowMillis() long
    }
    class ManualTime
    class RateLimiter {
        <<interface>>
        +tryAcquire(String) Decision
        +allow(String) boolean
    }
    class Decision {
        <<record>>
        boolean allowed
        int remaining
        long retryAfterMillis
    }
    class FixedWindowLimiter
    class SlidingWindowLogLimiter
    class SlidingWindowCounterLimiter
    class TokenBucketLimiter
    class LeakyBucketLimiter
    Cache <|.. LruCache
    Cache <|.. LfuCache
    Cache <|.. TtlCache
    Cache <|.. SynchronizedCache
    SynchronizedCache o-- Cache : wraps
    TtlCache *-- LruCache : stores in
    LruCache --> CacheStats
    LruCache --> EvictionListener
    LfuCache --> EvictionListener
    TtlCache --> TimeSource
    TimeSource <|.. ManualTime
    RateLimiter <|.. FixedWindowLimiter
    RateLimiter <|.. SlidingWindowLogLimiter
    RateLimiter <|.. SlidingWindowCounterLimiter
    RateLimiter <|.. TokenBucketLimiter
    RateLimiter <|.. LeakyBucketLimiter
    RateLimiter ..> Decision : returns
    FixedWindowLimiter --> TimeSource
    TokenBucketLimiter --> TimeSource
    FixedWindowLimiter o-- LruCache : per-key state
    TokenBucketLimiter o-- LruCache : per-key state`,
    sequenceDiagram: `sequenceDiagram
    participant C as Caller
    participant L as TokenBucketLimiter
    participant S as LruCache of State
    participant T as TimeSource
    C->>L: tryAcquire("alice")
    L->>T: nowMillis()
    T-->>L: now
    L->>S: get("alice")
    alt first time we see alice
        S-->>L: null
        L->>S: put("alice", full bucket)
    else known caller
        S-->>L: State
        Note over L: add tokens that arrived since lastRefill, cap at capacity
    end
    alt at least one token
        Note over L: take one token
        L-->>C: Decision allowed, remaining
    else bucket empty
        L-->>C: Decision denied, retryAfterMillis
    end`,
    stateDiagram: undefined,
    extraDiagrams: [
      {
        title: "How the LRU cache keeps O(1)",
        caption: "The map finds the node in one step. The list holds the order, with sentinels at both ends.",
        source: `flowchart LR
    M["HashMap: key to node"] -.-> N2
    H["head sentinel"] <--> N1["node d: newest"]
    N1 <--> N2["node a"]
    N2 <--> N3["node c: oldest"]
    N3 <--> T["tail sentinel"]
    G["get or put hit"] --> U["unlink node, insert after head"]
    P["put when full"] --> E["unlink the node before tail, remove its key from the map"]`,
      },
      {
        title: "Choosing a rate-limiting algorithm",
        caption: "The question to ask is what you want to happen at the edges: bursts, boundaries, memory.",
        source: `flowchart TD
    A{"Should short bursts be allowed?"} -- yes --> B["Token bucket"]
    A -- no --> C{"Is a boundary burst acceptable?"}
    C -- yes --> D["Fixed window: cheapest"]
    C -- no --> E{"Can you afford one timestamp per call?"}
    E -- yes --> F["Sliding window log: exact"]
    E -- no --> G["Sliding window counter: close enough, constant memory"]
    B --> H["Need a steady output rate instead?"]
    H -- yes --> I["Leaky bucket"]`,
      },
      {
        title: "Where the limiter's state lives as you scale",
        caption: "In memory is simplest. With several servers the counters move to a shared store, behind the same interface.",
        source: `flowchart LR
    subgraph One["One process"]
        L1["TokenBucketLimiter"] --> M1["LruCache in memory"]
    end
    subgraph Many["Many servers"]
        S1["Server 1"] --> R["RedisLimiter: atomic script"]
        S2["Server 2"] --> R
        S3["Server 3"] --> R
        R --> K["Shared key-value store"]
    end
    One --> Many`,
      },
    ],
    concurrency: [
      "Each limiter method is synchronized: the check-and-update of a caller's state is one atomic step. Without it two threads could both see one token left and both take it.",
      "LruCache changes its list on every read, so it is not safe to share. SynchronizedCache wraps any Cache and holds one lock per call; shard the cache by key hash if that lock becomes the bottleneck.",
      "The Main demo runs eight threads against one shared cache and checks invariants (size equals capacity, every value matches its key) rather than exact interleavings.",
      "Across several servers, in-memory counters let each server allow the full limit, so the real limit is multiplied. Move the state to a shared store and make the check-and-update atomic there (a Lua script in Redis).",
      "Time comes from an injected TimeSource, so concurrency and time-based behaviour can be tested without sleeping.",
    ],
  },
};
