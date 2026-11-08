import type { LldProject } from "./types";

// Full Java project for the logger and notification system LLD problem (plan 0013, batch B). Java 17, standard library
// only, default package, one top-level type per file. apps/web/lib/lld-projects.test.ts compiles it with javac -Xlint:all,
// runs Main and Tests, and checks that Main prints every line of expectedOutput. Generated from real, compiled source.

export const LLD_PROJECTS_B_LOG: Record<string, LldProject> = {
  "lldp-logger-notifications": {
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
        name: "Level.java",
        code: `// Severity, from least to most serious. The order of the constants is the order of importance, which is what lets a
// logger ask "is this record at least as serious as my threshold?" with one comparison.
enum Level {
    DEBUG, INFO, WARN, ERROR;

    boolean atLeast(Level threshold) {
        return compareTo(threshold) >= 0;
    }
}
`,
      },
      {
        name: "LogRecord.java",
        code: `import java.util.Map;

// One log event, frozen at the moment it happened: the time is read once, when the record is created, so a record that
// waits in an async queue still carries the time of the event and not the time it was written.
record LogRecord(long time, Level level, String logger, String message, Map<String, String> context) {
    LogRecord {
        context = Map.copyOf(context); // immutable, and a later change to the caller's map cannot alter the record
    }
}
`,
      },
      {
        name: "Formatter.java",
        code: `// Turns a record into text. Separate from where the text goes (the Appender), so "JSON to a file" and "plain text to the
// console" are two small combinations instead of two new classes.
interface Formatter {
    String format(LogRecord record);
}
`,
      },
      {
        name: "PlainFormatter.java",
        code: `import java.time.Instant;
import java.util.TreeMap;

// 1970-01-01T00:00:01Z INFO  app.web - request handled {user=alice}
final class PlainFormatter implements Formatter {
    @Override
    public String format(LogRecord r) {
        StringBuilder sb = new StringBuilder();
        sb.append(Instant.ofEpochMilli(r.time())).append(' ').append(String.format("%-5s", r.level())).append(' ');
        sb.append(r.logger()).append(" - ").append(r.message());
        if (!r.context().isEmpty()) sb.append(' ').append(new TreeMap<>(r.context())); // sorted, so the output is stable
        return sb.toString();
    }
}
`,
      },
      {
        name: "JsonFormatter.java",
        code: `import java.util.Map;
import java.util.TreeMap;

// One JSON object per line, which log tools can parse. The one thing that must be right is escaping: a message that
// contains a quote, a backslash or a newline would otherwise break the line (or let a user forge extra fields).
final class JsonFormatter implements Formatter {
    @Override
    public String format(LogRecord r) {
        StringBuilder sb = new StringBuilder("{");
        field(sb, "time", Long.toString(r.time()), false);
        field(sb, "level", r.level().name(), true);
        field(sb, "logger", r.logger(), true);
        field(sb, "message", r.message(), true);
        sb.append(",\\"context\\":{");
        boolean first = true;
        for (Map.Entry<String, String> e : new TreeMap<>(r.context()).entrySet()) {
            if (!first) sb.append(',');
            first = false;
            sb.append('"').append(escape(e.getKey())).append("\\":\\"").append(escape(e.getValue())).append('"');
        }
        return sb.append("}}").toString();
    }

    private static void field(StringBuilder sb, String name, String value, boolean quoted) {
        if (sb.length() > 1) sb.append(',');
        sb.append('"').append(name).append("\\":");
        if (quoted) sb.append('"').append(escape(value)).append('"');
        else sb.append(value);
    }

    static String escape(String s) {
        StringBuilder sb = new StringBuilder();
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\\\\"");
                case '\\\\' -> sb.append("\\\\\\\\");
                case '\\n' -> sb.append("\\\\n");
                case '\\r' -> sb.append("\\\\r");
                case '\\t' -> sb.append("\\\\t");
                default -> {
                    if (c < 0x20) sb.append(String.format("\\\\u%04x", (int) c));
                    else sb.append(c);
                }
            }
        }
        return sb.toString();
    }
}
`,
      },
      {
        name: "Appender.java",
        code: `// Where records go: the console, a file, memory, a remote service. Many appenders can be attached at once.
// close() lets an appender flush and release what it holds; most have nothing to do.
interface Appender {
    void append(LogRecord record);

    default void close() { }
}
`,
      },
      {
        name: "ConsoleAppender.java",
        code: `import java.io.PrintStream;

// Writes one formatted line per record. synchronized: two threads writing at once must not mix their characters in
// the middle of a line, so each line is written as a unit.
final class ConsoleAppender implements Appender {
    private final Formatter formatter;
    private final PrintStream out;

    ConsoleAppender(Formatter formatter, PrintStream out) {
        this.formatter = formatter;
        this.out = out;
    }

    @Override
    public synchronized void append(LogRecord record) {
        out.println(formatter.format(record));
    }
}
`,
      },
      {
        name: "MemoryAppender.java",
        code: `import java.util.ArrayList;
import java.util.List;

// Keeps the formatted lines in a list. Mostly for tests ("did the logger write this?"), and a handy way to show the
// last few lines in an admin page.
final class MemoryAppender implements Appender {
    private final Formatter formatter;
    private final List<String> lines = new ArrayList<>();

    MemoryAppender(Formatter formatter) {
        this.formatter = formatter;
    }

    @Override
    public synchronized void append(LogRecord record) {
        lines.add(formatter.format(record));
    }

    synchronized List<String> lines() {
        return new ArrayList<>(lines); // a copy, so the caller can read it while logging continues
    }
}
`,
      },
      {
        name: "AsyncAppender.java",
        code: `import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.atomic.AtomicLong;

// Moves the slow part (writing to disk or the network) off the thread that is logging. The caller only puts the record
// on a bounded queue; one worker thread takes records off and hands them to the real appender.
//
// The queue is bounded on purpose. If the target is slower than the callers, an unbounded queue grows until the
// program runs out of memory. A bounded queue forces a choice when it is full, and the choice is a policy:
//   DROP  - throw the new record away and count it (the app never waits for logging), or
//   BLOCK - make the caller wait (no records lost, but a slow log can slow the app).
// close() stops accepting records, writes everything already queued, then stops the worker.
final class AsyncAppender implements Appender {
    enum Overflow { DROP, BLOCK }

    private static final LogRecord STOP = new LogRecord(0, Level.DEBUG, "", "", java.util.Map.of());

    private final Appender target;
    private final Overflow overflow;
    private final BlockingQueue<LogRecord> queue;
    private final Thread worker;
    private final AtomicLong dropped = new AtomicLong();
    private volatile boolean closed;

    AsyncAppender(Appender target, int capacity, Overflow overflow) {
        if (capacity < 1) throw new IllegalArgumentException("capacity must be at least 1");
        this.target = target;
        this.overflow = overflow;
        this.queue = new ArrayBlockingQueue<>(capacity);
        this.worker = new Thread(this::drain, "async-appender");
        worker.setDaemon(true);
        worker.start();
    }

    @Override
    public void append(LogRecord record) {
        if (closed) {
            dropped.incrementAndGet();
            return;
        }
        if (overflow == Overflow.DROP) {
            if (!queue.offer(record)) dropped.incrementAndGet();
            return;
        }
        try {
            queue.put(record);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt(); // keep the interrupt for the caller; this record is lost
            dropped.incrementAndGet();
        }
    }

    @Override
    public void close() {
        if (closed) return;
        closed = true;
        try {
            queue.put(STOP); // goes behind everything already queued, so those are written first
            worker.join();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        target.close();
    }

    long dropped() {
        return dropped.get();
    }

    private void drain() {
        try {
            while (true) {
                LogRecord record = queue.take();
                if (record == STOP) return;
                try {
                    target.append(record);
                } catch (RuntimeException e) {
                    dropped.incrementAndGet(); // a failing target must not kill the worker
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
`,
      },
      {
        name: "LogManager.java",
        code: `import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicLong;

// Owns the configuration: the levels, the appenders, and the loggers handed out by name. Loggers are named like
// packages ("app", "app.db", "app.db.pool"), and a logger with no level of its own uses the nearest parent that has one,
// up to the root. So \`setLevel("app.db", DEBUG)\` turns on debug output for the whole database area and nothing else.
final class LogManager {
    private final TimeSource clock;
    private final Map<String, Level> levels = new ConcurrentHashMap<>();
    private final Map<String, Logger> loggers = new ConcurrentHashMap<>();
    private final List<Appender> appenders = new CopyOnWriteArrayList<>();
    private final AtomicLong appenderFailures = new AtomicLong();
    private volatile Level rootLevel = Level.INFO;

    LogManager(TimeSource clock) {
        this.clock = clock;
    }

    Logger getLogger(String name) {
        return loggers.computeIfAbsent(name, n -> new Logger(n, this, clock));
    }

    void setRootLevel(Level level) {
        rootLevel = level;
    }

    void setLevel(String loggerName, Level level) {
        levels.put(loggerName, level);
    }

    void addAppender(Appender appender) {
        appenders.add(appender);
    }

    // The level that applies to a logger: its own, else the closest parent's, else the root's.
    Level effectiveLevel(String loggerName) {
        String name = loggerName;
        while (true) {
            Level own = levels.get(name);
            if (own != null) return own;
            int dot = name.lastIndexOf('.');
            if (dot < 0) return rootLevel;
            name = name.substring(0, dot);
        }
    }

    // Sends a record to every appender. One broken appender (a full disk, a dead network) must not stop the others or
    // crash the application that only wanted to log a line, so each call is isolated and failures are only counted.
    void dispatch(LogRecord record) {
        for (Appender appender : appenders) {
            try {
                appender.append(record);
            } catch (RuntimeException e) {
                appenderFailures.incrementAndGet();
            }
        }
    }

    long appenderFailures() {
        return appenderFailures.get();
    }

    void close() {
        for (Appender appender : appenders) appender.close();
    }
}
`,
      },
      {
        name: "Logger.java",
        code: `import java.util.Map;
import java.util.function.Supplier;

// What application code holds on to. Its job is small: decide whether a message is wanted, build the record, hand it to
// the manager. The cheap check comes first, so a disabled debug line costs one comparison, and the Supplier overloads
// let the caller avoid building an expensive message at all when the level is off.
final class Logger {
    private final String name;
    private final LogManager manager;
    private final TimeSource clock;

    Logger(String name, LogManager manager, TimeSource clock) {
        this.name = name;
        this.manager = manager;
        this.clock = clock;
    }

    String name() {
        return name;
    }

    boolean isEnabled(Level level) {
        return level.atLeast(manager.effectiveLevel(name));
    }

    void log(Level level, String message, Map<String, String> context) {
        if (!isEnabled(level)) return;
        manager.dispatch(new LogRecord(clock.nowMillis(), level, name, message, context));
    }

    void log(Level level, Supplier<String> message) {
        if (!isEnabled(level)) return; // the supplier is not called, so the message is never built
        manager.dispatch(new LogRecord(clock.nowMillis(), level, name, message.get(), Map.of()));
    }

    void debug(String message) {
        log(Level.DEBUG, message, Map.of());
    }

    void info(String message) {
        log(Level.INFO, message, Map.of());
    }

    void info(String message, Map<String, String> context) {
        log(Level.INFO, message, context);
    }

    void warn(String message) {
        log(Level.WARN, message, Map.of());
    }

    void error(String message) {
        log(Level.ERROR, message, Map.of());
    }

    void error(String message, Map<String, String> context) {
        log(Level.ERROR, message, context);
    }
}
`,
      },
      {
        name: "Priority.java",
        code: `// How much a notification matters. URGENT ones (a security alert, a failed payment) are sent even during quiet hours.
enum Priority { LOW, NORMAL, URGENT }
`,
      },
      {
        name: "Notification.java",
        code: `import java.util.Map;

// What the caller wants to say, not how: a template name and its values. The wording lives in the template, and the
// route to the person lives in the channels, so a product manager can change the text without touching the code that
// raises the event.
record Notification(String userId, String template, Map<String, String> params, Priority priority) {
    Notification {
        params = Map.copyOf(params);
    }

    static Notification of(String userId, String template, Map<String, String> params) {
        return new Notification(userId, template, params, Priority.NORMAL);
    }
}
`,
      },
      {
        name: "DeliveryException.java",
        code: `// A channel could not deliver this message right now (timeout, provider error). It is the kind of failure worth retrying,
// as opposed to a bad template, which is a bug and fails at once.
final class DeliveryException extends RuntimeException {
    private static final long serialVersionUID = 1L;

    DeliveryException(String message) {
        super(message);
    }
}
`,
      },
      {
        name: "Channel.java",
        code: `// One way to reach a person: email, SMS, push. The service only knows this interface, so a new channel (Slack, WhatsApp)
// is one new class and one line where the channels are registered. This is the Strategy pattern.
interface Channel {
    String name();

    // Sends or throws DeliveryException. Must not be called with an unrendered message.
    void send(String userId, String message);
}
`,
      },
      {
        name: "InMemoryChannel.java",
        code: `import java.util.ArrayList;
import java.util.List;

// A channel that records what it was asked to send, and can be told to fail its first few attempts. It stands in for a
// real email or SMS provider in Main and the tests.
final class InMemoryChannel implements Channel {
    private final String name;
    private int failuresLeft;
    private int attempts;
    private final List<String> sent = new ArrayList<>();

    InMemoryChannel(String name, int failuresBeforeSuccess) {
        this.name = name;
        this.failuresLeft = failuresBeforeSuccess;
    }

    @Override
    public String name() {
        return name;
    }

    @Override
    public synchronized void send(String userId, String message) {
        attempts++;
        if (failuresLeft > 0) {
            failuresLeft--;
            throw new DeliveryException(name + " provider unavailable");
        }
        sent.add(userId + ": " + message);
    }

    synchronized List<String> sent() {
        return new ArrayList<>(sent);
    }

    synchronized int attempts() {
        return attempts;
    }
}
`,
      },
      {
        name: "TemplateEngine.java",
        code: `import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// Fills {placeholders} in a message template. Strict on purpose: an unknown template or a missing value is a programming
// error, and sending "Hi {name}, your code is {code}" to a customer is worse than failing loudly in testing.
final class TemplateEngine {
    private static final Pattern PLACEHOLDER = Pattern.compile("\\\\{([a-zA-Z0-9_]+)}");
    private final Map<String, String> templates = new HashMap<>();

    TemplateEngine register(String id, String text) {
        templates.put(id, text);
        return this;
    }

    String render(String id, Map<String, String> params) {
        String text = templates.get(id);
        if (text == null) throw new IllegalArgumentException("unknown template: " + id);
        List<String> missing = new ArrayList<>();
        Matcher m = PLACEHOLDER.matcher(text);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            String value = params.get(m.group(1));
            if (value == null) missing.add(m.group(1));
            m.appendReplacement(out, Matcher.quoteReplacement(value == null ? "" : value)); // quoteReplacement: a value containing $ or backslash is text, not a regex instruction
        }
        m.appendTail(out);
        if (!missing.isEmpty()) throw new IllegalArgumentException("template " + id + " needs: " + String.join(", ", missing));
        return out.toString();
    }
}
`,
      },
      {
        name: "UserPreferences.java",
        code: `import java.util.List;
import java.util.Set;

// How one person wants to be reached: channels in order of preference, channels they have switched off, and quiet hours
// (a window of hours, in UTC, during which only URGENT messages are sent). A window may cross midnight, such as 22 to 7.
record UserPreferences(List<String> channelOrder, Set<String> muted, int quietStartHour, int quietEndHour) {
    UserPreferences {
        channelOrder = List.copyOf(channelOrder);
        muted = Set.copyOf(muted);
        if (quietStartHour < 0 || quietStartHour > 23 || quietEndHour < 0 || quietEndHour > 23) {
            throw new IllegalArgumentException("hours must be 0 to 23");
        }
    }

    static UserPreferences of(String... channels) {
        return new UserPreferences(List.of(channels), Set.of(), 0, 0);
    }

    UserPreferences withMuted(String... channels) {
        return new UserPreferences(channelOrder, Set.of(channels), quietStartHour, quietEndHour);
    }

    UserPreferences withQuietHours(int startHour, int endHour) {
        return new UserPreferences(channelOrder, muted, startHour, endHour);
    }

    // start == end means "no quiet hours".
    boolean isQuiet(int hourOfDay) {
        if (quietStartHour == quietEndHour) return false;
        if (quietStartHour < quietEndHour) return hourOfDay >= quietStartHour && hourOfDay < quietEndHour;
        return hourOfDay >= quietStartHour || hourOfDay < quietEndHour; // crosses midnight
    }
}
`,
      },
      {
        name: "DeliveryResult.java",
        code: `// What happened to one notification. \`channel\` is where it was delivered (null if it was not), \`attempts\` counts the
// tries on that channel, and \`reason\` explains a non-delivery in words a support person can read.
record DeliveryResult(String userId, boolean delivered, String channel, int attempts, String reason) {
    static DeliveryResult delivered(String userId, String channel, int attempts) {
        return new DeliveryResult(userId, true, channel, attempts, "");
    }

    static DeliveryResult notDelivered(String userId, String reason) {
        return new DeliveryResult(userId, false, null, 0, reason);
    }
}
`,
      },
      {
        name: "Sleeper.java",
        code: `// How the service waits between retries. Production passes Thread::sleep; tests and Main pass a function that moves a
// ManualTime forward, so retries with backoff run instantly and the waiting time is still visible in the clock.
@FunctionalInterface
interface Sleeper {
    void sleep(long millis);
}
`,
      },
      {
        name: "NotificationService.java",
        code: `import java.util.Map;

// Sends a notification to a person: render the text, respect their preferences, try their channels in order, retry a
// failing channel a few times with a growing pause, and fall back to the next channel if it keeps failing. Every step is
// logged, and the caller gets a DeliveryResult instead of an exception, because "could not reach this user" is a normal
// outcome for a notification system, not a crash.
final class NotificationService {
    private final Map<String, Channel> channels;
    private final TemplateEngine templates;
    private final Map<String, UserPreferences> preferences;
    private final UserPreferences defaults;
    private final TimeSource clock;
    private final Sleeper sleeper;
    private final Logger log;
    private final int maxAttempts;
    private final long baseBackoffMillis;

    NotificationService(Map<String, Channel> channels, TemplateEngine templates, Map<String, UserPreferences> preferences,
                        UserPreferences defaults, TimeSource clock, Sleeper sleeper, Logger log, int maxAttempts, long baseBackoffMillis) {
        if (maxAttempts < 1) throw new IllegalArgumentException("maxAttempts must be at least 1");
        this.channels = Map.copyOf(channels);
        this.templates = templates;
        this.preferences = Map.copyOf(preferences);
        this.defaults = defaults;
        this.clock = clock;
        this.sleeper = sleeper;
        this.log = log;
        this.maxAttempts = maxAttempts;
        this.baseBackoffMillis = baseBackoffMillis;
    }

    DeliveryResult notify(Notification n) {
        String message = templates.render(n.template(), n.params()); // a bad template is a bug: let it throw
        UserPreferences prefs = preferences.getOrDefault(n.userId(), defaults);

        int hour = (int) ((clock.nowMillis() / 3_600_000L) % 24);
        if (n.priority() != Priority.URGENT && prefs.isQuiet(hour)) {
            log.info("skipped during quiet hours", Map.of("user", n.userId(), "template", n.template()));
            return DeliveryResult.notDelivered(n.userId(), "quiet hours");
        }

        boolean triedAny = false;
        for (String name : prefs.channelOrder()) {
            Channel channel = channels.get(name);
            if (channel == null || prefs.muted().contains(name)) continue;
            triedAny = true;
            for (int attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    channel.send(n.userId(), message);
                    log.info("delivered", Map.of("user", n.userId(), "channel", name, "attempt", Integer.toString(attempt)));
                    return DeliveryResult.delivered(n.userId(), name, attempt);
                } catch (DeliveryException e) {
                    log.warn(name + " failed for " + n.userId() + " (attempt " + attempt + " of " + maxAttempts + "): " + e.getMessage());
                    if (attempt < maxAttempts) sleeper.sleep(baseBackoffMillis << (attempt - 1)); // 100, 200, 400 ...
                }
            }
            log.warn("giving up on " + name + " for " + n.userId());
        }
        String reason = triedAny ? "every channel failed" : "no usable channel";
        log.error("not delivered: " + reason, Map.of("user", n.userId(), "template", n.template()));
        return DeliveryResult.notDelivered(n.userId(), reason);
    }
}
`,
      },
      {
        name: "Main.java",
        code: `import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

// A tour of the logger and the notification service. The clock is a ManualTime and retries "sleep" by moving it, so every
// run prints the same lines and nothing really waits.
public class Main {
    public static void main(String[] args) throws Exception {
        levels();
        formats();
        asyncAppender();
        brokenAppender();
        notifications();
    }

    static void levels() {
        System.out.println("== Levels and named loggers ==");
        ManualTime time = new ManualTime(1_000);
        LogManager manager = new LogManager(time);
        manager.addAppender(new ConsoleAppender(new PlainFormatter(), System.out));
        Logger web = manager.getLogger("app.web");
        Logger db = manager.getLogger("app.db.pool");

        web.debug("this debug line is below the INFO threshold, so it is not written");
        web.info("request handled", Map.of("user", "alice", "ms", "12"));
        time.advance(250);
        db.warn("connection pool is nearly full");

        manager.setLevel("app.db", Level.DEBUG);
        time.advance(250);
        db.debug("now visible: app.db.pool inherits DEBUG from app.db");
        web.debug("still hidden: app.web has no override");

        AtomicInteger built = new AtomicInteger();
        web.log(Level.DEBUG, () -> "expensive message " + built.incrementAndGet());
        System.out.println("message built while debug was off: " + (built.get() > 0));
    }

    static void formats() {
        System.out.println("== JSON lines and escaping ==");
        ManualTime time = new ManualTime(5_000);
        LogManager manager = new LogManager(time);
        manager.addAppender(new ConsoleAppender(new JsonFormatter(), System.out));
        manager.getLogger("app").error("said \\"hi\\"\\nand left", Map.of("path", "C:\\\\temp", "user", "bob"));
    }

    static void asyncAppender() throws Exception {
        System.out.println("== Async appender ==");
        ManualTime time = new ManualTime(0);
        LogManager manager = new LogManager(time);
        MemoryAppender memory = new MemoryAppender(new PlainFormatter());
        AsyncAppender async = new AsyncAppender(memory, 256, AsyncAppender.Overflow.BLOCK);
        manager.addAppender(async);
        Logger log = manager.getLogger("app");
        List<Thread> threads = new ArrayList<>();
        for (int t = 0; t < 4; t++) {
            final int id = t;
            Thread thread = new Thread(() -> {
                for (int i = 0; i < 1000; i++) log.info("worker " + id + " message " + i);
            });
            threads.add(thread);
            thread.start();
        }
        for (Thread thread : threads) thread.join();
        manager.close(); // writes everything still queued before returning
        System.out.println("lines written with BLOCK: " + memory.lines().size() + ", dropped: " + async.dropped());

        // A target that stays busy until we let it go, so the queue fills in a predictable way.
        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        MemoryAppender slowMemory = new MemoryAppender(new PlainFormatter());
        Appender slow = record -> {
            entered.countDown();
            try {
                release.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            slowMemory.append(record);
        };
        AsyncAppender dropping = new AsyncAppender(slow, 2, AsyncAppender.Overflow.DROP);
        LogManager m2 = new LogManager(time);
        m2.addAppender(dropping);
        Logger l2 = m2.getLogger("app");
        l2.info("first");
        entered.await(); // the worker now holds "first" inside the slow target
        for (int i = 0; i < 9; i++) l2.info("extra " + i); // the queue holds 2, the other 7 are dropped
        release.countDown();
        m2.close();
        System.out.println("lines written with DROP: " + slowMemory.lines().size() + ", dropped: " + dropping.dropped());
    }

    static void brokenAppender() {
        System.out.println("== One broken appender ==");
        ManualTime time = new ManualTime(0);
        LogManager manager = new LogManager(time);
        MemoryAppender healthy = new MemoryAppender(new PlainFormatter());
        manager.addAppender(record -> {
            throw new IllegalStateException("disk full");
        });
        manager.addAppender(healthy);
        manager.getLogger("app").info("still logged");
        manager.getLogger("app").info("and again");
        System.out.println("healthy appender got " + healthy.lines().size() + " lines, failures counted: " + manager.appenderFailures());
    }

    static void notifications() {
        System.out.println("== Notifications ==");
        ManualTime time = new ManualTime(10L * 3_600_000L); // 10:00 UTC
        LogManager logs = new LogManager(time);
        logs.setRootLevel(Level.WARN);
        logs.addAppender(new ConsoleAppender(new PlainFormatter(), System.out));

        InMemoryChannel email = new InMemoryChannel("email", 0);
        InMemoryChannel sms = new InMemoryChannel("sms", 0);
        TemplateEngine templates = new TemplateEngine()
                .register("welcome", "Hi {name}, welcome to {app}!")
                .register("code", "Your code is {code}");
        Map<String, UserPreferences> prefs = Map.of(
                "alice", UserPreferences.of("email", "sms"),
                "carol", UserPreferences.of("email", "sms").withMuted("email"),
                "dave", UserPreferences.of("email", "sms").withQuietHours(22, 7));
        NotificationService service = new NotificationService(Map.of("email", email, "sms", sms), templates, prefs, UserPreferences.of("email"),
                time, time::advance, logs.getLogger("notify"), 3, 100);

        Map<String, String> welcome = Map.of("name", "Alice", "app", "HabitManager");
        System.out.println("alice: " + service.notify(Notification.of("alice", "welcome", welcome)));
        System.out.println("carol (email muted): " + service.notify(Notification.of("carol", "welcome", Map.of("name", "Carol", "app", "HabitManager"))));
        System.out.println("someone unknown uses the default preferences: " + service.notify(Notification.of("zed", "code", Map.of("code", "4821"))).channel());

        // Retry with backoff: email fails twice, then works on the third try.
        InMemoryChannel flaky = new InMemoryChannel("email", 2);
        long before = time.nowMillis();
        NotificationService retrying = new NotificationService(Map.of("email", flaky, "sms", sms), templates, Map.of(), UserPreferences.of("email", "sms"),
                time, time::advance, logs.getLogger("notify"), 3, 100);
        System.out.println("flaky email: " + retrying.notify(Notification.of("erin", "code", Map.of("code", "1234"))));
        System.out.println("virtual time spent waiting: " + (time.nowMillis() - before) + " ms");

        // Fallback: email never works, so after 3 tries the service moves on to SMS.
        InMemoryChannel dead = new InMemoryChannel("email", 100);
        NotificationService fallback = new NotificationService(Map.of("email", dead, "sms", sms), templates, Map.of(), UserPreferences.of("email", "sms"),
                time, time::advance, logs.getLogger("notify"), 3, 100);
        System.out.println("dead email: " + fallback.notify(Notification.of("frank", "code", Map.of("code", "9999"))));
        System.out.println("email attempts: " + dead.attempts() + ", sms messages sent in total: " + sms.sent().size());

        // Quiet hours: it is 23:00 UTC.
        time.set(23L * 3_600_000L);
        System.out.println("dave, normal at 23:00: " + service.notify(Notification.of("dave", "code", Map.of("code", "1"))));
        System.out.println("dave, urgent at 23:00: " + service.notify(new Notification("dave", "code", Map.of("code", "2"), Priority.URGENT)));

        // A template mistake is a bug, so it fails loudly instead of sending a broken message.
        try {
            service.notify(Notification.of("alice", "welcome", Map.of("name", "Alice")));
        } catch (IllegalArgumentException e) {
            System.out.println("template error: " + e.getMessage());
        }

        InMemoryChannel allDead = new InMemoryChannel("email", 100);
        NotificationService hopeless = new NotificationService(Map.of("email", allDead), templates, Map.of(), UserPreferences.of("email"),
                time, time::advance, logs.getLogger("notify"), 2, 10);
        System.out.println("nothing works: " + hopeless.notify(Notification.of("gina", "code", Map.of("code", "7"))));
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
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;

// Self-checking tests (no JUnit needed). Prints PASS or FAIL per check; exits with 1 if anything failed.
public class Tests {
    static int failures;
    static int total;

    static void check(String name, boolean ok) {
        total++;
        System.out.println((ok ? "PASS " : "FAIL ") + name);
        if (!ok) failures++;
    }

    public static void main(String[] args) throws Exception {
        levels();
        formatters();
        appenders();
        asyncAppender();
        templates();
        preferences();
        service();
        if (failures > 0) {
            System.out.println(failures + " of " + total + " checks did not pass");
            System.exit(1);
        }
        System.out.println("all " + total + " checks passed");
    }

    static LogManager manager(MemoryAppender memory) {
        LogManager m = new LogManager(new ManualTime(0));
        m.addAppender(memory);
        return m;
    }

    static void levels() {
        check("level: order of importance", Level.ERROR.atLeast(Level.WARN) && Level.INFO.atLeast(Level.INFO) && !Level.DEBUG.atLeast(Level.INFO));
        MemoryAppender memory = new MemoryAppender(new PlainFormatter());
        LogManager m = manager(memory);
        Logger app = m.getLogger("app");
        app.debug("hidden");
        app.info("shown");
        check("logger: the default root level is INFO", memory.lines().size() == 1 && memory.lines().get(0).contains("shown"));

        m.setLevel("app", Level.ERROR);
        app.warn("hidden now");
        check("logger: a named level overrides the root", memory.lines().size() == 1);
        check("logger: a child inherits from the nearest parent", m.effectiveLevel("app.db.pool") == Level.ERROR);

        m.setLevel("app.db", Level.DEBUG);
        check("logger: a closer parent wins", m.effectiveLevel("app.db.pool") == Level.DEBUG && m.effectiveLevel("app.web") == Level.ERROR);
        check("logger: an unrelated name uses the root", m.effectiveLevel("other.thing") == Level.INFO);
        check("logger: getLogger returns the same instance per name", m.getLogger("x") == m.getLogger("x") && m.getLogger("x") != m.getLogger("y"));

        AtomicInteger built = new AtomicInteger();
        m.getLogger("quiet").log(Level.DEBUG, () -> "msg " + built.incrementAndGet());
        check("logger: a disabled message is never built", built.get() == 0);
        m.getLogger("app.db").log(Level.DEBUG, () -> "msg " + built.incrementAndGet());
        check("logger: an enabled message is built once", built.get() == 1);
    }

    static void formatters() {
        LogRecord r = new LogRecord(1_500, Level.WARN, "app", "disk low", Map.of("b", "2", "a", "1"));
        check("plain: time, padded level, name, message and sorted context", new PlainFormatter().format(r).equals("1970-01-01T00:00:01.500Z WARN  app - disk low {a=1, b=2}"));
        check("plain: no braces without context", !new PlainFormatter().format(new LogRecord(0, Level.INFO, "a", "m", Map.of())).contains("{"));
        String json = new JsonFormatter().format(new LogRecord(7, Level.ERROR, "app", "say \\"hi\\"\\nnow\\\\", Map.of("k", "v\\t")));
        check("json: quotes, newlines, backslashes and tabs are escaped", json.equals("{\\"time\\":7,\\"level\\":\\"ERROR\\",\\"logger\\":\\"app\\",\\"message\\":\\"say \\\\\\"hi\\\\\\"\\\\nnow\\\\\\\\\\",\\"context\\":{\\"k\\":\\"v\\\\t\\"}}"));
        check("json: control characters become \\\\u escapes", JsonFormatter.escape("\\u0001").equals("\\\\u0001"));
        Map<String, String> mutable = new java.util.HashMap<>(Map.of("a", "1"));
        LogRecord copy = new LogRecord(0, Level.INFO, "a", "m", mutable);
        mutable.put("b", "2");
        check("record: the context is copied, later changes do not alter it", copy.context().size() == 1);
    }

    static void appenders() {
        MemoryAppender healthy = new MemoryAppender(new PlainFormatter());
        LogManager m = new LogManager(new ManualTime(0));
        m.addAppender(record -> {
            throw new IllegalStateException("boom");
        });
        m.addAppender(healthy);
        m.getLogger("app").info("one");
        m.getLogger("app").info("two");
        check("manager: a failing appender does not stop the others or the caller", healthy.lines().size() == 2 && m.appenderFailures() == 2);

        MemoryAppender a = new MemoryAppender(new PlainFormatter());
        MemoryAppender b = new MemoryAppender(new JsonFormatter());
        LogManager both = new LogManager(new ManualTime(0));
        both.addAppender(a);
        both.addAppender(b);
        both.getLogger("app").info("x");
        check("manager: every appender gets the record, each with its own formatter", a.lines().get(0).contains("INFO") && b.lines().get(0).startsWith("{"));

        java.io.ByteArrayOutputStream bytes = new java.io.ByteArrayOutputStream();
        new ConsoleAppender(new PlainFormatter(), new java.io.PrintStream(bytes, true)).append(new LogRecord(0, Level.INFO, "a", "hello", Map.of()));
        check("console: writes the formatted line", bytes.toString().contains("hello"));

        MemoryAppender mem = new MemoryAppender(new PlainFormatter());
        mem.append(new LogRecord(0, Level.INFO, "a", "m", Map.of()));
        List<String> snapshot = mem.lines();
        mem.append(new LogRecord(0, Level.INFO, "a", "n", Map.of()));
        check("memory: lines() is a copy", snapshot.size() == 1 && mem.lines().size() == 2);
    }

    static void asyncAppender() throws Exception {
        MemoryAppender memory = new MemoryAppender(new PlainFormatter());
        AsyncAppender async = new AsyncAppender(memory, 8, AsyncAppender.Overflow.BLOCK);
        LogManager m = new LogManager(new ManualTime(0));
        m.addAppender(async);
        Logger log = m.getLogger("app");
        List<Thread> threads = new ArrayList<>();
        for (int t = 0; t < 4; t++) {
            Thread thread = new Thread(() -> {
                for (int i = 0; i < 500; i++) log.info("m " + i);
            });
            threads.add(thread);
            thread.start();
        }
        for (Thread thread : threads) thread.join();
        m.close();
        check("async BLOCK: nothing is lost, even with a tiny queue", memory.lines().size() == 2000 && async.dropped() == 0);
        async.append(new LogRecord(0, Level.INFO, "a", "late", Map.of()));
        check("async: a record after close is dropped and counted", async.dropped() == 1 && memory.lines().size() == 2000);

        CountDownLatch entered = new CountDownLatch(1);
        CountDownLatch release = new CountDownLatch(1);
        MemoryAppender sink = new MemoryAppender(new PlainFormatter());
        AsyncAppender dropping = new AsyncAppender(record -> {
            entered.countDown();
            try {
                release.await();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            sink.append(record);
        }, 2, AsyncAppender.Overflow.DROP);
        LogRecord r = new LogRecord(0, Level.INFO, "a", "m", Map.of());
        dropping.append(r);
        entered.await();
        for (int i = 0; i < 9; i++) dropping.append(r);
        release.countDown();
        dropping.close();
        check("async DROP: the queue holds its capacity, the rest are counted as dropped", dropping.dropped() == 7 && sink.lines().size() == 3);

        AsyncAppender failing = new AsyncAppender(record -> {
            throw new IllegalStateException("target down");
        }, 4, AsyncAppender.Overflow.BLOCK);
        failing.append(r);
        failing.append(r);
        failing.close();
        check("async: a failing target does not kill the worker", failing.dropped() == 2);
        boolean refused = false;
        try {
            new AsyncAppender(memory, 0, AsyncAppender.Overflow.DROP);
        } catch (IllegalArgumentException e) {
            refused = true;
        }
        check("async: capacity must be positive", refused);
    }

    static void templates() {
        TemplateEngine t = new TemplateEngine().register("hi", "Hi {name}, code {code}.");
        check("template: fills every placeholder", t.render("hi", Map.of("name", "Al", "code", "42")).equals("Hi Al, code 42."));
        check("template: dollar signs and backslashes in values stay text", t.render("hi", Map.of("name", "$1", "code", "a\\\\b")).equals("Hi $1, code a\\\\b."));
        boolean missing = false;
        try {
            t.render("hi", Map.of("name", "Al"));
        } catch (IllegalArgumentException e) {
            missing = e.getMessage().contains("code");
        }
        check("template: a missing value is an error that names it", missing);
        boolean unknown = false;
        try {
            t.render("nope", Map.of());
        } catch (IllegalArgumentException e) {
            unknown = true;
        }
        check("template: an unknown template is an error", unknown);
    }

    static void preferences() {
        UserPreferences p = UserPreferences.of("email").withQuietHours(22, 7);
        check("quiet hours: a window that crosses midnight", p.isQuiet(23) && p.isQuiet(0) && p.isQuiet(6) && !p.isQuiet(7) && !p.isQuiet(12) && p.isQuiet(22));
        UserPreferences day = UserPreferences.of("email").withQuietHours(9, 17);
        check("quiet hours: a window inside one day", day.isQuiet(9) && day.isQuiet(16) && !day.isQuiet(17) && !day.isQuiet(8));
        check("quiet hours: start equal to end means none", !UserPreferences.of("email").isQuiet(3));
        boolean bad = false;
        try {
            UserPreferences.of("email").withQuietHours(24, 3);
        } catch (IllegalArgumentException e) {
            bad = true;
        }
        check("quiet hours: hours outside 0 to 23 are refused", bad);
    }

    static NotificationService service(ManualTime time, Map<String, Channel> channels, Map<String, UserPreferences> prefs, MemoryAppender log, int attempts) {
        LogManager m = new LogManager(time);
        m.setRootLevel(Level.DEBUG);
        m.addAppender(log);
        TemplateEngine t = new TemplateEngine().register("code", "Your code is {code}");
        return new NotificationService(channels, t, prefs, UserPreferences.of("email", "sms"), time, time::advance, m.getLogger("notify"), attempts, 100);
    }

    static Notification code(String user, Priority p) {
        return new Notification(user, "code", Map.of("code", "77"), p);
    }

    static void service() {
        ManualTime time = new ManualTime(10L * 3_600_000L);
        InMemoryChannel email = new InMemoryChannel("email", 0);
        InMemoryChannel sms = new InMemoryChannel("sms", 0);
        MemoryAppender log = new MemoryAppender(new PlainFormatter());
        NotificationService s = service(time, Map.of("email", email, "sms", sms), Map.of(), log, 3);
        DeliveryResult ok = s.notify(code("u1", Priority.NORMAL));
        check("service: delivers on the first channel in the user's order", ok.delivered() && ok.channel().equals("email") && ok.attempts() == 1
                && email.sent().equals(List.of("u1: Your code is 77")) && sms.sent().isEmpty());

        InMemoryChannel flaky = new InMemoryChannel("email", 2);
        long start = time.nowMillis();
        DeliveryResult retried = service(time, Map.of("email", flaky, "sms", sms), Map.of(), log, 3).notify(code("u2", Priority.NORMAL));
        check("service: retries a failing channel", retried.delivered() && retried.attempts() == 3 && flaky.attempts() == 3);
        check("service: waits 100 ms then 200 ms between tries", time.nowMillis() - start == 300);

        InMemoryChannel dead = new InMemoryChannel("email", 100);
        DeliveryResult fell = service(time, Map.of("email", dead, "sms", sms), Map.of(), log, 3).notify(code("u3", Priority.NORMAL));
        check("service: falls back to the next channel after the last try fails", fell.delivered() && fell.channel().equals("sms") && dead.attempts() == 3);

        InMemoryChannel mutedEmail = new InMemoryChannel("email", 0);
        DeliveryResult muted = service(time, Map.of("email", mutedEmail, "sms", sms), Map.of("u4", UserPreferences.of("email", "sms").withMuted("email")), log, 3)
                .notify(code("u4", Priority.NORMAL));
        check("service: a muted channel is never used", muted.channel().equals("sms") && mutedEmail.attempts() == 0);

        DeliveryResult none = service(time, Map.of("email", new InMemoryChannel("email", 0)), Map.of("u5", UserPreferences.of("pigeon")), log, 3).notify(code("u5", Priority.NORMAL));
        check("service: no usable channel is reported, not thrown", !none.delivered() && none.reason().equals("no usable channel"));

        DeliveryResult allFail = service(time, Map.of("email", new InMemoryChannel("email", 100)), Map.of("u6", UserPreferences.of("email")), log, 2).notify(code("u6", Priority.NORMAL));
        check("service: every channel failing is reported", !allFail.delivered() && allFail.reason().equals("every channel failed"));

        time.set(23L * 3_600_000L);
        Map<String, UserPreferences> quiet = Map.of("u7", UserPreferences.of("email").withQuietHours(22, 7));
        NotificationService q = service(time, Map.of("email", new InMemoryChannel("email", 0)), quiet, log, 3);
        DeliveryResult skipped = q.notify(code("u7", Priority.LOW));
        check("service: a normal message waits out quiet hours", !skipped.delivered() && skipped.reason().equals("quiet hours"));
        check("service: an urgent message does not", q.notify(code("u7", Priority.URGENT)).delivered());

        boolean threw = false;
        try {
            s.notify(new Notification("u8", "code", Map.of(), Priority.NORMAL));
        } catch (IllegalArgumentException e) {
            threw = true;
        }
        check("service: a template mistake throws instead of sending a broken message", threw);
        check("service: events are logged", log.lines().stream().anyMatch(l -> l.contains("giving up on email")) && log.lines().stream().anyMatch(l -> l.contains("delivered")));
    }
}
`,
      },
    ],
    expectedOutput: [
      "INFO  app.web - request handled {ms=12, user=alice}",
      "WARN  app.db.pool - connection pool is nearly full",
      "DEBUG app.db.pool - now visible: app.db.pool inherits DEBUG from app.db",
      "message built while debug was off: false",
      "{\"time\":5000,\"level\":\"ERROR\",\"logger\":\"app\",\"message\":\"said \\\"hi\\\"\\nand left\",\"context\":{\"path\":\"C:\\\\temp\",\"user\":\"bob\"}}",
      "lines written with BLOCK: 4000, dropped: 0",
      "lines written with DROP: 3, dropped: 7",
      "healthy appender got 2 lines, failures counted: 2",
      "virtual time spent waiting: 300 ms",
      "dead email: DeliveryResult[userId=frank, delivered=true, channel=sms, attempts=1, reason=]",
      "dave, normal at 23:00: DeliveryResult[userId=dave, delivered=false, channel=null, attempts=0, reason=quiet hours]",
      "template error: template welcome needs: app",
      "nothing works: DeliveryResult[userId=gina, delivered=false, channel=null, attempts=0, reason=every channel failed]"
    ],
  },
};
