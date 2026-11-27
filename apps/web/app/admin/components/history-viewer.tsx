"use client";

import { useState } from "react";
import type { AuditRow } from "@/lib/content-db/audit";
import { restoreAuditAction } from "../actions";

export function HistoryViewer({
  auditRows,
  onRestored,
}: {
  auditRows: AuditRow[];
  onRestored?: () => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(auditRows[0]?.id ?? null);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selected = auditRows.find((r) => r.id === selectedId);

  const handleRestore = async (id: number) => {
    if (!window.confirm("Restore this version? This will write a new restore audit record and update content.")) {
      return;
    }
    setRestoring(true);
    setMessage(null);
    try {
      const res = await restoreAuditAction(id);
      if (res.ok) {
        setMessage("Version restored successfully. Reloading page...");
        setTimeout(() => {
          if (onRestored) onRestored();
          else window.location.reload();
        }, 800);
      } else {
        setMessage(res.errors ? res.errors.join(", ") : "Restore failed.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Restore request failed.");
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (at: number) => {
    return new Date(at).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-line pb-2">
        <h3 className="text-sm font-semibold text-foreground">Audit History ({auditRows.length})</h3>
        <p className="text-xs text-muted">View past changes and restore older versions.</p>
      </div>

      {message && (
        <div className="rounded-md border border-accent/40 bg-accent/10 p-3 text-xs text-accent">
          {message}
        </div>
      )}

      {auditRows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center text-muted text-xs">
          No audit records found for this entity.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-1">
            <div className="rounded-lg border border-line bg-surface overflow-hidden divide-y divide-line">
              {auditRows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full p-3 text-left transition-colors flex flex-col gap-1 ${
                    selectedId === r.id ? "bg-accent/15" : "hover:bg-surface-2"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase text-accent tracking-wider text-[10px]">
                      {r.action}
                    </span>
                    <span className="text-muted text-[11px]">{formatDate(r.at)}</span>
                  </div>
                  <div className="text-xs text-foreground font-medium truncate">
                    by {String(r.actorName ?? "unknown")}
                  </div>
                  <div className="text-[10px] text-muted font-mono truncate">ID: {r.id}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            {selected ? (
              <div className="rounded-lg border border-line bg-surface p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted">
                      Change Details #{selected.id}
                    </h4>
                    <p className="text-xs text-foreground">
                      Action: <strong className="uppercase">{selected.action}</strong> by {String(selected.actorName ?? "unknown")} on {formatDate(selected.at)}
                    </p>
                  </div>
                  {Boolean(selected.after) && (
                    <button
                      type="button"
                      disabled={restoring}
                      onClick={() => handleRestore(selected.id)}
                      className="rounded bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 disabled:opacity-40"
                    >
                      {restoring ? "Restoring..." : "Restore this version"}
                    </button>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <span className="block text-xs font-semibold text-muted mb-1">Before Change</span>
                    <pre className="max-h-96 overflow-auto rounded border border-line bg-surface-2 p-2.5 font-mono text-[11px] leading-relaxed text-muted">
                      {selected.before ? JSON.stringify(selected.before, null, 2) : "(none / created)"}
                    </pre>
                  </div>
                  <div>
                    <span className="block text-xs font-semibold text-muted mb-1">After Change</span>
                    <pre className="max-h-96 overflow-auto rounded border border-line bg-surface-2 p-2.5 font-mono text-[11px] leading-relaxed text-foreground">
                      {selected.after ? JSON.stringify(selected.after, null, 2) : "(none / deleted)"}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-line p-8 text-center text-muted text-xs">
                Select an audit entry on the left to inspect its diff and restore.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
