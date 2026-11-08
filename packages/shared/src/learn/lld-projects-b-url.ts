import type { LldProject } from "./types";

// Full Java project for the URL shortener LLD problem (plan 0013, batch B). Java 17, standard library only, default
// package, one top-level type per file. apps/web/lib/lld-projects.test.ts compiles it with javac -Xlint:all, runs Main
// and Tests, and checks that Main prints every line of expectedOutput. Generated from real, compiled source.

export const LLD_PROJECTS_B_URL: Record<string, LldProject> = {
  "lldp-url-shortener": {
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
        name: "InvalidUrlException.java",
        code: `// Thrown when the long URL (or a custom alias) is not acceptable. The message says why, so an API can return it as a 400.
final class InvalidUrlException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    InvalidUrlException(String message) {
        super(message);
    }
}
`,
      },
      {
        name: "AliasTakenException.java",
        code: `// A custom alias is already used by another link. An API returns this as a 409 Conflict.
final class AliasTakenException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    AliasTakenException(String alias) {
        super("alias already in use: " + alias);
    }
}
`,
      },
      {
        name: "Base62.java",
        code: `import java.math.BigInteger;

// Short codes use the 62 characters 0-9, a-z, A-Z: URL-safe without escaping, and a 7-character code has 62^7, about
// 3.5 trillion, possible values. (Base64 would add + and /, which need escaping in URLs.)
final class Base62 {
    static final String ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

    private Base62() { }

    static String encode(long value) {
        if (value < 0) throw new IllegalArgumentException("negative value");
        if (value == 0) return "0";
        StringBuilder sb = new StringBuilder();
        while (value > 0) {
            sb.append(ALPHABET.charAt((int) (value % 62)));
            value /= 62;
        }
        return sb.reverse().toString();
    }

    static long decode(String code) {
        long value = 0;
        for (char c : code.toCharArray()) {
            int digit = ALPHABET.indexOf(c);
            if (digit < 0) throw new IllegalArgumentException("not a base62 character: " + c);
            value = value * 62 + digit;
        }
        return value;
    }

    // First \`length\` base62 characters of a big number; used to turn a hash into a code.
    static String encode(BigInteger value, int length) {
        StringBuilder sb = new StringBuilder();
        BigInteger base = BigInteger.valueOf(62);
        for (int i = 0; i < length; i++) {
            BigInteger[] qr = value.divideAndRemainder(base);
            sb.append(ALPHABET.charAt(qr[1].intValue()));
            value = qr[0];
        }
        return sb.toString();
    }
}
`,
      },
      {
        name: "UrlValidator.java",
        code: `import java.net.URI;
import java.net.URISyntaxException;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

// Decides what we are willing to shorten. Accepting any string is how a shortener becomes a tool for attacks: javascript:
// links, file: paths, or a link to the shortener itself that redirects in a loop. Rules: http or https only, a real host,
// no credentials in the URL, a length cap. Normalising (lower-case scheme and host, no fragment) means two spellings of
// the same address map to one code.
final class UrlValidator {
    static final int MAX_URL_LENGTH = 2048;
    private static final Pattern ALIAS = Pattern.compile("[A-Za-z0-9_-]{3,32}");
    // Words that would collide with the service's own routes.
    private static final Set<String> RESERVED = Set.of("api", "admin", "health", "static", "login", "stats");

    private UrlValidator() { }

    static String normalize(String raw) {
        if (raw == null || raw.isBlank()) throw new InvalidUrlException("url is empty");
        String text = raw.trim();
        if (text.length() > MAX_URL_LENGTH) throw new InvalidUrlException("url is longer than " + MAX_URL_LENGTH + " characters");
        URI uri;
        try {
            uri = new URI(text);
        } catch (URISyntaxException e) {
            throw new InvalidUrlException("url is not valid: " + e.getReason());
        }
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
        if (!scheme.equals("http") && !scheme.equals("https")) throw new InvalidUrlException("only http and https links are allowed");
        if (uri.getHost() == null || uri.getHost().isBlank()) throw new InvalidUrlException("url has no host");
        if (uri.getUserInfo() != null) throw new InvalidUrlException("urls with a user name or password are not allowed");
        StringBuilder sb = new StringBuilder(scheme).append("://").append(uri.getHost().toLowerCase(Locale.ROOT));
        if (uri.getPort() != -1) sb.append(':').append(uri.getPort());
        String path = uri.getRawPath();
        sb.append(path == null || path.isEmpty() ? "/" : path);
        if (uri.getRawQuery() != null) sb.append('?').append(uri.getRawQuery());
        return sb.toString(); // the fragment (#...) is never sent to a server, so it is dropped
    }

    static String checkAlias(String alias) {
        if (alias == null || !ALIAS.matcher(alias).matches()) {
            throw new InvalidUrlException("alias must be 3 to 32 letters, digits, dashes or underscores");
        }
        if (RESERVED.contains(alias.toLowerCase(Locale.ROOT))) throw new InvalidUrlException("alias is reserved: " + alias);
        return alias;
    }
}
`,
      },
      {
        name: "ShortLink.java",
        code: `// One stored link. expiresAt is a time in milliseconds, or 0 for "never". A record: immutable, equality by value.
record ShortLink(String code, String longUrl, long createdAt, long expiresAt) {
    boolean isActive(long now) {
        return expiresAt == 0 || now < expiresAt;
    }
}
`,
      },
      {
        name: "ResolveStatus.java",
        code: `// What happened when someone opened a short link. An HTTP layer maps these to 301 or 302, 404 and 410.
enum ResolveStatus { FOUND, NOT_FOUND, EXPIRED }
`,
      },
      {
        name: "Resolution.java",
        code: `// The result of resolving a code: a status and, only when FOUND, the long URL to redirect to.
record Resolution(ResolveStatus status, String url) {
    static Resolution found(String url) {
        return new Resolution(ResolveStatus.FOUND, url);
    }

    static Resolution notFound() {
        return new Resolution(ResolveStatus.NOT_FOUND, null);
    }

    static Resolution expired() {
        return new Resolution(ResolveStatus.EXPIRED, null);
    }
}
`,
      },
      {
        name: "CodeGenerator.java",
        code: `// Strategy: where do short codes come from? Each implementation trades predictability, collisions and coordination
// differently (see the three classes below). \`attempt\` is 0 the first time and rises each time a code turned out to be
// taken, so a deterministic generator can produce a different code on the retry.
interface CodeGenerator {
    String next(String longUrl, int attempt);
}
`,
      },
      {
        name: "CounterCodeGenerator.java",
        code: `import java.util.concurrent.atomic.AtomicLong;

// Codes from a counter: 1, 2, 3 ... written in base 62. Never collides, since every number is used once, and the codes
// are as short as possible. The costs: codes are guessable (anyone can walk through all your links by counting), and with
// several servers the counter must be shared or split into ranges per server. \`start\` keeps the first codes from being
// one character long.
final class CounterCodeGenerator implements CodeGenerator {
    private final AtomicLong counter;

    CounterCodeGenerator(long start) {
        this.counter = new AtomicLong(start);
    }

    @Override
    public String next(String longUrl, int attempt) {
        return Base62.encode(counter.getAndIncrement());
    }
}
`,
      },
      {
        name: "RandomCodeGenerator.java",
        code: `import java.util.Random;

// Codes drawn at random: not guessable (use SecureRandom in production) and no shared counter, so any server can create
// links on its own. The price: two links can draw the same code. With 62^7 possible codes a collision is rare, but it
// gets likelier as the table fills, so the shortener must check the store and ask again (that is what \`attempt\` is for).
final class RandomCodeGenerator implements CodeGenerator {
    private final Random random;
    private final int length;

    RandomCodeGenerator(Random random, int length) {
        if (length < 1) throw new IllegalArgumentException("length must be positive");
        this.random = random;
        this.length = length;
    }

    @Override
    public String next(String longUrl, int attempt) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(Base62.ALPHABET.charAt(random.nextInt(62)));
        return sb.toString();
    }
}
`,
      },
      {
        name: "HashCodeGenerator.java",
        code: `import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

// Codes from a hash of the URL: the same URL always gives the same code on any server, with no shared state, so
// shortening twice is naturally idempotent. A short code keeps only part of the hash, so different URLs can still
// collide; the retry (attempt > 0) hashes the URL together with the attempt number to get a different code.
final class HashCodeGenerator implements CodeGenerator {
    private final int length;

    HashCodeGenerator(int length) {
        if (length < 1 || length > 40) throw new IllegalArgumentException("length must be between 1 and 40");
        this.length = length;
    }

    @Override
    public String next(String longUrl, int attempt) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] digest = sha.digest((longUrl + "#" + attempt).getBytes(StandardCharsets.UTF_8));
            return Base62.encode(new BigInteger(1, digest), length);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is always available on the JVM", e);
        }
    }
}
`,
      },
      {
        name: "UrlRepository.java",
        code: `import java.util.Optional;

// Storage behind the shortener. The one operation that matters is putIfAbsent: it must claim a code atomically, so two
// requests that picked the same code cannot both succeed. A database does this with a unique key or an INSERT that fails
// on a duplicate; an in-memory map does it with ConcurrentHashMap.putIfAbsent.
interface UrlRepository {
    boolean putIfAbsent(ShortLink link);

    Optional<ShortLink> find(String code);

    boolean delete(String code);

    int size();
}
`,
      },
      {
        name: "InMemoryUrlRepository.java",
        code: `import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

final class InMemoryUrlRepository implements UrlRepository {
    private final ConcurrentHashMap<String, ShortLink> links = new ConcurrentHashMap<>();

    @Override
    public boolean putIfAbsent(ShortLink link) {
        return links.putIfAbsent(link.code(), link) == null; // null means nobody was there: we won the code
    }

    @Override
    public Optional<ShortLink> find(String code) {
        return Optional.ofNullable(links.get(code));
    }

    @Override
    public boolean delete(String code) {
        return links.remove(code) != null;
    }

    @Override
    public int size() {
        return links.size();
    }
}
`,
      },
      {
        name: "ClickCounter.java",
        code: `import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.LongAdder;

// Counts redirects per code. Redirects are by far the most frequent operation, and many threads hit the same popular
// code at once, so each counter is a LongAdder (cheap under contention) rather than a synchronized long.
// In production you would not update a database row per click; you would count in memory or in a queue and write batches.
final class ClickCounter {
    private final ConcurrentHashMap<String, LongAdder> counts = new ConcurrentHashMap<>();

    void record(String code) {
        counts.computeIfAbsent(code, c -> new LongAdder()).increment();
    }

    long count(String code) {
        LongAdder adder = counts.get(code);
        return adder == null ? 0 : adder.sum();
    }

    void forget(String code) {
        counts.remove(code);
    }
}
`,
      },
      {
        name: "UrlShortener.java",
        code: `import java.util.concurrent.ConcurrentHashMap;

// The facade: the only class a caller needs. It validates input, picks codes, stores links, resolves them and counts
// clicks. Everything it depends on (code generator, storage, clock) is passed in, so each can be swapped or faked in a test.
final class UrlShortener {
    private static final int MAX_ATTEMPTS = 10;

    private final CodeGenerator generator;
    private final UrlRepository repository;
    private final TimeSource clock;
    private final ClickCounter clicks = new ClickCounter();
    // Same URL, same code, as long as the first link is still alive. compute() on this map runs one caller at a time per
    // URL, so two threads shortening the same URL cannot create two codes.
    private final ConcurrentHashMap<String, String> codeByUrl = new ConcurrentHashMap<>();

    UrlShortener(CodeGenerator generator, UrlRepository repository, TimeSource clock) {
        this.generator = generator;
        this.repository = repository;
        this.clock = clock;
    }

    // A plain short link that never expires. Shortening the same address again returns the same link.
    ShortLink shorten(String url) {
        String normal = UrlValidator.normalize(url);
        String code = codeByUrl.compute(normal, (u, existing) -> {
            if (existing != null && repository.find(existing).filter(l -> l.isActive(clock.nowMillis())).isPresent()) return existing;
            return create(u, 0).code();
        });
        return repository.find(code).orElseThrow(() -> new IllegalStateException("link vanished: " + code));
    }

    // A link that stops working after ttlMillis. Always a new code, since the lifetime belongs to this one link.
    ShortLink shortenWithTtl(String url, long ttlMillis) {
        if (ttlMillis < 1) throw new InvalidUrlException("ttl must be positive");
        return create(UrlValidator.normalize(url), ttlMillis);
    }

    // A link with a name the caller chose, such as "spring-sale". Fails if the name is taken.
    ShortLink shortenWithAlias(String url, String alias) {
        String normal = UrlValidator.normalize(url);
        UrlValidator.checkAlias(alias);
        ShortLink link = new ShortLink(alias, normal, clock.nowMillis(), 0);
        if (!repository.putIfAbsent(link)) throw new AliasTakenException(alias);
        return link;
    }

    Resolution resolve(String code) {
        ShortLink link = repository.find(code).orElse(null);
        if (link == null) return Resolution.notFound();
        if (!link.isActive(clock.nowMillis())) {
            repository.delete(code); // lazy cleanup: an expired link is removed the first time someone opens it
            clicks.forget(code);
            return Resolution.expired();
        }
        clicks.record(code);
        return Resolution.found(link.longUrl());
    }

    boolean delete(String code) {
        clicks.forget(code);
        return repository.delete(code);
    }

    long clicks(String code) {
        return clicks.count(code);
    }

    private ShortLink create(String normalizedUrl, long ttlMillis) {
        long now = clock.nowMillis();
        long expiresAt = ttlMillis == 0 ? 0 : now + ttlMillis;
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            ShortLink link = new ShortLink(generator.next(normalizedUrl, attempt), normalizedUrl, now, expiresAt);
            if (repository.putIfAbsent(link)) return link; // the atomic claim: only one caller can win a code
        }
        throw new IllegalStateException("could not find a free code after " + MAX_ATTEMPTS + " tries");
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// A tour of the URL shortener. The clock is a ManualTime and the random generator is seeded, so every run prints the
// same lines.
public class Main {
    public static void main(String[] args) throws Exception {
        basics();
        validation();
        aliases();
        expiry();
        generators();
        retries();
        threads();
    }

    static void basics() {
        System.out.println("== Shorten and open ==");
        UrlShortener shortener = new UrlShortener(new CounterCodeGenerator(125), new InMemoryUrlRepository(), new ManualTime(0));
        ShortLink a = shortener.shorten("https://example.com/docs/intro");
        System.out.println("short code: " + a.code());
        System.out.println("open it: " + shortener.resolve(a.code()));
        ShortLink again = shortener.shorten("HTTPS://Example.COM/docs/intro#section-2");
        System.out.println("same address spelled differently gives the same code: " + again.code().equals(a.code()));
        ShortLink b = shortener.shorten("https://example.com/other?x=1");
        System.out.println("a different address gets the next code: " + b.code());
        shortener.resolve(a.code());
        shortener.resolve(a.code());
        System.out.println("clicks on " + a.code() + ": " + shortener.clicks(a.code()));
        System.out.println("open an unknown code: " + shortener.resolve("zzzzzz").status());
        System.out.println("delete " + b.code() + ": " + shortener.delete(b.code()) + ", then open it: " + shortener.resolve(b.code()).status());
    }

    static void validation() {
        System.out.println("== What is refused ==");
        UrlShortener shortener = new UrlShortener(new CounterCodeGenerator(1), new InMemoryUrlRepository(), new ManualTime(0));
        String[] bad = {"ftp://files.example.com/a", "javascript:alert(1)", "not a url", "https://user:pw@example.com/", "https:///nohost", ""};
        for (String url : bad) {
            try {
                shortener.shorten(url);
                System.out.println("accepted (unexpected): " + url);
            } catch (InvalidUrlException e) {
                System.out.println("refused: " + e.getMessage());
            }
        }
    }

    static void aliases() {
        System.out.println("== Custom aliases ==");
        UrlShortener shortener = new UrlShortener(new CounterCodeGenerator(1), new InMemoryUrlRepository(), new ManualTime(0));
        ShortLink sale = shortener.shortenWithAlias("https://shop.example/sale", "spring-sale");
        System.out.println("created: " + sale.code() + " -> " + shortener.resolve("spring-sale").url());
        try {
            shortener.shortenWithAlias("https://other.example/", "spring-sale");
        } catch (AliasTakenException e) {
            System.out.println("second use: " + e.getMessage());
        }
        try {
            shortener.shortenWithAlias("https://other.example/", "admin");
        } catch (InvalidUrlException e) {
            System.out.println("reserved: " + e.getMessage());
        }
        try {
            shortener.shortenWithAlias("https://other.example/", "no spaces");
        } catch (InvalidUrlException e) {
            System.out.println("bad characters: " + e.getMessage());
        }
    }

    static void expiry() {
        System.out.println("== Links that expire after 1000 ms ==");
        ManualTime time = new ManualTime(0);
        UrlShortener shortener = new UrlShortener(new CounterCodeGenerator(1), new InMemoryUrlRepository(), time);
        ShortLink link = shortener.shortenWithTtl("https://promo.example/today", 1000);
        time.advance(999);
        System.out.println("at 999 ms:  " + shortener.resolve(link.code()).status());
        time.advance(1);
        System.out.println("at 1000 ms: " + shortener.resolve(link.code()).status());
        System.out.println("asked again: " + shortener.resolve(link.code()).status());
    }

    static void generators() {
        System.out.println("== Three ways to make a code for https://example.com/a ==");
        String url = "https://example.com/a";
        CodeGenerator counter = new CounterCodeGenerator(1_000_000);
        CodeGenerator random = new RandomCodeGenerator(new Random(42), 7);
        CodeGenerator hash = new HashCodeGenerator(7);
        System.out.println("counter, first two codes:  " + counter.next(url, 0) + " " + counter.next(url, 0));
        System.out.println("random, 7 characters:      " + random.next(url, 0));
        System.out.println("hash, called twice:        " + hash.next(url, 0) + " " + hash.next(url, 0));
        System.out.println("hash, second attempt:      " + hash.next(url, 1));
        System.out.println("base62 round trip of 3521614606208: " + Base62.decode(Base62.encode(3_521_614_606_208L)));
    }

    static void retries() {
        System.out.println("== When a generated code is already taken ==");
        // A generator that first proposes "taken", then "free1", "free2" ...
        CodeGenerator stubborn = (url, attempt) -> attempt == 0 ? "taken" : "free" + attempt;
        UrlShortener shortener = new UrlShortener(stubborn, new InMemoryUrlRepository(), new ManualTime(0));
        shortener.shortenWithAlias("https://first.example/", "taken");
        ShortLink link = shortener.shorten("https://second.example/");
        System.out.println("second link got: " + link.code());
    }

    static void threads() throws InterruptedException {
        System.out.println("== Sixteen threads shortening at once ==");
        InMemoryUrlRepository repository = new InMemoryUrlRepository();
        UrlShortener shortener = new UrlShortener(new CounterCodeGenerator(1000), repository, new ManualTime(0));
        Set<String> codesForSameUrl = ConcurrentHashMap.newKeySet();
        Set<String> codesForDistinctUrls = ConcurrentHashMap.newKeySet();
        List<Thread> threads = new ArrayList<>();
        for (int t = 0; t < 16; t++) {
            final int id = t;
            Thread thread = new Thread(() -> {
                for (int i = 0; i < 500; i++) {
                    codesForSameUrl.add(shortener.shorten("https://shared.example/page").code());
                    codesForDistinctUrls.add(shortener.shorten("https://unique.example/" + id + "/" + i).code());
                }
            });
            threads.add(thread);
            thread.start();
        }
        for (Thread thread : threads) thread.join();
        Set<String> all = new HashSet<>(codesForDistinctUrls);
        all.addAll(codesForSameUrl);
        System.out.println("one URL, many threads, codes created: " + codesForSameUrl.size());
        System.out.println("8000 different URLs got 8000 different codes: " + (codesForDistinctUrls.size() == 8000));
        System.out.println("no code was handed to two URLs: " + (all.size() == 8001));
        System.out.println("links stored: " + repository.size());
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
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// Self-checking tests (no JUnit needed). Prints PASS or FAIL per check; exits with 1 if anything failed.
public class Tests {
    static int failures;
    static int total;

    static void check(String name, boolean ok) {
        total++;
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    static boolean refused(Runnable r) {
        try {
            r.run();
            return false;
        } catch (InvalidUrlException e) {
            return true;
        }
    }

    static UrlShortener counterShortener(ManualTime time) {
        return new UrlShortener(new CounterCodeGenerator(1), new InMemoryUrlRepository(), time);
    }

    public static void main(String[] args) throws Exception {
        base62();
        validator();
        shortenAndResolve();
        aliases();
        expiry();
        generators();
        retries();
        concurrency();
        if (failures > 0) {
            System.out.println(failures + " of " + total + " checks did not pass");
            System.exit(1);
        }
        System.out.println("all " + total + " checks passed");
    }

    static void base62() {
        check("base62: zero is the first character", Base62.encode(0).equals("0"));
        check("base62: 61 is the last single character", Base62.encode(61).equals("Z") && Base62.encode(62).equals("10"));
        boolean roundTrip = true;
        for (long v : new long[] {1, 61, 62, 63, 3843, 3844, 1_000_000, Long.MAX_VALUE}) roundTrip &= Base62.decode(Base62.encode(v)) == v;
        check("base62: decode undoes encode", roundTrip);
        boolean badDecode = false;
        try {
            Base62.decode("a-b");
        } catch (IllegalArgumentException e) {
            badDecode = true;
        }
        check("base62: a foreign character is rejected", badDecode);
    }

    static void validator() {
        check("validator: scheme and host are lower-cased, fragment dropped",
                UrlValidator.normalize("  HTTPS://Example.COM/Path?Q=1#top ").equals("https://example.com/Path?Q=1"));
        check("validator: a bare host gets a slash", UrlValidator.normalize("http://example.com").equals("http://example.com/"));
        check("validator: port is kept", UrlValidator.normalize("http://example.com:8080/a").equals("http://example.com:8080/a"));
        check("validator: ftp is refused", refused(() -> UrlValidator.normalize("ftp://example.com/")));
        check("validator: javascript is refused", refused(() -> UrlValidator.normalize("javascript:alert(1)")));
        check("validator: no host is refused", refused(() -> UrlValidator.normalize("https:///x")));
        check("validator: credentials are refused", refused(() -> UrlValidator.normalize("https://a:b@example.com/")));
        check("validator: blank and null are refused", refused(() -> UrlValidator.normalize("  ")) && refused(() -> UrlValidator.normalize(null)));
        check("validator: too long is refused", refused(() -> UrlValidator.normalize("https://example.com/" + "a".repeat(2100))));
        check("validator: alias rules", refused(() -> UrlValidator.checkAlias("ab")) && refused(() -> UrlValidator.checkAlias("has space"))
                && refused(() -> UrlValidator.checkAlias("API")) && UrlValidator.checkAlias("my_link-1").equals("my_link-1"));
    }

    static void shortenAndResolve() {
        UrlShortener s = counterShortener(new ManualTime(0));
        ShortLink a = s.shorten("https://example.com/a");
        check("shorten: the link can be opened", s.resolve(a.code()).equals(Resolution.found("https://example.com/a")));
        check("shorten: the same address gives the same code", s.shorten("https://EXAMPLE.com/a#x").code().equals(a.code()));
        check("shorten: another address gets another code", !s.shorten("https://example.com/b").code().equals(a.code()));
        check("resolve: an unknown code is NOT_FOUND", s.resolve("nope").status() == ResolveStatus.NOT_FOUND);
        s.resolve(a.code());
        check("clicks: each successful open is counted", s.clicks(a.code()) == 2 && s.clicks("nope") == 0);
        check("delete: removes the link and its clicks", s.delete(a.code()) && !s.delete(a.code()) && s.resolve(a.code()).status() == ResolveStatus.NOT_FOUND && s.clicks(a.code()) == 0);
        ShortLink fresh = s.shorten("https://example.com/a");
        check("shorten: after a delete the address gets a new code", !fresh.code().equals(a.code()));
    }

    static void aliases() {
        UrlShortener s = counterShortener(new ManualTime(0));
        s.shortenWithAlias("https://a.example/", "my-link");
        check("alias: resolves", s.resolve("my-link").url().equals("https://a.example/"));
        boolean taken = false;
        try {
            s.shortenWithAlias("https://b.example/", "my-link");
        } catch (AliasTakenException e) {
            taken = true;
        }
        check("alias: a second use is refused and does not overwrite", taken && s.resolve("my-link").url().equals("https://a.example/"));
        check("alias: invalid and reserved names are refused", refused(() -> s.shortenWithAlias("https://c.example/", "x"))
                && refused(() -> s.shortenWithAlias("https://c.example/", "admin")));
    }

    static void expiry() {
        ManualTime time = new ManualTime(100);
        UrlShortener s = counterShortener(time);
        ShortLink link = s.shortenWithTtl("https://promo.example/", 50);
        time.advance(49);
        check("ttl: valid until just before the deadline", s.resolve(link.code()).status() == ResolveStatus.FOUND);
        time.advance(1);
        check("ttl: expired exactly at the deadline", s.resolve(link.code()).status() == ResolveStatus.EXPIRED);
        check("ttl: an expired link is then gone", s.resolve(link.code()).status() == ResolveStatus.NOT_FOUND);
        check("ttl: a non-positive lifetime is refused", refused(() -> s.shortenWithTtl("https://x.example/", 0)));

        ShortLink first = s.shorten("https://plain.example/");
        s.delete(first.code());
        check("expiry: shortening again after a deletion works", s.resolve(s.shorten("https://plain.example/").code()).status() == ResolveStatus.FOUND);
    }

    static void generators() {
        CounterCodeGenerator counter = new CounterCodeGenerator(62);
        check("counter: codes follow the counter", counter.next("u", 0).equals("10") && counter.next("u", 0).equals("11"));
        RandomCodeGenerator random = new RandomCodeGenerator(new Random(1), 7);
        String code = random.next("u", 0);
        boolean alphabet = code.length() == 7;
        for (char c : code.toCharArray()) alphabet &= Base62.ALPHABET.indexOf(c) >= 0;
        check("random: the right length and alphabet", alphabet);
        HashCodeGenerator hash = new HashCodeGenerator(7);
        check("hash: the same url gives the same code", hash.next("https://a/", 0).equals(hash.next("https://a/", 0)));
        check("hash: a retry gives a different code, and so does another url", !hash.next("https://a/", 0).equals(hash.next("https://a/", 1))
                && !hash.next("https://a/", 0).equals(hash.next("https://b/", 0)));
        check("generators: bad arguments are refused", throwsIllegal(() -> new RandomCodeGenerator(new Random(), 0)) && throwsIllegal(() -> new HashCodeGenerator(0)));
    }

    static boolean throwsIllegal(Runnable r) {
        try {
            r.run();
            return false;
        } catch (IllegalArgumentException e) {
            return true;
        }
    }

    static void retries() {
        CodeGenerator stubborn = (url, attempt) -> attempt < 3 ? "busy" : "free" + attempt;
        UrlShortener s = new UrlShortener(stubborn, new InMemoryUrlRepository(), new ManualTime(0));
        s.shortenWithAlias("https://first.example/", "busy");
        check("retry: a taken code makes the shortener ask again", s.shorten("https://second.example/").code().equals("free3"));

        UrlShortener hopeless = new UrlShortener((url, attempt) -> "same", new InMemoryUrlRepository(), new ManualTime(0));
        hopeless.shorten("https://one.example/");
        boolean gaveUp = false;
        try {
            hopeless.shorten("https://two.example/");
        } catch (IllegalStateException e) {
            gaveUp = true;
        }
        check("retry: after ten failed tries it gives up with an error", gaveUp);
    }

    static void concurrency() throws InterruptedException {
        UrlShortener s = new UrlShortener(new CounterCodeGenerator(1), new InMemoryUrlRepository(), new ManualTime(0));
        Set<String> sameUrlCodes = ConcurrentHashMap.newKeySet();
        List<Thread> threads = new ArrayList<>();
        for (int t = 0; t < 8; t++) {
            Thread thread = new Thread(() -> {
                for (int i = 0; i < 1000; i++) sameUrlCodes.add(s.shorten("https://hot.example/").code());
            });
            threads.add(thread);
            thread.start();
        }
        for (Thread thread : threads) thread.join();
        check("threads: many threads shortening one url create exactly one code", sameUrlCodes.size() == 1);

        String code = sameUrlCodes.iterator().next();
        threads.clear();
        for (int t = 0; t < 8; t++) {
            Thread thread = new Thread(() -> {
                for (int i = 0; i < 1000; i++) s.resolve(code);
            });
            threads.add(thread);
            thread.start();
        }
        for (Thread thread : threads) thread.join();
        check("threads: no click is lost", s.clicks(code) == 8000);
    }
}
`,
      },
    ],
    expectedOutput: [
      "short code: 21",
      "same address spelled differently gives the same code: true",
      "clicks on 21: 3",
      "delete 22: true, then open it: NOT_FOUND",
      "refused: only http and https links are allowed",
      "refused: urls with a user name or password are not allowed",
      "second use: alias already in use: spring-sale",
      "reserved: alias is reserved: admin",
      "at 1000 ms: EXPIRED",
      "asked again: NOT_FOUND",
      "hash, called twice:        2ekQCfj 2ekQCfj",
      "second link got: free1",
      "one URL, many threads, codes created: 1",
      "8000 different URLs got 8000 different codes: true",
      "links stored: 8001"
    ],
  },
};
