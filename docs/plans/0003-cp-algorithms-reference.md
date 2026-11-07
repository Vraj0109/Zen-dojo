# 0003: cp-algorithms articles as a reference tab on DSA pattern guides

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Antigravity (steps 1-2, partly), Claude Code (finished steps 2-6, 2026-11-07)
- **Suitable for a smaller model:** yes. Every step is mechanical: a download script, a mapping table given below,
  and one UI tab. Run it with a cheaper model if you like (`agy models` lists them; `agy --model <name> -i "…"`).

## Goal

Each DSA pattern guide (`/dsa/pattern/[id]`) gets a **Reference** tab showing the matching articles from
[cp-algorithms](https://cp-algorithms.com) (proofs, variants, complexity analysis and C++ code), stored in the repo so
the app works offline, with proper attribution.

## Context

- **License:** cp-algorithms text is **CC BY-SA 4.0** (repo LICENSE; site footer "Text is available under the
  Creative Commons Attribution Share Alike 4.0 International License", © cp-algorithms contributors). Reusing it is
  allowed if we: credit "cp-algorithms contributors", link to the source article, link the license, say we modified
  it (format conversion), and keep the imported content under CC BY-SA 4.0. The rest of this repo keeps its own
  terms. Some articles are translations from e-maxx.ru and some images are third-party (also CC BY-SA); keep each
  article's own notices.
- **Don't scrape HTML.** Articles are Markdown in the GitHub repo `cp-algorithms/cp-algorithms`, folder `src/`, one
  file per page: site path `graph/dijkstra.html` = `src/graph/dijkstra.md`.
  Raw URL pattern (verified for binary search):
  `https://raw.githubusercontent.com/cp-algorithms/cp-algorithms/<commit>/src/num_methods/binary_search.md`.
  Pin a commit SHA (get it from `https://api.github.com/repos/cp-algorithms/cp-algorithms/commits/main`, field `sha`)
  so imports are reproducible.
- **Format:** YAML front matter (`tags: - Original` or `- Translated` with an `e_maxx_link`), `$…$` / `$$…$$` math,
  fenced code including ` ```{.cpp file=name} `, admonitions `??? note "Title"` / `!!! …` with indented bodies,
  images as HTML `<img>` tags with relative `src`. The first `# ` heading is the title.
- Pattern ids are in `packages/shared/src/dsa.ts` (`ALL_PATTERNS`). The pattern guide page is
  `apps/web/app/dsa/pattern/[id]/page.tsx`. If plan 0001 is merged, use `apps/web/app/tabs.tsx` for tabs.
- Conventions: AGENTS.md. Content stays pure data; reading files happens in `apps/web/lib/`.

## Priority and fit with other plans (added 2026-11-07)

This is a **supplement**. Our own full pattern articles (plans 0007 and 0008) are the main teaching material for all
67 patterns; cp-algorithms only adds proofs and variants for the 45 mapped patterns. Do steps 3-6 after 0006 and
0007: the pattern page then has Learn and Practice tabs (`tabs.tsx`, `ArticleLayout`) and this plan adds a third
`reference` tab. The imported articles are shown in full; summaries belong only on Quick revise.

## Out of scope

- Importing articles not in the mapping below, or the whole site.
- Editing article text beyond format conversion.
- Any change to the pattern guides written for this app (`packages/shared/src/learn/dsa-*.ts`).

## Steps

- [x] **1. Mapping file.** Create `packages/shared/src/cp-algorithms.ts` exporting
  `CP_ALGO_ARTICLES: Record<string, string[]>` (pattern id → article paths relative to `src/`, without `.md`),
  with exactly the entries in the table below (patterns not listed get no entry), and
  `cpAlgoUrl(path) = "https://cp-algorithms.com/" + path + ".html"`. Export it from `packages/shared/src/index.ts`.
  Add a test `cp-algorithms.test.ts`: every key is a real pattern id in `ALL_PATTERNS`; no duplicate paths within an
  entry.
  - Done when: `pnpm test` passes.

- [x] **2. Import script.** Create `scripts/import-cp-algorithms.mjs` (Node, no network calls except
  `raw.githubusercontent.com` and `api.github.com`) that:
  1. Resolves the pinned commit SHA (argument `--commit <sha>`, else fetch the latest `main` SHA and print it).
  2. Downloads `src/navigation.md` at that commit and collects every linked article path; any mapped path not in it
     is reported as **missing** (don't fail; skip it and list it at the end).
  3. Downloads each mapped article's Markdown (deduplicate paths used by several patterns). Wait ~300 ms between
     requests; set a `User-Agent: HabitManager-importer` header; retry once on network errors.
  4. Converts Markdown → HTML with `marked` (add as a root devDependency) and renders math with `katex` (root
     devDependency) at import time: replace `$$…$$` with `katex.renderToString(tex, { displayMode: true,
     throwOnError: false })` and `$…$` inline (skip `$` inside code spans/blocks). Convert admonitions
     (`??? note "T"` / `!!! info "T"` + indented body) to `<details><summary>T</summary>…</details>` (`???`) or
     `<aside>`. Normalize ` ```{.cpp file=x} ` fences to ` ```cpp `. Rewrite relative image `src` and article links to
     absolute `https://cp-algorithms.com/...` URLs. Strip `<script>` tags and inline event handlers (defense in
     depth even though the source is trusted).
  5. Writes `apps/web/content/cp-algorithms/<path with / replaced by __>.json` =
     `{ path, title, tags, html, sourceUrl, commit, importedOn }`, an `index.json` (list of `{ path, title }`),
     `LICENSE` (CC BY-SA 4.0 text: download `LICENSE` from the same commit) and `NOTICE.md` (source repo, commit,
     date, "Converted from Markdown to HTML; no other changes", credit line).
  6. Prints a summary: imported N, missing [...].
  Add `"import:cp-algorithms": "node scripts/import-cp-algorithms.mjs"` to the root `package.json`.
  - Done when: running it creates the content folder, and running it again with the same `--commit` produces no
    diff.

- [x] **3. Run the import and commit the content.** Run the script once; record the commit SHA and the missing list
  in *Implementation notes*. Check the total size of `apps/web/content/cp-algorithms/` (expect a few MB; report it).
  - Done when: content files exist for every non-missing mapped path.

- [x] **4. Loader.** Create `apps/web/lib/cp-algorithms.ts` (server-only) with
  `getCpAlgoArticles(patternId): Promise<{ path, title, html, sourceUrl }[]>` reading the JSON files with `fs`
  (path resolved from the repo root like `lib/db.ts` does, so it also works in the desktop standalone build: also
  add `apps/web/content/**` to `outputFileTracingIncludes` in `apps/web/next.config.ts` for the `/dsa/pattern/[id]`
  route so the files are bundled). Return `[]` when a file is missing. Test it in `apps/web/lib/cp-algorithms.test.ts`
  with a pattern that has articles (non-empty, has `html` and `sourceUrl`) and one without (empty array).
  - Done when: tests pass.

- [x] **5. Reference tab.** On `apps/web/app/dsa/pattern/[id]/page.tsx` add tabs `guide` (default: the current page
  content) and `reference` (label "cp-algorithms (N)", hidden when N = 0). The Reference tab shows, per article: the
  title, a credit line "From [cp-algorithms](sourceUrl) by cp-algorithms contributors, CC BY-SA 4.0
  ([license](https://creativecommons.org/licenses/by-sa/4.0/)). Converted to HTML; text unchanged.", then the HTML
  inside a container styled for prose (headings, lists, tables, `pre` like `CodeBlock`, max width readable). Import
  KaTeX CSS for this page only (`import "katex/dist/katex.min.css"` in the page, add `katex` to `apps/web`
  dependencies). Render with `dangerouslySetInnerHTML` (content is from our own repo, sanitized at import).
  - Done when: e.g. `/dsa/pattern/dijkstra?tab=reference` shows the Dijkstra articles with math rendered and the
    credit line; the Guide tab is unchanged.

- [x] **6. Desktop build check.** Run `pnpm --filter desktop prepare-server` and confirm
  `apps/desktop/server/apps/web/content/cp-algorithms/` exists (or wherever the loader resolves it). If not, fix the
  tracing include.
  - Done when: noted in Implementation notes.

### Mapping (pattern id → article paths under `src/`)

Paths come from the cp-algorithms navigation; the script verifies them and reports any that moved.

| Pattern id | Articles |
|---|---|
| sliding-window | data_structures/stack_queue_modification |
| kadane | others/maximum_average_segment |
| string-matching | string/prefix-function, string/z-function, string/rabin-karp, string/string-hashing |
| bs-index | num_methods/binary_search |
| bs-answer | num_methods/binary_search |
| quickselect | sequences/k-th |
| fast-slow | others/tortoise_and_hare |
| monotonic-deque | data_structures/stack_queue_modification |
| stack-parsing | string/expression_parsing, combinatorics/bracket_sequences |
| tree-dfs | graph/depth-first-search |
| tree-bfs | graph/breadth-first-search |
| binary-lifting | graph/lca_binary_lifting, graph/lca |
| trie | string/aho_corasick |
| graph-bfs | graph/breadth-first-search |
| graph-dfs | graph/depth-first-search, graph/search-for-connected-components |
| topo-sort | graph/topological-sort |
| union-find | data_structures/disjoint_set_union |
| dijkstra | graph/dijkstra, graph/dijkstra_sparse |
| bellman-ford | graph/bellman_ford, graph/01_bfs |
| floyd-warshall | graph/all-pair-shortest-path-floyd-warshall |
| mst | graph/mst_kruskal, graph/mst_kruskal_with_dsu, graph/mst_prim |
| bipartite | graph/bipartite-check |
| tarjan | graph/bridge-searching, graph/cutpoints, graph/strongly-connected-components |
| eulerian | graph/euler_path |
| state-space-bfs | graph/breadth-first-search |
| subsets | combinatorics/generating_combinations |
| bit-tricks | algebra/bit-manipulation, algebra/gray-code |
| bitmask-dp-subsets | algebra/all-submasks, dynamic_programming/profile-dynamics |
| bitmask-dp-assign | algebra/all-submasks |
| dp-1d | dynamic_programming/intro-to-dp |
| knapsack | dynamic_programming/knapsack |
| lis | dynamic_programming/longest_increasing_subsequence |
| interval-dp | dynamic_programming/knuth-optimization |
| dp-optimizations | dynamic_programming/divide-and-conquer-dp, dynamic_programming/knuth-optimization, geometry/convex_hull_trick |
| greedy-proof | schedules/schedule_one_machine |
| exchange-argument | schedules/schedule_one_machine |
| number-theory | algebra/sieve-of-eratosthenes, algebra/binary-exp, algebra/euclid-algorithm, algebra/module-inverse |
| combinatorics | combinatorics/binomial-coefficients, combinatorics/inclusion-exclusion |
| geometry | geometry/basic-geometry, geometry/oriented-triangle-area, geometry/convex-hull |
| segment-tree | data_structures/segment_tree, data_structures/fenwick |
| sparse-table | data_structures/sparse-table, data_structures/sqrt_decomposition |
| ordered-set | data_structures/treap |

## Acceptance criteria

- [x] `pnpm import:cp-algorithms --commit <sha>` is reproducible and reports missing paths instead of failing.
- [x] Pattern guides with mapped articles show a Reference tab with rendered math, code and a credit line on every
  article; others show no tab.
- [x] `apps/web/content/cp-algorithms/` contains `LICENSE` and `NOTICE.md`.
- [x] The desktop build includes the content.
- [x] `pnpm check` passes.

## Open questions

## Implementation notes

### Done by Claude Code, 2026-11-07
- **Import:** `pnpm import:cp-algorithms --commit bbbbb6f04e5c9a665c8477ec68ee4f28b1367dd7` imported **58** articles into `apps/web/content/cp-algorithms/` (5.8 MB, 61 files incl. `index.json`, `LICENSE`, `NOTICE.md`). A second run with the same commit produced no diff. Nothing is missing now.
- **Fix to the mapping:** `lis` pointed at `sequences/longest_increasing_subsequence`, which doesn't exist. The real path is `dynamic_programming/longest_increasing_subsequence` (updated in `packages/shared/src/cp-algorithms.ts` and the table above). The root `package.json` had no `import:cp-algorithms` script; added it. KaTeX is called with `strict: "ignore"` so imports don't print warnings.
- **Loader:** `apps/web/lib/cp-algorithms.ts` (`getCpAlgoArticles`, `cpAlgoCount`), with tests in `cp-algorithms.test.ts` (mapped articles load, math rendered, no scripts, empty list for unmapped patterns, a content file for every mapped article). It also replaces the importer's plain `<pre><code>` blocks with the app's coloured code blocks (plan 0011).
- **Tab:** `apps/web/app/dsa/pattern/[id]/page.tsx` shows "Reference · N" only for patterns that have articles; `?tab=reference` on a pattern without articles falls back to Learn. Each article has the credit line with the source link and the CC BY-SA 4.0 link, inside the `ArticleLayout` with a contents rail. KaTeX CSS is imported on that page; article prose styles are `.cp-prose` in `globals.css`.
- **Desktop:** `outputFileTracingIncludes` for `/dsa/pattern/[id]` in `next.config.ts`. `pnpm --filter desktop prepare-server` puts the content at `apps/desktop/server/apps/web/content/cp-algorithms`; the standalone server served `/dsa/pattern/segment-tree?tab=reference` with 432 math spans and 33 coloured code blocks.
- **Browser check:** Dijkstra and segment tree references in light and dark at 1440 px and 390 px: math, headings and code render; no horizontal scroll at 390 px.
- **Checks:** `pnpm check` exits 0 (29 test files, 218 tests).

## Review
