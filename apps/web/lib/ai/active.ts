// Plan 0078: the message shape for the local provider. Pure, no I/O.
import { foldSystemIntoUser, type ChatMessage } from "@habit/shared";
import type { AiSettings } from "@/lib/ui-prefs";

/** Applies "My model ignores the app's instructions" when it is on. */
export function prepareMessages(messages: ChatMessage[], s: AiSettings): ChatMessage[] {
  return s.foldSystem ? foldSystemIntoUser(messages) : messages;
}
