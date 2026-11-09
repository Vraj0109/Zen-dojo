import type { LldDeep, LldExtra, LldGuide } from "./types";

// Guide, recap, walkthrough and diagrams for the key-value store project in lld-projects-d-kv.ts.
// Rules: no backticks or dollar-brace in the text (template literals), quote every Mermaid node label,
// no semicolons or hash signs in diagram text.

export const KV_GUIDE: LldGuide = {
  requirements: [
    "get, put, delete, scan by prefix, with a time to live (TTL) per key.",
    "Atomic operations: putIfAbsent, compareAndSet, incr. Many threads at once without lost updates.",
    "Snapshots: a frozen, consistent view that does not change while the store moves on.",
    "Transactions: read and write several keys, commit all or nothing, detect conflicts, retry.",
    "Durability by a write-ahead log and recovery by replay. Watchers that are told about changes.",
  ],
  entities: [
    "KvStore (versions per key, one commit counter, read-write lock), Version (commit, value, expiresAt), Mutation",
    "Snapshot (frozen commit and time), Transaction (read set, write buffer, optimistic commit), CommitResult",
    "Wal and LogRecord, WatchEvent, TimeSource",
  ],
  patterns: [
    "MVCC: a write adds a version, a read picks the newest version at or before a commit number",
    "Optimistic concurrency control: validate at commit, first committer wins",
    "Write-ahead log: durable first, visible second",
    "Lazy expiry plus compaction; observer for watchers",
  ],
  code: `record Version(long commit, String value, long expiresAt) { boolean deleted() { return value == null; } }

final class KvStore {
  private final TreeMap<String, List<Version>> data = new TreeMap<>();
  private long commit;                      // number of the latest commit

  private static Seen visible(List<Version> versions, long atCommit, long atTime) {
    for (int i = versions.size() - 1; i >= 0; i--) {
      Version v = versions.get(i);
      if (v.commit() > atCommit) continue;  // too new for this reader
      boolean expired = v.expiresAt() != 0 && v.expiresAt() <= atTime;
      return new Seen(v.deleted() || expired ? null : v.value(), v.commit());
    }
    return new Seen(null, 0);
  }

  CommitResult commitTransaction(long readCommit, Map<String, Long> reads, Map<String, Mutation> writes) {
    lock.writeLock().lock();
    try {
      for (String key : reads.keySet()) if (latestCommit(key) > readCommit) return CommitResult.CONFLICT;
      for (String key : writes.keySet()) if (latestCommit(key) > readCommit) return CommitResult.CONFLICT;
      commitLocked(writes);                 // one commit number for the whole batch
      return CommitResult.COMMITTED;
    } finally { lock.writeLock().unlock(); }
  }
}`,
  extensions: [
    "Persistence on disk: a log file with fsync, periodic snapshots to a file, and a log that is truncated after a snapshot.",
    "A background thread for expiry and compaction instead of calling them by hand.",
    "A size limit with eviction (LRU) for a cache use of the same store.",
    "Replication: ship the log to followers, which apply it in commit order.",
  ],
};

export const KV_EXTRA: LldExtra = {
  recap: [
    "MVCC: a write never changes a value, it appends a Version with the next commit number. A read at commit N takes the newest version with commit at most N.",
    "Snapshots are just a remembered N (and the time). Transactions read from a snapshot, buffer writes, and at commit check that no key they read or wrote has a newer commit.",
    "TTL is an absolute expiry time on a version. Expired means invisible; compaction later removes what no snapshot can see.",
    "The log is written before the change becomes visible, so replaying it rebuilds the store, including absolute expiry times and commit numbers.",
  ],
  flow: [
    "put(a, 1): under the write lock, number = commit + 1, a LogRecord goes to the WAL, a Version(number, 1, 0) is appended to the key's list, and commit becomes number.",
    "snapshot(): registers the current commit number (and time) so compaction keeps the versions it can see.",
    "put(a, 2) happens. The snapshot still reads a = 1, because version 2 has a commit number above the snapshot's.",
    "A transaction begins at commit N, reads x and y from the snapshot at N and writes x. Another thread commits a write to y first.",
    "At commit, y has a commit number above N, so the transaction is refused with CONFLICT. It retries from a new snapshot and succeeds.",
  ],
  edgeCases: [
    "A key that expires exactly at its time, a put without TTL that removes an old TTL, an expired key that counts as absent for putIfAbsent.",
    "Snapshot taken before an expiry (still alive in the snapshot), compaction with an open snapshot, deleted and expired keys removed completely.",
    "Two writers of one key; write skew (two readers each write what the other read); a blind write against a newer commit; a read-only transaction.",
    "A transaction used after commit, closed without commit, a batch that must be seen all or nothing.",
    "Eight threads incrementing one counter; six threads transferring money while an auditor takes snapshots.",
  ],
};

