# 0007: Full DSA pattern articles: structure, checks, and three exemplars

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Claude Code
- **Depends on:** 0006 (pattern page has Learn/Practice tabs and `ArticleLayout`)
- **Suitable for a smaller model:** the infrastructure steps yes; the three articles need the strongest model you have.

## Goal

Today each of the 67 pattern guides is a short summary (idea, a few signals, a template, bullet variations). The user
wants each topic taught **in full**, the depth of a good algorithms chapter: why the pattern works, a traced example,
complete implementations, variants, derived complexity and edge cases. The short recap stays, but only on Quick
revise. This plan builds the format, the tests that enforce it, and writes three exemplar articles so the user can
judge the depth before plan 0008 writes the other 64.

## Context

- Current data: `packages/shared/src/learn/dsa-a.ts`…`dsa-d.ts` export `PatternGuide` records (type in
  `learn/types.ts`: `idea, signals, steps, template, complexity, variations, pitfalls, recap`), merged into
  `PATTERN_GUIDES` in `learn/index.ts`. `apps/web/lib/revise.ts` reads `PATTERN_GUIDES[id].recap` (and maybe more:
  check). Tests in `learn/learn.test.ts` check every pattern has a guide.
- `Section` (`learn/types.ts`) = `{ title, body, code? }`; `body` paragraphs are separated by a blank line.
  `DeeperSections` in `apps/web/app/learn-blocks.tsx` already renders that shape; after plan 0006 articles render as
  open `ArticleSection`s.
- **Source and licence rule:** you may read cp-algorithms.com, CLRS, Skiena, the LeetCode editorials for facts, but
  **write every article in your own words**. Do not paste text or code from them (cp-algorithms is CC BY-SA; copying it
  would put the repo under that licence; plan 0003 imports it separately, with attribution, as a Reference tab).
- Pattern ids: `packages/shared/src/dsa.ts` (`ALL_PATTERNS`, grouped by `DSA_GROUPS`). Problems per pattern are in the
  same file; name real problems from the list (title and LeetCode number) in "Practice order".
- Writing rules: `AGENTS.md` ("Writing for the user": plain, specific, short sentences, no hype). Code is **C++17**,
  self-contained (includes assumed; no `main`), with comments only where the idea isn't obvious.

## Out of scope

- The other 64 patterns (plan 0008).
- Page shell/tabs (plan 0006), cp-algorithms Reference tab (plan 0003), problem pages.
- Deleting the old `PatternGuide` fields (plan 0008, last step). Keep them as the fallback until then.

## Steps

- [x] **1. Article type and data file.** In `learn/types.ts` add
  ```ts
  /** A full pattern article (learn/dsa-article-*.ts). Replaces the short guide on the pattern page. */
  export interface PatternArticle {
    /** 2-4 sentences: what the pattern solves and when you reach for it. */
    intro: string;
    sections: Section[];
  }
  ```
  Create `learn/dsa-articles-a.ts` exporting `DSA_ARTICLES_A: Record<string, PatternArticle>` (empty for now), and in
  `learn/index.ts` export `PATTERN_ARTICLES` (merge of all article files) and the `PatternArticle` type.
  - Done when: `pnpm --filter @habit/shared` typecheck passes (or `pnpm check` typecheck step).

- [x] **2. Required structure, enforced by tests.** Add `learn/pattern-articles.test.ts`. For **every** id in
  `PATTERN_ARTICLES`:
  - section titles, in this order, are exactly: `The intuition`, `Why it works`, `A worked example`,
    `Implementation`, `Variants`, `Complexity`, `Pitfalls and edge cases`, `Practice order`. (`Implementation` and
    `Variants` may have extra numbered sub-sections after them, e.g. `Implementation: iterative`; the eight required
    titles must appear in that order.)
  - total prose ≥ 900 words (`intro` + all `body` text), at least 2 sections have `code`, every `code` is non-empty,
    no `TODO`/`lorem`/`…` placeholders.
  - `Practice order` mentions at least 3 problem titles that exist in `ALL_PROBLEMS` for that pattern (check how
    `dsa.ts` exposes problems per pattern).
  Also add a test that **reports** (does not fail) how many of the 67 patterns still lack an article:
  `console.info` the missing ids. Plan 0008 turns this into a failing check at its last step.
  - Done when: the test passes with zero articles, and fails if you temporarily add a malformed one.

- [x] **3. Compile check for the C++.** Add `learn/pattern-article-code.test.ts`: if `g++` (or `clang++`) is on `PATH`
  (use `spawnSync("g++", ["--version"])`), write each `code` block to a temp dir (use `os.tmpdir()`, not the repo), prefixed with
  `#include <bits/stdc++.h>\nusing namespace std;\n`, and run `g++ -std=c++17 -fsyntax-only` on each; fail with the
  compiler output. Use `describe.skipIf(!hasCompiler)`. Group blocks per pattern so one pattern is one compile.
  Blocks inside one article may depend on earlier blocks of the same article (concatenate them in order).
  - Done when: the test runs (or is skipped with a clear reason) and passes with the exemplars from step 5.

