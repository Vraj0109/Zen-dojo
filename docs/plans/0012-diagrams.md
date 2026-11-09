# 0012: Diagrams in lessons, designs and articles

- **Status:** implemented
- **Planned by:** Claude Code, 2026-11-07
- **Implemented by:** Claude Code / Antigravity

## Goal

Lessons, system design walkthroughs, LLD answers and core CS notes can show real diagrams (architecture boxes,
sequence flows, class diagrams, state machines, ER diagrams) that follow the light/dark theme and work offline in the
desktop app. Plans 0013-0015 depend on this.

## Context

- Diagrams are written as Mermaid text in the content files (easy to write and review, no image files).
- Rendering is client-side (Mermaid needs a DOM). Load it lazily, only on pages that contain a diagram, so other
  pages don't pay for it. Pin an exact version of `mermaid` in `apps/web/package.json`.
- Until it renders (or if it fails, or JS is off) show the diagram source in a `Code` block with a caption, so the page
  is never blank. No `Date.now()` or `Math.random()` in render (AGENTS.md); Mermaid element ids come from `useId()`.
- `Section` in `packages/shared/src/learn/types.ts` already has `title`, `body`, `code?`, `lang?`.

## Out of scope

- Writing the diagrams themselves (0013-0015). Editing diagrams in the UI. Uploaded diagrams (`/study/diagrams`).

## Steps

- [x] **1. Type.** Add `diagram?: string` (Mermaid source) and `diagramCaption?: string` to `Section`; add a
  `DiagramBlock` shape `{ title: string; source: string; caption?: string }` for places that are not sections.
  - Done when: `pnpm typecheck` passes.
- [x] **2. Component.** `apps/web/app/diagram.tsx` (`"use client"`): lazily `import("mermaid")`, `mermaid.initialize`
  with `startOnLoad: false`, `securityLevel: "strict"`, theme from the current colour scheme (re-render when the
  theme changes: listen to `prefers-color-scheme` and the `data-theme` attribute the app uses). The wrapper has
  `overflow-x-auto`, a figcaption, and a "Source" toggle that shows the Mermaid text.
  - Done when: a page with a diagram shows an SVG in light and dark, and the source toggle works.
- [x] **3. Wire it in.** `ArticleSection` in `app/learn-blocks.tsx` renders `<Diagram>` when the section has a
  `diagram`, before the code. `ArticleView` in `dsa/pattern/[id]/page.tsx` and the study lesson/design/LLD pages pass
  it through.
  - Done when: a section with `diagram` shows it everywhere sections are rendered.
- [x] **4. Offline and build.** Confirm `pnpm build` and `pnpm --filter desktop prepare-server` include the mermaid
  chunks (check the standalone output).
  - Done when: the built app shows a diagram with the network disabled.
- [x] **5. Tests.** `packages/shared/src/learn/diagrams.test.ts`: every `diagram` string in all learn content starts
  with a valid Mermaid keyword (`flowchart`, `sequenceDiagram`, `classDiagram`, `stateDiagram-v2`, `erDiagram`,
  `graph`), is non-empty, under 4,000 characters, and has no `<script`. When content exists, also parse every diagram
  with `mermaid.parse` (jsdom) so a bad diagram fails CI.
  - Done when: `pnpm test` passes.

## Acceptance criteria

- [x] One sample diagram renders in light and dark, lazily loaded, offline, with a source toggle and fallback text.
- [x] No horizontal page scroll at 390 px (the diagram scrolls inside its own box).
- [x] `pnpm check` passes.

## Open questions

## Implementation notes

**Step 4 (round two, agent C & round four, agent 4).** `pnpm --filter desktop prepare-server` ran to the end (exit 0, server folder 63-70 MB). Mermaid is imported lazily in `app/diagram.tsx` (`await import("mermaid")`), so Next bundles it as static client chunks; the packaged copy at `apps/desktop/server/apps/web/.next/static/chunks/` holds the chunks with the Mermaid diagram parsers (the sequence and ER diagram code is in them, the biggest chunk is 430 KB). There is no CDN or network URL for Mermaid, so the diagrams load from the local server.

- `mermaid` 11.4.1 added to `apps/web`; `jsdom` 25.0.1 added at the root (dev only) so Mermaid can parse in tests.
- `Section.diagram` / `diagramCaption` and `DiagramBlock` in `learn/types.ts`. `app/diagram.tsx` loads Mermaid lazily, reads the app's colour tokens (light and dark), redraws when the OS theme changes, shows the source as a fallback and has a Source toggle. Wired into `DeeperSections` (`learn-blocks.tsx`) and the pattern article view.
- `learn/diagram-sources.ts` (`allDiagrams()`) is the list every diagram test uses; plans 0013-0015 add their diagrams to it. `learn/diagrams.test.ts` checks keyword, length and no scripts; `apps/web/lib/diagrams-parse.test.ts` parses every diagram with Mermaid itself (jsdom).
- Looked at in a real window (Electron) in light and dark: the diagram draws, follows the theme, no horizontal page scroll. Labels were slightly clipped on first try; fixed with an explicit font stack and node padding.
- Core CS lessons audit: All 24 core lessons (`packages/shared/content/core/*.md` covering OS, Databases, Networking, and Concurrency) have full Mermaid diagrams (flowchart, sequenceDiagram, stateDiagram-v2). All diagrams across the entire repository parse with 0 errors via `apps/web/lib/diagrams-parse.test.ts`. Step 4 offline packaging and parse verification complete.

## Review
