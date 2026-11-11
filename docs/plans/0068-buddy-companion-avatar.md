# 0068: Buddy companion avatar (draggable, animated, optional AI lines) plus backlog cleanup (four agents)

- **Status:** ready
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** (agents fill in their line under *Implementation notes*)
- **Spec:** builds on `0035-adhd-accountability-and-pacing.md` (the Buddy) and `0067-ai-chat-tab-and-providers.md` (AI providers)
- **Estimate at this project's pace:** one round with four Claude agents (about 2 hours). Testing is deliberately minimal (see "Testing").

## Goal

The Buddy widget ("Co-work with Buddy", fixed bottom-right) sits on top of the new "Ask AI" button. Replace it with a small **companion avatar**:

- An animated character with four moods: **idle**, **thinking** (while an AI answer is being written), **sleeping** (no activity for a while) and **excited** (tests pass, session done).
- It **says something now and then** (a speech bubble that fades): short encouraging lines from a built-in set per tone (Sensei / Study Buddy / Coach, already in Settings). No AI needed.
- Optional **AI lines**: if the user turns it on (and AI is enabled in Settings), the Buddy asks the chosen AI provider for a fresh one-liner instead of picking a built-in one. It falls back silently to a built-in line on any failure. Only the event name, tone and the buddy's name are sent, never code, problem text or personal data.
- **Drag to move** it anywhere on screen; the position is remembered. Default: bottom-left, so it no longer covers Ask AI.
- **Import your own avatar** (an image file) or pick one of four built-in avatars.
- Clicking the avatar opens the existing co-work session panel (intent, sprint, reflection), anchored next to it.

Plus a small slice of the backlog: fix two flaky tests, build the missing `/admin/study` page (the admin menu links to it and it is a 404), and correct two stale tables in old plans.

## Context (verified 2026-11-11)

- `apps/web/app/buddy-session.tsx` (286 lines, client): the whole widget. State in `localStorage["habit-buddy-session"]` (`idle | intent | active | reflection`), four `fixed bottom-4 right-4 z-40` containers (lines 121, 138, 204, 243). Mounted from `apps/web/app/layout.tsx` (`BuddySessionLoader`, lines 57-60) with `BuddySettings` from `getBuddySettings()`.
- `packages/shared/src/buddy.ts`: `BuddyTone` (`calm | peer | coach`), `BuddyMode`, `BuddySettings { mode, name, pacing }`, line functions `getStartCheckIn`, `getMidSessionNudge`, `getPostSessionCelebration`, `getPacingConfig`. Settings keys `buddy_mode`, `buddy_name` (`lib/ui-prefs.ts`, they sync). Settings UI: `BuddySettingsSection` in `apps/web/app/profile/settings/page.tsx` (~line 256).
- The Ask AI floating button on course pages is `apps/web/app/study/[area]/[id]/lesson-ai.tsx` (bottom-right, `z-30`). The problem chat is `apps/web/app/dsa/ai-chat.tsx`.
- AI plumbing to reuse: `apps/web/lib/ai/guard.ts` (`guardAi`, `aiError`, `textStream`), `apps/web/lib/ai/providers/index.ts` (`getProvider(id).chat(messages, {signal})`), `getAiSettings()` (`enabled`, `provider`, `consent`, `model`, `url`). Cloud providers need consent; the route must enforce it like `api/ai/chat/route.ts`.
- Per-device preferences that must not sync live in `localStorage` (the app already does this for the buddy session). Wrap every access in try/catch.
- `/admin` pages: `apps/web/app/admin/{layout.tsx,page.tsx,problems/page.tsx}`; `layout.tsx` line 16 links `/admin/study`, which does not exist. Study data: `ALL_CONCEPTS`, `ALL_EXERCISES`, `LESSONS`, `LESSON_EXTRA`, `WALKTHROUGHS`, `LLD_GUIDES`, `STUDY_AREAS` from `@habit/shared`; `lessonSource(id)` in `apps/web/lib/ai/lesson.ts`.
- Known flaky tests: `apps/web/lib/sync-triggers.test.ts` "stamps use millisecond wall-clock time" (fails about 7 ms over its margin on some runs); `apps/web/lib/judge/judge-tle.test.ts` "terminates an infinite loop in C++ ..." (20 s timeout under machine load).
- Conventions: `AGENTS.md` and `docs/plans/0066-...md` "Rules for everyone (read twice)" and "Report format" apply to every agent. No emoji in UI (inline SVG). Tailwind tokens. `prefers-reduced-motion` must turn animations off.

