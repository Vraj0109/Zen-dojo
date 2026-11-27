import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { DOC_KINDS, type DocKind } from "@habit/shared";
import { requireAdminPage } from "@/lib/auth/admin";
import { listDocs } from "@/lib/content-repo/docs";

async function DocsListContainer() {
  await connection();
  await requireAdminPage();

  const kinds = Object.keys(DOC_KINDS) as DocKind[];

  const kindGroups = await Promise.all(
    kinds.map(async (kind) => {
      const docs = await listDocs(kind);
      return { kind, docs };
    }),
  );

  return (
    <div className="space-y-8">
      <p className="text-xs text-muted">
        Document-level content records in the database (reading lists, quiz deck, roadmap problem lists, pattern groups, and reference data).
      </p>

      {kindGroups.map(({ kind, docs }) => (
        <section key={kind} className="space-y-2">
          <div className="flex items-center justify-between border-b border-line pb-1.5">
            <h2 className="text-sm font-semibold text-foreground capitalize">
              Kind: <span className="font-mono text-accent">{kind}</span>
            </h2>
            <span className="text-xs text-muted">{docs.length} docs</span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-line bg-surface/60 font-medium text-muted">
                  <th className="p-2.5">ID</th>
                  <th className="p-2.5">Kind</th>
                  <th className="p-2.5">Data type</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {docs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-muted">
                      No documents stored under this kind.
                    </td>
                  </tr>
                ) : (
                  docs.map((doc) => {
                    const isArr = Array.isArray(doc.body);
                    const isObj = doc.body && typeof doc.body === "object";
                    const count = isArr
                      ? `${(doc.body as unknown[]).length} items`
                      : isObj
                        ? `${Object.keys(doc.body as object).length} keys`
                        : typeof doc.body;

                    return (
                      <tr key={doc.id} className="hover:bg-surface/40 transition-colors">
                        <td className="p-2.5 font-mono text-accent">
                          <Link href={`/admin/docs/${kind}/${doc.id}`} className="hover:underline font-semibold">
                            {doc.id}
                          </Link>
                        </td>
                        <td className="p-2.5 font-mono text-muted">{doc.kind}</td>
                        <td className="p-2.5 text-muted">{count}</td>
                        <td className="p-2.5 text-right whitespace-nowrap">
                          <Link
                            href={`/admin/docs/${kind}/${doc.id}`}
                            className="rounded border border-line bg-surface px-2.5 py-1 text-xs text-foreground hover:bg-surface-2 font-medium"
                          >
                            Edit JSON
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

export default function AdminDocsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Content Documents</h1>
          <p className="text-xs text-muted">Raw JSON data documents stored in the content database.</p>
        </div>
      </div>
      <Suspense fallback={<div className="h-96 rounded-lg border border-line bg-surface animate-pulse" />}>
        <DocsListContainer />
      </Suspense>
    </div>
  );
}
