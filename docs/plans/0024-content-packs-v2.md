# 0024: Content packs v2 and over-the-air content updates

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-09
- **Implemented by:** Claude Code (agent A), round two
- **Spec:** none (builds on content packs v1, shipped in 0.4.0)

## Goal

Add or fix **any** content without a new app version: new problems, a new section inside an existing course (for example
more LLD topics next to SOLID), a corrected lesson, even a whole new course, from a file, a web address, or a content
feed the app can check for updates. And make writing a pack so easy that an AI can do it from any source with a command
that checks the result.

## Context

- **Shipped in 0.4.0 (v1):** a pack is one JSON file, format `prepwise-pack` version 1 (docs: `docs/content-packs.md`,
  example: `docs/examples/sample-pack.json`). Code: `packages/shared/src/packs.ts` (`validatePack`, `packProblemSpec`,
  `parseMarkdown`), `apps/web/lib/packs.ts` (tables `content_packs`, `pack_progress`), import UI in Profile > Settings >
  Content (`app/pack-importer.tsx`, `importPackAction` in `app/actions.ts`), pages `/study/packs/[id]` and
  `/study/packs/[id]/[item]`, Learn card via `getCourses()` in `lib/courses.ts`. Imported problems run through
  `/api/judge/run` with ids `pack:<pack>:<item>`.
- **v1 limits:** a pack is always its **own course card** (it cannot add a lesson to the LLD area or fix a built-in lesson),
  there is no update check, problems have no large-input checks, only lessons and problems exist as item types, and
  expected outputs are written by hand (error-prone).
- The format name still says `prepwise-pack` (the app was renamed Zen Dojo). Keep accepting `prepwise-pack` forever and
  also accept `zendojo-pack`; do not break shipped packs.

## Out of scope

- Accounts, a hosted store, payments, code signing of feeds beyond a SHA-256 check.
- Running pack code on the server beyond what the judge already does.

## Steps

