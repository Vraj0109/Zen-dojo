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
  github_failed: "GitHub did not confirm the sign-in. Click Continue with GitHub to try again.",
  missing: "The sign-in link was incomplete. Click Continue with GitHub to start again.",
  no_pkce: "This sign-in was started in another window or took longer than 10 minutes. Click Continue with GitHub again.",
  state_mismatch: "This sign-in does not match the one started here, perhaps because you clicked Sign in twice. Click Continue with GitHub again.",
  token_unreachable: "Could not reach the sign-in server. Check your internet connection, then try again.",
  token_refused: "The sign-in server did not accept this sign-in. It may have expired or been used already. Click Continue with GitHub again.",
  token_bad: "The sign-in server sent an unexpected answer. Wait a minute and try again.",
};

function errorText(code: string | string[] | undefined): string | null {
  const c = Array.isArray(code) ? code[0] : code;
  if (!c) return null;
  return ERRORS[c] ?? "Sign-in did not work. Please try again.";
}

function ScallopLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      <path
        d="M50 4 61 13 75 10 80 24 94 30 90 44 98 56 87 66 88 80 74 83 66 95 52 90 38 96 30 84 16 81 15 67 4 57 12 44 8 30 22 24 27 10 41 12z"
        className="fill-primary"
      />
      <text x="50" y="60" textAnchor="middle" className="fill-on-primary font-semibold text-[28px] select-none">
        ZD
      </text>
    </svg>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-5 shrink-0 fill-current" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

async function LoginBody({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[]; error?: string | string[]; waiting?: string | string[] }>;
}) {
  await connection();
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const error = errorText(sp.error);
  const session = await getSession();

  if (session) {
    return (
      <section className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-5 rounded-[32px] border border-line bg-surface px-[22px] py-7 text-center shadow-sm dark:border-0 sm:px-9 sm:py-10">
        <ScallopLogo />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">Signed in</h1>
        <p className="text-sm text-muted">You are signed in as <strong className="text-foreground">{session.name}</strong>.</p>
        <div className="flex w-full flex-col gap-2.5 sm:flex-row">
          <Link
            href={next}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
          >
            Continue
          </Link>
          <Link
            href="/profile/account"
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-outline px-5 text-sm font-medium text-primary transition-colors hover:bg-surface-2"
          >
            Account
          </Link>
        </div>
      </section>
    );
  }

  const waiting = (Array.isArray(sp.waiting) ? sp.waiting[0] : sp.waiting) === "1";
  if (waiting) {
    // Desktop: the sign-in continues in the system browser; the app comes back here through the zendojo:// link.
    return (
      <section className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-5 rounded-[32px] border border-line bg-surface px-[22px] py-7 text-center shadow-sm dark:border-0 sm:px-9 sm:py-10">
        <ScallopLogo />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">Check your browser</h1>
        <p className="text-sm text-muted leading-relaxed">
          Finish signing in in your browser. Zen Dojo will switch back here when you are done.
        </p>
        <div className="flex w-full flex-col gap-2.5 sm:flex-row">
          <a
            href={`/auth/start?next=${encodeURIComponent(next)}`}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
          >
            Start again
          </a>
          <Link
            href="/"
            className="flex h-12 flex-1 items-center justify-center rounded-full border border-outline px-5 text-sm font-medium text-primary transition-colors hover:bg-surface-2"
          >
            Cancel
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="relative z-10 flex w-full max-w-[420px] flex-col items-center gap-4 rounded-[32px] border border-line bg-surface px-[22px] py-7 text-center shadow-sm dark:border-0 sm:px-9 sm:py-10">
      <ScallopLogo />
      <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px] m-0">
        Welcome back to the dojo
      </h1>
      <p className="text-[15px] text-muted m-0 leading-snug">
        Sign in to sync your plan, solves and theme between the desktop app and the web.
      </p>

      {error ? (
        <p role="alert" className="w-full rounded-[16px] bg-danger-soft px-3.5 py-3 text-sm text-on-danger-soft">
          {error}
        </p>
      ) : null}

      <a
        href={`/auth/start?next=${encodeURIComponent(next)}`}
        className="mt-2 flex h-[52px] w-full items-center justify-center gap-2.5 rounded-full bg-primary text-base font-medium text-on-primary transition-colors hover:bg-primary-hover"
      >
        <GitHubMark />
        Continue with GitHub
      </a>

      <div className="flex w-full items-center gap-3 text-[13px] text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <Link
        href={next || "/"}
        className="flex h-12 w-full items-center justify-center rounded-full border border-outline text-[15px] font-medium text-primary transition-colors hover:bg-surface-2"
      >
        Keep using it on this device only
      </Link>

      <p className="mt-1 text-xs text-muted">
        We only read your GitHub name and avatar.
      </p>
    </section>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="relative isolate flex min-h-dvh w-full items-center justify-center overflow-hidden px-4 py-12">
      {/* Background soft shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-16 -z-10 size-[220px] rounded-[42%_58%_60%_40%] bg-primary-container sm:size-[420px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-10 -z-10 size-[180px] rounded-full bg-reward-soft sm:size-[320px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-[120px] -left-10 -z-10 size-[140px] rotate-[18deg] rounded-[32px] bg-cat-dsa sm:bottom-[140px] sm:left-[12%]"
      />

      <Suspense fallback={<div className="h-[460px] w-full max-w-[420px] rounded-[32px] border border-line bg-surface dark:border-0" />}>
        <LoginBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
