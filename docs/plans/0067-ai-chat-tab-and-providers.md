# 0067: Ask AI as a chat tab, with starter questions and a choice of AI provider

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** (implementer fills in)
- **Spec:** replaces the "Ask local AI" panel of `0060-local-ai-helper.md`; keeps all of 0060's privacy rules for the local model
- **Estimate at this project's pace:** one round with four Claude agents (about 2 hours)

## Goal

The user tried plan 0060 and found it weak in three ways. This plan fixes all of them.

1. **You cannot see what was asked.** Pressing "Explain this hint" shows only the answer, not which hint was meant.
2. **No sign of life** between pressing the button and the first word (a local model can take 10 to 60 seconds to load).
3. **It is not a conversation**, and it sits under the problem, outside the tabs. You cannot ask your own question, such as
   "I know I should use a deque but my logic feels off, explain why".

New behaviour: a **chat tab** ("Ask AI") next to Description, Hints and Notes on every problem that has the Run button.

- Starter chips that begin the chat by posting a visible message: **Explain the question**, **Explain hint N** (the message
  contains the hint text, for example `Explain hint 2: "Keep indices in a deque ..."`), **Review my code**, **Explain the solution**.
- A text box for anything else. Follow-up questions keep the earlier messages as context.
- A clear loading state until the first word arrives, then streaming, with Stop.
- The chat **stays when you switch tabs** (and survives a reload of the same problem, within the browser session).
- A choice of **who answers**: the local Ollama model (default, nothing leaves the computer) or an AI tool already installed and
  signed in on this computer: **Claude Code** (`claude`), **Antigravity** (`agy`), **Gemini CLI** (`gemini`) and **Codex CLI**
  (`codex`, the ChatGPT one). These send the problem text, and your code if you allow it, to that company under your own login.

## Context (verified 2026-11-11)

- Current code: `apps/web/app/dsa/ask-ai.tsx` (collapsed `<details>` panel, one button per action, one answer at a time, mounted at
  `apps/web/app/dsa/[id]/page.tsx:201`), `apps/web/app/api/ai/{status,pull,chat,settings}/route.ts`, `apps/web/lib/ai/{ollama,guard,context,hardware}.ts`,
  `packages/shared/src/ai-prompts.ts` (`buildHintPrompt`, `buildReviewPrompt`, `buildSolutionPrompt`), settings keys `ai_enabled`, `ai_model`,
  `ai_ollama_url` in `lib/ui-prefs.ts` (on the sync denylist), Settings section `app/profile/settings/ai-settings.tsx`, `docs/local-ai.md`.
- Problem tabs: `apps/web/app/judge-workspace.tsx` renders every tab panel at once and only toggles the `hidden` attribute
  (`<div role="tabpanel" hidden={t.id !== active.id}>`, around line 360). A client component placed inside a tab therefore **keeps its
  state when you switch tabs**; this plan relies on that. The tabs list is built in `apps/web/app/dsa/[id]/page.tsx` as `judgedTabs`
  (`{ id, label, node }`).
- The chat route today builds the whole prompt on the server from `{ problemId, action, hintIndex }`, so the reference solution never reaches the browser.
  Keep that property.
- Installed here and non-interactive-capable: `claude` (`claude -p`, `--output-format`, `--input-format`, `--no-session-persistence`,
  `--append-system-prompt`, `--allowedTools`/`--disallowedTools`, `--model`) and `agy` (`agy -p`, `--output-format text|json|stream-json`,
  `--input-format`, `--mode plan`, `--print-timeout`, `--sandbox`). `gemini` and `codex` are not installed on this machine, so their flags
  cannot be checked here (see Step 3).
- Conventions that apply: `AGENTS.md` (Next 16 `cacheComponents`, no emoji, Tailwind tokens, forms/actions pattern, targeted tests only),
  `docs/plans/0066-...md` "Rules for everyone". Same-origin and desktop/local-only guards already exist in `lib/ai/guard.ts`.

