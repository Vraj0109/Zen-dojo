# 0065: Round twelve: Python, three-language solutions and the tools check (six agents)

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** 3 Claude Code agents (A, B, C) and 3 Antigravity agents (D, E, F)
- **Spec:** implements `0062-python-in-the-judge.md`, `0063-solutions-in-three-languages.md`, plan 0061 part A and B1/B2, and
  plan 0057 (three UI fixes). Plan 0064 (portable tool manager) is written but **not** in this round: it needs 0061 part A and 0062 merged first.
- **Estimate at this project's pace:** Claude agents about 3 to 4 hours; Antigravity content agents about 6 to 8 hours (about
  150 problems times two languages each). The lead's final steps add about 30 minutes.

## Balance

Claude takes the engine, tooling and UI work (and finishes in about half the time). Antigravity takes the bulk
**content**: Java and Python reference solutions as plain files, so it spends tokens on writing and verifying code, not on
editing TypeScript. Read the plans first; this file only splits the work and fixes the contracts so nobody waits.

| Agent | Owns (zero overlap) | Work | Fast check |
|---|---|---|---|
| **A** Claude | `apps/web/lib/judge/{resolve.ts,run.ts,run-project.ts,harness.ts,blocked.ts}` (+ tests, new `judge-python.test.ts`), `packages/shared/src/judge/{types.ts,templates.ts}` (+ tests), `apps/web/app/{judge-workspace.tsx,code-editor.tsx,editor-help.ts}`, `apps/web/lib/{code-lang.ts,notes.ts}` (+ tests), `apps/web/app/actions.ts` (language validation only), `apps/web/app/api/judge/run/route.ts` | Plan 0062: Python in the judge, plus Node-less JavaScript | `pnpm exec vitest run apps/web/lib/judge/resolve.test.ts apps/web/lib/judge/judge-python.test.ts packages/shared/src/judge` |
| **B** Claude | `packages/shared/src/tool-hints.ts` (+ test), `apps/web/lib/judge/tools.ts` (+ test), `apps/web/app/profile/settings/tools/**`, `apps/web/app/profile/settings/page.tsx` (one link), `apps/web/app/page.tsx` (tools notice), `docs/troubleshooting.md`, `docs/signing.md`, `docs/releases/_install-notes.md`, `.github/workflows/desktop.yml`, `README.md`, plus plan 0057's files (`apps/web/app/study/[area]/page.tsx`, `apps/web/app/components/account-popover.tsx`, and whichever file the Today scroll turns out to live in) | Plan 0061 part A (without step A3, which moved to A) and B1/B2; plan 0057 | `pnpm exec vitest run packages/shared/src/tool-hints.test.ts apps/web/lib/judge/tools.test.ts` |
| **C** Claude | `scripts/solutions.mjs`, root `package.json` (the `solutions:*` scripts only), `packages/shared/src/judge/{solutions.ts,solution-groups.ts,solutions.test.ts,generated/solutions.ts}`, `packages/shared/content/solutions/**` (creates the folder and README only), `apps/web/lib/judge/solutions-verify.test.ts`, `scripts/solutions-verify.mjs`, `apps/web/app/problem-workspace.tsx`, `apps/web/app/dsa/[id]/page.tsx`, `docs/solutions.md`, `docs/content-editing.md` (one link) | Plan 0063 steps 1 to 6 (tooling, verifier, API, tabs, docs) | `pnpm exec vitest run packages/shared/src/judge/solutions.test.ts` |
| **D** Antigravity | files `packages/shared/content/solutions/<id>.java` and `<id>.py` for **group `d`** (LeetCode files 1 to 8, 163 problems) | Plan 0063 step 7d | `pnpm solutions:verify --group d` |
| **E** Antigravity | the same for **group `e`** (LeetCode file 9, all CSES, design-a-class problems, special, other; 159 problems) | Plan 0063 step 7e | `pnpm solutions:verify --group e` |
| **F** Antigravity | the same for **group `f`** (Euler, AtCoder, Codeforces, Kattis, logic batches; 164 problems) | Plan 0063 step 7f | `pnpm solutions:verify --group f` |

**Not touched by anyone in this round:** `AGENTS.md` (the lead edits its language and docs mentions at the end), every
`problems-*.ts` and `stress-*.ts` file, `data/habit.db`, the plan files (only the lead updates statuses and notes).

## Order and dependencies

