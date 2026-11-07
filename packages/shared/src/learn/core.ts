import { lesson, type Lesson } from "./types";

// Core CS lessons (operating systems, databases, networks): one explanation per checklist point.

export const CORE_LESSONS: Record<string, Lesson> = {
  // ------------------------------------------------ Operating systems
  "os-processes": lesson(
    "A process is a running program with its own address space; threads are execution paths inside a process that share its memory. The trade-off between isolation (processes) and cheap sharing (threads) shows up in every server design.",
    [
      "A process has its own virtual memory, file descriptors and security context; a crash is contained. Threads share the heap, globals and descriptors, each with its own stack and registers, so they're cheaper to create and switch between and communicate through memory. But one thread's bug can corrupt or crash the whole process.",
      "States: new → ready → running → blocked (waiting on I/O) → ready … → terminated. A context switch saves the current thread's registers and program counter and loads another's; switching between processes also changes the address space (flushing the TLB), so it costs more. Each switch costs microseconds, and thousands per second add up.",
      "fork() duplicates the process (copy-on-write, so it's cheap); exec() replaces the program in the current process; this is how shells launch commands. Processes communicate through pipes (byte streams), shared memory (fastest, needs synchronization), message queues, Unix sockets, or network sockets.",
      "Kernel threads are scheduled by the OS and can run on multiple cores in parallel. Green threads, coroutines and virtual threads (Go goroutines, Java virtual threads, async/await) are scheduled in user space on a few OS threads; they're cheap enough to have millions, which suits I/O-heavy servers.",
    ],
    ["Process vs thread: when would you use multiple processes?", "What happens during a context switch and why is it expensive?", "Why can Go run a million goroutines but not a million OS threads?"],
  ),
  "os-scheduling": lesson(
    "The scheduler decides which ready thread runs on each core and for how long. Every policy trades throughput, latency (response time) and fairness against each other.",
    [
      "FCFS runs jobs in arrival order: simple, but short jobs wait behind long ones (convoy effect). SJF/SRTF run the shortest job first: optimal average wait, but needs job lengths and can starve long jobs. Round robin gives each job a time slice (quantum) in turn: fair and responsive, with a quantum-size trade-off. Priority scheduling runs the highest priority first.",
      "A multilevel feedback queue has several queues of different priority: new jobs start high, jobs that use their full slice drop down (CPU-bound), and jobs that block early stay high (interactive). Periodically everything is boosted to prevent starvation. Classic Unix schedulers work this way; Linux CFS instead gives each task a fair share of CPU time.",
      "Preemptive schedulers can interrupt a running thread (timer interrupt) to run another, which keeps the system responsive. Starvation: a low-priority job never runs; fixed by aging (raising priority as it waits). Priority inversion: a low-priority thread holds a lock that a high-priority one needs; fixed by priority inheritance.",
      "Throughput is jobs completed per unit time (favoured by long slices and few switches); latency is how quickly an interactive task responds (favoured by short slices); fairness is equal shares. Servers usually prioritize tail latency.",
    ],
    ["Why does round robin's quantum size matter?", "Explain priority inversion and how it's fixed."],
  ),
  "os-sync": lesson(
    "When threads share data, unsynchronized access gives wrong results that appear only sometimes. Synchronization primitives enforce mutual exclusion and ordering; memory-model rules decide when one thread sees another's writes.",
    [
      "A race condition is when the result depends on thread timing, as in count++ (read, add, write) from two threads losing an update. The critical section is the code that touches shared state and must run by one thread at a time.",
      "A mutex lets one thread hold it at a time; others sleep (the context-switch cost is fine for long waits). A spinlock busy-waits instead of sleeping: good for very short critical sections on multicore, wasteful otherwise. A semaphore is a counter allowing up to N holders (e.g. N database connections); a binary semaphore behaves like a lock without ownership.",
      "A condition variable lets a thread sleep until a condition holds (queue not empty), always used with a mutex in a while loop: lock; while (!cond) wait(cv); … ; unlock. The while loop handles spurious wakeups. A monitor is an object whose methods are mutually exclusive and come with condition variables (Java synchronized + wait/notify).",
      "A reader-writer lock allows many readers or one writer, which helps read-heavy shared data. Watch for writer starvation if readers keep arriving; fair implementations queue writers.",
      "Without synchronization, a thread may never see another thread's write (caches, compiler and CPU reordering). volatile (Java) guarantees visibility and ordering for one variable, but not atomic compound operations. Atomics use compare-and-swap (CAS): set the value to new only if it is still old, retrying on failure. This is the basis of lock-free counters and structures.",
    ],
    ["Why isn't count++ thread-safe and how do you fix it?", "Mutex vs semaphore?", "Why must wait() be called in a while loop?"],
  ),
  "os-deadlocks": lesson(
    "A deadlock is a set of threads each waiting for a resource held by another, so none progress. It needs all four Coffman conditions at once; break any one of them to prevent it.",
    [
      "Mutual exclusion (the resource can't be shared), hold and wait (holding one resource while waiting for another), no preemption (resources can't be taken away), and circular wait (a cycle of waiting). All four must hold for a deadlock.",
      "Break circular wait with a global lock order (always lock account A before account B, e.g. by id), the most practical fix. Break hold-and-wait by acquiring all locks at once. Use tryLock with a timeout and back off, which breaks the wait at the cost of retries.",
      "Banker's algorithm: grant a request only if the system stays in a 'safe state' where every process can still finish with the remaining resources. Needs maximum demands in advance, so it's rarely used in practice; know the idea.",
      "Detection builds a wait-for graph and looks for cycles (databases do this), then recovers by aborting a victim and rolling back. This is common when deadlocks are rare and the abort cost is acceptable.",
      "Livelock: threads keep reacting to each other and changing state without progress (two people stepping aside in a corridor); fixed with randomized backoff. Starvation: one thread never gets the resource while others do; fixed with fair locks or aging.",
    ],
    ["Two threads transfer money between the same two accounts in opposite directions. How do you avoid deadlock?", "Deadlock vs livelock vs starvation?"],
  ),
  "os-memory": lesson(
    "The OS gives each process its own virtual address space and maps it onto physical memory. Knowing stack vs heap and how paging works explains memory leaks, stack overflows and why memory access patterns affect performance.",
    [
      "The stack holds function frames (locals, return addresses); allocation just moves a pointer, it's freed automatically on return, and it's small (often 1-8 MB per thread). Deep recursion overflows it. The heap holds dynamically allocated objects that live beyond one call; it's larger and managed by malloc/free or a garbage collector, and it can fragment and leak.",
      "Internal fragmentation is wasted space inside allocated blocks (asking for 33 bytes and getting a 64-byte block). External fragmentation is free memory split into pieces too small to use. Paging removes external fragmentation for physical memory; allocators use size classes to limit both.",
      "Virtual memory is divided into fixed-size pages (usually 4 KB) mapped to physical frames by a page table per process; multi-level page tables keep the table small. Pages can be anywhere in physical memory or not resident at all.",
      "The translation lookaside buffer caches recent virtual-to-physical translations so most accesses skip the page-table walk. A TLB miss costs extra memory accesses; huge pages (2 MB) increase TLB coverage for big-memory apps like databases.",
      "Segmentation divides memory into variable-size logical segments (code, data, stack) with a base and a limit. It's mostly historical on x86-64, where paging does the real work.",
    ],
    ["Where do local variables live vs objects created with new?", "What is the TLB and why do huge pages help databases?"],
  ),
  "os-virtual-memory": lesson(
    "Virtual memory lets processes use more memory than is physically present by loading pages on demand and evicting cold ones to disk. It's also what makes fork, memory-mapped files and shared libraries cheap.",
    [
      "Pages are loaded only when first touched. An access to a non-resident page triggers a page fault; the OS loads the page from disk (major fault: milliseconds) or maps a zeroed or cached page (minor fault: fast), then resumes the instruction.",
      "When memory is full, the OS evicts a page. Ideal: the page used furthest in the future (OPT, a theoretical benchmark). LRU approximates it well but is expensive to track exactly. Clock (second chance) cheaply approximates LRU with reference bits. FIFO is simple but can evict hot pages (Belady's anomaly).",
      "Thrashing: the working sets of running processes don't fit in RAM, so the system spends its time paging instead of computing. Fixes: reduce multiprogramming, add memory, or improve locality. The working set is the pages a process uses in a recent window.",
      "mmap maps a file into the address space, so file reads become memory accesses served through the page cache, without read() copies. Used by databases and for loading large files; writes are flushed by the OS (or msync).",
      "After fork(), parent and child share pages marked read-only; a page is copied only when one of them writes to it. This makes fork cheap, and is how Redis takes snapshots (BGSAVE) while still serving writes.",
    ],
    ["What happens on a page fault?", "Why is fork() cheap even for a 10 GB process?", "What is thrashing?"],
  ),
  "os-files-io": lesson(
    "File systems and I/O models determine how fast and how safely data reaches disk, and how a server handles thousands of connections. Event loops and the page cache are the ideas that matter most for backend interviews.",
    [
      "An inode stores a file's metadata (size, permissions, block pointers), not its name. A directory maps names to inode numbers. A hard link is another name for the same inode (the file is deleted when the link count reaches 0); a symbolic link is a small file containing a path.",
      "write() usually only copies data into the kernel page cache and returns; the OS writes it to disk later. A crash can lose it unless you call fsync, which forces it to stable storage (slow: milliseconds). Databases fsync their write-ahead log on commit; group commit batches several transactions into one fsync.",
      "Blocking I/O: the thread waits until data is ready (simple; needs one thread per connection). Non-blocking: the call returns immediately with 'try again'. Asynchronous I/O (io_uring, IOCP): submit operations and get completions later.",
      "select and poll scan every watched descriptor on each call (O(n)). epoll (Linux) and kqueue (BSD) register interest once and return only the ready descriptors, so one thread can serve tens of thousands of connections. This is the event-loop model of Nginx, Node.js and Redis.",
      "sendfile() moves file data from the page cache to a socket inside the kernel, with no copies to user space, which lets static file servers and Kafka send data at line rate.",
    ],
    ["Why might data you wrote be lost after a crash even though write() returned?", "How can Nginx handle 10k connections with a few threads?"],
  ),
  "os-kernel": lesson(
    "The kernel runs with full hardware privileges and mediates all access to devices and memory; programs request services through system calls. Containers are an application of kernel features, not virtual machines.",
    [
      "The CPU enforces privilege levels: user-mode code can't touch hardware or other processes' memory directly. The kernel runs in kernel mode. A bug in user mode crashes one process; a kernel bug crashes the machine.",
      "A system call (read, write, open, mmap) switches into kernel mode through a trap, runs kernel code, and returns. It costs far more than a function call (hundreds of nanoseconds or more), which is why buffered I/O batches small reads and writes.",
      "Hardware interrupts (a packet arrived, disk I/O done, a timer tick) make the CPU run a kernel handler; the timer interrupt enables preemptive scheduling. Signals are the user-space equivalent sent to processes (SIGINT on Ctrl-C, SIGTERM for graceful shutdown, SIGKILL which can't be caught).",
      "A container is a process isolated by namespaces (its own view of PIDs, network, mounts, users, hostname) and limited by cgroups (CPU, memory and I/O quotas), sharing the host kernel. That makes it lighter than a VM, which runs a whole guest kernel on a hypervisor, but the isolation is weaker.",
    ],
    ["Container vs VM?", "Why are system calls expensive and how do you reduce them?", "SIGTERM vs SIGKILL in a graceful shutdown?"],
  ),

  // ------------------------------------------------ Databases
  "db-relational": lesson(
    "The relational model stores data in tables of rows linked by keys, queried declaratively with SQL. Interviewers expect fluent joins and aggregations and an understanding of what they cost.",
    [
      "A primary key uniquely identifies a row (often a surrogate id). A candidate key is any minimal set of columns that could be the primary key (e.g. email). A foreign key references another table's key and enforces referential integrity (no orders for missing users).",
      "Inner join returns matching rows only; left outer join returns all left rows with nulls where there's no match (find users with no orders: LEFT JOIN … WHERE o.id IS NULL); full outer join returns both sides. A self join joins a table to itself (employee → manager). Cost depends on indexes on the join keys and the join algorithm.",
      "GROUP BY aggregates rows into groups; WHERE filters rows before grouping, HAVING filters groups after. Window functions (ROW_NUMBER, RANK, LAG, SUM OVER (PARTITION BY … ORDER BY …)) compute over related rows without collapsing them: top-N per group, running totals, period-over-period changes.",
      "Many subqueries can be written as joins; modern optimizers often rewrite them the same way. Correlated subqueries (which reference the outer row) may run once per row and be slow. EXISTS is efficient for 'has at least one'. Choose for readability, then check the plan.",
    ],
    ["Write SQL for the second-highest salary per department.", "Find customers who placed no orders last month.", "WHERE vs HAVING?"],
  ),
  "db-normalization": lesson(
    "Normalization removes redundancy so each fact lives in one place, which prevents update anomalies. Denormalization deliberately reintroduces redundancy to make reads faster.",
    [
      "1NF: atomic values, no repeating groups. 2NF: no non-key column depends on only part of a composite key. 3NF: no non-key column depends on another non-key column (no transitive dependencies). BCNF: every determinant is a candidate key. In practice, aim for 3NF.",
      "X → Y means X's value determines Y's (zip_code → city). Normalization is splitting tables so every dependency goes from a key. If city is stored with every address row, renaming a city means updating many rows (an update anomaly).",
      "Copying data (storing author_name on posts, or precomputed counters) avoids joins and speeds reads, at the cost of extra writes and the risk of inconsistency. Typical for read-heavy paths, NoSQL models and analytics. Keep the source of truth normalized and maintain the copies with transactions or events.",
    ],
    ["Normalize this table: orders(order_id, customer_name, customer_email, product, price).", "When would you denormalize?"],
  ),
  "db-indexing": lesson(
    "An index is a separate sorted structure that lets the database find rows without scanning the table. Knowing how B+ trees work explains which queries an index helps and why indexes slow writes.",
    [
      "A B+ tree keeps keys sorted in wide nodes (hundreds of keys per disk page), so the tree is only 3-4 levels deep even for millions of rows: a lookup is 3-4 page reads. Leaves are linked in order, so range scans walk the leaves sequentially. High fan-out matches disk and SSD page reads.",
      "A clustered index stores the table rows themselves in index order (the InnoDB primary key); there can be only one, and range scans on it are very fast. A secondary index stores key → primary key or row pointer, so using it means a second lookup into the table, unless the index is covering.",
      "For an index on (a, b, c), queries can use it for a; a,b; or a,b,c (leftmost prefix), and for a = ? AND b > ?. Put equality columns first and range columns last. An index on (b) alone doesn't help WHERE a = ?.",
      "A hash index gives O(1) equality lookups but can't do ranges or ordering. Used in memory engines and for some key-value stores; B-trees are the general default.",
      "Not used when: a function is applied to the column (WHERE LOWER(email) = … unless there's an expression index), a LIKE has a leading wildcard ('%abc'), the column is compared to the wrong type, the query selects most of the table (a scan is cheaper), or statistics are stale.",
    ],
    ["Why are B+ trees used instead of binary search trees on disk?", "Will an index on (last_name, first_name) help WHERE first_name = 'Ana'?", "Why do too many indexes hurt?"],
  ),
  "db-transactions": lesson(
    "A transaction groups operations so they succeed or fail together and run as if isolated from others. ACID is the contract; each letter has a specific mechanism behind it.",
    [
      "Atomicity: all or nothing; a failure rolls back every change (undo log). Consistency: constraints and invariants hold before and after (the application defines most invariants). Isolation: concurrent transactions don't see each other's partial work (locking or MVCC). Durability: once committed, the data survives crashes (WAL plus fsync).",
      "COMMIT makes the changes permanent and visible; ROLLBACK discards them. Keep transactions short: they hold locks or old versions, and long transactions hurt concurrency and storage.",
      "A savepoint marks a point inside a transaction you can roll back to without abandoning the whole transaction. Useful for partial retries inside a batch.",
      "With autocommit on, each statement is its own transaction. Running related statements (debit then credit) without an explicit transaction means a crash between them leaves inconsistent data. ORMs sometimes open transactions implicitly or not at all, so know which yours does.",
    ],
    ["Explain each ACID property and what implements it.", "How does a database guarantee durability?"],
  ),
  "db-isolation": lesson(
    "Isolation levels define which concurrency anomalies a transaction may see. Weaker levels allow more concurrency; you need to know which anomalies each allows and when that breaks your invariants.",
    [
      "Dirty read: seeing another transaction's uncommitted write (which may roll back). Non-repeatable read: reading the same row twice and getting different values because another transaction committed in between. Phantom: re-running a range query returns new rows inserted by others.",
      "Lost update: two transactions read-modify-write the same value and one overwrites the other (both read balance 100 and write 100 + their amount). Write skew: two transactions read the same data, then each write different rows based on it, breaking an invariant together (two doctors both go off-call because each saw the other on call).",
      "Read committed prevents dirty reads (the Postgres default). Repeatable read also prevents non-repeatable reads, and in MySQL largely phantoms too. Serializable prevents all anomalies, including write skew, implemented with strict 2PL or serializable snapshot isolation, at the cost of aborts or blocking.",
      "Each transaction reads a consistent snapshot as of its start (MVCC), and writers conflict only on the same rows. It prevents dirty and non-repeatable reads and lost updates (first committer wins), but allows write skew. Fix write skew with SELECT … FOR UPDATE on the rows the decision depends on, or with serializable isolation.",
    ],
    ["Give an example of write skew and two ways to prevent it.", "Which isolation level would you use for a bank transfer?"],
  ),
  "db-concurrency": lesson(
    "Concurrency control lets many transactions run at once while keeping isolation. Two families: locking (pessimistic) and versioning or validation (optimistic, MVCC).",
    [
      "Two-phase locking: a transaction acquires locks as it goes (growing phase) and releases none until it commits (strict 2PL holds them all until commit). This guarantees serializability but readers and writers block each other and deadlocks are possible.",
      "Shared (read) locks are compatible with each other; exclusive (write) locks are compatible with nothing. Granularity: row locks give more concurrency with more overhead; table locks are cheap but block more. Intention locks let a table lock coexist safely with row locks.",
      "Multi-version concurrency control: writes create new row versions tagged with transaction ids, and readers see the version matching their snapshot, so reads never block writes and writes never block reads. Old versions need garbage collection (vacuum).",
      "Pessimistic: lock first (SELECT … FOR UPDATE), which is good when conflicts are frequent. Optimistic: proceed without locks and check a version or timestamp at commit, retrying on conflict, which is good when conflicts are rare (most web apps). Under heavy contention, optimistic retries waste work.",
      "The database keeps a wait-for graph; when it finds a cycle, it aborts one transaction (the victim) with a deadlock error. Applications must retry. Lock rows in a consistent order to make deadlocks rarer.",
    ],
    ["MVCC vs two-phase locking?", "Optimistic vs pessimistic locking for an inventory decrement during a flash sale?"],
  ),
  "db-query": lesson(
    "SQL says what you want; the optimizer decides how to get it. Reading a plan and knowing the join algorithms is how you debug slow queries.",
    [
      "EXPLAIN shows the chosen plan; EXPLAIN ANALYZE runs it and shows actual rows and times. Look for sequential scans on big tables, large gaps between estimated and actual rows, expensive sorts, and nested loops over many rows.",
      "Nested loop: for each outer row, look up matches (fast with an index on the inner side and few outer rows). Hash join: build a hash table on the smaller input and probe it with the larger (good for big unsorted equi-joins). Merge join: both inputs sorted on the key, merged in one pass (good when already sorted or indexed).",
      "The optimizer estimates the cost of alternative plans using table statistics (row counts, value distributions, histograms) and picks the cheapest. Stale statistics produce bad plans, so run ANALYZE after big data changes.",
      "Code that loads a list (1 query) and then queries related data for each item (N queries) makes N+1 round trips, a classic ORM trap. Fix with a join, a batched IN (…) query, or eager loading.",
    ],
    ["A query got slow after the table grew 10×. How do you investigate?", "What is the N+1 problem?"],
  ),
  "db-recovery": lesson(
    "Databases survive crashes by logging changes before applying them, and survive disasters with backups. Know WAL and the redo/undo idea.",
    [
      "Every change is appended to a sequential log and flushed to disk before the transaction commits; the data pages are updated lazily later. Sequential log writes are fast, and the log is the source of truth after a crash. Replication often ships the WAL to replicas.",
      "A checkpoint periodically flushes dirty pages to disk and records how far the log is applied, so recovery only replays the log after the last checkpoint and old log segments can be recycled.",
      "On restart: redo replays logged changes after the checkpoint so committed work is restored, and undo rolls back changes from transactions that never committed (ARIES: analysis, redo, undo).",
      "Take full backups regularly and archive the WAL continuously; to restore to any moment (just before a bad DELETE), restore the base backup and replay WAL up to that point. Test restores. RPO (how much data you can lose) and RTO (how long recovery takes) drive the strategy.",
    ],
    ["How does a database recover after a power failure?", "Someone ran DELETE without WHERE at 14:03. How do you recover?"],
  ),

  // ------------------------------------------------ Networks
  "net-layers": lesson(
    "Network layers separate concerns: each layer adds its own header and relies on the layer below. Knowing which layer a device or protocol works at explains what it can see and do.",
    [
      "OSI has 7 layers (physical, data link, network, transport, session, presentation, application); the TCP/IP model used in practice has 4 (link, internet, transport, application). Interviews mostly use L2 (Ethernet/MAC), L3 (IP), L4 (TCP/UDP) and L7 (HTTP).",
      "Application data is wrapped in a transport segment (TCP: ports, sequence numbers), then an IP packet (source and destination IP), then a link-layer frame (MAC addresses) sent on the wire. Each hop's router strips and rebuilds the frame but keeps the IP packet.",
      "Each layer adds a header on the way down and the receiver removes them on the way up, so a layer only needs to understand its own header. Tunnels (VPNs, VXLAN) wrap a whole packet inside another packet.",
      "Switches work at L2 (MAC addresses), routers at L3 (IP), L4 load balancers and firewalls look at IPs and ports, and L7 load balancers, API gateways and WAFs read HTTP. The higher the layer, the smarter the decisions and the more CPU per request.",
    ],
    ["At which layer does a load balancer that routes by URL path operate?", "What does a router change in a packet as it forwards it?"],
  ),
  "net-ip": lesson(
    "IP delivers packets between hosts across networks on a best-effort basis. Addressing, NAT and routing explain how a request finds your server and why private networks work the way they do.",
    [
      "IPv4 addresses are 32 bits (about 4.3 billion, exhausted); IPv6 addresses are 128 bits. CIDR notation 10.0.0.0/16 means the first 16 bits are the network, giving 65,536 addresses. Subnets split address space (e.g. public and private subnets in a VPC).",
      "Network address translation lets many private addresses (10.x, 192.168.x) share one public IP: the router rewrites source addresses and ports and tracks connections. This is why servers inside a VPC need a NAT gateway to reach the internet, and why inbound connections to home devices don't work by default.",
      "ARP maps an IP address to a MAC address on the local network: 'who has 10.0.0.5?' broadcast, then a reply. Only used within one L2 segment; beyond it, frames go to the gateway's MAC.",
      "Routers forward packets hop by hop using routing tables (longest prefix match). BGP is how independent networks (ISPs, clouds) announce which prefixes they can reach. Anycast announces the same IP from many locations, so users reach the nearest one; used by DNS root servers and CDNs.",
    ],
    ["How many hosts fit in a /24?", "How does a server in a private subnet download updates?", "What is anycast and why do CDNs use it?"],
  ),
  "net-tcp": lesson(
    "TCP turns unreliable packets into a reliable, ordered byte stream and adapts its sending rate to the network. Its mechanics explain connection costs, latency on lossy networks and why connection pooling matters.",
    [
      "Setup: SYN → SYN-ACK → ACK (1 round trip before data). Teardown: FIN and ACK from each side. The side that closes first sits in TIME_WAIT for 2×MSL (often 60 s) so stray packets don't confuse a new connection on the same ports; busy clients making many short connections can run out of ports, so reuse connections.",
      "Every byte has a sequence number; the receiver acknowledges what it has received in order. Missing data is retransmitted after a timeout or after 3 duplicate ACKs (fast retransmit). The receiver reorders out-of-order segments before handing data to the application.",
      "The receiver advertises a window (how much it can buffer) and the sender never has more than that unacknowledged, so a fast sender can't overwhelm a slow receiver.",
      "The sender limits itself to protect the network. Slow start doubles the congestion window every round trip from a small start; congestion avoidance grows it linearly and halves it on loss (additive increase, multiplicative decrease). New connections start slow, which is another reason to reuse them. BBR models bandwidth and delay instead of reacting to loss.",
      "Because TCP delivers bytes in order, one lost segment blocks everything behind it until it's retransmitted, even data for unrelated HTTP/2 streams. QUIC fixes this with independent streams.",
      "Nagle's algorithm batches small writes until earlier data is acknowledged, which saves packets but adds latency for interactive traffic (often disabled with TCP_NODELAY). TCP keepalive probes idle connections so dead peers are detected and middleboxes don't drop them.",
    ],
    ["Walk through the TCP handshake and why it takes a round trip.", "Why do servers end up with many TIME_WAIT sockets?", "Flow control vs congestion control?"],
  ),
  "net-udp": lesson(
    "UDP is a thin layer over IP: ports and a checksum, with no connection, ordering or retransmission. You choose it when late data is worthless or when you implement reliability yourself, as QUIC does.",
    [
      "DNS (one small request and reply; just retry), live video and voice (a late frame is useless; skip it), games (send the latest state frequently), metrics (StatsD; losing a few samples is fine), and broadcast or multicast discovery.",
      "QUIC runs over UDP and builds reliability, congestion control and encryption (TLS 1.3 built in) on top, with multiple independent streams so a lost packet only stalls its own stream. Connections are identified by an id rather than IP and port, so they survive network changes (Wi-Fi to cellular). HTTP/3 runs on QUIC.",
      "A client that has talked to a server before can send encrypted application data in its very first packet, saving a round trip. The risk is replay attacks, so 0-RTT is limited to idempotent requests.",
    ],
    ["Why does video calling use UDP?", "How does QUIC avoid TCP's head-of-line blocking?"],
  ),
  "net-dns": lesson(
    "DNS maps names to addresses through a distributed, cached hierarchy. It's also a cheap tool for load balancing, failover and geo-routing, limited by caching.",
    [
      "Your stub resolver asks a recursive resolver (the ISP's, 8.8.8.8, 1.1.1.1), which does the work: it asks a root server (which points to .com), the .com TLD server (which points to example.com's nameservers), and the authoritative server (which gives the answer). Each step is iterative from the resolver's view, and answers are cached.",
      "A: name → IPv4. AAAA: name → IPv6. CNAME: alias to another name (not allowed at the zone apex). MX: mail servers. TXT: arbitrary text (domain verification, SPF). NS: delegates to nameservers. SRV: service host and port.",
      "Each record has a TTL; resolvers and clients cache it that long. Short TTLs (30-60 s) allow fast changes and failover but cost more queries; long TTLs are efficient but slow to change. Some clients ignore TTLs, so plan migrations with that in mind.",
      "Return several A records (round-robin), different answers per region (GeoDNS, latency-based routing), or remove unhealthy endpoints (health-checked DNS failover, e.g. Route 53). DNS can't see real-time load and is limited by caching, so it's usually combined with load balancers.",
    ],
    ["Walk through resolving www.example.com from a cold cache.", "How would you fail over between regions using DNS, and what limits how fast it works?"],
  ),
  "net-http": lesson(
    "HTTP is the application protocol of most APIs. Know method semantics, status codes, caching headers and how connections are reused across HTTP versions.",
    [
      "GET reads (safe, idempotent, cacheable); PUT replaces (idempotent); DELETE (idempotent); POST creates or acts (not idempotent); PATCH partially updates. Status codes: 2xx success (200, 201 Created, 204), 3xx redirect (301, 302, 304 Not Modified), 4xx client error (400, 401 unauthenticated, 403 forbidden, 404, 409 conflict, 429), 5xx server error (500, 502, 503, 504).",
      "Cache-Control (max-age, no-store, private/public, s-maxage for CDNs) controls caching. ETag or Last-Modified enable conditional requests: the client sends If-None-Match, and the server answers 304 with no body if nothing changed. Vary says which request headers change the response.",
      "Cookies carry state such as session ids; secure them with HttpOnly (no JavaScript access), Secure (HTTPS only) and SameSite (CSRF protection). CORS: browsers block cross-origin requests unless the server allows the origin with Access-Control-Allow-Origin; non-simple requests send a preflight OPTIONS first. CORS protects users' browsers, not your API.",
      "HTTP/1.1 keep-alive reuses a TCP connection for sequential requests. HTTP/2 multiplexes many concurrent requests over one connection with compressed headers. HTTP/3 does the same over QUIC without TCP head-of-line blocking.",
    ],
    ["PUT vs POST vs PATCH?", "401 vs 403?", "How does an ETag save bandwidth?", "What problem does CORS solve?"],
  ),
  "net-tls": lesson(
    "TLS provides encryption, integrity and server authentication for connections. Know how the handshake establishes keys, how certificates prove identity, and when to use mutual TLS.",
    [
      "The ClientHello carries supported cipher suites and an ephemeral key share; the ServerHello carries its key share, certificate and a signature proving it owns the certificate's private key. Both derive the same session keys (ECDHE), so it takes 1 round trip, or 0-RTT on resumption. Ephemeral keys give forward secrecy: stealing the server key later doesn't decrypt old traffic.",
      "The server presents a certificate binding its domain to a public key, signed by an intermediate CA, which is signed by a root CA the client already trusts. The client verifies the chain, the domain name, expiry and revocation. Let's Encrypt automates issuing short-lived certificates.",
      "Asymmetric crypto (public/private key pairs: RSA, ECDSA, ECDH) is used for key agreement and signatures; it's slow. Symmetric crypto (one shared key: AES-GCM, ChaCha20) encrypts the actual data quickly. TLS uses asymmetric crypto to agree on symmetric keys.",
      "Mutual TLS: the client also presents a certificate, so both sides authenticate. Common for service-to-service traffic inside a mesh and for B2B APIs; it needs certificate issuance and rotation infrastructure.",
    ],
    ["Walk through a TLS 1.3 handshake.", "Why does TLS use both asymmetric and symmetric encryption?", "What is forward secrecy?"],
  ),
  "net-sockets": lesson(
    "Sockets are the OS interface to the network. Tracing a request end to end and knowing where time goes is a classic question and the basis of latency reasoning in designs.",
    [
      "Browser cache → DNS resolution → TCP handshake → TLS handshake → HTTP request → (CDN or load balancer → app server → cache or database) → response → the browser parses HTML and fetches more resources over the same or new connections. Mention caching at each step and what HTTP/2 or 3 change.",
      "A server calls socket() → bind(address, port) → listen(backlog) → accept() (returns a new socket per client connection). A client calls socket() → connect(server). Then both read and write. A listening socket serves many connections, each identified by the 4-tuple (src IP, src port, dst IP, dst port).",
      "Opening a connection costs TCP plus TLS round trips and a slow start, so clients keep a pool of open connections to databases and services and reuse them. Size pools carefully: too small means queueing, too large overloads the database (each Postgres connection is a process).",
      "DNS lookup, TCP and TLS handshakes (round trips × RTT), queueing at load balancers and servers, application processing, database queries, serialization, and bandwidth for large payloads. Distance sets the minimum (about 1 ms RTT per 100 km of fiber), so cut round trips and move data closer (CDN, regional deployments).",
    ],
    ["What happens when you type a URL and press Enter? Go as deep as you can.", "Why use a connection pool for the database?"],
  ),
};
