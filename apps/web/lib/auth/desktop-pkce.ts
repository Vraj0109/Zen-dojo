// Desktop only (HABIT_DESKTOP=1): keep the PKCE verifier on the local server as well as in the zd_pkce cookie, so a
// sign-in still finishes when the cookie set on the cancelled redirect is not kept. The desktop server is one process
// with one user, so a module-level map is enough. Never used by the hosted site.

const TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 20;

export interface DesktopPkce {
  verifier: string;
  next: string;
}

type Entry = DesktopPkce & { at: number };

const g = globalThis as typeof globalThis & { zdDesktopPkce?: Map<string, Entry> };

function store(): Map<string, Entry> {
  if (!g.zdDesktopPkce) g.zdDesktopPkce = new Map();
  return g.zdDesktopPkce;
}

export function rememberDesktopPkce(state: string, value: DesktopPkce): void {
  const m = store();
  const now = Date.now();
  for (const [k, e] of m) if (now - e.at > TTL_MS) m.delete(k);
  m.delete(state);
  m.set(state, { ...value, at: now });
  // Maps keep insertion order, so the first key is the oldest.
  while (m.size > MAX_ENTRIES) m.delete(m.keys().next().value as string);
}

/** Single use: the entry is removed whether or not it has expired. */
export function takeDesktopPkce(state: string): DesktopPkce | null {
  const m = store();
  const e = m.get(state);
  if (!e) return null;
  m.delete(state);
  if (Date.now() - e.at > TTL_MS) return null;
  return { verifier: e.verifier, next: e.next };
}

/** Tests only. */
export function clearDesktopPkce(): void {
  store().clear();
}
