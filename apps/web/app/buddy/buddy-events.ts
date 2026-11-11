import type { BuddyEventType } from "@habit/shared";

const EVENT_NAME = "buddy:event";

export interface BuddyEventDetail {
  text?: string;
}

/** Tell the Buddy companion something happened. No-op on the server. */
export function emitBuddy(type: BuddyEventType, detail?: BuddyEventDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { type, ...detail } }));
}

/** Subscribe to Buddy events. Returns the unsubscribe function. */
export function onBuddy(handler: (type: BuddyEventType, detail?: BuddyEventDetail) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    const d = (e as CustomEvent<{ type: BuddyEventType; text?: string }>).detail;
    if (!d || typeof d.type !== "string") return;
    handler(d.type, d.text === undefined ? undefined : { text: d.text });
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}