export const KV_DEEP: Record<string, LldDeep> = {
  "lldp-kv-store": {
    walkthrough: [
      {
        title: "What to clarify first",
        body: `A key-value store sounds like a hash map, and the interview is about what you add to the hash map. The basic version is get, put and delete. The questions that matter are: what happens when many threads use it, what does a reader see while a writer is working, how do keys expire, and can I change several keys together and have all or none of it happen?

Ask about the API. Are values strings or bytes? Is there a scan by prefix? Is there a time to live per key? Which atomic operations are needed (increment, compare and set, set if absent)? Ask about consistency. Do I need a consistent view of many keys while others write (snapshots)? Do I need transactions, and with what rules when two of them collide? Ask about durability: must it survive a restart, and how fast must the recovery be? Ask about size: does it fit in memory, and is there eviction? Ask who needs to be told about changes.

The requirements we fix are in the guide above. The key design decision is multi-version concurrency control, MVCC. A write never overwrites. It adds a new version of the key with the next commit number. A read says what the store looked like at commit N, and takes the newest version with a commit number of N or less. With that one idea, snapshots, transactions and lock-free reads of old data stop being separate features. State that choice early, and the rest of the answer follows from it.

Say what is out of scope: disk files and replication. They are extensions, and the log is where they would start.`,
      },
      {
        title: "Versions and the commit counter",
        body: `Each key maps to a list of Versions, oldest first. A Version is a record of a commit number, a value and an expiry time. A delete is a version with a null value, a tombstone, so an older reader still finds the value that was there before. The store has one counter, the number of the latest commit, and every change takes the next number. A batch of several keys takes one number, so a reader at a number sees the whole batch or none of it.

Reading is one function, visible(versions, atCommit, atTime). It walks the list from the newest version down and skips versions with a commit number above atCommit. The first one it meets is the answer: if it is a tombstone or has expired at atTime, the key is absent; otherwise its value is the result. It also returns the commit number of the version it found, which transactions use later. Notice that the reader does not look at older versions after it has found the right one, so an expired or deleted version hides everything below it.

get uses the latest commit number and the current time. scan(prefix) uses the same function over a sorted map, which is a TreeMap, so a prefix scan is a range lookup that starts at the prefix and stops at the first key that no longer starts with it, and the results come out in key order.

All of this runs under a read-write lock. Reads share it, and a write takes it exclusively just for the short time of appending versions. Readers of old versions never need to wait for a long write, because a write is not long: it appends to lists. The costs of MVCC are memory (old versions pile up) and the need to clean up, which is compaction.`,
      },
      {
        title: "Expiry (TTL)",
        body: `A key can have a time to live. put(key, value, ttl) stores an absolute expiry time, the time of the write plus the ttl, in the version. A version with an expiry at or before the current time is invisible. The comparison is the point: at exactly the expiry time the key is gone, and one millisecond before it is still there, and the test pins both. ttl(key) reports the remaining time, and is empty for a key without expiry or one that is gone.

Expiry is lazy. Nothing runs in the background to delete expired keys. They are simply ignored by every read, and compact() removes them for good. This is the same trade as in the other lease-like designs: no thread to manage, tests that need no sleeping, and the cost is memory for dead keys until a compaction. A real store also runs compaction on a timer, and an interviewer may ask about sampling keys with an expiry, which is how some caches do it.

Two details matter. A new put without a ttl replaces the version and so removes the expiry, because the newest version is the only one that counts. And an expired key counts as absent for putIfAbsent and compareAndSet, since they read through the same visibility function: putIfAbsent on an expired key succeeds.

The time comes from an injected TimeSource, so every test moves a ManualClock. Snapshots also remember the time they were taken: a key that was alive when the snapshot was created stays visible in it, even after the clock has passed the expiry. A snapshot is a frozen picture, and a picture where keys vanish by themselves would not be one.

Absolute times also make recovery simple: the log records the expiry time, not the ttl, so a replay at a later time gives the right answer.`,
      },
      {
        title: "Atomic operations and the lock",
        body: `Several operations are read, decide and write, and they must be one step. putIfAbsent sets a value only when the key is absent. compareAndSet sets it only when the current value is the expected one, and null means absent. incr adds a number to a value stored as text. If these were written as a get followed by a put, two threads could both read the old value and both write, and one update would be lost.

The store does each of them inside the exclusive lock: read the current value, decide, and commit, all before the lock is released. The tests are the ones to show. Eight threads each increment one counter 500 times and the result is exactly 4000. Sixteen threads compare-and-set one slot from free to their own name and exactly one wins. incr on a value that is not a number returns an empty result and changes nothing, which is better than throwing for something a user can cause.

Why a lock and not compare-and-set on an atomic reference? The value is in a list inside a sorted map, and an operation sometimes reads one key and writes the same key under one commit number. A lock around it is correct and simple, and the critical section is a few lookups. Say what the alternative is: striped locks by key hash, or a concurrent skip list with atomic references, which allow writers on different keys to run in parallel, at the cost of a harder design for batches and the commit counter.

The notifications are not sent under the lock. A change adds its watch events to a pending list while the lock is held, and they are delivered after it is released. A slow watcher therefore cannot hold up the store. The order of events for a key stays right because the events are queued in commit order.`,
      },
      {
        title: "Snapshots and compaction",
        body: `A snapshot is a remembered commit number and a remembered time. snapshot() records them and returns an object with get and scan that call the same visibility function with those two values. Nothing is copied, so taking a snapshot costs almost nothing, and holding one costs memory only for the old versions that it keeps alive. The test: take a snapshot, then change a key, delete another and add a third, and the snapshot still sees the old state while the store sees the new one.

The store must know which versions are still needed. It keeps a count of open snapshots per commit number. Snapshot implements AutoCloseable, so a try-with-resources block releases it, and closing twice is harmless.

compact() removes what nobody can see. The oldest open snapshot, or the latest commit if there is none, is the oldest number any reader could use. For each key, versions older than the newest one at or below that number are unreachable and are dropped, but that newest one is kept, since the snapshot reads it. A key whose only remaining version is a tombstone or an expired value, and which is older than every reader, is removed completely. With a snapshot open at commit 10 and five more puts, compaction keeps the version the snapshot sees and removes the nine before it. After the snapshot is closed, the next compaction removes the rest and only the newest version stays.

The danger to name is a snapshot that is never closed: it holds every version created after it, so memory grows with the write rate. Production systems put a time limit on snapshots and transactions, or report the oldest one in a metric.

Because a snapshot is a number, it is also the base of the next feature.`,
      },
      {
        title: "Optimistic transactions",
        body: `A transaction groups reads and writes so that they happen together or not at all, without locking anything while it runs. begin() takes a snapshot, so all of its reads see the store as of that moment. It keeps two things. A read set: for each key it read, the commit number of the version it saw. A write buffer: the changes it wants to make. get first looks in the write buffer, so a transaction sees its own writes, and then in the snapshot. Nobody else sees the buffered writes before the commit.

At commit, the store takes the exclusive lock and validates. For every key in the read set and the write buffer, the newest commit number in the store must be at most the transaction's start. If any key has a newer version, somebody else changed it after this transaction began, and the commit is refused with CONFLICT and applies nothing. Otherwise the whole buffer is committed under one commit number. This is optimistic concurrency control with first committer wins: transactions run without locks and pay only when they collide, which is the right trade when conflicts are rare.

Validating the reads, and not only the writes, matters. The classic example is two doctors who must not both be off call. Each reads that the other is on call and then marks themselves off. Their writes touch different keys, so a check of writes alone lets both commit and leaves nobody on call. With the read set validated, the second commit finds that the key it read has changed and is refused. The test runs exactly this.

A transaction that only reads always commits, because it saw one consistent snapshot and changed nothing. A loser retries with a fresh transaction on the new values, and the test does it. A finished transaction throws if used again, and closing one without committing is a rollback, so try-with-resources cannot leak it.`,
      },
      {
        title: "The log, recovery and watchers",
        body: `A store in memory loses everything when the process ends. The write-ahead log fixes that with one rule: write the change to the log before making it visible. commitLocked first builds LogRecords (the commit number, key, value and absolute expiry time) and appends them to the Wal, and only then adds the versions and moves the commit counter. If the process dies after the append and before the change becomes visible, recovery still has it. If it dies before the append, the change was never promised to anyone.

Wal is an interface, with an in-memory implementation here. A real one writes to a file and calls fsync, which is the expensive step, and a common optimisation is group commit: several writers share one fsync. KvStore.recover(clock, wal) rebuilds a store by replaying the records in order, adding versions and setting the counter to the highest commit number. It does not log the replay again. The test checks that the content, the commit number and the expiry all survive, and that a recovered store goes on logging with the next number. To keep the log from growing for ever, a real system writes a snapshot of the whole state sometimes and truncates the log up to that point.

Watchers are an Observer. watch(prefix, listener) registers interest in keys that start with a prefix. Each committed change creates an event with the key, the old value and the new value (null for absent), and the event is delivered after the lock has been released. A delete shows as a change to null, and a transaction produces one event per key it wrote. The test lists them in order.

The log also gives replication: a follower that applies the same records in the same order has the same state. That is why the commit number is a single sequence.`,
      },
      {
        title: "The main flow, concurrency and what interviewers probe",
        body: `Run Main and follow it. Basic puts, gets and a prefix scan. putIfAbsent succeeds once and then fails, and compareAndSet works with the right expected value only. incr gives 1, then 6, and refuses on text. A session key with a 1000 ms ttl has 600 ms left after 400 and is gone at 1000. A snapshot sees both users while the store sees one changed and one deleted. Ten versions exist, compaction removes three while the snapshot is open and three more after it is closed. Two transactions both change the balance: the first commits and the second gets CONFLICT, so the balance is 70. A transaction that is closed without commit leaves nothing behind. A store rebuilt from the log has the same content and the same commit number, 11 of 11, and the watcher saw four events.

The last test is the one to remember. Six threads make 1800 random transfers between five accounts, each transfer a transaction that retries on conflict, while an auditor thread repeatedly takes a snapshot and adds up all balances. The total must be exactly 5000 at the end, and the auditor must never see any other total, because a snapshot sees a batch entirely or not at all. That is atomicity and isolation together, in a test.

Extensions: a size limit with eviction (an LRU over keys) turns the store into a cache; a background thread for compaction and expiry; replication of the log; a file-based log with fsync and checkpoints; secondary indexes as extra keys written in the same transaction; range deletes.

Probes, with short answers. Why MVCC and not read locks? Readers never block writers and snapshots are free. What is the cost? Memory for old versions and the need to compact. Why validate reads? Without it, write skew is possible. Why not pessimistic locks? They fit high conflict, and they bring deadlock handling. What does snapshot isolation allow that serializable does not? Write skew. How would you make it faster? Stripe the lock by key, batch log writes, and keep versions in arrays. What happens to a long transaction? It holds old versions, and probably conflicts, so limit its age.`,
      },
    ],
    classDiagram: `classDiagram
    class KvStore {
        +get(key) Optional
        +put(key, value)
        +put(key, value, ttlMillis)
        +delete(key) boolean
        +putIfAbsent(key, value) boolean
        +compareAndSet(key, expected, value) boolean
        +incr(key, delta) OptionalLong
        +ttl(key) OptionalLong
        +scan(prefix) Map
        +snapshot() Snapshot
        +begin() Transaction
        +compact() int
        +watch(prefix, listener)
        +recover(clock, wal)$ KvStore
    }
    class Version {
        <<record>>
        commit
        value
        expiresAt
    }
    class Snapshot {
        +get(key) Optional
        +scan(prefix) Map
        +close()
    }
    class Transaction {
        reads
        writes
        +get(key) Optional
        +put(key, value)
        +delete(key)
        +commit() CommitResult
        +rollback()
    }
    class Wal {
        <<interface>>
        +append(records)
        +records() List
    }
    class LogRecord {
        <<record>>
        commit
        key
        value
        expiresAt
    }
    class WatchEvent {
        <<record>>
        key
        oldValue
        newValue
    }
    class TimeSource {
        <<interface>>
        +nowMillis() long
    }
    KvStore --> Version
    KvStore --> Wal
    KvStore --> TimeSource
    KvStore ..> WatchEvent
    KvStore ..> Snapshot
    KvStore ..> Transaction
    Wal <|.. InMemoryWal
    Wal --> LogRecord
    Snapshot --> KvStore
    Transaction --> KvStore`,
    sequenceDiagram: `sequenceDiagram
    participant T1 as Transaction one
    participant T2 as Transaction two
    participant S as KvStore
    participant W as Wal
    T1->>S: begin() at commit 5
    T2->>S: begin() at commit 5
    T1->>S: get(balance) sees commit 3
    T2->>S: get(balance) sees commit 3
    T1->>S: commit with write balance = 70
    S->>S: lock, latest commit of balance is 3, not above 5
    S->>W: append LogRecord commit 6
    S->>S: add Version, commit counter = 6
    S-->>T1: COMMITTED
    T2->>S: commit with write balance = 50
    S->>S: lock, latest commit of balance is 6, above 5
    S-->>T2: CONFLICT, nothing applied`,
    stateDiagram: `stateDiagram-v2
    [*] --> Active: begin, snapshot taken
    Active --> Committed: commit validated
    Active --> Conflict: a read or written key has a newer commit
    Active --> RolledBack: rollback or close without commit
    Committed --> [*]
    Conflict --> [*]
    RolledBack --> [*]`,
    extraDiagrams: [
      {
        title: "A key with its versions",
        caption: "A reader takes the newest version whose commit number is not above its own. A tombstone hides older versions.",
        source: `flowchart LR
    K["key user:1"] --> V1["commit 3: asha"]
    V1 --> V2["commit 7: asha2"]
    V2 --> V3["commit 9: deleted"]
    R1["Reader at commit 5"] -.-> V1
    R2["Reader at commit 8"] -.-> V2
    R3["Reader at commit 12"] -.-> V3`,
      },
      {
        title: "How visible picks the answer",
        caption: "From the newest version down, skip the ones that are too new, then decide on the first one left.",
        source: `flowchart TD
    A["visible(versions, atCommit, atTime)"] --> B["Next version from the newest"]
    B --> C{"commit above atCommit?"}
    C -- yes --> B
    C -- no --> D{"Tombstone?"}
    D -- yes --> X["Absent"]
    D -- no --> E{"expiresAt set and at or before atTime?"}
    E -- yes --> X
    E -- no --> V["The value, with this commit number"]`,
      },
      {
        title: "Snapshot isolation in a timeline",
        caption: "The snapshot keeps seeing commit 2 while commits 3 and 4 happen.",
        source: `sequenceDiagram
    participant W as Writer
    participant S as KvStore
    participant N as Snapshot at commit 2
    W->>S: put a = 1, commit 1
    W->>S: put b = 2, commit 2
    N->>S: snapshot() remembers commit 2
    W->>S: put a = changed, commit 3
    W->>S: delete b, commit 4
    N->>S: get(a)
    S-->>N: 1
    N->>S: get(b)
    S-->>N: 2`,
      },
      {
        title: "Write skew and why reads are validated",
        caption: "Each doctor writes a different key, so only the read set can reveal the clash.",
        source: `sequenceDiagram
    participant A as Alice transaction
    participant B as Bob transaction
    participant S as KvStore
    A->>S: get(bob) = on
    B->>S: get(alice) = on
    A->>S: put alice = off
    B->>S: put bob = off
    A->>S: commit: bob unchanged, alice unchanged
    S-->>A: COMMITTED
    B->>S: commit: alice changed after begin
    S-->>B: CONFLICT, bob stays on call`,
      },
      {
        title: "What compaction keeps",
        caption: "Versions older than the newest one a snapshot can see are unreachable. That newest one stays.",
        source: `flowchart TD
    A["Oldest open snapshot at commit 10"] --> B["Versions v0 to v9: commits 1 to 10"]
    B --> C["Keep v9, the newest at or below 10"]
    B --> D["Drop v0 to v8"]
    A --> E["Versions v10 to v14: newer than the snapshot"]
    E --> F["Keep all"]
    G["Key whose only version is a tombstone or expired, older than every reader"] --> H["Remove the key"]`,
      },
      {
        title: "Write-ahead log and recovery",
        caption: "The log is written before the change is visible, so replaying it gives back the same state.",
        source: `flowchart LR
    W["commitLocked"] --> L["1. append LogRecords to the Wal"]
    L --> V["2. add Versions, move the commit counter"]
    V --> N["3. queue watch events"]
    R["recover(clock, wal)"] --> P["Replay records in order"]
    P --> S["Same versions, same commit number, same absolute expiry times"]`,
      },
      {
        title: "Object snapshot after a few operations",
        caption: "Two keys, one with a history. One open snapshot holds commit 2.",
        source: `flowchart LR
    ST["KvStore: commit 4"] --> A["a: v1 at commit 1, v2 at commit 3"]
    ST --> B["b: v1 at commit 2, tombstone at commit 4"]
    ST --> OS["Open snapshots: commit 2 held once"]
    ST --> WL["Wal: 4 records"]
    ST --> WA["Watch: prefix user:"]`,
      },
      {
        title: "Where the extensions attach",
        caption: "Each follow-up question lands in one place.",
        source: `flowchart TD
    X["Follow-up questions"] --> D["Disk persistence"]
    X --> E["Eviction"]
    X --> R["Replication"]
    X --> I["Secondary indexes"]
    X --> B["Background compaction"]
    D --> D1["Wal writes a file with fsync, checkpoints truncate it"]
    E --> E1["LRU order over keys, evict the oldest on size"]
    R --> R1["Ship LogRecords to followers in commit order"]
    I --> I1["Extra keys written in the same transaction"]
    B --> B1["Timer calls compact and an expiry sweep"]`,
      },
    ],
    concurrency: [
      "One ReentrantReadWriteLock. Reads (get, scan, ttl, readAt) share it; every change takes it exclusively for the short time it needs to append versions.",
      "Check and change are one step: putIfAbsent, compareAndSet and incr read, decide and commit inside the same exclusive lock, so no update is lost. The tests use 8 and 16 threads.",
      "A batch takes one commit number, so a reader at any number sees the whole batch or none of it. An auditor that snapshots during 1800 transfers always sees the exact total.",
      "Transactions hold no locks while they run. Validation and the commit happen together under the exclusive lock, so first committer wins and a loser changes nothing.",
      "Watch events are queued under the lock in commit order and delivered after it is released, so a slow listener cannot block the store.",
      "Open snapshots and transactions keep old versions alive, so they must be closed. try-with-resources does it, and a long-lived one is a memory leak to monitor.",
    ],
  },
};
