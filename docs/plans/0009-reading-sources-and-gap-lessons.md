# 0009: Better reading sources for system design, LLD and core CS, and two missing lessons

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:**
- **Spec:** SPEC.md 5.3
- **Depends on:** nothing (data only). Independent of 0006-0008, but if 0006 is merged the reading section is already
  restyled; don't touch the component.

## Goal

Add the genuinely useful free resources from <https://github.com/javabuddy/best-system-design-resources> to the app's
reading list, plus a short list of free LLD and core CS sources, and fill the two small content gaps that repo exposed
(gossip protocol / actor model). Nothing paid, nothing with affiliate links.

## Context

- Review result (Claude Code, 2026-11-07): that repo is ~80% affiliate links to paid courses and books, with no LLD or
  core CS section. The app already covers most of its topics (Bloom filters, saga, CQRS-style patterns, idempotency,
  consistent hashing, leader election, circuit breakers, service discovery, rate limiting) and already lists 45
  readings (Dynamo, DDIA, system-design-primer, Raft, SRE book, OSTEP, CMU 15-445, refactoring.guru…). So this plan adds
  only what is new, not a copy of the repo.
- Reading list data: `packages/shared/src/reading.ts`. Entries use the helper
  `r(id, kind, title, by, url, items, why)`; `items` are concept/exercise ids from `packages/shared/src/study.ts`
  (`sd-*`, `lld-*`, `core-*` concepts; `sdd-*`, `lldp-*` exercises). Kinds: `paper | article | docs | book | course`.
  A test already checks reading `items` point at real ids; check `apps/web/lib/practice-tools.test.ts` and
  `packages/shared/src/*.test.ts` for it and keep it green.
- Concept lessons: a concept in `study.ts` (`points` list) needs a `Lesson` in `packages/shared/src/learn/` whose
  `explain` array has **one entry per point, same order**, plus `deeper` sections and `recap` in a `deep-*.ts` file
  (`LessonExtra`). `learn/learn.test.ts` enforces coverage. Copy the structure of a nearby concept, e.g. the Bloom
  filter lesson (`sd-probabilistic`).
- Links must be free, direct (no `bit.ly`, `buff.ly`, `amzn.to`, no `?r=`, `?via=`, `affiliate_id`, `utm_*`
  parameters), and written with `https`.
- Licence/writing rules: summaries and "why" lines are written fresh in our words (AGENTS.md: learning content is
  written for this app, plain language).

## Out of scope

- Paid courses, books sold via Amazon, mock-interview platforms, the repo's Medium/Javarevisited review articles.
- Changing the reading UI, the DB, or adding any import/scraper.
- Copying text from any of the linked pages.

## Steps

- [ ] **1. Verify every URL first.** Write nothing into `reading.ts` until each link below returns HTTP 200 (or a
  redirect to the same article) when fetched (`Invoke-WebRequest -Method Head`, or open it). Drop any that fail and
  list them in *Implementation notes*. Use the final URL after redirects, with tracking parameters removed.
  - Done when: the notes list each URL checked and its result.

