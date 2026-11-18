# UI work (plans 0083 and 0084)

When a plan changes how a screen looks:

- Follow `DESIGN.md` (tokens, type, spacing, components). Use the shared pieces in `apps/web/app/ui.tsx` and the
  colour classes from `apps/web/app/globals.css`; never hard-code colours. Red (`danger`) is only for errors.
- Before you change a screen, read the matching skill in `.agent/skills/` (local copies, not in git):
  - Look and taste: `frontend-design`, `design-elevation`, `taste-visual-taste`, `taste-animation`, `taste-interaction`
  - Design system and review: `web-design-system`, `web-review`, `ui-review`, `ui-polish`, `ui-compare`,
    `design-critique`, `design-systems`, `interaction-design`, `ux-writing`
  - Accessibility: `accessibility-audit` (plus the axe MCP tools)
  - Next.js and React: `nextjs`, `next-cache-components`, `react-best-practices`
  - Testing and bugs: `webapp-testing` (plus the Playwright MCP tools), `testing-strategy`, `debug`, `code-review`
- Check every changed screen in a real browser (Playwright MCP) at 375, 768 and 1280 px, light and dark, against a copy
  of the data or `:memory:`, never `data/habit.db`. No error in the server log or console, nothing overlapping, no
  sideways scroll. Write what you checked in the plan's Implementation notes.
- If the skills folder is missing (fresh clone), the rules above still apply; ask the user to copy the skills again.
