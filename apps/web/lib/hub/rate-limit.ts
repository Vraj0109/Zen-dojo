// Hub rate limiter (plan 0073 A3): replaces the Cloudflare Rate Limiting bindings (RL_AUTH, RL_SYNC, RL_IP).
// Same shape the Worker calls: limiter.limit({ key }) -> { success }. Fixed windows kept in the rate_counters table, one
// atomic upsert per call. If the database fails the limiter lets the request through (the Worker's own bans still apply).
import type { Client } from "@libsql/client";

export interface HubRateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export function createRateLimiter(client: Client, name: string, limit: number, periodSeconds: number): HubRateLimiter {
  const windowMs = periodSeconds * 1000;
  let lastSweep = 0;
  return {
    async limit({ key }) {
      try {
        const now = Date.now();
        const windowStart = Math.floor(now / windowMs) * windowMs;
        const rs = await client.execute({
          sql:
            "INSERT INTO rate_counters (key, window_start, count) VALUES (?, ?, 1) " +
            "ON CONFLICT(key) DO UPDATE SET " +
            "count = CASE WHEN rate_counters.window_start = excluded.window_start THEN rate_counters.count + 1 ELSE 1 END, " +
            "window_start = excluded.window_start " +
            "RETURNING count",
          args: [`${name}:${key}`, windowStart],
        });
        // Lazy cleanup: at most once per window per limiter, drop counters of windows that ended long ago.
        if (now - lastSweep >= windowMs) {
          lastSweep = now;
          client
            .execute({ sql: "DELETE FROM rate_counters WHERE window_start < ?", args: [now - 2 * windowMs - 3_600_000] })
            .catch(() => undefined);
        }
        return { success: Number(rs.rows[0]?.[0] ?? 1) <= limit };
      } catch {
        return { success: true };
      }
    },
  };
}

/** The limits of wrangler.jsonc: auth 20, sync 60, ip 300 per 60 seconds. */
export function createHubRateLimiters(client: Client): { RL_AUTH: HubRateLimiter; RL_SYNC: HubRateLimiter; RL_IP: HubRateLimiter } {
  return {
    RL_AUTH: createRateLimiter(client, "auth", 20, 60),
    RL_SYNC: createRateLimiter(client, "sync", 60, 60),
    RL_IP: createRateLimiter(client, "ip", 300, 60),
  };
}
