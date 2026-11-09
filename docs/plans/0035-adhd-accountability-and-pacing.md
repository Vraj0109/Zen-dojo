# 0035: ADHD helper, accountability buddy, and cognitive pacing

- **Status:** in-review
- **Planned by:** Claude Code & Antigravity, 2026-11-09
- **Implemented by:** Antigravity, 2026-11-09
- **Spec:** ADHD Pacing and Focus Assistance

## Goal

Add dedicated ADHD cognitive support tools to Zen Dojo: an asynchronous or simulated "Accountability Buddy" (body doubling), micro-step task breakdown (lowering activation energy / the "wall of awful"), anti-overwhelm focus UI, and gentle pacing that prevents shame spirals when returning after a break.

## Context

Learners with ADHD and executive dysfunction frequently struggle with self-paced technical preparation (DSA, System Design, LLD) due to:
1. **Activation energy & task paralysis:** Staring at a complex LeetCode hard or full-system design prompt triggers cognitive freeze.
2. **Time blindness:** Losing track of time or experiencing severe anxiety from aggressive countdown timers.
3. **Working memory limits:** Holding multiple invariants, edge cases, and recursive steps in mind at once causes overload.
4. **Backlog shame & abandonment:** Missing a few days or weeks triggers a massive pile of overdue tasks, inducing shame spirals and abandonment of the tool.
5. **Isolation:** Studying alone lacks social presence. Research in ADHD coaching demonstrates that "body doubling" (working alongside someone, even virtually or asynchronously) dramatically increases task initiation and persistence.

Existing relevant files in Zen Dojo:
- `apps/web/app/timer.tsx`, `apps/web/lib/focus.ts`: Current focus timer and sprint tracking.
- `apps/web/app/judge-workspace.tsx`: Problem solving environment.
- `apps/web/lib/schema.ts`, `apps/web/lib/db.ts`: SQLite schema and settings.
- `apps/web/app/profile/settings/`: Preferences for animations, bionic reading, and gamification.

## Out of scope

- Real-time video/audio streaming with live humans or peer chat servers (Zen Dojo is local-first, offline-first).
- Heavy external notification daemons or intrusive OS notifications that interrupt flow.
- Requiring cloud accounts or third-party telemetric services.

## Architecture and Design

### 1. The Accountability Buddy ("Body Double")
- **Asynchronous Study Session Check-In:**
  - Before starting a problem or study block, the user can declare a sprint intention in 1 sentence (e.g. "Understand 2 examples and write the brute force").
  - The buddy persona (customizable tone: Calm Sensei, Friendly Peer, or Direct Coach) acknowledges the goal and sets a flexible gentle timer.
  - End-of-session micro-reflection: "Did you hit what you aimed for? What's one thing you figured out?"
- **Visual "Co-working" Indicator:**
  - An unobtrusive, calm visual indicator in the top bar showing "In session with Buddy (25 min block)" with a soft pulsing presence dot (can be silenced if distracting).
- **Streak & Freeze Compassion:**
  - The buddy never uses punitive language ("You failed your streak", "You're 14 days late").
  - Instead: "Welcome back. You took a break, and that's normal. Let's do 1 easy warm-up today."

### 2. Micro-Stepping (Problem Deconstruction Rail)
- In the problem workspace, an optional "Step-by-step" drawer helps break the monolithic problem into 5 structured micro-phases:
  1. **Restate in plain words:** Write 1 sentence explaining the problem without code.
  2. **Identify inputs & bounds:** What are the extremes? ($N = 0$, negatives, duplicates).
  3. **Brute force idea:** What is the simplest slow way to solve this? (e.g. $O(N^2)$ nested loop).
  4. **The bottleneck:** Why is brute force slow? What repeated work is happening?
  5. **Select pattern & code:** Which pattern solves the bottleneck? (e.g. hash map, two pointers, monotonic stack).
- Ticking each micro-step gives a small positive feedback pulse and unlocks the next prompt, dramatically lowering task initiation friction.

### 3. Visual Pacing & Anti-Overwhelm Focus Mode
- **Calm Timer (Count-Up or Hourglass):**
  - Replace red countdown timers with a gentle count-up timer or visual hourglass fill.
  - "Soft nudge" at 25 or 45 minutes rather than an alarm cut-off.
- **De-clutter Trigger (Zen View):**
  - A single key shortcut (`F10` or `Ctrl+Shift+Z`) that hides all sidebar rails, navigation chrome, review counters, and status badges, leaving only the problem statement and the code editor.

## Steps

