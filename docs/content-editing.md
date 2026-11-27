# Editing Content in Zen Dojo

Zen Dojo content (problems, lessons, study areas, and curriculum docs) is stored directly in the database and edited in-app through the Admin Content Editor at `/admin`.

Only authenticated administrators (listed in `ADMIN_USER_IDS`) can access the `/admin` routes and server actions.

---

## 1. Problem Editor (`/admin/problems`)

Navigate to **Problems** in the admin header.

### Problem Catalog
- **Search & Filter:** Search by title or slug (`q`), filter by source (`all`, `leetcode`, `custom`), difficulty (`all`, `easy`, `medium`, `hard`), primary pattern, brute force status, or missing solution languages.
- **Last Edited:** Displays the timestamp and author of the most recent revision.
- **New Problem:** Click **+ New problem** to create a fresh draft.

### Problem Editor Tabs (`/admin/problems/[id]`)
The problem editor is organized into 5 tabs:

1. **Statement**
   - Title, slug, difficulty, source link, and primary pattern.
   - Kind: `function` (standard algorithmic) or `design` (class design / stateful problem).
   - Function signature specification (`name`, `params` with types, and `returnType`).
   - Constraints list (one constraint per line).
   - Output comparison flag: "Unordered output (order does not matter)" for set/combination outputs.

2. **Test Cases**
   - Manage Examples (publicly visible in statement) and Hidden Test Cases (used by the judge).
   - Enter input values as a JSON array (one element per function parameter).
   - Enter expected output as JSON.
   - Optional explanation markdown for examples.
   - Reorder cases using **↑** and **↓** buttons.
   - **Paste JSON array:** Quick modal to paste an entire array of test cases at once.

3. **Hints**
   - Add up to 20 progressive hints.
   - Each hint supports Markdown formatting (up to 1,000 characters).
   - Reorder hints or remove unnecessary ones.

4. **Solution Page**
   - Full block-based solution article powered by the **Page Editor** (see below).
   - Supports both visual **Blocks view** and raw **Markdown view**.

5. **History**
   - Complete audit trail of past edits for this problem.
   - Shows timestamp, author, and the "What changed" note.
   - Side-by-side JSON diff viewer (before / after).
   - **Restore this version:** One-click rollback to any previous revision.

### Running Tests
- **On Desktop:** Click **Run tests** in the top banner. Unsaved code across all languages runs against unsaved test cases via the native desktop judge, reporting per-case pass/fail, execution time, and stdout.
- **On Hosted Web:** Running tests is disabled; the banner displays *"Test execution runs in the desktop app"*.

---

## 2. Page Editor & Block Model (`/admin/page-editor`)

The Page Editor powers problem solutions (`/admin/problems/[id]`) and lesson pages (`/admin/study/[area]/[id]`).

