import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { detectTools } from "@/lib/judge/tools";
import { realDeps, toolCards } from "@/lib/tools/handlers";
import { PageMain } from "../../../ui";
import { PROFILE_PAGE_CLASS } from "../../shared";
import { CopyCommand } from "./copy-command";
import { ToolManager } from "./tool-manager";

export const metadata: Metadata = { title: "Tools for running code" };

export default function ToolsPage() {
  return (
    <PageMain title="Tools for running code" hideTitle className={PROFILE_PAGE_CLASS}>
      <Link href="/profile/settings" className="mb-4 inline-block text-sm text-muted hover:text-foreground">
        &larr; Settings
      </Link>
      <Suspense fallback={<p className="text-sm text-muted">Checking your computer...</p>}>
        <Tools />
      </Suspense>
    </PageMain>
  );
}

async function Tools() {
  await connection();
  const tools = await detectTools({ fresh: true });
  const missing = tools.filter((t) => !t.found).length;
  // The desktop app can download Java, Python and a Windows C++ compiler; the web build only shows install commands.
  const desktop = process.env.HABIT_DESKTOP === "1" && process.env.HABIT_HOSTED !== "1";
  const cards = desktop ? await toolCards(realDeps()) : null;
  const listed = cards ? tools.filter((t) => t.id === "javascript") : tools;
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted">
        The Run button uses programs installed on this computer. Reading lessons, plans, notes and tracking work without any of them. Install only
        the languages you want to practise in.{" "}
        {missing === 0 ? "Everything below was found." : `${missing} of ${tools.length} not found.`}
      </p>
      {cards && <ToolManager cards={cards} />}
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,420px),1fr))] gap-4">
        {listed.map((t) => (
          <li key={t.id} className="space-y-3 rounded-[24px] border border-line bg-surface p-5 dark:border-0">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{t.label}</h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  t.found ? "border-success/40 text-success" : "border-warning/50 text-warning"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={t.found ? "m5 12 5 5 9-10" : "M12 8v5m0 4h.01"} />
                </svg>
                {t.found ? (t.version ? `Found, ${t.version}` : "Found") : "Not found"}
              </span>
            </div>
            <p className="text-sm text-muted">{t.usedFor}</p>
            {!t.found && (
              <div className="space-y-2">
                {t.hint.command && <CopyCommand command={t.hint.command} />}
                <p className="text-xs text-muted">{t.hint.note}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
      <form action="/profile/settings/tools" method="get">
        <button type="submit" className="inline-flex h-10 items-center rounded-full border border-outline px-4 text-sm font-medium text-primary hover:bg-surface-2">
          Check again
        </button>
      </form>
      <p className="max-w-3xl text-xs text-muted">
        Already installed but shown as not found? Restart the app so it sees the new PATH, or point it at the program with the environment variables{" "}
        <code>HABIT_GPP</code>, <code>HABIT_JAVAC</code>, <code>HABIT_JAVA</code>, <code>HABIT_NODE</code> or <code>HABIT_PYTHON</code>. More in{" "}
        <code>docs/troubleshooting.md</code>.
      </p>
    </div>
  );
}
