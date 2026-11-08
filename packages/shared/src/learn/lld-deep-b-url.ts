import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the URL shortener project in lld-projects-b-url.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const URL_SHORTENER_GUIDE: LldGuide = {
  requirements: [
    "shorten(longUrl) returns a short code; resolve(code) returns the long URL (or says it is missing or expired).",
    "Optional custom alias and optional expiry time per link.",
    "Only http and https links; reject anything else. The same address twice gives the same code.",
    "Many threads at once: two requests must never get the same code for different URLs.",
    "Count clicks per link.",
  ],
  entities: ["UrlShortener (facade)", "ShortLink (record: code, longUrl, createdAt, expiresAt)", "CodeGenerator (strategy)", "UrlRepository (storage)", "UrlValidator", "ClickCounter", "Resolution / ResolveStatus", "TimeSource (injected clock)"],
  patterns: ["Strategy for code generation (counter, random, hash)", "Facade (UrlShortener)", "Repository with an atomic putIfAbsent", "Dependency injection of the clock, generator and storage"],
  code: `class UrlShortener {
  private final CodeGenerator generator;
  private final UrlRepository repository;
  private final TimeSource clock;
  private final ConcurrentHashMap<String, String> codeByUrl = new ConcurrentHashMap<>();

  ShortLink shorten(String url) {
    String normal = UrlValidator.normalize(url);
    String code = codeByUrl.compute(normal, (u, existing) -> {
      if (existing != null && repository.find(existing).filter(l -> l.isActive(clock.nowMillis())).isPresent()) return existing;
      return create(u, 0).code();
    });
    return repository.find(code).orElseThrow();
  }

  private ShortLink create(String url, long ttlMillis) {
    long now = clock.nowMillis();
    for (int attempt = 0; attempt < 10; attempt++) {
      ShortLink link = new ShortLink(generator.next(url, attempt), url, now, ttlMillis == 0 ? 0 : now + ttlMillis);
      if (repository.putIfAbsent(link)) return link;   // atomic claim of the code
    }
    throw new IllegalStateException("no free code");
  }

  Resolution resolve(String code) {
    ShortLink link = repository.find(code).orElse(null);
    if (link == null) return Resolution.notFound();
    if (!link.isActive(clock.nowMillis())) { repository.delete(code); return Resolution.expired(); }
    clicks.record(code);
    return Resolution.found(link.longUrl());
  }
}

interface CodeGenerator { String next(String longUrl, int attempt); }
interface UrlRepository { boolean putIfAbsent(ShortLink l); Optional<ShortLink> find(String code); boolean delete(String code); }
record ShortLink(String code, String longUrl, long createdAt, long expiresAt) { }`,
  extensions: [
    "Persist links in a database: the code is the primary key, so INSERT fails on a duplicate and plays the role of putIfAbsent.",
    "Cache the hottest codes in front of the database (an LRU cache, as in the LRU problem); reads outnumber writes by 100 to 1.",
    "Split the counter into ranges per server so servers can create codes without talking to each other.",
    "Per-user quotas and rate limiting on shorten (see the rate limiter problem).",
    "Analytics beyond a count: referrer, country, time series, written asynchronously.",
  ],
};

