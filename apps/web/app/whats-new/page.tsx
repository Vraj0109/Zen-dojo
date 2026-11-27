import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { listNotices } from "@/lib/content-notices";
import type { ContentNoticeRow } from "@/lib/schema";
import { PageMain, buttonClass } from "../ui";
import { markAllReadAction, markOneReadAction } from "./actions";

export const metadata: Metadata = { title: "What's new" };

export default function WhatsNewPage() {
  return (
    <PageMain title="What's new" className="max-w-4xl px-4 py-8 sm:px-6">
      <Suspense fallback={<div className="py-12 text-center text-sm text-muted">Loading updates…</div>}>
        <WhatsNewContent />
      </Suspense>
    </PageMain>
  );
}

function noticeLink(n: ContentNoticeRow): string {
  const hash = n.sectionId ? `#s-${n.sectionId}` : "";
  if (n.entity === "problem") {
    return `/dsa/${n.entityId}${hash}`;
  }
  if (n.entity === "lesson") {
    const courseId = n.unit.startsWith("course:") ? n.unit.slice("course:".length) : "all";
    return `/study/${courseId}/${n.entityId}${hash}`;
  }
  return `/study`;
}

function formatDateGroup(ms: number): string {
  const d = new Date(ms);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  if (isToday) return "Today";
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

async function WhatsNewContent() {
  await connection();
  const notices = await listNotices();
  const unreadCount = notices.filter((n) => !n.readAt).length;

  // Group by day string
  const grouped = new Map<string, ContentNoticeRow[]>();
  for (const n of notices) {
    const day = formatDateGroup(n.at);
    const list = grouped.get(day) || [];
    list.push(n);
    grouped.set(day, list);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">What&apos;s new</h1>
          <p className="mt-1 text-sm text-muted">
            Updates and improvements in the courses and problem sets you follow.
          </p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllReadAction}>
            <button type="submit" className={buttonClass("outline", "sm")}>
              Mark all as read ({unreadCount})
            </button>
          </form>
        )}
      </div>

      {notices.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-line p-10 text-center sm:p-14">
          <p className="text-base font-medium">No updates yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            When an author updates a course, diagram, hint, or solution you follow, you&apos;ll see what changed right here.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/" className={buttonClass("primary", "sm")}>
              Back to Today
            </Link>
            <Link href="/profile/settings#offline" className={buttonClass("outline", "sm")}>
              Offline content settings
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([day, dayNotices]) => (
            <section key={day} className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">{day}</h2>
              <div className="space-y-3">
                {dayNotices.map((n) => {
                  const href = noticeLink(n);
                  const isUnread = !n.readAt;

                  return (
                    <div
                      key={n.id}
                      className={`relative flex flex-col justify-between gap-2 rounded-2xl border p-4 sm:flex-row sm:items-start ${
                        isUnread ? "border-primary/40 bg-surface shadow-xs" : "border-line bg-surface/50"
                      }`}
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted">
                            {n.unitTitle || n.unit}
                          </span>
                          {isUnread && (
                            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold text-primary uppercase">
                              New
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-semibold">
                          <Link href={href} className="hover:underline">
                            {n.title}
                          </Link>
                        </h3>
                        <p className="text-sm text-muted leading-relaxed">{n.note}</p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0">
                        <Link
                          href={href}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View update →
                        </Link>
                        {isUnread && (
                          <form
                            action={async () => {
                              "use server";
                              await markOneReadAction(n.id);
                            }}
                          >
                            <button
                              type="submit"
                              className="rounded-full px-2.5 py-1 text-xs text-muted hover:bg-surface-2 hover:text-foreground"
                            >
                              Mark read
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
