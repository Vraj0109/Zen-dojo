import type { WalkthroughDeep } from "./design-depth-types";

// Depth for system design walkthroughs (plan 0014). Diagrams are Mermaid, code is Java 17 (compiled by design-code.test.ts).

export const DESIGN_DEPTH_A: Record<string, WalkthroughDeep> = {
  "sdd-url-shortener": {
    "architecture": [
      {
        "name": "Shortener API",
        "role": "Accepts a long URL, takes the next id from a local block, scrambles it, encodes it in base62 and inserts the row with a unique constraint.",
        "scale": "About 39 writes a second on average (100 million a month). A few stateless servers are plenty; the id block means one allocator call per 1,000 writes.",
        "failure": "If one server dies, the others carry on and the unused part of its block (up to 999 ids) is wasted, which is nothing against 3.5 trillion codes."
      },
      {
        "name": "Id block allocator",
        "role": "Hands each API server a block of 1,000 consecutive ids in one call, so no network call is needed per URL.",
        "scale": "One row or ZooKeeper counter that is called once per 1,000 writes across the fleet. Easily one small replicated node.",
        "failure": "If it is down, servers keep writing until their block runs out: about 250 seconds at 4 ids a second each. Redirects are not affected. A 10,000-id block stretches that to 40 minutes."
      },
      {
        "name": "URL store",
        "role": "Holds code, long URL, owner, expiry and flags. Every access is by code, so it shards by hash of the code.",
        "scale": "100 million rows a month at about 500 bytes is 6 billion rows and 3 TB over five years. Spread over a few shards with replicas.",
        "failure": "A down shard fails only its own codes, and a replica can be promoted. The unique constraint on the code is the final guard against duplicates."
      },
      {
        "name": "Redis cache",
        "role": "Answers redirects from memory and falls back to the store on a miss. Each entry lives for the smaller of an hour and the time to expiry.",
        "scale": "The hottest 1 percent (1 million links) at about 120 bytes is roughly 120 MB. Expect a hit ratio above 90 percent, cutting 20,000 reads a second at peak to under 2,000.",
        "failure": "If a node dies, misses jump about 10 times and fall on the database. Use a replicated cluster, warm the replacement and coalesce concurrent misses for the same code."
      },
      {
        "name": "Click pipeline (Kafka and aggregator)",
        "role": "The redirect service publishes a click event without waiting, and an aggregator counts clicks per link.",
        "scale": "Around 4,000 events a second on average, 20,000 at peak, each a few dozen bytes. Small for a Kafka topic.",
        "failure": "If Kafka is down, drop or buffer events locally. A few lost counts are acceptable; a slow redirect is not."
      }
    ],
    "criteria": [
      {
        "area": "Requirements and numbers",
        "strong": "Derives about 39 writes a second, 100 to 1 reads, a 20,000 a second peak and 3 TB over five years, then says the load is small and the hard parts are the code and the cache.",
        "weak": "Says billions of URLs with no arithmetic and sizes servers by guess."
      },
      {
        "area": "Code generation",
        "strong": "Compares hash-and-truncate, random, a global counter and block-allocated ids, quotes the birthday collision estimate, and picks block ids with a reversible scramble.",
        "weak": "Proposes a random or hashed code and never mentions collisions or what happens when one occurs."
      },
      {
        "area": "Read path and cache",
        "strong": "Puts a cache in front of a code-keyed store, sizes it (about 120 MB for the hot 1 percent), and uses 302 so clicks and expiry still work.",
        "weak": "Reads the database on every redirect, or uses 301 without noticing that analytics and takedowns stop working."
      },
      {
        "area": "Failure handling",
        "strong": "Walks through cache loss, allocator outage (block lifetime in seconds), a hot shard and a viral link, and says reads take priority over writes.",
        "weak": "Says the system is replicated and stops; cannot say what happens when the id source or the cache is down."
      },
      {
        "area": "Abuse and extras",
        "strong": "Covers custom aliases under the same unique constraint, expiry checked on read plus a sweeper, creation rate limits and a safe-browsing check.",
        "weak": "Treats the shortener as pure throughput and ignores phishing, expiry and alias races."
      }
    ],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  U[Client] --> LB[Load balancer]\n  LB --> API[Shortener API]\n  LB --> RD[Redirect service]\n  API --> IDS[Id block allocator]\n  API --> DB[(URL store: code, long url, expiry)]\n  RD --> C[(Redis cache)]\n  C -. miss .-> DB\n  RD --> K[Click events in Kafka]\n  K --> AN[Analytics aggregator]",
        "caption": "Writes go through an id source and the database. Reads hit the cache first and only fall back to the database."
      },
      {
        "title": "Write path",
        "source": "sequenceDiagram\n  participant U as Client\n  participant A as Shortener API\n  participant I as Id allocator\n  participant D as URL store\n  U->>A: POST long url\n  A->>A: take next id from local block\n  Note over A,I: when the block is empty, ask the allocator for the next 1000 ids\n  A->>A: scramble id, encode in base62\n  A->>D: insert code and long url, fail if the code exists\n  D-->>A: stored\n  A-->>U: short url",
        "caption": "The only shared step is fetching a block of ids, and that happens once per thousand writes per server."
      },
      {
        "title": "Read path",
        "source": "sequenceDiagram\n  participant U as Browser\n  participant R as Redirect service\n  participant C as Redis\n  participant D as URL store\n  U->>R: GET /Ab3xYz9\n  R->>C: GET code\n  alt cache hit\n    C-->>R: long url\n  else cache miss\n    R->>D: SELECT by code\n    D-->>R: long url, expiry\n    R->>C: SET with TTL\n  end\n  R-->>U: 302 Location long url\n  R-)R: publish click event, do not wait",
        "caption": "Most redirects are answered from the cache without touching the database."
      }
    ],
    "sections": [
      {
        "title": "Sizing, with the arithmetic",
        "body": "Start from the requirements, because they set every other choice. 100 million new URLs a month is 100,000,000 / (30 x 86,400) = about 39 writes a second on average. With a read-to-write ratio of 100 to 1, that is about 3,900 redirects a second on average, and a peak of perhaps 5 times the average, about 20,000 a second. Neither number is large: one well-tuned Redis node handles 100,000 operations a second, and a few application servers handle 20,000 redirects. The design is not about raw throughput. It is about three other things: a code that never collides, a cache that absorbs the hot links, and a read path that stays up when parts of the system are down.\n\nStorage: a row holds the code (7 bytes), the long URL (average perhaps 100 bytes, with 2,000 as the practical limit), a user id, two timestamps and some flags. Budgeting 500 bytes per row, 100 million rows a month for five years is 6 billion rows and 3 TB. That fits on a small cluster of ordinary database machines, and since every access is by the code, the data shards cleanly by code.\n\nHow long must the code be? With 62 characters (digits, lower case, upper case), 6 characters give 62^6 = 56.8 billion codes and 7 characters give 62^7 = 3.5 trillion. Six billion URLs over five years fits in 6 characters with room to spare, but 7 leaves a thousandfold margin and makes guessing codes harder. The demo below confirms the figure: it prints 3,521,614,606,208 for the number of 7-character codes.\n\nThe cache size follows from how links are used. Link popularity is very skewed: a small share of links gets most of the clicks. If the hottest 1 percent of 100 million links, one million of them, is cached at about 120 bytes each (code plus URL plus overhead), the cache holds about 120 MB. A single Redis node can hold it, and a cache of a few gigabytes could hold far more than the working set. Expect a hit ratio above 90 percent, which cuts database reads from 20,000 a second at peak to under 2,000."
      },
      {
        "title": "Generating codes: four options compared",
        "body": "The central question is how to produce a short unique code. There are four common answers, and the right one depends on what you want to guarantee.\n\n**Hash the URL and truncate.** Take MD5 or SHA-256 of the long URL, encode it in base62 and keep the first 7 characters. The same URL always gets the same code, which gives deduplication for free, and no coordination between servers is needed. The problem is collisions: two different URLs can share a prefix. By the birthday approximation, with N possible codes and n URLs, the expected number of colliding pairs is about n^2 / (2N). For n = 1 billion and N = 3.5 trillion, that is (10^9)^2 / (7 x 10^12), roughly 143,000 colliding pairs. So the insert must check for an existing code and, on a conflict, retry with a salt appended to the URL. That works, but every write becomes a read-then-write, and the number of retries grows as the table fills.\n\n**A random code, checked.** Generate 7 random base62 characters, insert with a unique constraint, retry on conflict. It is simple and the codes are unguessable, but it has the same collision handling as hashing, without the deduplication benefit.\n\n**A global counter, encoded.** Keep one counter, increment it per URL and encode the number in base62. Collisions are impossible by construction. Ids are small (the first million are at most 4 characters). The weakness is the counter itself: a single database row or ZooKeeper node taking 40 increments a second is fine, but a network call on every write is a dependency on the write path, and sequential codes let anyone enumerate every link by counting.\n\n**A counter handed out in blocks, then scrambled.** This is the design to propose. A small allocator service hands each application server a block of, say, 1,000 consecutive ids in one call. The server hands out ids from memory with no network call and fetches a new block only when it runs out. A crashed server wastes at most the unused part of its block, up to 999 ids, which is nothing against 3.5 trillion. To stop people counting, pass each id through a reversible scramble, for example multiplication by a large odd constant modulo 2^42, which maps distinct inputs to distinct outputs and makes consecutive ids look unrelated. Then encode in base62.\n\nThe demo implements the encoder, the block allocator and the scramble. It shows that 2,500 ids need exactly 3 blocks of 1,000, that three sequential ids produce unrelated-looking codes, and that 100,000 scrambled ids are all distinct (a multiplication by an odd number modulo a power of two is a bijection, so this holds for all inputs, not only the ones tested)."
      },
      {
        "title": "301 or 302, custom aliases and expiry",
        "body": "The redirect status decides who owns the cache. A **301** (permanent) lets browsers and intermediaries cache the redirect forever: later clicks never reach you, which saves load but means you lose click counts, cannot change or expire the target, and cannot take a link down. A **302** (temporary) makes every click pass through your service, so analytics, expiry and abuse takedowns all work. Most shorteners use 302, or 301 with a short `Cache-Control: max-age`, and accept the load because it is small (4,000 requests a second).\n\nA **custom alias** is a user-chosen code. It lives in the same table, and the same unique constraint protects it, so two users asking for `summer-sale` race safely: one insert wins and the other gets a conflict error. Keep the generated codes and the aliases from colliding by giving aliases a different shape (a minimum length of 8, say, or a reserved separator) and by checking reserved words such as `api` and `admin`.\n\n**Expiry** needs two mechanisms. On read, compare `expires_at` with the current time and answer 404 or 410 when it has passed, so correctness never depends on cleanup. In the background, a sweeper deletes expired rows in small batches, using an index on the expiry time, and removes the cache entry. Put the expiry into the cache TTL too: the cache entry lives for the smaller of a default (an hour) and the time left.\n\n**Abuse** matters more than throughput for a public shortener. Attackers use short links to hide phishing pages. Check submitted URLs against a safe-browsing list, rate-limit creation per account and per IP, allow takedown by code, and refuse to redirect to private address ranges (a server-side request forgery risk if you ever fetch the link to generate a preview)."
      },
      {
        "title": "Failure modes and what happens to each",
        "body": "Walk through what breaks, with numbers, because an interviewer wants to hear the system degrade gracefully.\n\n**The cache node dies.** Every redirect becomes a database read. At the 20,000 a second peak that is a 10 times jump over the normal 2,000 misses a second. A read replica set sized for it survives; without that, the database slows and redirects time out. Mitigations: run the cache as a replicated cluster so one node loss only removes a slice, warm the replacement from the database for the hottest codes, and let the redirect service coalesce concurrent misses for the same code into one database read so a viral link does not stampede.\n\n**The allocator is down.** Application servers keep working until their local block is used up. With 10 servers and 40 writes a second in total, each server uses about 4 ids a second, so a 1,000-id block lasts about 250 seconds, over four minutes. A longer outage means writes fail while redirects continue, which is the right priority: reads are 99 percent of the traffic. Raising the block size to 10,000 stretches the window to 40 minutes at the cost of a bigger loss per crash.\n\n**One database shard is hot or down.** Sharding by a hash of the code spreads load evenly. If a shard is down, only the codes on it fail, unless it has a replica to promote. A single viral code is the problem a shard cannot fix, and the cache plus a CDN in front of the redirect handles it: a CDN edge can serve the redirect itself for a few seconds, which flattens a spike to a trickle at the origin.\n\n**A region is down.** Reads are easy to serve from several regions with data replicated asynchronously, since a link created a second ago may not have arrived yet, and the right answer there is a short retry or a fallback read from the home region. Writes need one home region per code range, or an allocator per region that hands out disjoint id ranges.\n\n**The click pipeline backs up.** Click events go to Kafka without the redirect waiting for them, so analytics lag never slows a redirect. If Kafka is unavailable, drop or buffer events locally; losing a few counts is acceptable, a slow redirect is not."
      }
    ],
    "code": [
      {
        "name": "ShortCodes.java",
        "code": "import java.util.concurrent.atomic.AtomicLong;\n\npublic class ShortCodes {\n    static final String ALPHABET = \"0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ\";\n\n    static String encode(long id) {\n        if (id == 0) return \"0\";\n        StringBuilder sb = new StringBuilder();\n        while (id > 0) {\n            sb.append(ALPHABET.charAt((int) (id % 62)));\n            id /= 62;\n        }\n        return sb.reverse().toString();\n    }\n\n    static long decode(String code) {\n        long v = 0;\n        for (char c : code.toCharArray()) v = v * 62 + ALPHABET.indexOf(c);\n        return v;\n    }\n\n    /** Hands out blocks of ids; in production this is one row in a database or a ZooKeeper counter. */\n    static class BlockAllocator {\n        private final AtomicLong next = new AtomicLong(0);\n        long[] nextBlock(int size) {\n            long start = next.getAndAdd(size);\n            return new long[] {start, start + size};\n        }\n    }\n\n    /** One app server: takes a block, then serves ids from memory without any network call. */\n    static class IdSource {\n        private final BlockAllocator allocator;\n        private final int blockSize;\n        private long current, end;\n        int blocksFetched = 0;\n\n        IdSource(BlockAllocator allocator, int blockSize) { this.allocator = allocator; this.blockSize = blockSize; }\n\n        synchronized long next() {\n            if (current == end) {\n                long[] b = allocator.nextBlock(blockSize);\n                current = b[0];\n                end = b[1];\n                blocksFetched++;\n            }\n            return current++;\n        }\n    }\n\n    /** A bijection on 0..2^42-1 so that consecutive ids do not give consecutive codes (multiply by an odd number, mod 2^42). */\n    static final long MASK = (1L << 42) - 1;\n    static final long ODD = 0x2545F4914F6L | 1;\n    static long scramble(long id) { return (id * ODD) & MASK; }\n\n    public static void main(String[] args) {\n        System.out.println(\"encode(0)=\" + encode(0) + \" encode(61)=\" + encode(61) + \" encode(62)=\" + encode(62));\n        System.out.println(\"encode(125)=\" + encode(125) + \" decode back=\" + decode(encode(125)));\n        long max7 = (long) Math.pow(62, 7);\n        System.out.println(\"codes with 7 characters: \" + max7);\n        System.out.println(\"a 42-bit id is at most \" + encode(MASK).length() + \" characters\");\n\n        BlockAllocator allocator = new BlockAllocator();\n        IdSource server = new IdSource(allocator, 1000);\n        long last = -1;\n        for (int i = 0; i < 2500; i++) last = server.next();\n        System.out.println(\"2500 ids needed \" + server.blocksFetched + \" blocks, last id \" + last);\n\n        System.out.println(\"sequential ids 1000,1001,1002 -> \" + encode(scramble(1000)) + \" \" + encode(scramble(1001)) + \" \" + encode(scramble(1002)));\n        java.util.Set<Long> seen = new java.util.HashSet<>();\n        boolean unique = true;\n        for (long i = 0; i < 100_000; i++) unique &= seen.add(scramble(i));\n        System.out.println(\"100000 scrambled ids all distinct: \" + unique);\n    }\n}"
      }
    ]
  },
  "sdd-rate-limiter": {
    "architecture": [
      {
        "name": "Gateway middleware",
        "role": "Sits in front of every request, builds the key (account, then IP as a backstop), calls the limiter and returns 429 with Retry-After when denied.",
        "scale": "1 million requests a second across the fleet, so the check must cost about 1 to 2 ms. Gateways scale by adding instances.",
        "failure": "If the limiter call times out (about 5 ms), fail open for ordinary read APIs and fall back to a small local limit for login and one-time-password endpoints."
      },
      {
        "name": "Local token cache",
        "role": "Takes about 100 tokens at a time from Redis and serves them from memory, so one Redis call covers 100 requests.",
        "scale": "Cuts Redis traffic for a hot key by up to 100 times. The limit is then accurate to within one batch per gateway.",
        "failure": "If a gateway crashes it loses its unused tokens, which only makes the limit slightly stricter. A hot customer at 50,000 requests a second no longer overloads one shard."
      },
      {
        "name": "Redis cluster with Lua script",
        "role": "Holds the token bucket (token count and last refill time) per key and does read, refill, test and decrement in one atomic script, using the Redis clock.",
        "scale": "10 million active keys at about 50 bytes is 500 MB. One node does about 100,000 simple operations a second, so shard by key across 10 or more primaries.",
        "failure": "A failover can lose the last few hundred milliseconds of writes, so a few extra requests slip through. Keys expire after capacity divided by rate, so memory does not grow."
      },
      {
        "name": "Rules and config store",
        "role": "Maps route and plan to limits (for example 100 a minute, burst 50), with per-customer overrides. Gateways cache and reload it.",
        "scale": "Small: thousands of rules, read rarely. Gateways reload every few seconds to a minute.",
        "failure": "If it is unreachable, gateways keep the last cached rules. A bad rule is rolled back by publishing the previous version."
      },
      {
        "name": "Cross-region coordination",
        "role": "Decides how a limit is split over regions: a share per region, one home region, or local counting with periodic totals.",
        "scale": "With 4 regions a 100 a minute limit becomes 25 each, or totals are exchanged about every second.",
        "failure": "During a region partition each region keeps enforcing its own share, so the global limit can be briefly exceeded. Accept this and say so."
      }
    ],
    "criteria": [
      {
        "area": "Requirements and scope",
        "strong": "Asks what the key is, what the rule is, per server or global, and what happens when the limiter fails, then sizes the state (500 MB for 10 million keys).",
        "weak": "Starts with an algorithm and never asks who is being limited or what failure should do."
      },
      {
        "area": "Algorithm choice",
        "strong": "Compares fixed window (boundary burst), sliding log (memory per request), sliding counter and token bucket, and picks token bucket for burst plus average rate with two numbers per key.",
        "weak": "Names one algorithm and cannot say what is wrong with the fixed window at the boundary."
      },
      {
        "area": "Atomicity and distribution",
        "strong": "Does check and update in one Lua script, uses the Redis clock, shards by key and explains local token batching for hot keys.",
        "weak": "Reads the counter, decides, then writes it back, which lets two gateways both allow the last request."
      },
      {
        "area": "Failure behaviour",
        "strong": "Chooses fail open for ordinary reads and fail closed or local limits for login, with a 5 ms timeout and TTLs on keys.",
        "weak": "Says the limiter must always be correct, so an outage of Redis becomes an outage of the product."
      },
      {
        "area": "Client experience",
        "strong": "Returns 429 with Retry-After and rate limit headers, advises backoff with jitter and mentions combined keys against NAT and many-IP attackers.",
        "weak": "Drops requests silently, so well-behaved clients retry at once and make load worse."
      }
    ],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  C[Client] --> GW[API gateway with limiter middleware]\n  GW --> R[(Redis cluster: counters per key)]\n  GW --> CFG[(Rule config store)]\n  GW --> S[Backend services]\n  GW -. 429 and Retry-After .-> C",
        "caption": "The limiter sits in the gateway and keeps counters in Redis. Rules come from a config store."
      },
      {
        "title": "One request",
        "source": "sequenceDiagram\n  participant C as Client\n  participant G as Gateway\n  participant R as Redis\n  C->>G: request with API key\n  G->>G: find the rule for this route and plan\n  G->>R: EVAL token bucket script, key, now, rate, capacity\n  R-->>G: allowed or denied, tokens left, time to refill\n  alt allowed\n    G->>G: forward to the backend\n  else denied\n    G-->>C: 429 with Retry-After\n  end",
        "caption": "The check and the update happen in one atomic Lua script, so two gateways cannot both take the last token."
      },
      {
        "title": "Failure handling",
        "source": "flowchart TD\n  A[Request arrives] --> B[Call Redis with a 5 ms timeout]\n  B --> C{Answer in time?}\n  C -- yes --> D{Allowed?}\n  D -- yes --> F[Forward]\n  D -- no --> G[Reject with 429]\n  C -- no --> H{Route is abuse sensitive?}\n  H -- no --> I[Fail open: forward, count the event]\n  H -- yes --> J[Fail closed: reject or use a small local limit]",
        "caption": "A slow or dead limiter store must never take the product down, so the gateway decides fast and has a rule for what to do on failure."
      }
    ],
    "sections": [
      {
        "title": "Requirements that shape the design",
        "body": "A rate limiter protects a service from too much traffic, from one client or many: a runaway script, a scraper, a paying customer who exceeds their plan, or a denial-of-service attempt. Before choosing an algorithm, ask four questions. What is the key: API key, user, IP address, or a combination? What is the rule: 100 requests a minute, or 10 a second with bursts of 50? Is it per server or global across the whole fleet? And what should happen when the limiter itself fails?\n\nThe numbers decide the storage. At 1 million requests a second across the fleet with 10 million active keys, and about 50 bytes of state per key (a token count, a timestamp, key overhead), Redis holds 10,000,000 x 50 = 500 MB. That is trivial for memory, but 1 million operations a second is more than one Redis node comfortably serves (about 100,000 a second per node for simple commands, fewer with scripts), so counters are sharded across a cluster by key. All requests from one key go to one shard, so the shard has the complete picture for that key, and shards need no communication.\n\nThe cost per request is one Redis round trip, about 0.5 ms inside a zone. That is acceptable as a budget of 1 to 2 ms but it is the main cost, which motivates the local caching tricks below."
      },
      {
        "title": "Algorithms compared, with a runnable version",
        "body": "**Fixed window counter.** Count requests in each calendar window (this minute, 10:31:00 to 10:31:59). It needs one counter per key and window and expires by TTL. The flaw is at the boundary: a client can send 100 requests at 10:31:59 and 100 more at 10:32:00, 200 in two seconds, while never exceeding \"100 a minute\" in any single window.\n\n**Sliding window log.** Keep a timestamp for each request and count those in the last 60 seconds. It is exact, but memory is one entry per request, so a client allowed 10,000 a minute costs 10,000 entries. It suits low limits only.\n\n**Sliding window counter.** Keep the counts of the current and previous fixed windows, and estimate the sliding count as current + previous x (share of the previous window still inside the sliding window). It uses two numbers per key and removes most of the boundary burst. The error is small, and the method assumes requests were evenly spread within the previous window.\n\n**Token bucket.** A bucket holds up to `capacity` tokens and refills at `rate` tokens a second. Each request takes one token; with none left, the request is denied. It allows bursts up to the capacity and enforces the average rate over time, which is what most APIs want. State is two numbers per key: the token count and the time of the last refill. The count is computed lazily at request time (tokens = min(capacity, tokens + elapsed x rate)), so no background refill job is needed.\n\n**Leaky bucket.** Requests enter a queue that drains at a fixed rate, which smooths traffic to a constant output. It suits protecting a backend that cannot take bursts, but it adds queueing delay, so it is less common at an API gateway.\n\nThe demo uses an injected clock so that the output is repeatable. With capacity 5 and a refill of 1 per second, 10 instant requests allow 5 (the burst) and deny 5. After 3 simulated seconds, 3 tokens have come back and 10 more requests allow 3. A different key has its own bucket. For the sliding window counter with a limit of 10 per second, 10 requests at 900 ms are allowed, and 10 more at 1,100 ms allow only 1: the previous window still counts for 80 percent of its weight, so the estimate is already 8 plus a bit. Later, at 2,500 ms, one request from the previous window still counts for half a window, so 9 of 10 are allowed."
      },
      {
        "title": "Atomicity, distribution and headers",
        "body": "A limiter that reads a counter, decides, and then writes it back has a race: two gateways read \"1 token left\", both allow, and the second request exceeds the limit. Do the check and update in one atomic step. In Redis this is a Lua script, which runs without interruption, containing the token bucket logic: read the two numbers, refill, test, decrement, write, and return the verdict plus the time until the next token. For fixed windows, `INCR` followed by `EXPIRE` (set only when the counter is 1) is atomic enough, and a pipelined script covers the rest.\n\nAcross regions there are three choices. Give each region a share of the limit (100 a minute over 4 regions is 25 each), which is fast and local but wastes capacity when traffic is uneven. Keep the counters in one home region and accept the added latency for far regions. Or let regions count locally and exchange totals every second or so, which allows brief overshoot but no cross-region call on the request path. Most public APIs accept a little overshoot in exchange for speed.\n\nA **hot key** (one customer sending 50,000 requests a second) can overload a single Redis shard. A local token cache in each gateway helps: the gateway takes 100 tokens at a time from Redis and serves them from memory, so one Redis call covers 100 requests. The limit is then enforced to within one batch per gateway, which is close enough for most rules.\n\nTell the client what happened. A denial returns 429 Too Many Requests with `Retry-After` giving the seconds to wait, and responses to allowed requests can carry `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` so well-behaved clients slow down before being cut off. Rules should come from a config store that gateways cache and reload, keyed by route and plan, with per-customer overrides."
      },
      {
        "title": "Failure modes",
        "body": "**Redis is slow or down.** The limiter is on the path of every request, so its failure must not become the product's failure. Set a tight timeout (for example 5 ms), and decide the failure behaviour per rule. For ordinary read APIs, fail open: let the request through and count the event, since a brief lack of limiting is less harmful than an outage. For abuse-sensitive endpoints such as login, password reset and one-time passwords, fail closed or fall back to a small local in-memory limit per gateway, because an attacker who can take down the limiter must not get unlimited attempts.\n\n**A shard fails over.** A Redis replica promoted after a primary failure may lack the last few hundred milliseconds of writes, so counters briefly reset to slightly lower usage. Clients get a few extra requests, which is harmless for limits meant to bound average rates.\n\n**Clock differences.** If every gateway passes its own clock to the script, skew between gateways corrupts the refill arithmetic. Use the Redis server's clock inside the script, so there is one time source.\n\n**Memory growth.** Millions of keys never cleaned up fill Redis. Give every key a TTL equal to the time it would take to fully refill (capacity divided by rate); after that the key holds no information, so deleting it is safe.\n\n**Unfairness and bypass.** Keying by IP penalises users behind a shared NAT and is bypassed by attackers with many addresses, so combine keys (account first, IP as a backstop) and add global limits on top of per-key ones. Retries from clients that were denied can amplify load, so tell clients to back off with jitter."
      }
    ],
    "code": [
      {
        "name": "RateLimiters.java",
        "code": "import java.util.HashMap;\nimport java.util.Map;\n\npublic class RateLimiters {\n    interface Clock { long nowMillis(); }\n\n    static class FakeClock implements Clock {\n        long t;\n        public long nowMillis() { return t; }\n    }\n\n    /** Token bucket: capacity tokens, refilled at ratePerSec. State per key is two numbers. */\n    static class TokenBucket {\n        private final double capacity, ratePerSec;\n        private final Clock clock;\n        private final Map<String, double[]> state = new HashMap<>(); // key -> {tokens, lastRefillMillis}\n\n        TokenBucket(double capacity, double ratePerSec, Clock clock) {\n            this.capacity = capacity; this.ratePerSec = ratePerSec; this.clock = clock;\n        }\n\n        synchronized boolean allow(String key) {\n            long now = clock.nowMillis();\n            double[] s = state.computeIfAbsent(key, k -> new double[] {capacity, now});\n            double elapsedSec = (now - s[1]) / 1000.0;\n            s[0] = Math.min(capacity, s[0] + elapsedSec * ratePerSec);\n            s[1] = now;\n            if (s[0] >= 1) { s[0] -= 1; return true; }\n            return false;\n        }\n    }\n\n    /** Sliding window counter: weights the previous fixed window by how much of it still overlaps. */\n    static class SlidingWindowCounter {\n        private final int limit;\n        private final long windowMs;\n        private final Clock clock;\n        private final Map<String, long[]> state = new HashMap<>(); // key -> {windowStart, currentCount, previousCount}\n\n        SlidingWindowCounter(int limit, long windowMs, Clock clock) { this.limit = limit; this.windowMs = windowMs; this.clock = clock; }\n\n        synchronized boolean allow(String key) {\n            long now = clock.nowMillis();\n            long start = now - (now % windowMs);\n            long[] s = state.computeIfAbsent(key, k -> new long[] {start, 0, 0});\n            if (start != s[0]) {\n                s[2] = (start - s[0] == windowMs) ? s[1] : 0; // previous window only counts if it is the adjacent one\n                s[1] = 0;\n                s[0] = start;\n            }\n            double overlap = 1.0 - (double) (now - start) / windowMs;\n            double estimate = s[1] + s[2] * overlap;\n            if (estimate + 1 > limit) return false;\n            s[1]++;\n            return true;\n        }\n    }\n\n    public static void main(String[] args) {\n        FakeClock clock = new FakeClock();\n        TokenBucket bucket = new TokenBucket(5, 1, clock); // burst of 5, then 1 per second\n        int allowed = 0;\n        for (int i = 0; i < 10; i++) if (bucket.allow(\"alice\")) allowed++;\n        System.out.println(\"token bucket, 10 instant requests: allowed \" + allowed);\n        clock.t += 3000;\n        allowed = 0;\n        for (int i = 0; i < 10; i++) if (bucket.allow(\"alice\")) allowed++;\n        System.out.println(\"after 3 seconds, 10 more: allowed \" + allowed);\n        System.out.println(\"another key is independent: \" + bucket.allow(\"bob\"));\n\n        FakeClock c2 = new FakeClock();\n        SlidingWindowCounter win = new SlidingWindowCounter(10, 1000, c2);\n        int a1 = 0;\n        c2.t = 900;                                  // end of window 0\n        for (int i = 0; i < 10; i++) if (win.allow(\"k\")) a1++;\n        c2.t = 1100;                                 // start of window 1: previous window still counts 80%\n        int a2 = 0;\n        for (int i = 0; i < 10; i++) if (win.allow(\"k\")) a2++;\n        System.out.println(\"sliding window, 10 at t=900ms: \" + a1 + \", then 10 at t=1100ms: \" + a2);\n        c2.t = 2500;\n        int a3 = 0;\n        for (int i = 0; i < 10; i++) if (win.allow(\"k\")) a3++;\n        System.out.println(\"at t=2500ms (old windows expired): \" + a3);\n    }\n}"
      }
    ]
  },
  "sdd-kv-store": {
    "architecture": [
      {
        "name": "Coordinator (any node)",
        "role": "Receives a get or put, finds the replica set on the ring, sends the request to those replicas and waits for R or W answers.",
        "scale": "With 10,000 operations a second over 60 nodes, that is about 170 a second per node. Every node can coordinate, so there is no front-door bottleneck.",
        "failure": "If the coordinator fails, the client retries another node. A coordinator that cannot reach W replicas returns an error, or stores a hint for a down replica."
      },
      {
        "name": "Consistent hash ring with virtual nodes",
        "role": "Maps keys to nodes. Each machine sits on the ring at 128 to 256 points, so load is even and a failed node's load spreads over all the others.",
        "scale": "Adding a fifth node to four moves about a fifth of the keys, against 80 percent for hash mod N. Replicas are the next 3 distinct nodes clockwise, spread across racks or zones.",
        "failure": "A stale ring view sends a request to the wrong node, which forwards it. Gossip each second spreads membership in a logarithmic number of rounds."
      },
      {
        "name": "Gossip and failure detector",
        "role": "Each node swaps membership and health with a few random peers every second and marks a peer down after a phi-accrual threshold.",
        "scale": "The cost per node stays about constant as the cluster grows past 60 nodes. There is no central directory.",
        "failure": "A slow network can cause false suspicion. A node wrongly marked down just receives hints and catches up, so the cost is small."
      },
      {
        "name": "Local storage engine",
        "role": "Appends writes to a commit log and a memtable, flushes immutable SSTables and compacts them in the background. Bloom filters skip files that cannot hold the key.",
        "scale": "About 5 TB usable per node: 100 TB of data times 3 replicas is 300 TB over 60 nodes. Disk size and recovery time, not operations a second, are the limits.",
        "failure": "A crash loses only memory and the log replays. A compaction backlog slows reads because more files must be checked, so throttle compaction and alert on pending count."
      },
      {
        "name": "Repair: read repair, hinted handoff, Merkle trees",
        "role": "Fix replicas that disagree: read repair on a read, hints for a replica that was down, and Merkle tree comparison for keys nobody reads.",
        "scale": "Replacing a lost 5 TB node over a 10 Gbit/s link takes about 4,000 seconds, over an hour, during which redundancy is reduced.",
        "failure": "Repair traffic competes with foreground traffic, so throttle it. Without repair, a replica that missed a delete can bring a deleted key back after the tombstone is dropped."
      }
    ],
    "criteria": [
      {
        "area": "Consistency choice",
        "strong": "States the Dynamo-style choice (available, eventually consistent), explains N, R and W, and that R + W greater than N guarantees overlap with the latest acknowledged write.",
        "weak": "Says strongly consistent and highly available with no mention of partitions or quorums."
      },
      {
        "area": "Partitioning",
        "strong": "Rejects hash mod N (about 80 percent of keys move), uses a ring with virtual nodes and picks replicas as distinct nodes spread across racks.",
        "weak": "Shards by hash mod N and does not know what happens when a node is added."
      },
      {
        "area": "Conflicts and repair",
        "strong": "Compares last write wins with vector clocks and covers read repair, hinted handoff, anti-entropy and tombstones for deletes.",
        "weak": "Assumes replicas always agree and deletes a key by removing it from one node."
      },
      {
        "area": "Failure modes",
        "strong": "Works through a node loss (reduced redundancy for about an hour), a partition with W = 1 against quorum, a hot key and large values.",
        "weak": "Mentions replication and moves on; cannot say what a partition does to writes."
      },
      {
        "area": "Sizing",
        "strong": "Computes 300 TB raw, 60 nodes, 170 operations a second per node and recovery time, and says capacity and recovery are the constraints.",
        "weak": "Sizes only by operations a second and ends up with far too few nodes."
      }
    ],
    "diagrams": [
      {
        "title": "Architecture",
        "source": "flowchart LR\n  C[Client] --> N1[Node 1: coordinator for this request]\n  N1 --> N2[Node 2: replica]\n  N1 --> N3[Node 3: replica]\n  N1 --> N4[Node 4: replica]\n  N2 --- G[Gossip: membership and failure detection]\n  N3 --- G\n  N4 --- G",
        "caption": "Any node can coordinate a request. Keys map to nodes on a hash ring and are copied to the next nodes along the ring."
      },
      {
        "title": "Write path on one node",
        "source": "sequenceDiagram\n  participant C as Coordinator\n  participant L as Commit log\n  participant M as Memtable\n  participant S as SSTables on disk\n  C->>L: append the write, fsync\n  C->>M: put key and value\n  C-->>C: acknowledge to the client\n  Note over M,S: when the memtable is full, flush it as a new sorted file\n  M->>S: write SSTable\n  S->>S: background compaction merges files and drops old versions",
        "caption": "A write is durable once it is in the commit log. The memtable and SSTables are an in-memory and on-disk index of what the log holds."
      },
      {
        "title": "Quorum read",
        "source": "sequenceDiagram\n  participant C as Coordinator\n  participant A as Replica A\n  participant B as Replica B\n  participant D as Replica C\n  C->>A: read key\n  C->>B: read key\n  C->>D: read key\n  A-->>C: value v2, timestamp 20\n  B-->>C: value v1, timestamp 10\n  Note over C: R = 2 answers received, pick the newest, v2\n  C-->>C: return v2 to the client\n  C->>B: repair in the background: write v2",
        "caption": "With N replicas, R reads and W writes, choosing R + W greater than N makes every read overlap the latest successful write."
      }
    ],
    "sections": [
      {
        "title": "What is being built",
        "body": "A key-value store has a tiny interface (`get(key)`, `put(key, value)`, `delete(key)`) and a long list of hard requirements: it must hold more data than one machine, survive machine failures, answer in a few milliseconds, and keep working when the network splits. The design in the Dynamo family (Amazon Dynamo, Cassandra, Riak) chooses availability and low latency: any node can take any request, data is copied to several nodes, and the system repairs differences between copies later. The alternative, a leader-based store with consensus per partition (etcd, Spanner, CockroachDB), chooses strong consistency and pays for it in latency and in availability during partitions. State the choice early, because every later detail follows from it.\n\nSizing: suppose 100 TB of data, replication factor 3 and 10,000 operations a second at 10 percent writes. 100 TB x 3 = 300 TB of raw storage. With 5 TB usable per node, that is 60 nodes. The operations are modest per node (170 a second); the real constraints are disk capacity and recovery time. Re-copying a failed 5 TB node over a 10 Gbit/s link takes about 5 x 10^12 x 8 / 10^10 = 4,000 seconds, over an hour, so the cluster must tolerate failures for that long, which is why replication is 3 and not 2."
      },
      {
        "title": "Partitioning with a consistent hashing ring",
        "body": "Spreading keys over nodes with `hash(key) mod N` fails when N changes: adding a fifth node to four moves about 80 percent of the keys, because almost every key's remainder changes. The demo measures it and prints 80. **Consistent hashing** fixes this. Place both nodes and keys on a ring of hash values, and give each key to the first node clockwise from its position. Adding a node takes over only the keys between it and its predecessor, about 1/N of the total: the demo prints that adding a fifth node moves about a fifth of the keys.\n\nA plain ring with one point per node is uneven: by chance one node may own a much larger arc. The fix is **virtual nodes**: each physical node is placed on the ring at many points (100 in the demo, commonly 128 to 256 in practice). The arcs average out, so each of four nodes owns roughly a quarter of the keys, and when a node fails its load spreads over all the others rather than landing on one neighbour. Virtual nodes also let you give a bigger machine more points.\n\n**Replication** uses the same ring. The replica set for a key is the first N distinct physical nodes clockwise from its position (skipping virtual nodes of a node already chosen), and a good deployment also spreads replicas across racks or availability zones. The first node is the key's home, the **coordinator** for a client that hits the right node directly, but any node can accept the request and forward it. The demo's final line shows that a key's replica set with N = 3 holds 3 distinct nodes.\n\nEach node needs the ring to route requests. Nodes learn about each other by **gossip**: every second, each node exchanges its view of membership and health with a few random peers, and the state spreads through the cluster in a logarithmic number of rounds. No central directory is a single point of failure."
      },
      {
        "title": "Writes, reads and consistency",
        "body": "Each key lives on N replicas, and you choose how many must answer. A write waits for **W** acknowledgements and a read for **R** answers. If **R + W > N**, any read set overlaps any acknowledged write set in at least one node, so a read sees the latest acknowledged write. With N = 3, W = 2 and R = 2, one replica can be down without hurting either operation. W = 1 gives the fastest and weakest writes, and W = N gives the strongest durability at the cost of failing when any replica is down.\n\nReplicas can disagree, so versions must be comparable. The simple option is **last write wins** with timestamps: easy, but a skewed clock silently drops a newer write. The careful option is **vector clocks** (a counter per node attached to each value), which detect that two writes were concurrent and keep both as siblings for the application to merge, which is what the original Dynamo shopping cart did. In the read diagram, the coordinator picks the newest value and repairs the stale replica in the background (**read repair**). Two other repair mechanisms cover keys nobody reads: **hinted handoff** (a node that cannot reach a replica stores the write temporarily and delivers it when the replica returns), and **anti-entropy** with Merkle trees (replicas periodically compare hash trees of their key ranges and copy only the ranges that differ).\n\nOn one node the write path is a log-structured design. The write is appended to a commit log and fsynced, which makes it durable, and then stored in an in-memory sorted structure (the memtable). When the memtable fills up, it is flushed as an immutable sorted file (an SSTable); reads check the memtable, then the newest files first, using Bloom filters to skip files that cannot contain the key. A background **compaction** merges files, drops overwritten versions and removes deleted keys once a **tombstone** (a deletion marker) has been kept long enough to reach every replica. Deletions need tombstones, because simply removing a key from one replica would let an older copy on another replica bring it back."
      },
      {
        "title": "Failure modes",
        "body": "**One node fails.** With N = 3 and quorum reads and writes, requests continue. The coordinator marks the node down after a failure detector (a gossip heartbeat with a phi-accrual threshold) times out, and hinted handoff queues the writes meant for it. When it returns, it catches up from hints, and anti-entropy fixes whatever hints missed. If it is lost for good, a replacement streams its token ranges from the other replicas, taking about an hour at the 5 TB scale computed earlier, and during that hour the cluster runs with reduced redundancy.\n\n**A network partition splits the cluster.** In the Dynamo style, both sides keep accepting writes if they can reach enough replicas for the chosen W (with W = 1, even a minority side can write). That is availability, and the cost is conflicts to merge afterwards. With strict quorums (W = R = 2 of 3), the minority side cannot form a quorum and returns errors, which is consistency at the cost of availability. This is the CAP trade-off in a concrete form: the choice of W and R is the dial.\n\n**A hot key.** One celebrity's key receives 100,000 reads a second, far more than its 3 replicas can serve. Spreading the load needs more copies of that key (read replicas with a short TTL cache in front), or splitting the key into several (the key plus a random suffix) when it is a counter.\n\n**Large values and slow nodes.** A value of 100 MB blocks the node's disk and network and makes quorum latency depend on the slowest replica. Cap the value size (typical limits are 1 MB or less), store large blobs in object storage and keep only a pointer in the store, and issue reads to extra replicas after a short delay (speculative retry) so one slow disk does not set the tail latency.\n\n**Compaction and repair storms.** Background work competes with foreground traffic. Throttle compaction and repair streams, and watch the pending-compaction count, since a backlog makes reads slower (more files to check) and can end in a node that cannot keep up."
      }
    ],
    "code": [
      {
        "name": "HashRing.java",
        "code": "import java.nio.charset.StandardCharsets;\nimport java.security.MessageDigest;\nimport java.util.*;\n\npublic class HashRing {\n    private final TreeMap<Long, String> ring = new TreeMap<>();\n    private final int vnodes;\n\n    HashRing(int vnodes) { this.vnodes = vnodes; }\n\n    static long hash(String s) {\n        try {\n            byte[] d = MessageDigest.getInstance(\"MD5\").digest(s.getBytes(StandardCharsets.UTF_8));\n            long h = 0;\n            for (int i = 0; i < 8; i++) h = (h << 8) | (d[i] & 0xFF);\n            return h;\n        } catch (Exception e) {\n            throw new IllegalStateException(e);\n        }\n    }\n\n    void addNode(String node) { for (int i = 0; i < vnodes; i++) ring.put(hash(node + \"#\" + i), node); }\n\n    void removeNode(String node) { for (int i = 0; i < vnodes; i++) ring.remove(hash(node + \"#\" + i)); }\n\n    /** The first n distinct physical nodes clockwise from the key's position: the replica set. */\n    List<String> replicas(String key, int n) {\n        List<String> out = new ArrayList<>();\n        Long start = ring.ceilingKey(hash(key));\n        Iterator<String> it = ring.tailMap(start == null ? Long.MIN_VALUE : start).values().iterator();\n        while (out.size() < n) {\n            if (!it.hasNext()) it = ring.values().iterator();\n            String node = it.next();\n            if (!out.contains(node)) out.add(node);\n            if (out.size() == new HashSet<>(ring.values()).size()) break;\n        }\n        return out;\n    }\n\n    public static void main(String[] args) {\n        HashRing ring = new HashRing(100);\n        for (String n : List.of(\"A\", \"B\", \"C\", \"D\")) ring.addNode(n);\n\n        Map<String, Integer> load = new TreeMap<>();\n        Map<String, String> before = new HashMap<>();\n        int keys = 20_000;\n        for (int i = 0; i < keys; i++) {\n            String owner = ring.replicas(\"key\" + i, 1).get(0);\n            before.put(\"key\" + i, owner);\n            load.merge(owner, 1, Integer::sum);\n        }\n        for (var e : load.entrySet()) {\n            double pct = 100.0 * e.getValue() / keys;\n            System.out.println(\"node \" + e.getKey() + \" owns \" + (pct > 15 && pct < 35 ? \"roughly a quarter\" : \"an unbalanced share\"));\n        }\n\n        ring.addNode(\"E\");\n        int moved = 0;\n        for (int i = 0; i < keys; i++) if (!ring.replicas(\"key\" + i, 1).get(0).equals(before.get(\"key\" + i))) moved++;\n        double movedPct = 100.0 * moved / keys;\n        System.out.println(\"adding a 5th node moved \" + (movedPct > 10 && movedPct < 30 ? \"about 1/5 of the keys\" : \"an unexpected share\"));\n        System.out.println(\"replica set for key42 (3 copies): \" + ring.replicas(\"key42\", 3).size() + \" distinct nodes\");\n        System.out.println(\"modulo hashing would have moved: \" + modMoved(keys, 4, 5) + \"% of keys\");\n    }\n\n    static int modMoved(int keys, int from, int to) {\n        int moved = 0;\n        for (int i = 0; i < keys; i++) {\n            long h = Math.abs(hash(\"key\" + i) % Long.MAX_VALUE);\n            if (h % from != h % to) moved++;\n        }\n        return 100 * moved / keys;\n    }\n}"
      }
    ]
  },
  "sdd-notifications": {
    "architecture": [
      {
        "name": "Notification API",
        "role": "Validates a request, checks preferences, inserts it in the delivery log with the producer's idempotency key and enqueues it. Returns accepted without waiting for any provider.",
        "scale": "About 580 messages a second on average and 16,700 a second at the peak of a 10 million user campaign. Stateless, scaled by instances.",
        "failure": "If the delivery log is down, reject and let producers retry. Accepting without logging would lose deduplication."
      },
      {
        "name": "Queues per channel and priority",
        "role": "Separate queues for push, email and SMS, each with a high priority queue for transactional and a low one for bulk, plus a dead-letter queue.",
        "scale": "Workers read high priority first or in an 8 to 2 ratio. Bulk campaigns are paced at about 2,000 a second instead of putting 10 million messages on at once.",
        "failure": "A queue holds messages until acknowledged, so a worker crash only delays delivery. A maximum receive count sends poison messages to the dead-letter queue."
      },
      {
        "name": "Channel workers",
        "role": "Call APNs, FCM, an email service or an SMS aggregator, classify errors as transient (retry) or permanent (stop and mark the token invalid), and update the log.",
        "scale": "Scaled per channel on queue age. A crash between the provider call and the ack can send twice, so keep the window small and the content safe to repeat.",
        "failure": "Backoff with jitter (1 s, 2 s, 4 s) avoids a synchronised retry wave. A circuit breaker per provider stops hammering a failing service, and an OTP is dropped after about 5 minutes."
      },
      {
        "name": "Delivery log",
        "role": "Source of truth for every message: state (queued, sent, failed), idempotency key, channel and timestamps. Drives deduplication and audit.",
        "scale": "About 300 bytes a record and 50 million a day is 15 GB a day, 5.5 TB a year, partitioned by date and user. Status updates are single-row upserts.",
        "failure": "It is on the path of every message, so it needs replicas and quick failover. Old partitions are archived."
      },
      {
        "name": "Preferences, templates and provider feedback",
        "role": "Holds opt-outs, quiet hours and per-user limits, renders localized templates from an id and parameters, and processes bounces and invalid tokens.",
        "scale": "Read on every send, so cache it. Per-user limits stop a producer bug from sending one user 500 messages.",
        "failure": "Suppress bounced and invalid addresses to protect sender reputation: a complaint rate above about 0.1 percent risks the sending domain being throttled."
      }
    ],
    "criteria": [
      {
        "area": "Traffic separation",
        "strong": "Splits transactional from bulk traffic, gives each its own queue and paces campaigns, using numbers (580 a second average, 16,700 a second campaign peak).",
        "weak": "Puts everything on one queue, so a campaign delays one-time passwords."
      },
      {
        "area": "Delivery guarantees",
        "strong": "Says exactly-once is not available, chooses at-least-once plus an idempotency key and a log check, and covers the crash window after the provider accepts.",
        "weak": "Claims exactly-once delivery with no mechanism."
      },
      {
        "area": "Retries and errors",
        "strong": "Separates transient from permanent errors, uses backoff with jitter, a retry limit or expiry and a dead-letter queue.",
        "weak": "Retries forever or immediately, and keeps sending to dead device tokens."
      },
      {
        "area": "Provider dependence",
        "strong": "Uses a circuit breaker per provider, a secondary provider for critical channels and expiry for time-sensitive messages.",
        "weak": "Treats the provider as always up and lets queues grow without a bound or alert."
      },
      {
        "area": "User control and compliance",
        "strong": "Checks opt-outs, quiet hours and per-user rate limits before queueing and mentions SPF, DKIM, DMARC and complaint handling.",
        "weak": "Ignores preferences and legal opt-out rules for email and SMS."
      }
    ],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  P[Producers: orders, marketing, alerts] --> API[Notification API]\n  API --> PR[Preferences and dedupe check]\n  PR --> T[Template service]\n  T --> Q1[Queue: push]\n  T --> Q2[Queue: email]\n  T --> Q3[Queue: sms]\n  Q1 --> W1[Push workers] --> V1[APNs and FCM]\n  Q2 --> W2[Email workers] --> V2[Email provider]\n  Q3 --> W3[SMS workers] --> V3[SMS provider]\n  W1 --> L[(Delivery log)]\n  W2 --> L\n  W3 --> L",
        "caption": "Producers publish an event. Each channel has its own queue, workers and provider, so a slow channel cannot block the others."
      },
      {
        "title": "Send path",
        "source": "sequenceDiagram\n  participant P as Producer\n  participant A as Notification API\n  participant Q as Queue\n  participant W as Worker\n  participant V as Provider\n  participant L as Delivery log\n  P->>A: send(user, type, idempotency key)\n  A->>L: insert request, ignore if the key exists\n  A->>Q: enqueue message\n  A-->>P: accepted\n  Q->>W: deliver message\n  W->>V: send to provider\n  alt provider error\n    V-->>W: failure\n    W->>Q: retry later with backoff\n  else success\n    V-->>W: accepted\n    W->>L: mark sent\n  end",
        "caption": "The API accepts and records the request quickly. Delivery, retries and provider calls happen asynchronously, with the delivery log as the source of truth."
      },
      {
        "title": "Message states",
        "source": "stateDiagram-v2\n  [*] --> Accepted\n  Accepted --> Suppressed: user opted out or quiet hours\n  Accepted --> Queued\n  Queued --> Sending\n  Sending --> Sent: provider accepted\n  Sending --> Queued: transient error, retry with backoff\n  Sending --> Failed: retries exhausted or permanent error\n  Sent --> Delivered: provider callback\n  Sent --> Bounced: provider callback\n  Suppressed --> [*]\n  Delivered --> [*]\n  Bounced --> [*]\n  Failed --> [*]",
        "caption": "A message moves through a small set of states. Final states are never revisited, which is what makes retries safe."
      }
    ],
    "sections": [
      {
        "title": "Requirements and numbers",
        "body": "A notification service sends messages to users over several channels: mobile push, email, SMS and sometimes in-app messages. It has two very different kinds of traffic. **Transactional** messages (a payment receipt, a one-time password, a shipment update) are triggered by one user's action, must be fast and must not be lost. **Bulk** messages (a marketing campaign, a daily digest) go to millions of users at once and can take minutes or hours. They must not share a queue, or a campaign will delay every one-time password.\n\nEstimates: 10 million users, with 5 notifications per user per day, is 50 million messages a day, about 580 a second on average. Campaigns create peaks: sending to all 10 million users within 10 minutes is 10,000,000 / 600 = 16,700 messages a second. Storage for a delivery log at 300 bytes a record and 50 million a day is 15 GB a day, or about 5.5 TB a year, so the log is partitioned by date and old partitions are archived.\n\nCore requirements: at-least-once delivery with deduplication, per-user preferences and opt-outs (legally required for email and SMS), rate limits per user and per provider, retries with backoff, and a clear record of what happened to each message."
      },
      {
        "title": "Queues per channel and priority",
        "body": "Everything downstream of the API is asynchronous. The API validates the request, stores it in the delivery log and puts a message on a queue, then returns \"accepted\". The producer does not wait for the provider, which can take seconds. Separate queues for each channel isolate failures: if the SMS provider is slow, SMS messages pile up in their own queue while push and email carry on.\n\nWithin each channel, use at least two priorities: a high-priority queue for transactional messages and a low-priority queue for bulk. Workers read from the high-priority queue first or are assigned in a ratio (for example 8 to 2). A campaign of 10 million messages then affects only the low-priority queue. Bulk sends are also rate-limited: the campaign job feeds messages at a controlled speed (say 2,000 a second) that matches provider limits and your own capacity, rather than putting 10 million messages on the queue at once. Kafka (partitioned by user id, to keep one user's messages in order) or SQS fit this well; a message queue with per-message acknowledgement and a dead-letter queue is the important feature.\n\nWorkers call the external provider: APNs for iOS push, FCM for Android push, an email service such as SES, an SMS aggregator. These are third parties with their own rate limits, outages and error semantics. A worker must classify each error: a **transient** one (timeout, 5xx, rate limit) is retried later, a **permanent** one (invalid device token, unsubscribed address, malformed number) is not retried and the token or address is marked invalid so you stop sending to it.\n\nTemplates and localization live in a separate service or store: the producer sends a template id and parameters, and the service renders the text in the user's language. That keeps copy changes out of producers' code."
      },
      {
        "title": "Exactly-once is a myth, so make it idempotent",
        "body": "A queue delivers at least once: after a worker crashes between calling the provider and acknowledging the queue message, the message is delivered again and the user could get two SMS messages. True exactly-once delivery across a network is not available, so the design aims for **at-least-once delivery plus deduplication** that makes duplicates rare and harmless.\n\nEvery send request carries an **idempotency key** chosen by the producer (for example `order-8812-shipped`). The API inserts the request into the delivery log with that key as a unique constraint; a repeated request with the same key finds the existing row and is not enqueued again. This protects against producers that retry. On the worker side, before calling the provider the worker checks the log for the message's state and skips it if it is already `Sent`. Some providers accept a client-supplied message id and deduplicate on their side, which closes most of the remaining gap. Even then, a crash after the provider accepted and before the log update can send twice. That window is small, and for the most sensitive messages the right fix is to accept it and make the content safe to repeat (\"your code is 482910\" can be sent twice without harm).\n\nRetries use **exponential backoff with jitter**: wait 1 s, 2 s, 4 s, up to a limit, each with a random offset, so a provider outage does not turn into a synchronised wave of retries when it recovers. After a fixed number of attempts or a time limit (an OTP is useless after 5 minutes), the message moves to the dead-letter queue and the state becomes Failed, where it can alert someone or be replayed.\n\nPreferences are checked before queueing: channel opt-outs, quiet hours (hold push messages until morning in the user's time zone, except urgent ones), and per-user rate limits so a bug in a producer cannot send one user 500 messages."
      },
      {
        "title": "Failure modes",
        "body": "**A provider is down.** Queued messages wait. Use a circuit breaker per provider so workers stop hammering a failing service, and keep a secondary provider for critical channels (two SMS aggregators, with automatic failover). Time-sensitive messages expire rather than arrive hours late.\n\n**A campaign overloads the system.** Bulk traffic is on its own queue and is paced, so transactional messages are unaffected. If bulk workers fall behind, the queue depth alarm fires and the campaign can pause. The pacing logic also protects the provider from your burst: providers throttle or suspend senders who exceed agreed rates.\n\n**Queue or worker failure.** Messages stay in the queue until acknowledged, so a worker crash only delays delivery. The visibility timeout on the queue must be longer than a normal provider call, or the same message is handed to two workers at once.\n\n**Poison messages.** A malformed message that crashes the worker on every attempt would block the queue forever without a limit. A maximum receive count moves it to the dead-letter queue after a few tries, so the rest continue.\n\n**The delivery log is the weak point.** Every message touches it, so it needs to scale: partition by date and user, keep hot data small, and write status updates as a single-row upsert. If it is down, the API cannot accept messages; accepting without logging would lose deduplication, so most systems reject and let producers retry.\n\n**Bad data and trust.** Stale push tokens waste work and hurt provider reputation, so process provider feedback (invalid token, bounce, spam complaint) and suppress those addresses. Email needs SPF, DKIM and DMARC set up, or messages land in spam, and a complaint rate above about 0.1 percent can get the sending domain throttled."
      }
    ]
  },
  "sdd-typeahead": {
    "architecture": [
      {
        "name": "Query log and aggregation pipeline",
        "role": "Collects search queries, filters bots and private strings, counts distinct users per query and applies recency decay offline.",
        "scale": "10 million searches a day with about 6 requests each is 60 million requests a day. The count job runs in batch daily, plus a stream job over 5-minute windows for trending.",
        "failure": "If it lags during a spike, suggestions get staler but serving is untouched. That is the benefit of decoupling the two paths."
      },
      {
        "name": "Trie builder",
        "role": "Builds an immutable trie from the top 10 million useful queries, with the top 5 to 10 completions stored at every node, then validates it.",
        "scale": "The structure is a few gigabytes and fits in memory on one machine. A lookup walks at most about 20 characters, so it does not depend on how many completions exist.",
        "failure": "A bad build (empty or offensive) fails validation and the previous snapshot stays live. Keep the last few snapshots for rollback and alert when the snapshot is old."
      },
      {
        "name": "Serving nodes",
        "role": "Load the read-only snapshot into memory and answer prefix lookups, with a small override list applied for removals.",
        "scale": "About 700 requests a second on average and 3,000 at peak is modest. A lookup takes microseconds; the 100 ms budget is spent on the network.",
        "failure": "A lost node loses nothing: the load balancer uses the others and a replacement loads the snapshot in about a minute. No replication conflicts, because the data is immutable."
      },
      {
        "name": "CDN and client behaviour",
        "role": "The client waits about 100 ms after the last keystroke, cancels stale requests and caches per prefix. Responses carry max-age of an hour so the CDN answers repeated prefixes.",
        "scale": "Short prefixes are the most popular and most cacheable. A CDN hit ratio above 80 percent is realistic, so the origin sees a fraction of the traffic.",
        "failure": "If the CDN is down, requests reach serving nodes, which can take the load because it is small. Stale suggestions for up to an hour are acceptable."
      },
      {
        "name": "Shards and routing table",
        "role": "When the data no longer fits one machine, split by the first two characters or by measured ranges, with a small routing table in front and replicas per shard.",
        "scale": "Sharding by first character is uneven, since far more queries start with s than x. Measured ranges balance it.",
        "failure": "If a shard loses all its replicas, only prefixes in that range lose suggestions, and search itself still works."
      }
    ],
    "criteria": [
      {
        "area": "Latency and offline split",
        "strong": "Sets a 100 ms budget, separates the offline build from the online read-only lookup and says why.",
        "weak": "Updates a live structure on every search and wonders why reads are slow or locked."
      },
      {
        "area": "Data structure",
        "strong": "Uses a trie with the top k precomputed per node, so a lookup costs the prefix length, and notes the memory cost and a snapshot swap.",
        "weak": "Walks the whole subtree of the prefix at query time, or stores whole strings at every node."
      },
      {
        "area": "Ranking and freshness",
        "strong": "Weights recent counts with decay, merges a streaming trending overlay and requires a minimum number of distinct users.",
        "weak": "Ranks by all-time count only, so trends never appear and one user can push a phrase."
      },
      {
        "area": "Safety and cleaning",
        "strong": "Filters bots, personal data and offensive terms and has a quick override list applied at serving time.",
        "weak": "Shows raw query logs as suggestions, including phone numbers and abuse."
      },
      {
        "area": "Scaling and caching",
        "strong": "Computes 700 to 3,000 requests a second, uses client debounce and cancel, CDN caching by prefix and sharding by measured prefix ranges.",
        "weak": "Assumes a huge cluster is needed for 3,000 requests a second and never mentions the client or CDN."
      }
    ],
    "diagrams": [
      {
        "title": "Components",
        "source": "flowchart LR\n  U[User types in the search box] --> CDN[CDN and browser cache]\n  CDN --> API[Suggestion API]\n  API --> C[(In-memory trie, or Redis, by prefix)]\n  L[Query logs] --> K[Kafka]\n  K --> AG[Aggregator: counts per query per window]\n  AG --> B[Builder: top k per prefix]\n  B --> C",
        "caption": "Suggestions are precomputed from query logs and served from memory. The serving path never touches the logs."
      },
      {
        "title": "Serving a keystroke",
        "source": "sequenceDiagram\n  participant B as Browser\n  participant CDN as CDN\n  participant A as Suggestion API\n  participant T as Trie shard\n  B->>B: wait 100 ms after the last key, cancel older requests\n  B->>CDN: GET /suggest?q=ja\n  alt edge cache hit\n    CDN-->>B: top 5 for ja\n  else edge cache miss\n    CDN->>A: GET /suggest?q=ja\n    A->>T: lookup prefix ja\n    T-->>A: top 5 suggestions\n    A-->>CDN: response, cache for 1 hour\n    CDN-->>B: top 5 for ja\n  end",
        "caption": "Each keystroke asks for the top suggestions of the current prefix. Most requests are answered from the browser or the CDN."
      },
      {
        "title": "Offline build",
        "source": "flowchart TD\n  A[Raw search logs] --> B[Clean: drop bots, offensive and private queries]\n  B --> C[Count each query over a sliding window, weight recent days higher]\n  C --> D[Build trie, store top k at every prefix node]\n  D --> E[Validate: size, sample queries, compare to the previous build]\n  E --> F[Publish snapshot to storage]\n  F --> G[Serving nodes load the new snapshot and swap it in]",
        "caption": "A new trie is built from the logs on a schedule, checked, and then swapped in as a whole, so serving never sees a half-built structure."
      }
    ],
    "sections": [
      {
        "title": "What is being built and how fast it must be",
        "body": "Typeahead (autocomplete) shows a few suggestions after each keystroke. The hard part is latency: suggestions must appear in under 100 ms, including the network, or they feel laggy. And the volume is high, because one search can trigger 5 to 10 suggestion requests, one per keystroke.\n\nNumbers: 10 million searches a day with an average of 6 keystroke requests each is 60 million requests a day, about 700 a second on average, and perhaps 3,000 at peak. Those are modest. Storage matters more: suppose 100 million distinct queries of 20 characters on average. A naive trie would hold a node for every character: up to 2 billion nodes in the worst case (without sharing prefixes) and far fewer after sharing, but still tens of gigabytes. Keeping only the top 10 million useful queries (those seen more than a few times) brings this to a few gigabytes, which fits in memory on one machine, replicated for availability.\n\nThe product requirements: results ranked by popularity, maybe personalised or regionalised, filtered for offensive content and private data, and fresh enough to show a trending topic within minutes or hours rather than days. The key design decision is to **separate the offline path** (collecting and aggregating queries, building the structure) from the **online path** (a fast read-only lookup)."
      },
      {
        "title": "The trie with top-k at every node",
        "body": "A **trie** stores strings by shared prefix: one path of characters from the root, with `java`, `javascript` and `jam` sharing the first two nodes. To answer \"what are the best completions of the prefix `ja`\", a plain trie walks to the node for `ja` and then must explore its entire subtree to find the most popular words, which can be millions of nodes for a short prefix. That is too slow.\n\nThe standard fix is to **precompute the answer at every node**: each node stores its top k completions (k = 5 or 10), already ranked. A lookup is then walking the length of the prefix, at most about 20 steps, and returning the stored list: O(length of prefix), independent of the number of completions. The cost is space: each node holds k references. Storing the full string at each node would be wasteful, so nodes store a reference or an integer id of the query, and the query text lives in one table.\n\nThe demo builds exactly that. Each node keeps a sorted list of its best k queries; recording a query updates the lists along its path. With counts `javascript` 120, `java` 50, `jar file` 20, `jam` 5 and `python` 90, and k = 3, it prints that the prefix `j` and `ja` both give `javascript, java, jar file` (`jam` is cut off by k), the prefix `java` gives `javascript, java`, and an unknown prefix gives an empty list. After recording a spike of 200 extra searches for `jar file`, the prefix `ja` ranks it first.\n\nIn production the offline job rebuilds the whole trie, not by updating it live, because live updates need locking and ranking changes affect many nodes: a single popular query changes the top-k list on every prefix node along its path. A snapshot approach is simpler: build a new immutable trie on the side, validate it, then swap a pointer. Real systems also store compressed forms (a radix tree merges chains of single-child nodes) and sometimes use a finite state transducer for compact, fast prefix lookups."
      },
      {
        "title": "Ranking, freshness and personalisation",
        "body": "Ranking by all-time count favours old, established queries. Users also want trends, so weight recent counts higher: score = sum of daily counts, each multiplied by a decay such as 0.9 per day of age, or keep two lists (all-time and last hour) and merge them. A query that suddenly spikes (a breaking news event) needs a faster path than the daily batch: a streaming job counts queries in short windows (say 5 minutes) with Flink or Kafka Streams, and a small overlay of \"trending\" entries is merged with the batch results at serving time.\n\n**Cleaning** matters as much as ranking. Drop bot traffic, queries containing personal data (phone numbers, email addresses, card numbers), and anything on a block list of offensive terms. Only count a query from a user once per short period so one user cannot push a phrase to the top. A minimum count threshold (for example, seen by at least 50 distinct users) keeps rare, possibly private strings out.\n\n**Personalisation and locale** add a layer. A user's own recent searches can be prepended from the client or a small per-user store; a per-country or per-language trie serves regional popularity. Do the personal merge at the edge of the system, so the shared trie stays shared and cacheable.\n\n**Client behaviour** cuts load more than server tuning does. The browser waits about 100 ms after the last keystroke before sending, so fast typists send fewer requests; it cancels in-flight requests when a newer keystroke arrives, and it caches results per prefix for the session. Responses carry `Cache-Control: max-age=3600`, so the CDN answers repeated prefixes (`ja`, `jav`) without touching the origin. Short prefixes are the most popular, and they are also the most cacheable, so a CDN hit ratio above 80 percent is realistic."
      },
      {
        "title": "Failure modes and scaling",
        "body": "**A trie node is lost.** Each serving node holds the same read-only snapshot (or a shard of it), loaded from storage at start. Losing a node loses nothing: the load balancer sends traffic to the others and a replacement loads the snapshot in a minute or so. Because the structure is immutable and rebuilt offline, there are no replication conflicts to resolve.\n\n**The data does not fit on one machine.** Shard by prefix. Sharding by the first character gives uneven shards (many more queries start with `s` than with `x`), so split by the first two characters or by measured ranges, with a small routing table in front. Each shard has replicas. A query for the prefix `ja` goes to the shard that owns `ja`, so no scatter-gather is needed.\n\n**A bad build.** If the offline job fails or produces garbage (an empty trie, offensive suggestions), the validation step blocks publication and the serving tier keeps the previous snapshot. Keep the last few snapshots so you can roll back by pointing to an older one. Alert when the snapshot is older than a threshold, because stale suggestions fail quietly.\n\n**The aggregation pipeline lags.** Log shipping and counting can fall behind during traffic spikes. Suggestions become staler, but serving is unaffected, which is the benefit of decoupling.\n\n**Abuse and legal risk.** Attackers can try to push offensive or false suggestions to the top with coordinated searches, so use per-user dedupe, a distinct-user threshold and manual or automated blocklists, and provide a way to remove a suggestion quickly (an override list applied at serving time, without waiting for the next build).\n\n**Latency tail.** At 3,000 requests a second the lookup itself takes microseconds. Latency comes from the network, so serve from several regions close to users. Keep the response small: top 5 short strings is a few hundred bytes."
      }
    ],
    "code": [
      {
        "name": "Typeahead.java",
        "code": "import java.util.*;\n\npublic class Typeahead {\n    static class Node {\n        final Map<Character, Node> next = new TreeMap<>();\n        // best completions under this prefix, kept sorted by count descending then text ascending\n        final List<String> top = new ArrayList<>();\n    }\n\n    private final Node root = new Node();\n    private final Map<String, Integer> counts = new HashMap<>();\n    private final int k;\n\n    Typeahead(int k) { this.k = k; }\n\n    void record(String query, int times) {\n        counts.merge(query, times, Integer::sum);\n        Node n = root;\n        for (char ch : query.toCharArray()) {\n            n = n.next.computeIfAbsent(ch, x -> new Node());\n            refresh(n, query);\n        }\n    }\n\n    private void refresh(Node n, String query) {\n        if (!n.top.contains(query)) n.top.add(query);\n        n.top.sort((a, b) -> counts.get(b).equals(counts.get(a)) ? a.compareTo(b) : counts.get(b) - counts.get(a));\n        while (n.top.size() > k) n.top.remove(n.top.size() - 1);\n    }\n\n    List<String> suggest(String prefix) {\n        Node n = root;\n        for (char ch : prefix.toCharArray()) {\n            n = n.next.get(ch);\n            if (n == null) return List.of();\n        }\n        return new ArrayList<>(n.top);   // already ranked: no subtree walk at query time\n    }\n\n    public static void main(String[] args) {\n        Typeahead t = new Typeahead(3);\n        t.record(\"java\", 50);\n        t.record(\"javascript\", 120);\n        t.record(\"jar file\", 20);\n        t.record(\"jam\", 5);\n        t.record(\"python\", 90);\n        System.out.println(\"j -> \" + t.suggest(\"j\"));\n        System.out.println(\"ja -> \" + t.suggest(\"ja\"));\n        System.out.println(\"java -> \" + t.suggest(\"java\"));\n        System.out.println(\"x -> \" + t.suggest(\"x\"));\n        t.record(\"jar file\", 200);   // a spike: it now outranks the rest\n        System.out.println(\"after a spike, ja -> \" + t.suggest(\"ja\"));\n    }\n}"
      }
    ]
  }
};
