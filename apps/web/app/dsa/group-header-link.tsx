"use client";

import Link, { useLinkStatus } from "next/link";
import { ProgressBar } from "../ui";

/** Chevron that turns into a spinner while the group is loading (must be inside the Link). */
function Chevron({ open }: { open: boolean }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <svg className="size-4 shrink-0 animate-spin text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
    );
  }
  return (
    <svg
      className={`size-4 shrink-0 text-muted transition-transform duration-180 ease-dojo ${open ? "rotate-90" : ""}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** Accordion header for a /dsa group, with its progress bar. Opening scrolls to the group's header; closing keeps the scroll position. */
export function GroupHeaderLink({
  id,
  title,
  covered,
  total,
  open,
}: {
  id: string;
  title: string;
  covered: number;
  total: number;
  open: boolean;
}) {
  return (
    <Link
      href={open ? "/dsa?group=none" : `/dsa?group=${id}#g-${id}`}
      scroll={!open}
      prefetch={false}
      aria-expanded={open}
      className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3.5 transition-colors duration-120 hover:bg-surface-2 sm:grid-cols-[auto_minmax(0,1fr)_14rem]"
    >
      <Chevron open={open} />
      <span className="flex min-w-0 items-baseline justify-between gap-3">
        <span className="truncate font-semibold">{title}</span>
        <span className="shrink-0 text-sm text-muted tabular-nums sm:hidden">
          {covered} of {total}
        </span>
      </span>
      <span className="col-start-2 sm:col-start-3">
        <span className="hidden sm:block">
          <ProgressBar value={covered} max={total} label={`${title}: patterns covered`} showCount />
        </span>
        <span className="sm:hidden">
          <ProgressBar value={covered} max={total} label={`${title}: patterns covered`} />
        </span>
      </span>
    </Link>
  );
}
