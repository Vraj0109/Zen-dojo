import type { Metadata } from "next";
import Link from "next/link";
import { buttonClass } from "../ui";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage() {
  return (
    <main className="flex w-full flex-col items-center px-4 py-10 sm:min-h-[80vh] sm:justify-center">
      <div className="w-full space-y-5 rounded-lg border border-line bg-surface p-6 sm:max-w-md sm:p-8 sm:shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Zen Dojo</h1>
          <p className="mt-2 text-sm text-muted">
            A 16-week interview-prep course: DSA, system design, low-level design and core CS. Sign in with GitHub to see your plan, notes and
            progress on any computer or phone. The same account works in the desktop app.
          </p>
        </div>
        <div className="space-y-2">
          <a href="/auth/start" className={buttonClass("primary", "md", "w-full")}>
            Continue with GitHub
          </a>
          <Link href="/" className={buttonClass("secondary", "md", "w-full")}>
            Try it without an account
          </Link>
        </div>
        <p className="text-xs text-muted">Running code is available in the desktop app.</p>
      </div>
    </main>
  );
}
