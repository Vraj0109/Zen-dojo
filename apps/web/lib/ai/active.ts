// Plan 0078: the model, address and message shape for the chosen local provider. Pure, no I/O.
import { foldSystemIntoUser, type ChatMessage } from "@habit/shared";
import type { AiSettings } from "@/lib/ui-prefs";

/** The model to send: LM Studio's when it is the provider, Ollama's otherwise. */
export function activeModel(s: AiSettings): string {
  return s.provider === "lmstudio" ? s.lmstudioModel : s.model;
}

/** The loopback address to call: LM Studio's when it is the provider, Ollama's otherwise. */
export function activeUrl(s: AiSettings): string {
  return s.provider === "lmstudio" ? s.lmstudioUrl : s.url;
}

/** Applies "My model ignores the app's instructions" when it is on. */
export function prepareMessages(messages: ChatMessage[], s: AiSettings): ChatMessage[] {
  return s.foldSystem ? foldSystemIntoUser(messages) : messages;
}
