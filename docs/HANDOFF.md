# Handoff: finishing the learning-content work

Written 2026-11-08 by Claude Code for the next agent (Claude Code, Antigravity or anything else). Read this first, then
`AGENTS.md`, then the plan you pick up. It says what is done, what is left, in what order, how to verify, and what has
already gone wrong once so you do not repeat it.

## 1. The project in three lines

HabitManager is a personal tracker for a 16-week SDE2/SWE3 interview-prep roadmap (Next.js 16 + SQLite, packaged as an
Electron app; pnpm workspace). The current job is **content depth**: the user wants every DSA pattern, LLD problem,
system design and core subject taught in full, with diagrams. Plans are in `docs/plans/NNNN-*.md`; `docs/plans/README.md`
is the index. The plan file is the contract: tick its boxes, write its *Implementation notes*, set its status.

## 2. How we work (the user's rules)

- **Claude and Antigravity both implement now.** (Antigravity was too slow, so the user said Claude implements too.)
- **Commits:** one commit per batch, message in plain English, **never a `Co-Authored-By` line or any AI attribution**.
  Only commit or push when the user asked in this conversation. They asked for everything to be pushed on 2026-11-08.
- **Done means checked.** `pnpm test` then `pnpm check` (lint, typecheck, test, build) before saying a batch is done.
  Report failures as they are. Never claim code is compiled when it was not (see section 5).
- **Writing for the user:** plain, specific, short sentences, no hype, no emoji (there is a test for emoji).
- **Never touch `data/habit.db`** or the desktop app-data folder. Test against a copy or `:memory:`.
- **Depth is what the user wants.** They read the exemplar DSA articles (about 2,000 words, traced examples, C++) and said
  "the details are right, I need that much". Do not shorten to save effort.
- **LLD feedback (2026-11-08):** "solutions for these LLD problems are too simple, and LLDs are the ones that need the
  diagrams." See section 6, item L1: this is an open requirement, not finished.

## 3. Machine setup you need

| Tool | Why | Where it is on the user's Windows machine |
|---|---|---|
| g++ (WinLibs 16.2) | compiles the C++ in DSA articles (`apps/web/lib/pattern-article-code.test.ts`) | `C:\Users\bhavn\AppData\Local\Microsoft\WinGet\Packages\BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe\mingw64\bin`. Not always on PATH in the agent shell: `export PATH="<that dir>:$PATH"` first. |
| JDK 17 | compiles and runs the Java projects (`apps/web/lib/lld-projects.test.ts`) | **Not installed yet.** `winget install EclipseAdoptium.Temurin.17.JDK` (or `setup.cmd`), then a new terminal. Until it exists that test is *skipped* and no Java has been compiled. |
| pnpm | everything | use `pnpm.cmd` in PowerShell/Git Bash on Windows |

Both tests skip themselves when the compiler is missing, so a green `pnpm test` on a machine without g++/javac proves
nothing about the code in the content. CI (`.github/workflows/ci.yml`) has both g++ (runner default) and JDK 17.

## 4. State of every plan

| Plan | What | Status |
|---|---|---|
| 0001-0007, 0009-0011 | DSA focus, study pages, cp-algorithms, nav, timer, declutter, article format, reading list, no-emoji UI, code colouring | done / implemented, v0.3.0 released |
| 0012 | Mermaid diagrams (`Section.diagram`, `app/diagram.tsx`, parse tests) | implemented. **Open:** step 4, check the packaged desktop build shows a diagram offline (`pnpm --filter desktop prepare-server`, then run it with the network off) |
| 0008 | the other 64 DSA pattern articles | **in progress: 22 of 67 written** (batches 1-3 of 10) |
| 0013 | LLD problems as full Java projects | **in progress: batch A of 5 written** (parking lot, elevator, vending machine); Java uncompiled; user says too simple (L1) |
| 0014 | system design: diagrams, depth, Java for the key part | ready, **not started** |
| 0015 | core subjects (OS, DB, networking, Java concurrency) depth | ready, **not started** |

Written so far, where it lives:

