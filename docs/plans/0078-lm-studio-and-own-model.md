# 0078: LM Studio (and other local servers) and "use my own fine-tuned model"

- **Status:** done
- **Planned by:** Claude Code, 2026-11-14
- **Implemented by:** Claude Code (implementer agent), 2026-11-15
- **Spec:** `SPEC.md` section 6.6 and the provider table around line 220 (OpenAI-compatible local servers: Ollama, LM Studio, llama.cpp server)
- **Estimate at this project's pace:** one agent, about half a day

## Goal

The desktop app already has a local AI helper (plans 0060, 0067, 0068): Ollama by default, plus four cloud command-line tools
that need consent. This plan adds the missing local half:

1. **LM Studio as an answer source**, and any other server that speaks the OpenAI chat format on this computer
   (llama.cpp `llama-server`, vLLM, LocalAI). Same rules as Ollama: loopback address only, no key, nothing leaves the computer.
2. **Use my own fine-tuned model.** The user trains a model in a separate project and imports it into Ollama
   (`ollama create <name> -f Modelfile`) or LM Studio (GGUF file). Zen Dojo must let them pick it for every AI feature
   (problem chat, lesson chat, Buddy lines, portfolio summary) and must cope with a quirk of such models: they were trained
   **without a system prompt**, so the app's instructions ("guide with questions, do not give the full solution") are silently dropped.
   A new setting sends those instructions inside the first user message instead.

When no local server is running nothing breaks: the AI UI shows the same "not running" help as today.

## Context (verified 2026-11-14)

- Existing AI code, all desktop/local only (`process.env.HABIT_HOSTED !== "1"`):
  - `apps/web/lib/ai/ollama.ts`: loopback-only client (`assertLoopback`, `status`, `listModels`, `jsonLines`, `chat`, `pullModel`, `validModelName`).
  - `apps/web/lib/ai/providers/{index,ollama,cli,cli-provider,claude,gemini,codex,agy}.ts`: `AiProvider` interface
    (`id`, `label`, `cloud`, `detect()`, `chat(messages, {signal, model, url})`), `getProvider`, `detectProviders`.
    `index.ts` still holds a local copy of `AiProviderId` and `AI_PROVIDER_IDS` marked `TODO(remove after ui-prefs lands)`.
  - `apps/web/lib/ui-prefs.ts` lines ~98-165: keys `ai_enabled`, `ai_model`, `ai_ollama_url`, `ai_provider`, `ai_cloud_consent`,
    `AI_PROVIDER_IDS`, `AiProviderId`, `isAiProviderId`, `AiSettings`, `getAiSettings`, `setAiSettings`.
  - `apps/web/lib/sync-triggers.ts:52` `SYNC_SETTINGS_DENYLIST` (AI settings must never sync); tests in `apps/web/lib/sync-triggers.test.ts` (lines ~56 and ~240 list the AI keys).
  - Routes `apps/web/app/api/ai/{status,settings,chat,buddy,test,pull}/route.ts` and their tests (`ai-routes.test.ts`, `ai-provider-routes.test.ts`, `chat/route.test.ts`, `buddy/route.test.ts`).
    `chat`, `buddy` and `test` each pass `model: provider.cloud ? undefined : s.model, url: s.url` to `provider.chat`. `s.url` is the **Ollama** address, so a second local
    provider needs its own address and model; do not reuse `s.url`/`s.model` for it.
  - `apps/web/lib/ai/guard.ts` (`guardAi`, `textStream`, `aiAvailable`), `apps/web/lib/ai/context.ts` (`buildChat`), `apps/web/lib/ai/detect.ts` (`detectProviders` for pages).
  - Messages are built in `packages/shared/src/ai-prompts.ts` (`ChatMessage { role: "system"|"user"|"assistant"; content }`, `buildChatMessages`, `buildLessonChatMessages`,
    `buildBuddyChatMessages`, `buildPortfolioSummaryMessages`); the first message is the system message.
  - UI: `apps/web/app/profile/settings/ai-settings.tsx` (`ProviderId` union, `Info` type, "Answers from" list, model picker that already shows installed Ollama models as
    "Installed: <name>", `InstallMore` driven by `AI_INSTALL`), `apps/web/app/profile/settings/page.tsx` (`PROVIDER_LABEL: Record<AiProviderId, string>`),
    `apps/web/app/dsa/ai-chat.tsx:~180` and `apps/web/app/study/[area]/[id]/lesson-ai.tsx` (decide "cloud" with `info ? info.cloud : provider !== "ollama"`),
    `packages/shared/src/ai-install.ts` (+ `ai-install.test.ts`).
  - Docs: `docs/local-ai.md` ("What leaves your computer: Nothing ... only Ollama on 127.0.0.1:11434"), `docs/faq.md` (AI section near lines 304-392).
