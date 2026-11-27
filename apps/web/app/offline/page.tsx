import Link from "next/link";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-xl font-semibold">You are offline</h1>
      <p className="text-sm text-muted">
        Zen Dojo needs a connection to load your live account and sync your progress.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload is the point */}
        <a href="/" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-on-primary">
          Try again
        </a>
        <Link
          href="/offline/read"
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-2"
        >
          Open your offline copy
        </Link>
      </div>
    </div>
  );
}
