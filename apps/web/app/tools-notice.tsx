import Link from "next/link";
import { connection } from "next/server";
import { detectTools } from "@/lib/judge/tools";
import { dismissToolsNoticeAction } from "./profile/settings/tools/actions";
import { isToolsNoticeDismissed } from "./profile/settings/tools/notice-state";
import { SubmitButton } from "./submit-button";

/** Shown on Today only in the desktop app, only when a tool for running code is missing, until dismissed. */
export async function ToolsNotice() {
  if (process.env.HABIT_DESKTOP !== "1") return null;
  await connection();
  if (await isToolsNoticeDismissed()) return null;
  const missing = (await detectTools()).filter((t) => !t.found);
  if (missing.length === 0) return null;
  return (
    <div role="note" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-4">
      <p className="min-w-0 flex-1 text-sm">
        To use the Run button, this computer still needs: <strong>{missing.map((t) => t.label).join(", ")}</strong>. Reading, plans and notes work without
        them.{" "}
        <Link href="/profile/settings/tools" className="font-medium underline">
          See how to install
        </Link>
      </p>
      <form action={dismissToolsNoticeAction}>
        <SubmitButton className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-background">Dismiss</SubmitButton>
      </form>
    </div>
  );
}
