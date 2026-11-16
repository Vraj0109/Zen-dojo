# 0082: Run any GGUF model through Ollama; remove LM Studio

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-16
- **Implemented by:** Claude Code (subagent), 2026-11-16
- **Spec:** none

## Goal

LM Studio is no longer a provider. Instead, the desktop app finds GGUF model files on this computer, lists them in
Settings > Local AI, and adds any of them to Ollama with one click. After that, the model shows in the normal Ollama
model picker like any downloaded model. One local engine (Ollama), any GGUF file.

## Context

- Plan 0078 added the `lmstudio` provider: `apps/web/lib/ai/providers/lmstudio.ts`, `lib/ai/openai-local.ts`,
  `lib/ai/active.ts`, settings keys `ai_lmstudio_url` / `ai_lmstudio_model` in `lib/ui-prefs.ts` (`AI_PROVIDER_IDS`),
  routes under `app/api/ai/*`, UI in `app/profile/settings/ai-settings.tsx`, `app/dsa/ai-chat.tsx`,
  `packages/shared/src/ai-install.ts` (`lmstudio` item), docs `docs/local-ai.md`, FAQ entries in `lib/faq.ts`.
- Keep from 0078: `ai_fold_system` ("My model ignores the app's instructions") and `foldSystemIntoUser` in
  `packages/shared/src/ai-prompts.ts`. They are needed for fine-tuned models in Ollama too.
