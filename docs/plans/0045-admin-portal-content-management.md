# 0045: Dynamic Admin Portal for Live Content Management

- **Status:** ready
- **Planned by:** Antigravity, 2026-11-10
- **Implemented by:** (implementer fills in)
- **Spec:** builds on plans 0024, 0030, and 0032

## Goal

Provide a web-based `/admin` content management portal where administrators can create, edit, search, test, and publish problems, test cases, solutions, hints, and study materials (System Design, LLD, Core CS) on the fly, storing updates in the cloud `content_items` database and broadcasting them to users without requiring a software rebuild or new version release.

## Context

- Today, problem specs, pattern guides, and study materials originate from static TypeScript files (`packages/shared/src/judge/problems-*.ts`, `learn/design-depth-*.ts`, etc.).
- Plan 0030 implemented the `content_items` database table (`id`, `type`, `body`, `rev`, `source`, `updated_at`, `deleted`) and repository (`apps/web/lib/content.ts`) allowing dynamic content items to override or augment built-in items.
- However, currently, adding or modifying items requires developer CLI commands (`pnpm content:add`, `content:sync`).
- Non-developer content creators and instructors need a rich visual web interface with syntax-highlighted code editors, markdown/diagram live previews, and integrated test verification.

## Out of scope

- Public community user-submitted content (this is an admin-only portal for curated platform content).
- Video hosting (diagrams, code, and structured markdown are supported).

## Steps

- [ ] **1. Admin authentication & route security.**
  - Protect `/admin/*` routes with admin verification:
    - Check session admin role or header `x-admin-token` matching `process.env.ADMIN_SECRET_KEY`.
    - Provide a clean login form at `/admin/login` for entering the admin credential.
  - Done when: Unauthenticated requests to `/admin` redirect to `/admin/login`.

- [ ] **2. Problems Management Interface (`/admin/problems`).**
  - Create `/admin/problems` dashboard:
    - Searchable, filterable list of all problems (by source, difficulty, and pattern).
    - Status badges: "Built-in", "Dynamic Override", or "New Stored Problem".
  - Create `/admin/problems/[id]` and `/admin/problems/new`:
    - Tabbed form for:
      1. **Metadata:** ID, Title, Source URL, Difficulty, Pattern tags.
      2. **Statement & Constraints:** Markdown editor with side-by-side live rendering.
      3. **Examples:** Inputs, outputs, and explanations.
      4. **Test Cases:** Interactive table for adding, editing, and generating edge test cases.
      5. **Hints:** Ordered list of progressive hints.
      6. **Reference Solutions:** Code editor for C++, Java, and JavaScript reference solutions.
  - Add **"Verify with Judge"** button:
    - Compiles and runs the reference solution against all configured test cases using the in-app judge runner (`/api/judge/run`).
    - Reports passing status, output mismatches, and execution runtime before saving.
  - Done when: An admin can create a new problem, verify it with the judge, and save it to `content_items`.

- [ ] **3. Study Material & Lessons Management Interface (`/admin/study`).**
  - Create `/admin/study` dashboard:
    - Navigation tree: Areas (`sd`, `lld`, `core`) -> Sections -> Lessons.
    - Ability to reorder lessons, create new topics, or create subsections.
  - Create `/admin/study/[area]/[id]`:
    - Tabbed editor:
      1. **Overview & Walkthrough:** Markdown content with instant preview.
      2. **Diagrams:** Interactive Mermaid diagram editor with live visual rendering.
      3. **Architecture Cards (System Design):** Component name, role, scale, failure modes.
      4. **Scorecards (System Design):** Interview criteria, strong signals, red flags.
      5. **Code Snippets / Java Project Files:** Multi-file editor for lesson code.
  - Done when: An admin can edit a System Design or LLD topic, save it, and see changes live on `/study/sd/...` or `/study/lld/...`.

- [ ] **4. Instant publishing & revision sync.**
  - When saving in `/admin`:
    - Write to `content_items` with incremented `rev` and updated timestamp.
    - Trigger sync notification so active clients pull updated content items without page reloads.
    - Provide a "Revert to Built-in" button for problems or lessons that were patched.
  - Done when: Editing a problem in `/admin` immediately reflects on the learner's `/dsa/[id]` page upon reload.

- [ ] **5. Tests.**
  - In `apps/web/app/admin/admin.test.ts`:
    - Test unauthorized access rejection on `/admin` and `/api/admin/*`.
    - Test saving a new problem spec to `content_items`.
    - Test saving a patched lesson and verifying `resolveLesson` returns the patched version.
    - Test deleting / reverting an item.
  - Done when: `pnpm exec vitest run apps/web/app/admin/admin.test.ts` passes.

## Acceptance criteria

- [ ] Secure `/admin` portal accessible only with valid admin credentials.
- [ ] Rich problem authoring interface with statement markdown, test case generator, and hint manager.
- [ ] "Verify with Judge" button tests the reference code against all test cases before saving.
- [ ] Study material editor supports section reordering, Mermaid diagram editing, and architecture cards.
- [ ] Content updates save to `content_items` and propagate to clients without app redeployments.
- [ ] `pnpm check` passes.

## Open questions

(none)

## Implementation notes

(Implementer fills in)

## Review

(Reviewer fills in)