- [x] **4. Render articles on the pattern page.** In `apps/web/app/dsa/pattern/[id]/page.tsx` (Learn tab, after
  plan 0006): if `PATTERN_ARTICLES[id]` exists render the intro, then each section as an `ArticleSection`
  (`id` = slug of the title; paragraphs split on blank lines as in `DeeperSections`; `code` rendered with
  `CodeBlock`). The TOC lists the sections. If there is no article, render the old guide as today (fallback).
  Header line stays: name, group, "Recognize by".
  - Done when: `/dsa/pattern/hash-map` (after step 5) shows the article with a TOC and the old guide no longer
    appears; a pattern without an article still shows the old guide.

- [x] **5. Write three exemplar articles** in `dsa-articles-a.ts`: `hash-map`, `two-pointers`, `sliding-window`.
  Each must contain, under the required titles:
  - **The intuition:** the problem it removes (the brute force and why it is slow), the one idea, a picture in words.
  - **Why it works:** the invariant or exchange argument that makes it correct; for two pointers/sliding window,
    *why discarding the skipped candidates is safe*.
  - **A worked example:** one concrete input traced step by step, showing the state after each step (a table in plain
    text or a list).
  - **Implementation:** full C++ for the main problem, then the generic template, each with its own `code`; explain
    the loop condition and each index update.
  - **Variants:** at least 3 (e.g. sliding window: fixed size, longest valid, shortest valid, at most K distinct,
    exactly K as at-most(K) − at-most(K−1)), each with when to use it and code or precise pseudo-steps.
  - **Complexity:** derive time and space (amortised argument where it applies), say when it degrades.
  - **Pitfalls and edge cases:** empty input, duplicates, overflow, off-by-one, negative numbers where a technique
    breaks (e.g. sliding window with negatives), and the bug that most often appears.
  - **Practice order:** 4-8 problems from the app's list in order, one line each on what that problem adds.
  Reuse the facts from the old `PATTERN_GUIDES[id]` (template, variations, pitfalls) as raw material, but expand them
  and add what is missing.
  - Done when: tests from steps 2-3 pass and the three pages read like a chapter, not a list.

- [x] **6. Quick revise unchanged.** Confirm `/revise` still shows recap lines for all 67 patterns (the old
  `PatternGuide.recap` data is untouched).
  - Done when: `/revise?tab=dsa` shows the same recap lines as before.

## Acceptance criteria

- [x] `/dsa/pattern/hash-map`, `/two-pointers`, `/sliding-window` show full articles with the eight required sections
  and a TOC; no summary box or bullet-only layout.
- [x] Other patterns still render (old guide as fallback).
- [ ] Structure and compile tests exist and pass; the missing-articles report lists the other 64 ids. (Structure test passes and the report prints; the compile test exists but has not run: no C++ compiler on this machine. See the notes.)
- [x] The text is original (not copied from any source) and plain-spoken.
- [x] `pnpm check` passes.

## Open questions

## Implementation notes

Implemented by Claude Code, 2026-11-07.

**What exists**
- `PatternArticle` in `learn/types.ts`; the three articles in `learn/dsa-articles-a.ts` (`hash-map`, `two-pointers`, `sliding-window`); `PATTERN_ARTICLES` exported from `learn/index.ts`.
- `learn/pattern-articles.test.ts`: for every article, the eight required sections in order (extra "Implementation: ..." and "Variants: ..." sections are allowed after their parent), at least 900 words of prose, at least two code blocks, no placeholders, and at least three of the pattern's own problems named in "Practice order". It also prints how many of the 67 patterns have an article (3 of 67).
- The pattern page (`/dsa/pattern/[id]`, Learn tab) shows an article when one exists (intro, a contents list, paragraphs, coloured C++), and keeps the short guide for the other 64 patterns. Quick revise is untouched: it still reads `PATTERN_GUIDES[id].recap`.
- Sizes: prose of 2,131 (hash-map), 2,219 (two-pointers) and 1,962 (sliding-window) words, 10 to 11 sections each, 14 code blocks in total.

**Compiler check: done 2026-11-07.** g++ 16.2 (winget WinLibs, installed by `setup.cmd`) compiled all article code with `-std=c++17 -Wall`: pass. The paragraph below describes the state before that and is kept for the record.

**Not verified by a compiler yet (read this)**
- The compile check is `apps/web/lib/pattern-article-code.test.ts` (not in `packages/shared`, because that package has no Node types). It runs `g++ -std=c++17 -fsyntax-only` on all the code of each article and is skipped when no `g++` or `clang++` is on PATH. **There is no C++ compiler on the machine this was built on, so the test was skipped and none of the C++ in these articles has been compiled.** I traced the code by hand and walked the examples in the text, but that is not the same. I downloaded a portable GCC (WinLibs, checksum verified) for this, and the tool that runs commands refused to execute a binary taken from the internet. Run `pnpm test` with `g++` on PATH (or let CI do it: both CI runners have a compiler) before trusting the code.
- Fixed while reading it back: the explanation of why the left side of Trapping Rain Water can be settled by `leftMax` alone was too loose and was rewritten.

**Checks:** `pnpm check` exits 0 (33 test files passed, 1 skipped = the compile test). Looked at the pages in a browser against a copy of the database: article layout, contents list and coloured code in light and dark at 1440 px, no horizontal scroll at 390 px; `/dsa/pattern/kadane` (no article yet) still shows the old guide.

## Review
