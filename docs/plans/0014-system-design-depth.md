# 0014: System design walkthroughs with diagrams, fuller explanations and Java for the key parts

- **Status:** ready (needs 0012 for diagrams)
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:**

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
- [ ] **3. Tests.** `learn.test.ts`: every design has 3+ diagrams, 800+ words of `sections` and a failure-modes
  section; the Java `code` entries compile.

## Batches

- [ ] A. url-shortener, rate-limiter, kv-store, notifications, typeahead
- [ ] B. news-feed, chat, video, file-sync, collab-editing
- [ ] C. ride-sharing, maps, crawler, job-scheduler, top-k
- [ ] D. payments, inventory, ticketing, order-management, warehouse
- [ ] E. metrics, kafka, recommendations, building-blocks, delivery-slots, pricing, catalog

## Acceptance criteria

- [ ] All 27 designs show diagrams, deep explanations and failure modes; the code ones compile.
- [ ] `pnpm check` passes.

## Open questions

## Implementation notes

## Review
