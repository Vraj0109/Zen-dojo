import { connection } from "next/server";
import { isHosted } from "@/lib/hosted";

/** Hosted site only: tells visitors who are not signed in that nothing is saved yet. Mount once in the root layout inside <Suspense>. */
export async function GuestNotice() {
  if (!isHosted()) return null;
  await connection();
  const { getSession } = await import("@/lib/auth/session");
  if (await getSession()) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-4 max-md:hidden print:hidden">
      <p className="pointer-events-auto max-w-md rounded-xl border border-line bg-surface px-4 py-2 text-xs text-muted shadow-lg">
        You are browsing as a guest, so progress is not saved.{" "}
        <a href="/auth/start" className="font-medium text-foreground underline">
          Sign in with GitHub
        </a>{" "}
        to keep it.
      </p>
    </div>
  );
}
