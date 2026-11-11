import "server-only";
import { execFile } from "node:child_process";
import { MANAGED_TOOL_IDS, TOOL_CATALOG, catalogEntry, platformKey, type CatalogEntry, type ManagedToolId, type ToolCatalog } from "@habit/shared";
import { checkSameOrigin } from "@/lib/auth/util";
import { detectTools, resetToolsCache, type ToolStatus } from "@/lib/judge/tools";
import { ToolError } from "./download";
import { installTool, installedTools, isInstallBusy, removeTool } from "./install";
import type { ManifestTool } from "./manifest";

// The logic behind /api/tools/{status,install,remove} (plan 0064). Route files only forward to these so tests can inject everything.

export interface ToolsDeps {
  env: Record<string, string | undefined>;
  platform: string;
  arch: string;
  catalog: ToolCatalog;
  detect: () => Promise<ToolStatus[]>;
  installed: () => Partial<Record<ManagedToolId, ManifestTool>>;
  install: typeof installTool;
  remove: (id: ManagedToolId) => boolean;
  busy: () => boolean;
  /** Starts Apple's command line tools installer (macOS C++) */
  xcodeSelect: () => Promise<boolean>;
}

export function realDeps(): ToolsDeps {
  return {
    env: process.env,
    platform: process.platform,
    arch: process.arch,
    catalog: TOOL_CATALOG,
    detect: () => detectTools({ fresh: true }),
    installed: () => installedTools(),
    install: installTool,
    remove: (id) => removeTool(id),
    busy: isInstallBusy,
    xcodeSelect: () =>
      new Promise((resolve) => {
        try {
          execFile("xcode-select", ["--install"], { windowsHide: true, timeout: 15000 }, (error) => resolve(!error));
        } catch {
          resolve(false);
        }
      }),
  };
}

export interface ToolCard {
  id: ManagedToolId;
  label: string;
  found: boolean;
  version: string | null;
  source: ToolStatus["source"];
  downloaded: { version: string } | null;
  /** download: the app can fetch it; xcode: Apple's installer; none: use the command shown */
  action: "download" | "xcode" | "none";
  offer: { version: string; bytes: number; diskBytes: number; source: string; license: string; host: string } | null;
  hintCommand: string | null;
  hintNote: string;
}

const LABELS: Record<ManagedToolId, string> = { java: "Java 17", python: "Python 3", cpp: "C++ compiler" };

function offerOf(entry: CatalogEntry): NonNullable<ToolCard["offer"]> {
  return { version: entry.version, bytes: entry.bytes, diskBytes: entry.diskBytes, source: entry.source, license: entry.license, host: new URL(entry.url).hostname };
}

export async function toolCards(deps: ToolsDeps): Promise<ToolCard[]> {
  const [statuses, installed] = [await deps.detect(), deps.installed()];
  const key = platformKey(deps.platform, deps.arch);
  return MANAGED_TOOL_IDS.map((id): ToolCard => {
    const s = statuses.find((t) => t.id === id);
    const entry = catalogEntry(id, key, deps.catalog);
    const action: ToolCard["action"] = entry ? "download" : id === "cpp" && deps.platform === "darwin" ? "xcode" : "none";
    return {
      id,
      label: LABELS[id],
      found: s?.found ?? false,
      version: s?.version ?? null,
      source: s?.source ?? "system",
      downloaded: installed[id] ? { version: installed[id]!.version } : null,
      action,
      offer: entry ? offerOf(entry) : null,
      hintCommand: s?.hint.command ?? null,
      hintNote: s?.hint.note ?? "",
    };
  });
}

/** Desktop app only: the web build, hosted mode and a plain dev server answer 404. */
function desktopOnly(deps: ToolsDeps): Response | null {
  if (deps.env.HABIT_DESKTOP !== "1" || deps.env.HABIT_HOSTED === "1") return new Response("Not found", { status: 404 });
  return null;
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function guard(req: Request, deps: ToolsDeps): Response | null {
  const closed = desktopOnly(deps);
  if (closed) return closed;
  if (!checkSameOrigin(req)) return json({ ok: false, error: "forbidden" }, 403);
  return null;
}

async function readTool(req: Request): Promise<ManagedToolId | null> {
  try {
    const body = (await req.json()) as { tool?: unknown };
    return MANAGED_TOOL_IDS.find((id) => id === body.tool) ?? null;
  } catch {
    return null;
  }
}

export async function handleStatus(req: Request, deps: ToolsDeps = realDeps()): Promise<Response> {
  const blocked = guard(req, deps);
  if (blocked) return blocked;
  try {
    return json({ ok: true, busy: deps.busy(), tools: await toolCards(deps) });
  } catch {
    return json({ ok: false, error: "internal_error" }, 500);
  }
}

export async function handleRemove(req: Request, deps: ToolsDeps = realDeps()): Promise<Response> {
  const blocked = guard(req, deps);
  if (blocked) return blocked;
  const id = await readTool(req);
  if (!id) return json({ ok: false, error: "bad_request" }, 400);
  if (deps.busy()) return json({ ok: false, error: "busy" }, 409);
  try {
    const removed = deps.remove(id);
    resetToolsCache();
    return json({ ok: true, removed });
  } catch {
    return json({ ok: false, error: "internal_error" }, 500);
  }
}

/** Streams JSON lines: {type:"stage"}, {type:"progress"}, then {type:"done"} or {type:"error", message}. */
export async function handleInstall(req: Request, deps: ToolsDeps = realDeps()): Promise<Response> {
  const blocked = guard(req, deps);
  if (blocked) return blocked;
  const id = await readTool(req);
  if (!id) return json({ ok: false, error: "bad_request" }, 400);
  if (deps.busy()) return json({ ok: false, error: "busy" }, 409);

  const entry = catalogEntry(id, platformKey(deps.platform, deps.arch), deps.catalog);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
        } catch {
          // the page went away
        }
      };
      try {
        if (!entry) {
          if (id === "cpp" && deps.platform === "darwin") {
            send({ type: "stage", stage: "waiting" });
            const started = await deps.xcodeSelect();
            if (!started) throw new ToolError("Apple's installer could not be started. Open Terminal and run: xcode-select --install", "unsupported");
            send({ type: "done", note: "Apple's installer window should be open. When it finishes, press Check again." });
          } else {
            throw new ToolError("This tool is not downloaded on this system. Use the install command shown on the card.", "unsupported");
          }
        } else {
          let last = -1;
          const rec = await deps.install(id, entry, {
            signal: req.signal,
            onStage: (stage) => send({ type: "stage", stage }),
            onProgress: (received, total) => {
              const pct = Math.min(100, Math.floor((received / total) * 100));
              if (pct !== last) {
                last = pct;
                send({ type: "progress", received, total });
              }
            },
          });
          send({ type: "done", version: rec.version });
        }
      } catch (e) {
        send({ type: "error", message: e instanceof ToolError ? e.message : "The tool could not be installed.", code: e instanceof ToolError ? e.code : "unknown" });
      } finally {
        resetToolsCache();
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson", "cache-control": "no-store" } });
}
