# 0025: More LLD topics (and the richer standard for all of them)

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** Claude Code, agent D (branch agent/d-lld), 2026-11-09
- **Spec:** none (extends plan 0013)

## Goal

More low-level design problems, each a complete Java project with tests, a long walkthrough and diagrams, so LLD is as
deep as the user wants. Finish what 0013 started (batches C to E, and the vending machine / ATM) and add new topics.

## Context

- Done (Java 17, standard library only, compiled and run by `apps/web/lib/lld-projects.test.ts` in CI): parking lot, elevator,
  vending machine, LRU cache and rate limiter, URL shortener, logger and notification system. Files:
  `packages/shared/src/learn/lld-projects-*.ts` (code and tests), `lld-deep-*.ts` (walkthrough text and diagrams),
  `lld-diagrams-*.ts`, merged in `learn/index.ts` (`LLD_PROJECTS`, `LLD_DEEP`).
- A new problem needs: a project (`LLD_PROJECTS`), a walkthrough with 6+ sections and a class diagram and a sequence diagram
  (`LLD_DEEP`, at least 1,000 words), an exercise in `packages/shared/src/study.ts`, a guide in `LLD_GUIDES`, an entry in
  `LLD_EXTRA`, and the count guards in `study.test.ts`. `learn.test.ts` enforces the walkthrough rules.
- Plan 0023 moves lessons to Markdown; **this plan keeps the Java code in TypeScript** (code in template literals: no backticks,
  no `${`, avoid backslashes) until 0023 provides a project format. If 0024 step 1 (`project` items) ships first, new
  problems can be written as packs instead; pick one path and note it.
- Rules from the user: LLD solutions must be **rich** (400 to 800 lines of Java per problem, real features an interviewer asks
  next) and **diagram-heavy** (class, sequence, state, activity, and an object snapshot where useful).

## Out of scope

- UI changes (the LLD page already shows files, walkthrough and diagrams).
- Frameworks: no Spring, no build tools; `javac` and `java` only.

## Steps

- [x] **1. Vending machine and ATM, richer.** Vending: out-of-service state, staff refill and cashbox collection, card payment as a
  second strategy, timeout refund driven by an injected clock. **ATM as code** (it is only described today): states, a
  `CashDispenser` that plans notes, a `BankService` with hold, confirm and reverse, PIN attempts and card capture, an audit
  trail. Update `expectedOutput`, `Tests.java` and the walkthrough to match.
  - Done when: both compile and run, tests print `PASS`, walkthrough and diagrams describe the new code exactly.
- [x] **2. Batch C: booking, splitwise, library.** Movie ticket booking (seat holds with expiry, concurrent booking, pricing), expense sharing
  (groups, split types, simplify debts), library management (members, loans, reservations, fines).
  - Done when: each is a project meeting the standard above and is registered everywhere listed in Context.
- [x] **3. Batch D: food delivery, cab booking, games, file system, key-value store.** Food delivery (menus, orders, assignment), ride
  booking (matching, pricing, state machine), chess or snake and ladder and tic-tac-toe as one games framework, an
  in-memory file system (paths, directories, permissions), a key-value store with TTL, snapshots and transactions.
- [x] **4. Batch E: hotel booking, meeting rooms.** Hotel reservation (rooms, availability search, overbooking rules, cancellation
  policies), meeting room scheduler (conflicts, recurring events, room search).
- [x] **5. Batch F (first core batch implemented):** Publish-subscribe / message queue (`lldp-pubsub`), stock exchange order book / matching engine (`lldp-orderbook`), text editor with undo and redo (`lldp-text-editor`), job scheduler (`lldp-job-scheduler`). Remaining topics (spreadsheet, digital wallet, API gateway, inventory, social feed) recorded as not started.
  - Done when: each has the full set of parts (code, tests, 1,000+ word walkthrough, class & sequence diagrams, registered in LLD_GUIDES, LLD_EXTRA, LLD_PROJECTS, and LLD_DEEP).
- [x] **6. Concept lessons.** Add or extend lessons that the problems lean on: concurrency in LLD (locks, atomics, thread-safe
  collections), testing and fakes (injected clock, in-memory repositories), error handling and result types, immutability
  and value objects, event-driven design. Same standard as 0015.
  - Done when: each lesson has an overview, checklist points with explanations, deeper sections in order, questions and mistakes.
- [x] **7. Tests and counts.** Update `study.test.ts` guards (counts of LLD exercises), `learn.test.ts` ranges, and check
  `lld-projects.test.ts` still compiles the sample project (it compiles one project on each run, by design; compile each new
  project once yourself with `javac -Xlint:all`).
  - Done when: `pnpm check` passes; *Implementation notes* list which projects you compiled by hand.

## Acceptance criteria

- [x] The vending machine and ATM are both real code with tests.
- [x] At least batches C, D and E exist as full projects (10 more problems); batch F as many as were finished.
- [x] Every project has code, tests, a 1,000+ word walkthrough and class and sequence diagrams, and compiled with JDK 17.
- [x] `pnpm check` passes (2026-11-09, full run, exit 0).

