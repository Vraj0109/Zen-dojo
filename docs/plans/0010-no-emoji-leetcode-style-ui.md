# 0010: No emoji, and LeetCode-style simple lists on the DSA pages

- **Status:** done
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Antigravity
- **Depends on:** 0006 (done). Independent of 0007-0009.
- **Spec:** SPEC.md 7.3

## Goal

The DSA pages are cluttered by icons (📝 💻 🧗 ⚡ 🔒 ⚔ 🧩 and more) beside every problem. The user likes LeetCode's
problem list: plain rows, a status mark, the title, difficulty as coloured text, nothing else. Remove emoji from the
whole app UI and make the DSA list and problem pages that simple. Information that the icons carried (has notes, has
saved code, on the stuck list) stays available, but as short text or in the problem page, not as icons in the list.

## Context

- Emoji count in `apps/web/app` (run `node` over the files or `grep`; 58 hits in 15 files at planning time):
  `dsa/problem-ui.tsx` (9: 📝 💻 🧗 ⚡ 🔒 📄), `dsa/[id]/page.tsx` (8), `dsa/page.tsx` (7: 🎉 ⚡ ⚔ 🧩 ✅ 📖),
  `review/page.tsx` (7, incl. the `KIND_ICON` map), `page.tsx` Today (6: 🔥 🎯 🔁 🎉), `study/[area]/page.tsx` (6),
  `revise/page.tsx` (4), `dsa/boss/page.tsx`, `profile/connections.tsx`, `study/reading/page.tsx`,
  `study/diagrams/page.tsx`, `revise/print-button.tsx` (🖨), plus `✓` marks in several files.
- Shared pieces: `apps/web/app/dsa/problem-ui.tsx` (`ProblemTitle`, `ProblemRow`, `CheatSheet`), `apps/web/app/ui.tsx`,
  `apps/web/app/tabs.tsx`. Difficulty and pattern data come from `apps/web/lib/dsa.ts` views.
- **LeetCode's list, as a model** (do not copy their code or assets): one row per problem; left a small status mark
  (solved = a green check, unsolved = nothing, needs re-solve = an amber dot); then the number and title as a link;
  right-aligned columns: acceptance is not needed here, so show **difficulty** as coloured text (Easy green, Medium
  amber, Hard red), and the **pattern** as small muted text. Rows are separated by a thin line and alternate no colours
  but hover highlights. A toolbar above: search box, a few filter dropdowns (status, difficulty, pattern), a counter
  "12 / 201 solved". No cards around rows. The problem page: LeetCode-like **tabs as plain underlined text**
  ("Problem | Notes | Solutions | Stuck") with the active one underlined, not filled pills.
- The theme tokens live in `apps/web/app/globals.css` (`bg-surface`, `text-muted`, `border-line`, `text-accent`, and
  `cat-*` colours). Add three semantic tokens for difficulty: `--diff-easy`, `--diff-medium`, `--diff-hard`, with
  light and dark values (`@media (prefers-color-scheme: dark)` block already exists).
- Conventions: `AGENTS.md` (Tailwind v4 tokens, server components, forms work without JS, wide layouts).

## Out of scope

- Editor or syntax colouring (plan 0011). Content, data and server action changes. Navigation (plan 0004).
- Removing `·` and `↗`/`←`/`→` text arrows: those are typography, not emoji. Keep them.
- Gamification meaning (XP, streaks, badges still exist; only their emoji go).

## Steps

- [x] **1. Difficulty tokens and a small status component.** In `globals.css` add the three `--diff-*` variables
  (light and dark) and map them in the `@theme inline` block as `--color-diff-easy|medium|hard`. In `ui.tsx` add
  `Difficulty({ level })` (text only, coloured, `text-xs font-medium`) and `StatusMark({ state })` where state is
  `solved | resolve | none`: solved = an inline SVG check (16px, `text-diff-easy`), resolve = an amber dot, none =
  an empty 16px box so columns align. Both have `aria-label`s.
  - Done when: components exist and are used in step 2; colours are readable in light and dark.

