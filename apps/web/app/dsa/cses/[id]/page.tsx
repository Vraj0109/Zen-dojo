import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { CSES_PROBLEMS } from "@habit/shared";
import { ProblemWorkspace } from "../../../problem-workspace";
import { PageMain } from "../../../ui";

/** One page per CSES problem, known at build time. */
export function generateStaticParams() {
  return CSES_PROBLEMS.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/dsa/cses/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: CSES_PROBLEMS.find((p) => p.id === id)?.title ?? "CSES problem" };
}

export default function CsesProblemPage({ params }: PageProps<"/dsa/cses/[id]">) {
  return (
    <PageMain title="CSES problem">
      <Suspense fallback={<p className="text-muted">Loading the problem…</p>}>
        <Problem params={params} />
      </Suspense>
    </PageMain>
  );
}

async function Problem({ params }: { params: PageProps<"/dsa/cses/[id]">["params"] }) {
  await connection(); // the code highlighter reads the clock, which can't happen while prerendering
  const { id } = await params;
  const spec = CSES_PROBLEMS.find((p) => p.id === id);
  if (!spec) notFound();
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <Link href="/dsa/cses" className="text-sm text-muted hover:text-foreground">
          ← CSES problems
        </Link>
        <h2 className="text-2xl font-semibold tracking-tight">{spec.title}</h2>
        <p className="text-xs text-muted">CSES Problem Set</p>
      </header>
      <ProblemWorkspace spec={spec} />
    </div>
  );
}
