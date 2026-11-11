import "server-only";
import { chat as ollamaChat, DEFAULT_OLLAMA_URL, status } from "../ollama";
import type { AiProvider } from "./index";

// Plan 0067: the local provider. A thin wrapper over the loopback Ollama client; nothing leaves the computer.

export const ollamaProvider: AiProvider = {
  id: "ollama",
  label: "This computer (Ollama)",
  cloud: false,
  async detect() {
    try {
      const s = await status(DEFAULT_OLLAMA_URL);
      return s.running ? { found: true, detail: s.version ? `Ollama ${s.version}` : "Ollama is running" } : { found: false, detail: "Ollama is not running" };
    } catch {
      return { found: false, detail: "Ollama is not running" };
    }
  },
  async *chat(messages, opts) {
    if (!opts.model) throw new Error("No model is chosen.");
    yield* ollamaChat(messages, opts.model, opts.url ?? DEFAULT_OLLAMA_URL, opts.signal);
  },
};