## Design (decided)

### Chat protocol

`POST /api/ai/chat` (same guards as today). Body:

```ts
{
  problemId: string;
  messages: { role: "user" | "assistant"; content: string }[];  // the visible conversation; last item is the new user message
  intent?: "question" | "hint" | "review" | "solution" | "free"; // set by the chip that started the chat; "free" if typed
  hintIndex?: number;           // with intent "hint"
  revealSolution?: boolean;     // the user has pressed "Explain the solution" in this chat; sticky for the rest of the chat
  includeCode?: boolean;        // send the saved code of this problem (always true for intent "review")
}
```

The server (never the browser) builds the **system message and the problem context** and prepends them to `messages`:

- Always: title, statement, constraints. For `hint` intent also the chosen hint text; for `free` the hints **already shown in the chat** are
  not needed, so no hints unless the user pasted them.
- `includeCode` or intent `review`: the user's saved code from `problem_notes` (as today, clipped to 6,000 characters). If there is none,
  respond `400 no_code` for `review`, and simply omit it for `free`.
- `revealSolution`: add the reference idea, complexity and code (as `buildSolutionPrompt` does today). Without it the reference solution is
  **never** included, and the system message says: "Guide with questions and small nudges. Do not give the full solution or full code
  unless the learner has asked for the solution."
- Limits: at most 20 messages, each at most 4,000 characters, total at most 16,000; extra old messages are dropped from the front (keep the
  newest); roles other than user/assistant are rejected (400).

`packages/shared/src/ai-prompts.ts` gets pure builders: `buildChatMessages({ problem, solution?, code?, language?, intent, hintIndex, history })`
returning the final `ChatMessage[]`, plus `starterMessage(intent, { hintIndex, hintText })` that returns the **visible** text the chip posts
(for example `Explain the question to me.`, `Explain hint 2: "<hint text>"`, `Review my code.`, `Explain the solution.`). Keep the three old
builders only if still used; otherwise remove them and their tests.

### Who answers (providers)