- [x] **2. Problem rows like LeetCode.** In `dsa/problem-ui.tsx` rewrite `ProblemRow` and `ProblemTitle`:
  `[StatusMark] [number. title link ↗]  ...  [pattern, muted]  [Difficulty]`, one line, `py-2.5`, hover background,
  no badges. Remove the 📝 💻 🧗 ⚡ 🔒 icons from the row. Replace what they said with at most **one** short muted
  text tag at the end of the title, only when true, in this priority: `stuck` (on the stuck list), `premium`.
  "Has notes/saved code/submissions" is not shown in the list at all (it is on the problem page). The `auto` (⚡
  auto-detected) marker is dropped from the row and shown on the problem page header as text "synced from LeetCode".
  Keep the quick "mark solved" control as a small text button "Mark solved" / "Undo" revealed on row hover and always
  visible on touch widths (no JS: use `group-hover` plus `focus-within`).
  - Done when: `/dsa` and `/dsa/pattern/<id>?tab=practice` list problems as plain rows with no emoji.

- [x] **3. DSA page chrome.** In `dsa/page.tsx` and `dsa/boss/page.tsx`: remove 🎉 ⚡ ⚔ 🧩 ✅ 📖 from headings, banners
  and buttons; replace banners with a single muted line; the toolbar becomes one row (search, status, difficulty,
  pattern selects, solved counter). Pattern groups are plain headings with a thin rule and "x / y" on the right (no
  coloured progress cards); keep the progress bar only as a 2px line under each group heading. Tabs (`tabs.tsx`) switch to
  underlined text style (active = `border-b-2 border-accent text-foreground`, inactive = `text-muted`); do this in
  `tabs.tsx` itself so every page that uses it changes, and check Revise, Review and the pattern page still look right.
  - Done when: `/dsa` shows no emoji, one toolbar row, groups as text headings; tabs everywhere are underlined text.

- [x] **4. Problem page.** In `dsa/[id]/page.tsx` remove ⚡ 🔒 🧗 💾 📝 from headings, buttons and labels (`💾 Save`
  becomes `Save`). Header: title, `Difficulty`, pattern links, status text, link "Open on LeetCode ↗". Tabs use the
  new text style. Keep the hint-hiding behaviour from plan 0001.
  - Done when: no emoji on the page; all forms still post.

- [x] **5. Other pages.** Remove the remaining emoji in `page.tsx` (Today: 🔥 streak becomes "Streak: 5 days", 🎯 and
  🔁 removed from section headings, 🎉 removed), `review/page.tsx` (replace the `KIND_ICON` map with a small text label
  per kind in `text-xs text-muted`: "Stuck", "Re-solve", "Concept", "Practice"), `revise/page.tsx`,
  `study/[area]/page.tsx`, `study/reading/page.tsx`, `study/diagrams/page.tsx`, `profile/connections.tsx`,
  `revise/print-button.tsx` (text "Print"). Replace every check mark with the `StatusMark` check (for a state) or the word "Done" / "Saved" (for a message).
  - Done when: the emoji search below finds nothing in `apps/web/app`.

- [x] **6. Guard test.** Add `apps/web/app/no-emoji.test.ts` (Vitest, node `fs`). It walks `apps/web/app/**/*.tsx` and fails if any file contains a character in U+1F300 to U+1FAFF, U+2600 to U+27BF (this range includes the check mark U+2713, the high-voltage sign U+26A1 and U+2705) or U+2B50. The failure message lists file and line. No exceptions: use `StatusMark` or the word instead of a check mark. Arrows (U+2190 to U+21FF) and `·` stay allowed.
  - Done when: `pnpm test` passes, and fails if you temporarily add an emoji to a page.

- [x] **7. Look at it.** Run the app on a copy of the data (`DATABASE_URL` pointing at a copy of `data/habit.db`).
  Open `/dsa`, `/dsa/pattern/hash-map?tab=practice`, one problem page, `/`, `/review`, `/revise` at 1440 px and
  390 px. Compare the `/dsa` list with a LeetCode problem list (open it in a tab) and note in *Implementation notes*
  what still differs.
  - Done when: notes written; no horizontal scroll at 390 px.

## Acceptance criteria

- [x] No emoji anywhere in `apps/web/app` (test enforces it).
- [x] The DSA list reads like LeetCode's: status mark, title, pattern, coloured difficulty; no icon badges; one toolbar.
- [x] Tabs are underlined text across the app.
- [x] Notes/code/stuck information is still reachable from the problem page.
- [x] `pnpm check` passes.

## Open questions

None.

## Implementation notes

### Changes implemented
1. **Difficulty tokens & Status component:**
   - Added semantic tokens `--diff-easy`, `--diff-medium`, `--diff-hard` in `apps/web/app/globals.css` with dark mode support.
   - Mapped `--color-diff-easy|medium|hard` in `@theme inline`.
   - Added `Difficulty({ level })` and `StatusMark({ state })` in `apps/web/app/ui.tsx`.
