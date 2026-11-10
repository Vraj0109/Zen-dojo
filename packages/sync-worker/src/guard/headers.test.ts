import { describe, expect, it } from "vitest";
import { checkCors, readBodyLimited, securityHeaders } from "./headers";

describe("securityHeaders", () => {
  it("sets no-store on /auth and /api only", () => {
    expect(securityHeaders("/auth/token").get("Cache-Control")).toBe("no-store");
    expect(securityHeaders("/api/sync").get("Cache-Control")).toBe("no-store");
    expect(securityHeaders("/.well-known/jwks.json").get("Cache-Control")).toBeNull();
    const h = securityHeaders("/api/sync", { "Content-Type": "application/json" });
    expect(h.get("X-Content-Type-Options")).toBe("nosniff");
    expect(h.get("Referrer-Policy")).toBe("no-referrer");
    expect(h.get("Content-Type")).toBe("application/json");
  });
});

describe("checkCors", () => {
  const r = (origin?: string) => new Request("https://w/", { headers: origin ? { Origin: origin } : {} });
  it("allows requests without Origin, no CORS headers", () => {
    const c = checkCors(r(), "https://app.example");
    expect(c.allowed).toBe(true);
    expect(c.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
  it("echoes only exact listed origins", () => {
    const c = checkCors(r("https://app.example"), "https://other.example, https://app.example/");
    expect(c.allowed).toBe(true);
    expect(c.headers.get("Access-Control-Allow-Origin")).toBe("https://app.example");
    expect(checkCors(r("https://evil.example"), "https://app.example").allowed).toBe(false);
  });
  it("never allows a wildcard, and denies when nothing is configured", () => {
    expect(checkCors(r("https://x.example"), "*").allowed).toBe(false);
    expect(checkCors(r("https://x.example"), undefined).allowed).toBe(false);
  });
});

describe("readBodyLimited", () => {
  it("reads a body under the limit", async () => {
    const res = await readBodyLimited(new Request("https://w/", { method: "POST", body: "hello" }), 100);
    expect(res).toMatchObject({ ok: true, text: "hello" });
  });
  it("rejects on Content-Length without reading", async () => {
    const res = await readBodyLimited(
      new Request("https://w/", { method: "POST", body: "x", headers: { "Content-Length": "5000" } }),
      100,
    );
    expect(res).toEqual({ ok: false, reason: "too_large" });
  });
  it("cuts off an oversized chunked body at the limit without pulling the rest", async () => {
    let pulled = 0;
    const chunk = new Uint8Array(1024);
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        controller.enqueue(chunk);
        if (pulled > 10_000) controller.close();
      },
    });
    const req = new Request("https://w/", { method: "POST", body: stream, duplex: "half" } as RequestInit);
    const res = await readBodyLimited(req, 4096);
    expect(res).toEqual({ ok: false, reason: "too_large" });
    expect(pulled).toBeLessThan(20); // stopped early, nowhere near the 10,000 chunks (10 MB)
  });
});
