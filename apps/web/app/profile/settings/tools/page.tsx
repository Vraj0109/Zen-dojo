import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { detectTools } from "@/lib/judge/tools";
import { PageMain } from "../../../ui";
import { ProfileTabs } from "../../profile-ui";
import { CopyCommand } from "./copy-command";

export const metadata: Metadata = { title: "Tools for running code" };

export default function ToolsPage() {
  return (
    <PageMain title="Tools for running code">
      <ProfileTabs active="/profile/settings" />
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
  const tools = await detectTools();
  const missing = tools.filter((t) => !t.found).length;
  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-sm text-muted">
        The Run button uses programs installed on this computer. Reading lessons, plans, notes and tracking work without any of them. Install only
        the languages you want to practise in.{" "}
        {missing === 0 ? "Everything below was found." : `${missing} of ${tools.length} not found.`}
      </p>
      <ul className="grid gap-4 xl:grid-cols-2">
        {tools.map((t) => (
          <li key={t.id} className="space-y-3 rounded-xl border border-line bg-surface p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold">{t.label}</h3>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  t.found ? "border-green-600/40 text-green-600 dark:text-green-400" : "border-amber-600/50 text-amber-700 dark:text-amber-400"
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
        <button type="submit" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-background">
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
