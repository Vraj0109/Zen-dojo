"use client";

import { useEffect, useSyncExternalStore } from "react";
import { buttonClass } from "../ui";

// Remembers the All problems list per URL (open groups + scroll) in sessionStorage, and records where the
// workspace back button should return to when a problem is opened from this list.

/** sessionStorage key: the list URL the workspace back button goes back to. */
export const PRACTICE_RETURN_KEY = "zd-practice-return";
/** sessionStorage key: the problem path that return URL belongs to (so a stale value is never used). */
export const PRACTICE_RETURN_FOR_KEY = "zd-practice-return-for";

const stateKey = (url: string) => `zd-practice-list:${url}`;
type Saved = { open?: string[]; frame?: number; main?: number; win?: number };

const noop = () => () => {};
const useMounted = () =>
  useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );

function frameEl() {
  return document.querySelector<HTMLElement>("[data-practice-list]");
}
function groupEls(frame: HTMLElement) {
  return [...frame.querySelectorAll<HTMLDetailsElement>("details[data-group]")];
}

/** Mounted on the All problems view. `url` is this list's canonical URL (tab, filters, sort). */
export function ListMemory({ url, grouped }: { url: string; grouped: boolean }) {
  const mounted = useMounted();

  useEffect(() => {
    const frame = frameEl();
    if (!frame) return;
    const main = document.getElementById("main");
    let restoring = false;

    const save = () => {
      if (restoring) return;
      const state: Saved = {
        open: groupEls(frame)
          .filter((d) => d.open)
          .map((d) => d.dataset.group ?? ""),
        frame: frame.scrollTop,
        main: main?.scrollTop ?? 0,
        win: window.scrollY,
      };
      try {
        sessionStorage.setItem(stateKey(url), JSON.stringify(state));
      } catch {}
    };

    // Restore: open groups first, then scroll positions (again after Next's own scroll handling).
    let saved: Saved | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(stateKey(url)) ?? "null") as Saved | null;
    } catch {}
    let clearTimer: ReturnType<typeof setTimeout> | undefined;
    if (saved) {
      const s = saved;
      restoring = true;
      if (Array.isArray(s.open)) {
        const open = new Set(s.open);
        for (const d of groupEls(frame)) d.open = open.has(d.dataset.group ?? "");
      }
      const apply = () => {
        frame.scrollTop = s.frame ?? 0;
        if (main) main.scrollTop = s.main ?? 0;
        window.scrollTo(0, s.win ?? 0);
      };
      apply();
      requestAnimationFrame(() => requestAnimationFrame(apply));
      clearTimer = setTimeout(() => {
        restoring = false;
      }, 300);
    }

    let scrollTimer: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(save, 150);
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]");
      const href = a?.getAttribute("href");
      if (!href) return;
      const path = new URL(href, window.location.href).pathname;
      if (!/^\/dsa\/[^/]+$/.test(path) || path === "/dsa/boss") return;
      restoring = false;
      save();
      try {
        sessionStorage.setItem(PRACTICE_RETURN_KEY, url);
        sessionStorage.setItem(PRACTICE_RETURN_FOR_KEY, path);
      } catch {}
    };

    frame.addEventListener("scroll", onScroll, { passive: true });
    main?.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    // `toggle` does not bubble; listen in the capture phase.
    frame.addEventListener("toggle", save, true);
    frame.addEventListener("click", onClick);
    return () => {
      clearTimeout(scrollTimer);
      clearTimeout(clearTimer);
      frame.removeEventListener("scroll", onScroll);
      main?.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      frame.removeEventListener("toggle", save, true);
      frame.removeEventListener("click", onClick);
    };
  }, [url]);

  // Expand all / Collapse all need JS, so they appear only after hydration.
  if (!mounted || !grouped) return null;
  const setAll = (open: boolean) => {
    const frame = frameEl();
    if (!frame) return;
    for (const d of groupEls(frame)) d.open = open;
  };
  return (
    <span className="ml-auto flex items-center gap-1">
      <button type="button" onClick={() => setAll(true)} className={buttonClass("quiet", "sm")}>
        Expand all
      </button>
      <button type="button" onClick={() => setAll(false)} className={buttonClass("quiet", "sm")}>
        Collapse all
      </button>
    </span>
  );
}