export const URL_SHORTENER_EXTRA: LldExtra = {
  recap: [
    "Code generation is the design decision: counter (short, no collisions, guessable), random (unguessable, can collide), hash (same URL gives same code, can collide).",
    "Claim a code with an atomic putIfAbsent and retry on failure; never check-then-insert.",
    "Validate: http/https only, a host, no credentials, length cap. Normalise so spellings of one address share a code.",
    "Inject the clock so expiry is testable; expire lazily on read.",
  ],
  flow: [
    "shorten(url): validate and normalise, then look up the URL in codeByUrl.",
    "No live code yet: ask the generator for a code, try repository.putIfAbsent; if it was taken, ask again with attempt + 1.",
    "resolve(code): find the link; not there is NOT_FOUND; past its expiry is EXPIRED (and delete it); otherwise count a click and return the long URL.",
    "An HTTP layer turns FOUND into a 301 or 302 redirect, NOT_FOUND into 404 and EXPIRED into 410.",
  ],
  edgeCases: [
    "Two threads shorten the same URL at once: compute() on the per-URL map entry makes one of them wait.",
    "Custom alias already taken, or a reserved word such as admin.",
    "javascript: or file: links, a link to the shortener itself (open redirect loops), very long URLs.",
    "Expired link opened twice; link deleted while someone is opening it.",
    "Counter overflow of the code length: a start offset avoids one-character codes, and 62^7 is about 3.5 trillion.",
  ],
};