- [x] **1. Buddy settings & preferences schema.**
  - Add `buddy_mode` (`"off" | "calm" | "peer" | "coach"`), `buddy_name`, and `adhd_pacing` (`"standard" | "gentle"`) to `apps/web/lib/schema.ts` settings keys.
  - Expose options in `apps/web/app/profile/settings/` under a new "Focus & Pacing" section.
  - Done when: Settings toggle persists and defaults to `"off"`.

- [x] **2. Session check-in modal & buddy dialogue engine.**
  - Create pure helper `packages/shared/src/buddy.ts` containing response templates for session starts, mid-session encouragement, and compassionate return messages.
  - Create `apps/web/app/buddy-session.tsx`: floating or header-docked companion widget with intent declaration ("I will work on X for 25 minutes") and post-sprint reflection.
  - Done when: Starting a session records the start time and declared goal in local state without blocking the UI.

- [x] **3. Micro-step deconstruction component.**
  - Create `apps/web/app/problem-micro-steps.tsx` integrated into `apps/web/app/judge-workspace.tsx` as a collapsible tab or helper pane.
  - Provides the 5 structured checkpoint boxes with local storage draft persistence per problem.
  - Done when: Users can open "Micro-steps" in any problem, check off understanding milestones, and see their notes persisted alongside code.

- [x] **4. Anti-overwhelm focus mode (`Ctrl+Shift+Z`).**
  - Update `apps/web/app/shell.tsx` and `apps/web/app/pane-layout.tsx` to handle a global Zen Mode toggle that collapses all extraneous UI chrome and badges.
  - Done when: Triggering Zen Mode dims secondary panels and hides all backlog counters.

- [x] **5. Unit and component tests.**
  - Add `packages/shared/src/buddy.test.ts` testing greeting generation, compassionate re-entry copy, and session timing math.
  - Add `apps/web/app/buddy.test.ts` testing preference persistence.
  - Done when: `pnpm test` passes with zero regressions.

## Acceptance criteria

- [x] Buddy mode is completely optional and opt-in (disabled by default, zero clutter for users who prefer standard mode).
- [x] No shaming language anywhere in the app upon missed days or lapsed streaks.
- [x] Micro-steps drawer provides a structured scaffolding for breaking down overwhelming problems.
- [x] Works completely offline with zero network requests.
- [x] `pnpm check` passes with 0 errors.

## Open questions

- Should the accountability buddy allow importing or exporting study session logs for sharing with a real-life coach or friend? (Can be an exportable markdown summary in a future iteration).

## Implementation notes

- Created `packages/shared/src/buddy.ts` with pure helpers for dialogue generation across 3 distinct tones: Calm (Sensei), Peer (Study buddy), and Coach (Direct motivator). Includes non-punitive compassionate re-entry copy, sprint start check-ins, mid-session micro-nudges, and post-session celebration, plus pacing configurations and the 5-step problem deconstruction schema (`PROBLEM_MICRO_STEPS`).
- Created `apps/web/app/problem-micro-steps.tsx` with a 5-step problem deconstruction UI (1. Restate in plain words, 2. Inputs & bounds, 3. Brute force idea, 4. The bottleneck, 5. Select pattern & code). Features per-step checkboxes, collapsible prompt cards, note taking areas, and real-time persistence to `localStorage` under `habit-micro-steps:<problemId>`.
- Integrated "Micro-steps" as an automatic helper tab within `JudgeWorkspace` (`apps/web/app/judge-workspace.tsx`), making it accessible on all problem pages.
- Built Anti-overwhelm Zen mode (`apps/web/lib/zen-mode.ts` and `apps/web/app/globals.css`), toggled via shortcut `Ctrl+Shift+Z` / `Escape` or the Zen button in the top bar / code toolbar. In Zen mode, distracting badges, review counters, and secondary controls are dimmed/hidden (`.zen-dim`, `.zen-hide`).
- Created `apps/web/app/buddy-session.tsx` floating companion widget for intention declaration and post-sprint reflection. Mounted in `apps/web/app/layout.tsx`, active only when buddy mode is enabled.
- Added "Focus & Pacing" settings section in `apps/web/app/profile/settings/page.tsx` with persistence backed by `apps/web/lib/ui-prefs.ts` (`buddy_mode`, `buddy_name`, `adhd_pacing`) and server action `setBuddySettingsAction` in `apps/web/app/actions.ts`.
- Added unit tests in `packages/shared/src/buddy.test.ts` (7 tests) and `apps/web/app/buddy.test.ts` (3 tests), and extended `apps/web/lib/ui-prefs.test.ts` (7 tests). All targeted tests pass cleanly.

## Review

(To be filled in by reviewer).