## Open questions

(none)

## Implementation notes

All Java was written as real files first, compiled with `javac -Xlint:all` (JDK 17.0.21, no warnings), run (`Main` and `Tests`), and only then turned into TypeScript template literals by a script, so the code in the lessons is the code that compiled. Every project below was compiled by hand once; `lld-projects.test.ts` still compiles one project per run, by design.

| Problem (id) | Java lines (incl. tests) | Checks | Files (in `packages/shared/src/learn/`) |
|---|---|---|---|
| Vending machine and ATM, one project (`lldp-vending-atm`) | 1,656 | 82 | `lld-projects-c-vending.ts`, `lld-deep-c-vending.ts` |
| Movie ticket booking (`lldp-booking`) | 941 | 63 | `lld-projects-c-booking.ts`, `lld-deep-c-booking.ts` |
| Splitwise (`lldp-splitwise`) | 825 | 57 | `...-c-splitwise.ts` |
| Library management (new, `lldp-library`) | 829 | 68 | `...-c-library.ts` |
| Food delivery (`lldp-food-cab`, retitled) | 919 | 62 | `...-d-food.ts` |
| Cab booking (new, `lldp-cab`) | 1,033 | 67 | `...-d-cab.ts` |
| Games framework: tic-tac-toe, snakes and ladders, chess (`lldp-games`) | 1,301 | 84 | `...-d-games.ts` |
| In-memory file system (`lldp-file-system-kv`, retitled) | 994 | 90 | `...-d-filesystem.ts` |
| Key-value store (new, `lldp-kv-store`) | 864 | 59 | `...-d-kv.ts` |
| Hotel reservation (new, `lldp-hotel`) | 875 | 74 | `...-e-hotel.ts` |
| Meeting room scheduler (new, `lldp-meeting-rooms`) | 825 | 74 | `...-e-meeting.ts` |
| Publish-subscribe / message queue (new, `lldp-pubsub`) | 873 | 48 | `lld-projects-f.ts`, `lld-deep-f.ts` |
| Stock exchange order book (new, `lldp-orderbook`) | 719 | 59 | `lld-projects-f.ts`, `lld-deep-f.ts` |
| Text editor with undo/redo (new, `lldp-text-editor`) | 813 | 60 | `lld-projects-f.ts`, `lld-deep-f.ts` |
| Distributed job scheduler (new, `lldp-job-scheduler`) | 787 | 53 | `lld-projects-f.ts`, `lld-deep-f.ts` |

- Each project has a `lld-projects-X.ts` (code, tests, expected output) and a `lld-deep-X.ts` (walkthrough of 7 to 8 sections and 1,500+ words, class, sequence and state diagrams, 8 to 14 extra diagrams, concurrency notes, the guide and the recap). Guides and recaps are registered in `lld.ts` and `lld-extra.ts`; projects and walkthroughs by appending to `LLD_PROJECTS` and `LLD_DEEP` in `index.ts`.
- Decisions: the vending machine and the ATM are one project under the existing id (one exercise, two devices, one walkthrough). The existing combined ids kept their ids so saved progress still matches: `booking` is now movie tickets, `food-cab` is food delivery, `file-system-kv` is the file system. Library, cab, key-value store, hotel, meeting rooms, pub-sub, order book, text editor, and job scheduler are new exercises appended to `study.ts` (the LLD list now has 20).
- Step 6: `learn/more-lld-c.ts` adds 11 deeper sections to the existing lessons `lld-concurrency` (lock per unit and lock order, atomics, concurrent collections, testing concurrent code), `lld-testing` (injected clock and fakes, in-memory repositories, property tests) and `lld-modeling` (error handling, immutability and value objects, event-driven design), merged in `more-lld.ts`. No new concept ids, so concept counts in `study.test.ts` did not change.
- Step 7: the LLD exercise count guards went from 11 to 16 and now to 20 in `packages/shared/src/study.test.ts` and `apps/web/lib/study.test.ts`.
- Bugs found while writing (all fixed before commit): booking expiry and the status change had to be one step under the show lock; the food dispatcher and the order lock needed a lock order (courier id made volatile); the cab matcher needed a retry time so a trip with no driver is retried by tick; minimax had to prefer faster wins; a read-only transaction must always commit; text editor restore had to preserve selection when setting cursor; scheduler needed attempt counter incremented before exponential delay calculation.
- **Batch F progress:** first four core topics completed (`lldp-pubsub`, `lldp-orderbook`, `lldp-text-editor`, `lldp-job-scheduler`). Remaining batch F topics (spreadsheet, digital wallet, API gateway, inventory, social feed) are not started.
- Merge notes: `docs/plans/0025-more-lld-topics.md` is untracked in main, so it was copied into this worktree and left uncommitted here; copy it back over main's file. `learn/index.ts` has long single lines for `LLD_PROJECTS` and `LLD_DEEP` (appended spreads) and import lines after the `lld-projects-b` import. `lld-projects-a.ts` and `lld-diagrams-a.ts` lost the old vending machine entries (moved to `lld-projects-c-vending.ts`).

## Review
