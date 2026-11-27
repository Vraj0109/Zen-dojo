import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getProblem } from "@/lib/content-repo/problems";
import { getAllPatterns } from "@/lib/content-repo/lookups";
import { getContentDb } from "@/lib/content-db/client";
import { listAudit } from "@/lib/content-db/audit";
import { isDesktop } from "@/lib/admin-content/write";
import { ProblemEditorClient } from "./problem-editor-client";

async function ProblemEditorContainer({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  await connection();
  await requireAdminPage();
  const { id } = await params;

  const [problem, patterns, db] = await Promise.all([
    getProblem(id),
    getAllPatterns(),
    getContentDb(),
  ]);

  if (!problem) {
    notFound();
  }

  const auditRows = await listAudit(db, {
    entity: "problem",
    entityId: id,
    limit: 50,
  });

  return (
    <ProblemEditorClient
      initialProblem={problem}
      initialAuditRows={auditRows}
      patterns={patterns.map((p) => ({ id: p.id, name: p.name }))}
      isDesktop={isDesktop()}
    />
  );
}

async function IdTitle({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const { id } = await params;
  return <span className="font-mono text-accent text-xl">{id}</span>;
}

// Route params are request data: read only inside Suspense, so the page shell still prerenders.
export default function ProblemEditPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Edit Problem:{" "}
          <Suspense fallback={null}>
            <IdTitle params={params} />
          </Suspense>
        </h1>
      </div>
      <Suspense fallback={<div className="h-96 rounded-lg border border-line bg-surface animate-pulse" />}>
        <ProblemEditorContainer params={params} />
      </Suspense>
    </div>
  );
}