- DSA articles: `packages/shared/src/learn/dsa-articles-a.ts` (hash-map, two-pointers, sliding-window), `-b.ts` (prefix-sums,
  kadane, intervals, cyclic-sort, string-matching, matrix), `-c.ts` (bs-index, bs-answer, quickselect, custom-sort,
  merge-sort-count), `-d.ts` (fast-slow, list-reversal, monotonic-stack, monotonic-deque) and `-d2.ts` (stack-parsing, heap-top-k, two-heaps, lru-lfu). Registered in `learn/index.ts` (`PATTERN_ARTICLES`).
- LLD: `learn/lld-projects-a.ts` (`LLD_PROJECTS_A`, `LLD_DEEP_A`), `learn/lld-diagrams-a.ts` (extra diagrams), merged in
  `learn/index.ts` (`LLD_PROJECTS`, `LLD_DEEP`). Page: `LldProjectView` in `apps/web/app/study/learn-ui.tsx`, used by
  `app/study/[area]/[id]/page.tsx`.

## 5. Verification (do this every batch)

```bash
export PATH="/c/Users/bhavn/AppData/Local/Microsoft/WinGet/Packages/BrechtSanders.WinLibs.POSIX.UCRT_Microsoft.Winget.Source_8wekyb3d8bbwe/mingw64/bin:$PATH"
pnpm.cmd exec vitest run packages/shared apps/web/lib/pattern-article-code.test.ts apps/web/lib/diagrams-parse.test.ts apps/web/lib/lld-projects.test.ts apps/web/app/no-emoji.test.ts
pnpm.cmd check        # lint + typecheck + test + build, about 3 minutes
```

What each test guards:

- `learn/pattern-articles.test.ts`: eight required sections in order, 900+ words, 2+ code blocks, no placeholders, the
  Practice order names at least min(3, number of the pattern's problems) of its problems **by exact title** (titles are
  in `packages/shared/src/dsa.ts`; look them up with `grep "lc(NUMBER," dsa.ts`).
- `apps/web/lib/pattern-article-code.test.ts`: all code blocks of one article are concatenated and compiled with
  `g++ -std=c++17 -fsyntax-only -Wall`. **Helper names must be unique within an article.**
- `learn/learn.test.ts` (LLD block): each Java project has `Main.java`, tests, expected output, no TODO, and a 1,000+
  word walkthrough with 6+ sections, a class diagram and a sequence diagram.
- `apps/web/lib/lld-projects.test.ts`: `javac -Xlint:all`, runs `Main`, checks every `expectedOutput` line is printed, runs
  `Tests` and requires `PASS` and no `FAIL`.
- `apps/web/lib/diagrams-parse.test.ts` (jsdom): parses **every** diagram with Mermaid. A bad diagram fails here.

Looking at a page: start `pnpm --filter web exec next dev -p 3112` with `DATABASE_URL=file:<copy of a db>`; open
`/dsa/pattern/<id>` or `/study/lld/<lldp-id>`. Electron works as a headless browser (the helper scripts were in a scratchpad
and are not in the repo). If the dev server shows `Cannot read properties of undefined`, it is a stale module cache for the
workspace package: kill the dev server and start it again.

## 6. What is left, in order

### L1. Make the LLD solutions richer and diagram-heavy (user feedback, do this first)

The user said the three finished LLD solutions are too simple and that LLD needs more diagrams. Diagrams were extended on
2026-11-08 (each problem now has 7-8 extra diagrams in `lld-diagrams-a.ts`: decision flows, exit/race/overload sequences,
component views, state machines, extension maps, the ATM design). **The code is still the simple version.** Raise it:

- Per problem add the features an interviewer asks for next, as real code with tests, not as prose:
  - Parking lot: electric-vehicle spots (capability on `Spot` + a strategy), reservations, a payment step at exit
    (`PaymentProcessor` interface, cash and card), several lots behind a `Garage`, lost-ticket handling, a report of
    revenue and occupancy.
  - Elevator: a car taken out of service hands its stops back (the diagram "Car taken out of service mid-trip" already
    shows it, implement `drainStops`), express cars with allowed floors, fire-service mode, direction-aware hall calls
    (an UP call must not be picked up by a car going DOWN past it), an event log.
  - Vending machine: out-of-service state, staff refill and cashbox collection (maintenance state), card payment as a
    second payment strategy, a timeout refund driven by the clock. **Implement the ATM as code** too (states, a
    `CashDispenser` that plans notes with the same bounded search, `BankService` with hold/confirm/reverse, PIN attempts),
    because the problem is titled "Vending machine / ATM" and only the vending half exists as code.
