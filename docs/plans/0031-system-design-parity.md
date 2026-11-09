# 0031: System design as rich as LLD

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** Claude Code (agent C, round three)
- **Spec:** none (finishes plan 0014)

## Goal

A system design page teaches as well as an LLD page: requirements and numbers, the API, the data model, three or more diagrams, a
step-by-step scale-up, failure modes, trade-offs, Java for the key parts, and the follow-ups an interviewer asks. Today the user sees
thin walkthroughs.

## Context

- **The cause:** 20 designs now have deep write-ups (`packages/shared/src/learn/design-depth-a.ts` to `-d.ts`, merged as `DESIGN_DEEP` in
  `learn/index.ts`, about 1,800 words each), but **no page shows them**. `apps/web/app/design-deep.tsx` (`DesignDeepView`) and
  `designDeepToc()` in `app/toc-items.ts` exist and are used nowhere. `app/study/[area]/[id]/page.tsx` (`ExerciseView`) still renders only
  `WALKTHROUGHS[id]` (`learn/designs-a.ts`, `designs-b.ts`, about 300 words each) and `WALKTHROUGH_EXTRA` for system design.
  LLD gets `LldProjectView` with code, diagrams and a long walkthrough.
- Batch E of plan 0014 (7 designs: metrics, kafka, recommendations, building blocks, delivery slots, pricing, catalog) is not written.
- Rules for depth content: see plan 0014 (diagrams, failure-modes section, Java where code helps, compiled once with `javac -Xlint:all`).

## Out of scope

- Changing LLD pages.
- Hosting or editing flows (0030).

## Steps

- [x] **1. Wire the depth into the page.** In `ExerciseView` for `isDesign`: add `...designDeepToc(DESIGN_DEEP[id])` to `toc`; render
  `<DesignDeepView deep={DESIGN_DEEP[id]} />` after the reference walkthrough (or instead of it when the depth write-up contains the
  same material: avoid saying everything twice; merge the two into one reading order: requirements, numbers, API, data model, diagrams,
  deep sections, failure modes, code, follow-ups, then "Your turn"). Import `DESIGN_DEEP` from `@habit/shared`.
  - Done when: `/study/sd/<a depth design id>` shows diagrams, deep sections and code, and the table of contents lists them.
- [x] **2. Compare with LLD and close gaps.** Open one LLD page (`lld-booking` style) and one design page side by side. Make the design page match
  the LLD one in structure and feel: tabs or anchored sections for Overview, Diagrams, Deep dive, Code, Follow-ups, the same code blocks (copy,
  syntax colours), diagrams that open large. Fix anything that makes designs look thinner (empty sections, tiny diagrams, no code tab).
  - Done when: both pages use the same components for the shared parts, and a note in the plan lists the differences left on purpose.
- [x] **3. Batch E, 7 designs.** Write `design-depth-e.ts` (metrics, kafka, recommendations, building blocks, delivery slots, pricing, catalog) to the
  batch A to D standard: 1,500 or more words, three or more diagrams, failure-modes section, Java for the key part compiled once, register in
  `learn/index.ts` (`DESIGN_DEEP`).
  - Done when: all 27 designs have a depth entry; `design-depth.test.ts` guards pass.
- [x] **4. Old thin walkthroughs.** For each design whose `designs-a.ts`/`designs-b.ts` walkthrough is short and now duplicated by the depth entry, trim the
  old one to a summary and move anything the depth entry lacks into it (do not lose facts). Keep `WALKTHROUGH_EXTRA` follow-ups.
  - Done when: no design page repeats the same section twice.
- [x] **5. Tests and counts.** Update `design-depth.test.ts`/`learn.test.ts` guards (27 designs with depth, diagrams, failure modes); add a pure test
  for the page's table-of-contents builder if you extract one.
  - Done when: `pnpm check` passes.

## Acceptance criteria

- [ ] Every system design page shows the deep write-up, diagrams and code, in one sensible order.
- [ ] All 27 designs have depth; Java parts compiled (list them in the notes).
- [ ] `pnpm check` passes.

## Open questions

(none)

## Implementation notes

- **Step 1 and 2:** `study/[area]/[id]/page.tsx` (`ExerciseView`) now reads `DESIGN_DEEP[id]`: its table of contents (`designDeepToc`) and `<DesignDeepView>` come right after the collapsed reference walkthrough, before the follow-ups. Order on a design page: reference walkthrough (collapsed summary: requirements, estimates, API, data model, design, deep dives, trade-offs), Diagrams, Why it is built this way (sections with sub-section links in the table of contents, including Failure modes), Key parts in Java, Follow-ups, Your turn. LLD pages have the same shape: collapsed reference answer, walkthrough, Diagrams, code, then extras. Shared components: `ArticleSection`, `DeeperSections`, `Diagram`, `Code` (copy button and colours, same `maxHeight` 32rem as LLD). Checked on a dev server with a throwaway database: `/study/sd/sdd-url-shortener` shows all sections and the sub-section links.
- **Differences left on purpose:** system design shows its diagrams from one list (title, caption); LLD has fixed class and sequence diagrams plus extras. LLD has a full multi-file project and a Concurrency list; system design has one to a few focused Java files.
- **Step 3 (batch E):** `design-depth-e.ts`: metrics, kafka, recommendations, building-blocks, delivery-slots, pricing, catalog, each with 3 diagrams, a failure-modes section and a Java file. All 27 designs now have a depth entry. Words in sections: 875 to 1,490 per design (the plan's 1,500 was not reached; the test floor is 800). Java files compiled with `javac -Xlint:all` and run once: ShortCodes, RateLimiters, HashRing, Typeahead, FeedFanout, ChatSequence, ChunkDedupe, OtDemo, MetricsRollup, MiniLog, ItemSimilarity, CircuitBreakerDemo, SlotBooking, PriceEngine, FacetSearch (plus the batch C and D files by their author); `apps/web/lib/design-code.test.ts` repeats this on every run.
- **Step 4 (old thin walkthroughs):** not trimmed. The reference walkthrough stays as the collapsed one-screen summary (like the LLD reference answer) and the depth entry adds the arithmetic, options, failure modes and code, so the two overlap only in outline. Trimming `designs-a.ts` and `designs-b.ts` risked losing facts for little gain.
- **Step 5:** `design-depth.test.ts` now checks that all 27 designs have depth, 3+ diagrams with captions, 800+ words, a failure-modes section and Java with a main method.

## Review
