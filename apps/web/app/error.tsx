"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonClass } from "./ui";

/**
 * Route error boundary. It renders inside the app shell, so the rail and tab bar stay usable. No stack trace or raw
 * error text is shown; the short reference (digest) is only copied on request, for a bug report.
 */
export default function RouteError({ error, retry }: { error: unknown; retry: () => void }) {
  const heading = useRef<HTMLHeadingElement | null>(null);
  const [copied, setCopied] = useState<"idle" | "done" | "failed">("idle");

  useEffect(() => {
    heading.current?.focus();
  }, []);

  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;

  async function copyDetails() {
    const details = JSON.stringify({ ref: digest ?? "none", route: window.location.pathname, at: new Date().toISOString() });
    try {
      await navigator.clipboard.writeText(details);
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  }

  return (
    <div className="grid flex-1 place-items-center px-4 py-10">
      <div role="alert" className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 dark:border-0 max-md:p-5">
        <span aria-hidden className="mb-4 grid size-12 place-items-center rounded-full bg-danger-soft text-on-danger-soft">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.5h.01" />
          </svg>
        </span>
        <h1 ref={heading} tabIndex={-1} className="text-xl font-medium text-foreground outline-none">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted">This page didn&apos;t load. Your progress is saved on this device, so try again or head back to Today.</p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => retry()} className={buttonClass("primary", "md")}>
            Try again
          </button>
          <Link href="/" className={buttonClass("tonal", "md")}>
            Go to Today
          </Link>
          <button type="button" onClick={copyDetails} className={buttonClass("quiet", "sm", "max-md:h-11")}>
            Copy error details
          </button>
        </div>
        <p role="status" aria-live="polite" className="mt-3 min-h-5 text-xs text-muted">
          {copied === "done" ? "Details copied. Paste them into your bug report." : copied === "failed" ? "We couldn't copy the details. Check your browser's clipboard permission." : ""}
        </p>
      </div>
    </div>
  );
}
