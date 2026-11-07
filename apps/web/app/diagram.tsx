"use client";

import { useEffect, useId, useState } from "react";

/** Reads the app's colour tokens so diagrams match the light/dark theme. */
function themeVariables() {
  const css = getComputedStyle(document.documentElement);
  const v = (name: string) => css.getPropertyValue(name).trim();
  return {
    background: v("--surface"),
    primaryColor: v("--surface"),
    primaryTextColor: v("--foreground"),
    primaryBorderColor: v("--accent"),
    lineColor: v("--muted"),
    secondaryColor: v("--background"),
    tertiaryColor: v("--background"),
    textColor: v("--foreground"),
    noteBkgColor: v("--background"),
    noteTextColor: v("--foreground"),
    noteBorderColor: v("--line"),
    actorBkg: v("--surface"),
    actorBorder: v("--accent"),
    actorTextColor: v("--foreground"),
    signalColor: v("--foreground"),
    signalTextColor: v("--foreground"),
    labelBoxBkgColor: v("--surface"),
    labelTextColor: v("--foreground"),
    classText: v("--foreground"),
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  };
}

/**
 * A Mermaid diagram. Mermaid needs a DOM, so it is loaded lazily in the browser; until then (or if it fails, or JS is
 * off) the source is shown as text so the page is never blank.
 */
export function Diagram({ source, caption }: { source: string; caption?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [showSource, setShowSource] = useState(false);
  const [scheme, setScheme] = useState(0); // bumped when the OS theme changes, to redraw

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setScheme((n) => n + 1);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: themeVariables(),
          flowchart: { padding: 18, wrappingWidth: 260 },
        });
        const out = await mermaid.render(`mmd-${uid}-${scheme}`, source);
        if (!cancelled) {
          setSvg(out.svg);
          setFailed(false);
        }
      } catch (err) {
        console.warn("Diagram failed to render", err);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, uid, scheme]);

  return (
    <figure className="my-4 rounded-lg border border-line bg-surface p-4">
      {svg && !showSource ? (
        <div className="overflow-x-auto [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-[44rem]" dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <pre className="overflow-x-auto text-xs leading-5 text-muted">{source}</pre>
      )}
      <figcaption className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
        <span>{failed ? "Diagram could not be drawn; showing its source." : (caption ?? (svg ? "" : "Drawing diagram..."))}</span>
        {svg && (
          <button type="button" onClick={() => setShowSource((s) => !s)} className="shrink-0 underline-offset-2 hover:underline">
            {showSource ? "Show diagram" : "Source"}
          </button>
        )}
      </figcaption>
    </figure>
  );
}
