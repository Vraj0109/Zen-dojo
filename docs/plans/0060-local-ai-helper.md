# 0060: Local AI helper (optional, opt-in, desktop only)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** (implementer fills in)
- **Spec:** none
- **Estimate at this project's pace:** one round (4 to 6 hours)

## Goal

If you want it, the desktop app can use an AI model that runs **on your own computer** (through Ollama) to explain a
hint, review your code or explain a solution. It is off until you turn it on. The app looks at your computer's memory
and graphics card and suggests a model size that will actually run. Nothing is ever sent to the internet by this
feature. It does not exist on the hosted site or on phones.

## Context (verified)

- No AI code exists yet. Desktop-only code paths are recognised by the `HABIT_DESKTOP=1` environment variable (used for
  sign-in) and `process.versions.electron`; hosted mode (plan 0058) is `HABIT_HOSTED=1`.
- Settings are key/value rows (`apps/web/lib/ui-prefs.ts`, `settings` table). Settings **sync across devices unless on
  the denylist** (`extension_token`, `content_feed_url`, key names containing token/secret/key/password). AI settings are
  device-specific and must be added to the denylist (find it with Grep for `content_feed_url` in `lib/sync-*.ts`).
- Problem data: statements, hints, solutions in `packages/shared` (`JUDGE_PROBLEMS`, learn content); the user's saved
  code is in `problem_notes`.
- Same-origin checks for POST routes: `checkSameOrigin` in `apps/web/lib/auth/util.ts`.
- LeetCode rule (AGENTS.md) does not apply here; the broader rule does: no credentials, no data leaving the device.

## Design (decided)

- **Engine: Ollama**, which the user installs themselves (we do not bundle it or any model). The app talks to it on
  `http://127.0.0.1:11434` only. A configurable URL is allowed **only if its host is loopback** (`127.0.0.1`, `::1`,
  `localhost`); anything else is rejected.
- **Hardware check** (server side, on demand): total RAM from `node:os`; NVIDIA GPU memory from
  `nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits` run with `execFile` (no shell) and a 3 s
  timeout; Apple Silicon detected from `process.platform === "darwin" && process.arch === "arm64"` (memory is shared with
  the system, so use RAM); anything else is "unknown GPU" and uses RAM-only guidance.
- **Recommendation tiers** live in one data file, `packages/shared/src/ai-models.ts`, so they are easy to update:
  e.g. `{ minGb: 4, model: "llama3.2:3b" }`, `{ minGb: 8, model: "qwen2.5-coder:7b" }`, `{ minGb: 16, model: ... }`. The
  implementer **verifies each tag exists in Ollama's library at implementation time** and lists the date checked in the
  file comment. The rule: usable memory for a model = GPU memory if there is a discrete GPU, else about 60% of RAM
  (leave room for the app and the OS); pick the largest tier that fits; always allow "smaller is fine".
- **Opt-in flow:** Settings > "Local AI (optional)": hardware summary, a recommendation, a link to ollama.com/download
  (opened in the system browser), status "Ollama is running / not found", an Enable switch (`ai_enabled`, default `0`),
  a model picker with a Download button that streams progress (`POST /api/pull`), and a Remove-from-app switch.
- **Where it appears:** on a problem page, in the notes/tools area, a collapsed "Ask local AI" panel with three
  buttons: **Explain this hint**, **Review my code**, **Explain the solution**. The default never reveals the full
  solution: "Review my code" and hints are Socratic by prompt; "Explain the solution" is an explicit button. Answers
  stream into the panel; there is a Stop button; the panel is plain text with code blocks, no markdown injection of HTML.
- **Prompts** live in `packages/shared/src/ai-prompts.ts` as pure functions that build the messages from the problem
  statement, chosen hint and the user's code, truncated to a safe length (for example 6,000 characters of code and
  4,000 of statement) so small models are not flooded.
- **Privacy:** only the problem text and the user's own code go to the local Ollama. No logging of prompts or answers,
  no telemetry, no network call except to the loopback Ollama.

## Out of scope

- Bundling Ollama or model files in the installer; running models inside the app (llama.cpp binding); cloud AI
  providers or API keys; fine-tuning; chat history storage; AI on the hosted site or on phones; AI-written solutions
  that auto-submit.

## Steps

Targeted tests only (`pnpm exec vitest run <file>`, `pnpm -r typecheck`, eslint on changed files). The lead runs one
`pnpm check`. No `pnpm desktop:build`. Local commits, explicit paths, no push, no attribution.

