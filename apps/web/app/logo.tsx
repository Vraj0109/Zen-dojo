/** The Zen Dojo mark: an ink ring (enso) around a torii gate and a rising sun. Same drawing as app/icon.svg and the desktop app icon. */
export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="15" fill="#1c1715" />
      <path d="M47.5 15.5A21 21 0 1 0 53 33" fill="none" stroke="#f2e9dc" strokeWidth="4.5" strokeLinecap="round" />
      <g transform="translate(32 33) scale(0.74) translate(-32 -36)">
      <circle cx="32" cy="24" r="6.5" fill="#ffb347" />
      <path d="M14 28Q32 23 50 28L49 32.5H15Z" fill="#d62d3a" />
      <rect x="19" y="35" width="26" height="3" fill="#d62d3a" />
      <rect x="21.5" y="32" width="4.5" height="17" fill="#d62d3a" />
      <rect x="38" y="32" width="4.5" height="17" fill="#d62d3a" />
      </g>
    </svg>
  );
}
