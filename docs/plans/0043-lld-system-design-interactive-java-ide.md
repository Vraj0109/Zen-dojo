# 0043: Interactive multi-file Java IDE for LLD and System Design practice

- **Status:** ready
- **Planned by:** Antigravity, 2026-11-10
- **Implemented by:** (implementer fills in)
- **Spec:** none (extends plans 0011, 0013, 0014, and 0025)

## Goal

Provide learners with an interactive multi-file Java IDE on LLD and System Design pages where they can author multiple Java classes, create new files, compile with `javac`, run a `Main` runner or custom test harness, and inspect stdout/stderr directly in the browser, testing their designs in real time.

## Context

- Today, LLD pages (`apps/web/app/study/[area]/[id]/lld-project-view.tsx`) and System Design pages show pre-written Java code blocks in read-only syntax-highlighted views.
- Learners cannot edit the code, add new classes (e.g., creating `PaymentGateway.java`, `RefundService.java`, or custom enum files), or execute their code to verify if their object-oriented design and design patterns actually compile and work.
- The DSA pages already have an execution backend (`/api/judge/run` and `apps/web/lib/judge/run.ts`) that invokes local compilers (`javac`, `g++`, Node.js).
- For LLD and System Design, learners need:
  1. A multi-file tabbed editor (create new files, rename/delete files, switch tabs).
  2. Starter skeleton: pre-loaded with the reference project's classes or a clean scaffold with `Main.java`.
  3. Execution endpoint (`/api/judge/run-java-project`): writes all files to a temporary workspace directory, compiles with `javac -Xlint:all *.java`, executes `java -cp . Main`, enforces timeouts and memory limits, and returns stdout/stderr with compilation diagnostics mapped to file names and line numbers.

## Out of scope

- Full Language Server Protocol (LSP) / IntelliSense autocomplete server in the browser.
- Multi-language support for LLD (Java is the standard LLD interview language used across all 24 projects).

## Steps

- [ ] **1. Multi-file Java compilation backend.**
  - Create `apps/web/lib/judge/run-project.ts`:
    - Accepts `{ files: Record<string, string>, mainClass?: string, input?: string }`.
    - Creates a temp directory (e.g. `mkdtemp("lld-run-")`).
    - Writes each file to its respective path (handling sub-packages if necessary).
    - Compiles all `.java` files using `javac -Xlint:all *.java`.
    - If compilation fails, parses error messages into file-specific diagnostics `{ file, line, column, message }`.
    - If compilation succeeds, executes `java -Xmx256m <mainClass>` with strict timeout (5,000ms) and output truncation (500KB).
    - Cleans up the temporary directory after execution.
    - Wire into a new Next.js route: `apps/web/app/api/judge/run-project/route.ts`.
  - Done when: Calling the function compiles a multi-file Java project and returns `{ success: true, output: "..." }`.

- [ ] **2. Multi-file tabbed code editor component.**
  - Create `apps/web/app/components/project-editor.tsx`:
    - Tab bar displaying open files (e.g., `Main.java`, `User.java`, `ParkingLot.java`).
    - Buttons: "+ New Class / File", "Delete File", and "Reset to Reference".
    - Active tab displays the syntax-highlighted editor with line numbers and editor shortcut support.
    - Local storage / database persistence: saves modified user files per problem ID so work is not lost on page reload.
  - Done when: A user can create a new file, edit it, switch tabs, and see persistent edits.

- [ ] **3. Terminal output & test runner panel.**
  - Add an execution console panel below the editor:
    - "Run Code" button (primary action).
    - "Compilation Errors" view with clickable line numbers that focus the editor to the error.
    - Standard Output / Execution Result tab showing program output, execution time in ms, and exit code.
    - Status badges: "Compiled & Executed", "Compilation Error", or "Time Limit Exceeded".
  - Done when: Clicking "Run Code" displays compilation errors or program output within 2-3 seconds.

- [ ] **4. Integration into LLD and System Design study pages.**
  - In `apps/web/app/study/[area]/[id]/page.tsx` and `lld-project-view.tsx`:
    - Add an interactive "Practice / Playground" tab alongside "Walkthrough", "Diagrams", and "Code".
    - Pre-populate files from the 24 LLD projects (`LLD_PROJECTS[id].files`) or the system design Java demos.
    - Allow learners to modify the design or implement missing methods to pass assertions in `Main.java`.
  - Done when: Visiting `/study/lld/lld-parking-lot` or `/study/sd/sdd-rate-limiter` allows interactive editing and running of the Java code.

- [ ] **5. Tests.**
  - In `apps/web/lib/judge/project-run.test.ts`:
    - Test successful multi-file compilation (2+ classes with inheritance/interface references).
    - Test compilation error reporting with exact file and line mappings.
    - Test runtime exception capture (e.g. `NullPointerException` stack trace).
    - Test runaway timeout termination.
  - Done when: `pnpm exec vitest run apps/web/lib/judge/project-run.test.ts` passes.

## Acceptance criteria

- [ ] Learners can create, edit, and delete Java classes in a multi-file tabbed editor on LLD and System Design pages.
- [ ] Clicking "Run" compiles all files with `javac` and executes `Main`.
- [ ] Compilation errors clearly indicate the failing file, line number, and error message.
- [ ] Program execution captures stdout, stderr, execution time, and terminates runaway loops.
- [ ] User code modifications are saved locally and survive page reloads.
- [ ] `pnpm check` passes.

## Open questions

(none)

## Implementation notes

(Implementer fills in)

## Review

(Reviewer fills in)
