# HabitManager

Personal progress tracker for a 16-week SDE2/SWE3 interview-prep roadmap. Local-first: Next.js app +
SQLite file. Product spec: `SPEC.md` (git-ignored, may be absent). Read it only when planning new features.

## Commands (run from repo root)

- `pnpm dev` / `pnpm build` / `pnpm start`: web app on http://localhost:3000
- `pnpm test`: Vitest, all tests once (~5s). `pnpm check`: lint + typecheck + test + build (what CI runs)
- Windows: in PowerShell use `pnpm.cmd` / `npm.cmd` (script execution policy may block `pnpm.ps1`)

## Layout

- `packages/shared/src/`: pure logic + data, no I/O. `plan.ts` (16 weeks, task templates), `dsa.ts`
  (67 patterns, 201 problems; LeetCode slugs verified against LeetCode), `dates.ts`, `game.ts` (XP/level/streak),
  `study.ts` (study areas: concept checklists + practice exercises; system design and LLD from the PDF, core CS written for this app)
- `apps/web/lib/`: server-only data layer. `db.ts` (libSQL client + `MIGRATIONS`), `schema.ts` (Drizzle),
  `tasks.ts`, `dsa.ts`, `progress.ts` (XP/streak from every XP row: tasks, solves, practice sessions, covered concepts), `study.ts`, `roadmap.ts`, `leetcode/{client,sync}.ts`
- `apps/web/app/`: pages `/` (Today), `/roadmap`, `/dsa`, `/dsa/[id]`, `/study/[area]`, `/study/[area]/[id]`; all mutations in `actions.ts` (server actions);
  `api/ext/*` route handlers for the extension (pairing-key auth in `lib/leetcode/extension.ts`)
- `apps/extension/`: MV3 extension, plain JS + `// @ts-check` (typechecked, no build step). `lib/leetcode.js`
  (queries/parsing) and `lib/sync.js` (backfill/recent/capture, I/O injected) are pure and tested; `content.js`
  runs on leetcode.com and calls GraphQL with the user's own session; `background.js` is the only part that
  calls the app
- `data/habit.db`: the user's real data (git-ignored). Never modify it; test against a copy or `:memory:`

## Conventions

- **Next.js 16 with `cacheComponents`**: APIs differ from older Next. Check `apps/web/node_modules/next/dist/docs/`
  before using unfamiliar APIs. Request-time data goes in an async component that calls `await connection()`,
  wrapped in `<Suspense>`. Server actions call `refresh()` after mutating.
- Dates are local `YYYY-MM-DD` strings (helpers in `dates.ts`); never use UTC day math.
- Schema changes: append a new SQL string to `MIGRATIONS` in `db.ts` and update `schema.ts`. Never edit a
  shipped migration (`PRAGMA user_version` tracks them).
- XP is computed from rows (`tasks.xp` where done, `problem_solves.xp`), not stored as a running total.
- LeetCode: the app's own sync is anonymous public GraphQL (`leetcode/client.ts`); never give the app
  LeetCode cookies/credentials. Private data (code, notes) comes only via the extension, which runs in the
  user's logged-in leetcode.com tab. Both paths record solves through `recordAccepted` in `leetcode/sync.ts`.
- Tests: `*.test.ts` next to the code. DB tests use `DATABASE_URL=":memory:"`, reset `globalThis.habitDb`,
  fake only `Date` (`vi.useFakeTimers({ toFake: ["Date"] })`), and stub `fetch` for LeetCode.
- UI: Tailwind v4 with theme tokens in `app/globals.css` (`bg-surface`, `text-muted`, `border-line`,
  `bg-accent`…); shared bits in `app/ui.tsx`. Forms post to server actions and work without JS.

## Workflow

- Commit locally after each finished feature (one commit per feature, after `pnpm check`). Never push; the user pushes.
- After changes: `pnpm test`, then `pnpm check` before telling the user it's ready to push.