- [ ] **1. Pure data and prompts.** `packages/shared/src/ai-models.ts` (`Hardware`, `MODEL_TIERS`,
  `usableGb(hw)`, `recommendModel(hw)`) and `packages/shared/src/ai-prompts.ts` (`buildHintPrompt`, `buildReviewPrompt`,
  `buildSolutionPrompt`, `clip`). Export from the package index.
  - Done when: `pnpm exec vitest run packages/shared/src/ai-models.test.ts packages/shared/src/ai-prompts.test.ts`
    passes: 4 GB RAM gets the smallest tier, 16 GB RAM no GPU gets a mid tier, a 24 GB GPU gets the largest, unknown
    hardware gets the smallest, prompts are clipped, review prompt never contains the reference solution.
- [ ] **2. Hardware detection** `apps/web/lib/ai/hardware.ts` (server-only): `detectHardware()` plus a pure
  `parseNvidiaSmi(stdout)`.
  - Done when: tests parse a one-GPU, a two-GPU (use the largest) and a garbage output; detection never throws.
- [ ] **3. Ollama client** `apps/web/lib/ai/ollama.ts`: `assertLoopback(url)`, `status()` (GET `/api/version`),
  `listModels()` (GET `/api/tags`), `pullModel(name)` (POST `/api/pull`, stream of JSON lines), `chat(messages, signal)`
  (POST `/api/chat`, stream). Timeouts, a 2 MB response cap for non-stream calls, model names validated against
  `^[a-zA-Z0-9._:/-]{1,100}$`.
  - Done when: tests with a stubbed `fetch` cover status ok and down, loopback check (rejects `http://example.com`,
    accepts `http://localhost:11434`), bad model name, stream parsing, abort.
- [ ] **3b. Settings keys.** Add `ai_enabled`, `ai_model`, `ai_ollama_url` to `lib/ui-prefs.ts` getters/setters and to the
  sync denylist (they must **not** sync).
  - Done when: a test shows a changed `ai_enabled` is not queued for sync (see how the existing denylist test works).
- [ ] **4. Routes** `apps/web/app/api/ai/{status,pull,chat}/route.ts`: same-origin only, JSON/stream, return 404 unless
  `process.env.HABIT_DESKTOP === "1"` or the app is local (not hosted), and 403 unless `ai_enabled === "1"` (except
  `status`, which works so Settings can show the hardware and install hint). No stack traces, never log bodies.
  - Done when: route tests cover hosted (404), disabled (403), cross-origin (403), ok path with the stub.
- [ ] **5. Settings UI** `apps/web/app/profile/settings/ai-settings.tsx` (client) plus the section in
  `settings/page.tsx`: hardware summary, recommendation text ("Your computer has 16 GB of memory and no dedicated graphics
  card; a 7B model will run, slowly on long answers"), Ollama status with Check again, the Enable switch, model picker,
  Download with a progress bar and Cancel.
  - Done when: typecheck and eslint pass; with Ollama stopped the section shows install steps and no error; with
    the switch off nothing else in the app shows AI.
- [ ] **6. Problem page panel** `apps/web/app/dsa/ask-ai.tsx` (client, collapsed by default) wired into
  `apps/web/app/dsa/[id]/page.tsx` only when AI is enabled and not hosted and not reader mode (plan 0059 if present).
  Streams from `/api/ai/chat`, Stop button, copy button, "Runs on your computer" label.
  - Done when: with Ollama running and a small model pulled, "Explain this hint" streams an answer and Stop ends it.
- [ ] **7. Docs** `docs/local-ai.md`: what it is, what leaves the machine (nothing), how to install Ollama, memory
  guidance, how to remove models (`ollama rm`), and a note that answers can be wrong.
  - Done when: linked from Settings.

## Acceptance criteria

- [ ] Default install: no AI UI anywhere, no network calls to port 11434.
- [ ] Settings shows your memory/GPU and a sensible model suggestion, and whether Ollama is running.
- [ ] After enabling and downloading a model, a problem page can explain a hint and review your code, streaming, with Stop.
- [ ] The hosted site and reader mode never show or serve AI (routes return 404/403).
- [ ] The AI settings do not sync to other devices.
- [ ] `pnpm check` passes.

## Pitfalls

- Local models are weak and sometimes confidently wrong; the panel says so.
- Never `exec` a string; `execFile` with fixed arguments only. Never accept a non-loopback Ollama URL.
- Do not fetch model lists from the internet; only the user's own Ollama is contacted.
- `nvidia-smi` may be missing; that is normal, not an error.

## Open questions

## Implementation notes

## Review
