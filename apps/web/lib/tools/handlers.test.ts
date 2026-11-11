import type { CatalogEntry, ToolCatalog } from "@habit/shared";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ToolError } from "./download";
import { handleInstall, handleRemove, handleStatus, toolCards, type ToolsDeps } from "./handlers";

const entry: CatalogEntry = {
  version: "9.9",
  url: "https://github.com/acme/tool/releases/download/v1/tool.zip",
  sha256: "a".repeat(64),
  bytes: 1000,
  diskBytes: 5000,
  archive: "zip",
  binDir: "bin",
  license: "MIT",
  source: "Acme",
};
const catalog: ToolCatalog = { java: { "win32-x64": entry }, python: { "win32-x64": entry }, cpp: { "win32-x64": entry } };

function makeDeps(over: Partial<ToolsDeps> = {}): ToolsDeps {
  return {
    env: { HABIT_DESKTOP: "1" },
    platform: "win32",
    arch: "x64",
    catalog,
    detect: async () => [],
    installed: () => ({}),
    install: vi.fn(async (_id, _e, o) => {
      o?.onStage?.("downloading");
      o?.onProgress?.(500, 1000);
      o?.onProgress?.(1000, 1000);
      o?.onStage?.("unpacking");
      return { version: "9.9", dir: "java/9.9", binDir: "bin", installedAt: "now" };
    }) as unknown as ToolsDeps["install"],
    remove: vi.fn(() => true),
    busy: () => false,
    xcodeSelect: async () => true,
    ...over,
  };
}

const post = (body: unknown, headers: Record<string, string> = { host: "localhost:3000", origin: "http://localhost:3000" }) =>
  new Request("http://localhost:3000/api/tools/install", { method: "POST", headers, body: JSON.stringify(body) });
const get = (headers: Record<string, string> = { host: "localhost:3000", origin: "http://localhost:3000" }) =>
  new Request("http://localhost:3000/api/tools/status", { headers });

async function lines(res: Response) {
  return (await res.text()).trim().split("\n").map((l) => JSON.parse(l) as Record<string, unknown>);
}

describe("tools routes", () => {
  it("answer 404 outside the desktop app and in hosted mode", async () => {
    expect((await handleStatus(get(), makeDeps({ env: {} }))).status).toBe(404);
    expect((await handleInstall(post({ tool: "java" }), makeDeps({ env: { HABIT_DESKTOP: "1", HABIT_HOSTED: "1" } }))).status).toBe(404);
    expect((await handleRemove(post({ tool: "java" }), makeDeps({ env: {} }))).status).toBe(404);
  });

  it("answer 403 from another origin or without an origin", async () => {
    const deps = makeDeps();
    expect((await handleInstall(post({ tool: "java" }, { host: "localhost:3000", origin: "https://evil.example" }), deps)).status).toBe(403);
    expect((await handleInstall(post({ tool: "java" }, { host: "localhost:3000" }), deps)).status).toBe(403);
    expect((await handleStatus(get({ host: "localhost:3000", origin: "https://evil.example" }), deps)).status).toBe(403);
    expect(deps.install).not.toHaveBeenCalled();
  });

  it("answers 409 while another install runs, and 400 for an unknown tool", async () => {
    const deps = makeDeps({ busy: () => true });
    expect((await handleInstall(post({ tool: "java" }), deps)).status).toBe(409);
    expect((await handleRemove(post({ tool: "java" }), deps)).status).toBe(409);
    expect((await handleInstall(post({ tool: "rm -rf" }), makeDeps())).status).toBe(400);
    expect((await handleInstall(post({}), makeDeps())).status).toBe(400);
  });

  it("streams progress lines and ends with done", async () => {
    const deps = makeDeps();
    const res = await handleInstall(post({ tool: "java" }), deps);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("ndjson");
    const out = await lines(res);
    expect(out.map((l) => l.type)).toEqual(["stage", "progress", "progress", "stage", "done"]);
    expect(out.at(-1)).toMatchObject({ type: "done", version: "9.9" });
    // the URL always comes from the catalogue, never from the request
    expect(deps.install).toHaveBeenCalledWith("java", entry, expect.anything());
  });

  it("reports a plain error line, without a stack trace or URL", async () => {
    const deps = makeDeps({
      install: vi.fn(async () => {
        throw new ToolError("The downloaded file does not match its published checksum, so it was deleted and not used.", "hash");
      }) as unknown as ToolsDeps["install"],
    });
    const out = await lines(await handleInstall(post({ tool: "python" }), deps));
    expect(out).toEqual([{ type: "error", message: expect.stringContaining("checksum"), code: "hash" }]);
    const unexpected = makeDeps({
      install: vi.fn(async () => {
        throw new Error("secret at https://x/?token=abc\n at stack");
      }) as unknown as ToolsDeps["install"],
    });
    const text = JSON.stringify(await lines(await handleInstall(post({ tool: "python" }), unexpected)));
    expect(text).not.toContain("token");
    expect(text).not.toContain("stack");
  });

  it("offers no download on Linux C++ and starts Apple's installer on macOS", async () => {
    const linux = makeDeps({ platform: "linux", arch: "x64", catalog: { java: {}, python: {}, cpp: {} } });
    expect((await lines(await handleInstall(post({ tool: "cpp" }), linux)))[0]).toMatchObject({ type: "error", code: "unsupported" });
    const xcode = vi.fn(async () => true);
    const mac = makeDeps({ platform: "darwin", arch: "arm64", catalog: { java: {}, python: {}, cpp: {} }, xcodeSelect: xcode });
    const out = await lines(await handleInstall(post({ tool: "cpp" }), mac));
    expect(xcode).toHaveBeenCalled();
    expect(out.at(-1)).toMatchObject({ type: "done" });
  });

  it("removes a tool and reports status cards", async () => {
    const deps = makeDeps({
      installed: () => ({ java: { version: "9.9", dir: "java/9.9", binDir: "bin", installedAt: "now" } }),
      detect: async () => [
        { id: "java", label: "Java", found: true, version: "17", source: "managed", usedFor: "", hint: { command: null, note: "n" } },
      ] as never,
    });
    const rm = await handleRemove(post({ tool: "java" }), deps);
    expect(await rm.json()).toEqual({ ok: true, removed: true });
    const st = await (await handleStatus(get(), deps)).json();
    expect(st.tools.map((t: { id: string }) => t.id)).toEqual(["java", "python", "cpp"]);
    expect(st.tools[0]).toMatchObject({ found: true, source: "managed", downloaded: { version: "9.9" }, action: "download", offer: { bytes: 1000, host: "github.com" } });
    expect((await toolCards(makeDeps({ platform: "linux", arch: "x64", catalog: { java: {}, python: {}, cpp: {} } })))[2].action).toBe("none");
  });
});
