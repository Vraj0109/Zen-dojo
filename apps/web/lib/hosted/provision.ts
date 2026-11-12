import { createHash } from "node:crypto";
import type { Client } from "@libsql/client";
import { getHostedUser, insertHostedUser } from "./control";

/** Provisions one Turso database per user (plan 0058). Never logs tokens. */
export type ProvisionEnv = Record<string, string | undefined>;
export type ProvisionDeps = { fetch?: typeof fetch; env?: ProvisionEnv; sleep?: (ms: number) => Promise<void>; attempts?: number };

const API = "https://api.turso.tech/v1/organizations";

/** A stable, provider-safe name: lowercase letters, digits and dashes, at most 64 characters. */
export function dbNameFor(userId: string): string {
  return "zd-" + createHash("sha256").update(userId).digest("hex").slice(0, 24);
}

function cfg(env: ProvisionEnv) {
  const token = env.TURSO_API_TOKEN;
  const org = env.TURSO_ORG;
  const group = env.TURSO_GROUP;
  if (!token || !org || !group) throw new Error("Hosted database is not configured (TURSO_API_TOKEN, TURSO_ORG, TURSO_GROUP)");
  return { token, org, group };
}

type DbBody = { database?: { Hostname?: string } } | null;

/** Creates the user's database (409 means it already exists), waits until the provider can see it, returns its libsql URL. */
export async function provisionUserDb(userId: string, deps: ProvisionDeps = {}): Promise<string> {
  const f = deps.fetch ?? fetch;
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const { token, org, group } = cfg(deps.env ?? process.env);
  const name = dbNameFor(userId);
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const base = `${API}/${encodeURIComponent(org)}/databases`;

  const created = await f(base, { method: "POST", headers, body: JSON.stringify({ name, group }) });
  if (!created.ok && created.status !== 409) {
    throw new Error(`Could not create your database (provider status ${created.status}). Try again in a minute.`);
  }
  let hostname: string | undefined;
  if (created.ok) hostname = ((await created.json().catch(() => null)) as DbBody)?.database?.Hostname;
  const attempts = deps.attempts ?? 10;
  for (let i = 0; i < attempts; i++) {
    const res = await f(`${base}/${name}`, { headers });
    if (res.ok) {
      hostname = ((await res.json().catch(() => null)) as DbBody)?.database?.Hostname ?? hostname;
      if (!hostname) throw new Error("Your database was created but the provider gave no address.");
      return `libsql://${hostname}`;
    }
    await sleep(500);
  }
  throw new Error("Your database is not ready yet. Try again in a minute.");
}

/** A short-lived full-access token for one user's database. */
export async function mintDbToken(userId: string, deps: ProvisionDeps = {}): Promise<string> {
  const f = deps.fetch ?? fetch;
  const { token, org } = cfg(deps.env ?? process.env);
  const res = await f(`${API}/${encodeURIComponent(org)}/databases/${dbNameFor(userId)}/auth/tokens?expiration=1d`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Could not open your database (provider status ${res.status}).`);
  const body = (await res.json()) as { jwt?: string };
  if (!body.jwt) throw new Error("Could not open your database (no token).");
  return body.jwt;
}

/** The user's database URL: reuse the control row, else provision and record it. */
export async function ensureUserDbUrl(control: Client, userId: string, deps: ProvisionDeps = {}): Promise<string> {
  const existing = await getHostedUser(control, userId);
  if (existing) return existing.dbUrl;
  const url = await provisionUserDb(userId, deps);
  await insertHostedUser(control, userId, url);
  return (await getHostedUser(control, userId))?.dbUrl ?? url;
}
