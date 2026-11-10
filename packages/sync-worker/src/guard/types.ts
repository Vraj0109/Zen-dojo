// Minimal local types so the guard compiles and tests without workers-types.
export interface D1Result<T = unknown> {
  results?: T[];
  success?: boolean;
}
export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
}
export interface D1Database {
  prepare(sql: string): D1PreparedStatement;
}
export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}
/** Structural subset of the Worker Env that the guard needs. */
export interface GuardEnv {
  DB: D1Database;
  RL_AUTH: RateLimiter;
  RL_SYNC: RateLimiter;
  RL_IP: RateLimiter;
}
