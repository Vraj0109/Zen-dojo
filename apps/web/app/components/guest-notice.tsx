import { connection } from "next/server";
import { isHosted } from "@/lib/hosted";
import { DismissibleBar } from "./dismissible-bar";

/**
 * Hosted site only: tells visitors who are not signed in that nothing is saved yet. A slim bar at the top of the content
 * area (DESIGN.md: never floating over content), dismissible for this browser session. Rendered by the shell inside
 * <Suspense>. Phones show the Sign in card on Today instead.
 */
export async function GuestNotice() {
  if (!isHosted()) return null;
  await connection();
  const { getSession } = await import("@/lib/auth/session");
  if (await getSession()) return null;
  return (
    <DismissibleBar storageKey="zen-dojo:guest-notice-dismissed" className="max-md:hidden">
      You are browsing as a guest, so progress is not saved.{" "}
      <a href="/auth/start" className="font-semibold text-primary hover:underline">
        Sign in with GitHub
      </a>{" "}
      to keep it.
    </DismissibleBar>
  );
}
