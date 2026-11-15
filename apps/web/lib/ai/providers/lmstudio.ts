import "server-only";
import { DEFAULT_LMSTUDIO_URL, lmChat, lmStatus } from "../openai-local";
import { getAiSettings } from "@/lib/ui-prefs";
import type { AiProvider } from "./index";

// Plan 0078: LM Studio, or any OpenAI-compatible server on this computer. Loopback only; nothing leaves the computer.

export const lmstudioProvider: AiProvider = {
  id: "lmstudio",
  label: "LM Studio or another local server",
  cloud: false,
  async detect() {
    // detect() takes no settings, so it reads the saved address itself (a custom port is honoured).
    const urls = [DEFAULT_LMSTUDIO_URL];
    try {
      const saved = (await getAiSettings()).lmstudioUrl;
      if (saved && saved !== DEFAULT_LMSTUDIO_URL) urls.push(saved);
    } catch {
      // no database: the default address only
    }
    let running = false;
    for (const u of urls) {
      const s = await lmStatus(u);
      if (!s.running) continue;
      running = true;
      if (s.models.length > 0) return { found: true, detail: `${s.models.length} models available` };
    }
    return running ? { found: false, detail: "Server is running but no model is available" } : { found: false, detail: "No local server found" };
  },
  async *chat(messages, opts) {
    if (!opts.model) throw new Error("No model is chosen.");
    yield* lmChat(messages, opts.model, opts.url ?? DEFAULT_LMSTUDIO_URL, opts.signal);
  },
};
