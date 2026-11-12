import "server-only";
import type { PortfolioData } from "@habit/shared";
import { getPortfolio } from "./portfolio";

// Opt-in public profile (plan 0069). The owner uploads the PortfolioData snapshot to the sync Worker; the Worker serves it
// at GET /api/public/u/:id. Nothing here reads notes, code, emails or tokens: only getPortfolio() output goes up.

const DEFAULT_WORKER = "https://zen-dojo-sync.habit-sync-worker.workers.dev";
const PUBLIC_ID_RE = /^[A-Za-z0-9_-]{16,40}$/;

export function publicWorkerUrl(): string {
  return process.env.SYNC_WORKER_URL || process.env.AUTH_WORKER_URL || DEFAULT_WORKER;
}

export function isPublicProfileId(id: string): boolean {
  return PUBLIC_ID_RE.test(id);
}

/** Path of the public page for an id. */
export function publicProfilePath(id: string): string {
  return `/u/${encodeURIComponent(id)}`;
}

/** Full public link, using PUBLIC_SITE_URL (the hosted site) when set, else the given fallback origin (empty gives a path). */
export function publicProfileLink(id: string, fallbackOrigin = ""): string {
  const base = (process.env.PUBLIC_SITE_URL || fallbackOrigin).replace(/\/+$/, "");
  return `${base}${publicProfilePath(id)}`;
}

/** Fetches a public snapshot from the Worker. Returns null when private, missing or unreachable. */
export async function fetchPublicProfile(id: string, fetchFn: typeof fetch = fetch): Promise<PortfolioData | null> {
  if (!isPublicProfileId(id)) return null;
  try {
    const res = await fetchFn(new URL(`/api/public/u/${id}`, publicWorkerUrl()).toString(), {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { ok?: boolean; data?: PortfolioData };
    return body.ok && body.data && typeof body.data.name === "string" ? body.data : null;
  } catch {
    return null;
  }
}

export type PublicProfileState = { ok: true; enabled: boolean; id: string | null } | { ok: false; error: string };

async function callWorker(method: "GET" | "PUT" | "DELETE", body?: unknown): Promise<PublicProfileState> {
  const { workerFetch } = await import("./auth/session");
  try {
    const res = await workerFetch("/api/profile/public", {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; enabled?: boolean; id?: string; error?: string } | null;
    if (res.status === 401) return { ok: false, error: "Sign in to your Zen Dojo account first." };
    if (!res.ok || !json?.ok) return { ok: false, error: json?.error === "invalid_profile" ? "The profile data was rejected." : "Could not reach the server. Try again." };
    return { ok: true, enabled: Boolean(json.enabled), id: json.id ?? null };
  } catch {
    return { ok: false, error: "Could not reach the server. Try again." };
  }
}

export const getPublicProfileState = () => callWorker("GET");
export const unpublishPublicProfile = () => callWorker("DELETE");

/** Uploads the current snapshot (turns the public profile on, or refreshes it). */
export async function publishPublicProfile(): Promise<PublicProfileState> {
  return callWorker("PUT", { data: await getPortfolio() });
}