export const LLD_DEEP_B_URL: Record<string, LldDeep> = {
  "lldp-url-shortener": {
    walkthrough: [
      {
        title: "What to clarify before writing code",
        body: `A URL shortener looks trivial: store a map from short code to long URL. The interview is about everything around that map, so spend the first minutes finding out which parts matter.

Ask what a code looks like: how long, which characters. Seven characters from 62 symbols gives about 3.5 trillion codes, far more than a service needs, and avoiding punctuation means the code never needs escaping in a URL. Ask whether the same long URL should always give the same code. If yes you need a reverse lookup; if no, every request makes a new link, which is simpler and lets each link have its own expiry. Ask about custom aliases and expiry, because both change the data model. Ask what the server must answer when someone opens a link that is missing, and when it is expired: a good API distinguishes 404 from 410. Ask whether links can be deleted, and whether anyone needs click counts.

Then ask the questions that decide the hard part. Is it one server or many? How many reads per write? The answer to the first decides how codes are generated without collisions. The answer to the second (typically 100 reads for every write) tells you that resolve must be cheap and that caching will matter later.

Write the agreed list on the board in five lines, and note one thing you will not build, for example a user account system. Naming what is out of scope is part of the answer.`,
      },
      {
        title: "Where codes come from: three generators, three trade-offs",
        body: `This is the heart of the problem, and the code makes the choice a Strategy: CodeGenerator has one method, next(longUrl, attempt), and the shortener does not care how a code is made.

CounterCodeGenerator writes an increasing number in base 62. It is the shortest possible code and can never collide, because every number is used once. Its costs are real. Codes are guessable, so anyone can enumerate every link by counting, which matters if links are meant to be private. And with several servers the counter has to be shared or divided: a common answer is to give each server a block of numbers (server one takes 1 to a million, server two takes the next million) so they never talk to each other on the hot path.

RandomCodeGenerator draws seven random characters. It is not guessable (use SecureRandom in production) and needs no shared counter. The cost is collisions: two requests can draw the same code, and the chance grows as the table fills. So the shortener must not assume the code is free.

HashCodeGenerator takes a SHA-256 of the URL and keeps part of it. The same URL always gives the same code on any server, with no shared state, which makes shortening naturally repeatable. Different URLs can still collide on the kept part, so the retry hashes the URL together with the attempt number to get a different code.

In an interview, name all three, say which one you would start with (counter with block allocation, or random with retry) and why, and say that the interface lets you switch. That sentence earns more than any single choice.`,
      },
      {
        title: "Collisions: claim the code atomically",
        body: `With random or hash codes, two requests can pick the same code at the same moment. The wrong fix is check-then-insert: look the code up, see that it is free, store it. Between the look-up and the store another thread can do the same, and now both believe they own the code. One link silently overwrites the other, and someone is redirected to the wrong site.

The right fix is to make the claim itself atomic. UrlRepository exposes putIfAbsent, which stores the link only if nobody has the code and tells you whether you won. In memory that is ConcurrentHashMap.putIfAbsent; in a database it is an INSERT into a table whose primary key is the code, where a duplicate raises an error you catch. There is no gap to race through, because the check and the store are one operation.

UrlShortener.create then loops. It asks the generator for a code, tries to claim it, and on failure asks again with attempt + 1, up to ten times. Ten is an arbitrary but sensible bound: a free code is found at once in a healthy table, and if ten tries fail something is wrong (a broken generator, or a nearly full code space) and an exception is better than looping for ever. The tests cover both ends: a generator that proposes a taken code twice and then a free one, and a generator that always proposes the same code, which must give up with an error.

Custom aliases use the same primitive without the loop: claim the alias once, and if putIfAbsent says no, the alias belongs to someone else and the caller gets an AliasTakenException.`,
      },
      {
        title: "Validation: what you refuse to shorten",
        body: `A shortener that accepts any string becomes a tool for attackers, because people trust a link on a domain they know. UrlValidator is short and every line is there for a reason.

Only http and https are allowed. A javascript: link would run code when clicked, and a file: link points at the visitor's own disk. A URL must have a host: a bare scheme is useless and an empty host can confuse parsers. URLs with a user name or password are refused, because https://bank.com@evil.example/ looks like one site and goes to another, which is the oldest phishing trick. A length cap of 2,048 characters keeps storage and abuse bounded.

Normalising matters as much as rejecting. The scheme and host are lower-cased (they are case-insensitive), a bare host gets a slash, and the fragment after the hash is dropped, since browsers never send it to the server. After this, HTTPS://Example.COM/a#top and https://example.com/a are the same string and therefore get the same code. The path and query are left exactly as given, because those can be case-sensitive.

Two follow-ups to mention. First, refuse links that point at the shortener's own domain, or an open redirect can loop. Second, a production service also checks the destination against a list of known malicious sites, ideally when a link is created and again over time, since a harmless site can turn bad later.

Aliases have their own rules: three to thirty-two letters, digits, dashes and underscores, and a reserved list (api, admin, health, and so on) so a user cannot take a name your own routes need.`,
      },
      {
        title: "Expiry, deletion and the same-URL rule",
        body: `Expiry is the reason the clock is injected. ShortLink stores expiresAt in milliseconds, with 0 meaning never, and isActive(now) is a single comparison: a link is valid until the moment expiresAt, and at exactly that millisecond it is gone, a boundary the tests check.

Expired links are removed lazily. There is no background sweeper in this design. The first time someone opens an expired code, resolve deletes it and returns EXPIRED; asking again returns NOT_FOUND. This is simple and correct, and the cost is that links nobody opens again stay in storage. In production a periodic job (or the database's own expiry feature, such as a TTL index) removes them. Say that out loud: lazy expiry is a design decision, not an oversight.

Resolve returns a Resolution with a status instead of null or an exception. Not found, expired and found are three normal outcomes that an HTTP layer maps to 404, 410 and a redirect, and an enum makes it impossible to forget one of them.

The same-URL rule needs care. shorten(url) keeps a map from normalised URL to code. It must be updated atomically: if two threads shorten the same new URL at the same moment, they must end up with the same code. ConcurrentHashMap.compute runs the function for a key one caller at a time, so the second thread sees the first thread's result. The function also checks that the remembered code is still alive, so after a deletion or expiry the same address gets a fresh code. Links with a time limit or a custom alias skip this map: their lifetime belongs to that one link.`,
      },
      {
        title: "Resolve is the hot path: clicks and caching",
        body: `Every redirect is a resolve, and resolves outnumber creations by orders of magnitude, so this path should do as little as possible: one lookup, one comparison against the clock, one counter increment.

Counting clicks is where naive code hurts. A synchronized long, or an update of a database row on every click, makes all visitors to a popular link queue behind one lock. ClickCounter keeps a LongAdder per code. A LongAdder spreads increments over several internal cells under contention and adds them up only when you read the total, so many threads can count the same link at once without blocking each other. The test starts eight threads that each open one link a thousand times and checks that exactly 8,000 clicks were counted.

In production you would not write to the database per click either. Count in memory (or on a queue) and write batches every few seconds, accepting that a crash may lose a few seconds of counts. For a click counter that is the right trade.

The next optimisation is a cache in front of storage. The popular few percent of links take most of the traffic, which is exactly what an LRU cache is for: keep the hottest codes in memory with the same Cache interface from the LRU problem, and fall back to storage on a miss. Say that this problem and the LRU problem meet here. Expiry adds one rule: the cache entry must not outlive the link, so cache with the smaller of a TTL and the link's own expiry, or check isActive on every hit.`,
      },
      {
        title: "Concurrency and scaling beyond one server",
        body: `Inside one process the shared state is small and each piece has a clear owner. The repository is a ConcurrentHashMap, and putIfAbsent is atomic. The same-URL map uses compute for atomic updates per key. The click counter uses LongAdder. The counter generator uses AtomicLong. There is no global lock, so unrelated requests never wait for each other. The Main demo runs sixteen threads: all of them shorten one shared URL five hundred times, and each also shortens five hundred URLs of its own. It then checks three invariants: the shared URL got exactly one code, eight thousand different URLs got eight thousand different codes, and no code was given to two URLs.

With many servers the shared state has to move. Storage becomes a database where the code is the primary key; putIfAbsent becomes an INSERT that may fail, and the retry loop is already there to handle that. The same-URL map either becomes a unique index on the normalised URL or is dropped (many services simply allow two codes for one address). The counter generator needs block allocation as described earlier, or you switch to random codes with retry and need no coordination at all.

Reads scale differently from writes. Resolves can be served from any replica or cache and tolerate slightly stale data, while creations must go to the primary. A redirect should be a 301 only if the link can never change; a 302 lets you change or expire the target, and it lets you count every click, because a browser caches a 301 and never asks again. Mentioning this trade-off is a good way to end the discussion.`,
      },
      {
        title: "Follow-ups to expect, and the tests behind this design",
        body: `Likely follow-ups: make links private to a user and add accounts; add per-user rate limits on creation (the rate limiter problem plugs in directly); support bulk creation; report analytics by country and referrer; let links be edited; protect against abuse with a blocklist; handle the case where the destination moves; and add a QR code endpoint. For each, say which class changes and which stay the same. Most of them touch only UrlShortener or add a new decorator, because storage, generation, validation and time are all behind interfaces.

The Tests class has 38 checks. They cover base62 (the first and last characters, round trips, a foreign character), the validator (normalisation, every refused form, alias rules), shorten and resolve (same address twice, different address, unknown code, click counts, deletion and re-creation), aliases (a second use must not overwrite the first), expiry (valid one millisecond before, gone exactly at the deadline, gone for good afterwards), the generators (counter order, random length and alphabet, hash determinism and retry difference), the retry loop in both directions, and two concurrency checks.

If you can only write one test in an interview, write the alias collision: create a link with a name, try the same name for a different URL, and check that the first link still works. That one test proves that the claim is atomic and that a failed claim has no side effects, which is the property everything else depends on.`,
      },
    ],
    classDiagram: `classDiagram
    class UrlShortener {
        +shorten(String) ShortLink
        +shortenWithTtl(String, long) ShortLink
        +shortenWithAlias(String, String) ShortLink
        +resolve(String) Resolution
        +delete(String) boolean
        +clicks(String) long
    }
    class CodeGenerator {
        <<interface>>
        +next(String, int) String
    }
    class CounterCodeGenerator
    class RandomCodeGenerator
    class HashCodeGenerator
    class UrlRepository {
        <<interface>>
        +putIfAbsent(ShortLink) boolean
        +find(String) Optional
        +delete(String) boolean
    }
    class InMemoryUrlRepository
    class ShortLink {
        <<record>>
        String code
        String longUrl
        long createdAt
        long expiresAt
    }
    class Resolution {
        <<record>>
        ResolveStatus status
        String url
    }
    class UrlValidator
    class ClickCounter
    class TimeSource {
        <<interface>>
        +nowMillis() long
    }
    class Base62
    UrlShortener --> CodeGenerator
    UrlShortener --> UrlRepository
    UrlShortener --> TimeSource
    UrlShortener --> ClickCounter
    UrlShortener ..> UrlValidator : uses
    UrlShortener ..> Resolution : returns
    CodeGenerator <|.. CounterCodeGenerator
    CodeGenerator <|.. RandomCodeGenerator
    CodeGenerator <|.. HashCodeGenerator
    UrlRepository <|.. InMemoryUrlRepository
    InMemoryUrlRepository o-- ShortLink
    CounterCodeGenerator ..> Base62
    RandomCodeGenerator ..> Base62
    HashCodeGenerator ..> Base62`,
    sequenceDiagram: `sequenceDiagram
    participant C as Caller
    participant S as UrlShortener
    participant V as UrlValidator
    participant G as CodeGenerator
    participant R as UrlRepository
    C->>S: shorten("https://Example.com/a#x")
    S->>V: normalize(url)
    V-->>S: "https://example.com/a"
    Note over S: codeByUrl.compute for this URL, one caller at a time
    S->>G: next(url, 0)
    G-->>S: "4c92"
    S->>R: putIfAbsent(link)
    alt code was free
        R-->>S: true
        S-->>C: ShortLink 4c92
    else code was taken
        R-->>S: false
        S->>G: next(url, 1)
        G-->>S: another code
        S->>R: putIfAbsent(link)
        R-->>S: true
        S-->>C: ShortLink with the new code
    end`,
    extraDiagrams: [
      {
        title: "Resolving a code",
        caption: "Three outcomes, which an HTTP layer maps to a redirect, 404 and 410.",
        source: `flowchart TD
    A["resolve(code)"] --> B{"Link in storage?"}
    B -- no --> N["NOT_FOUND: HTTP 404"]
    B -- yes --> C{"Still active at the clock time?"}
    C -- no --> D["Delete it, forget its clicks"]
    D --> E["EXPIRED: HTTP 410"]
    C -- yes --> F["Count a click"]
    F --> G["FOUND: HTTP 301 or 302 to the long URL"]`,
      },
      {
        title: "Choosing a code generator",
        caption: "The three strategies differ in length, guessability and what must be shared between servers.",
        source: `flowchart TD
    A{"Must codes be unguessable?"} -- yes --> B["Random: draw, claim with putIfAbsent, retry on collision"]
    A -- no --> C{"Several servers creating links?"}
    C -- no --> D["Counter: shortest codes, never collides"]
    C -- yes --> E{"Same URL must give the same code?"}
    E -- yes --> F["Hash of the URL: no shared state, retry with attempt number"]
    E -- no --> G["Counter with a block of numbers per server"]`,
      },
      {
        title: "Where the work happens as traffic grows",
        caption: "Reads dominate, so the read path gets a cache and replicas. Creation goes to the primary store.",
        source: `flowchart LR
    U["Visitors"] --> LB["Load balancer"]
    LB --> S1["Server"]
    LB --> S2["Server"]
    S1 --> CA["LRU cache of hot codes"]
    S2 --> CA
    CA -- miss --> DB["Database: code is the primary key"]
    S1 -- create --> DB
    S2 -- create --> DB`,
      },
    ],
    concurrency: [
      "Claiming a code is one atomic putIfAbsent, never check-then-insert, so two requests can never both own a code.",
      "codeByUrl.compute runs one caller at a time per URL, so concurrent shortens of the same address end with one code.",
      "ClickCounter uses a LongAdder per code: many threads count the same popular link without queueing on one lock.",
      "The counter generator is an AtomicLong; with several servers give each a block of numbers or switch to random codes with retry.",
      "The clock is injected, so expiry and concurrency can be tested without sleeping.",
    ],
  },
};
