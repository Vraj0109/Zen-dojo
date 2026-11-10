// Minimal local types so src/auth stands alone (structurally compatible with the Worker Env and D1).

export interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
  all<T = Record<string, unknown>>(): Promise<{ results?: T[] }>;
}
export interface D1Db {
  prepare(query: string): D1Stmt;
}
export interface AuthCtx {
  waitUntil(promise: Promise<unknown>): void;
}

export interface AuthEnv {
  DB: D1Db;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  /** Secret. ES256 private key as a JWK JSON string. */
  JWT_PRIVATE_JWK: string;
  /** Var. Matching public key as a JWK JSON string. */
  JWT_PUBLIC_JWK: string;
  /** Comma list of user ids, for example "gh:12345". */
  ADMIN_USER_IDS?: string;
  /** Comma list of extra exact redirect URLs. */
  ALLOWED_REDIRECTS?: string;
}

export type AuthFailureKind = "token" | "refresh-reuse" | "oauth-state";
// Matches guard's noteAuthFailure(env, ip, kind); injected so this folder never imports src/guard.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type NoteAuthFailure = (env: any, ip: string, kind: AuthFailureKind) => Promise<void>;

export interface AuthDeps {
  fetch?: typeof fetch;
  now?: () => number;
  noteAuthFailure?: NoteAuthFailure;
}

export interface AccessClaims {
  sub: string;
  sid: string;
  adm: boolean;
}

export const ACCESS_TTL_SECONDS = 900;
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const STATE_TTL_MS = 10 * 60 * 1000;
export const CODE_TTL_MS = 60 * 1000;