- **Ollama already works with a custom model.** After `ollama create <name> -f Modelfile`, the model picker lists it as "Installed: <name>" and
  `Use this model` saves it. No code is needed for that path; this plan only documents it and adds the system-message setting.
- **The system-message quirk.** A custom `Modelfile` may use a `TEMPLATE` without `{{ .System }}`, so Ollama drops the system message.
  LM Studio uses the chat template stored in the GGUF, which for such a model may also lack a system slot. Result: the model ignores "do not reveal the solution" and
  the tone instructions. The setting in step 2 fixes this on the app side. (Adding `{{ .System }}` to the Modelfile is outside this app.)
- **LM Studio facts the implementer must use** (OpenAI-compatible server, default `http://127.0.0.1:1234`, started from LM Studio's Developer tab "Start Server" or `lms server start`):
  `GET /v1/models` returns `{ data: [{ id }] }`; `POST /v1/chat/completions` with `{ model, messages, stream: true }` streams Server-Sent Events: lines `data: {json}`
  with text at `choices[0].delta.content`, ending with `data: [DONE]`. Reasoning models may also send `delta.reasoning_content`: ignore it. Embedding models appear in
  `/v1/models`; hide ids containing `embed` from the picker. **`lms` is installed on this machine** (`C:\Users\bhavn\.lmstudio\bin\lms`), so step 8 can be checked for real.
- Conventions that apply (`AGENTS.md`): server-only code behind `import "server-only"`; settings are key/value rows and device-specific ones go on the sync denylist;
  tests next to the code, `DATABASE_URL=":memory:"`, stub `fetch`; UI uses Tailwind tokens, no emoji, plain language; targeted tests only; never touch `data/habit.db`.

## Design (decided)

- New provider id **`lmstudio`**, label **"LM Studio or another local server"**, `cloud: false`. Treated exactly like Ollama for privacy: no consent step, loopback only,
  404 on the hosted site (the existing `guardAi`/`aiAvailable` already do that).
- New settings (all device-specific, all on the sync denylist):
  - `ai_lmstudio_url`, default `http://127.0.0.1:1234`, must pass `assertLoopback`.
  - `ai_lmstudio_model`, a model id from the server's `/v1/models`. Allowed characters: `^[A-Za-z0-9._:/@+-]{1,120}$` (LM Studio ids can contain `@`, `+`, `_`; the Ollama regex is too strict).
  - `ai_fold_system`, `"1"` or `"0"`, default `"0"`: "My model ignores the app's instructions".
- Two small shared helpers so routes stop hard-coding Ollama's values: `activeModel(settings)` and `activeUrl(settings)` (Ollama fields when provider is `ollama`, LM Studio fields when `lmstudio`),
  and `prepareMessages(messages, settings)` which applies the fold when `foldSystem` is true.
- The pure fold lives in `packages/shared/src/ai-prompts.ts`: `foldSystemIntoUser(messages: ChatMessage[]): ChatMessage[]`. It removes every `system` message and puts their text
  at the start of the first `user` message as `<system text>\n\n---\n\n<original user text>`. No `system` message: return the input unchanged. No `user` message: return unchanged.
  It never mutates its input.

## Out of scope

- Downloading or deleting models from inside Zen Dojo for LM Studio (Ollama's Download button stays as it is; LM Studio models are managed in LM Studio).
- Starting or stopping LM Studio or Ollama from the app. The app only shows the command or the button to press in LM Studio.
- Non-loopback addresses, API keys, or any cloud call. The hosted site and phones (no AI there, per 0060).
- Training or exporting a model (done outside this app), RAG or embeddings, tools/function calling, images, chat history on disk.
- Changing the cloud providers, `byok.ts`, or the sync engine.

## Steps

Targeted tests only: `pnpm exec vitest run <files>` and `pnpm -r typecheck`. On Windows PowerShell use `pnpm.cmd`. Do not run `pnpm test`. Run `pnpm check` once at the end
(it already runs the tests). Do not commit unless the user asks.

- [x] **1. Settings keys.** In `apps/web/lib/ui-prefs.ts`: add `"lmstudio"` to `AI_PROVIDER_IDS`; add constants `AI_LMSTUDIO_URL_KEY = "ai_lmstudio_url"`,
  `AI_LMSTUDIO_MODEL_KEY = "ai_lmstudio_model"`, `AI_FOLD_SYSTEM_KEY = "ai_fold_system"`; extend `AiSettings` with `lmstudioUrl: string`, `lmstudioModel: string`,
  `foldSystem: boolean`; read them in `getAiSettings` (defaults `http://127.0.0.1:1234`, `""`, `false`; an invalid saved model id reads as `""`) and write them in `setAiSettings`
  (validate the model id with the regex in "Design"; cut the URL at 200 characters like the Ollama one). Add the three keys to `SYNC_SETTINGS_DENYLIST` in
  `apps/web/lib/sync-triggers.ts:52`. In `apps/web/lib/ai/providers/index.ts` delete the local `AiProviderId` and `AI_PROVIDER_IDS` copies and the TODO, and import them from `@/lib/ui-prefs`.
  - Done when: `pnpm exec vitest run apps/web/lib/ui-prefs.test.ts apps/web/lib/sync-triggers.test.ts` passes with new cases: defaults, round trip of all three values, a bad model id is not saved,
    and the three new keys are absent from the queued sync settings (extend the two existing lists at `sync-triggers.test.ts` ~56 and ~240).
- [x] **2. Fold helper and active-value helpers.** Add `foldSystemIntoUser` to `packages/shared/src/ai-prompts.ts` (exported from the package index like its neighbours).
  Create `apps/web/lib/ai/active.ts` (no `server-only` needed, pure) exporting `activeModel(s: AiSettings): string`, `activeUrl(s: AiSettings): string` and
  `prepareMessages(messages: ChatMessage[], s: AiSettings): ChatMessage[]` (calls `foldSystemIntoUser` only when `s.foldSystem`).
  - Done when: `pnpm exec vitest run packages/shared/src/ai-prompts.test.ts apps/web/lib/ai/active.test.ts` passes. Cases: fold with one system plus a history of three messages; no system message;
    no user message; the input array is not changed; `activeModel`/`activeUrl` return the Ollama values for `ollama`, the LM Studio values for `lmstudio`; `prepareMessages` is the identity when `foldSystem` is false.
- [x] **3. Local OpenAI-style client.** Create `apps/web/lib/ai/openai-local.ts` (`import "server-only"`). Reuse `assertLoopback` from `./ollama`. Export
  `DEFAULT_LMSTUDIO_URL = "http://127.0.0.1:1234"`, `validLocalModelId(id)` (the regex above), `lmStatus(base)` (GET `/v1/models`, 4 s timeout, response capped at 2 MB like `ollama.ts`,
  returns `{ running: true, models: string[] } | { running: false }`; embedding ids removed), and `lmChat(messages, model, base, signal)` (async generator).
  `lmChat` POSTs `{ model, messages, stream: true }` to `/v1/chat/completions`, parses the SSE stream (lines may be split across chunks; ignore blank lines, comment lines and `data: [DONE]`;
  take only `choices[0].delta.content` strings; skip bad JSON lines), throws a generic `Error` (never including the response body) on a non-2xx status or an `error` object, and stops on `[DONE]`.
  - Done when: `pnpm exec vitest run apps/web/lib/ai/openai-local.test.ts` passes (stubbed `fetch`): status ok with two models and one embedding model, status down, rejects `http://example.com` and
    `http://192.168.1.5:1234`, bad model id, a stream split mid-line, `reasoning_content` ignored, `[DONE]` ends the stream, non-2xx throws, abort stops the generator.
- [x] **4. Provider.** Create `apps/web/lib/ai/providers/lmstudio.ts` exporting `lmstudioProvider: AiProvider` (`id: "lmstudio"`, `label: "LM Studio or another local server"`, `cloud: false`).
  `detect()` returns `{ found: true, detail: "<n> models available" }` when `lmStatus` is running and has at least one model, `{ found: false, detail: "No local server found" }` when it is down,
  and `{ found: false, detail: "Server is running but no model is available" }` when it has none. `chat()` throws `"No model is chosen."` without `opts.model`, otherwise yields from `lmChat`
  with `opts.url ?? DEFAULT_LMSTUDIO_URL`. Register it in `providers/index.ts` (`PROVIDERS` and the id list).
  Note: `detect()` has no way to read the saved URL (its signature takes no settings). Keep it that way and have it probe the default URL **and**, if different, the saved one: read the saved value
  inside `detect()` with `getAiSettings()` (it is server-only already) so a custom port is honoured.
  - Done when: `pnpm exec vitest run apps/web/lib/ai/providers` passes with new cases for detect (found, down, running with no models) and chat (streams, no model throws).
- [x] **5. Routes.** Update the three routes that call `provider.chat`:
  `app/api/ai/chat/route.ts`, `app/api/ai/buddy/route.ts`, `app/api/ai/test/route.ts`. Replace `model: provider.cloud ? undefined : s.model, url: s.url` with
  `model: provider.cloud ? undefined : activeModel(s), url: activeUrl(s)`, wrap the built messages in `prepareMessages(..., s)` for local providers only (cloud tools do not need the fold),
  and change the `no_model` checks to use `activeModel(s)`. In `app/api/ai/status/route.ts` add `lmstudio: await lmStatus(s.lmstudioUrl)` (in the existing `Promise.all`) and return
  `lmstudio`, `lmstudioModel: s.lmstudioModel`, `foldSystem: s.foldSystem`. In `app/api/ai/settings/route.ts` accept `lmstudioUrl` (must pass `assertLoopback`, else 400 `not_loopback`),
  `lmstudioModel` (`""` or `validLocalModelId`, else 400 `bad_model`) and `foldSystem` (boolean, else 400 `bad_request`). `provider: "lmstudio"` is accepted automatically through `isAiProviderId`.
  - Done when: `pnpm exec vitest run apps/web/app/api/ai` passes with new cases: `provider = lmstudio` streams through a stubbed LM Studio; `no_model` when `lmstudioModel` is empty;
    with `foldSystem` on, the stubbed server receives **no** `system` message and the first user message starts with the app's instructions; with it off the system message is unchanged;
    a non-loopback `lmstudioUrl` is a 400; the hosted site still answers 404; `status` includes `lmstudio`; the existing Ollama and cloud cases still pass.
- [x] **6. Settings screen and labels.** In `apps/web/app/profile/settings/ai-settings.tsx`:
  add `"lmstudio"` to `ProviderId`; extend `Info` with `lmstudio?: { running: boolean; models?: string[] }`, `lmstudioModel?: string`, `foldSystem?: boolean`.
  In the "Answers from" list show the LM Studio row **always** (not only when found) with the caption "Runs on your computer. Nothing leaves it." and the text
  "Not running" or "Running, <n> models". When it is the chosen row show: a model `<select>` filled from `lmstudio.models` with a **Use this model** button (saves `lmstudioModel`),
  an address field (placeholder `http://127.0.0.1:1234`, saved with `lmstudioUrl`, shows the server's `not_loopback` error in plain words), and a one-line how-to
  ("In LM Studio open the Developer tab and press Start Server, or run `lms server start`, then press Check again").
  Under the model area of **both** local providers add the checkbox **"My model ignores the app's instructions"** with the help text "Turn this on for a model you fine-tuned yourself without a system
  prompt. The app then puts its instructions at the start of your message instead." (saves `foldSystem`). Add a short note under the model pickers:
  "Your own fine-tuned model: import it into Ollama or LM Studio first (see docs/local-ai.md), then pick it here."
  In `settings/page.tsx` add `lmstudio: "LM Studio or another local server"` to `PROVIDER_LABEL`. In `apps/web/app/dsa/ai-chat.tsx` and `apps/web/app/study/[area]/[id]/lesson-ai.tsx`
  (and anything else found with `Grep` for `provider !== "ollama"`) treat `lmstudio` as local: `const LOCAL = new Set(["ollama","lmstudio"])` and use it in the "cloud" fallback and the label.
  In `packages/shared/src/ai-install.ts` add an `lmstudio` item (`kind: "local-engine"`, `providerId: "lmstudio"`, blurb "Desktop app that runs models on this computer and can serve them on port 1234.",
  `docsUrl: "https://lmstudio.ai"`, install commands per OS taken from LM Studio's own download page or docs, read on the day, date noted in the file header comment;
  `afterInstall: "Download a model in LM Studio, start the local server in the Developer tab, then press Check again."`) and update `ai-install.test.ts`
  (the `providerId` expectation list gains `"lmstudio"`).
  - Done when: `pnpm -r typecheck` and `pnpm exec vitest run packages/shared/src/ai-install.test.ts` pass, eslint is clean on the changed files, and in the running app (step 8) the LM Studio row, picker,
    address field and the checkbox all work.
- [x] **7. Docs.** `docs/local-ai.md`: change "What leaves your computer" to "Ollama or LM Studio on this computer"; add a section **LM Studio or another local server** (start the server, default address,
  pick a model, any OpenAI-compatible server on a loopback address works, no key); add a section **Use your own fine-tuned model** with both paths (Ollama: `ollama create <name> -f Modelfile`, then pick
  "Installed: <name>"; LM Studio: copy the GGUF to `%USERPROFILE%\.lmstudio\models\<publisher>\<model>\`, load it, pick it) that explains the **"My model ignores the app's
  instructions"** setting, why it exists (no system prompt in training). Update the same facts in `docs/faq.md` (AI section, including the
  list of non-synced settings near line 392: add the LM Studio address, model and the fold setting) and, if `apps/web/lib/faq.ts` or the help page text names only Ollama, widen it.
  - Done when: docs mention every new setting name and `pnpm exec vitest run apps/web/lib` still passes (there may be a test that checks the FAQ ids).
- [ ] **8. Real check with LM Studio (lead or implementer, on this machine).** With `lms` installed: start the server (`lms server start`), load any small chat model (`lms ls`, `lms load <id>`),
  run `pnpm dev`, open Settings > AI, turn AI on, choose "LM Studio or another local server", pick the model, press Test, then open a Run-button problem and ask a question in the Ask AI tab.
  Repeat once with the fold checkbox on and confirm the answer still arrives. Write the results (and any LM Studio behaviour that differed from the notes in *Context*) in *Implementation notes*.
  If LM Studio cannot be run, say so there and mark the criteria below as not verified.
  - Done when: the notes list what was seen for each of: server stopped, server running with a model, Stop in the chat, address changed to a non-loopback host (rejected).
- [ ] **9. Final check.** `pnpm check` (once).
  - Done when: it passes. Report any failure as it is.

## Acceptance criteria

- [ ] Settings > AI shows **LM Studio or another local server** next to Ollama. With the server stopped it says "Not running" and shows how to start it; with it running it lists the models.
- [ ] After choosing it and a model, **Test** shows a reply, and the Ask AI tab on a problem, the lesson chat, Buddy lines and the portfolio summary all answer through it.
- [x] Nothing in this feature talks to anything except `127.0.0.1`, `localhost` or `::1`: a non-loopback address is rejected by the settings route (400 `not_loopback`) and by the client. No key is asked for or stored.
- [ ] A model imported into Ollama appears as "Installed: <name>" and can be chosen (verify with any installed model if the fine-tuned one is not available).
- [x] With **"My model ignores the app's instructions"** on, the request sent to the model has no `system` message and the first user message begins with the app's instructions; with it off, requests are unchanged.
- [x] The new settings never sync: they are in the denylist and absent from the queued sync settings.
- [ ] The hosted site and phones still show no local-AI UI and the routes still return 404.
- [x] `docs/local-ai.md` and `docs/faq.md` explain LM Studio and the fine-tuned-model path.
- [ ] `pnpm check` passes.
- [ ] No changes outside the files named above (or listed in *Implementation notes*).

## Pitfalls

- **Do not reuse `s.url` or `s.model` for LM Studio.** They are Ollama's. Every place that calls `provider.chat` must use `activeModel`/`activeUrl` (three routes today; `Grep` for `provider.chat(` to be sure).
- `provider !== "ollama"` is used as a stand-in for "cloud" in two client files. If it is left alone, LM Studio would be labelled "Sends this chat to ..." which is false and alarming.
- `PROVIDER_LABEL: Record<AiProviderId, string>` in `settings/page.tsx` will fail typecheck until `lmstudio` is added: that is the compiler pointing at the label.
- `assertLoopback` error text mentions Ollama. It is never shown to the user (the settings route returns the fixed code `not_loopback`); do not copy its message into the UI.
- Never log request bodies, prompts, answers or model output. Never include a response body in a thrown error.
- The Ollama regex `^[a-zA-Z0-9._:/-]{1,100}$` rejects some LM Studio ids; use the new `validLocalModelId` for LM Studio only and leave Ollama's regex alone.
- A server can be reachable on the page load but have no model loaded; the chat then fails with the existing "The local model stopped" note. Do not add retries or auto-loading.
- No emoji in the UI or docs. Plain, specific language.

## Open questions

(Implementer: write questions here and set the status to `blocked`. Planner: answer below each question.)

## Implementation notes

Implemented 2026-11-15, after plan 0075, on the same worktree branch.

Files changed:

- `apps/web/lib/ui-prefs.ts`: `lmstudio` in `AI_PROVIDER_IDS`; `AI_LMSTUDIO_URL_KEY`, `AI_LMSTUDIO_MODEL_KEY`,
  `AI_FOLD_SYSTEM_KEY`, `AI_LMSTUDIO_DEFAULT_URL`, `LOCAL_MODEL_ID_RE`; `AiSettings` gains `lmstudioUrl`,
  `lmstudioModel`, `foldSystem` (read and written with the validation from *Design*).
- `apps/web/lib/sync-triggers.ts`: the three keys added to `SYNC_SETTINGS_DENYLIST`; `sync-triggers.test.ts` lists
  extended (both places). Also covered by `lib/sync-setting-keys.test.ts` from plan 0075.
- `packages/shared/src/ai-prompts.ts`: `foldSystemIntoUser` (exported through the existing `export *`), tests in
  `ai-prompts.test.ts`.
- `apps/web/lib/ai/active.ts` (+ `active.test.ts`): `activeModel`, `activeUrl`, `prepareMessages`.
- `apps/web/lib/ai/openai-local.ts` (+ `openai-local.test.ts`): `DEFAULT_LMSTUDIO_URL`, `validLocalModelId`,
  `lmStatus`, `lmChat` (SSE parser, `[DONE]`, reasoning ignored, generic errors without bodies, abort).
- `apps/web/lib/ai/providers/lmstudio.ts`, registered in `providers/index.ts`; the local `AiProviderId` /
  `AI_PROVIDER_IDS` copy and the TODO were removed (re-exported from `@/lib/ui-prefs`). `providers.test.ts` extended.
- Routes: `app/api/ai/chat`, `buddy`, `test` use `activeModel`/`activeUrl` and `prepareMessages` (local providers
  only); `status` returns `lmstudio`, `lmstudioModel`, `lmstudioUrl`, `foldSystem`; `settings` accepts and validates
  `lmstudioUrl` (400 `not_loopback`), `lmstudioModel` (400 `bad_model`), `foldSystem` (400 `bad_request`). New test file
  `app/api/ai/lmstudio-routes.test.ts` (real provider, stubbed LM Studio).
- UI: `app/profile/settings/ai-settings.tsx` (LM Studio row always listed with "Not running" / "Running, N models",
  model select + Use this model, address field with a plain not_loopback message, how-to line, Test button, fold
  checkbox and the fine-tuned-model note under both local engines); `app/profile/settings/page.tsx`
  (`PROVIDER_LABEL.lmstudio`, Buddy `cloud` flag treats lmstudio as local); `app/dsa/ai-chat.tsx` (`LOCAL_PROVIDERS`
  set for the cloud fallback and label; `lesson-ai.tsx` reuses `AiChat`, so it needed no change).
- `packages/shared/src/ai-install.ts` (+ test): `lmstudio` item.
- Docs: `docs/local-ai.md` (what leaves the computer, LM Studio section, own fine-tuned model section, Answers from
  list), `apps/web/lib/faq.ts` (new `ai-lmstudio` and `ai-own-model` entries, never-synced list) and regenerated
  `docs/faq.md` (`pnpm faq:build`).

Deviations:

- `test` route: cloud tools now get `model: undefined` (before: the Ollama model was passed to every provider); the
  model and address come from the provider being tested, not only the saved one.
- `status` also returns `lmstudioUrl` so the address field can show the saved value.
- `ai-install.ts`: the LM Studio install commands (`winget install ElementLabs.LMStudio`, `brew install --cask lm-studio`,
  Linux AppImage) were NOT re-read from lmstudio.ai on the day (no web access in this session). The file comment says
  so; check them against the download page before release.
- The chat for a problem, lessons and the portfolio summary all go through `/api/ai/chat` (`lib/ai/context.ts`), so
  the three routes cover every AI feature.

Tests run (targeted): `apps/web/lib/ai`, `apps/web/app/api/ai`, `packages/shared/src/ai-prompts.test.ts`,
`packages/shared/src/ai-install.test.ts`, `apps/web/lib/ui-prefs.test.ts`, `apps/web/lib/sync-triggers.test.ts`,
`apps/web/lib/faq.test.ts`, `apps/web/app/no-emoji.test.ts`: all pass. `pnpm -r typecheck` clean, eslint clean on
the changed files.

Step 8 (real LM Studio check): NOT done. This implementer agent was limited to targeted tests and typecheck and did
not start LM Studio or `pnpm dev`. Not verified: server stopped, server running with a model, Stop in the chat, and the
UI rejection of a non-loopback address in the running app (the route rejection is covered by tests). The lead should do
step 8 and step 9 (`pnpm check`).

Found but not changed:

- `assertLoopback` messages still mention Ollama (never shown to the user, as the plan notes).
- As in plan 0075: denylist changes reach the SQL triggers only on new installs; the engine's push filter covers older
  installs.

## Review

(Reviewer fills in: verdict, numbered fixes if `changes-requested`, suggested commit message when `done`.)
