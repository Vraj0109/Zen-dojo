import "server-only";
import { cliProvider } from "./cli-provider";

// Codex CLI. UNVERIFIED: not installed on the development machine. Documented headless mode: `codex exec -`
// reads the prompt from stdin; `--sandbox read-only` stops writes and `--skip-git-repo-check` allows the empty
// temp folder. If a flag is wrong the command fails, the Test button shows it, and the provider is not selectable.
export const codexProvider = cliProvider({
  id: "codex",
  label: "Codex CLI",
  program: "codex",
  args: ["exec", "--sandbox", "read-only", "--skip-git-repo-check", "-"],
  output: "text",
});