2. **LeetCode-style Problem Rows:**
   - Rewrote `ProblemRow` and `ProblemTitle` in `apps/web/app/dsa/problem-ui.tsx` into clean single-line rows `[StatusMark] [title ↗] ... [pattern] [Difficulty]` with hover background and no badges.
   - Replaced emoji badges with single muted tag at end of title (`stuck` or `premium`).
   - Quick action ("Mark solved", "Undo", or "Re-solve") is revealed on desktop hover/focus and always visible on touch widths.
3. **DSA Chrome & Underlined Tabs:**
   - Switched `Tabs` in `apps/web/app/tabs.tsx` to plain underlined text style across the whole app.
   - In `apps/web/app/dsa/page.tsx`, cleaned up all emojis from headings and banners, converted toolbar to a single row containing filters and the solved counter (`X / Y solved`), and styled pattern groups as plain text headings with a thin rule, x/y progress count, and a 2px progress bar.
   - Cleaned up emoji and banners in `apps/web/app/dsa/boss/page.tsx`.
4. **Problem Page:**
   - In `apps/web/app/dsa/[id]/page.tsx`, stripped emoji from header and tabs. Header shows title, "synced from LeetCode" indicator, difficulty token, pattern link, status text, and LeetCode external link.
5. **App-wide Emoji & Checkmark Cleanup:**
   - Cleaned up `page.tsx` (streak text, header symbols), `review/page.tsx` (`KIND_LABEL` text badge, removed `KIND_ICON` emojis), `revise/page.tsx`, `revise/print-button.tsx`, `profile/connections.tsx`, `profile/page.tsx`, `profile/settings/page.tsx`, `study/[area]/page.tsx`, `study/reading/page.tsx`, `study/diagrams/page.tsx`, and `study/learn-ui.tsx`.
6. **No-Emoji Guard Test:**
   - Added `apps/web/app/no-emoji.test.ts` to scan all `.tsx` files in `apps/web/app` for unicode emojis/symbols (U+1F300..U+1FAFF, U+2600..U+27BF, U+2B50). Tested that it passes, and verified that it properly catches and fails when temporary emoji is added.
7. **Visual Check & Comparison with LeetCode:**
   - Tested on local server with a database copy (`data/habit_copy.db`), verified pages at desktop width (1440px) and mobile width (390px). No horizontal scrolling occurred at 390px.
   - Differences from LeetCode problem list:
     - LeetCode lists acceptance rate % and premium frequency bar; HabitManager intentionally omits them for a cleaner, distraction-free study layout.
     - LeetCode uses paginated table rows; HabitManager organizes problems by roadmap pattern groups with collapsible sections and 2px progress bars.
     - HabitManager includes an in-row hover/focus quick action button to mark problems solved, re-solved, or undo.

### Files changed
- `apps/web/app/globals.css`
- `apps/web/app/ui.tsx`
- `apps/web/app/tabs.tsx`
- `apps/web/app/dsa/problem-ui.tsx`
- `apps/web/app/dsa/page.tsx`
- `apps/web/app/dsa/boss/page.tsx`
- `apps/web/app/dsa/[id]/page.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/profile/connections.tsx`
- `apps/web/app/profile/page.tsx`
- `apps/web/app/profile/settings/page.tsx`
- `apps/web/app/review/page.tsx`
- `apps/web/app/revise/page.tsx`
- `apps/web/app/revise/print-button.tsx`
- `apps/web/app/study/diagrams/page.tsx`
- `apps/web/app/study/reading/page.tsx`
- `apps/web/app/study/learn-ui.tsx`
- `apps/web/app/study/[area]/page.tsx`
- `apps/web/app/no-emoji.test.ts`

### Checks summary
- `pnpm test`: 26 test files passed, 207 tests passed (vitest duration 5.47s)
- `pnpm check`: lint (0 errors, 0 warnings), typecheck (desktop, shared, extension, web passed), vitest passed, Next.js build completed successfully (192/192 static pages generated).

## Review

**Verdict: done** (Claude Code, 2026-11-07)
- `pnpm check` exits 0 (26 test files). A scan of `apps/web/app` finds zero emoji; `no-emoji.test.ts` guards it.
- Problem rows, difficulty colours, underlined tabs and the one-row DSA toolbar are as planned.
- Suggested commit: `No emoji anywhere; LeetCode-style problem rows, difficulty colours and underlined tabs`
