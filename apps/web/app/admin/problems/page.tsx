import { createHmac, timingSafeEqual } from "node:crypto";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { PROBLEMS, type PackProblem, type Problem } from "@habit/shared";
import { getItem, listItems } from "@/lib/content";
import { ProblemDrawer, type DrawerInitial } from "./problem-drawer";

const COOKIE = "zen_admin_session";

function isAuthed(value: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !value) return false;
  const expected = createHmac("sha256", secret).update("zen-dojo-admin-session-v1").digest("hex");
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function sourceOf(id: string): string {
  if (id.startsWith("lc-")) return "LeetCode";
  if (id.startsWith("cses-")) return "CSES";
  if (id.startsWith("c-atc-")) return "AtCoder";
  if (id.startsWith("c-cf-")) return "Codeforces";
  if (id.startsWith("c-euler-")) return "Project Euler";
  if (id.startsWith("c-kattis-")) return "Kattis";
  return "Other";
}

const SOURCES = ["LeetCode", "CSES", "AtCoder", "Codeforces", "Project Euler", "Kattis", "Other"];
const DIFFICULTIES = ["easy", "medium", "hard", "none"];
const MAX_ROWS = 200;

type Params = {
  q?: string | string[];
  source?: string | string[];
  difficulty?: string | string[];
  edit?: string | string[];
  new?: string | string[];
};

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function keep(p: { q: string; source: string; difficulty: string }, extra: Record<string, string>): string {
  const sp = new URLSearchParams();
  if (p.q) sp.set("q", p.q);
  if (p.source) sp.set("source", p.source);
  if (p.difficulty) sp.set("difficulty", p.difficulty);
  for (const [k, v] of Object.entries(extra)) sp.set(k, v);
  const s = sp.toString();
  return s ? `/admin/problems?${s}` : "/admin/problems";
}

const field = "w-full rounded-md border border-line bg-background px-3 py-2 text-sm";

function toInitial(id: string, builtin: Problem | null, stored: PackProblem | null): DrawerInitial {
  if (stored) {
    const cases = [...stored.examples, ...stored.tests].map((c) => ({ input: c.input, output: c.output }));
    return {
      originalId: id,
      title: stored.title,
      slug: stored.id,
      difficulty: stored.difficulty ?? "easy",
      source: stored.source ?? "",
      category: stored.group ?? "",
      description: stored.statement.join("\n\n"),
      constraints: stored.constraints.join("\n"),
      fnName: stored.fn.name,
      params: stored.fn.params.map((p) => `${p.name}:${p.type}`).join(", "),
      returns: stored.fn.returns,
      tests: JSON.stringify(cases, null, 2),
      code: stored.solution?.cpp ?? "",
      stored: true,
    };
  }
  return {
    originalId: "",
    title: builtin?.title ?? "",
    slug: builtin ? (builtin.slug ?? builtin.id) : "",
    difficulty: builtin?.difficulty ?? "easy",
    source: builtin ? sourceOf(builtin.id) : "",
    category: "",
    description: builtin?.why ?? "",
    constraints: "",
    fnName: "",
    params: "",
    returns: "int",
    tests: "",
    code: "",
    stored: false,
  };
}

