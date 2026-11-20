"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PatternView } from "@/lib/dsa";

const TONES = ["var(--cat-dsa)", "var(--cat-sd)", "var(--cat-lld)", "var(--cat-beh)"];
const SHAPES = [
  "rounded-[14px]",
  "rounded-full",
  "rounded-[22px_8px]",
  "rounded-[8px_22px]",
  "rounded-[18px]",
  "rounded-[50%_50%_14px_14px]",
];

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

  // IntersectionObserver to highlight current group at top of tile area
  useEffect(() => {
    const root = scrollRef.current;
    if (!root) return;

    const sections = root.querySelectorAll<HTMLElement>("section[id^='g-']");
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find visible section with top closest to the container top
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // Sort by distance to container top
          visible.sort((a, b) => Math.abs(a.boundingClientRect.top - root.getBoundingClientRect().top) - Math.abs(b.boundingClientRect.top - root.getBoundingClientRect().top));
          const id = visible[0].target.id.replace(/^g-/, "");
          if (id) setActiveGroupId(id);
        }
      },
      {
        root,
        threshold: [0, 0.1, 0.5],
        rootMargin: "-5% 0px -60% 0px",
      },
    );

    sections.forEach((sec) => observer.observe(sec));
    return () => observer.disconnect();
  }, [filteredGroups]);

  // Initial scroll to group if specified
  useEffect(() => {
    if (initialGroup && scrollRef.current) {
      const target = scrollRef.current.querySelector<HTMLElement>(`#g-${initialGroup}`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [initialGroup]);

  const scrollToGroup = (e: React.MouseEvent<HTMLAnchorElement>, gid: string) => {
    e.preventDefault();
    setActiveGroupId(gid);
    if (!scrollRef.current) return;
    const target = scrollRef.current.querySelector<HTMLElement>(`#g-${gid}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="flex min-h-0 flex-1 gap-5 md:overflow-hidden">
      {/* Side panels by the content width (<main> is the container; the rail is not part of it):
          the group list goes under 1160px, the progress aside under 920px. */}

      {/* Left: Group Jump Nav (220px, own scroll, hidden < 1260px) */}
      <nav
        aria-label="Jump to a group"
        className="zd-jump flex w-[220px] shrink-0 flex-col gap-0.5 overflow-y-auto pb-8 [scrollbar-width:thin] @max-[1160px]:hidden max-md:hidden"
      >
        {groups.map((g: GroupView) => {
          const solved = g.patterns.reduce((sum: number, p: PatternView) => sum + p.solved, 0);
          const total = g.patterns.reduce((sum: number, p: PatternView) => sum + p.items.length, 0);
          const isActive = g.id === activeGroupId;

          return (
            <a
              key={g.id}
              href={`#g-${g.id}`}
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

      {/* Center: Tile Area (own scroll) */}
      <div
        ref={scrollRef}
        className="min-w-0 flex-1 space-y-7 pr-2 pb-10 md:overflow-y-auto md:[scrollbar-width:thin]"
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
                    className="flex size-8 shrink-0 items-center justify-center rounded-[12px] text-sm font-semibold text-foreground"
                    style={{ backgroundColor: TONES[gi % TONES.length] }}
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
                        className={`flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-3.5 text-foreground transition-colors hover:border-line-strong dark:border-0 dark:hover:bg-surface-2 ${
                          isDone ? "shadow-[inset_0_-4px_0_var(--primary)]" : ""
                        }`}
                      >
                        <span className="flex justify-between items-center gap-2">
                          <span
                            className={`size-7 shrink-0 ${SHAPES[pi % SHAPES.length]} flex items-center justify-center ${
                              isDone ? "bg-primary text-on-primary" : ""
                            }`}
                            style={isDone ? undefined : { backgroundColor: TONES[gi % TONES.length] }}
                          />
                          <span className={`text-[13px] font-semibold tabular-nums ${isDone ? "text-primary" : "text-muted"}`}>
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
          className="zd-aside flex w-[280px] shrink-0 flex-col gap-3 overflow-y-auto pr-1 pb-10 [scrollbar-width:thin] @max-[920px]:hidden max-md:hidden"
        >
          {aside}
        </aside>
      )}
    </div>
  );
}
