# 0105: Language cheat sheets (C++ STL, Java collections, Python)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-21
- **Implemented by:** (implementer fills in)
- **Spec:** SPEC.md section, if any
- **Mockup:** docs/mockups/interview-prep/0105-language-cheat-sheets.html
- **Depends on:** none. Set 0095-0111: 0108 or 0110 may link to the sheets; nothing is required from them.

## Goal

In an interview you lose minutes to "how do I sort pairs by the second value again" or "what is the min-heap syntax in this
language". Add three cheat sheets, one per interview language (C++, Java, Python), with **64 matching topics**: the exact
idiom, its cost, and the trap, plus a side-by-side view of the same task in all three languages. Everything is tested:
each sheet is one real source file that compiles and runs.

## Context

- Study pages live under `apps/web/app/study/` (`page.tsx` lists areas, `reading/`, `diagrams/`, `[area]/`). The new pages
  are `apps/web/app/study/cheatsheets/page.tsx` and `.../[lang]/page.tsx`; add one card to `apps/web/app/study/page.tsx`
  next to Reading and Diagrams.
- Language choice is remembered by `apps/web/app/solution-tabs.tsx` (localStorage key `zen-dojo.solution-lang`; ids `cpp`,
  `java`, `python`). Reuse the key so the sheet opens in your language. `JudgeLang` and `JUDGE_LANG_LABEL` are in
  `packages/shared/src/judge/types.ts`.
- Reuse: `apps/web/app/copy-button.tsx`, `apps/web/app/code.tsx` (server-side highlighting, see `highlight.ts` in
  `apps/web/lib`), `apps/web/app/sliding-pill.tsx` for the language switch, `apps/web/lib/judge/resolve.ts` (finds
  `g++`, `javac`, `python`) used by the compile test the same way `solutions-verify.test.ts` does.
- Pattern to copy for the build step: `scripts/solutions.mjs` and `scripts/interview.mjs` (a script that bundles files into a
  generated TS file, with `build`/`check`/`status`). Do not edit those scripts (plan 0092 is changing them).
- No database table, no migration, no sync: this is reference content. Progress is not tracked.
- Content rules: our own words and our own examples; API names and complexities are public facts. Each sheet states the
  language version it was checked against and a `checkedOn` date (language libraries change slowly; say so).
- AGENTS.md conventions: pure data in `packages/shared`, tests next to code, no emoji, plain short sentences.

## Sheet source format (the contract)

One real source file per language in `packages/shared/content/cheatsheets/`: `cpp.cpp`, `Sheet.java`, `python.py`. Each topic is
a function between markers, and `main` calls every function with a few `assert`s so the file proves itself:

```cpp
// @sheet language=C++ version=C++17 (g++ 12 or newer) checkedOn=2026-11-21
// @entry arr-sort-custom | Sort pairs by second, then first | sort,pair,lambda | O(n log n)
// @note A comparator must be a strict ordering: use < or >, never <= or >=.
// @pitfall Comparing with <= can crash std::sort.
void arrSortCustom() {
    vector<pair<int,int>> v = {{1, 5}, {2, 3}, {0, 3}};
    sort(v.begin(), v.end(), [](auto& a, auto& b) { return tie(a.second, a.first) < tie(b.second, b.first); });
    assert(v[0] == make_pair(0, 3));
}
// @end
```

- `@entry <topic-id> | <title> | <tags, comma separated> | <time cost>`; zero or more `@note` and `@pitfall` lines (one
  sentence each); the code is everything up to `@end`, exactly as written (Java: `//`, Python: `#`).
- Every topic id in `packages/shared/src/cheatsheets/topics.ts` must appear exactly once per sheet.
- Aim for 6-14 lines of code per entry. Real names, no pseudocode. Show the idiom you would type in an interview, not every
  overload. Python and Java may add a second one-liner variant in a comment.
- The file as a whole must compile and run with no output and exit 0 (`g++ -std=c++17`, `javac`/`java`, `python -I`).

## The 64 topics (ids, in this order, group in brackets)

- Arrays (12): `arr-2d`, `arr-fill`, `arr-sort`, `arr-sort-custom`, `arr-binary-search`, `arr-reverse-rotate`,
  `arr-prefix-sums`, `arr-dedupe-sorted`, `arr-minmax-sum`, `arr-slice-copy`, `arr-insert-erase`, `arr-argmax`.
- Strings (10): `str-split`, `str-join`, `str-chars`, `str-substring`, `str-build`, `str-reverse`, `str-parse-number`,
  `str-to-string`, `str-compare-case`, `str-count-chars`.
- Maps and sets (10): `map-count`, `map-default`, `map-iterate-sorted`, `map-floor-ceiling`, `map-erase-while-iterating`,
  `set-ops`, `multiset`, `set-of-pairs`, `map-group-by`, `map-top-k-by-value`.
