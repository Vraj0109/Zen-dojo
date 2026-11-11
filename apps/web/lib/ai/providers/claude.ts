import "server-only";
import { cliProvider } from "./cli-provider";

// Claude Code. Flags checked with `claude --help` and a real run on 2026-11-11 (see docs/local-ai.md).
// --tools "" removes every built-in tool; --strict-mcp-config with no config loads no MCP servers;
// --setting-sources "" loads no user/project settings or hooks; --no-session-persistence saves nothing to disk.
export const claudeProvider = cliProvider({
  id: "claude",
  label: "Claude Code",
  program: "claude",
  args: [
    "-p",
    "--no-session-persistence",
    "--tools",
    "",
    "--strict-mcp-config",
    "--disable-slash-commands",
    "--setting-sources",
    "",
    "--output-format",
    "stream-json",
    "--include-partial-messages",
    "--verbose",
  ],
  output: "claude-stream-json",
});
