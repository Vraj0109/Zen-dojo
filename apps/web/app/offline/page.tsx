export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-xl font-semibold">You are offline</h1>
      <p className="text-sm text-muted">Zen Dojo needs a connection to load your data. Reconnect and try again.</p>
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full reload is the point */}
      <a href="/" className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-on-accent">
        Try again
      </a>
    </main>
  );
}
