import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicProfile, isPublicProfileId, publicProfileLink } from "./public-profile";

vi.mock("./portfolio", () => ({ getPortfolio: vi.fn() }));

afterEach(() => vi.unstubAllEnvs());

const ID = "Ab3_-xyzAb3_-xyz12";

describe("public profile helpers", () => {
  it("accepts only opaque ids, not account ids", () => {
    expect(isPublicProfileId(ID)).toBe(true);
    expect(isPublicProfileId("gh:1001")).toBe(false);
    expect(isPublicProfileId("me")).toBe(false);
    expect(isPublicProfileId("../etc")).toBe(false);
  });

  it("builds the link from PUBLIC_SITE_URL, else a path", () => {
    expect(publicProfileLink(ID)).toBe(`/u/${ID}`);
    vi.stubEnv("PUBLIC_SITE_URL", "https://dojo.example/");
    expect(publicProfileLink(ID)).toBe(`https://dojo.example/u/${ID}`);
  });

  it("fetches from the Worker and returns null for 404, bad ids and failures", async () => {
    vi.stubEnv("SYNC_WORKER_URL", "https://worker.example");
    const ok = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { name: "Ada" } }), { status: 200 }));
    expect((await fetchPublicProfile(ID, ok as unknown as typeof fetch))?.name).toBe("Ada");
    expect((ok.mock.calls as unknown[][])[0][0]).toBe(`https://worker.example/api/public/u/${ID}`);
    const missing = vi.fn(async () => new Response("{}", { status: 404 }));
    expect(await fetchPublicProfile(ID, missing as unknown as typeof fetch)).toBeNull();
    expect(await fetchPublicProfile("gh:1", ok as unknown as typeof fetch)).toBeNull();
    const boom = vi.fn(async () => {
      throw new Error("net");
    });
    expect(await fetchPublicProfile(ID, boom as unknown as typeof fetch)).toBeNull();
  });
});
