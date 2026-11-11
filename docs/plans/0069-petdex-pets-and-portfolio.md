# 0069: Petdex pets for the Buddy, pet-voice AI lines, and a Portfolio with certificates (four agents)

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-11
- **Implemented by:** (agents fill in their line under *Implementation notes*)
- **Spec:** extends `0068-buddy-companion-avatar.md`; the public profile part waits on `0058-hosted-web-app.md`
- **Estimate:** one round, four Claude agents (about 2 hours). Testing stays minimal (pure-logic tests, typecheck, lint; the lead runs one `pnpm.cmd check` and a short browser look).

## Goal

1. **Petdex pets.** The user found https://petdex.dev (free animated pets). The Buddy can use any Petdex pet: paste a link such as `https://petdex.dev/pets/shinchan`, or upload the downloaded zip, and the pet appears as the Buddy, animated.
2. **Pet-voice AI lines.** If "AI lines" is on, the bubble text is written in the voice of the selected pet (for Shinchan: the mischievous kindergarten boy from the Crayon Shin-chan anime), using the pet's name and description.
3. **Portfolio.** A profile section showing streaks, total solved problems, course progress and **certificates** for completed courses, printable, shareable as a file, and built so it can become a public page (`/u/<userId>`) when the frontend is deployed.

## Context (verified 2026-11-11 against petdex.dev)