- [ ] **2. Add system design readings** (kind `article` unless noted; `items` suggestions in brackets, adjust to real
  ids in `study.ts`; skip an entry whose id doesn't exist):
  - Gossip Protocol, systemdesign.one: `https://newsletter.systemdesign.one/p/gossip-protocol` (path may differ:
    start from `https://newsletter.systemdesign.one/gossip-protocol/`) [consensus/membership concept, `sdd-kv-store`]
  - Actor Model, systemdesign.one [new concept from step 5]
  - Quotient filter, systemdesign.one [`sd-probabilistic`]
  - Back of the envelope estimation, systemdesign.one [`sd-fundamentals`, any estimates concept]
  - What happens when you type a URL into your browser, systemdesign.one [`core-*` networking concept that already
    mentions it]
  - How Amazon S3 achieves 99.999999999% durability, systemdesign.one [storage/replication concepts, `sdd-*`
    file-storage design]
  - How to scale an app to 10 million users on AWS, systemdesign.one [`sd-fundamentals`]
  - Service discovery, systemdesign.one [the concept that covers service discovery]
  - Real-time gaming leaderboard, live comments, distributed counter, real-time presence, systemdesign.one: attach each
    to the matching `sdd-*` design exercise.
  - High Scalability (`http://highscalability.com/`, use https if it redirects), kind `docs`, attach to
    `sd-fundamentals`, why: "Architecture write-ups of real systems; read three before week 16".
  - Engineering blogs, kind `docs`, **one entry**: "Company engineering blogs" pointing at a single hub. Don't add 35
    entries; pick the 6 that still publish and are worth it (Netflix Tech Blog, Uber Engineering, Dropbox Tech,
    Pinterest Engineering, Cloudflare Blog, Discord Engineering): one `r()` each, attached to `sd-fundamentals`, only
    if the URL works and the blog has posts from the last year.
  - Done when: entries added, no duplicates of existing ids/URLs (search `reading.ts` first: `dynamo`,
    `consistent-hashing`, `bloom-filter`, `saga`, `stripe-rate-limiters`, `ddia` already exist), tests pass.

- [ ] **3. Add LLD readings.** Candidates (verify each; free only):
  - Design patterns in Java examples: `https://github.com/iluwatar/java-design-patterns` (kind `docs`)
  - Awesome low-level design problems: `https://github.com/ashishps1/awesome-low-level-design` (kind `docs`, attach
    to the LLD practice exercises as extra problems to try; **do not copy its code**)
  - Martin Fowler's catalog of refactoring/enterprise patterns: `https://martinfowler.com/eaaCatalog/` (kind `docs`)
  - Attach to the matching `lld-*` concepts or all `lldp-*` exercises, with a one-line "why" in our own words.
  - Done when: added or each skipped one is explained in the notes.

- [ ] **4. Add core CS readings.** Candidates (verify; free only; skip duplicates of `ostep`, `cmu-db`, `hpbn`,
  `use-the-index`):
  - Beej's Guide to Network Programming: `https://beej.us/guide/bgnet/` [networking sockets/TCP concepts]
  - Kurose and Ross lecture slides and videos: `https://gaia.cs.umass.edu/kurose_ross/lectures.php` [networking
    concepts]
  - MIT 6.S081 operating system engineering: `https://pdos.csail.mit.edu/6.S081/` [OS concepts]
  - The Internals of PostgreSQL: `https://www.interdb.jp/pg/` [DB storage, MVCC, WAL concepts]
  - Done when: added or skipped with a reason, ids exist.

- [ ] **5. Two small lessons for the gaps.** Add a concept **"Gossip protocols and failure detection"** and a concept
  **"The actor model"** in the system design area (`study.ts`, section with `sd-blocks` or the consensus section,
  whichever fits), each with 4-6 `points`, a `Lesson` (overview, one `explain` per point, 4+ interview `questions`,
  `pitfalls`), `LessonExtra` with `recap` (3-6 lines) and at least 3 `deeper` sections (a worked example, a comparison
  with the alternative: e.g. gossip vs leader-based heartbeats, actors vs threads+locks; a failure scenario), written
  in our own words. Use new ids `sd-gossip` and `sd-actors`; attach the step-2 readings to them.
  - Done when: both pages open under `/study/sd/…`, `pnpm test` passes (coverage tests included), and Quick revise
    lists their recap lines.

- [ ] **6. Tests.** Extend the existing reading test (or add `packages/shared/src/reading.test.ts`) to assert: every
  `url` starts with `https://` (or `http://` only for a documented exception), contains none of `bit.ly`, `buff.ly`,
  `amzn.to`, `affiliate`, `utm_`, `?r=`, `?via=`; ids are unique; every `items` id exists.
  - Done when: `pnpm test` passes, and fails if you add a `bit.ly` link temporarily.

## Acceptance criteria

- [ ] New readings appear on the matching concept/design pages (e.g. gossip article on the key-value store design)
  and on `/study/reading`.
- [ ] No paid, affiliate, or shortened links anywhere in `reading.ts`.
- [ ] `/study/sd/sd-gossip` and `/study/sd/sd-actors` exist with full lessons.
- [ ] Notes list every URL checked and which were dropped.
- [ ] `pnpm check` passes.

## Open questions

## Implementation notes

## Review
