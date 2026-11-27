"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentDoc } from "@habit/shared";
import type { AuditRow } from "@/lib/content-db/audit";
import { HistoryViewer } from "@/app/admin/components/history-viewer";
import { SaveFooter } from "@/app/admin/components/save-footer";
import { saveDocContentAction } from "../../../actions";
import { AiAssist } from "../../../ai-assist";

/** The doc body as the editor holds it, or the JSON error when the text does not parse. */
function parseDocDraft(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

export function DocEditorClient({
  doc,
  initialAuditRows,
}: {
  doc: ContentDoc;
  initialAuditRows: AuditRow[];
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"edit" | "history">("edit");
  const [jsonString, setJsonString] = useState(() => JSON.stringify(doc.row.body, null, 2));
  const [baseRev, setBaseRev] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const docDraft = parseDocDraft(jsonString);

  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleValidateJson = () => {
    try {
      JSON.parse(jsonString);
      setJsonError(null);
      alert("JSON is valid!");
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON.");
    }
  };

  const handleSave = async () => {
    setErrors([]);
    setConflict(false);
    setSaveSuccessMsg(null);
    setJsonError(null);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Invalid JSON.";
      setJsonError(err);
      setErrors([`JSON parse error: ${err}`]);
      return;
    }

    if (notify && !note.trim()) {
      setErrors(["Say in one line what changed when 'Tell learners' is checked."]);
      return;
    }

    setSaving(true);
    try {
      const res = await saveDocContentAction(doc.row.kind, doc.row.id, parsed, baseRev, {
        note: note.trim() || null,
        notify,
      });

      if (res.ok) {
        setBaseRev(res.rev);
        setIsDirty(false);
        setNote("");
        setNotify(false);
        setSaveSuccessMsg("Doc saved successfully!");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
        router.refresh();
      } else {
        setErrors(res.errors ?? ["Save failed."]);
      }
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Save failed."]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Nav */}
      <div className="flex flex-wrap items-center justify-between border-b border-line gap-2 pb-1">
        <nav className="flex space-x-1" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "edit"
                ? "border-accent text-accent font-semibold bg-surface/50"
                : "border-transparent text-muted hover:border-line hover:text-foreground"
            }`}
          >
            JSON Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "history"
                ? "border-accent text-accent font-semibold bg-surface/50"
                : "border-transparent text-muted hover:border-line hover:text-foreground"
            }`}
          >
            History & Restore ({initialAuditRows.length})
          </button>
        </nav>

        {saveSuccessMsg && (
          <span className="text-xs text-green-400 font-medium animate-pulse">{saveSuccessMsg}</span>
        )}
      </div>

      {activeTab === "edit" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <div>
              <span className="text-xs text-muted">
                Kind: <strong className="font-mono text-foreground">{doc.row.kind}</strong> · ID:{" "}
                <strong className="font-mono text-foreground">{doc.row.id}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleValidateJson}
              className="rounded border border-line bg-surface px-2.5 py-1 text-xs text-muted hover:text-foreground"
            >
              Validate JSON syntax
            </button>
          </div>

          {jsonError && (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-400">
              {jsonError}
            </div>
          )}

          {docDraft.ok ? (
            <AiAssist
              target="doc"
              entity="doc"
              id={doc.row.id}
              kind={doc.row.kind}
              draft={docDraft.value}
              current={docDraft.value}
              onChange={(next) => {
                setJsonString(JSON.stringify(next, null, 2));
                setIsDirty(true);
              }}
            />
          ) : (
            <p className="text-xs text-muted">Fix the JSON syntax above before using AI on this document.</p>
          )}

          <textarea
            value={jsonString}
            onChange={(e) => {
              setJsonString(e.target.value);
              setIsDirty(true);
            }}
            rows={22}
            className="w-full rounded-md border border-line bg-surface/50 p-4 font-mono text-xs leading-relaxed focus:border-accent focus:outline-none"
            spellCheck={false}
          />
        </div>
      ) : (
        <HistoryViewer auditRows={initialAuditRows} onRestored={() => router.refresh()} />
      )}

      {/* Save Footer */}
      <SaveFooter
        note={note}
        onNoteChange={setNote}
        notify={notify}
        onNotifyChange={setNotify}
        onSave={handleSave}
        saving={saving}
        errors={errors}
        conflict={conflict}
        onReloadLatest={() => window.location.reload()}
        isDirty={isDirty}
      />
    </div>
  );
}
