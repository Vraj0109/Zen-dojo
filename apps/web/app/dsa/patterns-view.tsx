"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PatternView } from "@/lib/dsa";
import { scrollBehavior } from "@/lib/motion";

// One subject tone per group: a pastel container plus its readable "on" colour (cat-* tokens).
const TONES = ["var(--cat-dsa)", "var(--cat-sd)", "var(--cat-lld)", "var(--cat-beh)"];
const ON_TONES = ["var(--on-cat-dsa)", "var(--on-cat-sd)", "var(--on-cat-lld)", "var(--on-cat-beh)"];
// The board's varied silhouettes, sized for the 18px centre of the mark. Each pattern keeps its own.
const SHAPES = [
  "rounded-[6px]",
  "rounded-full",
  "rounded-[12px_4px]",
  "rounded-[4px_12px]",
  "rounded-[8px]",
  "rounded-[50%_50%_5px_5px]",
];

/**
 * The mark at the top of a pattern tile. The ring is progress (arc = solved / total, a darker mix of the group's
 * tone); the silhouette in the middle is the pattern's own shape in the group tone. When every problem is solved the
 * ring turns primary and the silhouette becomes a filled primary shape with a check.
 */
function PatternMark({ solved, total, tone, shape }: { solved: number; total: number; tone: number; shape: string }) {
  const done = total > 0 && solved >= total;
  const pct = total > 0 ? Math.min(100, Math.round((solved / total) * 100)) : 0;
  const arc = done ? "var(--primary)" : `color-mix(in srgb, ${TONES[tone]} 35%, ${ON_TONES[tone]})`;
  return (
    <span role="img" aria-label={`${solved} of ${total} solved`} className="relative grid size-9 shrink-0 place-items-center">
      <svg aria-hidden="true" viewBox="0 0 36 36" className="absolute inset-0 size-full -rotate-90">
        <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-surface-2" />
        {pct > 0 && (
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`} style={{ stroke: arc }} />
        )}
      </svg>
      <span
        aria-hidden="true"
        className={`relative grid size-[18px] place-items-center ${shape} ${done ? "bg-primary text-on-primary" : ""}`}
        style={done ? undefined : { backgroundColor: TONES[tone] }}
      >
        {done && (
          <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
        )}
      </span>
    </span>
  );
}

/** The nearest ancestor that really scrolls (md+: <main id="main">), or null when the window scrolls (phones). */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const oy = getComputedStyle(p).overflowY;
    if ((oy === "auto" || oy === "scroll" || oy === "overlay") && p.scrollHeight > p.clientHeight + 1) return p;
  }
  return null;
}

/** How far below the top edge of the scroller a group header may sit and still count as "the group at the top". */
const TOP_OFFSET = 96;
/** Quiet time with no scroll events before a click-driven smooth scroll counts as settled. */
const SETTLE_MS = 140;

export interface GroupView {
  id: string;
  title: string;
  patterns: PatternView[];
}

export function PatternsView({
  groups,
  initialGroup,
  searchQuery = "",
  aside,
}: {
  groups: GroupView[];
  initialGroup?: string;
  searchQuery?: string;
  aside?: React.ReactNode;
}) {
  const [activeGroupId, setActiveGroupId] = useState<string>(initialGroup || groups[0]?.id || "");
  const scrollRef = useRef<HTMLDivElement>(null);
  const q = searchQuery.trim().toLowerCase();

  // Filter groups and patterns by search query
  const filteredGroups = groups
    .map((g: GroupView) => {
      const pats = q
        ? g.patterns.filter(
            (p: PatternView) =>
              p.name.toLowerCase().includes(q) ||
              p.recognize.toLowerCase().includes(q) ||
              p.items.some((item) => item.title.toLowerCase().includes(q)),
          )
        : g.patterns;
      return {
        ...g,
        patterns: pats,
      };
    })
    .filter((g) => g.patterns.length > 0);

  const groupKey = filteredGroups.map((g) => g.id).join("|");
  const navRef = useRef<HTMLElement>(null);
  // While a click-driven smooth scroll runs, the clicked group stays highlighted (no flicker through the groups
  // in between). Cleared once scroll events stop for SETTLE_MS.
  const lockRef = useRef<string | null>(null);
  const lockTimer = useRef<number | undefined>(undefined);

  const lockTo = (gid: string, wait: number) => {
    lockRef.current = gid;
    window.clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(() => {
      lockRef.current = null;
    }, wait);
  };

  // Highlight the group at the top of whichever element scrolls. Scroll events do not bubble, but a capture
  // listener on window sees them from <main> (md+) and from the window (phones) alike.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;
    const sections = Array.from(root.querySelectorAll<HTMLElement>("section[id^='g-']"));
    if (!sections.length) return;

    let frame = 0;
    const compute = () => {
      frame = 0;
      const sp = scrollParent(root);
      const top = sp ? sp.getBoundingClientRect().top : 0;
      const scroller = sp ?? document.documentElement;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2;
      let current = sections[0];
      if (atBottom && scroller.scrollTop > 0) {
        current = sections[sections.length - 1];
      } else {
        for (const sec of sections) {
          if (sec.getBoundingClientRect().top - top <= TOP_OFFSET) current = sec;
          else break;
        }
      }
      setActiveGroupId(current.id.replace(/^g-/, ""));
    };
    const onScroll = () => {
      if (lockRef.current) {
        // Keep the lock alive until the smooth scroll stops moving.
        window.clearTimeout(lockTimer.current);
        lockTimer.current = window.setTimeout(() => {
          lockRef.current = null;
        }, SETTLE_MS);
        return;
      }
      if (!frame) frame = requestAnimationFrame(compute);
    };

    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    if (!lockRef.current) compute();
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [groupKey]);

  // Initial scroll to group if specified
  useEffect(() => {
    if (initialGroup && scrollRef.current) {
      const target = scrollRef.current.querySelector<HTMLElement>(`#g-${initialGroup}`);
      if (target) {
        lockTo(initialGroup, 400);
        target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
      }
    }
  }, [initialGroup]);

  // Keep the active row visible inside the group list: scroll only the list itself, and only when the row is out of view.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const row = Array.from(nav.querySelectorAll<HTMLElement>("a[data-gid]")).find((a) => a.dataset.gid === activeGroupId);
    if (!row) return;
    const n = nav.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    if (r.top < n.top) nav.scrollTop -= n.top - r.top;
    else if (r.bottom > n.bottom) nav.scrollTop += r.bottom - n.bottom;
  }, [activeGroupId]);

  const scrollToGroup = (e: React.MouseEvent<HTMLAnchorElement>, gid: string) => {
    e.preventDefault();
    setActiveGroupId(gid);
    if (!scrollRef.current) return;
    const target = scrollRef.current.querySelector<HTMLElement>(`#g-${gid}`);
    if (target) {
      lockTo(gid, 400);
      target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    }
  };

  return (
    <div className="flex w-full gap-5 items-start">
      {/* Side panels by the content width (<main> is the container; the rail is not part of it):
          the group list goes under 1160px, the progress aside under 920px. */}

      {/* Left: Group Jump Nav (220px, own scroll, hidden < 1260px) */}
      <nav
        ref={navRef}
        aria-label="Jump to a group"
        className="zd-jump flex w-[220px] shrink-0 flex-col gap-0.5 overflow-y-auto pb-8 [scrollbar-width:thin] @max-[1160px]:hidden max-md:hidden sticky top-4 self-start max-h-[calc(100dvh-5rem)]"
      >
        {groups.map((g: GroupView) => {
          const solved = g.patterns.reduce((sum: number, p: PatternView) => sum + p.solved, 0);
          const total = g.patterns.reduce((sum: number, p: PatternView) => sum + p.items.length, 0);
          const isActive = g.id === activeGroupId;

          return (
            <a
              key={g.id}
              href={`#g-${g.id}`}
              data-gid={g.id}
              onClick={(e) => scrollToGroup(e, g.id)}
              className={`flex min-h-10 items-center gap-2 rounded-[20px] px-3.5 py-2 text-sm leading-5 font-medium transition-colors ${
                isActive
                  ? "bg-primary-soft text-on-primary-soft"
                  : "text-foreground hover:bg-surface-2"
              }`}
            >
              <span className="min-w-0 flex-1">{g.title}</span>
              <span className="text-xs opacity-75 tabular-nums shrink-0">
                {solved}/{total}
              </span>
            </a>
          );
        })}
      </nav>

      {/* Center: Tile Area (scrolls with <main> on md+, with the window on phones) */}
      <div
        ref={scrollRef}
        className="min-w-0 flex-1 space-y-7 pr-2 pb-10"
      >
        {filteredGroups.length === 0 ? (
          <div className="rounded-2xl border border-line dark:border-0 bg-surface p-8 text-center text-sm text-muted">
            No patterns match &ldquo;{searchQuery}&rdquo;.{" "}
            <Link href="/dsa" className="font-medium text-foreground hover:underline">
              Clear search
            </Link>
          </div>
        ) : (
          filteredGroups.map((g: GroupView, gi: number) => {
            const groupSolved = g.patterns.reduce((sum: number, p: PatternView) => sum + p.solved, 0);
            const groupTotal = g.patterns.reduce((sum: number, p: PatternView) => sum + p.items.length, 0);

            return (
              <section key={g.id} id={`g-${g.id}`} className="space-y-3 scroll-mt-2">
                {/* Group header */}
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-[12px] text-sm font-semibold"
                    style={{ backgroundColor: TONES[gi % TONES.length], color: ON_TONES[gi % TONES.length] }}
                  >
                    {gi + 1}
                  </span>
                  <h2 className="text-lg font-medium text-foreground">{g.title}</h2>
                  <span className="text-sm text-muted whitespace-nowrap">
                    {g.patterns.length} patterns · {groupSolved} of {groupTotal} solved
                  </span>
                  <div className="max-md:hidden ml-auto w-36 h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-300"
                      style={{
                        width: `${groupTotal > 0 ? Math.round((groupSolved / groupTotal) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Tiles auto-fill grid */}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,176px),1fr))] gap-2.5 max-sm:grid-cols-2 max-sm:gap-2">
                  {g.patterns.map((p: PatternView, pi: number) => {
                    const isDone = p.solved === p.items.length && p.items.length > 0;
                    return (
                      <Link
                        key={p.id}
                        href={`/dsa/pattern/${p.id}`}
                        className="relative flex flex-col gap-1.5 overflow-hidden rounded-lg border border-line bg-surface p-3.5 text-foreground transition-colors hover:border-line-strong dark:border-0 dark:hover:bg-surface-2"
                      >
                        {/* Completed edge: a real 4px element along the bottom. The global hover rule replaces any
                            box-shadow on tiles, so an inset shadow vanished on hover. The tile's radius clips it. */}
                        {isDone && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-primary" />}
                        <span className="flex justify-between items-center gap-2">
                          <PatternMark solved={p.solved} total={p.items.length} tone={gi % TONES.length} shape={SHAPES[pi % SHAPES.length]} />
                          <span aria-hidden="true" className={`text-[13px] font-semibold tabular-nums ${isDone ? "text-primary" : "text-muted"}`}>
                            {p.solved}/{p.items.length}
                          </span>
                        </span>
                        <span className="text-[15px] leading-5 font-medium">{p.name}</span>
                        <span className="line-clamp-3 text-[13px] leading-[18px] text-muted">{p.recognize}</span>
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Right: Progress Aside (280px, own scroll, hidden < 1020px) */}
      {aside && (
        <aside
          aria-label="Your progress"
          className="zd-aside flex w-[280px] shrink-0 flex-col gap-3 overflow-y-auto pr-1 pb-10 [scrollbar-width:thin] @max-[920px]:hidden max-md:hidden sticky top-4 self-start max-h-[calc(100dvh-5rem)]"
        >
          {aside}
        </aside>
      )}
    </div>
  );
}
