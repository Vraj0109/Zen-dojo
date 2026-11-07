# 0015: Core subjects (OS, databases, networking, concurrency) with more explanation, diagrams and Java demos

- **Status:** ready (needs 0012 for diagrams)
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:**

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
- [ ] **3. Tests.** `learn.test.ts`: each core concept reaches 1,200 words in lesson plus extras; every diagram is
  valid (0012 test); Java demos compile and run (`apps/web/lib/core-code.test.ts`, same helper as 0013 step 5).

## Batches

- [ ] A. Operating systems: processes and threads, scheduling, synchronisation and deadlock, memory and paging, file
  systems and IO
- [ ] B. Databases: indexes and B+trees, transactions and isolation levels, MVCC, locking, query planning,
  replication, sharding
- [ ] C. Networking: TCP, UDP, HTTP/1.1-2-3, TLS, DNS, load balancing, CDN, WebSockets
- [ ] D. Concurrency in Java: memory model, synchronized and locks, executors, concurrent collections,
  CompletableFuture

## Acceptance criteria

- [ ] Every core concept reaches the word target; diagrams render; Java demos compile and print what the text says.
- [ ] `pnpm check` passes.

## Open questions

## Implementation notes

## Review
