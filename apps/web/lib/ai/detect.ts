/** Which AI choices the page offers. Hosted: only "Your own API key". Otherwise the local tools (loaded lazily so the hosted bundle never pulls in child_process). */
export interface ProviderChoice {
  id: string;
  label: string;
  found: boolean;
  cloud: boolean;
}

export async function detectProviders(): Promise<ProviderChoice[]> {
  if (process.env.HABIT_HOSTED === "1") return [{ id: "byok", label: "Your own API key", found: true, cloud: true }];
  const m = await import("@/lib/ai/providers");
  return m.detectProviders();
}

/** The provider id the chat should show: "byok" on the hosted site, else the saved one. */
export const hostedProviderId = "byok";
