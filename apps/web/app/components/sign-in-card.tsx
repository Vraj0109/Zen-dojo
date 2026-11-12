import { connection } from "next/server";
import { isHosted } from "@/lib/hosted";

/**
 * Hosted site only, for visitors who are not signed in: one plain card that says what signing in gives and has the button.
 * It sits in the page (top of Today on phones, top of the You tab), scrolls away with the page and never floats.
 * `phoneOnly` hides it from `md` up, where the account menu and the guest notice already cover it.
 */
export async function SignInCard({ next, phoneOnly = false }: { next: string; phoneOnly?: boolean }) {
  if (!isHosted()) return null;
  await connection();
  const { getSession } = await import("@/lib/auth/session");
  if (await getSession()) return null;
  return (
    <section className={`mb-5 rounded-2xl border border-line bg-surface p-4 ${phoneOnly ? "md:hidden" : ""}`}>
      <h2 className="text-base font-semibold">Save your progress</h2>
      <p className="mt-1 text-sm text-muted">Sign in to keep your streak and solved problems, and to sync with the desktop app. You can keep browsing without it.</p>
      <a
        href={`/auth/start?next=${encodeURIComponent(next)}`}
        className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-on-accent sm:w-auto"
      >
        Sign in with GitHub
      </a>
    </section>
  );
}