- Stacks, queues, heaps (10): `stack-basic`, `queue-basic`, `deque-both-ends`, `heap-min`, `heap-max`, `heap-pairs-comparator`,
  `heap-kth-largest`, `monotonic-stack`, `heap-lazy-delete`, `sliding-window-deque`.
- Graph and grid idioms (8): `adj-list`, `bfs-queue`, `dfs-iterative`, `dijkstra-heap`, `union-find`, `grid-directions`,
  `topo-sort`, `visited-grid`.
- Numbers and bits (8): `num-limits`, `num-overflow`, `num-mod-pow`, `num-gcd`, `num-negative-mod`, `bit-ops`, `num-popcount`,
  `num-ceil-div`.
- Misc (6): `io-read-ints`, `io-fast`, `tuple-struct`, `comparator-ordering`, `random-shuffle`, `recursion-limit`.

Tables (separate data, one file per language, `packages/shared/src/cheatsheets/tables-<lang>.ts`):

- `COMPLEXITY`: 14-20 rows `[operation, cost, note]` for the language's own containers, for example C++ `vector::push_back`
  amortised O(1), `map` O(log n), `unordered_map` average O(1) and worst O(n); Java `ArrayList.remove(0)` O(n),
  `HashMap` O(1) average (O(log n) per bucket once a bucket is large), `PriorityQueue.remove(Object)` O(n); Python `list.pop(0)`
  O(n), `collections.deque.popleft` O(1), `x in list` O(n), `x in set` O(1) average, `sorted` O(n log n).
- `WHICH_CONTAINER`: 8-10 rows "I need ..." -> "use ..." -> "because ...".
- `PITFALLS`: 10-12 rows: C++ (`map[k]` inserts, signed overflow, `size()` unsigned subtraction, `vector<bool>`, invalidated
  iterators), Java (`Integer ==` beyond the cache, `Arrays.asList` size, integer division, `List.remove(int)` vs `remove(Object)`,
  `char + int`), Python (mutable default argument, `[[0]*n]*m` aliasing, recursion limit, `int` division `//` on negatives,
  late binding closures).

## Out of scope

- Language tutorials, STL internals, or anything not used in interviews; JavaScript, Go, Rust, Kotlin sheets.
- Per-entry progress, quizzes or flashcards (a later plan can feed them to `revise.ts`).
- Editing the problem workspace, the solution code or the LLD/design lessons.
- Network features: no fetching of docs at run time.

## Steps

Step 0 first (one agent). Then agents A-D in parallel with disjoint files. Only the lead runs `pnpm check` and the full `pnpm test`.

- [ ] **0. Foundation (one agent, about 0.5 day).**
  - `packages/shared/src/cheatsheets/topics.ts`: `TOPICS: { id: string; group: string; title: string; hint: string }[]` (the
    64 above; `hint` = the task in one plain sentence, for example "Sort pairs by the second value, ties by the first");
    `SHEET_LANGS = ["cpp", "java", "python"]`; types `SheetEntry { id, title, tags, cost, notes, pitfalls, code }`,
    `Sheet { lang, version, checkedOn, entries }`, `SheetTables`. Export from `packages/shared/src/index.ts`.
  - `scripts/cheatsheets.mjs` + `scripts/cheatsheets.d.mts`: `build` (parse the three source files with the marker format,
    write `packages/shared/src/cheatsheets/generated.ts` with `SHEETS`), `check` (every topic once per sheet, markers well
    formed, `@sheet` line present, no entry over 25 lines, `checkedOn` is a date), `status` (counts per language). Root
    `package.json` scripts `cheatsheets:build`, `cheatsheets:check`, `cheatsheets:status` (append only).
  - Empty-but-valid starter files `cpp.cpp`, `Sheet.java`, `python.py` with the `@sheet` line, the `main`, and **two** real
    entries (`arr-sort-custom`, `heap-min`) per language; empty `tables-<lang>.ts` files exporting empty arrays.
  - Page skeleton `apps/web/app/study/cheatsheets/page.tsx` (three cards) and `[lang]/page.tsx` ("not written yet" empty state
    if a sheet has no entries), card on `study/page.tsx`.
  - Done when: `pnpm cheatsheets:build` and `pnpm cheatsheets:check` run (check reports 62 missing entries per language, which
    is expected), `pnpm exec vitest run packages/shared/src/cheatsheets.test.ts` passes, `/study/cheatsheets/cpp` shows two entries.
- [ ] **1. Agent A: C++ sheet.** Owns `content/cheatsheets/cpp.cpp` and `tables-cpp.ts`. All 64 topics in C++17 (mark C++20 only
  in a `@note`, for example `std::ranges`, and keep it out of the code). Include `#include <bits/stdc++.h>` at the top and
  say in the first `@note` that it is a GCC/Clang convenience, with the three headers a portable solution needs.
  - Context budget (read only this): this plan; `packages/shared/src/cheatsheets/topics.ts`; the starter `cpp.cpp`.
  - Done when: `g++ -std=c++17 -Wall -Wextra cpp.cpp` compiles with no warnings, runs, exits 0, and `cheatsheets:check` finds all
    64 entries; tables have the row counts above.
