"use client";

import { useState } from "react";
import { STYLES, type StyleId } from "@/lib/theme";

/**
 * Preview only: flips <html data-theme> and data-style without saving anything, so every component can be checked
 * in light and dark and in each theme. Reloading the page brings back the saved appearance.
 */
export function SchemeToggle() {
  const [scheme, setScheme] = useState<"light" | "dark" | null>(null);
  const [style, setStyle] = useState<StyleId | null>(null);
  const pickScheme = (s: "light" | "dark") => {
    document.documentElement.setAttribute("data-theme", s);
    setScheme(s);
  };
  const pickStyle = (id: StyleId) => {
    const root = document.documentElement;
    if (id === "classic") root.removeAttribute("data-style");
    else root.setAttribute("data-style", id);
    setStyle(id);
  };
  const pill = (on: boolean) =>
    `h-8 rounded-md border px-3 text-sm font-medium transition-colors duration-120 ${on ? "border-primary bg-primary-soft text-primary" : "border-line-strong bg-surface hover:bg-surface-2"}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm text-muted">Preview:</span>
      {(["light", "dark"] as const).map((s) => (
        <button key={s} type="button" aria-pressed={scheme === s} onClick={() => pickScheme(s)} className={pill(scheme === s)}>
          {s === "light" ? "Light" : "Dark"}
        </button>
      ))}
      <span className="mx-2 h-5 w-px bg-line" aria-hidden />
      {STYLES.map((s) => (
        <button key={s.id} type="button" aria-pressed={style === s.id} onClick={() => pickStyle(s.id)} className={pill(style === s.id)}>
          {s.label}
        </button>
      ))}
    </div>
  );
}