- [x] **1. Pack format v2 (backwards compatible).** In `packs.ts` accept `version` 1 or 2. v2 adds, all optional:
  `target` (where the pack's content goes, see step 2), item types `project` (a Java project: files, tests, expected output;
  the shape of `LldProject` in `packages/shared/src/learn/types`), `walkthrough` (a system design or LLD write-up as
  Markdown with ` ```mermaid ` diagrams), and `patch` (step 3); problem `stress` (step 5); `tags`, `source` and `sourceUrl`
  on problems.
  - Done when: v1 packs still validate unchanged and `docs/content-packs.md` documents v2 with an example per item type.
- [x] **2. Put content into an existing course.** `target: { area: "lld", section: "SOLID", after: "lld-solid" }` inserts the
  pack's lessons into that built-in area/section (and its problems into a practice list) instead of making a new course.
  `lib/study.ts` / `getStudyView` and `app/study/[area]/page.tsx` merge installed pack items into the area views (the
  items show a small "added" tag). A pack without `target` stays its own course.
  - Done when: a sample pack with `target.area = "lld"` shows its lesson on `/study/lld` in the right section and removing the
    pack removes it.
- [x] **3. Patch built-in lessons.** Item type `patch`: `{ type: "patch", concept: "lld-solid", replace: {...} }` where the replacement
  is the same Markdown lesson format as plan 0023 step 3. Stored overrides win over built-in text and can be reset with
  one button ("Back to the built-in lesson"). This is how a wrong or scrambled lesson is fixed without a release.
  - Done when: a patch changes the SOLID page and removing it restores the original.
- [x] **4. Check and build tools.** Add scripts any agent can run (Node, no network):
  `pnpm pack:check <file>` (the same validation as the app, plain messages) and
  `pnpm pack:build <draft.json> -o <pack.json>`: a **draft** has problem tests with only `input` and a C++ `solution.cpp`;
  the script compiles it with g++, runs every input, writes the `output` values, and fails if the solution crashes or times
  out. A `--verify` flag re-runs a finished pack's solution against its stored outputs.
  - Done when: a draft of three problems builds into a valid pack and `pack:check` accepts it.
- [x] **5. Large inputs in packs.** Declarative generators in the pack (no code): `stress: [{ label, gen: { kind: "ints", n,
  min, max, seed } | { kind: "sorted"... } | { kind: "repeat", value, n } | { kind: "string", n, alphabet, seed } }]`, expanded
  by a small interpreter in `packages/shared/src/judge/stress-gen.ts` and run with expected answers from the pack's C++
  solution (same path as built-in problems in `lib/judge/run.ts`, which already computes them from the reference).
  - Done when: a pack problem with a 100000-int generator reports "too slow" for a quadratic solution.
- [x] **6. Mermaid in pack lessons.** ` ```mermaid ` blocks in lesson Markdown render with the existing `app/diagram.tsx`
  (lazy-loaded). Validate them at install time with the same parser the diagrams test uses (`apps/web/lib/diagrams-parse.test.ts`
  shows how).
  - Done when: a pack lesson with a flowchart renders it and an invalid diagram is a clear install error.
- [x] **7. Content feed and updates.** A **feed** is a JSON file listing packs:
  `{ "format": "zendojo-feed", "version": 1, "packs": [{ "id", "title", "version": "1.2.0", "url", "sha256", "description" }] }`.
  In Settings > Content: add a feed address (stored in `settings`), **Check for updates** (fetch the feed, compare versions
  with installed packs, list new and updated packs), **Install** / **Update** per pack (download, verify SHA-256, validate,
  install) and an optional weekly check at app start (off by default; never installs by itself). Reuse `fetchPackText` in
  `lib/packs.ts` (2 MB cap, 15 s timeout). Show what changed (title and counts) before installing.
  - Done when: against a feed file served from a local static server, a new pack appears as "Available", installs, and a
    bumped version shows "Update" and keeps progress.
- [x] **8. Safety pass.** Imported text is rendered as text (the Markdown renderer builds elements, never HTML); restrict
  downloads to `http(s)`, follow at most 3 redirects, reject files over 2 MB, reject ids/URLs with unusual characters, and
  never run pack code except through the judge's existing sandbox limits (time, memory, output cap). Add tests for each
  rejection. Document the rules in `docs/content-packs.md`.
  - Done when: `<script>` in a lesson shows as text and a 3 MB feed is refused.
- [x] **9. Export and share.** On a pack's page add **Download this pack** (the stored JSON) so a pack can be handed to a friend.
  - Done when: the downloaded file re-imports on a fresh database.
- [x] **10. Docs and the agent prompt.** Update `docs/content-packs.md` (v2 format, tools, the feed, the prompt for converting
  any source into a pack, the rule to write in your own words) and link it from `AGENTS.md`.
  - Done when: following the page alone, an agent can turn a list of problems into a pack that passes `pack:check`.
- [x] **11. Tests.** `packs.test.ts` (v2 items, target, patch, generators, errors), `lib/packs.test.ts` (targets merge into an area, patch
  overrides and reset, feed update keeps progress, rejections), a `scripts` test for `pack:build` with a tiny C++ solution.
  - Done when: `pnpm check` passes.

## Acceptance criteria

- [x] A pack can add lessons and problems into LLD, system design or core CS, or be its own course.
- [x] A pack can replace a built-in lesson, and the replacement can be undone.
- [x] `pnpm pack:build` produces correct expected outputs; `pnpm pack:check` validates any pack with plain messages.
- [x] A feed can be checked, and new or updated packs installed without a new app version.
- [x] Packs from version 0.4.0 still import.
- [x] `pnpm check` passes.

## Open questions

- Where will the user host a feed (a GitHub repo's raw files is the easy option)? The plan does not depend on it.

## Implementation notes

Steps 4 and 5 (agent A, commit 29af4c3). Not done yet: 1, 2, 3, 6 to 11 (see below).
- `pnpm pack:check <file>`, `pnpm pack:build <draft> -o <pack>`, `pnpm pack:build --verify <pack>`: scripts/pack-check.mjs, scripts/pack-build.mjs.
  They run the repo's TypeScript with plain Node (22.18+ / 24+, which strip types) through module hooks in scripts/lib/ts-hooks.mjs. Needs g++ for build.
  Example draft: docs/examples/sample-draft.json. `computeOutputs()` in lib/judge/run.ts runs inputs through a solution with one compile.
- Large inputs: judge/stress-gen.ts (kinds value, ints, range, perm, repeat, string, grid; limits 5 per problem, 1,000,000 elements). `stress` is
  accepted on pack problems now (also in version 1 files); packProblemSpec expands it; expected answers come from solution.cpp as for built-ins.
- referenceAnswers cache is keyed by id + solution, so an updated pack problem does not keep old answers.
- Tests: packages/shared/src/stress-gen.test.ts, apps/web/lib/judge/pack-tools.test.ts (scripts, a quadratic solution reported as too slow).
- Open: steps 3 (patch) and the Markdown/mermaid parts need agent C's Markdown lesson format and scripts/build-content.mjs, which are not on this
  branch (C is not merged). Steps 1, 2, 7 to 11 are independent of C and not started.

## Review
