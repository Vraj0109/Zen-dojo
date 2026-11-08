import type { LldDeep } from "./types";

// Walkthrough, diagrams and concurrency notes for the logger and notification project in lld-projects-b-log.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const LLD_DEEP_B_LOG: Record<string, LldDeep> = {
  "lldp-logger-notifications": {
    walkthrough: [
      {
        title: "Two problems with one shape: events go in, many outputs come out",
        body: `A logger and a notification system look different but have the same shape. Something happens in the program. A small piece of code decides whether anyone cares. Then the event is formatted and sent to one or more destinations, any of which can be slow or broken. Interviewers ask about both together because the design questions repeat: how do you add a destination without touching the sender, how do you keep a slow destination from slowing the program, and how do you keep one failing destination from breaking the rest.

Clarify before you draw. For the logger: which levels, whether levels can differ per area of the code, which destinations (console, file, a remote collector), which formats (plain text, JSON), and whether logging may ever block the application. For the notification system: which channels (email, SMS, push), whether users choose their own channels and order, what happens when a channel fails, whether messages are templated, and whether some messages (a security alert) may break the user's quiet hours.

Then decide what is out of scope. Writing to a real file with rotation, a real email provider and a persistent queue are all separate topics. Here every destination sits behind a small interface and the project includes in-memory versions, so the design is complete and the tests are fast. State that choice in the first two minutes; it tells the interviewer you know where the interesting part is.`,
      },
      {
        title: "The logger: four small ideas",
        body: `Level is an enum ordered by importance, so the question "is this message serious enough?" is a single comparison, atLeast. A Logger is cheap and does only three things: check the level, build a LogRecord, hand it on. The check comes first. A disabled debug line therefore costs one comparison, which matters because debug calls sit inside loops. For calls where building the message is expensive, log(level, Supplier) takes a lambda that is only run when the level is enabled. Main shows it: a message built while debug is off is never built.

LogRecord is a record, frozen at creation. It captures the time when the event happens, not when it is written. This matters the moment an async queue sits in between, because a record can wait there for a while and must still carry the time of the event. The constructor copies the context map, so a caller that changes its own map afterwards cannot alter a record that is already queued.

LogManager owns the configuration and hands out loggers by name. Names are dotted like packages. A logger with no level of its own uses the nearest parent that has one, so setLevel("app.db", DEBUG) turns on debug output for app.db.pool, app.db.query and everything below, and leaves app.web alone. Walking up the name is a small loop that strips the last dot-part until it finds an entry or reaches the root.

Formatting and destination are separate. A Formatter turns a record into text; an Appender decides where the text goes and which formatter it uses. That keeps "JSON to the console" and "plain text to memory" as combinations of two small classes, not four classes. If you remember one sentence from this section, make it that one.`,
      },
      {
        title: "Appenders: observer, isolation and the async decorator",
        body: `The set of appenders is the Observer pattern. The manager holds a list, and every record is sent to each one. The code that logs knows nothing about destinations, and adding a destination is one line at startup. The list is a CopyOnWriteArrayList, which is the right choice here: reads (every log call) vastly outnumber writes (adding an appender at startup), and iterating it never needs a lock.

The most important rule is isolation. The manager wraps each appender call in try and catch and only counts failures. A full disk or a dead network connection must never crash the application that merely wanted to write a line, and must never stop the other appenders from seeing the record. Main attaches an appender that always throws next to a healthy one and shows that the healthy one still receives both lines. The counter is how an operator would find out something is wrong.

AsyncAppender is a decorator: it implements Appender and wraps another Appender. It moves the slow part off the calling thread. The caller puts the record on a bounded queue and returns, and one worker thread takes records off and hands them to the real appender. The queue is bounded on purpose. If the target is slower than the callers, an unbounded queue grows until memory runs out. A bounded queue forces a decision when it fills, and the decision is the Overflow policy: DROP never blocks the application and counts what it threw away, BLOCK loses nothing but lets a slow log slow the application. Main runs both: four threads write four thousand lines through a small BLOCK queue and none are lost, and a stalled target with a DROP queue of two keeps exactly three of ten records and counts seven drops.

Shutting down needs care. close() stops accepting records, puts a stop marker behind everything already queued, waits for the worker, then closes the target. The records queued before the marker are written first, so nothing accepted is lost.`,
      },
      {
        title: "Notifications: render, decide, deliver",
        body: `A notification passes through three stages, and each stage is a different class so each can change on its own.

Render. A Notification is a template name plus values, not text. TemplateEngine fills the placeholders and is strict on purpose: an unknown template or a missing value throws an IllegalArgumentException that names the problem. Sending "Hi {name}, your code is {code}" to a customer is worse than a failed test, so a mistake in the template is a bug that must fail loudly. The engine also uses Matcher.quoteReplacement, so a value that contains a dollar sign or a backslash is treated as plain text and not as a regex instruction. That is a classic bug and a good thing to mention.

Decide. UserPreferences holds the channels in the order the person wants, the channels they have muted, and quiet hours. Quiet hours are a window of hours that may cross midnight (22 to 7), so isQuiet has two branches: a normal window and a wrapped one. The priority decides what the window means: LOW and NORMAL wait, URGENT does not. Say what "wait" means in your design. Here a quiet-hours message is reported as not delivered with the reason; a production system would put it on a delayed queue and send it when the window ends, which is a good follow-up.

Deliver. Channel is a Strategy: name and send. NotificationService walks the preferred channels in order, skips muted or unknown ones, and tries each. Adding Slack means one class and one entry in the channel map. The service never constructs a channel itself; they are passed in, so tests give it InMemoryChannel objects that can be told to fail a number of times.`,
      },
      {
        title: "Retry, backoff and fallback",
        body: `Delivery fails often in real systems, and the failures come in two kinds that need different treatment. A transient failure (a timeout, a provider that is briefly down) is worth retrying. A permanent one (a bad template, an unknown template) is a bug and retrying only repeats it. The code draws that line with types: a channel throws DeliveryException for the first kind, which the service catches and retries, while IllegalArgumentException from the template engine is not caught and surfaces at once.

Retrying immediately usually fails again for the same reason, so the service waits between attempts and the wait grows: 100 ms, then 200 ms, then 400 ms, written as baseBackoff shifted left by the attempt number. This is exponential backoff. A real system adds random jitter so that many clients do not retry in step and hit a recovering provider all at once; say so, and say where it would go.

The waiting is a Sleeper, a one-method interface. Production passes Thread::sleep. Tests and Main pass time::advance, which moves a ManualTime forward. The retry logic runs instantly, and the clock still shows that 300 ms of waiting happened, which the test checks. It is the same trick as injecting the clock, applied to waiting.

When a channel keeps failing after the allowed attempts, the service gives up on it and moves to the next channel the user prefers. That is fallback. The outcome is a DeliveryResult, not an exception, because an unreachable user is a normal event for a notification system. The result says which channel finally delivered, how many attempts it took, and, if nothing worked, why in words a support person can read.`,
      },
      {
        title: "Using the logger inside the notifier",
        body: `NotificationService takes a Logger and writes a line for every meaningful step: delivered, a failed attempt, giving up on a channel, skipped during quiet hours, not delivered. The two halves of this project meet here, and that is a design point worth making. The notifier depends on the Logger class and nothing about where logs go. In Main the logger is set to WARN, so the routine delivered lines are hidden and only the failures appear, with their virtual timestamps, which makes the retry sequence readable: 0 ms, 100 ms, then 300 ms.

Notice what is not logged: the message text. A message may contain a one-time code or personal data, and a log is often copied to places with weaker access rules. The log line carries the user id, the channel and the attempt number, which is enough to debug delivery without leaking content. Mentioning this unprompted is the kind of detail that stands out.

Notice also that logging is itself a reason to isolate failures. If the log appender throws, the manager catches it, so a broken log can never turn a successful delivery into an exception. Each layer protects the one above it.

If the interviewer asks for an audit trail ("prove we sent this"), that is a different requirement from logging: it needs durable storage and cannot be dropped, so it would not use the DROP policy. Naming the difference between diagnostic logs (best effort) and audit records (must not be lost) shows judgement.`,
      },
      {
        title: "Concurrency and scale",
        body: `Which parts are shared between threads? The manager's configuration is read on every call and written rarely, so levels live in a ConcurrentHashMap and the appenders in a CopyOnWriteArrayList. The logger lookup uses computeIfAbsent, so two threads asking for the same name get the same Logger. ConsoleAppender and MemoryAppender are synchronized because a line, or a list append, must not interleave with another thread's. AsyncAppender is the only class with its own thread, and it communicates through the blocking queue, which is thread-safe by design.

The tests check the properties that must always hold and not exact orders: four threads each write a few hundred lines through a queue of eight with the BLOCK policy and exactly two thousand lines arrive, none dropped. The DROP test makes the queue state predictable on purpose, with a target that stays busy until a latch opens, so the numbers (three kept, seven dropped) are exact and not a race.

NotificationService itself holds no mutable state, so many threads can call notify at once. The only shared mutable thing is a channel, and channels own their own thread safety (InMemoryChannel synchronizes its counters).

At larger scale the notification side becomes a pipeline. Callers put notifications on a durable queue and return at once. Workers take them off, render, apply preferences and deliver, and a failed delivery goes back on a retry queue with a delay instead of sleeping in a worker thread. The class design in this project survives that move: the queue sits in front of NotificationService, the channels become clients of real providers, and the Sleeper is replaced by the queue's own delay.`,
      },
      {
        title: "Follow-ups to expect, and the tests behind this design",
        body: `For the logger: per-appender level filters (errors to a pager, everything to a file); log rotation by size or by day; a MDC-style context that is attached to every record from the current request automatically (a ThreadLocal map, with a warning about thread pools); sampling, so only one in a hundred debug lines is written; structured logging with typed fields; and masking of secrets. For the notifications: batching ("you have 5 new comments" instead of five emails); deduplication with an idempotency key so a retried request does not send twice; per-user rate limits (the rate limiter problem plugs in directly); delivery receipts and bounces; and scheduled sends.

For each, say which class changes. Most are a new Appender, a new Formatter, a new Channel or a decorator around an existing one, and the facade classes stay as they are. That is the whole benefit of the structure.

The Tests class has 42 checks. Levels: ordering, the default, inheritance from the nearest parent, and that a disabled message is never built. Formatters: the exact plain and JSON output, escaping of quotes, newlines, backslashes, tabs and control characters, and that the record copies its context. Appenders: isolation of a failing one, each appender using its own formatter, and the copy returned by the memory appender. Async: no loss under BLOCK, the exact drop count under DROP, a record after close, a failing target, and bad arguments. Templates: placeholders, dollar signs and backslashes in values, and both error cases. Preferences: quiet hours that cross midnight, inside one day, and none. Service: first-channel delivery, retry count and the 300 ms of backoff, fallback, muted channels, no usable channel, total failure, quiet hours with a normal and an urgent message, a template mistake, and the log lines.

If you can write only one test in an interview, make it the isolation test: attach an appender that throws, log twice, and check that the healthy appender saw both lines. It protects the property that matters most in production.`,
      },
    ],
    classDiagram: `classDiagram
    class Logger {
        +log(Level, String, Map) void
        +log(Level, Supplier) void
        +isEnabled(Level) boolean
    }
    class LogManager {
        +getLogger(String) Logger
        +setLevel(String, Level) void
        +addAppender(Appender) void
        +effectiveLevel(String) Level
        +dispatch(LogRecord) void
    }
    class LogRecord {
        <<record>>
        long time
        Level level
        String logger
        String message
        Map context
    }
    class Formatter {
        <<interface>>
        +format(LogRecord) String
    }
    class PlainFormatter
    class JsonFormatter
    class Appender {
        <<interface>>
        +append(LogRecord) void
        +close() void
    }
    class ConsoleAppender
    class MemoryAppender
    class AsyncAppender
    class NotificationService {
        +notify(Notification) DeliveryResult
    }
    class Channel {
        <<interface>>
        +name() String
        +send(String, String) void
    }
    class InMemoryChannel
    class TemplateEngine
    class UserPreferences
    class Notification {
        <<record>>
    }
    class DeliveryResult {
        <<record>>
    }
    class Sleeper {
        <<interface>>
    }
    Logger --> LogManager
    LogManager o-- Appender : many
    Logger ..> LogRecord : creates
    Formatter <|.. PlainFormatter
    Formatter <|.. JsonFormatter
    Appender <|.. ConsoleAppender
    Appender <|.. MemoryAppender
    Appender <|.. AsyncAppender
    AsyncAppender o-- Appender : wraps
    ConsoleAppender --> Formatter
    MemoryAppender --> Formatter
    Channel <|.. InMemoryChannel
    NotificationService --> Channel
    NotificationService --> TemplateEngine
    NotificationService --> UserPreferences
    NotificationService --> Sleeper
    NotificationService --> Logger
    NotificationService ..> Notification : takes
    NotificationService ..> DeliveryResult : returns`,
    sequenceDiagram: `sequenceDiagram
    participant S as NotificationService
    participant E as email Channel
    participant M as sms Channel
    participant L as Logger
    participant Z as Sleeper
    S->>E: send(user, text)
    E-->>S: DeliveryException
    S->>L: warn attempt 1 failed
    S->>Z: sleep 100 ms
    S->>E: send(user, text)
    E-->>S: DeliveryException
    S->>L: warn attempt 2 failed
    S->>Z: sleep 200 ms
    S->>E: send(user, text)
    E-->>S: DeliveryException
    S->>L: warn giving up on email
    S->>M: send(user, text)
    M-->>S: ok
    S->>L: info delivered via sms`,
    extraDiagrams: [
      {
        title: "From log call to output",
        caption: "The cheap level check comes first. A broken appender is isolated from the rest.",
        source: `flowchart TD
    A["logger.info(message)"] --> B{"Level at least the effective level?"}
    B -- no --> X["Return: nothing built, nothing written"]
    B -- yes --> C["Create LogRecord with the time now"]
    C --> D["manager.dispatch(record)"]
    D --> E["Appender 1: console, plain text"]
    D --> F["Appender 2: async queue, then file as JSON"]
    D --> G["Appender 3: throws"]
    G --> H["Caught: failure counter goes up, other appenders unaffected"]`,
      },
      {
        title: "Async appender and its overflow policy",
        caption: "The bounded queue is the safety valve. What happens when it is full is a policy, not an accident.",
        source: `flowchart LR
    T1["Thread 1"] --> Q["Bounded queue"]
    T2["Thread 2"] --> Q
    Q --> W["Worker thread"]
    W --> S["Slow target: disk or network"]
    Q -. full .-> P{"Overflow policy"}
    P -- DROP --> D["Throw away and count"]
    P -- BLOCK --> B["Caller waits for space"]`,
      },
      {
        title: "Notification decision flow",
        caption: "Each box is a small rule. Quiet hours first, then the channels in the user's order, with retry and fallback.",
        source: `flowchart TD
    A["notify(notification)"] --> B["Render template: error if a value is missing"]
    B --> C{"Quiet hours and not urgent?"}
    C -- yes --> Q["Not delivered: quiet hours"]
    C -- no --> D["Next preferred channel that exists and is not muted"]
    D -- none left --> N["Not delivered: no usable channel or every channel failed"]
    D --> E["Try to send"]
    E -- ok --> OK["Delivered: channel and attempt count"]
    E -- fails --> F{"Attempts left?"}
    F -- yes --> G["Wait 100, 200, 400 ms, then retry"]
    G --> E
    F -- no --> D`,
      },
    ],
    concurrency: [
      "Levels live in a ConcurrentHashMap and appenders in a CopyOnWriteArrayList: log calls read them constantly, configuration changes are rare.",
      "ConsoleAppender and MemoryAppender are synchronized so one record is written as a unit and lines never interleave.",
      "AsyncAppender hands records to one worker through a bounded blocking queue. DROP never blocks the caller and counts losses; BLOCK loses nothing.",
      "close() puts a stop marker behind the queued records, so everything accepted is written before the worker ends.",
      "NotificationService keeps no mutable state, so many threads can call it at once. Channels own their own thread safety.",
      "Time and waiting are injected (TimeSource, Sleeper), so retries, backoff and quiet hours are tested without sleeping.",
    ],
  },
};
