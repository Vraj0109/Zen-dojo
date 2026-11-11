import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const req = (body: unknown, origin: string | null = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/buddy/petdex", {
    method: "POST",
    headers: { host: "localhost:3000", "content-type": "application/json", ...(origin ? { origin } : {}) },
    body: JSON.stringify(body),
  });
const GOOD = "https://petdex.dev/pets/shinchan";
const ZIP = "https://assets.petdex.dev/pets/shinchan-0123456789ab/zip.zip";

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  vi.stubEnv("HABIT_HOSTED", "");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/buddy/petdex", () => {
  it("is 404 when hosted", async () => {
    vi.stubEnv("HABIT_HOSTED", "1");
    expect((await POST(req({ url: GOOD }))).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is 403 cross-origin", async () => {
    expect((await POST(req({ url: GOOD }, "https://evil.com"))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is 400 for bad links and never fetches", async () => {
    for (const url of ["https://evil.com/pets/a", "http://petdex.dev/pets/a", "", 5]) {
      const r = await POST(req({ url }));
      expect(r.status).toBe(400);
      expect((await r.json()).error).toBe("bad_url");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the zip bytes and fetches only the Petdex hosts", async () => {
    fetchMock.mockImplementation(async (u: string) =>
      u === GOOD ? new Response(`<a href="${ZIP}">zip</a>`) : new Response(new Uint8Array([80, 75, 3, 4])),
    );
    const r = await POST(req({ url: "https://www.petdex.dev/pets/shinchan/" }));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("application/zip");
    expect(Array.from(new Uint8Array(await r.arrayBuffer()))).toEqual([80, 75, 3, 4]);
    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([GOOD, ZIP]);
    for (const c of fetchMock.mock.calls) expect(c[1].redirect).toBe("manual");
  });

  it("is 502 not_found when the page has no zip link", async () => {
    fetchMock.mockResolvedValue(new Response("<html></html>"));
    const r = await POST(req({ url: GOOD }));
    expect(r.status).toBe(502);
    expect((await r.json()).error).toBe("not_found");
  });

  it("is 502 too_big when the zip is over the cap", async () => {
    fetchMock.mockImplementation(async (u: string) =>
      u === GOOD ? new Response(ZIP) : new Response(new Uint8Array(6 * 1024 * 1024 + 1)),
    );
    const r = await POST(req({ url: GOOD }));
    expect(r.status).toBe(502);
    expect((await r.json()).error).toBe("too_big");
  });

  it("follows a redirect that stays on a Petdex host", async () => {
    fetchMock.mockImplementation(async (u: string) => {
      if (u === GOOD) return new Response(null, { status: 308, headers: { location: "https://www.petdex.dev/pets/shinchan/" } });
      if (u === "https://www.petdex.dev/pets/shinchan/") return new Response(`<a href="${ZIP}">zip</a>`);
      return new Response(new Uint8Array([80, 75, 3, 4]));
    });
    const r = await POST(req({ url: GOOD }));
    expect(r.status).toBe(200);
  });

  it("refuses a redirect to another host", async () => {
    fetchMock.mockImplementation(async () => new Response(null, { status: 302, headers: { location: "https://evil.example/x" } }));
    const r = await POST(req({ url: GOOD }));
    expect(r.status).toBe(502);
    expect((await r.json()).error).toBe("not_found");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("is 502 fetch_failed when the network fails", async () => {
    fetchMock.mockRejectedValue(new Error("redirect"));
    const r = await POST(req({ url: GOOD }));
    expect(r.status).toBe(502);
    expect((await r.json()).error).toBe("fetch_failed");
  });
});
