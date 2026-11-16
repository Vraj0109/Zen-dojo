import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/gguf", async (orig) => {
  const real = await orig<typeof import("@/lib/ai/gguf")>();
  // Small fake files in tests: no size floor.
  return { ...real, findGgufFiles: (folders: string[]) => real.findGgufFiles(folders, { minBytes: 0 }) };
});

import { getGgufFolders, getGgufImports, setAiSettings, setGgufFolders } from "@/lib/ui-prefs";
import { POST as gguf } from "./gguf/route";
import { POST as importRoute } from "./import/route";

const req = (body: unknown) =>
  new Request("http://localhost:3000/api/ai/x", {
    method: "POST",
    headers: { host: "localhost:3000", "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify(body),
  });

let dir = "";
let file = "";
beforeEach(async () => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  vi.stubEnv("HABIT_HOSTED", "");
  vi.stubEnv("HABIT_TOOLS_DIR", "");
  dir = mkdtempSync(path.join(tmpdir(), "import-route-"));
  file = path.join(dir, "my-model-Q4_K_M.gguf");
  writeFileSync(file, "GGUF fake");
  writeFileSync(path.join(dir, "other.gguf"), "NOPE");
  await setAiSettings({ enabled: true });
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("gguf folders route (plan 0082)", () => {
  it("is 404 on the hosted site", async () => {
    vi.stubEnv("HABIT_HOSTED", "1");
    expect((await gguf(req({}))).status).toBe(404);
    expect((await importRoute(req({ path: file, name: "my-model" }))).status).toBe(404);
  });

  it("saves folders, refuses bad ones, and lists the files", async () => {
    expect((await gguf(req({ folders: ["relative"] }))).status).toBe(400);
    expect((await gguf(req({ folders: [path.join(dir, "missing")] }))).status).toBe(400);
    const j = await (await gguf(req({ folders: [dir] }))).json();
    expect(await getGgufFolders()).toEqual([dir]);
    const byName = Object.fromEntries(j.files.map((f: { name: string }) => [f.name, f]));
    expect(byName["my-model-Q4_K_M.gguf"]).toMatchObject({ isGguf: true, suggested: "my-model", imported: null });
    expect(byName["other.gguf"].isGguf).toBe(false);
  });
});

describe("import route (plan 0082)", () => {
  const ollama = (tags: string[]) =>
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit = {}) => {
      if (url.endsWith("/api/tags")) return Response.json({ models: tags.map((name) => ({ name })) });
      if (init.method === "HEAD") return new Response(null, { status: 200 });
      return new Response('{"status":"success"}\n');
    }));

  it("refuses a path not found in the saved folders and non-GGUF files", async () => {
    await setGgufFolders([dir]);
    ollama([]);
    expect((await importRoute(req({ path: path.join(tmpdir(), "elsewhere.gguf"), name: "x" }))).status).toBe(404);
    expect((await importRoute(req({ path: path.join(dir, "other.gguf"), name: "x" }))).status).toBe(400);
    expect((await importRoute(req({ path: file, name: "bad name;" }))).status).toBe(400);
  });

  it("needs overwrite for a name that exists, then imports and records it", async () => {
    await setGgufFolders([dir]);
    ollama(["my-model:latest"]);
    expect((await importRoute(req({ path: file, name: "my-model" }))).status).toBe(409);
    const res = await importRoute(req({ path: file, name: "my-model", overwrite: true }));
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.at(-1)).toEqual({ stage: "done" });
    expect(await getGgufImports()).toEqual({ [file]: "my-model" });
  });

  it("streams an error line when Ollama is down", async () => {
    await setGgufFolders([dir]);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    const res = await importRoute(req({ path: file, name: "my-model" }));
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
    expect(lines.at(-1)).toEqual({ error: "Could not reach Ollama. Is it running?" });
  });
});
