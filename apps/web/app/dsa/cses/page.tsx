import type { Metadata } from "next";
import Link from "next/link";
import { CSES_PROBLEMS } from "@habit/shared";
import { PageMain } from "../../ui";

export const metadata: Metadata = { title: "CSES problems" };

export default function CsesPage() {
  return (
    <PageMain title="CSES problems">
      <div className="space-y-6">
        <header className="space-y-2">
          <Link href="/dsa" className="text-sm text-muted hover:text-foreground">
            ← Practice
          </Link>
          <h2 className="text-2xl font-semibold tracking-tight">CSES problems</h2>
          <p className="max-w-3xl text-sm text-muted">
            Problems from the{" "}
            <a href="https://cses.fi/problemset/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline">
              CSES Problem Set
            </a>
            , turned into a function you fill in, like LeetCode: starter code, Run, hints and the solution. The statements are short summaries and the
            test cases were written for this app (CSES&apos;s own tests are not public), so passing here is a good sign but CSES may still find a case we
            did not.
          </p>
        </header>

        <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
          {CSES_PROBLEMS.map((p) => (
            <li key={p.id}>
              <Link href={`/dsa/cses/${p.id}`} className="flex items-center justify-between gap-3 p-4 hover:bg-background">
                <span className="font-medium">{p.title}</span>
                <span className="text-xs text-muted">{p.examples.length + p.tests.length} cases · 3 hints</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">{CSES_PROBLEMS.length} problems so far. More are added in plan 0019.</p>
      </div>
    </PageMain>
  );
}