- Aim for 400-800 lines of Java per problem instead of 150-400, still standard library only.
- Add a **package/module diagram, an object diagram of a runtime snapshot, and an activity diagram per main flow** if they
  help; every new diagram goes in `lld-diagrams-*.ts` and is parsed by the test.
- Update `expectedOutput`, `Tests.java` and the walkthrough text so they match the new code exactly.
- Install the JDK first so you can really compile it (section 3).

### L2. Finish 0013 (batches B to E)

Follow `docs/plans/0013-lld-full-java-codebases.md`: B lru-rate-limiter, logger-notifications, url-shortener; C booking,
splitwise, library; D food-cab, games, file-system-kv; E hotel, meeting-rooms. Four are new problems and need entries in
`study.ts` (LLD practice list) plus the count guard in `study.test.ts`. Put each batch in `lld-projects-<letter>.ts` and
`lld-diagrams-<letter>.ts`, merge them in `learn/index.ts` and `learn/diagram-sources.ts` already reads `LLD_DEEP`.
Apply the richer standard from L1 to every one of them from the start.

### D. Finish 0008 (DSA batches 3 to 10 + retire the old guide)

Next: **batch 4 trees** (`dsa-articles-e.ts`), then batches 5-10 exactly as listed in
`docs/plans/0008-dsa-pattern-articles-batches.md`. One batch per sitting. Final step 11 retires the short guide on the
page and makes "every pattern has an article" a failing assertion.

Article recipe (copy the structure of `dsa-articles-c.ts`): intro; The intuition (+ a Mermaid `diagram`); Why it works (an
actual proof or invariant); A worked example (traced by hand with real numbers, verified); Implementation (+ "Implementation: ..."
sections as needed); Variants; Complexity; Pitfalls and edge cases; Practice order (exact problem titles). 1,300-2,200
words, C++17, code that compiles with `-Wall`. Patterns with a cp-algorithms mapping can be fact-checked against
`apps/web/content/cp-algorithms/`, but write your own text (licence).

### S. Plan 0014 (system design) and C. Plan 0015 (core subjects)

Both are fully specified in their plan files and not started. They need Mermaid diagrams (done: 0012) and Java code for the
key component; add `design-code`/`core-code` compile tests the way `lld-projects.test.ts` does it. Same depth standard.

### R. Release

After the Java compiles on a machine with a JDK and CI is green: write `docs/releases/v0.4.0.md`, bump
`apps/desktop/package.json` to 0.4.0, commit, `git tag v0.4.0`, push the tag (the workflow checks the tag equals the
version and publishes installers and notes). Never reuse or move a tag.

## 7. Pitfalls already hit (do not repeat them)

- **Shell quoting.** The Bash tool mangles backslashes and quotes in heredocs and `node -e`. Write scripts to a file
  (the scratchpad or `$TEMP`) and run them, or use the Edit/Write tools. A regex `\s` lost its backslash once and made a
  test pass vacuously: after writing any regex through a script, read the file back.
- **Mermaid:** quote every node label (`A["text with [brackets]"]`); an unquoted `[right]` inside a label breaks the diagram.
  No semicolons or `#` in message text. The parse test catches syntax errors, not layout problems: look at big ones.
- **Template literals:** content is written in TypeScript template literals. Never put a backtick or `${` in the text or
  the code, and avoid backslashes (write Java strings without `\n`).
- **Next 16 `cacheComponents`:** no `Date.now()`/`Math.random()` in render; request data behind `await connection()` in a
  `Suspense`. Client components cannot read the clock during prerender (this broke the build once).
- **Lockfile:** if you add a dependency, commit `package.json` and `pnpm-lock.yaml` together. CI uses
  `pnpm install --frozen-lockfile`; a mismatch once failed CI (it looked like a lint error but was the lockfile).
- **Tests that skip.** No g++ or javac means the compile tests silently skip. Say which compilers you had when you report.
- **Hand-traced examples are not proof.** Three of them in batch 2 had slips (a day count, a wrong trace). Recompute
  every number in a worked example before committing.
- **Do not leave stale claims in docs.** The README index, the plan status and the notes must match reality.

## 8. Git state when this was written

All work is committed in per-batch commits on `main`. Push status: see `git status -sb`. Release v0.3.0 is published;
v0.4.0 is not cut.
