import "server-only";
import { cliProvider } from "./cli-provider";

// Gemini CLI. UNVERIFIED: not installed on the development machine. Documented headless mode: `gemini -p <prompt>`
// with extra text piped on stdin; `--approval-mode plan` is its read-only mode. If a flag is wrong the command
// fails, the Test button shows it, and the provider is not selectable (it fails closed).
export const geminiProvider = cliProvider({
  id: "gemini",
  label: "Gemini CLI",
  program: "gemini",
  args: ["--approval-mode", "plan", "-p", "Answer the conversation given on standard input."],
  output: "text",
});
