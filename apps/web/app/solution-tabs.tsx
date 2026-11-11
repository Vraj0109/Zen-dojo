"use client";

import { useId, useSyncExternalStore, type ReactNode } from "react";

// Language tabs for the reference solution (plan 0063). The code of every language is highlighted on the server and
// passed in as ready nodes; this component only decides which one to show and remembers the last choice.

const KEY = "zen-dojo.solution-lang";
const EVENT = "zen-dojo:solution-lang";

function read(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // storage can be blocked; the first tab is then shown
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export interface SolutionTab {
  id: string;
  label: string;
  node: ReactNode;
}

export function SolutionTabs({ tabs }: { tabs: SolutionTab[] }) {
  const remembered = useSyncExternalStore(subscribe, read, () => null);
  const uid = useId();
  const active = tabs.find((t) => t.id === remembered) ?? tabs[0];
  const choose = (id: string) => {
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // ignore: the choice is then only kept until the page is reloaded
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return (
    <div>
      {tabs.length > 1 && (
        <div role="tablist" aria-label="Solution language" className="mb-2 flex gap-5 border-b border-line">
          {tabs.map((t) => {
            const on = t.id === active.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                id={`${uid}-tab-${t.id}`}
                aria-selected={on}
                aria-controls={`${uid}-panel`}
                onClick={() => choose(t.id)}
                className={`-mb-px pb-1.5 text-sm font-medium transition-colors ${on ? "border-b-2 border-accent text-foreground" : "border-b-2 border-transparent text-muted hover:text-foreground"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      )}
      <div role="tabpanel" id={`${uid}-panel`} aria-labelledby={`${uid}-tab-${active.id}`}>
        {active.node}
      </div>
    </div>
  );
}
