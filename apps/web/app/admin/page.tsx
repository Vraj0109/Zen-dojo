import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PROBLEMS, type Difficulty } from "@habit/shared";
import { requireAdmin } from "@/lib/auth/session";

function sourceOf(id: string): string {
  if (id.startsWith("lc-")) return "LeetCode";
  if (id.startsWith("cses-")) return "CSES";
  if (id.startsWith("c-atc-")) return "AtCoder";
  if (id.startsWith("c-cf-")) return "Codeforces";
  if (id.startsWith("c-euler-")) return "Project Euler";
  if (id.startsWith("c-kattis-")) return "Kattis";
  return "Other";
}

type Bucket = Difficulty | "none";
type Counts = Record<Bucket, number>;

const DIFFS: Bucket[] = ["easy", "medium", "hard", "none"];
const DIFF_LABEL: Record<Bucket, string> = { easy: "Easy", medium: "Medium", hard: "Hard", none: "Unrated" };

function sum(r: Counts): number {
  return r.easy + r.medium + r.hard + r.none;
}

async function Dashboard() {
  await connection();
  await requireAdmin();

  const rows = new Map<string, Counts>();
  const totals: Counts = { easy: 0, medium: 0, hard: 0, none: 0 };
  const list = Object.values(PROBLEMS);
  for (const p of list) {
    const src = sourceOf(p.id);
    const d: Bucket = p.difficulty ?? "none";
    const row = rows.get(src) ?? { easy: 0, medium: 0, hard: 0, none: 0 };
    row[d] += 1;
    totals[d] += 1;
    rows.set(src, row);
  }
  const sorted = [...rows.entries()].sort((a, b) => sum(b[1]) - sum(a[1]));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Tile label="All problems" value={list.length} />
        {DIFFS.map((d) => (
          <Tile key={d} label={DIFF_LABEL[d]} value={totals[d]} />
        ))}
      </section>
      <section className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <caption className="px-4 py-3 text-left text-sm font-semibold">Problems by source and difficulty</caption>
          <thead>
            <tr className="border-y border-line text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-2">Source</th>
              {DIFFS.map((d) => (
                <th key={d} scope="col" className="px-4 py-2 text-right">{DIFF_LABEL[d]}</th>
              ))}
              <th scope="col" className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(([src, r]) => (
              <tr key={src} className="border-b border-line last:border-0">
                <th scope="row" className="px-4 py-2 text-left font-medium">
                  <Link href={`/admin/problems?source=${encodeURIComponent(src)}`} className="hover:underline">{src}</Link>
                </th>
                {DIFFS.map((d) => (
                  <td key={d} className="px-4 py-2 text-right tabular-nums">{r[d]}</td>
                ))}
                <td className="px-4 py-2 text-right font-semibold tabular-nums">{sum(r)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <p className="text-sm text-muted">
        Read-only view of the built-in catalog. Edits and stored problems arrive with the sync plan 0044.{" "}
        <Link href="/admin/problems" className="text-accent hover:underline">Browse all problems</Link>
      </p>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Dashboard</h1>
      <Suspense fallback={<div className="h-48 rounded-xl border border-line bg-surface" />}>
        <Dashboard />
      </Suspense>
    </main>
  );
}