async function ProblemsTable({ searchParams }: { searchParams: Promise<Params> }) {
  await connection();
  if (!isAuthed((await cookies()).get(COOKIE)?.value)) redirect("/admin/login");

  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 100);
  const source = SOURCES.includes(one(sp.source)) ? one(sp.source) : "";
  const difficulty = DIFFICULTIES.includes(one(sp.difficulty)) ? one(sp.difficulty) : "";
  const f = { q, source, difficulty };

  const needle = q.toLowerCase();
  const all = Object.values(PROBLEMS);
  const matches = all.filter((p) => {
    if (source && sourceOf(p.id) !== source) return false;
    if (difficulty && (p.difficulty ?? "none") !== difficulty) return false;
    if (needle && !p.title.toLowerCase().includes(needle) && !(p.slug ?? p.id).toLowerCase().includes(needle)) return false;
    return true;
  });
  const shown = matches.slice(0, MAX_ROWS);
  const editId = one(sp.edit);
  const storedRow = editId ? await getItem(`problem:${editId}`) : null;
  const storedEdit = storedRow?.item.type === "problem" ? (storedRow.item as PackProblem) : null;
  const builtinEdit = editId ? (PROBLEMS[editId] ?? null) : null;
  const drawerMode: "new" | "edit" | null = storedEdit || builtinEdit ? "edit" : one(sp.new) === "1" ? "new" : null;
  const storedShown = (await listItems("problem"))
    .filter((r) => r.source !== "builtin" && r.item.type === "problem")
    .map((r) => r.item as PackProblem)
    .filter((p) => {
      if (source && (p.source ?? "Other") !== source) return false;
      if (difficulty && (p.difficulty ?? "none") !== difficulty) return false;
      if (needle && !p.title.toLowerCase().includes(needle) && !p.id.includes(needle)) return false;
      return true;
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <form method="get" action="/admin/problems" className="flex flex-1 flex-wrap items-end gap-3">
          <label className="block min-w-56 flex-1 text-sm">Search title or slug
            <input name="q" defaultValue={q} className={`${field} mt-1`} placeholder="two sum" />
          </label>
          <label className="block text-sm">Source
            <select name="source" defaultValue={source} className={`${field} mt-1`}>
              <option value="">All sources</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <label className="block text-sm">Difficulty
            <select name="difficulty" defaultValue={difficulty} className={`${field} mt-1`}>
              <option value="">All</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="none">Unrated</option>
            </select>
          </label>
          <button type="submit" className="rounded-md border border-line px-4 py-2 text-sm hover:bg-surface">Filter</button>
          {(q || source || difficulty) && <Link href="/admin/problems" className="py-2 text-sm text-muted hover:underline">Clear</Link>}
        </form>
        <Link href={keep(f, { new: "1" })} className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add New Problem
        </Link>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {matches.length} of {all.length} problems{matches.length > MAX_ROWS ? `, showing the first ${MAX_ROWS}` : ""}.
      </p>

      <div className="overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
              <th scope="col" className="px-4 py-2">Title</th>
              <th scope="col" className="px-4 py-2">Slug or id</th>
              <th scope="col" className="px-4 py-2">Source</th>
              <th scope="col" className="px-4 py-2">Difficulty</th>
              <th scope="col" className="px-4 py-2">Status</th>
              <th scope="col" className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {storedShown.map((p) => (
              <tr key={`stored-${p.id}`} className="border-b border-line">
                <td className="px-4 py-2 font-medium">{p.title}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted">{p.id}</td>
                <td className="px-4 py-2">{p.source ?? "Other"}</td>
                <td className="px-4 py-2">{p.difficulty ? <span className={`text-diff-${p.difficulty}`}>{p.difficulty}</span> : <span className="text-muted">unrated</span>}</td>
                <td className="px-4 py-2 text-muted">Stored</td>
                <td className="px-4 py-2 text-right">
                  <Link href={keep(f, { edit: p.id })} className="text-accent hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
            {shown.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2 font-medium">{p.title}</td>
                <td className="px-4 py-2 font-mono text-xs text-muted">{p.slug ?? p.id}</td>
                <td className="px-4 py-2">{sourceOf(p.id)}</td>
                <td className="px-4 py-2">
                  {p.difficulty ? <span className={`text-diff-${p.difficulty}`}>{p.difficulty}</span> : <span className="text-muted">unrated</span>}
                </td>
                <td className="px-4 py-2 text-muted">Built-in</td>
                <td className="px-4 py-2 text-right">
                  <Link href={keep(f, { edit: p.id })} className="text-accent hover:underline">Edit</Link>
                </td>
              </tr>
            ))}
            {shown.length === 0 && storedShown.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">No problems match these filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {drawerMode && (
        <ProblemDrawer key={`${drawerMode}:${editId}`} mode={drawerMode} initial={toInitial(editId, builtinEdit, storedEdit)} closeHref={keep(f, {})} />
      )}
    </div>
  );
}

export default function AdminProblemsPage({ searchParams }: PageProps<"/admin/problems">) {
  return (
    <main>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Problems</h1>
      <Suspense fallback={<div className="h-64 rounded-xl border border-line bg-surface" />}>
        <ProblemsTable searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
