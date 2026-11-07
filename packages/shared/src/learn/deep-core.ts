import type { LessonExtra } from "./types";

// Deeper material for core CS: operating systems, databases, networks.

export const DEEP_CORE: Record<string, LessonExtra> = {
  // ------------------------------------------------ Operating systems
  "os-processes": {
    recap: [
      "Process: own address space, isolated, expensive to create/switch. Thread: shares memory, cheap.",
      "Context switch saves registers/PC; process switch also changes page tables (TLB flush cost).",
      "fork copies (copy-on-write), exec replaces the image; IPC: pipes, shared memory, sockets.",
      "Coroutines/green threads: user-space scheduling, thousands per OS thread, for I/O-heavy work.",
    ],
    deeper: [
      {
        title: "fork + exec, step by step",
        body: "A shell runs ls: fork() creates a child that is a copy of the shell (same code, copied-on-write memory, same open file descriptors). In the child, fork returns 0; it may redirect stdout (dup2) and then calls exec('ls'), which replaces its memory image with the ls program. The parent gets the child's pid and calls wait() to collect its exit status (otherwise the child stays a zombie).\n\nCopy-on-write makes fork cheap: pages are shared read-only until either side writes, then only that page is copied.",
        code: `pid_t pid = fork();
if (pid == 0) {                       // child
    execlp("ls", "ls", "-l", NULL);   // only returns on error
    _exit(127);
} else {                              // parent
    int status; waitpid(pid, &status, 0);
}`,
      },
      {
        title: "Threads vs processes vs async in a server",
        body: "Process per request (old CGI): strong isolation, very expensive. Thread per request: shared memory, simple blocking code, but each thread needs ~1 MB stack and context switches add up beyond thousands of connections. Event loop / async (Node, Netty, asyncio): one or a few threads multiplex many connections with non-blocking I/O, so 100k idle connections are cheap; CPU-heavy work blocks the loop and must go to a worker pool.\n\nJava virtual threads and Go goroutines give thread-style code with async-style cost: the runtime parks them on blocking I/O.",
      },
    ],
  },
  "os-scheduling": {
    recap: [
      "FCFS: simple, convoy effect. SJF/SRTF: optimal average wait, needs burst estimates, starves long jobs.",
      "Round robin: time slices for fairness/latency; too small a quantum = switch overhead.",
      "MLFQ: new jobs start high priority, CPU hogs sink, periodic boost prevents starvation.",
      "Linux CFS: picks the task with the smallest virtual runtime (red-black tree).",
    ],
    deeper: [
      {
        title: "Worked example: average waiting time",
        body: "Jobs arrive at t=0 with bursts A=8, B=4, C=1. FCFS (A, B, C): waits 0, 8, 12 → average 6.67. SJF (C, B, A): waits 0, 1, 5 → average 2. Round robin with quantum 2: C finishes early, B and A interleave; average wait sits between, but response time (time to first run) is best.\n\nThat's the core trade-off: SJF minimizes average waiting, RR minimizes response time and is fair, FCFS is simplest. Interactive systems favour response time.",
      },
      {
        title: "How MLFQ approximates SJF without knowing bursts",
        body: "Several queues with decreasing priority and increasing quantum. A new job starts at the top. If it uses its whole quantum it's probably CPU-bound and drops a level; if it blocks for I/O early it stays high, so interactive jobs stay responsive. Every so often all jobs are boosted to the top so long jobs don't starve and jobs that became interactive recover.\n\nGaming the scheduler (yielding just before the quantum ends) is prevented by charging total CPU used at a level, not per slice.",
      },
    ],
  },
  "os-sync": {
    recap: [
      "Race condition: result depends on interleaving; protect the critical section.",
      "Mutex: one owner, sleeps when contended. Spinlock: busy-waits, only for very short sections.",
      "Semaphore: counter of permits (bounded pools). Condition variable: wait for a predicate under a mutex, in a while loop.",
      "Visibility: without volatile/atomics/locks another thread may never see your write.",
    ],
    deeper: [
      {
        title: "Why count++ isn't atomic",
        body: "count++ is load, add, store. Thread 1 loads 5, thread 2 loads 5, both store 6: one increment is lost. Fixes: a mutex around the increment, an atomic fetch-and-add (AtomicInteger.incrementAndGet, std::atomic<int>), or avoid sharing (per-thread counters summed at the end, like LongAdder).\n\nCompare-and-swap loops implement lock-free updates: read old, compute new, CAS(old → new), retry if another thread changed it in between.",
        code: `std::atomic<long> count{0};
count.fetch_add(1, std::memory_order_relaxed);   // atomic increment

// CAS loop for "max so far"
long cur = best.load();
while (x > cur && !best.compare_exchange_weak(cur, x)) { /* cur reloaded */ }`,
      },
      {
        title: "Condition variables done right",
        body: "Waiting for 'queue not empty': lock the mutex, while (queue.empty()) cv.wait(lock); then pop. The while loop is required: wake-ups can be spurious, and another consumer may have taken the item between the notify and your wake-up. The producer pushes under the same mutex and then notifies.\n\nReader-writer locks let many readers in at once but only one writer; they help only when reads dominate and critical sections are long enough to outweigh their overhead, and naive versions can starve writers.",
        code: `std::mutex m; std::condition_variable cv; std::queue<int> q;
void produce(int x) { { std::lock_guard<std::mutex> g(m); q.push(x); } cv.notify_one(); }
int consume() {
    std::unique_lock<std::mutex> lk(m);
    cv.wait(lk, [] { return !q.empty(); });      // loops on spurious wake-ups
    int x = q.front(); q.pop(); return x;
}`,
      },
    ],
  },
  "os-deadlocks": {
    recap: [
      "Coffman: mutual exclusion, hold and wait, no preemption, circular wait (all four needed).",
      "Prevention in practice: acquire locks in one global order; or tryLock with timeout and back off.",
      "Avoidance (Banker's): only grant requests that keep the system in a safe state.",
      "Livelock: threads keep reacting and make no progress; add randomized backoff.",
    ],
    deeper: [
      {
        title: "The bank transfer deadlock and the fix",
        body: "transfer(a, b) locks a then b; transfer(b, a) concurrently locks b then a. Each holds one lock and waits for the other: circular wait. Fix: always lock the account with the smaller id first, regardless of direction. Then every thread acquires locks in the same order and a cycle can't form.",
        code: `void transfer(Account from, Account to, long amount) {
    Account first = from.id() < to.id() ? from : to;
    Account second = first == from ? to : from;
    synchronized (first) {
        synchronized (second) {
            from.withdraw(amount);
            to.deposit(amount);
        }
    }
}`,
      },
      {
        title: "Detection and the Banker's idea",
        body: "Detection: build a wait-for graph (thread → thread it waits on) and look for a cycle; databases do this and abort one transaction (the victim). Recovery: kill/rollback a participant or preempt a resource.\n\nBanker's algorithm: each process declares its maximum need; a request is granted only if, afterwards, there's still some order in which every process can finish with the available resources. Rarely used in practice because maximum needs are unknown, but interviewers like the 'safe state' concept.",
      },
    ],
  },
  "os-memory": {
    recap: [
      "Stack: per thread, automatic, fast, limited (~1-8 MB). Heap: shared, manual/GC, fragmentation.",
      "Internal fragmentation: waste inside allocated blocks. External: free memory split into small holes.",
      "Paging: fixed-size pages map virtual → physical frames via page tables.",
      "TLB caches translations; a miss walks the multi-level page table.",
    ],
    deeper: [
      {
        title: "Address translation with 4 KB pages",
        body: "A 48-bit virtual address on x86-64 is split into four 9-bit indexes (one per page-table level) and a 12-bit offset (4 KB = 2¹²). The MMU checks the TLB; on a hit, physical address = frame number + offset in ~1 cycle. On a miss, it walks four levels of tables in memory (each a potential cache miss), then caches the result.\n\nHuge pages (2 MB) cover more memory per TLB entry, which is why databases and JVMs enable them. A context switch to another process changes the page-table root, so TLB entries are tagged (PCID) or flushed.",
      },
      {
        title: "Fragmentation in practice",
        body: "Internal: allocating 33 bytes from a 64-byte size class wastes 31; paging wastes on average half a page per allocation region. External: after many malloc/free of varied sizes, there's 100 MB free but no 10 MB contiguous block. Allocators (jemalloc, tcmalloc) use size classes and per-thread caches to limit both; compacting garbage collectors move objects to eliminate external fragmentation.\n\nPaging removes external fragmentation for physical memory because any free frame can back any page.",
      },
    ],
  },
  "os-virtual-memory": {
    recap: [
      "Demand paging: load a page on first access (page fault); the disk is the backing store.",
      "Replacement: LRU ideal but costly; clock (second chance) approximates it.",
      "Thrashing: working sets exceed RAM, CPU waits on faults; reduce load or add memory.",
      "mmap maps files into memory; copy-on-write makes fork and shared libraries cheap.",
    ],
    deeper: [
      {
        title: "What happens on a page fault",
        body: "The CPU traps to the kernel with the faulting address. The kernel checks it's a valid mapping (else SIGSEGV). Minor fault: the page is already in memory (page cache or shared) and just needs a table entry: microseconds. Major fault: pick a victim frame (write it back if dirty), read the page from disk/swap, update the page table, resume: milliseconds on SSD, much worse on HDD.\n\nSo a process with a working set larger than RAM spends its time faulting: thrashing.",
      },
      {
        title: "Clock algorithm",
        body: "Frames form a circle with a hand. Each frame has a reference bit, set by hardware on access. To evict, look at the frame under the hand: if its bit is 1, clear it and advance (second chance); if 0, evict it. Frequently used pages keep getting their bit set and survive; cold pages are found quickly.\n\nLRU exactly would need updating a list on every memory access, which hardware can't afford; clock gets close with one bit.",
      },
    ],
  },
  "os-files-io": {
    recap: [
      "Inode holds metadata + block pointers; a directory maps names → inode numbers.",
      "Hard link = another name for the same inode; symlink = a file containing a path.",
      "write() lands in the page cache; only fsync() makes it durable.",
      "epoll: O(1) readiness notification for many sockets; the basis of event loops.",
    ],
    deeper: [
      {
        title: "Durability: write vs fsync",
        body: "write() copies data into the kernel's page cache and returns; a crash or power loss before writeback loses it. fsync(fd) forces the file's data and metadata to stable storage (and waits). For a new file, you must also fsync the directory so the name entry survives.\n\nDatabases fsync the WAL on commit (group commit batches many transactions per fsync). The safe 'replace a file' recipe: write temp file → fsync it → rename over the original (atomic) → fsync the directory.",
      },
      {
        title: "select, poll, epoll and zero-copy",
        body: "select/poll pass the whole set of descriptors on every call and scan it: O(n) per call, fine for a few hundred. epoll registers interest once (epoll_ctl) and epoll_wait returns only ready descriptors: O(ready), so one thread can manage 100k connections. Edge-triggered mode reports changes once (read until EAGAIN); level-triggered keeps reporting while data remains.\n\nsendfile() sends file bytes to a socket inside the kernel, skipping copies to user space and back; Kafka and static file servers rely on it.",
      },
    ],
  },
  "os-kernel": {
    recap: [
      "User mode can't touch hardware; system calls trap into kernel mode.",
      "Syscall cost: mode switch + checks (~100 ns-1 µs); batch I/O to amortize.",
      "Interrupts: hardware events; signals: kernel → process notifications (SIGTERM, SIGKILL, SIGSEGV).",
      "Containers = processes with namespaces (isolation of view) + cgroups (resource limits).",
    ],
    deeper: [
      {
        title: "What a container really is",
        body: "No separate kernel: a container is a normal process tree. Namespaces give it its own view of PIDs (it sees itself as PID 1), mounts (its own root filesystem from the image layers), network (its own interfaces and ports), hostname, users and IPC. cgroups cap and account its CPU, memory, I/O and process count; exceeding the memory limit gets the process OOM-killed.\n\nSo containers start in milliseconds and share the host kernel (weaker isolation than VMs, which run their own kernel on a hypervisor).",
      },
      {
        title: "Signals and graceful shutdown",
        body: "Orchestrators send SIGTERM, wait a grace period (Kubernetes: 30 s), then SIGKILL (can't be caught). A service should catch SIGTERM, stop accepting new work (fail readiness), finish in-flight requests, flush buffers, close connections, then exit.\n\nIn a container, your process is PID 1, which doesn't get default signal handling; use an init (tini) or handle signals explicitly, or shutdowns become 30-second hangs followed by a kill.",
      },
    ],
  },
  // ------------------------------------------------ Databases
  "db-relational": {
    recap: [
      "Primary key identifies a row; foreign key references one; candidate keys are any minimal unique sets.",
      "INNER join keeps matches; LEFT keeps all left rows; self join compares rows of one table.",
      "WHERE filters rows before grouping; HAVING filters groups after.",
      "Window functions (ROW_NUMBER, RANK, SUM OVER) compute per-row results across a partition without collapsing rows.",
    ],
    deeper: [
      {
        title: "Classic queries to have ready",
        body: "Second-highest salary per department, top-N per group, running totals and gaps are standard. Window functions make them short; know DENSE_RANK vs RANK (ties) vs ROW_NUMBER (unique).",
        code: `-- Top 3 earners per department
SELECT dept_id, name, salary FROM (
  SELECT dept_id, name, salary,
         DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS r
  FROM employees) t
WHERE r <= 3;

-- Running total of daily revenue
SELECT day, revenue, SUM(revenue) OVER (ORDER BY day) AS running
FROM daily_revenue;

-- Customers with no orders (anti-join)
SELECT c.id FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
WHERE o.id IS NULL;`,
      },
      {
        title: "Subqueries vs joins",
        body: "Modern optimizers usually rewrite IN/EXISTS subqueries into semi-joins, so performance is often the same; write whichever is clearer. Watch for NOT IN with a subquery that can return NULL: x NOT IN (1, NULL) is never true, so it returns nothing; use NOT EXISTS. Correlated subqueries in the SELECT list can run once per row; check the plan.",
      },
    ],
  },
  "db-normalization": {
    recap: [
      "1NF: atomic values, no repeating groups. 2NF: no partial dependency on part of a composite key.",
      "3NF: no transitive dependency (non-key → non-key). BCNF: every determinant is a candidate key.",
      "Normalize to avoid update anomalies; denormalize deliberately for read performance.",
    ],
    deeper: [
      {
        title: "Normalizing an order table",
        body: "Orders(order_id, customer_id, customer_email, product_id, product_name, qty) with key (order_id, product_id). product_name depends only on product_id (partial dependency → violates 2NF): move to Products. customer_email depends on customer_id, which depends on order_id (transitive → violates 3NF): move to Customers. Result: Orders(order_id, customer_id), OrderItems(order_id, product_id, qty), Products, Customers.\n\nNow changing a product name is one row, not every order line (no update anomaly), and you can add a product with no orders (no insertion anomaly).",
      },
      {
        title: "When to denormalize",
        body: "Read-heavy screens that join 5 tables per request: store a precomputed copy (order summary with customer name snapshot, comment count on posts). Pay with write complexity: keep the copy in sync (same transaction, trigger, or async from events) and accept staleness where safe.\n\nSome 'denormalization' is actually correct modeling: the price on an order line should be a snapshot of the price at purchase time, not a reference to today's price.",
      },
    ],
  },
  "db-indexing": {
    recap: [
      "B+ tree: high fan-out, shallow (3-4 levels for billions of rows), leaves linked for range scans.",
      "Clustered index = table stored in key order (InnoDB primary key); secondary indexes point to it.",
      "Composite (a, b): useful for a or a+b, not b alone; equality columns before range columns.",
      "Index unused when: function on the column, leading wildcard LIKE, implicit casts, low selectivity.",
    ],
    deeper: [
      {
        title: "Why B+ trees fit disks",
        body: "A node is one page (e.g. 16 KB) holding hundreds of keys, so the tree is very wide and shallow: with fan-out 500, three levels index 125M rows and the top levels stay in memory, so a lookup is ~1 disk read. All values live in leaves, which are linked, so a range scan finds the start and then reads sequentially.\n\nIn InnoDB, the primary key is the clustered index: a secondary index lookup finds the primary key, then does a second lookup in the clustered index (unless the secondary index covers the query). That's why a random UUID primary key hurts: inserts land on random pages.",
      },
      {
        title: "Index not used: common reasons",
        body: "WHERE LOWER(email) = ? on an index of email (use a functional index or store normalized). WHERE name LIKE '%son' (leading wildcard; use trigram/full-text index). WHERE phone = 12345 when phone is VARCHAR (implicit cast). WHERE status = 'active' when 95% of rows are active (a scan is cheaper). Composite (country, city) with WHERE city = ? only. OR across different columns (may need separate indexes + bitmap OR).\n\nAlways check with EXPLAIN rather than guessing.",
      },
    ],
  },
  "db-transactions": {
    recap: [
      "Atomicity: all or nothing (undo/WAL). Consistency: constraints hold. Isolation: concurrent txns don't interfere. Durability: committed survives crashes.",
      "Keep transactions short; never wait on user input or remote calls inside one.",
      "Savepoints roll back part of a transaction.",
      "Autocommit: each statement commits alone, so multi-step changes need explicit BEGIN/COMMIT.",
    ],
    deeper: [
      {
        title: "A transfer done right",
        body: "Both updates and the ledger entry happen in one transaction with a constraint that balances can't go negative; if anything fails, nothing is applied. The conditional update makes the balance check and the decrement atomic.",
        code: `BEGIN;
UPDATE accounts SET balance = balance - 500
 WHERE id = 1 AND balance >= 500;          -- 0 rows → insufficient funds → ROLLBACK
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
INSERT INTO ledger(from_id, to_id, amount) VALUES (1, 2, 500);
COMMIT;`,
      },
      {
        title: "Autocommit and long transactions",
        body: "With autocommit on (the default in most drivers), running two UPDATEs as separate statements means a crash between them leaves half a transfer. Conversely, a transaction left open (a debugger, a slow HTTP call inside it) holds locks and, in MVCC databases, prevents cleanup of old row versions (Postgres table bloat).\n\nRule: do remote calls before or after the transaction; inside it, only database work.",
      },
    ],
  },
  "db-isolation": {
    recap: [
      "Read committed: no dirty reads; non-repeatable reads possible. Default in Postgres/Oracle.",
      "Repeatable read / snapshot: consistent snapshot per transaction; write skew still possible.",
      "Serializable: as if one at a time (2PL or SSI); may abort transactions to retry.",
      "Lost update: two read-modify-writes overwrite each other; use atomic updates, FOR UPDATE or versions.",
    ],
    deeper: [
      {
        title: "Anomalies with two concrete transactions",
        body: "Dirty read: T2 reads T1's uncommitted price; T1 rolls back. Non-repeatable read: T1 reads balance 100, T2 commits 50, T1 reads again and sees 50. Phantom: T1 counts rows WHERE status='open' (5), T2 inserts one, T1 recounts (6). Lost update: both read stock=10, both write 9 after selling one each (should be 8). Write skew: both check 'at least one doctor on call' and each removes themselves.\n\nKnow which level prevents which: read committed stops dirty reads; snapshot stops non-repeatable reads and phantoms for reads (and lost updates in Postgres's repeatable read); only serializable stops write skew.",
      },
      {
        title: "MySQL vs Postgres defaults",
        body: "MySQL InnoDB defaults to REPEATABLE READ, using MVCC snapshots for plain reads and next-key (gap) locks for locking reads, which blocks many phantoms but can surprise you with lock waits. Postgres defaults to READ COMMITTED; its REPEATABLE READ is true snapshot isolation that aborts on concurrent update conflicts, and SERIALIZABLE uses SSI (detects dangerous patterns and aborts).\n\nWhichever you use, the app must retry serialization failures.",
      },
    ],
  },
  "db-concurrency": {
    recap: [
      "2PL: growing phase acquires locks, shrinking releases; strict 2PL holds until commit.",
      "Shared locks for reads, exclusive for writes; row vs page vs table granularity.",
      "MVCC: writers create new versions; readers see a snapshot without locking.",
      "Optimistic (version check at commit) for low contention; pessimistic (lock first) for high contention.",
    ],
    deeper: [
      {
        title: "How MVCC lets readers and writers coexist",
        body: "In Postgres each row version has xmin (creating transaction) and xmax (deleting/updating transaction). An UPDATE writes a new version and sets xmax on the old one. A transaction's snapshot lists which transactions were committed when it started; it sees a version if xmin is committed-and-visible and xmax isn't. Readers never block writers and vice versa; writers still block other writers of the same row.\n\nOld versions are garbage-collected by VACUUM once no snapshot can see them, so long-running transactions cause bloat.",
      },
      {
        title: "Deadlocks inside the database",
        body: "T1 updates row A then B; T2 updates B then A. The database's lock manager builds a wait-for graph, detects the cycle (Postgres checks after deadlock_timeout, ~1 s) and aborts one with a deadlock error. The app should retry it.\n\nPrevent most of them by touching rows in a consistent order (sort ids before updating), keeping transactions short, and using the right indexes (missing indexes make UPDATEs lock more rows or ranges than needed).",
      },
    ],
  },
  "db-query": {
    recap: [
      "EXPLAIN shows the plan; EXPLAIN ANALYZE runs it and shows actual rows/time.",
      "Nested loop: small outer side + indexed inner. Hash join: big unsorted inputs, equality. Merge join: both sorted.",
      "Bad estimates (stale statistics) cause bad plans; ANALYZE refreshes them.",
      "N+1: one query per item in a loop; batch with IN (...) or a join.",
    ],
    deeper: [
      {
        title: "Reading a plan",
        body: "Look for: Seq Scan on a large table where you expected an index; estimated rows far from actual rows (the optimizer guessed wrong, often stale stats or correlated columns); Sort or Hash operations spilling to disk; Nested Loop with a large outer side and no index on the inner. Fix by adding/adjusting indexes, rewriting the query (sargable conditions), or updating statistics.",
        code: `EXPLAIN ANALYZE
SELECT o.id, c.name FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE o.created_at > now() - interval '1 day';
-- Hash Join (actual rows=12034)
--   -> Index Scan using orders_created_at on orders o (actual rows=12034)
--   -> Hash -> Seq Scan on customers c (actual rows=500000)   ← fine if needed, else index-nested-loop`,
      },
      {
        title: "Spotting and fixing N+1",
        body: "Rendering 50 orders and, for each, querying its customer = 51 queries; at 1 ms each that's 50 ms of round trips. ORMs make it easy to do accidentally (lazy loading). Fix: one query with a join, or two queries (orders, then customers WHERE id IN (…)) and stitch in memory (DataLoader pattern batches per request).\n\nDetect it with query counts per request in logs/APM.",
      },
    ],
  },
  "db-recovery": {
    recap: [
      "WAL: log the change before applying it to data pages; commit = WAL flushed.",
      "Checkpoint: flush dirty pages so recovery only replays WAL after it.",
      "Recovery (ARIES): analysis → redo everything since checkpoint → undo uncommitted txns.",
      "PITR = base backup + archived WAL replayed to a timestamp.",
    ],
    deeper: [
      {
        title: "Why the WAL makes commits fast and safe",
        body: "Updating a row changes a page in memory; writing that 8 KB page to its random location on every commit would be slow. Instead, the database appends a small log record describing the change to the WAL (sequential write) and fsyncs it at commit. Data pages are written later in the background. After a crash, replaying the WAL from the last checkpoint reconstructs every committed change.\n\nThe same log feeds replication (followers replay it) and CDC.",
      },
      {
        title: "Backups that you can actually restore",
        body: "Logical dumps (pg_dump) are portable but slow for big databases. Physical backups (base backup + continuous WAL archiving to S3) allow point-in-time recovery: restore the base backup, replay WAL until 10:42:59, just before someone ran DELETE without WHERE.\n\nDefine RPO (how much data you can lose) and RTO (how long recovery may take), and test restores regularly; an untested backup is a hope, not a backup.",
      },
    ],
  },
  // ------------------------------------------------ Networks
  "net-layers": {
    recap: [
      "TCP/IP: link (frames, MAC) → internet (packets, IP) → transport (segments, TCP/UDP ports) → application.",
      "Encapsulation: each layer wraps the payload with its header.",
      "L4 devices see IP:port; L7 devices see HTTP (paths, headers, cookies).",
      "Firewalls/security groups filter at L3/L4; WAFs inspect L7.",
    ],
    deeper: [
      {
        title: "One HTTP request through the layers",
        body: "Application: 'GET /cart HTTP/1.1, Host: shop.com'. Transport: TCP segment with source port 52144, destination port 443, sequence numbers. Internet: IP packet from 10.0.0.5 to 203.0.113.10, TTL 64. Link: Ethernet frame to the gateway's MAC address. Each router strips the frame, reads the IP header, decrements TTL, and re-frames for the next hop; the IP header stays end to end (except NAT rewriting).\n\nAt the server, the layers are unwrapped in reverse, and the kernel hands the byte stream to the process listening on port 443.",
      },
      {
        title: "Where infrastructure sits",
        body: "Switches: L2 (MAC addresses within a LAN). Routers: L3 (IP between networks). NAT gateways: L3/L4 (rewrite addresses/ports). Network load balancers (AWS NLB): L4, pass TCP through, preserve client IP, very high throughput. Application load balancers / reverse proxies (ALB, Nginx, Envoy): L7, terminate TLS and route on HTTP. CDNs: L7 at the edge.\n\nSaying which layer a component works at explains what it can and can't do (an L4 balancer can't route /api vs /static).",
      },
    ],
  },
  "net-ip": {
    recap: [
      "CIDR /24 = 256 addresses; private ranges 10/8, 172.16/12, 192.168/16.",
      "NAT maps many private addresses to one public IP using ports.",
      "ARP: IP → MAC on the local network.",
      "BGP routes between networks (ASes); anycast announces one IP from many places, nearest wins.",
    ],
    deeper: [
      {
        title: "Subnetting a VPC",
        body: "VPC 10.0.0.0/16 = 65,536 addresses. Split into /20 subnets (4,096 each): 10.0.0.0/20 public AZ-a, 10.0.16.0/20 public AZ-b, 10.0.32.0/20 private AZ-a, and so on. Public subnets route 0.0.0.0/0 to an internet gateway; private subnets route it to a NAT gateway, so instances can reach out but can't be reached.\n\nA host checks whether a destination is in its own subnet (mask compare); if yes it ARPs for its MAC, otherwise it sends to the default gateway.",
      },
      {
        title: "Anycast and why DNS/CDNs use it",
        body: "The same IP prefix is announced via BGP from many data centers; routers send packets to the nearest (by routing policy) announcement. Users automatically hit a close PoP, and if one PoP fails its announcement is withdrawn and traffic shifts elsewhere.\n\nWorks best for short, stateless exchanges (DNS over UDP) or with stable routing for TCP (route changes mid-connection could land on another PoP). 8.8.8.8 and 1.1.1.1 are anycast.",
      },
    ],
  },
  "net-tcp": {
    recap: [
      "Handshake SYN → SYN-ACK → ACK (1 RTT); teardown FIN/ACK; the closer waits in TIME_WAIT (2×MSL).",
      "Reliability: sequence numbers, cumulative ACKs, retransmit on timeout or 3 duplicate ACKs.",
      "Flow control: receiver window; congestion control: slow start, AIMD, (Cubic/BBR).",
      "Nagle batches small writes; disable (TCP_NODELAY) for latency-sensitive small messages.",
    ],
    deeper: [
      {
        title: "Congestion control in one picture",
        body: "The sender may have min(receiver window, congestion window) bytes in flight. Slow start: cwnd starts at ~10 segments and doubles every RTT until loss or the threshold. Congestion avoidance: +1 segment per RTT (additive increase). On loss via duplicate ACKs: halve cwnd (multiplicative decrease) and continue; on timeout: back to slow start.\n\nConsequence for design: a new connection can't use full bandwidth for several RTTs, so short transfers over fresh connections are latency-bound. Reuse connections (pooling, keep-alive, HTTP/2) and keep services close to each other.",
      },
      {
        title: "TIME_WAIT and connection exhaustion",
        body: "The side that closes first keeps the (src IP, src port, dst IP, dst port) tuple in TIME_WAIT for ~60 s so late packets from the old connection aren't confused with a new one. A client opening and closing thousands of short connections per second to one server can run out of ephemeral ports (~28k-60k) on that tuple.\n\nFixes: connection pooling/keep-alive (best), letting the server close, more source IPs, or tcp_tw_reuse for outgoing connections.",
      },
    ],
  },
  "net-udp": {
    recap: [
      "UDP: no handshake, no ordering, no retransmission; 8-byte header.",
      "Fits DNS, live media, games, telemetry: late data is worthless or the app handles loss.",
      "QUIC: TLS 1.3 built in, independent streams (no HOL blocking), connection migration, 0-RTT resumption.",
    ],
    deeper: [
      {
        title: "Why games and calls use UDP",
        body: "In a game, a position update that arrives late is useless because a newer one is already on the way; TCP would hold all later updates until the lost one is retransmitted (head-of-line blocking), causing visible stalls. Over UDP, the game sends sequence-numbered snapshots, ignores old ones, and adds reliability only for the few messages that need it (chat, purchases).\n\nVoice/video codecs tolerate small losses (concealment) far better than delays.",
      },
      {
        title: "What QUIC fixes for the web",
        body: "HTTP/2 multiplexes streams over one TCP connection, so a single lost packet stalls all streams. QUIC implements reliability per stream over UDP, so loss on one stream doesn't block others. It combines the transport and TLS handshakes (1 RTT, 0-RTT on resumption), and identifies connections by an ID instead of the IP/port tuple, so a phone switching from Wi-Fi to cellular keeps the connection.\n\n0-RTT data can be replayed by an attacker, so only idempotent requests should use it.",
      },
    ],
  },
  "net-dns": {
    recap: [
      "Stub → recursive resolver → root → TLD → authoritative; answers cached for their TTL.",
      "A/AAAA: IPv4/IPv6. CNAME: alias (not at the zone apex). MX: mail. TXT: verification, SPF.",
      "Short TTLs (30-60 s) for failover; long TTLs for stable records.",
      "DNS load balancing returns multiple/geo-specific IPs; clients cache, so failover isn't instant.",
    ],
    deeper: [
      {
        title: "Resolving api.shop.com from a cold cache",
        body: "The OS asks the configured recursive resolver (ISP or 8.8.8.8). The resolver asks a root server → referral to the .com TLD servers → asks them → referral to shop.com's authoritative servers → asks them → gets api.shop.com A 203.0.113.10 TTL 60. It caches every step (TLD referrals for days), so the next lookup for another shop.com name skips straight to the authoritative server.\n\nThe resolver works recursively for the client; it queries the servers iteratively.",
      },
      {
        title: "DNS-based failover and its limits",
        body: "Health-checked DNS (Route 53) stops returning a failed region's IP; geo/latency routing returns the closest region. Limits: resolvers and clients cache answers for the TTL (some ignore it and cache longer), and long-lived connections don't re-resolve, so failover takes TTL + connection lifetime.\n\nFor faster failover, combine DNS with anycast or a global load balancer that has a stable IP.",
      },
    ],
  },
  "net-http": {
    recap: [
      "Safe: GET/HEAD. Idempotent: GET, PUT, DELETE. Not idempotent: POST, PATCH (usually).",
      "2xx ok, 3xx redirect, 4xx client error (400, 401, 403, 404, 409, 429), 5xx server (500, 502, 503, 504).",
      "Cache-Control: max-age, no-store, private/public; ETag + If-None-Match → 304.",
      "CORS: the browser enforces it; the server opts in with Access-Control-Allow-* headers.",
    ],
    deeper: [
      {
        title: "Caching headers that work",
        body: "Fingerprinted static assets (app.3f9a1c.js): Cache-Control: public, max-age=31536000, immutable, because the URL changes when the content does. HTML: Cache-Control: no-cache (store but revalidate each time) with an ETag, so unchanged pages cost a 304 with no body. Personalized API responses: Cache-Control: private, no-store. Shared caches (CDN) can use s-maxage and stale-while-revalidate to serve slightly stale content while refreshing in the background.",
      },
      {
        title: "CORS preflight",
        body: "A page on app.shop.com calls api.shop.com with JSON and an Authorization header: the browser first sends OPTIONS with Origin, Access-Control-Request-Method and -Headers. The API must answer with Access-Control-Allow-Origin: https://app.shop.com (not * when credentials are involved), allowed methods and headers, and optionally Access-Control-Max-Age to cache the preflight.\n\nCORS protects users' browsers from other sites reading responses; it isn't server-side security; curl ignores it entirely.",
      },
    ],
  },
  "net-tls": {
    recap: [
      "TLS 1.3: 1-RTT handshake; ECDHE key exchange gives forward secrecy.",
      "Certificate chain: server cert ← intermediate ← root in the client's trust store.",
      "Asymmetric crypto for authentication/key agreement, symmetric (AES-GCM, ChaCha20) for data.",
      "mTLS: both sides present certificates; standard for service-to-service identity.",
    ],
    deeper: [
      {
        title: "TLS 1.3 handshake",
        body: "ClientHello: supported cipher suites, a key share (ephemeral ECDHE public key), SNI (hostname). ServerHello: chosen suite and its key share; both sides now compute the shared secret. The server sends (encrypted) its certificate, a signature over the handshake with its private key (proves it owns the cert), and Finished. The client verifies the chain to a trusted root, the hostname, the signature, then sends Finished. Application data flows after one round trip.\n\nForward secrecy: the session keys came from ephemeral keys, so stealing the server's private key later doesn't decrypt recorded traffic.",
      },
      {
        title: "Certificates in practice",
        body: "Certificates expire (90 days for Let's Encrypt), so automate renewal (ACME, cert-manager). Revocation checking is weak in browsers; short lifetimes are the real mitigation. Terminate TLS at the load balancer for simplicity, and re-encrypt to backends (or use mTLS via a service mesh) if the internal network isn't trusted.\n\nPinning certificates in mobile apps blocks interception but makes rotation risky; pin the public key of an intermediate or a backup key, never only the leaf.",
      },
    ],
  },
  "net-sockets": {
    recap: [
      "Server: socket → bind → listen → accept (new socket per connection). Client: socket → connect.",
      "Listen backlog holds completed handshakes waiting for accept().",
      "Connection pools reuse TCP/TLS connections to DBs and services.",
      "Latency budget: DNS + TCP + TLS + queueing + server work + response transfer.",
    ],
    deeper: [
      {
        title: "Typing a URL, the full answer",
        body: "1) Browser checks its caches (HSTS forces https). 2) DNS resolves the host (browser, OS, resolver caches, then recursive lookup). 3) TCP handshake to the IP (often a CDN or load balancer). 4) TLS handshake, SNI selects the certificate; ALPN picks HTTP/2 or HTTP/3. 5) HTTP request with cookies; the edge serves from cache or forwards to the origin through the load balancer to an app server, which may hit caches and databases. 6) Response streams back; the browser parses HTML, fetches CSS/JS/images (more requests, often on the same connection), builds the DOM and CSSOM, runs JS, lays out and paints.\n\nGo deep on whichever part the interviewer cares about.",
      },
      {
        title: "Connection pooling",
        body: "Opening a Postgres connection costs a TCP + TLS handshake plus authentication and a backend process (~several ms and memory on the server). A pool keeps N open connections and lends them out per query/transaction. Size it to what the database can handle: total connections across all app instances must stay under the DB's limit, which is why large fleets add a pooler (PgBouncer) in front.\n\nHTTP clients pool too: reusing keep-alive or HTTP/2 connections avoids repeated handshakes and slow start.",
      },
    ],
  },
};