## Who does what (zero file overlap)

| Agent | Work | Owns (only these files) | Fast check |
|---|---|---|---|
| **A** companion | Avatar component, mood state machine, drag, position, prefs store, event bus, speech bubble, session panel anchoring | new `apps/web/app/buddy/{avatar.tsx,buddy-companion.tsx,buddy-prefs.ts,buddy-events.ts,use-drag.ts}` (+ `buddy-prefs.test.ts`), `packages/shared/src/buddy-mood.ts` (+ test), `apps/web/app/buddy-session.tsx`, `apps/web/app/layout.tsx` (mount only), `packages/shared/src/index.ts` (one export line) | `pnpm.cmd exec vitest run packages/shared/src/buddy-mood.test.ts apps/web/app/buddy` |
| **B** lines + AI | Built-in line bank, picker, AI line route and client helper | `packages/shared/src/buddy-lines.ts` (+ test), `apps/web/lib/ai/buddy.ts` (+ test), `apps/web/app/api/ai/buddy/route.ts` (+ test), `apps/web/app/buddy/ai-line.ts`, `packages/shared/src/index.ts` (one export line) | `pnpm.cmd exec vitest run packages/shared/src/buddy-lines.test.ts apps/web/lib/ai/buddy.test.ts apps/web/app/api/ai/buddy` |
| **C** settings + import | Appearance settings (avatar gallery, import, frequency, AI lines, size, reset) and the image import validator | new `apps/web/app/profile/settings/buddy-appearance.tsx`, `apps/web/app/buddy/import-avatar.ts` (+ test), `apps/web/app/profile/settings/page.tsx` (mount one component inside `BuddySettingsSection`) | `pnpm.cmd exec vitest run apps/web/app/buddy/import-avatar.test.ts` |
| **D** wiring + backlog | Emit buddy events from the app, fix flaky tests, `/admin/study`, plan table fixes | `apps/web/app/judge-workspace.tsx` (one emit), `apps/web/app/dsa/ai-chat.tsx` (emit while an answer is pending), `apps/web/app/study/[area]/[id]/lesson-ai.tsx` (none unless needed), `apps/web/lib/sync-triggers.test.ts`, `apps/web/lib/judge/judge-tle.test.ts`, new `apps/web/app/admin/study/page.tsx`, `docs/plans/0063-*.md` and `docs/plans/0065-*.md` (group table counts only) | typecheck + the two fixed test files |

**Shared file** `packages/shared/src/index.ts`: A adds `export * from "./buddy-mood";`, B adds `export * from "./buddy-lines";`. `Read` it right before and `Edit` one line; never `Write` it.
**Nobody touches:** `AGENTS.md`, other plans, `lib/ui-prefs.ts`, the AI provider files, problem data, `data/habit.db`, the sync worker.

## Fixed contracts (code against these; the files may not exist yet)

