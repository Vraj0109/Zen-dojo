import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

/** Same-origin paths only: one leading slash, no "//", no backslash, no control characters. */
function safeNext(value: string | string[] | undefined): string {
  const v = Array.isArray(value) ? value[0] : value;
  if (!v || v.length > 512 || !v.startsWith("/") || v.startsWith("//") || v.includes("\\")) return "/";
  if (/[\u0000-\u001f\u007f]/.test(v)) return "/";
  return v;
}

const ERRORS: Record<string, string> = {
  access_denied: "GitHub sign-in was cancelled. You can try again.",
  state: "The sign-in took too long or was started in another tab. Please try again.",
  rate_limited: "Too many sign-in attempts. Wait a minute and try again.",
};

function errorText(code: string | string[] | undefined): string | null {
  const c = Array.isArray(code) ? code[0] : code;
  if (!c) return null;
  return ERRORS[c] ?? "Sign-in did not work. Please try again.";
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-5" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

async function LoginBody({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string | string[] }> }) {
  await connection();
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const error = errorText(sp.error);
  const session = await getSession();

  if (session) {
    return (
      <div className="max-w-md space-y-4 rounded-xl border border-line bg-surface p-6">
        <p className="text-sm">You are signed in as {session.name}.</p>
        <div className="flex flex-wrap gap-3">
          <Link href={next} className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent">Continue</Link>
          <Link href="/profile/account" className="rounded-md border border-line px-4 py-2 text-sm hover:bg-background">Account</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md space-y-4 rounded-xl border border-line bg-surface p-6">
      {error ? <p role="alert" className="text-sm text-diff-hard">{error}</p> : null}
      <a
        href={`/auth/start?next=${encodeURIComponent(next)}`}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-on-accent"
      >
        <GitHubMark />
        Continue with GitHub
      </a>
      <p className="text-sm text-muted">
        The app works fully without an account. Signing in links this device to your account so your progress syncs across your
        devices. Nothing on this device is deleted when you sign in or out.
      </p>
      <Link href="/" className="inline-block text-sm text-muted hover:underline">Keep using it signed out</Link>
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="w-full px-4 py-6 lg:px-8">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Sign in</h1>
      <Suspense fallback={<div className="h-40 max-w-md rounded-xl border border-line bg-surface" />}>
        <LoginBody searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
