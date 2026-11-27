import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { listProblemSummaries } from "@/lib/content-repo/problems";
import { getAllPatterns } from "@/lib/content-repo/lookups";
import { getContentDb } from "@/lib/content-db/client";
import { adminAudit, problems as problemsTable } from "@/lib/content-db/schema";
import { desc, eq } from "drizzle-orm";
import { Difficulty as DifficultyBadge } from "../../ui";

type SearchParams = Promise<{
  q?: string | string[];
  source?: string | string[];
  difficulty?: string | string[];
  pattern?: string | string[];
  brute?: string | string[];
  missingLang?: string | string[];
}>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

const SOURCES = ["LeetCode", "CSES", "AtCoder", "Codeforces", "Project Euler", "Kattis", "Other"];
const DIFFICULTIES = ["easy", "medium", "hard"];

async function ProblemsTable({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  await requireAdminPage();

  const sp = await searchParams;
  const q = one(sp.q).trim();
  const source = one(sp.source).trim();
  const difficulty = one(sp.difficulty).trim();
  const pattern = one(sp.pattern).trim();
  const brute = one(sp.brute).trim();
  const missingLang = one(sp.missingLang).trim();

  const [allSummaries, patterns, db] = await Promise.all([
    listProblemSummaries(),
    getAllPatterns(),
    getContentDb(),
  ]);

  // Query updated_at for problems and latest audit rows for actor attribution
  const [dbProblemRows, recentAuditRows] = await Promise.all([
    db.select({ id: problemsTable.id, updatedAt: problemsTable.updatedAt }).from(problemsTable),
    db
      .select({
        entityId: adminAudit.entityId,
        actorName: adminAudit.actorName,
        at: adminAudit.at,
      })
      .from(adminAudit)
      .where(eq(adminAudit.entity, "problem"))
      .orderBy(desc(adminAudit.id))
      .limit(500),
  ]);

  const updatedAtMap = new Map<string, number>();
  for (const r of dbProblemRows) {
    if (r.updatedAt) updatedAtMap.set(r.id, r.updatedAt);
  }

  const auditMap = new Map<string, { actorName: string; at: number }>();
  for (const a of recentAuditRows) {
    if (!auditMap.has(a.entityId)) {
      auditMap.set(a.entityId, { actorName: a.actorName, at: a.at });
    }
  }

  const qLower = q.toLowerCase();

  const filtered = allSummaries.filter((p) => {
    if (qLower && !p.id.toLowerCase().includes(qLower) && !p.title.toLowerCase().includes(qLower)) {
      return false;
    }
    if (source && p.source !== source) {
      return false;
    }
    if (difficulty && p.difficulty !== difficulty) {
      return false;
    }
    if (pattern && p.pattern !== pattern) {
      return false;
    }
    if (brute === "yes" && !p.hasBrute) return false;
    if (brute === "no" && p.hasBrute) return false;
    if (missingLang === "yes" && p.languages.length >= 4) return false;
    return true;
  });

  const formatDate = (ts?: number) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar (works without JS as a standard GET form) */}
      <form method="GET" action="/admin/problems" className="rounded-lg border border-line bg-surface p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <div className="sm:col-span-2">
            <label className="block text-[11px] font-medium text-muted mb-1">Search ID or Title</label>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Filter by name or slug..."
              className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Source</label>
            <select
              name="source"
              defaultValue={source}
              className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
            >
              <option value="">All Sources</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Difficulty</label>
            <select
              name="difficulty"
              defaultValue={difficulty}
              className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
            >
              <option value="">All Difficulties</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Pattern</label>
            <select
              name="pattern"
              defaultValue={pattern}
              className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
            >
              <option value="">All Patterns</option>
              {patterns.map((pat) => (
                <option key={pat.id} value={pat.id}>
                  {pat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Has Brute Force</label>
            <select
              name="brute"
              defaultValue={brute}
              className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
            >
              <option value="">Any</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between border-t border-line/60 pt-3 gap-2">
          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              name="missingLang"
              value="yes"
              defaultChecked={missingLang === "yes"}
              className="rounded border-line text-accent focus:ring-accent"
            />
            Only show problems missing languages (&lt; 4)
          </label>

          <div className="flex items-center gap-2">
            {(q || source || difficulty || pattern || brute || missingLang) && (
              <Link
                href="/admin/problems"
                className="rounded border border-line bg-surface px-3 py-1.5 text-xs text-muted hover:text-foreground"
              >
                Reset filters
              </Link>
            )}
            <button
              type="submit"
              className="rounded bg-accent px-4 py-1.5 text-xs font-semibold text-white hover:bg-accent/90"
            >
              Apply filters
            </button>
          </div>
        </div>
      </form>

      {/* Results header */}
      <div className="flex items-center justify-between text-xs text-muted">
        <span>
          Showing <strong>{filtered.length}</strong> of {allSummaries.length} problems
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-line bg-surface/60 font-medium text-muted">
              <th className="p-3">ID</th>
              <th className="p-3">Title</th>
              <th className="p-3">Difficulty</th>
              <th className="p-3">Source</th>
              <th className="p-3">Pattern</th>
              <th className="p-3">Languages</th>
              <th className="p-3">Last Edited</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-muted">
                  No problems match the selected filters.
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const updatedTs = updatedAtMap.get(p.id);
                const audit = auditMap.get(p.id);

                return (
                  <tr key={p.id} className="hover:bg-surface/40 transition-colors">
                    <td className="p-3 font-mono text-accent">
                      <Link href={`/admin/problems/${p.id}`} className="hover:underline font-semibold">
                        {p.id}
                      </Link>
                    </td>
                    <td className="p-3 font-medium text-foreground max-w-xs truncate">
                      <Link href={`/admin/problems/${p.id}`} className="hover:underline">
                        {p.title}
                      </Link>
                    </td>
                    <td className="p-3">
                      {p.difficulty ? <DifficultyBadge level={p.difficulty} /> : <span className="text-muted">—</span>}
                    </td>
                    <td className="p-3 text-muted">{p.source ?? "—"}</td>
                    <td className="p-3 text-muted max-w-[150px] truncate">{p.pattern ?? "—"}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        {(["cpp", "java", "python", "javascript"] as const).map((lang) => {
                          const has = p.languages.includes(lang);
                          return (
                            <span
                              key={lang}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono font-medium ${
                                has ? "bg-accent/15 text-accent" : "bg-surface-2 text-muted/40"
                              }`}
                              title={has ? `${lang} solution present` : `Missing ${lang} solution`}
                            >
                              {lang === "javascript" ? "js" : lang === "python" ? "py" : lang}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-3 text-muted whitespace-nowrap">
                      <div>{formatDate(audit?.at ?? updatedTs)}</div>
                      {audit && <div className="text-[10px] text-muted/70">by {audit.actorName}</div>}
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/problems/${p.id}`}
                        className="rounded border border-line bg-surface px-2.5 py-1 text-xs text-foreground hover:bg-surface-2 font-medium"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminProblemsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Problems Catalog</h1>
          <p className="text-xs text-muted">
            Manage all problem statements, test cases, hints, and reference solutions from the content database.
          </p>
        </div>
        <Link
          href="/admin/problems/new"
          className="rounded-md bg-accent px-4 py-2 text-xs font-semibold text-white shadow hover:bg-accent/90"
        >
          + New problem
        </Link>
      </div>

      <Suspense fallback={<div className="h-96 rounded-lg border border-line bg-surface animate-pulse" />}>
        <ProblemsTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
