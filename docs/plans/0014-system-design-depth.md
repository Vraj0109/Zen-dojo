# 0014: System design walkthroughs with diagrams, fuller explanations and Java for the key parts

- **Status:** in-progress
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Claude Code (agent C, branch agent/c-lessons), round two

## Goal

Each of the 27 system design walkthroughs (`WALKTHROUGHS`, ids `sdd-*`) gets an architecture diagram, diagrams of the
write and read paths, longer deep dives that explain the reasoning (not just the answer), and, where one component is
the heart of the design, runnable Java for it: URL shortener ID generation and redirect, token bucket and
sliding-window limiter, consistent hashing ring, LRU/TTL cache, a toy Kafka-style log, a job scheduler loop, typeahead
trie.

## Context

- Walkthrough type: `requirements, estimates, api, data, design, deepDives[{title, body}], tradeoffs`
  (`learn/types.ts`), data in `learn/designs-a.ts`, `designs-b.ts`; extras (`recap`, `followUps`) in
  `learn/design-extra.ts`.
- Add `WalkthroughDeep { diagrams: DiagramBlock[]; sections: Section[]; code?: { name: string; code: string }[] }` in
  `learn/types.ts` (Java; `lang: "Java"`), data in `learn/design-deep-a.ts`, `-b.ts`, `-c.ts`, merged as `DESIGN_DEEP`.
- Each design needs: (a) a component diagram (flowchart) naming the stores and queues; (b) a write-path sequence
  diagram; (c) a read-path sequence diagram or a data-model ER diagram; (d) a failure-modes section (cache dies, hot
  shard, region down) with numbers; (e) 800+ extra words in `sections` that teach the why: each deep dive states the
  problem, two or three options, the chosen one, and when it breaks.
- Java is for the component that is the point of the design, 60-200 lines, standard library only, compiled by
  `apps/web/lib/design-code.test.ts` using the same helper as plan 0013 step 5.
- Numbers must be defensible and show the arithmetic (QPS, storage, bandwidth). No invented company claims.

## Out of scope

- General page layout; the existing `recap` and `followUps`; real networked distributed code.

## Steps

- [ ] **1. Types, merge and page.** As above. On `study/[area]/[id]/page.tsx` for design exercises show Diagrams, Deep
  dives, Code, then the existing sections. Simple mode keeps current behaviour.
- [ ] **2. Content, in the batches below.** Everything under *Context*.
- [x] **3. Tests.** `learn.test.ts`: every design has 3+ diagrams, 800+ words of `sections` and a failure-modes
  section; the Java `code` entries compile.

## Batches

- [x] A. url-shortener, rate-limiter, kv-store, notifications, typeahead
- [x] B. news-feed, chat, video, file-sync, collab-editing
- [x] C. ride-sharing, maps, crawler, job-scheduler, top-k
- [x] D. payments, inventory, ticketing, order-management, warehouse
- [ ] E. metrics, kafka, recommendations, building-blocks, delivery-slots, pricing, catalog

## Acceptance criteria

- [ ] All 27 designs show diagrams, deep explanations and failure modes; the code ones compile.
- [ ] `pnpm check` passes.

## Open questions

## Implementation notes

**Done in round two (agent C):**
- Type `WalkthroughDeep` is in `learn/design-depth-types.ts` (not in `types.ts`, which is outside agent C's files). Data in `learn/design-depth-a.ts` (batch A, five designs), merged as `DESIGN_DEEP` in `learn/index.ts` and exported; later batches go in `design-depth-b.ts` and so on, one spread each in `DESIGN_DEEP`. The file was generated from a scratch source (text with diagrams, sections and Java files) with JSON, so it can be edited directly but is not pretty.
- Batch A: url-shortener, rate-limiter, kv-store, notifications, typeahead. Each has 3 diagrams, 900-1,700 words in 5 to 6 sections including "Failure modes", and (4 of 5) a runnable Java file: ShortCodes (base62, id blocks, scramble), RateLimiters (token bucket, sliding window counter, with a fake clock), HashRing (consistent hashing with virtual nodes), Typeahead (trie with top-k per node). Output lines in the text were copied from real runs.
- Tests: `learn/design-depth.test.ts` (3+ diagrams with captions, 800+ words, failure section, Java has main), `apps/web/lib/design-code.test.ts` (javac -Xlint:all and run), diagrams added to `diagram-sources.ts` so `diagrams-parse.test.ts` parses them.
- UI: `app/design-deep.tsx` (`DesignDeepView`) and `designDeepToc()` in `app/toc-items.ts` are ready and tested.
- **Not wired (needs agent A, who now owns `app/study/[area]/**`):** in `study/[area]/[id]/page.tsx`, `ExerciseView`, for `isDesign` and `DESIGN_DEEP[id]`: import `DESIGN_DEEP` from `@habit/shared`, add `...designDeepToc(DESIGN_DEEP[id])` to `toc` after the reference walkthrough entry, and render `<DesignDeepView deep={DESIGN_DEEP[id]} />` right after the walkthrough view. Until then the content is invisible in the app (tests and diagrams run).
- **Batch B done** (`design-depth-b.ts`): news-feed, chat, video, file-sync, collab-editing, each with 3 diagrams, a failure-modes section and, except video, Java (FeedFanout, ChatSequence, ChunkDedupe, OtDemo, run once with javac -Xlint:all). Video has no Java: its heart is a transcoding pipeline, not a small program.
- **Batch C done** (`design-depth-c.ts`): ride-sharing, maps, crawler, job-scheduler, top-k, each with 3 diagrams, a failure-modes section and Java (RideMatching, MapRouter, WebCrawlerFrontier, JobScheduler, TopKHeavyHitters).
- **Batch D done** (`design-depth-d.ts`): payments, inventory, ticketing, order-management, warehouse, each with 3 diagrams, 800+ words across sections, a failure-modes section, and runnable Java (PaymentLedger, FlashSaleInventory, TicketReservationSystem, OrderFulfillmentSaga, WarehouseRoutingOptimizer).
- Batch E (7 designs: metrics, kafka, recommendations, building-blocks, delivery-slots, pricing, catalog) is not written.

## Review