New settings key `ai_provider`: `"ollama"` (default) | `"claude"` | `"agy"` | `"gemini"` | `"codex"`, added to the sync denylist like the
other AI keys. A second key `ai_cloud_consent` holds a JSON list of provider ids the user has accepted ("I understand my problem text and
code go to X"); also on the denylist. Settings shows, per provider: found or not found, what it is, and for the cloud ones a plain warning
and a **Test** button (sends the word "ping", shows the reply or the error).

`apps/web/lib/ai/providers/` (server-only): `index.ts` (`getProvider(id)`, `detectProviders()`), `ollama.ts` (wraps the existing client), `cli.ts`
(shared runner), and one small file per CLI with its fixed argument list. Interface:

```ts
export interface AiProvider {
  id: "ollama" | "claude" | "agy" | "gemini" | "codex";
  label: string;
  cloud: boolean;                                   // true for the four CLIs
  detect(): Promise<{ found: boolean; detail?: string }>;
  chat(messages: ChatMessage[], opts: { signal: AbortSignal; model?: string }): AsyncGenerator<string>;
}
```

**CLI runner rules (security, all required):**

- `execFile`/`spawn` with `shell: false` and a **fixed argument list from code**. The prompt is written to the child's **stdin**, never put in argv.
  On Windows, an npm-installed CLI is a `.cmd` shim (`gemini.cmd`, `codex.cmd`): resolve the real path with `where`, and run `.cmd` files through
  `cmd.exe /d /s /c <path> <fixed args>`, still with the prompt on stdin. Never build the command from request data.
- Run in a **fresh empty temporary folder** as the working directory (deleted afterwards), with the CLI's tools turned off or read-only as far as
  its flags allow (examples to verify: `claude -p --no-session-persistence --disallowedTools "*"`-style options, `agy -p --mode plan --sandbox`).
  The assistant must not be able to edit files, run commands or read the project. If a CLI cannot be restricted that way, do **not** offer it,
  and say so in the notes.
- Timeout 120 s (configurable constant), output cap 200 KB, kill the whole process tree on abort or timeout (reuse the kill helper from
  `apps/web/lib/judge/run.ts` if it is exported, else a small copy with a comment).
- Streaming: if the CLI has a streaming output mode that is simple to parse (for example `--output-format stream-json`), stream it; otherwise
  read stdout as it arrives; otherwise return the whole answer when the process exits (the loading state covers the wait). Say which each CLI does in *Implementation notes*.
- A CLI provider is refused with `403 consent_required` until its id is in `ai_cloud_consent`. The UI asks once (checkbox + button), the server checks every time.
- Passing the user's environment is fine (the CLI needs its own login), but never log arguments, stdin or output.
- Flags **must be verified from `<cli> --help` on this machine for `claude` and `agy`**, and written into a table in `docs/local-ai.md` with the date.
  For `gemini` and `codex` use the documented non-interactive modes (`gemini -p`, `codex exec`), mark them **unverified** in the docs, and make the
  Test button the way to find out. A provider that fails detection or its Test is simply not selectable.

### The chat tab (UI)

- New tab `{ id: "ai", label: "Ask AI" }` added to `judgedTabs` in `apps/web/app/dsa/[id]/page.tsx` **only when** AI is enabled and not hosted
  (same condition as today's panel). Remove the old `<AskAi>` block and delete `ask-ai.tsx`.
- Component `apps/web/app/dsa/ai-chat.tsx` (client). Props: `problemId`, `hints: string[]` (so chips can show the real hint text; hints are not
  secret, they are already on the Hints tab), `providers` (found + labels), `provider`, `hasCode: boolean`.
- Layout (wide, fills the tab panel): header row with the provider name and a small label **"Runs on your computer"** (Ollama) or **"Sends this
  chat to <Claude/Gemini/...>"** (cloud), a **New chat** button, and the **Include my code** switch (off by default for cloud providers,
  on for Ollama; Review always includes it). Message list (user messages right, answers left, answers rendered with the existing code-fence
  splitting, **plain text, never HTML**). A row of **starter chips** above the input: *Explain the question*, *Explain hint 1 ... N* (one chip per hint, each chip
  title shows the hint), *Review my code* (disabled with a tooltip "Save some code in the Notes tab first" when `hasCode` is false), *Explain the solution*
  (confirm text: "This will show the full solution idea and code in the chat."). Below, a multi-line input (Enter sends, Shift+Enter new line), **Send** and **Stop**.
- **Loading:** after sending, immediately add an assistant bubble with an animated three-dot "Thinking..." (`role="status"`, `aria-live="polite"`); after
  8 s add the line "The model may still be loading into memory. The first answer can take up to a minute." Replace the bubble with streamed text on the
  first token. Errors are shown inside the chat as a message with a **Try again** button (reuse the existing error wording for no model / not running).
- **Persistence across tabs:** state lives in this component, which stays mounted. Additionally save the messages to `sessionStorage` under
  `ai-chat:<problemId>` (wrapped in try/catch; the chat must work if storage is unavailable) and load them on mount, so a reload keeps the chat.
  Never use `localStorage` (the chat may contain code). **New chat** clears both.
- Auto-scroll to the newest text only while the user is already at the bottom; show a small "Jump to latest" button otherwise.
- No emoji; icons are inline SVG. Tailwind tokens from `globals.css`. Respect `prefers-reduced-motion` for the dots.

### Settings UI

Extend `apps/web/app/profile/settings/ai-settings.tsx` with an **Answers from** selector (radio list): *This computer (Ollama)* plus each detected tool with
its warning text and Test button. Choosing a cloud tool for the first time shows the consent checkbox; the choice saves through the existing
`api/ai/settings` route (add `provider` and `consent` fields; validate against the known ids).

## Out of scope

- Saving chat history on disk or syncing it; multiple saved chats per problem; images; voice; web search.
- Letting any provider edit files, run code or use tools. (Chat only.)
- API keys: the app never asks for or stores a key for these tools; they use the user's own login on their own computer.
- The hosted site and phones (still no AI, per plan 0060).
- Markdown rendering beyond the existing code-fence splitting.

## Steps

Targeted tests only (`pnpm.cmd exec vitest run <files>`, `pnpm.cmd -r typecheck`, eslint on changed files). The lead runs one `pnpm.cmd check`. No `pnpm desktop:build`.
Local commits with explicit paths; no push, no attribution. Four agents (A, B, C, D) work in the same checkout at the same time; read "Four agents" below first.

## Four agents

| Agent | Steps | Owns (only these files) | Fast check |
|---|---|---|---|
| **A** chat API | 1, 2 | `packages/shared/src/ai-prompts.ts` (+ test), `apps/web/app/api/ai/chat/route.ts` (+ test), `apps/web/lib/ai/context.ts` (+ test) | `pnpm.cmd exec vitest run packages/shared/src/ai-prompts.test.ts apps/web/app/api/ai apps/web/lib/ai/context.test.ts` |
| **B** providers | 3 | `apps/web/lib/ai/providers/**` (+ tests, fake CLI fixture), `docs/local-ai.md` (provider and flags sections) | `pnpm.cmd exec vitest run apps/web/lib/ai/providers` |
| **C** settings | 4, 7 | `apps/web/lib/ui-prefs.ts` (+ test), the sync denylist file (+ test), `apps/web/app/api/ai/{status,settings,test}/route.ts` (+ tests), `apps/web/app/profile/settings/ai-settings.tsx`, `docs/local-ai.md` (a short "Settings" section only) | `pnpm.cmd exec vitest run apps/web/lib/ui-prefs.test.ts apps/web/lib/sync-triggers.test.ts apps/web/app/api/ai` |
| **D** chat UI | 5, 6 | `apps/web/app/dsa/ai-chat.tsx` (+ `ai-chat.test.ts`), `apps/web/app/dsa/[id]/page.tsx` (tab wiring only), delete `apps/web/app/dsa/ask-ai.tsx` | `pnpm.cmd exec vitest run apps/web/app/dsa/ai-chat.test.ts` |

Step 8 (docs finish and the browser check) is the lead's.

**Shared file:** `docs/local-ai.md` is edited by B and C only, with `Edit` on a small unique string after a fresh `Read`; never `Write` the whole file.
**Nobody touches:** `AGENTS.md`, other plans, `lib/ai/{ollama,guard,hardware}.ts` (B may import them, not change them; if a change is truly needed, ask in the report),
problem data, `data/habit.db`, `packages/sync-worker/**`.

**Contracts between agents (code against these; they may not exist yet when you start):**

```ts
// C: apps/web/lib/ui-prefs.ts
export type AiProviderId = "ollama" | "claude" | "agy" | "gemini" | "codex";
export interface AiSettings { enabled: boolean; model: string; url: string; provider: AiProviderId; consent: AiProviderId[] }
export async function getAiSettings(): Promise<AiSettings>;     // provider defaults to "ollama", consent to []

// B: apps/web/lib/ai/providers/index.ts
export interface AiProvider { id: AiProviderId; label: string; cloud: boolean;
  detect(): Promise<{ found: boolean; detail?: string }>;
  chat(messages: ChatMessage[], opts: { signal: AbortSignal; model?: string; url?: string }): AsyncGenerator<string> }
export function getProvider(id: AiProviderId): AiProvider;
export async function detectProviders(): Promise<{ id: AiProviderId; label: string; found: boolean; cloud: boolean }[]>;

// A: POST /api/ai/chat body as in "Chat protocol" above. Success: text stream. Errors: JSON { ok: false, error } with 400 bad_request | no_code | no_model,
// 403 consent_required | disabled | forbidden, 404 unknown_problem | not_found.
// C: POST /api/ai/status returns { ..., providers: { id, label, found, cloud }[], provider: AiProviderId, consent: AiProviderId[] }.
// D: needs from the server page only: hints (string[]), hasCode (boolean), providers (from detectProviders), provider (from getAiSettings).
```

`AiProviderId` and `AiSettings` live in C's file; A and B import the type from `@/lib/ui-prefs`. Until C's first commit exists (`git log --oneline -8`), A and B may declare the same
type locally in a clearly marked `TODO(remove after ui-prefs lands)` line and switch to the import afterwards.

**Order:** C commits the settings keys and `getAiSettings` first (about 15 minutes); B commits `providers/index.ts` with the interface and the Ollama wrapper second; A can start with the pure
prompts (step 1) immediately; D starts with the component against the protocol. If `pnpm.cmd -r typecheck` fails in a file you do not own, another agent is mid-edit: wait two minutes, re-run, do not fix it.

Rules for everyone are the same as in `0066-round-thirteen-weeks-tools-and-local-ai.md` ("Rules for everyone (read twice)" and "Report format"): `pnpm.cmd` on Windows, never run `pnpm test` / `pnpm check` /
`pnpm build`, targeted vitest + typecheck + eslint, copy existing patterns, explicit `git add <paths>`, no emoji, stay in scope, report problems in files you do not own.

## The steps (owner in brackets: A to D, see "Four agents")

- [ ] **1. [A] Prompts.** `packages/shared/src/ai-prompts.ts`: `buildChatMessages` and `starterMessage` (pure), clipping and the message limits as in Design.
  - Done when: `pnpm.cmd exec vitest run packages/shared/src/ai-prompts.test.ts` passes with cases: no reference solution unless `revealSolution`; hint intent
    contains the chosen hint text; code included only for `review` or `includeCode`; more than 20 messages keeps the newest 20; an over-long message is clipped;
    `starterMessage("hint", { hintIndex: 1, hintText: "x" })` contains "hint 2" and "x".
- [ ] **2. [A] Route.** Rewrite `apps/web/app/api/ai/chat/route.ts` and `apps/web/lib/ai/context.ts` to the new body; validate roles and sizes (400 `bad_request`),
  `no_code`, `no_model`, `unknown_problem`, `consent_required`; stream through the selected provider.
  - Done when: route tests (stubbed provider) cover: hosted 404, disabled 403, cross-origin 403, bad role 400, over-long history trimmed, review without code 400,
    reference solution absent from the prompt without `revealSolution` and present with it, cloud provider without consent 403.
- [x] **3. [B] Providers.** `apps/web/lib/ai/providers/*` as in Design: Ollama wrapper, the CLI runner, one file per CLI, `detectProviders()` (3 s timeout each, never throws).
  - Done when: `pnpm.cmd exec vitest run apps/web/lib/ai/providers` passes using a **fake CLI** (a tiny Node script in a temp folder that reads stdin and prints text) to
    prove: prompt arrives on stdin and not in argv, output streams, timeout kills the process, abort kills it, output cap stops it, cwd is a temp folder that is removed,
    `.cmd` path handling is unit-tested as a pure function that builds (file, args). Then, on this machine only, run `claude` and `agy` once each through the runner
    with the prompt "Reply with the single word pong" and record the exact flags that worked in `docs/local-ai.md`.
- [x] **4. [C] Settings and status.** Add `ai_provider` and `ai_cloud_consent` to `lib/ui-prefs.ts` and the sync denylist (+ tests like 0060 step 3b); extend `api/ai/status` to return
  `providers: [{ id, label, found, cloud }]` and `api/ai/settings` to accept `provider` and `consent`; add a `POST /api/ai/test` route that sends "ping" through the chosen provider.
  - Done when: tests show the new keys are not queued for sync and an unknown provider id is rejected.
- [ ] **5. [D] Chat component.** `apps/web/app/dsa/ai-chat.tsx` as in Design (chips, input, loading, stop, errors, jump-to-latest, sessionStorage). Extract the answer renderer (code
  fences) into a small shared piece in the same file.
  - Done when: typecheck and eslint pass; a pure helper test (`ai-chat.test.ts`, for example `trimHistory`, `parseStoredChat`) passes.
- [ ] **6. [D] Wire the tab.** In `apps/web/app/dsa/[id]/page.tsx` add the "Ask AI" tab to `judgedTabs` under the same condition as the old panel, pass the hints, providers, current provider
  and `hasCode`; remove `<AskAi>` and delete `apps/web/app/dsa/ask-ai.tsx`.
  - Done when: Grep finds no `AskAi` / `ask-ai` left; Description, Hints and Notes tabs unchanged.
- [x] **7. [C] Settings UI.** The *Answers from* selector, warnings, consent checkbox and Test button in `ai-settings.tsx`.
  - Done when: typecheck and eslint pass; with only Ollama present the selector shows just that.
- [ ] **8. [lead] Docs and check by hand.** Update `docs/local-ai.md` (chat tab, providers, what leaves the machine for each, the verified flags table, how to remove consent). Then in the
  browser (desktop dev build or `pnpm dev` on a database copy): send a chip, a typed question and a follow-up; switch to Hints and back (chat still there); reload (chat still there);
  press Stop mid-answer; try Claude Code and Antigravity if signed in.
  - Done when: each of those works and any failure is written in *Implementation notes*.

## Acceptance criteria

- [ ] Pressing "Explain hint 2" posts a visible message that quotes hint 2, then an answer appears under it.
- [ ] Between sending and the first word there is a visible "Thinking..." state, and a model-loading note after 8 seconds.
- [ ] You can type your own question and ask follow-ups; earlier messages are used as context.
- [ ] Switching to Description, Hints or Notes and back keeps the chat; a reload of the problem keeps it for the browser session; New chat clears it.
- [ ] Without pressing "Explain the solution", the reference solution is never in the request to any provider (checked by a test).
- [ ] The default provider is Ollama and nothing leaves the computer. A cloud tool works only after the user ticks the consent for it, and the chat header says where the chat goes.
- [ ] The chat can use Claude Code and Antigravity on this machine (Gemini and Codex only if installed), cannot edit files or run commands, and Stop kills the process.
- [ ] The AI settings still do not sync. The hosted site shows no AI. `pnpm.cmd check` passes.

## Pitfalls

- A CLI that can edit files, run commands or read the repo is a security hole: no provider ships without its tools turned off, or it is not offered.
- Never put user text on a command line. Never log prompts, answers or arguments.
- `.cmd` shims on Windows need `cmd.exe`; build the command only from constants and a path you resolved yourself.
- Local models are slow to answer the first time; the loading state must not look like a crash.
- Do not let the chat grow forever: enforce the 20-message and size limits on the server, not only in the browser.
- Keep rendering as plain text and `<pre>`; never `dangerouslySetInnerHTML`.
- `sessionStorage` can be unavailable or full: wrap every access.

## Open questions

## Implementation notes

C: done, steps 4 and 7. Settings keys `ai_provider` and `ai_cloud_consent` plus `getAiSettings` first; both on the sync denylist (denylist test and trigger test cover them). `api/ai/test` takes an optional `{ provider }` (default: the saved one) so Settings can test a tool before choosing it; it is allowed while the switch is off and returns 403 `consent_required` for a cloud tool without consent. Settings UI lists Ollama always and cloud tools only when found; a cloud radio is disabled until its consent box is ticked; unticking the tool in use switches back to Ollama. Route tests are in `api/ai/ai-provider-routes.test.ts` with a mocked providers module.

## Review
