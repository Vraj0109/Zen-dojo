import { createClient } from "@libsql/client";
import { describe, expect, it, vi } from "vitest";
import { dbNameFor, ensureUserDbUrl, mintDbToken } from "./provision";

const env = { TURSO_API_TOKEN: "secret-api", TURSO_ORG: "org", TURSO_GROUP: "g" };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });

function stub() {
  return vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = String(url);
    if (init?.method === "POST" && u.endsWith("/databases")) {
      const { name } = JSON.parse(String(init.body));
      return json({ database: { Hostname: `${name}-org.turso.io` } });
    }
    if (u.includes("/auth/tokens")) return json({ jwt: "jwt-x" });
    return json({ database: { Hostname: u.split("/").pop() + "-org.turso.io" } });
  });
}
const posts = (f: ReturnType<typeof stub>) => f.mock.calls.filter((c) => c[1]?.method === "POST").length;

describe("provisioning", () => {
  it("creates on first sign-in, reuses on second, differs per user", async () => {
    const control = createClient({ url: ":memory:" });
    const f = stub();
    const sleep = async () => {};
    const a1 = await ensureUserDbUrl(control, "a", { fetch: f as never, env, sleep });
    const n = posts(f);
    const a2 = await ensureUserDbUrl(control, "a", { fetch: f as never, env, sleep });
    expect(a2).toBe(a1);
    expect(posts(f)).toBe(n);
    const b = await ensureUserDbUrl(control, "b", { fetch: f as never, env, sleep });
    expect(b).not.toBe(a1);
    expect(a1).toBe(`libsql://${dbNameFor("a")}-org.turso.io`);
  });

  it("a provider failure is a plain error and nothing is recorded", async () => {
    const control = createClient({ url: ":memory:" });
    const bad = vi.fn(async () => json({ error: "no" }, 500));
    await expect(ensureUserDbUrl(control, "a", { fetch: bad as never, env })).rejects.toThrow(/Could not create/);
    const ok = stub();
    const url = await ensureUserDbUrl(control, "a", { fetch: ok as never, env, sleep: async () => {} });
    expect(url).toContain("libsql://");
    expect(posts(ok)).toBe(1);
  });

  it("mints a token and keeps the API token out of errors", async () => {
    expect(await mintDbToken("a", { fetch: stub() as never, env })).toBe("jwt-x");
    const bad = vi.fn(async () => json({}, 401));
    await expect(mintDbToken("a", { fetch: bad as never, env })).rejects.toThrow(/status 401/);
    await mintDbToken("a", { fetch: bad as never, env }).catch((e: Error) => expect(e.message).not.toContain("secret-api"));
  });
});
