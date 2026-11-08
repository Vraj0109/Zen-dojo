/** The Zen Forge mark: an ink ring (enso) around an anvil, with a spark. Same drawing as app/icon.svg and the desktop app icon. */
export function Logo({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="15" fill="#1c1715" />
      <path d="M47.5 15.5A21 21 0 1 0 53 33" fill="none" stroke="#f2e9dc" strokeWidth="4.5" strokeLinecap="round" />
      <g transform="translate(31 40) scale(0.78) translate(-29 -38.5)">
        <path d="M10 33L20 29H48V36H39L37 41H41L43 48H21L23 41H27L25 36H20Z" fill="#d62d3a" />
        <path d="M10 33L20 29H48V32.5H19Z" fill="#ef5560" />
      </g>
      <path d="M46 21l1.8-4.6 1.8 4.6 4.6 1.8-4.6 1.8-1.8 4.6-1.8-4.6-4.6-1.8z" fill="#ffb347" />
    </svg>
  );
}
