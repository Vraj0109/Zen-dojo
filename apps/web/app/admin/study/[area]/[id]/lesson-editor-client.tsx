"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATES, type ContentLesson, type TemplateId } from "@habit/shared";
import type { AuditRow } from "@/lib/content-db/audit";
import { PageEditor } from "../../../page-editor/page-editor";
import { HistoryViewer } from "@/app/admin/components/history-viewer";
import { SaveFooter } from "@/app/admin/components/save-footer";
import { saveLessonContentAction } from "../../../actions";

export function LessonEditorClient({
  initialLesson,
  initialAuditRows,
  courses = [],
}: {
  initialLesson: ContentLesson;
  initialAuditRows: AuditRow[];
  courses?: Array<{ id: string; title: string }>;
}) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"content" | "history">("content");
  const [draft, setDraft] = useState<ContentLesson>(initialLesson);
  const [baseRev, setBaseRev] = useState<string | null>(null);

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

  const updateDraft = (updater: (prev: ContentLesson) => ContentLesson) => {
    setDraft((prev) => {
      const next = updater(prev);
      setIsDirty(true);
      return next;
    });
  };

  const updateRow = (updates: Partial<ContentLesson["row"]>) => {
    updateDraft((prev) => ({
      ...prev,
      row: {
        ...prev.row,
        ...updates,
      },
    }));
  };

  const handleSave = async () => {
    setErrors([]);
    setConflict(false);
    setSaveSuccessMsg(null);

    if (!draft.row.id.trim()) {
      setErrors(["Lesson ID is required."]);
      return;
    }
    if (!draft.row.title.trim()) {
      setErrors(["Lesson title is required."]);
      return;
    }
    if (notify && !note.trim()) {
      setErrors(["Say in one line what changed when 'Tell learners' is checked."]);
      return;
    }

    setSaving(true);
    try {
      const res = await saveLessonContentAction(draft, baseRev, {
        note: note.trim() || null,
        notify,
      });

      if (res.ok) {
        setBaseRev(res.rev);
        setIsDirty(false);
        setNote("");
        setNotify(false);
        setSaveSuccessMsg("Lesson saved successfully!");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
        router.refresh();
      } else if (res.conflict) {
        setConflict(true);
      } else {
        setErrors(res.errors ?? ["Save failed."]);
      }
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Save failed."]);
    } finally {
      setSaving(false);
    }
  };

  const handleOverwrite = async () => {
    setConflict(false);
    setSaving(true);
    try {
      const res = await saveLessonContentAction(draft, null, {
        note: note.trim() || null,
        notify,
      });
      if (res.ok) {
        setBaseRev(res.rev);
        setIsDirty(false);
        setSaveSuccessMsg("Lesson overwritten successfully.");
        setTimeout(() => setSaveSuccessMsg(null), 3000);
        router.refresh();
      } else {
        setErrors(res.errors ?? ["Overwrite failed."]);
      }
    } finally {
      setSaving(false);
    }
  };

  const templateKeys = Object.keys(TEMPLATES);

  return (
    <div className="space-y-6">
      {/* Tab Nav */}
      <div className="flex flex-wrap items-center justify-between border-b border-line gap-2 pb-1">
        <nav className="flex space-x-1" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === "content"
                ? "border-accent text-accent font-semibold bg-surface/50"
                : "border-transparent text-muted hover:border-line hover:text-foreground"
            }`}
          >
            Lesson Content
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
            History &amp; Restore ({initialAuditRows.length})
          </button>
        </nav>

        {saveSuccessMsg && (
          <span className="text-xs text-green-400 font-medium animate-pulse">{saveSuccessMsg}</span>
        )}
      </div>

      {activeTab === "content" ? (
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-lg border border-line bg-surface p-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                ID <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={draft.row.id}
                onChange={(e) => updateRow({ id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                placeholder="solid-principles"
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 font-mono text-xs focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={draft.row.title}
                onChange={(e) => updateRow({ title: e.target.value })}
                placeholder="SOLID Principles"
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Course</label>
              <select
                value={draft.row.courseId}
                onChange={(e) => updateRow({ courseId: e.target.value })}
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">Template</label>
              <select
                value={draft.row.template}
                onChange={(e) => updateRow({ template: e.target.value as TemplateId })}
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none font-mono"
              >
                {templateKeys.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">Order</label>
              <input
                type="number"
                value={draft.row.ord}
                onChange={(e) => updateRow({ ord: Number(e.target.value) || 0 })}
                className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 font-mono text-xs focus:border-accent focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-muted mb-1">
                Meta JSON (points, deeper sections, etc.)
              </label>
              <textarea
                value={JSON.stringify(draft.row.meta ?? {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    updateRow({ meta: parsed });
                  } catch {
                    // let user type
                  }
                }}
                rows={3}
                className="w-full rounded border border-line bg-surface/50 p-2 font-mono text-xs focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          {/* Page Editor for Lesson Body */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted">Lesson Content</h4>
            <PageEditor
              template={draft.row.template}
              page={draft.page}
              onChange={(newPage) => updateDraft((prev) => ({ ...prev, page: newPage }))}
              ai={{ entity: "lesson", id: draft.row.id, field: "page", draft }}
            />
          </div>
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
        onOverwrite={handleOverwrite}
        isDirty={isDirty}
      />
    </div>
  );
}

export default LessonEditorClient;