- [ ] **2. Agent B: Java sheet.** Owns `Sheet.java` and `tables-java.ts`. Java 17, `java.util` only. Same context budget and done
  criteria with `javac Sheet.java && java Sheet`. Show the `Comparator.comparingInt(...).thenComparing(...)` forms, `Deque` over `Stack`,
  `Map.merge`, `computeIfAbsent`, `TreeMap.floorKey`, `PriorityQueue` with a comparator, `Math.floorMod`, `Integer.MAX_VALUE` overflow.
- [ ] **3. Agent C: Python sheet.** Owns `python.py` and `tables-python.ts`. Python 3.11 or newer, standard library only
  (`collections`, `heapq`, `bisect`, `itertools`, `functools`, `math`). `python -I python.py` exits 0. Show `Counter`,
  `defaultdict`, `heapq` with tuples and the negate trick for a max-heap, `bisect`, `sorted(key=...)`, `deque`, `lru_cache`,
  `sys.setrecursionlimit`, `math.gcd`, `pow(a, b, m)`.
- [ ] **4. Agent D: pages and tests.** Owns `apps/web/app/study/cheatsheets/**`, `packages/shared/src/cheatsheets.test.ts`,
  `packages/shared/src/cheatsheets-compile.test.ts` (`apps/web/lib/judge` has the tool helpers; put the compile test in
  `apps/web/lib/cheatsheets-compile.test.ts` if it needs them) and a card on `study/page.tsx`.
  - Pages, see the mockup: `/study/cheatsheets` (landing with the three sheets and a search box that searches the titles, tags and
    hints of all topics); `/study/cheatsheets/[lang]` with a language switch (C++, Java, Python, Side by side), a search
    field, group chips, one card per entry (title, cost chip, code with a copy button, notes, pitfalls); the **Side by side**
    view shows the three codes of one topic next to each other (stacked on phones); a "Complexity" tab (table), a "Which
    container" tab, a "Pitfalls" tab; the `lang` is remembered (see Context) and also in the URL (`?q=`, `?group=`).
    Search is a client filter over data already on the page (no server round trip); without JS all entries show.
  - Context budget: this plan; the mockup; `apps/web/app/code.tsx`, `copy-button.tsx`, `sliding-pill.tsx`; `apps/web/app/study/reading/page.tsx`
    (page layout to follow).
  - Done when: all three sheets render with their entries once agents A-C land, search and group chips filter, the side-by-side view
    aligns the same topic in three columns, 390 px has no sideways scroll, and the tests below pass.
- [ ] **5. Lead.** `pnpm cheatsheets:build`, `pnpm cheatsheets:check` (clean), browser check at 1280 and 390 px in light and dark,
  review five entries per language for accuracy against the language documentation, `pnpm check`, Review.

## Tests

- `packages/shared/src/cheatsheets.test.ts`: the topic list has 64 unique ids and 7 groups; `SHEETS` has an entry for every topic in every
  language; every entry has a title, a cost, code under 25 lines, and no emoji; tables have 14+ complexity rows, 8+ container rows, 10+
  pitfalls per language; `checkedOn` is a valid date.
- `apps/web/lib/cheatsheets-compile.test.ts`: for each language whose tool exists (`resolve.ts`; skip cleanly otherwise) compile and run
  the source file; assert exit code 0 and empty output. The three runs are in separate `it` blocks with a 60 s timeout.
- Parser tests in the same file as the build script helpers: a marker without `@end`, a duplicate id, a missing topic.

## Acceptance criteria

- [ ] `/study/cheatsheets` offers C++, Java and Python sheets, each with all 64 topics, a complexity table, a "which container" table and
      a pitfalls list.
- [ ] Search and group filters work; the side-by-side view shows the same topic in all three languages.
- [ ] Each sheet's source file compiles and runs (verified by a test where the tool is installed).
- [ ] Each sheet shows its language version and the date it was checked.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files listed above (or explained in *Implementation notes*).

## Estimate

- Step 0: about 0.5 agent-day.
- Agents A-C (one sheet each, 64 compiled entries and three tables): about 1 day each, in parallel; agent D (pages and tests): about 0.75 day.
- Review and fixes: about 0.25 day.
- Total: about 2 calendar days at the current pace.
- Main risk: entries that compile but teach a bad habit (for example a hack that is only valid in GCC). Mitigation: the compile test plus the lead's
  five-entry accuracy review per language, and `@note` on anything non-portable.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

(Implementer fills in: files changed, deviations from the plan and why, test results, *Found but not changed*.)

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