1. **A** commits `apps/web/lib/judge/resolve.ts` (plan 0062 step 1) first. **B** may import `resolveTool` from it; until
   then B codes against the contract below.
2. **C** commits the groups, scripts and empty folder (0063 step 1) first, then the verifier (step 2). **D, E, F start when
   `pnpm solutions:todo d --limit 2` works** (check `git log` for C's first commit; if it is not there yet, wait for it).
3. D, E, F verify **Java** as soon as C's verifier lands, and **Python** once A's step 3 has landed (the verifier needs it).
   Until then they keep writing the Python files.
4. When A, B and C are done, they report; the lead pulls everything. D, E, F finish later.

## Fixed contracts (code against these)

```ts
// apps/web/lib/judge/resolve.ts (Agent A)
export type ToolId = "cpp" | "javac" | "java" | "node" | "python";
export interface ToolCommand { file: string; args: string[]; env?: Record<string, string> }
export function resolveTool(id: ToolId): ToolCommand;        // never throws; may point at a missing file
export function tool(envName: string, fallback: string): string;  // the existing helper, moved here

// packages/shared/src/judge/types.ts (Agent A)
export const JUDGE_LANGS = ["cpp", "java", "javascript", "python"] as const;

// packages/shared/src/judge/solutions.ts (Agent C)
export type SolutionLang = "cpp" | "java" | "python";
export function solutionCode(spec: ProblemSpec, lang: SolutionLang): string | null;
export function solutionLangs(spec: ProblemSpec): SolutionLang[];
```

Solution files (D, E, F, and the verifier): `packages/shared/content/solutions/<problem-id>.java` and `.py`; exactly the
rules of plan 0063 ("Design"). Verifier output: `ok lc-1.java 2.1s` or `FAIL lc-1.py case 3: ...`.

## Rules for everyone

- Read your plan(s) fully first. Read each file once, make all its edits, then verify once with your fast check, plus
  `pnpm -r typecheck` and `cd apps/web; pnpm exec eslint <your files>` for anything under `apps/web`.
- Never run full `pnpm test` or `pnpm check`; the lead runs one at the end. Never run `pnpm desktop:build`.
- Never touch `data/habit.db` or the desktop app-data folder (tests use `:memory:` or a temp copy).
- Local commits in plain English with explicit `git add <paths>`; no push, no tag, no attribution line.
- Report problems you find in code you do not own (for example a wrong test expectation in a problem); do not fix them.
- Antigravity agents D, E, F: no TypeScript edits at all, no plan edits, do not run `solutions:build`; commit your files every
  batch of about 10 problems; finish with `pnpm solutions:status <group>` and `pnpm solutions:verify --group <group>`
  pasted in your final message, listing any problem whose data looks wrong.

## Final (lead)

- [ ] Pull everyone's commits; `pnpm solutions:build`; edit `AGENTS.md` (languages now include Python; link `docs/solutions.md`);
  `pnpm -r typecheck`; **one** `pnpm check` (about 6 to 9 minutes); list any problems the content agents reported as
  wrong and decide; mark 0057, 0061 (part A and B1/B2 only; B3/B4 stay open), 0062, 0063 implemented; push only when the
  user asks; release only when the user says so.
- [ ] Update `docs/plans/README.md` "Next up" and `docs/HANDOFF.md` "State" (see the rule at the top of HANDOFF.md).

## Acceptance criteria

- [ ] Everything in the acceptance lists of plans 0062, 0063, 0057 and 0061 (part A, B1, B2).
- [ ] `pnpm solutions:status` shows 100% Java and Python for groups d, e, f, and `pnpm solutions:verify --group <g>` has no FAIL.
- [ ] `pnpm check` passes.

## Prompts to give the Antigravity agents

Agent D (E and F: change the group letter):

```
You are Antigravity agent D in round twelve. Read docs/plans/0065-round-twelve-python-and-solutions.md and
docs/plans/0063-solutions-in-three-languages.md (section "Step 7: content"), then AGENTS.md.
Your job: write the Java and Python reference solution files for every problem in group d, only inside
packages/shared/content/solutions/. Do not edit any other file. Wait until `pnpm.cmd solutions:todo d --limit 2` works
(Claude agent C commits it first; check git log). Work in batches of 10: solutions:todo, write <id>.java and <id>.py,
solutions:verify those ids, fix FAILs, commit with explicit git add, repeat until solutions:status d is 100%.
Report wrong problem data instead of editing it. No push, no tag, no attribution in commits.
```

## Open questions

## Implementation notes

## Review
