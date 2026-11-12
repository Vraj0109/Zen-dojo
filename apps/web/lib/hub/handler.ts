import "server-only";
import { after } from "next/server";
import worker, { type Env, type ExecutionContext } from "@habit/sync-worker";
import { getHubDb } from "./db";
import { createD1FromLibsql } from "./d1";
import { createRateLimiter } from "./rate-limit";

// Runs the sync Worker's own fetch handler inside the site (plan 0073). The Worker's route matching is unchanged:
// this file only strips the "/hub" prefix, builds the Worker's Env from process.env, and swaps D1 and the rate-limit
// bindings for the hub's libSQL database.

export const HUB_PREFIX = "/hub";

// Same limits as the retired wrangler.jsonc bindings: requests per 60 seconds.
const LIMIT_AUTH = 20;
const LIMIT_SYNC = 60;
const LIMIT_IP = 300;
const PERIOD_SECONDS = 60;

/** Removes the "/hub" prefix so the Worker sees the paths it always saw ("/auth/...", "/api/sync", ...). */
export function stripHubPrefix(pathname: string): string {
  if (pathname === HUB_PREFIX) return "/";
  if (pathname.startsWith(HUB_PREFIX + "/")) return pathname.slice(HUB_PREFIX.length);
  return pathname;
}

/**
 * The Worker rate-limits and bans by the "CF-Connecting-IP" header. Here that header would be client-controlled, so it
 * is dropped and rebuilt from what Vercel's edge sets (these overwrite any client value on Vercel).
 */
function trustedIp(headers: Headers): string | null {
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  const vercel = headers.get("x-vercel-forwarded-for") ?? headers.get("x-forwarded-for");
  const first = vercel?.split(",")[0]?.trim();
  return first || null;
}

function toWorkerRequest(request: Request): Request {
  const url = new URL(request.url);
  url.pathname = stripHubPrefix(url.pathname);
  const headers = new Headers(request.headers);
  const ip = trustedIp(headers);
  headers.delete("cf-connecting-ip");
  if (ip) headers.set("CF-Connecting-IP", ip);
  const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.body !== null;
  const init: RequestInit & { duplex?: "half" } = { method: request.method, headers };
  if (hasBody) {
    init.body = request.body;
    init.duplex = "half";
  }
  return new Request(url, init);
}

function waitUntil(promise: Promise<unknown>): void {
  const safe = promise.catch(() => {});
  try {
    after(() => safe);
  } catch {
    // Outside a request scope (unit tests, scripts): the promise just runs on its own.
  }
}

/** Builds the Worker's Env. Secrets come from process.env; nothing is read at import time. */
export async function buildHubEnv(): Promise<Env> {
  const client = await getHubDb();
  const e = process.env;
  return {
    DB: createD1FromLibsql(client) as unknown as Env["DB"],
    GITHUB_CLIENT_ID: e.GITHUB_CLIENT_ID ?? "",
    GITHUB_CLIENT_SECRET: e.GITHUB_CLIENT_SECRET ?? "",
    JWT_PRIVATE_JWK: e.JWT_PRIVATE_JWK ?? "",
    JWT_PUBLIC_JWK: e.JWT_PUBLIC_JWK ?? "",
    ADMIN_USER_IDS: e.ADMIN_USER_IDS,
    ALLOWED_REDIRECTS: e.ALLOWED_REDIRECTS,
    ALLOWED_ORIGIN: e.ALLOWED_ORIGIN,
    RL_AUTH: createRateLimiter(client, "auth", LIMIT_AUTH, PERIOD_SECONDS),
    RL_SYNC: createRateLimiter(client, "sync", LIMIT_SYNC, PERIOD_SECONDS),
    RL_IP: createRateLimiter(client, "ip", LIMIT_IP, PERIOD_SECONDS),
  };
}

/** Handles one request addressed to "/hub/...": same responses the deployed Worker gave for the stripped path. */
export async function hubFetch(request: Request): Promise<Response> {
  const env = await buildHubEnv();
  const ctx: ExecutionContext = { waitUntil };
  return worker.fetch(toWorkerRequest(request), env, ctx);
}
