"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AI_INSTALL, OS_LABEL, installCommands, toOsId } from "@habit/shared";

type Tier = { model: string; label: string; downloadGb: number };
type Info = {
  enabled: boolean;
  model: string;
  summary: string;
  recommended: Tier;
  tiers: Tier[];
  ollama: { running: boolean; version?: string };
  installed: string[];
  providers?: ProviderInfo[];
  provider?: ProviderId;
  consent?: ProviderId[];
  platform?: string;
};
type ProviderId = "ollama" | "claude" | "agy" | "gemini" | "codex";
type ProviderInfo = { id: ProviderId; label: string; found: boolean; cloud: boolean };

const CLOUD_WHAT: Record<string, string> = {
  claude: "Claude Code (Anthropic)",
  agy: "Antigravity (Google)",
  gemini: "Gemini CLI (Google)",
  codex: "Codex CLI (OpenAI)",
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
  const [tests, setTests] = useState<Record<string, { busy: boolean; text?: string; ok?: boolean }>>({});

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

  async function save(body: { enabled?: boolean; model?: string; provider?: ProviderId; consent?: ProviderId[] }) {
    await post("/api/ai/settings", body);
    await load();
  }

  async function setConsent(id: ProviderId, on: boolean) {
    const now = info?.consent ?? [];
    const next = on ? [...new Set([...now, id])] : now.filter((x) => x !== id);
    // Taking consent away from the tool in use puts the answers back on this computer.
    await save(!on && info?.provider === id ? { consent: next, provider: "ollama" } : { consent: next });
  }

  async function runTest(id: ProviderId) {
    setTests((t) => ({ ...t, [id]: { busy: true } }));
    try {
      const r = await post("/api/ai/test", { provider: id });
      const j = (await r.json()) as { ok: boolean; reply?: string; error?: string };
      setTests((t) => ({ ...t, [id]: { busy: false, ok: j.ok, text: j.ok ? `It answered: ${(j.reply ?? "").slice(0, 120)}` : testError(j.error) } }));
    } catch {
      setTests((t) => ({ ...t, [id]: { busy: false, ok: false, text: "The test could not run." } }));
    }
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
  const chosen: ProviderId = info.provider ?? "ollama";
  const consent = info.consent ?? [];
  // Only tools that were found are offered; Ollama is always listed because it is the default.
  const choices = (info.providers ?? []).filter((p) => p.id === "ollama" || p.found);
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
      {info.enabled && choices.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Answers from</legend>
          {choices.map((p) => {
            const ok = consent.includes(p.id);
            const t = tests[p.id];
            return (
              <div key={p.id} className="space-y-2 rounded-lg border border-line p-3 text-sm">
                <label className="flex items-center gap-2 font-medium">
                  <input type="radio" name="aiProvider" className="size-4" checked={chosen === p.id} disabled={p.cloud && !ok} onChange={() => void save({ provider: p.id })} />
                  {p.cloud ? CLOUD_WHAT[p.id] ?? p.label : "This computer (Ollama)"}
                </label>
                {!p.cloud ? (
                  <p className="text-xs text-muted">Runs on your computer. Nothing leaves it.</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-muted">
                      Found on this computer. Using it sends the problem text, your chat, and your code if you include it, to that company under your own login on this
                      computer. This app never sees or stores a key.
                    </p>
                    <label className="flex items-start gap-2 text-xs">
                      <input type="checkbox" className="mt-0.5 size-4" checked={ok} onChange={(e) => void setConsent(p.id, e.target.checked)} />
                      <span>I understand my problem text and code go to {CLOUD_WHAT[p.id] ?? p.label}.</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" onClick={() => void runTest(p.id)} disabled={!ok || t?.busy} className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-background disabled:opacity-50">
                        {t?.busy ? "Testing..." : "Test"}
                      </button>
                      {t?.text && (
                        <span role="status" className={`text-xs ${t.ok ? "text-muted" : "text-foreground"}`}>
                          {t.text}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </fieldset>
      )}
      {info.enabled && (chosen === "ollama" || !info.providers) && (
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
              {info.installed
                .filter((m) => !info.tiers.some((t) => t.model === m))
                .map((m) => (
                  <option key={m} value={m}>
                    Installed: {m}
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
      <InstallMore info={info} />
      <p className="text-xs text-muted">
        The default runs on your computer through Ollama and sends nothing to the internet. A cloud tool is used only after you tick its box above. Answers can be wrong. See{" "}
        <code>docs/local-ai.md</code>.
      </p>
    </div>
  );
}

function testError(code?: string): string {
  switch (code) {
    case "consent_required":
      return "Tick the box first.";
    case "timeout":
      return "No answer within a minute.";
    case "empty_reply":
      return "The tool ran but gave no answer.";
    default:
      return "The tool did not answer. Is it installed and signed in?";
  }
}

/** "Get more AI tools": the install command for this computer's system, with a Copy button. Nothing is run from here. */
function InstallMore({ info }: { info: Info }) {
  const os = toOsId(info.platform);
  const found = new Set((info.providers ?? []).filter((p) => p.found).map((p) => p.id as string));
  const [copied, setCopied] = useState("");
  return (
    <details className="rounded-lg border border-line p-3 text-sm">
      <summary className="cursor-pointer font-medium">Get more AI tools ({OS_LABEL[os]})</summary>
      <div className="mt-3 space-y-4">
        <p className="text-xs text-muted">
          Copy a command, paste it into a terminal (on Windows: PowerShell) and run it yourself. Zen Dojo never installs anything for you. Tools marked &ldquo;sends the chat&rdquo; use your own
          account with that company.
        </p>
        {AI_INSTALL.map((item) => {
          const here = item.providerId && found.has(item.providerId);
          return (
            <div key={item.id} className="space-y-1.5">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {item.name}
                {here && <span className="rounded-full border border-line px-2 py-0.5 text-xs font-normal text-muted">Found on this computer</span>}
                <span className="rounded-full border border-line px-2 py-0.5 text-xs font-normal text-muted">{item.kind === "cloud-cli" ? "sends the chat" : "stays on this computer"}</span>
              </p>
              <p className="text-xs text-muted">{item.blurb}</p>
              {installCommands(item, os).map((c) => (
                <div key={c.command} className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded border border-line bg-background px-2 py-1 text-xs">{c.command}</code>
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard?.writeText(c.command).then(() => setCopied(c.command)).catch(() => {});
                      }}
                      className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:bg-background"
                    >
                      {copied === c.command ? "Copied" : "Copy"}
                    </button>
                  </div>
                  {c.note && <p className="text-xs text-muted">{c.note}</p>}
                </div>
              ))}
              <p className="text-xs text-muted">
                {item.afterInstall}{" "}
                <a href={item.docsUrl} target="_blank" rel="noopener noreferrer" className="text-foreground underline">
                  Documentation
                </a>
              </p>
            </div>
          );
        })}
        <p className="text-xs text-muted">
          Antigravity is not offered in the chat: its command line cannot be limited to answering questions, so it could run commands on your computer.
        </p>
      </div>
    </details>
  );
}