```ts
// packages/shared/src/buddy-mood.ts (A)
export type BuddyMood = "idle" | "thinking" | "sleeping" | "excited";
export type BuddyEventType =
  | "solved" | "ai-start" | "ai-end" | "session-start" | "session-end" | "activity" | "tick" | "break-due";
export const SLEEP_AFTER_MS = 5 * 60_000;      // no activity for 5 minutes
export const EXCITED_FOR_MS = 6_000;
export function nextMood(current: BuddyMood, event: BuddyEventType, ctx: { now: number; lastActivity: number; excitedUntil: number; aiBusy: boolean }): BuddyMood;
// rules: ai-start => thinking (aiBusy true); ai-end => idle (or excited if excitedUntil in the future); solved/session-end => excited;
// activity => idle (wakes from sleeping); tick => sleeping if now - lastActivity >= SLEEP_AFTER_MS and not thinking; excited decays to idle after EXCITED_FOR_MS.

// apps/web/app/buddy/buddy-events.ts (A)
export function emitBuddy(type: BuddyEventType, detail?: { text?: string }): void;                 // window.dispatchEvent(new CustomEvent("buddy:event", ...)); no-op on the server
export function onBuddy(handler: (type: BuddyEventType, detail?: { text?: string }) => void): () => void;

// apps/web/app/buddy/avatar.tsx (A) - used by A's companion and C's settings preview
export type AvatarId = "fox" | "robot" | "cat" | "blob" | "custom";
export const BUILTIN_AVATARS: { id: Exclude<AvatarId, "custom">; label: string }[];
export function BuddyAvatar(props: { id: AvatarId; mood: BuddyMood; size: number; customSrc?: string }): JSX.Element; // inline SVG for built-ins; <img> for custom

// apps/web/app/buddy/buddy-prefs.ts (A) - localStorage "habit-buddy-prefs", every access in try/catch
export interface BuddyPrefs {
  avatar: AvatarId; customSrc?: string;            // data URL of the imported image
  size: "s" | "m" | "l";                           // 48 / 64 / 88 px
  frequency: "off" | "rare" | "normal";            // how often it talks by itself: never / about every 12 min / about every 5 min
  aiLines: boolean;                                // default false
  pos?: { x: number; y: number };                  // px from the top-left of the viewport; undefined = default bottom-left
}
export const DEFAULT_BUDDY_PREFS: BuddyPrefs;
export function readBuddyPrefs(): BuddyPrefs;
export function writeBuddyPrefs(patch: Partial<BuddyPrefs>): BuddyPrefs;   // merges, stores, dispatches window event "buddy:prefs"
export function resetBuddyPosition(): void;
export function onBuddyPrefs(handler: (p: BuddyPrefs) => void): () => void;

// packages/shared/src/buddy-lines.ts (B)
export type BuddyLineEvent = "idle-chatter" | "welcome" | "solved" | "ai-done" | "session-start" | "session-end" | "break-due" | "late-night" | "streak";
export function pickLine(tone: BuddyTone, event: BuddyLineEvent, seed: number, name?: string): string;   // pure, deterministic for a seed, never empty, at most 140 characters
export function eventToLine(type: BuddyEventType): BuddyLineEvent | null;

// apps/web/app/buddy/ai-line.ts (B)
export async function fetchAiLine(event: BuddyLineEvent, tone: BuddyTone, name: string, signal?: AbortSignal): Promise<string | null>; // POST /api/ai/buddy; null on any failure or after 25 s
// POST /api/ai/buddy  body { event, tone, name } -> 200 { line: string } | { ok:false, error } (403 disabled/consent_required, 404 hosted, 400 bad_request)
```

## Design details

**A. Companion.** `BuddyCompanion` (client, mounted by `layout.tsx` in place of `BuddySession`, passing the same `settings`; hidden when `settings.mode === "off"`, on print and until hydrated) renders the avatar (`position: fixed`, `z-40`, default bottom-left 16 px from the edges, clamped to the viewport on resize) and owns: the mood (`nextMood` driven by `onBuddy` events, pointer/key activity listeners that call `activity` at most once a second, and a 30-second `tick`), a speech bubble (a small rounded box next to the avatar, `role="status"`, fades after 8 s, one at a time, never while the session panel is open), the timer for "talk by itself" (random delay around the frequency, `Math.random` only inside effects, never during render) that asks B's `fetchAiLine` when `aiLines` is on and `pickLine` otherwise (always `pickLine` first as the immediate fallback if AI does not answer in time), and the drag behaviour (`use-drag.ts`: pointer events with `setPointerCapture`, a 4 px threshold so a click is still a click, clamp to the viewport, save to prefs on release). `buddy-session.tsx` keeps all its logic but its four containers stop being `fixed bottom-4 right-4`: they become a panel positioned next to the avatar (above it if the avatar is in the lower half of the screen, else below; horizontally clamped to the viewport), opened by clicking the avatar and closed by its existing buttons or Escape. The old idle "Co-work with {name}" pill is removed (the avatar replaces it). Built-in avatars are small inline SVGs (fox, robot, cat, blob), each with CSS classes per mood: idle = slow bob and blink, thinking = head tilt and a "..." bubble, sleeping = eyes closed, "z" floats, excited = bounce. All animation is CSS (`@keyframes` in a `<style>` inside the component or classes in `globals.css` if that is the existing pattern), disabled under `prefers-reduced-motion: reduce` (static pose per mood). Keyboard: the avatar is a `button` (Enter opens the panel) and arrow keys move it by 10 px (Shift = 40 px) so it is usable without a mouse. Emit `session-start` / `session-end` from `buddy-session.tsx`.

