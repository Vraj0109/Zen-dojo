import { ButtonLink } from "./ui";

/** Unknown URL, or a page that called notFound(). Renders inside the shell so the rail stays available. */
export default function NotFound() {
  return (
    <div className="grid flex-1 place-items-center px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border border-line bg-surface p-6 dark:border-0 max-md:p-5">
        <span aria-hidden className="mb-4 grid size-12 place-items-center rounded-full bg-primary-soft text-on-primary-soft">
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <h1 className="text-xl font-medium text-foreground">We couldn&apos;t find that page</h1>
        <p className="mt-2 text-sm text-muted">The link may be old or mistyped. Go back to Today, or pick up with a Practice problem.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <ButtonLink href="/" variant="primary" size="md">
            Go to Today
          </ButtonLink>
          <ButtonLink href="/dsa" variant="tonal" size="md">
            Open Practice
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
