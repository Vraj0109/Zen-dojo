// Test-only helpers: an in-memory D1 that implements just the queries src/auth uses, and key generation.
import type { AuthEnv, D1Db, D1Stmt } from "./types";
import { b64urlEncode } from "./util";

type Row = Record<string, unknown>;

export class FakeD1 implements D1Db {
  users: Row[] = [];
  sessions: Row[] = [];
  oauth_states: Row[] = [];
  auth_codes: Row[] = [];
  queries = 0;

  prepare(sql: string): D1Stmt {
    const q = sql.replace(/\s+/g, " ").trim();
    let args: unknown[] = [];
    const self = this;
    const stmt: D1Stmt = {
      bind(...v: unknown[]) {
        args = v;
        return stmt;
      },
      async first<T>() {
        self.queries++;
        return (self.exec(q, args).rows[0] ?? null) as T | null;
      },
      async run() {
        self.queries++;
        return { success: true, meta: { changes: self.exec(q, args).changes } };
      },
      async all<T>() {
        self.queries++;
        return { results: self.exec(q, args).rows as T[] };
      },
    };
    return stmt;
  }

  private exec(q: string, a: unknown[]): { rows: Row[]; changes: number } {
    const out = (rows: Row[], changes = rows.length) => ({ rows, changes });
    if (q.startsWith("INSERT INTO oauth_states")) {
      if (this.oauth_states.some((r) => r.state === a[0])) throw new Error("UNIQUE constraint failed");
      this.oauth_states.push({ state: a[0], redirect_uri: a[1], code_challenge: a[2], created_at: a[3] });
      return out([], 1);
    }
    if (q.startsWith("DELETE FROM oauth_states WHERE state")) {
      const i = this.oauth_states.findIndex((r) => r.state === a[0]);
      if (i < 0) return out([]);
      const [r] = this.oauth_states.splice(i, 1);
      return out([r]);
    }
    if (q.startsWith("DELETE FROM oauth_states WHERE created_at")) {
      this.oauth_states = this.oauth_states.filter((r) => (r.created_at as number) >= (a[0] as number));
      return out([], 0);
    }
    if (q.startsWith("DELETE FROM auth_codes")) {
      this.auth_codes = this.auth_codes.filter((r) => (r.expires_at as number) >= (a[0] as number));
      return out([], 0);
    }
    if (q.startsWith("INSERT INTO users")) {
      const i = this.users.findIndex((r) => r.id === a[0]);
      if (i >= 0) {
        Object.assign(this.users[i], { name: a[2], avatar_url: a[3], last_login_at: a[5] });
        return out([], 1);
      }
      this.users.push({ id: a[0], github_id: a[1], name: a[2], avatar_url: a[3], created_at: a[4], last_login_at: a[5] });
      return out([], 1);
    }
    if (q.startsWith("SELECT id, name, avatar_url FROM users")) {
      const r = this.users.find((u) => u.id === a[0]);
      return out(r ? [{ id: r.id, name: r.name, avatar_url: r.avatar_url }] : []);
    }
    if (q.startsWith("INSERT INTO auth_codes")) {
      this.auth_codes.push({
        code_hash: a[0],
        user_id: a[1],
        redirect_uri: a[2],
        code_challenge: a[3],
        expires_at: a[4],
        used_at: null,
      });
      return out([], 1);
    }
    if (q.startsWith("UPDATE auth_codes SET used_at")) {
      const r = this.auth_codes.find((c) => c.code_hash === a[1] && c.used_at === null && (c.expires_at as number) > (a[2] as number));
      if (!r) return out([]);
      r.used_at = a[0];
      return out([{ user_id: r.user_id, code_challenge: r.code_challenge }]);
    }
    if (q.startsWith("INSERT INTO sessions")) {
      this.sessions.push({
        id: a[0],
        user_id: a[1],
        refresh_hash: a[2],
        prev_refresh_hash: null,
        device_name: a[3],
        created_at: a[4],
        last_seen_at: a[5],
        expires_at: a[6],
        revoked_at: null,
      });
      return out([], 1);
    }
    if (q.startsWith("SELECT id, user_id, refresh_hash, prev_refresh_hash")) {
      const r = this.sessions.find((s) => s.refresh_hash === a[0] || s.prev_refresh_hash === a[1]);
      return out(r ? [{ ...r }] : []);
    }
    if (q.startsWith("UPDATE sessions SET prev_refresh_hash")) {
      const r = this.sessions.find((s) => s.id === a[3] && s.refresh_hash === a[4] && s.revoked_at === null);
      if (!r) return out([], 0);
      Object.assign(r, { prev_refresh_hash: r.refresh_hash, refresh_hash: a[0], last_seen_at: a[1], expires_at: a[2] });
      return out([], 1);
    }
    if (q.startsWith("UPDATE sessions SET revoked_at = ? WHERE id = ? AND user_id")) {
      const r = this.sessions.find((s) => s.id === a[1] && s.user_id === a[2] && s.revoked_at === null);
      if (!r) return out([], 0);
      r.revoked_at = a[0];
      return out([], 1);
    }
    if (q.startsWith("UPDATE sessions SET revoked_at = ? WHERE id = ?")) {
      const r = this.sessions.find((s) => s.id === a[1] && s.revoked_at === null);
      if (!r) return out([], 0);
      r.revoked_at = a[0];
      return out([], 1);
    }
    if (q.startsWith("UPDATE sessions SET revoked_at = ? WHERE (refresh_hash")) {
      let n = 0;
      for (const s of this.sessions) {
        if ((s.refresh_hash === a[1] || s.prev_refresh_hash === a[2]) && s.revoked_at === null) {
          s.revoked_at = a[0];
          n++;
        }
      }
      return out([], n);
    }
    if (q.startsWith("SELECT id, device_name, created_at, last_seen_at FROM sessions")) {
      const rows = this.sessions
        .filter((s) => s.user_id === a[0] && s.revoked_at === null && (s.expires_at as number) > (a[1] as number))
        .sort((x, y) => (y.last_seen_at as number) - (x.last_seen_at as number));
      return out(rows.map((s) => ({ id: s.id, device_name: s.device_name, created_at: s.created_at, last_seen_at: s.last_seen_at })));
    }
    throw new Error("FakeD1: unhandled query: " + q);
  }
}

export async function makeKeys(): Promise<{ priv: string; pub: string }> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const priv = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const pub = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return { priv: JSON.stringify(priv), pub: JSON.stringify({ kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y }) };
}

export async function makeEnv(extra: Partial<AuthEnv> = {}): Promise<AuthEnv & { DB: FakeD1 }> {
  const keys = await makeKeys();
  return {
    DB: new FakeD1(),
    GITHUB_CLIENT_ID: "client-id",
    GITHUB_CLIENT_SECRET: "client-secret",
    JWT_PRIVATE_JWK: keys.priv,
    JWT_PUBLIC_JWK: keys.pub,
    ADMIN_USER_IDS: "gh:1",
    ...extra,
  } as AuthEnv & { DB: FakeD1 };
}

export const ctx = { waitUntil: (p: Promise<unknown>) => void p.catch(() => undefined) };

export async function pkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = b64urlEncode(crypto.getRandomValues(new Uint8Array(32)));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return { verifier, challenge: b64urlEncode(digest) };
}
