"use client";

import Link, { useLinkStatus } from "next/link";

/** Chevron that turns into a spinner while the group is loading (must be inside the Link). */
function Chevron({ open }: { open: boolean }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <svg
        className="mr-2 inline-block size-3 animate-spin align-[-1px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
    );
  }
  return <span className={`mr-2 inline-block transition-transform ${open ? "rotate-90" : ""}`}>›</span>;
}

/** Accordion header for a /dsa group. Opening scrolls to the group's header; closing keeps the scroll position. */
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
      className="flex items-center justify-between gap-3 border-b border-line py-3 hover:text-foreground"
    >
      <span className="font-semibold">
        <Chevron open={open} />
        {title}
      </span>
      <span className="text-sm text-muted">
        {covered}/{total} covered
      </span>
    </Link>
  );
}
