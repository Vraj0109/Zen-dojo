# 0013: LLD problems with full Java codebases, diagrams and long explanations

- **Status:** in-progress (batch A written; Java not compiled yet, no JDK on the dev machine)
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Claude Code

## Goal

Each LLD problem becomes a complete, compilable Java project (several files, a `Main` that runs the main flow, and
tests), with a class diagram, a sequence diagram, a long walkthrough of the design decisions, and the concurrency
story. Today each of the 10 has a ~60-line sketch. The user wants entire codebases "preferably in Java", for example
parking lot, URL shortener, elevator.

## Context

- Today: `LldGuide { requirements, entities, patterns, code, extensions }` in `learn/types.ts`, data in `learn/lld.ts`
  (`LLD_GUIDES`), extras in `learn/lld-extra.ts` (`recap`, `flow`, `edgeCases`). Ids: lldp-booking, elevator,
  file-system-kv, food-cab, games, logger-notifications, lru-rate-limiter, parking-lot, splitwise, vending-atm.
- Add three problems interviews ask often: `lldp-url-shortener`, `lldp-library` (books, members, loans, fines),
  `lldp-hotel` (rooms, bookings, pricing), `lldp-meeting-rooms` (scheduler with conflicts): four new, 14 in total.
  Register them in `study.ts` (LLD practice list; update the count guard in `study.test.ts`) and in `LLD_GUIDES`.
- Code is Java 17, standard library only, no frameworks. Each file is shown separately.
- Rules for every project: interfaces at the seams; the patterns named in the text are actually used in the code;
  injectable `Clock`; thread-safe where the problem needs it (say how); no static mutable state; `record` for value
  objects; no TODOs. A reader can paste the files into a folder and run them.

## Out of scope

- Spring/JPA, UI, persistence beyond in-memory maps (say in the text how it would change).

## Steps

- [x] **1. Types.** In `learn/types.ts` add `LldProject { files: { name: string; code: string }[]; main: string;
  expectedOutput: string[]; tests?: { name: string; code: string }[] }` and `LldDeep { walkthrough: Section[];
  classDiagram: string; sequenceDiagram: string; stateDiagram?: string; concurrency: string[] }`.
  - Done when: typecheck passes.
- [x] **2. Data.** New files `learn/lld-projects-a.ts`, `-b.ts`, `-c.ts`, `-d.ts`, exported and merged in
  `learn/index.ts` as `LLD_PROJECTS` and `LLD_DEEP`.
- [ ] **3. Content per problem (the unit of work).**
  - 5-12 Java files with the real classes (parking lot: `VehicleType`, `Vehicle`, `Spot`, `Floor`, `Ticket`,
    `PricingStrategy`, `HourlyPricing`, `SpotAllocationStrategy`, `NearestSpotStrategy`, `ParkingLot`, `Main`),
    150-400 lines in all, comments only where the why is not obvious.
  - `walkthrough`: 6-10 sections, 1,200+ words: requirements and what to clarify, the entity model and why, each
    pattern and the alternative rejected, the main flow traced step by step, concurrency, testing, how to extend (new
    vehicle type, new pricing, multi-lot), what interviewers probe.
  - Class diagram and sequence diagram (Mermaid); a state diagram where there is state (elevator, vending machine,
    booking, ticket).
  - 2-4 tests as plain `main`-style assertions in a tiny `TestRunner` (no JUnit dependency).
  - Done when: the files compile and `Main` prints the `expectedOutput` lines (step 5).
- [x] **4. Page.** `study/[area]/[id]/page.tsx` for LLD problems: Requirements, Design (class diagram), Code (one
  coloured block per file, copy button), Flow (sequence diagram), Concurrency, Extensions, Tests. Keep Simple-mode
  behaviour from 0005. No new nav item.
  - Done when: a problem page shows all of it.
