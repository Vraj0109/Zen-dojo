import { connection } from "next/server";
import { Suspense } from "react";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth/admin";
import { getContentDb } from "@/lib/content-db/client";
import { listAudit } from "@/lib/content-db/audit";
import { HistoryViewer } from "../components/history-viewer";

type SearchParams = Promise<{
  entity?: string | string[];
  entityId?: string | string[];
  actorId?: string | string[];
}>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

async function AuditTableContainer({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  await requireAdminPage();

  const sp = await searchParams;
  const entity = one(sp.entity).trim() || undefined;
  const entityId = one(sp.entityId).trim() || undefined;
  const actorId = one(sp.actorId).trim() || undefined;

  const db = await getContentDb();
  const rows = await listAudit(db, {
    entity,
    entityId,
    actorId,
    limit: 100,
  });

  return (
    <div className="space-y-6">
      {/* Filter bar (GET form works without JS) */}
      <form method="GET" action="/admin/audit" className="rounded-lg border border-line bg-surface p-4 space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Entity Type</label>
            <select
              name="entity"
              defaultValue={entity ?? ""}
              className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
            >
              <option value="">All Entities</option>
              <option value="problem">problem</option>
              <option value="lesson">lesson</option>
              <option value="course">course</option>
              <option value="doc">doc</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Entity ID</label>
            <input
              type="text"
              name="entityId"
              defaultValue={entityId ?? ""}
              placeholder="e.g. two-sum or lld-solid..."
              className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 font-mono text-xs focus:border-accent focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-muted mb-1">Actor ID</label>
            <input
              type="text"
              name="actorId"
              defaultValue={actorId ?? ""}
              placeholder="Filter by admin user ID..."
              className="w-full rounded border border-line bg-surface/50 px-2.5 py-1.5 text-xs focus:border-accent focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line/60 pt-3">
          {(entity || entityId || actorId) && (
            <Link
              href="/admin/audit"
              className="rounded border border-line bg-surface px-3 py-1 text-xs text-muted hover:text-foreground"
            >
              Reset
            </Link>
          )}
          <button
            type="submit"
            className="rounded bg-accent px-4 py-1 text-xs font-semibold text-white hover:bg-accent/90"
          >
            Filter Audit Log
          </button>
        </div>
      </form>

      {/* History viewer with diff inspection and restore */}
      <HistoryViewer auditRows={rows} />
    </div>
  );
}

export default function AdminAuditPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-4">
      <div className="border-b border-line pb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Content Audit Log</h1>
        <p className="text-xs text-muted">
          Complete change history across problems, lessons, and content docs. Inspect diffs and restore previous versions.
        </p>
      </div>

      <Suspense fallback={<div className="h-96 rounded-lg border border-line bg-surface animate-pulse" />}>
        <AuditTableContainer searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
