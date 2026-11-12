// Bring-your-own-key (hosted site). Browser side. The key lives ONLY in this browser's localStorage: it is sent in a
// request header with the person's own AI requests and is never saved by the server, never put in the database and
// never synced. Every storage call is wrapped in try/catch (private windows and blocked storage must not break the page).

export type ByokProviderId = "anthropic" | "openai" | "gemini";
export const BYOK_PROVIDER_IDS: readonly ByokProviderId[] = ["anthropic", "openai", "gemini"];
export const isByokProviderId = (v: unknown): v is ByokProviderId => typeof v === "string" && (BYOK_PROVIDER_IDS as readonly string[]).includes(v);

export interface ByokProviderInfo {
  id: ByokProviderId;
  label: string;
  defaultModel: string;
  keyUrl: string;
  keyUrlLabel: string;
  keyHint: string;
  steps: string[];
  cost: string;
}

// Default models and console pages checked against the providers' current docs on 2026-11-12 (see the plan notes).
export const BYOK_PROVIDERS: Record<ByokProviderId, ByokProviderInfo> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    defaultModel: "claude-haiku-5-5",
    keyUrl: "https://platform.claude.com/settings/keys",
    keyUrlLabel: "platform.claude.com/settings/keys",
    keyHint: "Starts with sk-ant-",
    steps: ["Sign in to the Claude Console and add a little credit under Billing.", "Open API keys and press Create key.", "Copy the key right away; it is shown once."],
    cost: "Pay-as-you-go: Anthropic bills your account for the tokens you use. A chat answer on the default model costs a fraction of a cent.",
  },
  openai: {
    id: "openai",
    label: "OpenAI (GPT)",
    defaultModel: "gpt-5.4-mini",
    keyUrl: "https://platform.openai.com/api-keys",
    keyUrlLabel: "platform.openai.com/api-keys",
    keyHint: "Starts with sk-",
    steps: ["Sign in to the OpenAI Platform and add a little credit under Billing.", "Open API keys and press Create new secret key.", "Copy the key right away; it is shown once."],
    cost: "Pay-as-you-go: OpenAI bills your account for the tokens you use. A chat answer on the default model costs a fraction of a cent.",
  },
  gemini: {
    id: "gemini",
    label: "Google (Gemini)",
    defaultModel: "gemini-3.5-flash-lite",
    keyUrl: "https://aistudio.google.com/apikey",
    keyUrlLabel: "aistudio.google.com/apikey",
    keyHint: "Starts with AIza",
    steps: ["Sign in to Google AI Studio.", "Open Get API key and press Create API key.", "Copy the key."],
    cost: "Pay-as-you-go through Google: usage is billed by Google (some models have a free tier with limits). A chat answer on the default model costs a fraction of a cent.",
  },
};

export interface ByokConfig {
  provider: ByokProviderId;
  key: string;
  /** Empty means "use the provider's default model". */
  model: string;
}

export const BYOK_STORAGE_KEY = "zd-ai-byok-v1";
export const BYOK_CHANGE_EVENT = "zd-ai-byok-change";
export const BYOK_PRIVACY_LINE = "Stored only in this browser, sent only with your own AI requests, never saved by us.";

const KEY_RE = /^[A-Za-z0-9._~+/=-]{8,512}$/;
const MODEL_RE = /^[A-Za-z0-9._:/-]{1,80}$/;
export const isValidKey = (k: string): boolean => KEY_RE.test(k);
export const isValidModel = (m: string): boolean => m === "" || MODEL_RE.test(m);

/** Pure. Parse the stored string; anything malformed gives null. */
export function parseByok(raw: string | null): ByokConfig | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as { provider?: unknown; key?: unknown; model?: unknown };
    if (!isByokProviderId(v.provider) || typeof v.key !== "string" || !isValidKey(v.key)) return null;
    const model = typeof v.model === "string" && isValidModel(v.model) ? v.model : "";
    return { provider: v.provider, key: v.key, model };
  } catch {
    return null;
  }
}

/** The raw stored string (stable for useSyncExternalStore). Null when unset or storage is unavailable. */
export function readByokRaw(): string | null {
  try {
    return window.localStorage.getItem(BYOK_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function loadByok(): ByokConfig | null {
  return parseByok(readByokRaw());
}

function notify(): void {
  try {
    window.dispatchEvent(new Event(BYOK_CHANGE_EVENT));
  } catch {
    /* no window */
  }
}

/** Returns false when the key or model is not acceptable or the browser refuses to store it. */
export function saveByok(cfg: ByokConfig): boolean {
  const key = cfg.key.trim();
  const model = cfg.model.trim();
  if (!isByokProviderId(cfg.provider) || !isValidKey(key) || !isValidModel(model)) return false;
  try {
    window.localStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify({ provider: cfg.provider, key, model }));
  } catch {
    return false;
  }
  notify();
  return true;
}

/** "Forget my key": removes it from this browser. */
export function forgetByok(): void {
  try {
    window.localStorage.removeItem(BYOK_STORAGE_KEY);
  } catch {
    /* nothing to remove */
  }
  notify();
}

export function subscribeByok(cb: () => void): () => void {
  window.addEventListener(BYOK_CHANGE_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(BYOK_CHANGE_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** The request headers that carry the key for ONE request. Empty when there is no key. */
export function byokHeaders(cfg: ByokConfig | null): Record<string, string> {
  if (!cfg) return {};
  const h: Record<string, string> = { "x-ai-provider": cfg.provider, "x-ai-key": cfg.key };
  if (cfg.model) h["x-ai-model"] = cfg.model;
  return h;
}

/** Headers for the current browser's saved key, or none. Safe to spread into any /api/ai fetch. */
export function currentByokHeaders(): Record<string, string> {
  return byokHeaders(loadByok());
}
