import "server-only";
import type { ChatMessage } from "@habit/shared";
import { agyProvider } from "./agy";
import { claudeProvider } from "./claude";
import { codexProvider } from "./codex";
import { geminiProvider } from "./gemini";
import { ollamaProvider } from "./ollama";

// Plan 0067: who answers the chat. Server-only. The AI tools are in PROVIDERS below (cli.ts is their shared runner).

// TODO(remove after ui-prefs lands): import { AiProviderId } from "@/lib/ui-prefs" instead of this copy.
export type AiProviderId = "ollama" | "claude" | "agy" | "gemini" | "codex";
export const AI_PROVIDER_IDS: readonly AiProviderId[] = ["ollama", "claude", "agy", "gemini", "codex"];

export interface AiProvider {
  id: AiProviderId;
  label: string;
  cloud: boolean;
  detect(): Promise<{ found: boolean; detail?: string }>;
  chat(messages: ChatMessage[], opts: { signal: AbortSignal; model?: string; url?: string }): AsyncGenerator<string>;
}

const PROVIDERS: Partial<Record<AiProviderId, AiProvider>> = {
  ollama: ollamaProvider,
  claude: claudeProvider,
  agy: agyProvider,
  gemini: geminiProvider,
  codex: codexProvider,
};

export function getProvider(id: AiProviderId): AiProvider {
  const p = PROVIDERS[id];
  if (!p) throw new Error(`Unknown AI provider: ${String(id)}`);
  return p;
}

/** Which providers exist on this computer. Never throws; each check gives up after 3 seconds. */
export async function detectProviders(): Promise<{ id: AiProviderId; label: string; found: boolean; cloud: boolean }[]> {
  const list = AI_PROVIDER_IDS.map((id) => PROVIDERS[id]).filter((p): p is AiProvider => Boolean(p));
  return Promise.all(
    list.map(async (p) => {
      let found = false;
      try {
        const r = await Promise.race([p.detect(), new Promise<{ found: boolean }>((res) => setTimeout(() => res({ found: false }), 3000).unref?.())]);
        found = r.found;
      } catch {
        found = false;
      }
      return { id: p.id, label: p.label, found, cloud: p.cloud };
    }),
  );
}
