import type { Metadata } from "next";
import Link from "next/link";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Admin" };

// Gate design: a layout is not re-run on every client navigation, so it must not be the only check.
// This layout only decides whether to SHOW the admin nav. Every protected page (page.tsx, problems/page.tsx)
// verifies the session cookie itself and redirects to /admin/login. /admin/login does not, so there is no loop.
const COOKIE = "zen_admin_session";

function isAuthed(value: string | undefined): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || !value) return false;
  const expected = createHmac("sha256", secret).update("zen-dojo-admin-session-v1").digest("hex");
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/problems", label: "Problems" },
  { href: "/admin/study", label: "Study Content" },
];

async function AdminNav() {
  await connection();
  const jar = await cookies();
  const authed = isAuthed(jar.get(COOKIE)?.value);
  const locked = !process.env.ADMIN_SECRET;
  return (
    <header className="mb-6 flex flex-wrap items-center gap-3 border-b border-line pb-3">
      <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
        <svg viewBox="0 0 24 24" className="size-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Admin portal
      </span>
      {authed && (
        <nav className="flex flex-wrap gap-1" aria-label="Admin">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
      {locked && <span className="ml-auto text-xs text-muted">Locked: ADMIN_SECRET is not set</span>}
    </header>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="w-full px-4 py-6 lg:px-8">
      <Suspense fallback={<div className="mb-6 h-10 border-b border-line" />}>
        <AdminNav />
      </Suspense>
      {children}
    </div>
  );
}
