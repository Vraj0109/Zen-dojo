"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Tier = { model: string; label: string; downloadGb: number };
type Info = {
  enabled: boolean;
  model: string;
  summary: string;
  recommended: Tier;
  tiers: Tier[];
  ollama: { running: boolean; version?: string };
  installed: string[];
};

const post = (url: string, body: unknown, signal?: AbortSignal) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });

/** Settings > Local AI (optional). Talks only to this app's own /api/ai routes; nothing here reaches the internet. */
export function AiSettings() {
  const [info, setInfo] = useState<Info | null>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ text: string; pct: number | null } | null>(null);
  const [pickModel, setPickModel] = useState("");
  const cancel = useRef<AbortController | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const r = await post("/api/ai/status", {});
      if (!r.ok) throw new Error();
      const j = (await r.json()) as Info;
      setInfo(j);
      setFailed(false);
      setPickModel((m) => m || j.model || j.recommended.model);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch of the hardware and Ollama status
    void load();
  }, [load]);

  async function save(body: { enabled?: boolean; model?: string }) {
    await post("/api/ai/settings", body);
    await load();
  }

  async function download() {
    if (!pickModel) return;
    const ac = new AbortController();
    cancel.current = ac;
    setProgress({ text: "Starting", pct: null });
    try {
      const r = await post("/api/ai/pull", { model: pickModel }, ac.signal);
      if (!r.ok || !r.body) throw new Error();
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          try {
            const p = JSON.parse(line) as { status?: string; total?: number; completed?: number };
            setProgress({ text: p.status ?? "", pct: p.total && p.completed ? Math.round((p.completed / p.total) * 100) : null });
          } catch {
            /* ignore partial line */
          }
        }
      }
      await save({ model: pickModel });
      setProgress(null);
    } catch {
      setProgress(ac.signal.aborted ? null : { text: "The download stopped. Is Ollama running?", pct: null });
    }
  }

  if (failed && !info) return null; // not available here (for example the hosted site)
  if (!info) return <p className="text-sm text-muted">Checking this computer...</p>;

  const have = info.installed.includes(pickModel);
  return (
    <div className="space-y-4">
      <p className="text-sm">{info.summary}</p>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full border border-line px-2 py-0.5">{info.ollama.running ? `Ollama is running${info.ollama.version ? ` (${info.ollama.version})` : ""}` : "Ollama not found"}</span>
        <button type="button" onClick={() => void load()} disabled={busy} className="rounded-lg border border-line px-3 py-1.5 font-medium hover:bg-background disabled:opacity-50">
          Check again
        </button>
      </div>
      {!info.ollama.running && (
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted">
          <li>
            Install Ollama from{" "}
            <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="text-foreground underline">
              ollama.com/download
            </a>{" "}
            and start it.
          </li>
          <li>Come back here and press Check again.</li>
        </ol>
      )}
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" className="size-4" checked={info.enabled} onChange={(e) => void save({ enabled: e.target.checked })} />
        Turn on local AI help
      </label>
      {info.enabled && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="aiModel" className="text-sm font-medium">
              Model
            </label>
            <select id="aiModel" value={pickModel} onChange={(e) => setPickModel(e.target.value)} className="rounded-lg border border-line bg-background px-3 py-2 text-sm">
              {info.tiers.map((t) => (
                <option key={t.model} value={t.model}>
                  {t.label}: {t.model} (about {t.downloadGb} GB){t.model === info.recommended.model ? " - suggested" : ""}
                </option>
              ))}
            </select>
            {have ? (
              <button type="button" onClick={() => void save({ model: pickModel })} disabled={info.model === pickModel} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-on-accent disabled:opacity-50">
                {info.model === pickModel ? "In use" : "Use this model"}
              </button>
            ) : progress ? (
              <button type="button" onClick={() => cancel.current?.abort()} className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-background">
                Cancel
              </button>
            ) : (
              <button type="button" onClick={() => void download()} disabled={!info.ollama.running} className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-on-accent disabled:opacity-50">
                Download
              </button>
            )}
          </div>
          {progress && (
            <div role="status" className="space-y-1 text-sm">
              <div className="h-2 w-full overflow-hidden rounded bg-background">
                <div className="h-full bg-accent transition-all" style={{ width: `${progress.pct ?? 5}%` }} />
              </div>
              <span className="text-muted">
                {progress.text}
                {progress.pct !== null ? ` ${progress.pct}%` : ""}
              </span>
            </div>
          )}
          {info.model && <p className="text-xs text-muted">Using {info.model}. To free disk space later, run <code>ollama rm {info.model}</code>.</p>}
        </div>
      )}
      <p className="text-xs text-muted">
        Runs on your computer through Ollama. Nothing is sent to the internet. Answers can be wrong. See <code>docs/local-ai.md</code>.
      </p>
    </div>
  );
}
