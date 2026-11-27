import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdminPage } from "@/lib/auth/admin";
import { getDoc } from "@/lib/content-repo/docs";
import { getContentDb } from "@/lib/content-db/client";
import { listAudit } from "@/lib/content-db/audit";
import { DocEditorClient } from "./doc-editor-client";

async function DocEditorContainer({ params }: { params: Promise<{ kind: string; id: string }> | { kind: string; id: string } }) {
  await connection();
  await requireAdminPage();
  const { kind, id } = await params;

  const [doc, db] = await Promise.all([getDoc(kind, id), getContentDb()]);

  if (!doc) {
    notFound();
  }

  const auditRows = await listAudit(db, {
    entity: "doc",
    entityId: `${kind}:${id}`,
    limit: 50,
  });

  return <DocEditorClient doc={doc} initialAuditRows={auditRows} />;
}

async function DocTitle({ params }: { params: Promise<{ kind: string; id: string }> | { kind: string; id: string } }) {
  const { kind, id } = await params;
  return (
    <span className="font-mono text-accent text-xl">
      {kind} / {id}
    </span>
  );
}

// Route params are request data: they are read only inside Suspense, so the page shell still prerenders.
export default function AdminDocPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }> | { kind: string; id: string };
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Edit Document:{" "}
          <Suspense fallback={null}>
            <DocTitle params={params} />
          </Suspense>
        </h1>
      </div>
      <Suspense fallback={<div className="h-96 rounded-lg border border-line bg-surface animate-pulse" />}>
        <DocEditorContainer params={params} />
      </Suspense>
    </div>
  );
}
