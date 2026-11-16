"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Plan 0082: "Model files on this computer". Lists GGUF files in the chosen folders and adds one to Ollama.
// Talks only to this app's /api/ai/gguf and /api/ai/import routes (desktop only).

type GgufRow = { path: string; name: string; folder: string; sizeBytes: number; isGguf: boolean; suggested: string; imported: string | null };
type Progress = { path: string; text: string; pct: number | null };

const post = (url: string, body: unknown, signal?: AbortSignal) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });

function size(bytes: number): string {
  return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

const has = (installed: string[], name: string) => installed.includes(name) || installed.includes(`${name}:latest`);

export function GgufFiles({ installed, running, current, onUse, onAdded }: { installed: string[]; running: boolean; current: string; onUse: (model: string) => void; onAdded: () => void }) {
  const [folders, setFolders] = useState<string[]>([]);
  const [files, setFiles] = useState<GgufRow[] | null>(null);
  const [newFolder, setNewFolder] = useState("");
  const [folderError, setFolderError] = useState<string | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Progress | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [overwrite, setOverwrite] = useState<Record<string, boolean>>({});
  const [justAdded, setJustAdded] = useState<Record<string, string>>({});
  const cancel = useRef<AbortController | null>(null);

  const scan = useCallback(async (body: { folders?: string[] } = {}): Promise<string | null> => {
    try {
      const r = await post("/api/ai/gguf", body);
      const j = (await r.json()) as { ok: boolean; error?: string; folders?: string[]; files?: GgufRow[] };
      if (!j.ok) return j.error ?? "bad_request";
      setFolders(j.folders ?? []);
      setFiles(j.files ?? []);
      return null;
    } catch {
      return "internal_error";
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial scan of the model folders
    void scan();
  }, [scan]);

  async function addFolder() {
    const f = newFolder.trim();
    if (!f) return;
    const err = await scan({ folders: [...folders, f] });
    setFolderError(err === "bad_folder" ? "That folder was not found. Use a full path, for example D:\\models." : err === "bad_folders" ? "At most 10 folders." : err ? "The folder could not be added." : null);
    if (!err) setNewFolder("");
  }

  async function removeFolder(f: string) {
    setFolderError(null);
    await scan({ folders: folders.filter((x) => x !== f) });
  }

  async function add(row: GgufRow) {
    const name = (names[row.path] ?? row.imported ?? row.suggested).trim();
    const ac = new AbortController();
    cancel.current = ac;
    setErrors((e) => ({ ...e, [row.path]: "" }));
    setProgress({ path: row.path, text: "Starting", pct: null });
    let failed = "";
    try {
      const r = await post("/api/ai/import", { path: row.path, name, overwrite: Boolean(overwrite[row.path]) }, ac.signal);
      if (!r.ok || !r.body) {
        const code = ((await r.json().catch(() => ({}))) as { error?: string }).error;
        failed =
          code === "name_taken"
            ? "Ollama already has a model with this name. Pick another name, or tick Replace it."
            : code === "bad_model"
              ? "Use letters, digits, dots, dashes and underscores only."
              : code === "unknown_file"
                ? "This file is no longer in the listed folders."
                : code === "disabled"
                  ? "Turn on local AI help first."
                  : "The file could not be added.";
      } else {
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
            if (!line.trim()) continue;
            try {
              const p = JSON.parse(line) as { stage?: string; completed?: number; total?: number; status?: string; error?: string };
              if (p.error) failed = p.error;
              else if (p.stage === "hashing" || p.stage === "uploading")
                setProgress({ path: row.path, text: p.stage === "hashing" ? "Reading the file" : "Copying into Ollama", pct: p.total ? Math.round(((p.completed ?? 0) / p.total) * 100) : null });
              else if (p.stage === "creating") setProgress({ path: row.path, text: `Creating the model: ${p.status ?? ""}`, pct: null });
              else if (p.stage === "done") setJustAdded((a) => ({ ...a, [row.path]: name }));
            } catch {
              /* partial line */
            }
          }
        }
      }
    } catch {
      if (!ac.signal.aborted) failed = "The import stopped. Is Ollama running?";
    }
    setProgress(null);
    if (failed) setErrors((e) => ({ ...e, [row.path]: failed }));
    await scan();
    onAdded();
  }

  return (
    <div className="space-y-3 rounded-lg border border-line p-3 text-sm">
      <p className="font-medium">Model files on this computer</p>
      <p className="text-xs text-muted">
        GGUF files in these folders can be added to Ollama. Ollama keeps its own copy, so you can delete the original file afterwards.
      </p>
      <ul className="space-y-1">
        {folders.length === 0 && <li className="text-xs text-muted">No folders yet. Add one below.</li>}
        {folders.map((f) => (
          <li key={f} className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded border border-line bg-background px-2 py-1 text-xs">{f}</code>
            <button type="button" onClick={() => void removeFolder(f)} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:bg-background">
              Remove
            </button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="ggufFolder" className="sr-only">
          Folder path
        </label>
        <input
          id="ggufFolder"
          value={newFolder}
          onChange={(e) => setNewFolder(e.target.value)}
          placeholder="Full path of a folder with GGUF files"
          className="min-w-72 flex-1 rounded-lg border border-line bg-background px-3 py-2 text-sm"
        />
        <button type="button" onClick={() => void addFolder()} disabled={!newFolder.trim() || folders.length >= 10} className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-background disabled:opacity-50">
          Add folder
        </button>
        <button type="button" onClick={() => void scan()} className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:bg-background">
          Look again
        </button>
      </div>
      {folderError && (
        <p role="alert" className="text-xs text-foreground">
          {folderError}
        </p>
      )}
      {files === null ? (
        <p className="text-xs text-muted">Looking for model files...</p>
      ) : files.length === 0 ? (
        <p className="text-xs text-muted">No GGUF model files found in these folders.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 pr-3 font-medium">File</th>
                <th className="py-1 pr-3 font-medium">Size</th>
                <th className="py-1 pr-3 font-medium">Folder</th>
                <th className="py-1 font-medium">In Ollama</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => {
                const known = justAdded[f.path] ?? f.imported;
                const added = known && has(installed, known) ? known : has(installed, f.suggested) ? f.suggested : null;
                const busyHere = progress?.path === f.path;
                const value = names[f.path] ?? f.imported ?? f.suggested;
                return (
                  <tr key={f.path} className="border-t border-line align-top">
                    <td className="break-all py-2 pr-3">{f.name}</td>
                    <td className="whitespace-nowrap py-2 pr-3">{size(f.sizeBytes)}</td>
                    <td className="break-all py-2 pr-3 text-xs text-muted">{f.folder}</td>
                    <td className="space-y-1 py-2">
                      {!f.isGguf ? (
                        <span className="text-xs text-muted">Not a GGUF file</span>
                      ) : added ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs">Added as {added}</span>
                          <button type="button" onClick={() => onUse(added)} disabled={current === added || current === `${added}:latest`} className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-on-accent disabled:opacity-50">
                            {current === added || current === `${added}:latest` ? "In use" : "Use this model"}
                          </button>
                        </div>
                      ) : busyHere ? (
                        <div role="status" className="space-y-1">
                          <div className="h-2 w-full min-w-40 overflow-hidden rounded bg-background">
                            <div className="h-full bg-accent transition-all" style={{ width: `${progress.pct ?? 5}%` }} />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted">
                              {progress.text}
                              {progress.pct !== null ? ` ${progress.pct}%` : ""}
                            </span>
                            <button type="button" onClick={() => cancel.current?.abort()} className="rounded-lg border border-line px-2.5 py-1 text-xs font-medium hover:bg-background">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="sr-only" htmlFor={`gguf-${f.path}`}>
                            Model name
                          </label>
                          <input
                            id={`gguf-${f.path}`}
                            value={value}
                            onChange={(e) => setNames((n) => ({ ...n, [f.path]: e.target.value }))}
                            className="w-48 rounded-lg border border-line bg-background px-2 py-1 text-xs"
                          />
                          <button type="button" onClick={() => void add(f)} disabled={!running || progress !== null || !value.trim()} className="rounded-lg bg-accent px-2.5 py-1 text-xs font-medium text-on-accent disabled:opacity-50">
                            Add to Ollama
                          </button>
                          {has(installed, value.trim()) && (
                            <label className="flex items-center gap-1 text-xs">
                              <input type="checkbox" checked={Boolean(overwrite[f.path])} onChange={(e) => setOverwrite((o) => ({ ...o, [f.path]: e.target.checked }))} />
                              Replace it
                            </label>
                          )}
                        </div>
                      )}
                      {errors[f.path] && (
                        <p role="alert" className="text-xs text-foreground">
                          {errors[f.path]}
                        </p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!running && <p className="text-xs text-muted">Start Ollama to add a file.</p>}
    </div>
  );
}
