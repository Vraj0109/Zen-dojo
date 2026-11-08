# Content packs: add lessons and problems without changing the code

A **content pack** is one JSON file. Import it in **Profile → Settings → Content** (paste it, choose the file, or give a
web address) and it becomes a course in **Learn**. Its problems open in the same editor with the Run button, and finishing
items tracks progress. Installing a pack with the same `id` again updates it and keeps your progress on items that still exist.
Remove a pack from its course page. Packs are stored in your database, so they are part of backups.

Try the example first: `docs/examples/sample-pack.json`.

## Format (version 1)

```json
{
  "format": "prepwise-pack",
  "version": 1,
  "id": "my-graph-course",
  "title": "Graph problems",
  "description": "One or two sentences shown on the course card.",
  "sections": [
    {
      "title": "Basics",
      "items": [
        { "type": "lesson", "id": "bfs", "title": "Breadth-first search", "markdown": "..." },
        { "type": "problem", "id": "shortest-path", "title": "...", "...": "see below" }
      ]
    }
  ]
}
```

- `id` (pack and every item): lowercase letters, digits and hyphens, up to 40 characters. Item ids must be different within a pack.
- Items appear in the order written. A section is just a heading in the course page.

### Lesson

| field | meaning |
|---|---|
| `type` | `"lesson"` |
| `markdown` | The text. Supported: paragraphs, `##` and `###` headings, `-` or `1.` lists, fenced code blocks (` ```cpp `), `**bold**`, `` `code` ``. Raw HTML is shown as text. |

### Problem

| field | meaning |
|---|---|
| `type` | `"problem"` |
| `title`, `difficulty` | `difficulty` is optional: `easy`, `medium`, `hard` |
| `statement` | List of paragraphs (plain text) |
| `constraints` | List of lines |
| `fn` | The function the learner writes: `{ "name": "lowerBound", "params": [{ "name": "nums", "type": "int[]" }, ...], "returns": "int" }` |
| `examples` | Shown with the statement and run first: `{ "input": [...], "output": ..., "explanation": "optional" }`. `input` has one value per parameter, in order. |
| `tests` | More cases of the same shape, run after the examples. Include edge cases: empty, one element, duplicates, extremes. |
| `hints` | Smallest nudge first |
| `solution` | Optional: `{ "idea": ["..."], "complexity": "O(n)", "cpp": "full reference code" }` |
| `unordered` | Optional `true` when any order of the returned list is correct |
| `url` | Optional link to the original problem (`http(s)` only) |

**Types** for parameters and the return value: `int`, `long`, `double`, `bool`, `string`, `int[]`, `long[]`, `bool[]`,
`string[]`, `int[][]`, `string[][]`, plus `list` (a linked list, written as `[1,2,3]`) and `tree` (a binary tree written level
by level like LeetCode, `[1,null,2,3]`). Values in `input` and `output` are plain JSON of that type. The app checks every
case against the declared types and tells you what is wrong.

Pack problems are judged on the examples and tests only (the built-in problems also have large-input speed checks). Make the
tests count: include cases where a slow or overflow-prone solution fails.

## Giving this to another AI (scraping and converting)

Copy the prompt below, add your source (a URL, pasted text, or a PDF's text) and the file `docs/examples/sample-pack.json` as the example,
and ask for one JSON file. Then use **Check only** in Settings, which lists every problem in plain words, and fix with the same AI.

```
You are converting learning material into a Zen Dojo content pack (JSON, format "prepwise-pack", version 1).
Follow the example file exactly. Rules:
- Write everything in your own words. Do not copy long passages from the source; summarise and credit the source in the pack description.
- One pack = one course. Use sections for topics. Lessons are Markdown (headings, short paragraphs, lists, fenced code).
- For each coding problem give: statement (list of paragraphs), constraints, fn (name, params with types, returns), 2-3 examples,
  at least 6 tests with edge cases, 3 hints from smallest to biggest, and a solution with idea, complexity and a correct C++ class
  named Solution. Allowed types: int, long, double, bool, string, int[], long[], bool[], string[], int[][], string[][], list, tree.
- Compute every "output" by running the reference solution mentally or in code. A wrong expected output makes the problem unfair.
- ids are lowercase letters, digits and hyphens and must be unique in the pack.
- Output only the JSON.
```

## Limits

A pack can be up to 2 MB with up to 500 items; one problem can have up to 200 tests. A web address must be `http(s)`; the
download is capped at 2 MB and 15 seconds.

## For developers

- Format and validation: `packages/shared/src/packs.ts` (`validatePack`, `packProblemSpec`, `parseMarkdown`).
- Storage: tables `content_packs` and `pack_progress` (in `BACKUP_TABLES`), code in `apps/web/lib/packs.ts`.
- Pages: `/study/packs/[id]` (course) and `/study/packs/[id]/[item]` (lesson or problem). Imported problems run through
  `/api/judge/run` with ids like `pack:<pack-id>:<item-id>`; passing every test marks the item done.
- Courses in Learn: `getCourses()` in `apps/web/lib/courses.ts` adds one card per installed pack.
