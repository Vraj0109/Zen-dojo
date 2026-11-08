/** The Prepwise mark: a "P" with a check. Same drawing as app/icon.svg (the tab icon) and the desktop app icon. */
export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <linearGradient id="logo-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2f9e74" />
          <stop offset="1" stopColor="#1b6b8a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill="url(#logo-g)" />
      <path d="M23 49V15h13a10.5 10.5 0 0 1 0 21H23" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 44l5 5 9-11" fill="none" stroke="#ffd166" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
