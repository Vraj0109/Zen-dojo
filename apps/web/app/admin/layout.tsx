import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Admin" };

// Gate design: a layout is not re-run on every client navigation, so it must not be the only check.
// This layout checks too (so nothing admin-looking renders for others), but every admin page
// (page.tsx, problems/page.tsx) and every server action in actions.ts calls requireAdmin() itself.

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/problems", label: "Problems" },
  { href: "/admin/study", label: "Study Content" },
];

async function AdminNav() {
  await connection();
  const session = await requireAdmin();
  return (
    <header className="mb-6 flex flex-wrap items-center gap-3 border-b border-line pb-3">
      <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight">
        <svg viewBox="0 0 24 24" className="size-4 text-accent" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
        Admin portal
      </span>
      <nav className="flex flex-wrap gap-1" aria-label="Admin">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-sm text-muted hover:bg-surface hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
      <Link href="/profile/account" className="ml-auto text-xs text-muted hover:underline">
        Signed in as {session.name}
      </Link>
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
