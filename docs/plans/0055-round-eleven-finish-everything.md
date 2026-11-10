# 0055: Round eleven: finish plans 0053 and 0054 (six agents, balanced)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-10
- **Implemented by:** 3 Claude Code agents (A, B, C) and 3 Antigravity agents (D, E, F)
- **Spec:** implements `0053-solved-ticks-and-dsa-search-filters.md` and `0054-delete-my-data.md`, plus a small fix for silent LLD save errors

## Balance

Claude agents finish in about half the time of Antigravity's, so Claude takes the logic-heavy and trigger-sensitive work
and Antigravity takes UI work against fixed contracts. Read the two plans first; they hold the full design and
acceptance criteria. This file only splits the work and fixes the contracts so nobody waits for anybody.

| Agent | Owns (zero overlap) | Work | Fast check |
|---|---|---|---|
| **A** Claude | `apps/web/app/ui.tsx`, `apps/web/lib/dsa-filters.ts`, `apps/web/lib/dsa-filters.test.ts` | 0053 steps 1 and 2: the ticks, the multi-value filter model, the search index over title, topics, statement, hints and test cases | `pnpm exec vitest run apps/web/lib/dsa-filters.test.ts` |
| **B** Claude | `apps/web/lib/erase-data.ts` (+ test), `apps/web/app/api/account/**` (+ tests) | 0054 B1 (local erase, trigger safe) and the app routes for both deletes | `pnpm exec vitest run apps/web/lib/erase-data.test.ts apps/web/app/api/account` |
| **C** Claude | `packages/sync-worker/src/index.ts` (new delete route only) + `src/index.test.ts`, `apps/web/app/actions.ts` (only `saveNoteAction`), `apps/web/app/notes-form.tsx` (only to show the save error) | 0054 A1 (Worker delete route) and the silent-save-error fix | `pnpm exec vitest run packages/sync-worker apps/web/lib/notes.test.ts` |
| **D** Antigravity | `apps/web/app/dsa/page.tsx`, `apps/web/app/dsa/filter-group.tsx` (new) | 0053 step 3: multi-select dropdown filters, chips, Select all / Clear / Clear all, new search placeholder | `pnpm --filter web typecheck` + eslint on those files |
| **E** Antigravity | `apps/web/app/profile/account/delete-data.tsx` (new), `apps/web/app/profile/account/page.tsx` | 0054 C2: the two separate "Cloud data" and "Data on this device" sections with typed confirmation | `pnpm --filter web typecheck` + eslint on those files |
| **F** Antigravity | `apps/web/lib/erase-data-e2e.test.ts` (new), `docs/account-data.md` (new), `docs/releases/v0.7.1.md` (new) | End-to-end test that a local erase queues nothing and a later sync leaves the cloud copy intact (reuse the setup in `apps/web/lib/sync-e2e.test.ts`); a plain-language page on deleting data; draft release notes | `pnpm exec vitest run apps/web/lib/erase-data-e2e.test.ts` |

## Fixed contracts (code against these; do not wait for the owner)

```ts
// apps/web/lib/dsa-filters.ts  (Agent A)
export type FilterKey = "source" | "status" | "difficulty" | "topic" | "has";
export interface DsaFilters { q: string; source: DsaSource[]; status: StatusKey[]; difficulty: Difficulty[]; topic: string[]; has: HasKey[] }
export const FILTER_OPTIONS: Record<Exclude<FilterKey, "topic">, { value: string; label: string }[]>;  // topic options come from the page
export function parseDsaFilters(params: Record<string, string | string[] | undefined>): DsaFilters;   // repeated params; invalid dropped; caps
export function filtersToSearchParams(f: DsaFilters): URLSearchParams;                                // repeated keys, no empty values
export function removeFilterValue(f: DsaFilters, key: FilterKey | "q", value?: string): DsaFilters;   // for chip links
export function hasActiveFilters(f: DsaFilters): boolean;
export function filterProblems(patterns: PatternView[], f: DsaFilters): { problem: ProblemView; patterns: string[] }[];
// StatusKey/HasKey values are the existing keys of STATUS_FILTERS / HAS_FILTERS; DsaSource values as today ("" is not a value any more).
```

Account delete routes (Agent B builds, Agent E calls):

- `GET /api/account/local-summary` → `{ ok: true, counts: { solves: number; notes: number; runs: number; tasks: number; other: number }, linked: boolean, account: string | null }`
- `POST /api/account/local-erase` body `{ confirm: "DELETE", keepSettings?: boolean, includeImported?: boolean }` → `{ ok: true, removed: Record<string, number> }`; 400 `{ ok:false, error }` if `confirm` is not exactly `DELETE`. Works signed out.
- `POST /api/account/cloud-delete` body `{ scope: "data" | "account", confirm: "DELETE" }` → `{ ok: true, deleted: Record<string, number> }`; 401 signed out, 400 bad body, 429 passes `Retry-After`; on success the device is unlinked.
- All same-origin only (`checkSameOrigin` from `lib/auth/util`), JSON only, no stack traces, never log data.

Worker route (Agent C builds, Agent B proxies): `POST /api/account/delete-data` Bearer-authenticated, same body as `cloud-delete`, response `{ ok: true, deleted: { [table]: count } }`, limit 3 per hour per user.

Save result (Agent C): `saveNoteAction(formData)` returns `{ ok: true } | { ok: false; error: string }`; with JavaScript off the form still posts and works (the action's redirect/refresh behavior stays; the error is shown by the form on the next render when JS is on).

## Rules for everyone

- Read the two plans (0053, 0054) fully before starting; follow their Design and Pitfalls exactly.
- Read each file once in full, make all its edits, then verify **once** with your fast check, plus `pnpm --filter web typecheck` and `cd apps/web; pnpm exec eslint <your files>` for anything under `apps/web`. If you turn a component into a client component, also run `pnpm --filter web build` once (server-only imports are only caught by the build).
- Never run full `pnpm test` or `pnpm check`; the lead runs one at the end. Never touch `data/habit.db` (tests use `:memory:`). Never run anything with `wrangler ... --remote`.
- Local commits in plain English with explicit `git add <paths>`; no push, no tag, no attribution.

## Final (lead)

- [ ] Pull everyone's commits, `pnpm -r typecheck`, one `pnpm check`; push (Worker deploys); mark 0051 to 0054 implemented after the user has tried them; release 0.7.1 only when the user says so.

## Acceptance criteria

- [ ] Everything in the acceptance lists of plans 0053 and 0054.
- [ ] A rejected LLD project shows a plain error in the form instead of failing silently.
- [ ] `pnpm check` passes.