**B. Lines and AI.** `buddy-lines.ts`: at least 6 lines for every tone x event pair that makes sense (`idle-chatter`, `welcome`, `solved`, `ai-done`, `session-start`, `session-end`, `break-due`, `late-night`, `streak`); `session-start`/`session-end` may reuse the existing functions in `buddy.ts`. Plain, kind, never guilt-based, no emoji, at most 140 characters, the buddy's name may be used but need not be. `pickLine` uses the seed to choose, so tests are stable. `/api/ai/buddy` mirrors `api/ai/chat/route.ts` guards (`guardAi`, consent for cloud providers, hosted 404) but takes only `{ event, tone, name }` (validate: event in the known list, tone in the three tones, name at most 30 characters and stripped of control characters). The prompt (`apps/web/lib/ai/buddy.ts`, pure, tested) is a system message like "You are {name}, a friendly study companion with a {tone} voice. Write one short sentence (under 120 characters) for this moment: {event description}. No emoji, no quotes, no advice about health or medicine." and one user message "Say it."; the answer is trimmed, cut to 140 characters, newlines removed; an empty answer is an error. No problem text, code, or user data in the prompt. Rate limit: at most 1 request per 30 seconds per server process (module-level timestamp); beyond that return 429 `slow_down` (the client then uses a built-in line).

**C. Settings and import.** A client component `buddy-appearance.tsx` placed inside the existing Buddy settings section: gallery of the four built-in avatars (radio cards showing `BuddyAvatar` in idle, with a hover/focus preview cycling moods), "Import your own" (file input, accepts `image/png,image/jpeg,image/gif,image/webp,image/svg+xml`, max 300 KB, preview, Save; "Remove custom avatar"), size (S/M/L), "Talks by itself" (Off / Sometimes / Often), "Use AI for what it says" (checkbox; disabled with the note "Turn on local AI help first" unless AI is enabled; when a cloud provider is selected add the line "This asks {provider} for a short sentence. Only the buddy's name and mood are sent, never your code or notes"), "Reset position". It reads and writes through A's `readBuddyPrefs` / `writeBuddyPrefs` / `resetBuddyPosition`, and gets "AI enabled" and the provider label as props from the server section (the `BuddySettingsSection` already awaits settings; add `getAiSettings()` there only if hosted is not `1`). `import-avatar.ts` is a pure validator: `validateAvatarFile({ type, size, bytesHead })` (allowed types, size cap, magic bytes for png/jpeg/gif/webp, SVG must start with `<svg` or `<?xml` and must not contain `<script`, `onload=`, `onerror=`, `javascript:` or `<foreignObject`), and `fileToDataUrl(file)`. Imported images are only ever shown through an `<img>` (never inlined), which stops scripts in SVG from running. Custom avatars get the same mood animations through CSS transforms on the `<img>`.

