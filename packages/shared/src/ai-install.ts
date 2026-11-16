/**
 * How to install the AI tools the chat can use, per operating system. Pure data, no I/O.
 * Commands were read from each project's own README on 2026-11-11 (Claude Code, Gemini CLI, Codex CLI, Ollama);
 * the DeepSeek tags exist on ollama.com/library/deepseek-r1. Nothing here runs by itself: the screen only shows the
 * command for the user to copy.
 */
export type OsId = "win32" | "darwin" | "linux";
export const OS_IDS: readonly OsId[] = ["win32", "darwin", "linux"];
export const OS_LABEL: Record<OsId, string> = { win32: "Windows", darwin: "macOS", linux: "Linux" };

export const toOsId = (platform: string | undefined): OsId => (platform === "win32" || platform === "darwin" ? platform : "linux");

export interface InstallCommand {
  command: string;
  /** One plain sentence about this way of installing (needs Node, needs Homebrew...). */
  note?: string;
}

export interface AiInstallItem {
  id: string;
  name: string;
  /** cloud-cli: sends the chat to a company; local-engine / local-model: runs on this computer. */
  kind: "cloud-cli" | "local-engine" | "local-model";
  /** The provider id used by the chat when this tool can answer ("claude", "gemini", "codex", "ollama"); empty for models. */
  providerId: string;
  blurb: string;
  docsUrl: string;
  commands: Record<OsId, InstallCommand[]>;
  /** What to do once it is installed. */
  afterInstall: string;
}

const NODE_NOTE = "Needs Node.js (nodejs.org).";

export const AI_INSTALL: readonly AiInstallItem[] = [
  {
    id: "claude",
    name: "Claude Code (Anthropic)",
    kind: "cloud-cli",
    providerId: "claude",
    blurb: "Anthropic's assistant. Uses your Claude account. The chat sends your question and the lesson or problem text to Anthropic.",
    docsUrl: "https://docs.anthropic.com/en/docs/claude-code",
    commands: {
      win32: [{ command: "winget install Anthropic.ClaudeCode" }, { command: "irm https://claude.ai/install.ps1 | iex", note: "In PowerShell." }],
      darwin: [{ command: "brew install --cask claude-code", note: "Needs Homebrew." }, { command: "curl -fsSL https://claude.ai/install.sh | bash" }],
      linux: [{ command: "curl -fsSL https://claude.ai/install.sh | bash" }, { command: "npm install -g @anthropic-ai/claude-code", note: NODE_NOTE }],
    },
    afterInstall: "Open a new terminal, run `claude` once and sign in. Then restart Zen Dojo and press Check again.",
  },
  {
    id: "gemini",
    name: "Gemini CLI (Google)",
    kind: "cloud-cli",
    providerId: "gemini",
    blurb: "Google's assistant. Uses your Google account. The chat sends your question and the lesson or problem text to Google.",
    docsUrl: "https://github.com/google-gemini/gemini-cli",
    commands: {
      win32: [{ command: "npm install -g @google/gemini-cli", note: NODE_NOTE }],
      darwin: [{ command: "brew install gemini-cli", note: "Needs Homebrew." }, { command: "npm install -g @google/gemini-cli", note: NODE_NOTE }],
      linux: [{ command: "npm install -g @google/gemini-cli", note: NODE_NOTE }, { command: "brew install gemini-cli", note: "If you use Homebrew on Linux." }],
    },
    afterInstall: "Open a new terminal, run `gemini` once and sign in with Google. Then restart Zen Dojo and press Check again. Not yet tested by us: use the Test button.",
  },
  {
    id: "codex",
    name: "Codex CLI (OpenAI, ChatGPT)",
    kind: "cloud-cli",
    providerId: "codex",
    blurb: "OpenAI's assistant. Uses your ChatGPT account. The chat sends your question and the lesson or problem text to OpenAI.",
    docsUrl: "https://github.com/openai/codex",
    commands: {
      win32: [{ command: 'powershell -ExecutionPolicy ByPass -c "irm https://chatgpt.com/codex/install.ps1 | iex"' }, { command: "npm install -g @openai/codex", note: NODE_NOTE }],
      darwin: [{ command: "curl -fsSL https://chatgpt.com/codex/install.sh | sh" }, { command: "npm install -g @openai/codex", note: NODE_NOTE }],
      linux: [{ command: "curl -fsSL https://chatgpt.com/codex/install.sh | sh" }, { command: "npm install -g @openai/codex", note: NODE_NOTE }],
    },
    afterInstall: "Open a new terminal, run `codex` once and sign in with ChatGPT. Then restart Zen Dojo and press Check again. Not yet tested by us: use the Test button.",
  },
  {
    id: "ollama",
    name: "Ollama (runs models on this computer)",
    kind: "local-engine",
    providerId: "ollama",
    blurb: "The engine behind the default local AI. Free, private, nothing leaves your computer. Needs a model (see below).",
    docsUrl: "https://ollama.com/download",
    commands: {
      win32: [{ command: "irm https://ollama.com/install.ps1 | iex", note: "In PowerShell. Or use the installer from ollama.com/download." }],
      darwin: [{ command: "brew install ollama", note: "Needs Homebrew. Or use the app from ollama.com/download." }],
      linux: [{ command: "curl -fsSL https://ollama.com/install.sh | sh" }],
    },
    afterInstall: "Start Ollama, then press Check again and download a model.",
  },
  {
    id: "deepseek",
    name: "DeepSeek R1 (local model through Ollama)",
    kind: "local-model",
    providerId: "",
    blurb: "A reasoning model that shows its thinking first, so answers start slower. Runs on this computer. The 8B size needs about 8 GB of free memory.",
    docsUrl: "https://ollama.com/library/deepseek-r1",
    commands: {
      win32: [{ command: "ollama pull deepseek-r1:8b" }, { command: "ollama pull deepseek-r1:14b", note: "Bigger, needs about 12 GB." }],
      darwin: [{ command: "ollama pull deepseek-r1:8b" }, { command: "ollama pull deepseek-r1:14b", note: "Bigger, needs about 12 GB." }],
      linux: [{ command: "ollama pull deepseek-r1:8b" }, { command: "ollama pull deepseek-r1:14b", note: "Bigger, needs about 12 GB." }],
    },
    afterInstall: "Run the command in a terminal, press Check again, then pick the model in the Model list.",
  },
];

export function installCommands(item: AiInstallItem, os: OsId): InstallCommand[] {
  return item.commands[os] ?? [];
}
