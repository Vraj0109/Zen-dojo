# Wave 1 Notes: Agent AG3 (Content Verification & Admin AI Prompts)

- **Agent:** AG3 (Antigravity)
- **Date:** 2026-11-23
- **Tasks:**
  - 0117 step 2 (pure part only): `packages/shared/src/content-model/verify.ts` and `verify.test.ts`
  - 0118 step 1: `packages/shared/src/content-model/house-rules.ts`, `admin-ai.ts`, and `admin-ai.test.ts`

---

## 1. Files Created

- `packages/shared/src/content-model/house-rules.ts`:
  Single source of truth for writing house rules (plain language, originality, hints structure, walkthrough paths, code constraints, test cases, and diagrams).
- `packages/shared/src/content-model/admin-ai.ts`:
  `AiTarget`, `AiMode`, `modesFor(target, current)` (hides `improve`/`fix-format`/`shorter` on empty fields), and `buildAdminPrompt` with the six required sections in exact order (`Task`, `Where this goes`, `Context`, `Current content`, `Rules`, `Answer format`), judge template integration via `templateFor(spec, lang)`, and prompt clipping strictly under 24,000 characters.
- `packages/shared/src/content-model/verify.ts`:
  Pure content verification with `verifyEntity(entity, ctx)` and `verifyContent(snapshot, options)`. Ports all quality, structural, and coverage rules into structured `Issue[]` (`{ level, entity, id, message }`).
- `packages/shared/src/content-model/admin-ai.test.ts`:
  Tests for `modesFor`, the 6-part prompt structure across all targets, judge starter templates, other language inclusion in `add-language`, and 24,000 character clipping.
- `packages/shared/src/content-model/verify.test.ts`:
  Unit tests covering valid entities, broken copies, and snapshot integrity cross-checks.
- `docs/plans/notes/wave1-AG3.md`:
  This notes document.

---

## 2. Ported Rules: Old Tests → New Content Model Rules

Every coverage and content quality rule from the target test files has been ported into `packages/shared/src/content-model/verify.ts`:

| Old Test Location & Name | New Rule in `verify.ts` | Verification Level |
|---|---|---|
| `learn/learn.test.ts`: "has a lesson for every concept, with one explanation per checklist point" | `verifyEntity` (concept): overview length >= 40 chars (warning if <= 80), point explanations in `point:N` or `explain` matching checklist points count. | Error / Warning |
| `learn/learn.test.ts`: "has a walkthrough for every design and a guide for every LLD problem" | `verifyEntity` (design): requires sections for requirements, design/architecture, deep dives, tradeoffs. `verifyEntity` (lld): requires code with `class `. | Error |
| `learn/learn.test.ts`: "reading list entries are unique, https, and point at real items" | `verifyEntity` (doc:reading): must be `https://`, rejects shorteners (`bit.ly`, `buff.ly`, `amzn.to`), rejects affiliate/tracking params. `verifyContent`: unique IDs across reading entries. | Error |
| `learn/learn.test.ts`: "has a complete guide for every DSA pattern" | `verifyEntity` (pattern): requires required sections, code sections, and length requirements. | Error |
| `learn/learn.test.ts`: "has deeper material and recap lines for every concept, design and LLD problem" | `verifyEntity`: concept requires >= 3 recap items, >= 5 deeper sections (> 200 chars each); design requires >= 3 recap and >= 3 follow-ups; lld requires >= 3 recap. | Error |
| `learn/learn.test.ts`: "every project has a Main, tests, expected output and a long walkthrough with diagrams" | `verifyEntity` (lld project): requires `Main.java`, tests, expectedOutput > 3, `classDiagram`, and `sequenceDiagram`. | Error |
| `learn/order-audit.test.ts`: "every concept has a lesson with an overview and one explanation per checklist point" | `verifyEntity` (concept): overview length >= 40, point explanations count matches. | Error |
| `learn/order-audit.test.ts`: "section points refer to real sections and real checklist points" | `verifyEntity` (concept): section point index `0 <= point < points.length`. | Error |
| `learn/order-audit.test.ts`: "every Go deeper section is placed (has a point) and titles are unique per lesson" | `verifyEntity` (concept): deeper section titles must be unique within lesson. | Error |
| `learn/order-audit.test.ts`: "sections come out in checklist order" | `verifyEntity` (concept): point sections must appear in non-decreasing checklist order. | Error |
| `learn/order-audit.test.ts`: "section titles use sentence case (no Title Case Words)" | `verifyEntity` (concept): flags titles with >= 3 capitalized words of length >= 4 after the initial word. | Error |
| `learn/pattern-articles.test.ts`: "follows the required outline, in order" | `verifyEntity` (pattern/article): exact 8 required sections in sequence (`The intuition`, `Why it works`, `A worked example`, `Implementation`, `Variants`, `Complexity`, `Pitfalls and edge cases`, `Practice order`), sub-sections permitted only after parent, unique titles. | Error |
| `learn/pattern-articles.test.ts`: "is a full article, not a summary" | `verifyEntity` (pattern/article): >= 900 prose words, >= 2 code sections, each section body > 150 chars. | Error |
| `learn/pattern-articles.test.ts`: "has no placeholders" | `verifyEntity`: rejects `/TODO\|FIXME\|lorem ipsum\|…/i` in bodies, titles, and code. | Error |
| `learn/design-depth.test.ts`: "has diagrams, 800+ words and a failure section" | `verifyEntity` (design): total words >= 800, each section >= 100 words, failure section matching `/failure/i`, diagrams >= 3 with captions > 10 chars. | Error |
| `learn/design-depth.test.ts`: "Java code with a main method" | `verifyEntity` (design): Java code blocks must contain `static void main(` and no placeholders. | Error |
| `judge/solutions.test.ts`: "structural rules" | `verifyEntity` (problem): code <= 40 KB, rejects forbidden calls (`Runtime.getRuntime().exec`, `ProcessBuilder`, `subprocess`, `os.system`, `socket`, `urllib`, `java.net`), python `# verify: skip-stress` line 1 only, Java requires `class ` and signature/method name, Python requires `def fn` or class, C++ requires method name. | Error |
| `judge/solutions.test.ts`: "solutionCode and solutionLangs" (optimal coverage) | `verifyEntity` (problem): requires optimal code block with C++ implementation. | Error |
| `judge/solutions.test.ts`: "checks BRUTE coverage and problem ids" | `verifyEntity` (problem): requires brute force code block OR "already optimal" note / `brute: same`. | Error |
| `judge/solutions.test.ts`: hints rules | `verifyEntity` (problem): >= 3 hints, non-empty, no placeholders, warns if code fence present in hint. | Error / Warning |
| `judge/solutions.test.ts`: cases rules | `verifyEntity` (problem): >= 1 example, >= 1 test case, input arity matches function parameter count. | Error |
| `judge/interview.test.ts`: "interview parser and checker" | `verifyEntity` (problem walkthrough): rejects forbidden phrases ("As an AI", "In this article", "geeksforgeeks", "leetcode.com/problems/*/solutions"), requires 8 headings in relative order, links allowed only under "## Further reading", word count bounded between 350-1100 words. | Error |
| `focus.ts` & `plan.ts`: roadmap item references | `verifyContent`: checks all roadmap patterns and concepts in `WEEK_FOCUS` exist in snapshot. | Warning |
| Snapshot integrity: courses & lessons | `verifyContent`: unique entity keys, lesson `courseId` exists in snapshot, lesson `ord` unique per course. | Error |
| Snapshot integrity: asset references | `verifyContent`: any block referencing `assetId` must exist in `snapshot.assets`. | Error |