**D. Wiring and backlog.** `emitBuddy("solved")` in `judge-workspace.tsx` when a run finishes with every case passing (find the existing place that records the solve, emit once per such run); `emitBuddy("ai-start")` / `emitBuddy("ai-end")` in `ai-chat.tsx` around the existing pending state (use an effect on `pending`; emit `ai-end` also on unmount if still pending). Import `emitBuddy` from `@/app/buddy/buddy-events` (A creates it first; until then code against the contract). Fix the two flaky tests without weakening what they prove (for the sync test widen the allowed margin to a justified value with a comment; for the TLE test give the single test a larger explicit timeout, for example `it(..., 60_000)`). Build `/admin/study` as a read-only page in the same style as `/admin/problems`: for each study area (`STUDY_AREAS`) a table of its concepts and exercises with title, id, section, whether it has a lesson body (`LESSONS`/`WALKTHROUGHS`/`LLD_GUIDES`), the number of deeper sections (`LESSON_EXTRA`), the length of its lesson text in characters, and a "View" link to `/study/<area>/<id>`; a note that editing is done in Markdown (`docs/content-editing.md`). It must sit behind the same admin gate as the other admin pages (copy how `admin/layout.tsx` does it). Correct the group tables in plans 0063 and 0065 to the real counts (d 163, e 159, f 164).

## Testing (kept small on purpose)

Agents run only the pure-logic tests in the table above plus `pnpm.cmd -r typecheck` and eslint on their changed `apps/web` files. **No browser testing by agents.** The lead runs one `pnpm.cmd check` and one short browser look at the end (drag, mood change, bubble, import, Ask AI no longer covered).

## Steps

- [ ] **A1.** `buddy-mood.ts` + test; `buddy-events.ts`, `buddy-prefs.ts` (+ test), `avatar.tsx` (commit first: C and D need the contracts).
- [ ] **A2.** `buddy-companion.tsx`, `use-drag.ts`; rework `buddy-session.tsx` positioning; mount in `layout.tsx`.
- [x] **B1.** `buddy-lines.ts` + test.
- [x] **B2.** `lib/ai/buddy.ts` + test, `api/ai/buddy/route.ts` + test, `app/buddy/ai-line.ts`.
- [ ] **C1.** `import-avatar.ts` + test.
- [ ] **C2.** `buddy-appearance.tsx` and its mount in the Buddy settings section.
- [ ] **D1.** Emit events (`judge-workspace.tsx`, `ai-chat.tsx`).
- [ ] **D2.** Fix the two flaky tests.
- [ ] **D3.** `/admin/study` page; plan table fixes.
- [ ] **Lead.** `pnpm.cmd check`, one browser look, mark implemented, update `docs/HANDOFF.md` and the plans index.

## Acceptance criteria

- [ ] The Buddy is an avatar, default bottom-left; Ask AI is no longer covered; dragging moves it and the position survives a reload; Settings can reset it.
- [ ] Moods change: thinking while an AI answer is being written, excited after all tests pass, sleeping after 5 idle minutes, idle otherwise; animations stop under reduced motion.
- [ ] It says a built-in line now and then at the chosen frequency (or never when Off). With "AI lines" on and AI enabled it uses the provider; on failure it uses a built-in line. No code or notes are ever sent.
- [ ] Four built-in avatars and an imported image work; invalid or oversized files are refused with a plain message; imported SVG cannot run scripts.
- [ ] Clicking the avatar opens the co-work session panel next to it with all existing behaviour intact.
- [ ] `/admin/study` loads behind the admin gate; the two flaky tests are stable; `pnpm.cmd check` passes.

## Pitfalls

- Do not use `Math.random()` or `Date.now()` during render (lint rule); only inside effects and handlers.
- A drag must not open the panel; a click must not move the avatar (4 px threshold).
- Clamp the saved position when the window shrinks or the avatar size changes, or the avatar can be lost off-screen.
- `localStorage` can be blocked: every read and write in try/catch, and the avatar must still work with defaults.
- Never inline an imported SVG; show it as an image only.
- The AI line request must be cancelled when the component unmounts or a newer line is wanted.

## Open questions

## Implementation notes

- **Agent B:** B1 and B2 done. Line bank has 6 lines per tone and event (162 total), no emoji; `lib/ai/buddy.ts` holds `parseBuddyRequest`, `buildBuddyMessages` and `cleanBuddyLine`; the route returns 429 `slow_down` within 30 s, 502 `empty` or `ai_failed` on a bad answer, and aborts the provider after 25 s. The prompt carries only event, tone and name.

## Review