### Block Types
- **Text Block:** Markdown text. Includes formatting shortcuts for Bold (`**`), Inline Code (`` ` ``), Links (`[text](url)`), and Bullet Lists (`- `).
- **Code Block:**
  - Variant selector: `Optimal`, `Semi-optimized`, `Brute force`, or `Custom`.
  - Complexity badges: Time Complexity (e.g. `O(n log n)`) and Space Complexity (e.g. `O(1)`).
  - Multi-language tabs: C++, Java, Python, and JavaScript/TypeScript.
  - Add or remove language implementations per block.
- **Diagram Block:** Mermaid diagrams (`flowchart`, `sequenceDiagram`, `classDiagram`, `erDiagram`). Includes starter templates and live SVG rendering.
- **Image Block:** Upload images (PNG, JPEG, WebP up to 1 MB). Includes alt text and caption inputs.

### Editing & Reordering Blocks
- **Insert Bar:** Use the `+ Text`, `+ Code`, `+ Diagram`, or `+ Image` buttons to insert blocks at any section boundary.
- **Toolbar:** Each block has **Move up**, **Move down**, **Duplicate**, and **Remove** controls.
- **Keyboard Shortcuts:** Press `Alt + Up` or `Alt + Down` to reorder the focused block.

### Dual Views & Preview
- **Blocks View:** Visual, card-based block editing.
- **Markdown View:** Full page represented as a single Markdown document with embedded block markers (`pageToMarkdown` / `markdownToPage`).
  A line containing only `<!-- block -->` starts a new text block. It is written before a text block that follows
  another text block (so two text blocks stay two blocks) and on its own for an empty text block. Keep these lines
  when you edit in the Markdown view; delete one to merge two text blocks.
- **Live Preview:** Side-by-side preview powered by `<ContentPage />`, rendering exactly as learners see it.

---

## 3. Study & Lesson Editor (`/admin/study`)

Navigate to **Study Content** in the admin header.

- **Course Directory:** Lists all study courses (System Design, Low-Level Design, Core CS) and their lessons.
- **Lesson Editor (`/admin/study/[area]/[id]`):**
  - Edit lesson title, course, display order, and template style.
  - Lesson Metadata JSON editor.
  - Body content edited with the **Page Editor**.
  - History & restore viewer for past revisions.

---

## 4. Curriculum Docs Editor (`/admin/docs`)

Navigate to **Docs** in the admin header.

- Edit curriculum documents across all doc kinds (`roadmap`, `patterns`, `reading`, etc.).
- Includes a JSON editor with real-time syntax and structural validation.
- Version history with diff inspection and one-click restore.

---

## 5. Global Audit Log (`/admin/audit`)

- View recent content revisions across all problems, lessons, and curriculum docs.
- Filter by target kind (`problem`, `lesson`, `doc`).
- Inspect author attribution, change notes, and JSON diffs.
- Restore any previous state directly from the audit log.

---

## 6. Saving Changes & Conflict Resolution

Every editor includes a sticky footer at the bottom of the screen:

- **What changed note:** A brief note (up to 140 characters) describing the edit for the audit trail.
- **Tell learners checkbox:** When enabled, notifies learners of content updates upon sync.
- **Unsaved Changes Indicator:** Prompts if navigating away with unsaved edits.
- **Conflict Handling (Optimistic Locking):**
  - If another admin updates the same content while you are editing, the editor prevents accidental overwrites.
  - A conflict dialog appears offering two choices:
    - **Load their version:** Replaces your draft with the latest version from the database.
    - **Overwrite:** Forces your draft to be saved over the current database version.

---

## 7. Markdown Formatting Reference

Content rendered in Text blocks and problem statements supports GitHub-flavored Markdown:

- **Headings:** Use `## Section Title` or `### Subsection`.
- **Code:** Inline code with single backticks: `` `value` ``. Fenced code blocks with language tags:
  ````markdown
  ```python
  def solve():
      pass
  ```
  ````
- **Math:** KaTeX math expressions using `$...$` for inline math and `$$...$$` on separate lines for display math.
- **Mermaid Diagrams:**
  ````markdown
  ```mermaid
  flowchart LR
      A[Client] --> B[Load Balancer]
      B --> C[Server]
  ```
  ````
- **Callouts / Alerts:**
  ```markdown
  > [!NOTE]
  > Useful tips or edge case notes.
  ```
- **Style Rules:** Write plainly, keep sentences short and specific, avoid filler or hype, and never copy text verbatim from external books or articles.

---

## 8. Writing with AI

Editors have an **AI** button next to the fields and blocks that can be written with an AI. Use it to get a draft, then check and save it yourself.

- **Where:** a problem's statement, constraints, test cases and hints; the statement and solution pages (whole page, each section and each block); a lesson's page (whole page, each section and each block); a doc's JSON.
- **Modes:** the menu only offers modes that fit the field. An empty field offers Write. A filled field offers Improve, Fix format and Make shorter. Test cases add Add edge cases. Code blocks offer Write optimal, Write brute force, Write intermediate, Explain complexity, and Add C++, Java, Python or JavaScript (the tab is added with the answer).
- **Steps:**
  1. Pick a mode. The panel builds a prompt from the field and the surrounding content. It includes what you have typed but not saved yet.
  2. Copy the prompt (Copy prompt). If copying fails, the prompt is selected: copy it by hand. Show prompt displays the full text.
  3. Paste it into any AI, then paste the reply back under "Paste the AI's answer".
  4. Check answer. Errors name the problem (for example a test case with the wrong number of inputs, or a hint with code in it). A good answer shows the current text and the proposed text side by side.
  5. Use this applies the answer to the draft only. Undo puts the old text back until you apply another answer.
  6. Read it, then save the editor as usual.
- **Rules:** the answer is always checked before it is used, and nothing is saved by the button. Prompts follow the house rules in `packages/shared/src/content-model/house-rules.ts` (plain, specific, no code in hints, the optimal approach last). The prompt is cut to 24,000 characters, and says so when cut.
- **Limits:** the course summary has no editor, so it has no button. "Ask my AI" (sending the prompt to a model from inside the app) is not built yet. The editors already need JavaScript, so the AI button does nothing without it.