- Ollama client: `apps/web/lib/ai/ollama.ts` (`assertLoopback`, `listModels`, `pullModel`, `jsonLines`). Ollama's HTTP
  API can create a model from a GGUF: upload the file as a blob (`POST /api/blobs/sha256:<digest>`, body = file bytes;
  `HEAD` first to skip when present), then `POST /api/create` with `{ model, files: { "<file name>": "sha256:<digest>" } }`,
  which streams JSON progress lines. Check the exact request shape against the installed Ollama docs
  (https://github.com/ollama/ollama/blob/main/docs/api.md, "Create a Model" and "Push a Blob") before coding.
- The judge and AI features already run only on the desktop for local engines (`isHosted()` in `lib/hosted.ts`).
- Settings keys holding paths must be in `SYNC_SETTINGS_DENYLIST` (`lib/sync-triggers.ts`): they are per device.

## Out of scope

- Downloading GGUF files from the internet (Hugging Face etc.). Users bring files; Ollama's own `pull` stays as is.
- LoRA adapters, multimodal projector files (`mmproj-*.gguf`): skip them in the list (see step 3).
- Any change on the hosted site: this section stays desktop only.

## Steps

- [x] **1. Remove LM Studio.** Delete `lib/ai/providers/lmstudio.ts`, `lib/ai/openai-local.ts` (and its test) and
  `app/api/ai/lmstudio-routes.test.ts`; drop `lmstudio` from `AI_PROVIDER_IDS`, the provider registry, `LOCAL_PROVIDERS`
  sets, labels, `ai-install.ts`, routes and `active.ts` (fold `active.ts` away if it only chose between Ollama and LM
  Studio). Remove `ai_lmstudio_url` / `ai_lmstudio_model` reads and writes. A saved `ai_provider = "lmstudio"` reads as
  `"ollama"` (test it). Keep the two keys in the denylist so old rows never upload. Remove LM Studio wording from
  `docs/local-ai.md`, the FAQ (`lib/faq.ts`, then `pnpm faq:build`) and the settings UI.
  - Done when: `grep -ri "lm ?studio\|lmstudio" apps/web packages/shared docs/local-ai.md docs/faq.md` finds only the
    denylist entries, the legacy-provider test, and the folder name in step 3.

- [x] **2. Settings: GGUF folders.** New setting `ai_gguf_folders` (JSON array of absolute paths, max 10), denylisted.
  Default when unset: the LM Studio models folder if it exists (`%USERPROFILE%\.lmstudio\models`, macOS/Linux
  `~/.lmstudio/models`) and `<app data>/models` (the desktop sets `HABIT_TOOLS_DIR`; use its sibling `models`, create
  it on first use). UI lets the user add a folder by typing a path and remove one. Paths must be absolute and exist.
  - Done when: folders can be added and removed and survive a restart.

- [x] **3. Find GGUF files.** `apps/web/lib/ai/gguf.ts` (`import "server-only"`): `findGgufFiles(folders)` walks each
  folder (depth limit 4, max 500 files, no symlink following) and returns `{ path, name, sizeBytes }` for `*.gguf`,
  skipping names starting with `mmproj` and files under 50 MB (adapters). `suggestModelName(fileName)`: lowercase,
  letters/digits/`.-_`, drop the `.gguf` extension and a trailing quant tag only if the result stays unique, max 60 chars,
  must pass `validModelName`. Also read the first bytes to confirm the `GGUF` magic; list a file without it as
  "not a GGUF file" and do not offer import.
  - Done when: unit tests cover depth, skips, magic check and name suggestions.

- [x] **4. Import into Ollama.** In `ollama.ts` add `importGguf(path, name, base, signal)` (async generator of
  progress): compute the file's sha256 by streaming (report progress by bytes), `HEAD` the blob, upload it streamed if
  missing, then `POST /api/create` and yield its progress lines. Loopback only (`assertLoopback`). Never read a path that
  was not returned by `findGgufFiles` for the saved folders (the route looks it up by path in a fresh scan). New route
  `app/api/ai/import/route.ts` (POST `{ path, name }`, desktop only, 404 on hosted) streaming progress as JSON lines,
  same style as `app/api/ai/pull`. A name that already exists in `ollama list` needs `overwrite: true`.
  - Done when: importing a real GGUF makes it appear in `listModels`.

- [x] **5. UI.** In `ai-settings.tsx`, under the Ollama section, a block "Model files on this computer": the folders,
  then a table of found files (name, size, folder, status `Added` when `ollama list` has the suggested or recorded
  name, else an editable name field and **Add to Ollama**). Progress bar while hashing/uploading/creating, Cancel
  button, plain error text (Ollama not running, unsupported model architecture: show Ollama's message). After success
  the model is selectable in the existing picker and a "Use this model" button selects it. Remember which file became
  which model name in `ai_gguf_imports` (JSON map path -> name, denylisted) so the status survives renames. Keep the
  "My model ignores the app's instructions" switch next to the model picker. Wide layout, no emoji.
  - Done when: the full flow works by hand on the desktop with a small GGUF.

- [x] **6. Docs.** `docs/local-ai.md`: replace the LM Studio section with "Use any GGUF file" (put files in a listed
  folder or add the folder, click Add to Ollama, pick it; disk note: Ollama keeps its own copy, so the original can be
  deleted after). FAQ entry "How do I use a GGUF file or my own fine-tuned model?". Never name a specific model or
  project.
  - Done when: both read correctly.

- [x] **7. Tests.** `lib/ai/gguf.test.ts` (temp folders), `lib/ai/ollama.test.ts` (stubbed fetch: blob exists, blob
  upload, create progress, error line), `app/api/ai/import` route test (hosted 404, unknown path refused, overwrite
  rule), settings tests for the new keys and the legacy `lmstudio` provider, denylist test updated.
  - Done when: they pass with `pnpm exec vitest run <file>`.

## Acceptance criteria

- [x] No LM Studio option anywhere in the app or docs.
- [x] Settings lists GGUF files from the LM Studio folder and the app's models folder, and from added folders.
- [ ] Add to Ollama imports a file with progress and Cancel; the model then shows as Installed and can be used in chat.
- [x] Projector and adapter files are not offered; non-GGUF files are refused.
- [x] Nothing here runs on the hosted site.
- [ ] `pnpm check` passes.

## Open questions

## Implementation notes

- Ollama API checked against docs/api.md on 2026-11-16: `HEAD /api/blobs/sha256:<hex>` (200 present, 404 missing),
  `POST /api/blobs/sha256:<hex>` with the file as body (201), `POST /api/create` with `{ model, files: { "<file name>": digest } }`
  streaming `{status}` lines (and `{error}` on failure). Matches the plan.
- Step 1: deleted `lib/ai/providers/lmstudio.ts`, `lib/ai/openai-local.ts` (+ test), `app/api/ai/lmstudio-routes.test.ts`
  and the LM Studio provider tests. `active.ts` kept with only `prepareMessages`; `activeModel`/`activeUrl` removed and the
  chat, buddy and test routes use `s.model` / `s.url`. `AI_PROVIDER_IDS` no longer has `lmstudio`, so a saved
  `ai_provider = "lmstudio"` reads as `ollama` (test in `ui-prefs.test.ts`). `ai-install.ts` LM Studio item removed.
  The two old keys stay in `SYNC_SETTINGS_DENYLIST`.
- Step 2: `ai_gguf_folders` / `ai_gguf_imports` in `ui-prefs.ts` (`getGgufFolders` returns null when never saved, so
  defaults apply; `setGgufFolders`, `getGgufImports`, `recordGgufImport`), both denylisted. Defaults in
  `gguf.ts` `defaultGgufFolders()`. Folder add/remove goes through a new route `app/api/ai/gguf/route.ts` (POST `{}` lists,
  `{ folders }` saves then lists; absolute existing folders only, max 10; works with the switch off; 404 hosted).
  Note: the existing sync triggers bake the denylist into SQL at migration time, so on a database already linked the new
  keys could still be queued in `sync_dirty`; `sync-engine.ts` filters with `isSyncableSettingKey` before upload, so they do
  not leave the device (same situation as the 0078 keys).
- Step 3: `findGgufFiles(folders, { minBytes })` - `minBytes` (default 50 MB) is an addition so tests and the route test can
  use tiny fake files. Each result also has `folder` (the root folder) and `isGguf` (magic check). `suggestModelName(fileName,
  others)` takes the other file names to decide whether dropping the quant tag stays unique.
- Step 4: `importGguf` yields `{stage: "hashing"|"uploading", completed, total}`, `{stage: "creating", status}`, `{stage: "done"}`.
  Errors carry Ollama's message ("Ollama: ..."). The import route needs the AI switch on (same as `/api/ai/pull`), refuses
  paths not in a fresh scan (404 `unknown_file`), non-GGUF files (400 `not_gguf`), and existing names without
  `overwrite: true` (409 `name_taken`, checks `name` and `name:latest`). It records the import in `ai_gguf_imports` on success
  and streams `{error}` lines instead of a text note.
- Step 5: UI in a new client component `app/profile/settings/gguf-files.tsx`, rendered under the Ollama model picker in
  `ai-settings.tsx` (the fold switch stays next to the picker). A "Replace it" box appears when the typed name already exists.
- Step 6: docs/local-ai.md "Use any GGUF file" + "A model that ignores the app's instructions"; FAQ entry `ai-own-model`
  reworded to "How do I use a GGUF file or my own fine-tuned model?", `ai-lmstudio` removed; `pnpm faq:build` run.
- Step 7 tests: `lib/ai/gguf.test.ts`, `lib/ai/ollama.test.ts` (importGguf), `app/api/ai/import-routes.test.ts` (both new
  routes), `lib/ui-prefs.test.ts`, sync denylist tests. Ran targeted: ui-prefs, lib/ai/*, app/api/ai/*, sync-triggers,
  sync-setting-keys, sync-e2e, ai-install, faq: 22 files, 183 tests pass. `pnpm -r typecheck` passes; eslint on touched
  folders clean. `pnpm check` not run (lead runs it).
- Not tested by hand: a real import with Ollama running (step 4/5 "Done when"), Cancel mid-upload, and the defaults on the
  packaged desktop app.

## Review