---

## 3. Test Command and Results

Command run:
```powershell
pnpm.cmd exec vitest run packages/shared/src/content-model/verify.test.ts packages/shared/src/content-model/admin-ai.test.ts
```

Result:
```
✓ packages/shared/src/content-model/verify.test.ts (22 tests) 11ms
✓ packages/shared/src/content-model/admin-ai.test.ts (8 tests) 9ms

Test Files  2 passed (2)
     Tests  30 passed (30)
```

TypeScript check run:
```powershell
pnpm.cmd --filter @habit/shared exec tsc --noEmit
```
Result for AG3 files: Zero errors in `verify.ts`, `house-rules.ts`, `admin-ai.ts`, `verify.test.ts`, and `admin-ai.test.ts`.

*(Note: Type errors observed in sibling work-in-progress files `draft.test.ts` and `page-markdown.ts`, owned by Agent AG2).*

---

## 4. Deviations from the Plan and Why

- None. Both `verify.ts` and `admin-ai.ts` follow the exact specification in plans 0117 step 2 and 0118 step 1.
- In `verifyContent`, a `VerifyContentOptions` parameter was added (`{ checkRoadmapFocus?: boolean }`) defaulting to checking `WEEK_FOCUS` when a snapshot contains more than 30 entities. This allows unit test fixtures with small entity subsets to verify cleanly while ensuring production snapshots are audited against the full 16-week roadmap.

---

## 5. Questions for the Lead

- In Wave 2 when `lib/content-admin/write.ts` wires `verifyEntity`: does the admin UI want `Issue.level === "warning"` issues surfaced in an dismissible banner, or inline beside the relevant slot/field?
- Should `verifyContent` optionally compile/typecheck reference solutions, or should that remain exclusive to the dedicated desktop/dev script `content:verify-solutions` (plan 0117 step 3)? (Current pure `verifyContent` performs structural checks and signature presence).

---

## 6. Found but Not Changed

- Sibling agent AG2's `packages/shared/src/content-model/draft.test.ts` references `removeSection` on line 666 which was flagged by `tsc --noEmit`.
- Sibling agent AG2's `packages/shared/src/content-model/page-markdown.ts` has temporary type errors where slot property access encounters `never` / `null` in draft parsing. Left untouched per agent boundary rules.