- A pet page `https://petdex.dev/pets/<slug>` contains the direct links `https://assets.petdex.dev/pets/<slug>-<12 hex>/zip.zip` (the pet's package) and `.../sprite.webp` (the sheet). Only one `zip.zip` link per page, and it is the page's own pet. The zip holds `pet.json` (`{ "id", "displayName", "description", "spritesheetPath": "spritesheet.webp" }`) and `spritesheet.webp`.
- The sheet is **1536 x 1872 px: 8 columns x 9 rows, cells 192 x 208**. Row order: `0 idle, 1 running-right, 2 running-left, 3 waving, 4 jumping, 5 failed, 6 waiting, 7 running, 8 review` (Petdex's own labels: idle = neutral breathing loop, waving = greeting, jumping = lift and settle, failed = sad, waiting = patient idle, running = in-place run, review = focused thinking loop). Frame counts per row are not published; typical are `[6, 8, 8, 4, 5, 8, 6, 6, 6]`, so **detect the used frames per row at import** by scanning each cell's alpha and trimming empty trailing cells, with the typical counts as the fallback. The shinchan sheet is a 1.8 MB lossless webp.
- Existing Buddy code from plan 0068: `apps/web/app/buddy/{avatar.tsx,buddy-companion.tsx,buddy-prefs.ts,buddy-events.ts,use-drag.ts,ai-line.ts}`, `packages/shared/src/{buddy-mood.ts,buddy-lines.ts}`, `apps/web/lib/ai/buddy.ts`, `apps/web/app/api/ai/buddy/route.ts`, `apps/web/app/profile/settings/buddy-appearance.tsx`, `apps/web/app/buddy/import-avatar.ts`. `BuddyMood = idle | thinking | sleeping | excited`; prefs in `localStorage["habit-buddy-prefs"]`.
- Stats already computed in `apps/web/lib/progress.ts` and `lib/stats.ts` (XP, streak, best streak, solves, badges, heatmap); study progress in `lib/study.ts` (concepts covered, practice logs); plan state in `lib/tasks.ts` (`plan_finished`); `/profile` page is `apps/web/app/profile/page.tsx`. Courses = study areas `sd`, `lld`, `core` (`STUDY_AREAS`, `ALL_CONCEPTS`, `COVERED_CONFIDENCE` from `@habit/shared`) and DSA patterns.
- Hosted mode (`HABIT_HOSTED=1`) and per-user public data do **not exist yet** (plan 0058 is not built). Do not invent server storage for it.
- Rules for everyone: `docs/plans/0066-round-thirteen-weeks-tools-and-local-ai.md` ("Rules for everyone" and "Report format"), `AGENTS.md`. No emoji (inline SVG), Tailwind tokens, `prefers-reduced-motion` stops animations, no `Math.random`/`Date.now` during render, every `localStorage`/IndexedDB access in try/catch.

## Who does what (zero file overlap)

| Agent | Work | Owns (only these files) | Fast check |
|---|---|---|---|
| **A** pet files | Zip reader, pet package parser, sheet normalising, IndexedDB pet store | new `apps/web/app/buddy/pets/{zip.ts,pet-package.ts,pet-store.ts}` (+ `zip.test.ts`, `pet-package.test.ts`) | `pnpm.cmd exec vitest run apps/web/app/buddy/pets` |
| **B** link import + settings | Petdex link route, link parser, settings UI (paste link, upload, list, select, remove, link to petdex.dev) | new `apps/web/lib/petdex.ts` (+ test), `apps/web/app/api/buddy/petdex/route.ts` (+ test), `apps/web/app/profile/settings/buddy-appearance.tsx` | `pnpm.cmd exec vitest run apps/web/lib/petdex.test.ts apps/web/app/api/buddy` |
| **C** pet animation + voice | Sprite renderer, mood-to-row mapping, companion integration, pet persona in AI lines | new `apps/web/app/buddy/pets/{pet-anim.ts,pet-sprite.tsx}` (+ `pet-anim.test.ts`), `apps/web/app/buddy/{avatar.tsx,buddy-prefs.ts,buddy-companion.tsx,ai-line.ts}`, `apps/web/lib/ai/buddy.ts` (+ test), `apps/web/app/api/ai/buddy/route.ts` (+ test) | `pnpm.cmd exec vitest run apps/web/app/buddy/pets/pet-anim.test.ts apps/web/lib/ai/buddy.test.ts apps/web/app/api/ai/buddy` |
| **D** portfolio | Portfolio data, page, certificates, public-page view, export | new `packages/shared/src/portfolio.ts` (+ test), `apps/web/lib/portfolio.ts`, `apps/web/app/profile/portfolio/page.tsx`, `apps/web/app/profile/certificates/[course]/page.tsx`, `apps/web/app/u/[id]/page.tsx`, `apps/web/app/profile/page.tsx` (one link), `apps/web/lib/ui-prefs.ts` (`profile_name` getter/setter only), `apps/web/app/profile/settings/page.tsx` (name field only), `packages/shared/src/index.ts` (one export line) | `pnpm.cmd exec vitest run packages/shared/src/portfolio.test.ts` |

**Nobody touches:** `AGENTS.md`, other plans, the AI provider files, problem data, `data/habit.db`, the sync worker, `package.json` files (**no new dependencies**).

## Fixed contracts

```ts
// A: apps/web/app/buddy/pets/pet-package.ts
export interface PetPackage { id: string; displayName: string; description: string; sheet: Blob }   // sheet normalised (see below)
export const PET_ROWS = ["idle","running-right","running-left","waving","jumping","failed","waiting","running","review"] as const;
export type PetRow = (typeof PET_ROWS)[number];
export interface PetMeta { id: string; name: string; description: string; cols: number; rows: number; frames: Record<PetRow, number>; cellW: number; cellH: number }
export async function importPetZip(bytes: Uint8Array): Promise<{ pkg: PetPackage; meta: PetMeta }>;   // throws PetImportError with a plain message
export class PetImportError extends Error {}
// zip.ts: export function readZip(bytes: Uint8Array): Promise<Map<string, Uint8Array>>  // stored + deflate entries, via DecompressionStream("deflate-raw"); rejects paths with ".." or absolute, more than 20 entries, any entry over 8 MB, total over 12 MB
// A: apps/web/app/buddy/pets/pet-store.ts  (IndexedDB database "habit-pets", store "pets")
export async function savePet(pkg: PetPackage, meta: PetMeta): Promise<void>;
export async function listPets(): Promise<PetMeta[]>;
export async function loadPetSheetUrl(id: string): Promise<string | null>;   // object URL of the stored sheet; caller revokes
export async function deletePet(id: string): Promise<void>;

// C: apps/web/app/buddy/buddy-prefs.ts - add to BuddyPrefs
//   pet?: { id: string; name: string; description: string }   // selected imported pet; avatar === "pet" means use it
// AvatarId gains "pet". BuddyAvatar({ id: "pet", mood, size, pet: PetMeta, sheetUrl })  (C writes the props)
// C: apps/web/app/buddy/pets/pet-anim.ts (pure)
export function rowForMood(mood: BuddyMood, extra?: { speaking?: boolean; dragging?: "left" | "right" | null }): PetRow;
//   idle->idle, thinking->review, sleeping->waiting, excited->jumping; speaking->waving; dragging left/right -> running-left/right
export function frameDelayMs(row: PetRow): number;   // idle/waiting 180, running 90, jumping 110, waving 130, review 160, failed 140

// B: apps/web/lib/petdex.ts (pure)
export function parsePetdexUrl(input: string): { slug: string; pageUrl: string } | null;  // https://petdex.dev/pets/<slug> (also www., with or without trailing slash/query); anything else null
export function findZipUrl(html: string, slug: string): string | null;                    // https://assets.petdex.dev/pets/<slug>-<hex>/zip.zip
// B: POST /api/buddy/petdex  body { url }  -> 200 application/zip (the pet zip bytes) | { ok:false, error }  (404 hosted, 403 cross-origin, 400 bad_url, 502 not_found|too_big|fetch_failed)

// C: AI persona - POST /api/ai/buddy body gains optional persona: { name: string; description: string }; fetchAiLine(event, tone, name, signal?, persona?)

// D: packages/shared/src/portfolio.ts (pure)
export interface CourseProgress { id: string; title: string; kind: "area" | "pattern" | "plan"; done: number; total: number; completedOn: string | null }
export function isCourseComplete(c: CourseProgress): boolean;       // done >= total and total > 0
export function certificateId(name: string, courseId: string, completedOn: string): string;   // deterministic 12-char uppercase hex hash (no crypto dependency needed; simple 32-bit FNV mix twice is fine)
export interface PortfolioData { name: string; level: number; xp: number; streak: number; bestStreak: number; totalSolved: number; solvedByDifficulty: { easy: number; medium: number; hard: number }; planWeeksDone: number; courses: CourseProgress[]; generatedOn: string }
```

## Design details

**A. Importing a pet file.** `readZip` parses the zip end-of-central-directory and central directory by hand (no library), supports method 0 (stored) and 8 (deflate through `new DecompressionStream("deflate-raw")`), rejects anything else, zip-slip paths, encrypted entries, too many or too large entries. `importPetZip` needs `pet.json` (parse; `id` matches `^[a-z0-9][a-z0-9-]{0,63}$`, `displayName` 1-60 chars, `description` up to 300 chars, control characters stripped) and the file named by `spritesheetPath` (must be a plain file name in the zip, `.webp` or `.png`, magic-byte checked). **Normalise the sheet in the browser:** decode into an `ImageBitmap`, require width divisible by 8 and height by 9 (the 192 x 208 standard; otherwise a plain error "This does not look like a Petdex sheet"), scan each of the 72 cells' alpha (any pixel with alpha > 16) to get used frames per row (fallback to the typical counts if the scan finds none), then redraw at **half size** (cells 96 x 104) on an `OffscreenCanvas`/canvas and re-encode as WebP quality 0.9 (PNG if WebP encoding is unsupported). Target under 600 KB; if still over 2 MB refuse. `PetMeta.cellW/cellH` are the stored cell sizes. IndexedDB store keyed by `id` holds `{ meta, sheet: Blob }`; at most 12 pets (refuse more with a plain message).

**B. Link import and settings.** The route accepts only `parsePetdexUrl` results; fetches the page with `fetch` (timeout 10 s, response cap 3 MB, `redirect: "error"`), `findZipUrl`, then fetches that zip (host must be exactly `assets.petdex.dev`, timeout 30 s, cap 6 MB, no redirects) and streams the bytes back. Same-origin check as the other routes (`checkSameOrigin` in `lib/auth/util.ts`), 404 when `HABIT_HOSTED === "1"`. Never log URLs beyond the slug. Settings (inside `buddy-appearance.tsx`, new "Pets from Petdex" block under the avatar gallery): a short explanation and the link **"Find pets at petdex.dev"** (opens in a new tab, `rel="noopener noreferrer"`); a text box "Paste a Petdex link, for example https://petdex.dev/pets/shinchan" + **Add**; a file input "Or upload a downloaded pet (.zip)" (accept `.zip`, max 6 MB; also accept a loose `spritesheet.webp` + `pet.json`? **no**, zip only); progress and plain errors; a list of imported pets as radio cards (preview via C's `PetSprite`, name, description, **Remove**); selecting one sets `avatar: "pet"` and `pet: { id, name, description }` through `writeBuddyPrefs`; selecting a built-in avatar sets `avatar` back. A small note: "Pets are made by the Petdex community; check each pet's page for its terms. Zen Dojo does not include any pets."

**C. Animation and voice.** `PetSprite({ sheetUrl, meta, row, size })`: a `div` sized `size x (size * cellH / cellW)` with `background-image: url(sheetUrl)`, `background-size: (cols * 100)% (rows * 100)%`, the row chosen by `background-position-y`, and a CSS `@keyframes` using `steps(frames)` on `background-position-x` (generate one keyframe per frame count via inline style `animation: petrow <ms * frames>ms steps(<frames>) infinite` with the end position `-(frames/cols) * 100 / (1 - 1/cols)` handled carefully, or drive the frame index in a `requestAnimationFrame`-free `setInterval` effect; pick whichever is simpler and exact). `image-rendering: auto`. Under `prefers-reduced-motion: reduce` show frame 0 of the row, no animation. `buddy-companion.tsx`: when `prefs.avatar === "pet"` and the pet loads from IndexedDB (`loadPetSheetUrl`), render `PetSprite` instead of the SVG avatars; fall back to the fox if the pet is missing. While the bubble shows, use the `waving` row for 2.5 s; while dragging use `running-left/right` by drag direction; otherwise the mood row. **Persona:** `lib/ai/buddy.ts` builds, when a persona is given, a system message like `You are playing {name}. About you: {description}. Speak the way this character speaks (their well-known personality and manner), in one short sentence of under 120 characters for this moment: {event}. Stay kind and safe for work. No emoji. Do not mention being an AI.` (persona name capped at 60 chars, description at 300, control characters stripped, treated as data). `ai-line.ts` and the route accept `persona`; the companion passes `prefs.pet` when the avatar is a pet. Built-in lines (no AI) stay as they are (the pet speaks in the chosen tone); only AI lines use the persona.

**D. Portfolio.** Data: `getPortfolio()` in `apps/web/lib/portfolio.ts` collects name (`profile_name` setting, default "Learner"), level/xp/streak/best streak (reuse `lib/progress.ts`), total solved and by difficulty (reuse `lib/stats.ts` or `lib/dsa.ts`), plan weeks done (history length from `getPlanPosition()`), and `courses`: one per study area (done = concepts with confidence >= `COVERED_CONFIDENCE`, total = concepts in the area, `completedOn` = latest `coveredOn` among them when complete), one per DSA pattern that has at least one problem (done = solved problems of the pattern, total = its problems, `completedOn` = latest solve date when complete), and the 16-week plan (`kind: "plan"`, done = plan weeks done, total 16, `completedOn` from the history end of week 16 when `plan_finished`). Pages: `/profile/portfolio` (wide layout, async server component with `connection()` in `<Suspense>`): header with the name (and an "Edit your name" link to Settings), stat tiles (streak, best streak, total solved with easy/medium/hard, level), a course list with progress bars, and a **Certificates** section listing completed courses with a **View certificate** link; a **Share** card with "Download my portfolio as a web page" (a plain-HTML export through a route handler `apps/web/app/profile/portfolio/export/route.ts`, self-contained inline CSS, no scripts, owned by D) and a disabled "Public link" row that says "Public links come with the hosted site (plan 0058). Until then, share the downloaded page or a PDF." `/profile/certificates/[course]`: a printable certificate (A4 landscape via `@page`, border, name, "has completed", course title, completion date, certificate id from `certificateId`, "Zen Dojo" mark as inline SVG), a **Print or save as PDF** button (client, `window.print()`), 404 unless the course is complete. `/u/[id]`: the public view component reading a `PortfolioData` snapshot; for now it serves `/u/me` from the local database (marked "Preview of your public page") and returns 404 for any other id until the hosted site exists; the page component takes `PortfolioData` as a prop so plan 0058 can feed it from the server. No private data is ever on this page: name, stats, course titles and dates only (never notes, code, emails or the pairing key). Add a "Portfolio" link on `/profile`. `profile_name` is added to `lib/ui-prefs.ts` (it may sync) and one text field to the Settings page.

## Testing (minimal)

Only the pure tests in the table, plus `pnpm.cmd -r typecheck` and eslint on changed `apps/web` files. No browser testing by agents. The lead runs one `pnpm.cmd check` and a short browser look (import shinchan by link, the pet moves, Portfolio page, a certificate).

## Steps

- [x] **A.** `zip.ts`, `pet-package.ts`, `pet-store.ts` + tests (commit zip and package first).
- [ ] **B1.** `lib/petdex.ts` + test, `api/buddy/petdex/route.ts` + test.
- [ ] **B2.** Pets block in `buddy-appearance.tsx` (after A and C have committed their first files).
- [ ] **C1.** `buddy-prefs.ts` (`pet`, `"pet"` avatar id) and `pet-anim.ts` + test (commit first: A and B use the types).
- [ ] **C2.** `pet-sprite.tsx`, `avatar.tsx`, `buddy-companion.tsx` integration.
- [ ] **C3.** Persona in `lib/ai/buddy.ts`, the route, `ai-line.ts` (+ tests).
- [ ] **D1.** `portfolio.ts` + test, `lib/portfolio.ts`, `profile_name`.
- [ ] **D2.** Portfolio page, export route, certificate page, `/u/[id]`, links.
- [ ] **Lead.** Check, browser look, statuses, handoff.

## Acceptance criteria

- [ ] Pasting `https://petdex.dev/pets/shinchan` imports the pet; uploading its zip does the same; both end in the pet list in Settings, selectable and removable; a link below the pet settings points to petdex.dev.
- [ ] The Buddy shows the pet animated by mood (idle, thinking = review, sleeping = waiting, excited = jumping), waves while it speaks, runs while dragged; reduced motion shows a still frame.
- [ ] With "AI lines" on and a pet selected, the AI line is written in that character's voice; the prompt contains only the event, tone, buddy name and the pet's name and description.
- [ ] Bad links, wrong hosts, oversized or malformed zips are refused with plain messages; nothing but `petdex.dev` and `assets.petdex.dev` is ever fetched.
- [ ] `/profile/portfolio` shows streak, best streak, total solved with difficulty split, level, courses with progress and certificates for completed courses; a certificate prints to one landscape page; the portfolio downloads as a standalone web page; `/u/me` previews the public view; nothing private appears on it.
- [ ] `pnpm.cmd check` passes.

## Pitfalls

- Never inline imported images or sheets as HTML; use `img`/CSS background from an object URL.
- Revoke object URLs on unmount.
- Sheet decoding and canvas work only exist in the browser; keep them out of server code and out of tests (test only the pure parts).
- Petdex page markup can change: `findZipUrl` must fail cleanly ("Could not find the pet's download on that page") rather than guess.
- Do not bundle any pet or Petdex asset in the repository.
- Certificates must only exist for genuinely complete courses.

## Open questions

## Implementation notes

## Review