- [ ] **5. Compile and run test.** `apps/web/lib/lld-projects.test.ts`: for each project write the files to a temp dir,
  run `javac`, then `java Main`; assert exit code 0 and that stdout contains each `expectedOutput` line. Run the tests
  too. Skip with a clear message when `javac` is missing (same pattern as `pattern-article-code.test.ts`). Add JDK 17
  to `.github/workflows/ci.yml` (`actions/setup-java`, temurin 17). Add a JDK check/install to `setup.ps1`
  (`EclipseAdoptium.Temurin.17.JDK` via winget) and `setup.sh`, same pattern as the C++ compiler step.
  - Done when: `pnpm test` runs the Java tests when a JDK exists, and CI runs them.
- [x] **6. Content tests.** In `learn/learn.test.ts`: every LLD problem has a project, a 1,000+ word walkthrough, a class
  diagram, a sequence diagram and a `Main`.

## Batches (one per sitting; `pnpm check`, then tick)

- [x] A. parking-lot, elevator, vending-atm (written; awaiting the Java compile run)
- [ ] B. lru-rate-limiter, logger-notifications, url-shortener
- [ ] C. booking, splitwise, library
- [ ] D. food-cab, games, file-system-kv
- [ ] E. hotel, meeting-rooms

## Acceptance criteria

- [ ] All 14 problems have compiling projects; the page shows code, diagrams and the long walkthrough.
- [ ] Java tests pass locally with a JDK and in CI.
- [ ] `pnpm check` passes.

## Open questions

## Implementation notes

**Batch A, 2026-11-07.** `learn/lld-projects-a.ts` has `LLD_PROJECTS_A` and `LLD_DEEP_A` for parking lot (19 files + tests), elevator (8 + tests) and vending machine (12 + tests).

- Parking lot: Strategy (allocation, pricing), Decorator (daily cap), Observer (display board); per-spot locking, no global lock; 100 threads racing for 20 spots in a test.
- Elevator: LOOK sweep per car (TreeSet of stops), a cost-based dispatch strategy, tick-driven so tests are deterministic, one lock in the controller.
- Vending machine: State pattern, exact change by bounded backtracking (plain greedy fails with limited stock; a test covers it). The ATM is covered in the walkthrough only (state mapping, note dispensing, debit-then-dispense), not as code. Say so if you want it implemented too.
- Each problem has a 1,500+ word walkthrough (6-7 sections), class and sequence diagrams, a state diagram where it applies, and concurrency notes. All 14 diagrams parse with Mermaid (jsdom test).
- Page: `LldProjectView` in `study/learn-ui.tsx` shows Full design walkthrough, Diagrams, The full code (one block per file) and Concurrency after the old collapsed reference answer. Looked at it in a real window (dark theme).
- `apps/web/lib/lld-projects.test.ts` compiles with `javac -Xlint:all`, runs `Main`, checks every `expectedOutput` line and runs `Tests`. CI installs JDK 17 (`actions/setup-java`). `setup.ps1` / `setup.sh` install a JDK like they install g++.
- **Not verified:** there is no JDK on this machine, so the test is skipped and **none of the Java has been compiled or run**. I traced Main and Tests by hand (ticket numbers, tick counts, change-making cases), but that is not a compile. Run `winget install EclipseAdoptium.Temurin.17.JDK` (or `setup.cmd`), open a new terminal and run `pnpm test`; fix anything it reports before releasing.
- **2026-11-08, user feedback:** the solutions are too simple and LLD needs more diagrams. Added `extraDiagrams` (`learn/lld-diagrams-a.ts`): 8 for the parking lot, 7 for the elevator, 7 for the vending machine / ATM (decision flows, exit/race/overload/refund sequences, component views, state machines, extension maps, the ATM design). The code is still the simple version; making it richer, and implementing the ATM as code, is item L1 in `docs/HANDOFF.md` and applies to every remaining batch.
- Remaining: batches B to E, the four new problems (url-shortener, library, hotel, meeting-rooms) and registering them in `study.ts`.

## Review
