"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type {
  ContentEntity,
  ContentLesson,
  ContentPage,
  ContentProblem,
  SectionRow,
} from "@habit/shared";
import { MarkdownPreview } from "@/app/markdown-client";
import { Diagram } from "@/app/diagram";
import {
  getOfflineUnreadCount,
  getSavedAsset,
  getSavedEntity,
  listOfflineNotices,
  listSavedEntities,
  markAllOfflineNoticesRead,
  markOfflineNoticeRead,
  type StoredNotice,
} from "../content-store";

export default function OfflineReaderPage() {
  const [hash, setHash] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [entities, setEntities] = useState<ContentEntity[]>([]);
  const [notices, setNotices] = useState<StoredNotice[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentEntity, setCurrentEntity] = useState<ContentEntity | null>(null);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});

  // Sync hash state with window.location.hash
  useEffect(() => {
    const handleHash = () => {
      setHash(window.location.hash || "");
    };
    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  // Load initial list and notices
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [allEntities, allNotices, count] = await Promise.all([
          listSavedEntities(),
          listOfflineNotices(),
          getOfflineUnreadCount(),
        ]);
        if (!active) return;
        setEntities(allEntities);
        setNotices(allNotices);
        setUnreadCount(count);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // When hash changes, load the corresponding problem or lesson
  useEffect(() => {
    let active = true;
    const cleanHash = hash.replace(/^#/, "");
    if (!cleanHash || cleanHash === "whats-new") {
      void Promise.resolve().then(() => {
        if (active) setCurrentEntity(null);
      });
      return;
    }

    if (cleanHash.startsWith("problem-")) {
      const id = cleanHash.slice("problem-".length);
      void (async () => {
        const p = await getSavedEntity("problem", id);
        if (active) setCurrentEntity(p);
      })();
    } else if (cleanHash.startsWith("lesson-")) {
      const id = cleanHash.slice("lesson-".length);
      void (async () => {
        const l = await getSavedEntity("lesson", id);
        if (active) setCurrentEntity(l);
      })();
    }
    return () => {
      active = false;
    };
  }, [hash]);

  // Load image assets used by currentEntity
  useEffect(() => {
    if (!currentEntity) return;
    let active = true;
    const assetIds: string[] = [];

    const collectAssets = (page?: ContentPage) => {
      if (!page) return;
      for (const s of page.sections || []) {
        for (const b of s.blocks || []) {
          if (b.type === "image" && b.assetId) assetIds.push(b.assetId);
        }
      }
    };

    if (currentEntity.kind === "problem") {
      collectAssets(currentEntity.value.statement);
      collectAssets(currentEntity.value.solution);
    } else if (currentEntity.kind === "lesson") {
      collectAssets(currentEntity.value.page);
    }

    if (assetIds.length > 0) {
      void (async () => {
        const urls: Record<string, string> = {};
        for (const id of assetIds) {
          const url = await getSavedAsset(id);
          if (url) urls[id] = url;
        }
        if (active) setAssetUrls(urls);
      })();
    }
    return () => {
      active = false;
    };
  }, [currentEntity]);

  const onMarkAllNoticesRead = async () => {
    await markAllOfflineNoticesRead();
    const updated = await listOfflineNotices();
    setNotices(updated);
    setUnreadCount(0);
  };

  const onMarkOneNoticeRead = async (id: number) => {
    await markOfflineNoticeRead(id);
    const updated = await listOfflineNotices();
    setNotices(updated);
    setUnreadCount(updated.filter((n) => !n.readAt).length);
  };

  const isWhatsNew = hash === "#whats-new";

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-2xl items-center justify-center p-6 text-sm text-muted">
        Loading offline library…
      </div>
    );
  }

  // --- Subview: What's new list ---
  if (isWhatsNew) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <a href="#" className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-foreground">
              ← Offline Library
            </a>
            <h1 className="mt-1 text-2xl font-bold">What&apos;s new (offline)</h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllNoticesRead}
              className="rounded-full border border-line px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
            >
              Mark all read
            </button>
          )}
        </div>

        {notices.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted">No updates recorded yet.</p>
        ) : (
          <div className="space-y-4">
            {notices.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl border p-4 transition-colors ${
                  n.readAt ? "border-line bg-surface/50" : "border-primary/40 bg-surface shadow-xs"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-muted">{n.unitTitle || n.unit}</span>
                    <h3 className="text-base font-semibold text-foreground">
                      <a
                        href={n.entity === "problem" ? `#problem-${n.entityId}` : `#lesson-${n.entityId}`}
                        onClick={() => onMarkOneNoticeRead(n.id)}
                        className="hover:underline"
                      >
                        {n.title}
                      </a>
                    </h3>
                  </div>
                  {!n.readAt && (
                    <button
                      onClick={() => onMarkOneNoticeRead(n.id)}
                      className="shrink-0 text-xs text-muted hover:text-foreground"
                    >
                      Mark read
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{n.note}</p>
                <div className="mt-3 text-xs text-muted">
                  {n.at ? new Date(n.at).toLocaleDateString() : ""}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- Subview: Problem or Lesson Reader ---
  if (currentEntity) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <a href="#" className="text-xs font-semibold uppercase tracking-wider text-muted hover:text-foreground">
            ← Offline Library
          </a>
          <span className="rounded-full bg-surface-2 px-3 py-1 text-xs text-muted">Offline copy</span>
        </div>

        {currentEntity.kind === "problem" && (
          <ProblemView problem={currentEntity.value} assetUrls={assetUrls} />
        )}
        {currentEntity.kind === "lesson" && (
          <LessonView lesson={currentEntity.value} assetUrls={assetUrls} />
        )}
      </div>
    );
  }

  // --- Subview: Library Index ---
  const problems = entities.filter((e): e is { kind: "problem"; value: ContentProblem } => e.kind === "problem");
  const lessons = entities.filter((e): e is { kind: "lesson"; value: ContentLesson } => e.kind === "lesson");

  // Group lessons by courseId
  const coursesMap = new Map<string, ContentLesson[]>();
  for (const l of lessons) {
    const cid = l.value.row.courseId || "other";
    const list = coursesMap.get(cid) || [];
    list.push(l.value);
    coursesMap.set(cid, list);
  }

  // Group problems by pattern
  const patternsMap = new Map<string, ContentProblem[]>();
  for (const p of problems) {
    const pat = p.value.row.pattern || "other";
    const list = patternsMap.get(pat) || [];
    list.push(p.value);
    patternsMap.set(pat, list);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <h1 className="text-2xl font-bold">Offline Reader</h1>
          <p className="mt-1 text-sm text-muted">
            Read your downloaded courses and problems without an internet connection.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#whats-new"
            className="relative inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
          >
            <span>What&apos;s new</span>
            {unreadCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-on-primary">
                {unreadCount}
              </span>
            )}
          </a>
          <Link
            href="/profile/settings#content"
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
          >
            Manage downloads
          </Link>
        </div>
      </div>

      {entities.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-line p-8 text-center sm:p-12">
          <h3 className="text-lg font-medium">No offline content saved yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            You can save courses and pattern problem sets to your browser for offline reading. Go to Settings to pick what you want to keep offline.
          </p>
          <div className="mt-5">
            <Link
              href="/profile/settings#content"
              className="inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-on-primary hover:opacity-90"
            >
              Go to Settings
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {coursesMap.size > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">Courses &amp; Lessons ({lessons.length})</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from(coursesMap.entries()).map(([cid, cLessons]) => (
                  <div key={cid} className="rounded-2xl border border-line bg-surface p-4">
                    <h3 className="font-medium text-foreground">{cid}</h3>
                    <p className="mt-0.5 text-xs text-muted">{cLessons.length} lessons saved</p>
                    <ul className="mt-3 space-y-2 border-t border-line/60 pt-3 text-sm">
                      {cLessons.map((l) => (
                        <li key={l.row.id}>
                          <a href={`#lesson-${l.row.id}`} className="text-primary hover:underline">
                            {l.row.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {patternsMap.size > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold tracking-tight">DSA Problems ({problems.length})</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {Array.from(patternsMap.entries()).map(([pat, pList]) => (
                  <div key={pat} className="rounded-2xl border border-line bg-surface p-4">
                    <h3 className="font-medium text-foreground capitalize">{pat.replace(/-/g, " ")}</h3>
                    <p className="mt-0.5 text-xs text-muted">{pList.length} problems saved</p>
                    <ul className="mt-3 space-y-2 border-t border-line/60 pt-3 text-sm">
                      {pList.map((p) => (
                        <li key={p.row.id} className="flex items-center justify-between gap-2">
                          <a href={`#problem-${p.row.id}`} className="truncate text-primary hover:underline">
                            {p.row.title}
                          </a>
                          <span className="shrink-0 text-[11px] text-muted uppercase">{p.row.difficulty}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SectionRenderer({ section, assetUrls }: { section: SectionRow; assetUrls: Record<string, string> }) {
  return (
    <section id={`s-${section.id}`} className="space-y-3 pt-2">
      {section.title && <h3 className="text-base font-semibold text-foreground">{section.title}</h3>}
      {section.blocks?.map((b) => {
        if (b.type === "markdown") {
          return <MarkdownPreview key={b.id} source={b.body || ""} />;
        }
        if (b.type === "code") {
          return (
            <div key={b.id} className="my-3 space-y-2">
              {b.label && <h4 className="text-sm font-semibold">{b.label}</h4>}
              {Object.entries(b.code || {}).map(([lang, snippet]) => (
                <div key={lang} className="space-y-1">
                  <span className="text-xs font-semibold uppercase text-muted">{lang}</span>
                  <pre className="overflow-x-auto rounded-xl bg-surface-2 p-3 font-mono text-xs">
                    {snippet}
                  </pre>
                </div>
              ))}
              {(b.timeComplexity || b.spaceComplexity) && (
                <p className="text-xs text-muted">
                  {b.timeComplexity && <span>Time: {b.timeComplexity}</span>}
                  {b.timeComplexity && b.spaceComplexity && <span> · </span>}
                  {b.spaceComplexity && <span>Space: {b.spaceComplexity}</span>}
                </p>
              )}
            </div>
          );
        }
        if (b.type === "diagram") {
          return (
            <div key={b.id} className="my-3">
              <Diagram source={b.body || ""} caption={b.caption || undefined} />
            </div>
          );
        }
        if (b.type === "image") {
          const src = b.assetId ? assetUrls[b.assetId] : null;
          return (
            <figure key={b.id} className="my-3">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt={b.body || ""} className="max-w-full rounded border border-line" />
              ) : (
                <div className="rounded border border-dashed border-line p-4 text-xs text-muted">
                  Image ({b.body || "asset"})
                </div>
              )}
              {b.caption && <figcaption className="mt-1 text-center text-xs text-muted">{b.caption}</figcaption>}
            </figure>
          );
        }
        return null;
      })}
    </section>
  );
}

function LessonView({ lesson, assetUrls }: { lesson: ContentLesson; assetUrls: Record<string, string> }) {
  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">Lesson</span>
        <h1 className="text-3xl font-bold">{lesson.row.title}</h1>
      </header>

      <div className="divide-y divide-line/60 space-y-6">
        {lesson.page.sections?.map((s) => (
          <SectionRenderer key={s.id} section={s} assetUrls={assetUrls} />
        ))}
      </div>
    </article>
  );
}

function ProblemView({ problem, assetUrls }: { problem: ContentProblem; assetUrls: Record<string, string> }) {
  const [tab, setTab] = useState<"statement" | "solution" | "hints">("statement");

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted">Problem</span>
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold uppercase text-muted">
            {problem.row.difficulty}
          </span>
        </div>
        <h1 className="text-3xl font-bold">{problem.row.title}</h1>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          onClick={() => setTab("statement")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "statement" ? "bg-primary text-on-primary" : "text-muted hover:text-foreground"
          }`}
        >
          Statement
        </button>
        <button
          onClick={() => setTab("solution")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "solution" ? "bg-primary text-on-primary" : "text-muted hover:text-foreground"
          }`}
        >
          Solution
        </button>
        {problem.hints && problem.hints.length > 0 && (
          <button
            onClick={() => setTab("hints")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === "hints" ? "bg-primary text-on-primary" : "text-muted hover:text-foreground"
            }`}
          >
            Hints ({problem.hints.length})
          </button>
        )}
      </div>

      {tab === "statement" && (
        <div className="divide-y divide-line/60 space-y-6">
          {problem.statement.sections?.map((s) => (
            <SectionRenderer key={s.id} section={s} assetUrls={assetUrls} />
          ))}

          {problem.cases && problem.cases.length > 0 && (
            <section className="space-y-3 pt-4">
              <h3 className="text-base font-semibold">Examples</h3>
              <div className="space-y-2">
                {problem.cases.map((c, i) => (
                  <div key={c.ord ?? i} className="rounded-xl border border-line bg-surface p-3 font-mono text-xs">
                    <div>
                      <span className="text-muted">Input: </span>
                      {JSON.stringify(c.input)}
                    </div>
                    <div>
                      <span className="text-muted">Output: </span>
                      {JSON.stringify(c.output)}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {tab === "solution" && (
        <div className="divide-y divide-line/60 space-y-6">
          {problem.solution.sections?.map((s) => (
            <SectionRenderer key={s.id} section={s} assetUrls={assetUrls} />
          ))}
        </div>
      )}

      {tab === "hints" && (
        <div className="space-y-3">
          {problem.hints.map((h, i) => (
            <details key={h.ord ?? i} className="rounded-xl border border-line bg-surface p-4">
              <summary className="cursor-pointer font-medium text-sm text-foreground">
                Hint {i + 1}
              </summary>
              <div className="mt-2 text-sm leading-relaxed text-muted">
                <MarkdownPreview source={h.bodyMd} />
              </div>
            </details>
          ))}
        </div>
      )}
    </article>
  );
}
