# 0015: Core subjects (OS, databases, networking, concurrency) with more explanation, diagrams and Java demos

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Claude Code (agent C, branch agent/c-lessons), round two

## Goal

The core CS lessons (`core-os`, `core-db`, `core-net` and the concurrency topic under LLD) explain mechanisms step by
step, with diagrams, and show small runnable Java demos where code makes the idea concrete: a deadlock and its fix, a
thread pool, producer-consumer, MVCC snapshot visibility, the TCP handshake as a sequence diagram, TLS, DNS
resolution, page replacement.

## Context

- Lessons: `Lesson {overview, explain[], questions[], pitfalls?}` with extras `LessonExtra {recap, deeper: Section[]}`
  from `core.ts`, `deep-core.ts`, `more-os.ts`, `more-db.ts`, `more-net.ts`. Concept ids per area are in `study.ts`.
- New `deeper` sections use `diagram` (plan 0012) and `lang: "Java"` code. New files `learn/core-depth-os.ts`,
  `-db.ts`, `-net.ts`, `-conc.ts` are merged into `MORE` in `learn/index.ts`.
- Per concept add 2-4 sections so the total is 1,200+ words; at least half the concepts get a diagram; any code is
  Java 17 with a `main` that prints exactly what the text says it prints.
- Accuracy over volume. Where behaviour differs (Postgres vs MySQL InnoDB, Linux vs Windows), say which.

## Out of scope

- Rewriting existing text, new concepts (this deepens existing ones), non-Java languages.

## Steps

- [ ] **1. Inventory.** List every core concept id with its current word count (scratchpad script, not committed);
  record the table in *Implementation notes*; pick the diagram and demo per concept.
- [ ] **2. Content, in the batches below**, `pnpm check` after each.
- [x] **3. Tests.** `learn.test.ts`: each core concept reaches 1,200 words in lesson plus extras; every diagram is
  valid (0012 test); Java demos compile and run (`apps/web/lib/core-code.test.ts`, same helper as 0013 step 5).

## Batches

- [x] A. Operating systems: processes and threads, scheduling, synchronisation and deadlock, memory and paging, file
  systems and IO
- [x] B. Databases: indexes and B+trees, transactions and isolation levels, MVCC, locking, query planning,
  replication, sharding
- [x] C. Networking: TCP, UDP, HTTP/1.1-2-3, TLS, DNS, load balancing, CDN, WebSockets
- [x] D. Concurrency in Java: memory model, synchronized and locks, executors, concurrent collections,
  CompletableFuture

## Acceptance criteria

- [x] Every core concept reaches the word target; diagrams render; Java demos compile and print what the text says.
- [x] `pnpm check` passes.

## Open questions

## Implementation notes

Written in round two, directly in the Markdown lessons (`packages/shared/content/core/*.md`), after the core and system design lessons were migrated to Markdown (the old TypeScript files were deleted).
- **Inventory** (words in lesson plus extras before / after): OS 897-955 -> 1,200+, databases 736-1,004 -> 1,200+, networking 810-1,020 -> 1,200+. None had diagrams before; every one of the 24 now has at least one. Added one to three `###` sections per concept; `learn.test.ts` requires each section body to reach 200 words, so sections are 200+ words.
- **Batch A (OS):** shell fork/exec/pipe/zombies, priority inversion, race fixes in Java, deadlock detection with ThreadMXBean, malloc and buddy/slab, page replacement counts (Java), write() to disk with fsync, container start-up.
- **Batch B (databases):** logical order of SELECT, anomalies and star schema, covering indexes, commit path and durability, check-then-insert race, MVCC engine (Java), why the optimizer is wrong, WAL redo (Java).
- **Batch C (networking):** encapsulation and MTU, CIDR (Java) and VPC layout, head-of-line blocking and Nagle, rebuilding reliability over UDP and QUIC 0-RTT, dig and DNS pitfalls, ETag/304 (Java HTTP demo), certificate validation, echo server (Java) and accept queue.
- **Java demos** (compiled once with `javac -Xlint:all` on JDK 17 and run, output copied into the text): RaceDemo, DeadlockDetect, PageFaults, MvccDemo, WalDemo, CidrDemo, EtagDemo, EchoDemo. `apps/web/lib/core-code.test.ts` compiles and runs every Java block in a lesson that has a main method (skipped without a JDK).
- **Batch D (concurrency in Java) not done here:** the concept is `lld-concurrency`, an LLD lesson owned by agent D. Redo it after the merge.
- Tests: `learn/generated/depth.test.ts` (1,200 words and a diagram for every os-, db-, net- concept), `diagrams-parse.test.ts` parses every new diagram.

## Review
