"use client";

/**
 * Last-resort boundary: it replaces the root layout, so it brings its own <html>, <body> and inline styles
 * (no globals.css, no fonts, no theme tokens). Colours follow the OS scheme through a media query.
 */
const STYLES = `
body{margin:0;min-height:100vh;display:grid;place-items:center;padding:16px;box-sizing:border-box;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;background:#f6fbf5;color:#171d19}
.card{max-width:32rem;width:100%;box-sizing:border-box;padding:24px;border-radius:24px;background:#fff;border:1px solid #dbe5db}
h1{margin:0 0 8px;font-size:1.25rem;font-weight:500}
p{margin:0 0 20px;font-size:.875rem;line-height:1.5;color:#3f4944}
.row{display:flex;flex-wrap:wrap;gap:8px}
.btn{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 24px;border-radius:999px;font:inherit;font-size:.875rem;font-weight:500;text-decoration:none;cursor:pointer;border:0}
.primary{background:#146c43;color:#fff}
.tonal{background:#d6e8d9;color:#102014}
.btn:focus-visible{outline:2px solid #146c43;outline-offset:2px}
@media (prefers-color-scheme:dark){
body{background:#0f1512;color:#dee4de}
.card{background:#1b211e;border-color:transparent}
p{color:#bfc9c2}
.primary{background:#7fd9a3;color:#00391f}
.tonal{background:#2c3a31;color:#dce8dd}
.btn:focus-visible{outline-color:#7fd9a3}
}
`;

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <head>
        <title>Something went wrong · Zen Dojo</title>
        <style>{STYLES}</style>
      </head>
      <body>
        <div className="card" role="alert">
          <h1>Something went wrong</h1>
          <p>Zen Dojo couldn&apos;t load. Your progress is saved on this device, so try again.</p>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => retry()}>
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- root layout replaced; full reload intended */}
            <a className="btn tonal" href="/">
              Go to Today
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
