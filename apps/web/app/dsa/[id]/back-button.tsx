"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { PRACTICE_RETURN_FOR_KEY, PRACTICE_RETURN_KEY } from "../list-memory";

const noop = () => () => {};

/** The All problems URL to return to, when this problem was opened from that list; otherwise null. */
function readReturn(pathname: string): string | null {
  try {
    const url = sessionStorage.getItem(PRACTICE_RETURN_KEY);
    const forPath = sessionStorage.getItem(PRACTICE_RETURN_FOR_KEY);
    if (!url || !url.startsWith("/dsa")) return null;
    if (forPath && decodeURIComponent(forPath) !== decodeURIComponent(pathname)) return null;
    return url;
  } catch {
    return null;
  }
}

/**
 * The workspace's round back button. Without JS (or when the problem was opened from anywhere else) it links to
 * `fallbackHref`; when it was opened from Practice > All problems it goes back to that list (same filters and sort;
 * the list restores its open groups and scroll itself).
 */
export function BackButton({
  fallbackHref,
  fallbackLabel,
  variant = "round",
}: {
  fallbackHref: string;
  fallbackLabel: string;
  /** "round": the 44px icon button in the workspace header; "text": a small "← Practice" style text link. */
  variant?: "round" | "text";
}) {
  const pathname = usePathname();
  const returnUrl = useSyncExternalStore(
    noop,
    () => readReturn(pathname),
    () => null,
  );
  const href = returnUrl ?? fallbackHref;
  const label = returnUrl ? "Back to All problems" : fallbackLabel;

  const onClick = () => {
    if (!returnUrl) return;
    try {
      sessionStorage.removeItem(PRACTICE_RETURN_KEY);
      sessionStorage.removeItem(PRACTICE_RETURN_FOR_KEY);
    } catch {}
  };

  if (variant === "text") {
    return (
      <Link href={href} onClick={onClick} className="inline-block text-sm text-muted hover:text-foreground">
        ← {returnUrl ? "All problems" : "Practice"}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 shrink-0 place-items-center rounded-full bg-surface text-foreground transition-colors duration-120 hover:bg-surface-2"
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 18-6-6 6-6" />
      </svg>
    </Link>
  );
}
