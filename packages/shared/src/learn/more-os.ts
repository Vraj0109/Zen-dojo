import type { Section } from "./types";

// More deeper sections for operating systems (appended after deep-core.ts).

export const MORE_OS: Record<string, Section[]> = {
  "os-processes": [
    {
      title: "What a process consists of",
      body: "A process is a running program plus everything the OS tracks for it: a virtual address space (code/text, data, heap, memory-mapped regions, one stack per thread), open file descriptors, current working directory, credentials (user/group ids), signal handlers, resource limits, and one or more threads. The kernel keeps this in a process control block (task_struct in Linux).\n\nEach thread has its own registers, program counter and stack, but shares the address space and file descriptors with other threads of the process. That's why threads communicate cheaply (shared memory) but a bug in one thread (a wild pointer, an uncaught fatal error) can bring down the whole process, while processes are isolated from each other.\n\nOn Linux, both are 'tasks' created by clone() with different sharing flags: fork() shares nothing (copy-on-write), pthread_create() shares memory, files and signal handlers.",
    },
    {
      title: "Process states and context switching",
      body: "Lifecycle: new → ready (waiting for a CPU) → running → either back to ready (time slice expired, preempted), to blocked/waiting (waiting for I/O, a lock, a timer), or to terminated. When a terminated child hasn't been waited for by its parent it's a zombie (just an exit status entry); if the parent dies first, the child is re-parented to init/systemd (an orphan), which reaps it.\n\nA context switch saves the running task's CPU state (registers, program counter, stack pointer) and restores another's. Between threads of the same process, the address space stays, so it's cheaper; between processes, the kernel switches page tables, which invalidates or tags TLB entries, and caches go cold. Direct cost is a few microseconds; the indirect cost of cold caches can be larger.\n\nThat's why servers avoid one thread per connection at high concurrency, and why CPU-bound work uses about one thread per core.",
    },
    {
      title: "Inter-process communication options",
      body: "Pipes: a one-way byte stream between related processes (shell pipelines); named pipes (FIFOs) work between unrelated processes. Message queues (POSIX/System V): discrete messages with priorities. Shared memory (shm_open + mmap): the fastest, since processes map the same physical pages, but they must synchronize with semaphores or futexes. Unix domain sockets: like network sockets but local, bidirectional, can pass file descriptors; used by Docker, databases and many daemons. Network sockets (TCP/UDP): work across machines too. Signals: tiny asynchronous notifications (SIGTERM, SIGUSR1), not for data. Memory-mapped files: share data via the page cache.\n\nChoosing: shared memory for high-throughput local data (with careful synchronization), Unix sockets for local client-server, TCP or gRPC for anything that may become remote. In system design, microservices are processes communicating over network IPC, which is why serialization and network latency matter.",
    },
  ],
  "os-scheduling": [
    {
      title: "Scheduling goals and metrics",
      body: "Metrics: turnaround time (completion − arrival), waiting time (time in the ready queue), response time (arrival → first time on CPU), throughput (jobs per unit time), CPU utilization, and fairness. Batch systems care about throughput and turnaround; interactive systems care about response time; real-time systems care about meeting deadlines.\n\nThe schedulers trade these off. FCFS is non-preemptive and simple but suffers the convoy effect (short jobs stuck behind a long one). Shortest Job First minimizes average waiting time (provably optimal when all jobs are known), and its preemptive form Shortest Remaining Time First adapts to arrivals, but both need burst predictions (exponential averaging of past bursts) and can starve long jobs. Round robin gives each ready job a quantum in turn: response time is bounded by (n − 1) × quantum, but a quantum too small wastes time in context switches and one too large degrades into FCFS. Priority scheduling picks the highest priority; starvation is fixed by aging (raising priority of waiting jobs).",
    },
    {
      title: "Linux CFS and real-time classes",
      body: "Linux's Completely Fair Scheduler (and its successor EEVDF since 6.6) aims to give each runnable task a fair share of CPU weighted by its nice value. Each task accumulates virtual runtime (actual runtime scaled by weight); the scheduler always runs the task with the smallest virtual runtime, keeping tasks in a red-black tree ordered by it (O(log n) to pick and insert). A task that slept a long time has a small virtual runtime and gets the CPU soon after waking, which keeps interactive programs responsive.\n\nReal-time classes (SCHED_FIFO, SCHED_RR) always preempt normal tasks; within them, higher static priority wins. Multicore: each CPU has its own run queue, with load balancing that migrates tasks between cores (weighing cache affinity and NUMA locality). cgroups' CPU controller caps or weights CPU per group, which is how containers get CPU limits (and why a container with a low quota can be throttled even when the machine is idle).",
    },
    {
      title: "Worked example with round robin",
      body: "Jobs arrive at time 0: A needs 5 ms, B needs 3 ms, C needs 1 ms. Quantum 2 ms. Timeline: A 0-2, B 2-4, C 4-5 (done at 5), A 5-7, B 7-8 (done at 8), A 8-9 (done at 9). Completion times: A 9, B 8, C 5. Waiting times (completion − burst): A 4, B 5, C 4 → average 4.33. Response times: A 0, B 2, C 4.\n\nCompare SJF (C, B, A): C 0-1, B 1-4, A 4-9; waiting 0, 1, 4 → average 1.67, but A's response time is 4. FCFS (A, B, C): waiting 0, 5, 8 → average 4.33, and C waits 8 ms despite needing 1. Practise this kind of calculation; interviewers sometimes ask for a quick Gantt chart.",
    },
  ],
  "os-sync": [
    {
      title: "Mutex, spinlock and semaphore in detail",
      body: "A mutex provides mutual exclusion with ownership: the thread that locks must unlock. Contended locks put waiting threads to sleep (via the kernel, e.g. futex on Linux: uncontended lock/unlock stays in user space with an atomic instruction, and only contention enters the kernel). Good for critical sections of any length.\n\nA spinlock busy-waits in a loop testing an atomic flag. No sleep/wake overhead, so it's best when the lock is held for a very short time and the waiting thread is on another core; terrible if the holder is preempted (waiters burn CPU). Kernels use spinlocks in interrupt context where sleeping isn't allowed; adaptive mutexes spin briefly, then sleep.\n\nA counting semaphore holds N permits: wait/P decrements (blocks at 0), signal/V increments. Use it to limit concurrent access to a pool of N resources (database connections, parallel downloads) or for signalling between threads. A binary semaphore looks like a mutex but has no ownership, so any thread can signal it, which makes it suitable for signalling but error-prone as a lock.",
    },
    {
      title: "Monitors and the classic problems",
      body: "A monitor combines a mutex with condition variables: methods run with the lock held, and threads wait on conditions inside them (Java synchronized + wait/notify, or ReentrantLock + Condition). Always wait in a loop re-checking the condition.\n\nClassic problems interviewers like: producer-consumer with a bounded buffer (two conditions: notFull, notEmpty); readers-writers (allow concurrent readers, exclusive writers; decide whether readers or writers get priority to avoid starvation); dining philosophers (five philosophers, five forks; naive 'pick up left then right' deadlocks; fixes: a global order on forks, allow at most four to try at once, or pick up both atomically); sleeping barber.\n\nKnowing these by name and their fix shows you can reason about deadlock and starvation, which is what the question is really testing.",
      code: `class BoundedBuffer<T> {
    private final Object[] items; private int head, tail, count;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition(), notEmpty = lock.newCondition();
    BoundedBuffer(int capacity) { items = new Object[capacity]; }
    void put(T x) throws InterruptedException {
        lock.lock();
        try {
            while (count == items.length) notFull.await();
            items[tail] = x; tail = (tail + 1) % items.length; count++;
            notEmpty.signal();
        } finally { lock.unlock(); }
    }
    @SuppressWarnings("unchecked") T take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) notEmpty.await();
            T x = (T) items[head]; items[head] = null; head = (head + 1) % items.length; count--;
            notFull.signal();
            return x;
        } finally { lock.unlock(); }
    }
}`,
    },
    {
      title: "Memory models and visibility",
      body: "CPUs and compilers reorder instructions and keep values in registers and per-core caches for speed. Without synchronization, one thread may never see another's writes, or see them in a different order. A memory model defines which orderings are guaranteed.\n\nIn Java, happens-before edges create visibility: unlocking a monitor happens-before later locking it; a write to a volatile field happens-before later reads of it; Thread.start and Thread.join create edges; final fields are safely published after construction. In C++, std::atomic operations with memory orders (seq_cst by default; acquire/release for producer-consumer handoff; relaxed for counters where ordering doesn't matter).\n\nThe classic bug: double-checked locking for a lazy singleton without volatile can expose a partially constructed object, because the reference assignment can be reordered before the constructor's writes. Rule: share mutable data only through locks, atomics, volatile, or concurrent collections, or don't share it at all.",
    },
  ],
  "os-deadlocks": [
    {
      title: "The four conditions with examples",
      body: "Mutual exclusion: a resource can be held by only one thread at a time (a lock, a printer). Hold and wait: a thread holds one resource while waiting for another. No preemption: resources can't be forcibly taken away; the holder must release them. Circular wait: a cycle of threads each waiting for a resource held by the next.\n\nAll four are needed for deadlock, so preventing any one prevents deadlock. Break mutual exclusion: use lock-free structures or immutable data (not always possible). Break hold and wait: acquire all resources at once (or none), e.g. tryLock on both and back off if either fails. Break no preemption: let the system take resources away (databases abort a transaction and release its locks). Break circular wait: impose a global order on resources and always acquire in that order; the most practical technique.\n\nResource allocation graphs visualize this: with single-instance resources, a cycle means deadlock; with multi-instance resources, a cycle is necessary but not sufficient.",
    },
    {
      title: "Banker's algorithm walkthrough",
      body: "Each process declares its maximum need for each resource type. The system tracks Available, Allocation and Need (= Max − Allocation). A state is safe if there's an order in which every process can obtain its remaining need from what's available plus what earlier processes release when they finish.\n\nExample with one resource type, 12 units total: P0 has 5, max 10 (needs 5); P1 has 2, max 4 (needs 2); P2 has 2, max 9 (needs 7). Available = 12 − 9 = 3. Safe sequence: P1 (needs 2 ≤ 3; finishes, available 5), then P0 (needs 5 ≤ 5; finishes, available 10), then P2 (needs 7 ≤ 10). Safe. If P2 now asks for 1 more, pretend to grant: available 2, P2 needs 6. P1 can finish (available 4), then neither P0 (needs 5) nor P2 (needs 6) can: unsafe, so the request must wait.\n\nReal operating systems don't use this (maximum needs are unknown, processes come and go), but databases and some embedded systems use avoidance-style reasoning.",
    },
    {
      title: "Deadlocks in real systems",
      body: "Application code: nested synchronized blocks in inconsistent orders; calling out to unknown code (listeners, callbacks) while holding a lock; a thread pool whose tasks wait on other tasks queued in the same full pool (thread starvation deadlock). Fixes: lock ordering, never hold locks while calling foreign code, separate pools for dependent tasks, timeouts with tryLock.\n\nDatabases: two transactions updating the same rows in opposite orders; foreign-key checks and gap locks adding unexpected locks. Databases detect cycles and abort one transaction with a deadlock error; applications must retry. Distributed systems: services waiting on each other synchronously (A calls B which calls A) can exhaust threads; use timeouts and avoid cycles in synchronous call graphs.\n\nDiagnosis: thread dumps (jstack) show threads BLOCKED on monitors with 'Found one Java-level deadlock'; database deadlock logs show the two statements involved.",
    },
  ],
  "os-memory": [
    {
      title: "Process address space layout",
      body: "From low to high addresses on a typical Linux process: the text segment (machine code, read-only and shareable between processes running the same program), initialized data, BSS (zero-initialized globals), the heap (grows up via brk/sbrk or mmap for large allocations), memory-mapped regions (shared libraries, mmap'd files, thread stacks), and the main thread's stack near the top (grows down). The kernel occupies the upper part of the address space, inaccessible from user mode. ASLR randomizes these positions to make exploits harder.\n\nStack: function frames with local variables, return addresses and saved registers; allocation is just moving the stack pointer, so it's very fast and freed automatically on return; size is limited (8 MB default main thread on Linux, often less for other threads), so deep recursion overflows it. Heap: dynamic allocation with malloc/new; lives until freed (or garbage collected); slower, fragments, and is shared by all threads (allocators use per-thread caches to avoid lock contention).",
    },
    {
      title: "Paging, page tables and the TLB in more depth",
      body: "Virtual memory is divided into fixed-size pages (4 KB typical; 2 MB and 1 GB huge pages), physical memory into frames of the same size. The page table maps virtual page numbers to frame numbers plus permission bits (present, read/write, user/kernel, executable, dirty, accessed). A flat table for a 48-bit address space would be huge, so x86-64 uses a 4-level tree (5-level on newer systems): only the parts covering used memory exist.\n\nEvery memory access needs a translation. The TLB is a small, fast cache of recent translations (dozens to a few thousand entries, split by level). A TLB hit costs about nothing; a miss triggers a page walk (up to 4 memory accesses, often cached). Programs with scattered access over large memory suffer TLB misses, which is why huge pages help databases and JVM heaps.\n\nSegmentation, the older approach, divided memory into variable-size segments (code, data, stack) with base and limit; it causes external fragmentation and survives in x86 mostly vestigially. Paging won because fixed-size frames make allocation trivial.",
    },
    {
      title: "Allocators and garbage collection",
      body: "malloc implementations (glibc ptmalloc, jemalloc, tcmalloc) keep free lists by size class, split and coalesce blocks, and use per-thread caches. Small objects come from size-class slabs (fast, some internal fragmentation); large ones get their own mmap regions. Memory freed to the allocator isn't always returned to the OS, so a process's RSS can stay high after a spike.\n\nGarbage-collected runtimes (JVM, Go, .NET) find unreachable objects automatically. Generational collectors exploit the observation that most objects die young: allocate in a young generation (bump-pointer allocation, very fast), copy survivors to older generations, and collect the old generation rarely. Collectors trade throughput, pause times and memory overhead: Java's G1 targets pause goals, ZGC and Shenandoah keep pauses under a few milliseconds even for huge heaps. Memory leaks still happen in GC languages when references are unintentionally kept (static maps, caches without eviction, listeners never removed).",
    },
  ],
  "os-virtual-memory": [
    {
      title: "Why virtual memory exists",
      body: "Virtual memory gives each process its own private address space that looks large and contiguous. Benefits: isolation (a process can't read or corrupt another's memory, since its page tables don't map those frames), simpler programming and linking (every program can assume the same layout), efficient sharing (shared libraries and fork use the same physical frames mapped into several processes), lazy allocation (memory isn't backed by RAM until touched), and overcommit (the sum of address spaces can exceed RAM, backed by swap or simply not used).\n\nLinux overcommits by default: malloc of 10 GB succeeds on an 8 GB machine; trouble starts only when pages are actually touched. If memory runs out, the OOM killer picks a process to kill (by a badness score). Containers hit the same mechanism per cgroup when exceeding their memory limit.",
    },
    {
      title: "Page replacement algorithms compared",
      body: "When a page must be brought in and no frame is free, the OS evicts a victim. Optimal (Belady's MIN): evict the page used furthest in the future; impossible in practice but the benchmark. FIFO: evict the oldest loaded page; simple but can evict hot pages and suffers Belady's anomaly (more frames can cause more faults). LRU: evict the least recently used page; good approximation of optimal for typical locality, but exact LRU needs updating on every access. Clock / second chance: approximates LRU with one reference bit per frame. Enhanced clock also uses the dirty bit (prefer evicting clean pages, which don't need a write-back). LFU-like and working-set based policies exist too; Linux uses active/inactive lists (a two-list approximation) and more recently multi-generational LRU.\n\nExample with 3 frames and references 1 2 3 4 1 2 5 1 2 3 4 5: FIFO gives 9 faults; with 4 frames FIFO gives 10 (Belady's anomaly); LRU with 3 frames gives 10, optimal gives 7. Being able to trace one such sequence is a common interview exercise.",
    },
    {
      title: "Copy-on-write and memory-mapped files",
      body: "Copy-on-write (COW): after fork(), parent and child share all pages marked read-only. When either writes a page, the CPU faults, and the kernel copies just that page for the writer. fork() is therefore cheap even for large processes; followed by exec, almost nothing is copied. Redis uses this for snapshots: it forks, the child writes the dataset to disk while the parent keeps serving, and only pages modified during the snapshot get copied (so memory use can spike under heavy writes).\n\nmmap maps a file into the address space: reading the memory triggers page faults that load file pages through the page cache; writes dirty pages that the kernel writes back later (or on msync). Advantages: no explicit read/write copies, the OS handles caching, and many processes can share the mapping. Used by databases (LMDB, older MongoDB engine), Kafka's index files, and loading large models or datasets. Downsides: I/O errors arrive as signals, and you give up control over when data is flushed, so many databases prefer their own buffer pool with direct I/O.",
    },
  ],
  "os-files-io": [
    {
      title: "File system structure",
      body: "In Unix-style file systems, an inode stores a file's metadata (size, owner, permissions, timestamps, link count) and pointers to its data blocks (direct pointers, plus indirect blocks or, in modern systems like ext4 and XFS, extents: contiguous ranges). The file name isn't in the inode: a directory is a special file mapping names to inode numbers.\n\nHard links are additional directory entries pointing to the same inode; the file's data is freed only when the link count reaches zero and no process has it open (which is why deleting a log file that a process still writes to doesn't free disk space). Symbolic links are small files containing a path; they can cross file systems and dangle if the target is removed.\n\nJournaling (ext4, XFS, NTFS) writes metadata changes (and optionally data) to a journal before applying them, so after a crash the file system replays or discards incomplete operations instead of running a long fsck. Copy-on-write file systems (ZFS, Btrfs, APFS) never overwrite in place, enabling cheap snapshots and checksums.",
    },
    {
      title: "I/O models: blocking, non-blocking, multiplexed, async",
      body: "Blocking I/O: read() waits until data is available; simple code, one thread per concurrent operation. Non-blocking I/O: read() returns immediately with EAGAIN if no data; the program must poll. I/O multiplexing: select/poll/epoll/kqueue wait on many descriptors at once and report which are ready; a single thread then performs the ready reads and writes. This is the reactor pattern behind Nginx, Redis, Node.js and Netty. Asynchronous I/O: submit operations and get completion notifications later (Windows IOCP, Linux io_uring, which uses shared submission/completion rings to avoid syscalls per operation); the proactor pattern.\n\nEvent loops are efficient for many mostly idle connections, but any blocking call or CPU-heavy work inside the loop stalls every connection; offload such work to a thread pool. Thread-per-request with virtual threads or goroutines achieves similar scalability with blocking-style code, because the runtime multiplexes them onto few OS threads using non-blocking I/O underneath.",
    },
    {
      title: "Buffering, the page cache and direct I/O",
      body: "Several layers buffer data. User-space buffers (stdio, BufferedOutputStream) batch small writes into fewer syscalls; they must be flushed. The kernel's page cache holds file pages in RAM: reads hit it when data is cached (that's why the second read of a file is fast), and writes dirty pages that background writeback flushes after a delay (seconds). The disk itself has a volatile write cache; fsync also issues a flush/FUA command so data reaches stable storage.\n\nO_DIRECT bypasses the page cache, so the application manages its own cache (databases like MySQL InnoDB and ScyllaDB do this to avoid double caching and to control I/O scheduling). Readahead detects sequential reads and prefetches.\n\nZero-copy: sendfile() and splice() move data from the page cache to a socket without copying it through user space; with NIC support (scatter-gather DMA), data isn't copied by the CPU at all. Kafka uses this to serve consumers at high throughput.",
    },
  ],
  "os-kernel": [
    {
      title: "System calls step by step",
      body: "A system call is the controlled entry from user mode into the kernel. The program (usually through libc) puts the syscall number and arguments in registers and executes a special instruction (syscall on x86-64). The CPU switches to kernel mode, jumps to the kernel's entry point, which saves user registers, validates arguments (pointers must point into the caller's memory), performs the operation (possibly blocking the thread), and returns to user mode with a result or error code (errno).\n\nCost: a few hundred nanoseconds for a trivial call, more with security mitigations (Spectre/Meltdown fixes added overhead to mode switches), plus whatever the operation does. Programs reduce syscall counts by buffering (one write of 64 KB instead of 64 writes of 1 KB), using vectored I/O (readv/writev), batching (io_uring, sendmmsg), and vDSO for frequent cheap calls like gettimeofday, which run in user space.\n\nstrace shows the syscalls a process makes, which is a quick way to see what a program is really doing (files opened, network calls, sleeps).",
    },
    {
      title: "Interrupts, exceptions and signals",
      body: "Hardware interrupts come from devices (network card received packets, disk finished, timer tick). The CPU stops the current work, jumps to the kernel's interrupt handler, which does minimal work (acknowledge, queue data) and defers the rest to softirqs/tasklets or kernel threads to keep interrupts short. High packet rates use interrupt coalescing and polling (NAPI) to avoid interrupt storms.\n\nExceptions (traps and faults) come from the CPU executing an instruction: page faults, division by zero, invalid opcode, breakpoints; the kernel handles them (load a page) or turns them into signals for the process (SIGSEGV, SIGFPE).\n\nSignals are the kernel's asynchronous notifications to processes: SIGINT (Ctrl+C), SIGTERM (polite stop), SIGKILL and SIGSTOP (can't be caught), SIGCHLD (child exited), SIGPIPE (wrote to a closed pipe/socket), SIGHUP (often 'reload config'). Signal handlers run asynchronously, interrupting the program at any point, so they should only set flags or write to a self-pipe; most work belongs in the main loop.",
    },
    {
      title: "Namespaces, cgroups and container isolation",
      body: "Linux namespaces give a process its own view of a global resource: PID (process ids start at 1 inside), mount (its own file system tree, usually an image's root via overlayfs), network (own interfaces, routing tables, ports; connected via veth pairs and bridges), UTS (hostname), IPC, user (map container root to an unprivileged host user), cgroup and time.\n\ncgroups (control groups) limit and account resources for a group of processes: CPU (quota per period, or weights), memory (hard limit triggers OOM kill inside the group), block I/O bandwidth, PIDs (stop fork bombs). Kubernetes resource requests and limits translate directly into cgroup settings.\n\nAdditional hardening: seccomp filters restrict which syscalls a container can make, capabilities drop root privileges (no CAP_SYS_ADMIN), read-only root file systems, and LSMs (AppArmor, SELinux). For stronger isolation between untrusted tenants, use sandboxed runtimes (gVisor) or lightweight VMs (Firecracker, Kata Containers), since all containers share one kernel and a kernel bug can break isolation.",
    },
  ],
};
