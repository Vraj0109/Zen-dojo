import "server-only";
import type { AiProvider } from "./index";

// Antigravity (agy). NOT OFFERED (checked 2026-11-11, agy 1.5.x): its headless mode takes the prompt as the
// argument of -p (stdin is ignored), and no flag turns its tools off. In `--mode plan --sandbox` it still ran
// shell commands (run_command) in the empty folder, and it has file-write and browser tools. Plan 0067 says a
// tool that cannot be restricted is not offered, so detect() says no and chat() refuses. See docs/local-ai.md.
const REASON = "Not offered: Antigravity cannot be locked to chat only (no way to turn its tools off, and the prompt cannot be sent on stdin).";

export const agyProvider: AiProvider = {
  id: "agy",
  label: "Antigravity",
  cloud: true,
  async detect() {
    return { found: false, detail: REASON };
  },
  async *chat() {
    throw new Error(REASON);
  },
};
