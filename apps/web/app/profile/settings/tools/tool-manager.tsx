"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { formatBytes } from "@habit/shared";
import type { ToolCard } from "@/lib/tools/handlers";
import { CopyCommand } from "./copy-command";

type ToolId = ToolCard["id"];
interface Progress {
  id: ToolId;
  stage: "downloading" | "unpacking" | "waiting";
  received: number;
  total: number;
}

const SOURCE_TEXT: Record<ToolCard["source"], string> = {
  managed: "Using: downloaded copy",
  override: "Using: the program you set with an environment variable",
  system: "Using: the program installed on your system",
};

/** Cards for Java, Python and C++ with "Set up", a confirmation, progress, Cancel and Remove. Desktop app only. */
export function ToolManager({ cards }: { cards: ToolCard[] }) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<ToolId[] | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [queue, setQueue] = useState<ToolId[]>([]);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const cancelled = useRef(false);

  const label = (id: ToolId) => cards.find((c) => c.id === id)?.label ?? id;
  const working = progress !== null;

  async function installOne(id: ToolId): Promise<boolean> {
    const ctl = new AbortController();
    abort.current = ctl;
    setProgress({ id, stage: "downloading", received: 0, total: cards.find((c) => c.id === id)?.offer?.bytes ?? 1 });
    try {
      const res = await fetch("/api/tools/install", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool: id }), signal: ctl.signal });
      if (res.status === 409) {
        setMessage({ kind: "error", text: "Another download is already running. Wait for it to finish." });
        return false;
      }
      if (!res.ok || !res.body) {
        setMessage({ kind: "error", text: "The download could not be started." });
        return false;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let ok = false;
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const msg = JSON.parse(line) as { type: string; stage?: Progress["stage"]; received?: number; total?: number; message?: string; note?: string };
          if (msg.type === "stage" && msg.stage) setProgress((p) => (p ? { ...p, stage: msg.stage! } : p));
          else if (msg.type === "progress") setProgress((p) => (p ? { ...p, received: msg.received ?? p.received, total: msg.total ?? p.total } : p));
          else if (msg.type === "error") setMessage({ kind: "error", text: msg.message ?? "The tool could not be installed." });
          else if (msg.type === "done") {
            ok = true;
            if (msg.note) setMessage({ kind: "info", text: msg.note });
          }
        }
      }
      return ok;
    } catch {
      if (!cancelled.current) setMessage({ kind: "error", text: "The download was interrupted. Check your internet connection and try again." });
      return false;
    }
  }

  async function run(ids: ToolId[]) {
    setConfirm(null);
    setMessage(null);
    cancelled.current = false;
    setQueue(ids);
    for (const id of ids) {
      const ok = await installOne(id);
      if (!ok || cancelled.current) break;
      setQueue((q) => q.filter((x) => x !== id));
    }
    setProgress(null);
    setQueue([]);
    abort.current = null;
    if (cancelled.current) setMessage({ kind: "info", text: "Cancelled. Nothing was kept." });
    router.refresh();
  }

  async function remove(id: ToolId) {
    setMessage(null);
    const res = await fetch("/api/tools/remove", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tool: id }) }).catch(() => null);
    if (!res || !res.ok) setMessage({ kind: "error", text: "The tool could not be removed. Is a download still running?" });
    router.refresh();
  }

  const missing = cards.filter((c) => !c.found && c.action !== "none" && !c.downloaded);
  const sizeOf = (ids: ToolId[]) => {
    const offers = ids.map((id) => cards.find((c) => c.id === id)?.offer).filter((o): o is NonNullable<ToolCard["offer"]> => Boolean(o));
    return { download: offers.reduce((n, o) => n + o.bytes, 0), disk: offers.reduce((n, o) => n + o.diskBytes, 0) };
  };

  return (
    <div className="space-y-4">
      {missing.length > 1 && (
        <button
          type="button"
          disabled={working}
          onClick={() => setConfirm(missing.map((c) => c.id))}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Set up all missing tools
        </button>
      )}

      {confirm && (
        <div role="dialog" aria-label="Confirm download" className="space-y-3 rounded-xl border border-line bg-surface p-4">
          <h3 className="font-semibold">Download these tools?</h3>
          <ul className="space-y-1 text-sm">
            {confirm.map((id) => {
              const o = cards.find((c) => c.id === id)?.offer;
              return (
                <li key={id}>
                  <span className="font-medium">{label(id)}</span>
                  {o ? ` ${o.version}, from ${o.host} (${o.source}), download ${formatBytes(o.bytes)}, about ${formatBytes(o.diskBytes)} on disk, ${o.license}.` : ""}
                </li>
              );
            })}
          </ul>
          <p className="text-sm text-muted">
            In total {formatBytes(sizeOf(confirm).download)} to download and about {formatBytes(sizeOf(confirm).disk)} of free disk space. Each file is
            checked against its published checksum before it is unpacked. Nothing is installed system-wide and no administrator rights are needed.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => run(confirm)} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90">
              Download
            </button>
            <button type="button" onClick={() => setConfirm(null)} className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-background">
              Not now
            </button>
          </div>
        </div>
      )}

      {message && (
        <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${message.kind === "error" ? "border-amber-600/50 text-amber-700 dark:text-amber-400" : "border-line text-muted"}`}>
          {message.text}
        </p>
      )}

      <ul className="grid gap-4 xl:grid-cols-2">
        {cards.map((c) => {
          const active = progress?.id === c.id;
          const pct = active && progress.total > 0 ? Math.min(100, Math.floor((progress.received / progress.total) * 100)) : 0;
          const queued = queue.includes(c.id) && !active;
          return (
            <li key={c.id} className="space-y-3 rounded-xl border border-line bg-surface p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold">{c.label}</h3>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                    c.found ? "border-green-600/40 text-green-600 dark:text-green-400" : "border-amber-600/50 text-amber-700 dark:text-amber-400"
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d={c.found ? "m5 12 5 5 9-10" : "M12 8v5m0 4h.01"} />
                  </svg>
                  {c.downloaded ? `Downloaded, ${c.downloaded.version}` : c.found ? `Found on your system${c.version ? `, ${c.version}` : ""}` : "Missing"}
                </span>
              </div>
              {c.found && <p className="text-xs text-muted">{SOURCE_TEXT[c.source]}</p>}

              {active && (
                <div className="space-y-2">
                  <div className="h-2 overflow-hidden rounded-full bg-background" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full bg-accent transition-all" style={{ width: `${progress.stage === "downloading" ? pct : 100}%` }} />
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs text-muted">
                    <span>
                      {progress.stage === "downloading"
                        ? `Downloading, ${formatBytes(progress.received)} of ${formatBytes(progress.total)}`
                        : progress.stage === "unpacking"
                          ? "Unpacking and checking"
                          : "Waiting for Apple's installer"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        cancelled.current = true;
                        abort.current?.abort();
                      }}
                      className="rounded-lg border border-line px-3 py-1 text-sm font-medium hover:bg-background"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {queued && <p className="text-xs text-muted">Waiting for the download before this one.</p>}

              {!active && !queued && (
                <div className="flex flex-wrap items-center gap-2">
                  {!c.downloaded && c.action === "download" && (
                    <button
                      type="button"
                      disabled={working}
                      onClick={() => setConfirm([c.id])}
                      className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-background disabled:opacity-50"
                    >
                      Set up{c.offer ? ` (${formatBytes(c.offer.bytes)})` : ""}
                    </button>
                  )}
                  {c.action === "xcode" && !c.found && (
                    <button type="button" disabled={working} onClick={() => run([c.id])} className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-background disabled:opacity-50">
                      Install Apple&apos;s command line tools
                    </button>
                  )}
                  {c.downloaded && (
                    <button type="button" disabled={working} onClick={() => remove(c.id)} className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-background disabled:opacity-50">
                      Remove the downloaded copy
                    </button>
                  )}
                </div>
              )}

              {!c.found && c.action === "none" && (
                <div className="space-y-2">
                  {c.hintCommand && <CopyCommand command={c.hintCommand} />}
                  <p className="text-xs text-muted">{c.hintNote}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="max-w-3xl text-xs text-muted">
        Downloaded tools live in the app&apos;s own data folder and are not added to your system. If your antivirus quarantines the compiler after it is
        unpacked, allow the <code>tools</code> folder inside the app data folder and press Check again. Remove deletes the whole copy.
      </p>
    </div>
  );
}
