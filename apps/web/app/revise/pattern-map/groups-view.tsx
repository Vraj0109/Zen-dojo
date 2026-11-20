"use client";

import "./pattern-map.css";
import Link from "next/link";
import { useState } from "react";
import { buttonClass, FilterChip } from "../../ui";
import { MasteryDot, MasteryLine } from "./mastery";
import { GUIDE_HREF, PRACTICE_HREF, nodeHref, type MasteryState } from "./lib";
import { revealCard } from "./reveal";

export interface GroupPat {
  id: string;
  name: string;
  recognize: string;
  solved: number;
  total: number;
  state: MasteryState;
  /** Thinking-map node this pattern lives under, when there is one */
  thinkId?: string;
  /** One-line key idea from the thinking map */
  idea?: string;
}
export interface GroupData {
  id: string;
  title: string;
  short: string;
  patterns: GroupPat[];
}

/*
 * Pattern groups (view "groups"): the group mind map. Wide content shows an SVG (all groups around a centre; click a group
 * to focus it); content narrower than 760px shows the same groups as a list, because the map's text would shrink below 12px.
 */

// Static class lists so Tailwind sees them: group tone (fill) and its text.
const TONES = [
  { fill: "fill-cat-dsa", text: "fill-on-cat-dsa" },
  { fill: "fill-cat-sd", text: "fill-on-cat-sd" },
  { fill: "fill-cat-lld", text: "fill-on-cat-lld" },
  { fill: "fill-cat-core", text: "fill-on-cat-core" },
  { fill: "fill-cat-beh", text: "fill-on-cat-beh" },
] as const;

const W = 720;

function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const w of text.split(" ")) {
    if ((cur + " " + w).trim().length > max && cur) {
      lines.push(cur.trim());
      cur = w;
    } else cur += " " + w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

function Lines({ lines, x, y, className, size, lh = 16 }: { lines: string[]; x: number; y: number; className: string; size: number; lh?: number }) {
  const top = y - ((lines.length - 1) * lh) / 2;
  return (
    <>
      {lines.map((l, i) => (
        <text key={i} x={x} y={top + i * lh} textAnchor="middle" dominantBaseline="middle" fontSize={size} className={className}>
          {l}
        </text>
      ))}
    </>
  );
}

const dotFill = (s: MasteryState) => (s === "solid" ? "fill-primary stroke-primary" : s === "shaky" ? "fill-warning stroke-warning" : "fill-transparent stroke-line-strong");

export function GroupsView({ groups, sources }: { groups: GroupData[]; sources: { id: string; title: string; solved: number; total: number }[] }) {
  const [focus, setFocus] = useState<number | null>(null);
  const [selected, setSelected] = useState<string | null>(groups[0]?.patterns[0]?.id ?? null);
  const [hide, setHide] = useState(false);
  const [weak, setWeak] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  if (groups.length === 0) return <p className="rounded-lg border border-line bg-surface p-6 text-sm text-muted dark:border-0">No pattern groups to show.</p>;

  const visible = (p: GroupPat) => !weak || p.state !== "solid";
  const pick = (id: string, gi?: number) => {
    setSelected(id);
    if (gi !== undefined) setFocus(gi);
    requestAnimationFrame(() => revealCard(document.getElementById("pm-groups-card")));
  };
  const sel = groups.flatMap((g) => g.patterns.map((p) => ({ p, g }))).find((x) => x.p.id === selected) ?? null;

  const keyAct = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  const n = groups.length;
  const cx = W / 2;
  const cy = 270;
  const R = 150;
  const overview = (
    <svg viewBox={`0 0 ${W} 540`} className="block h-auto w-full" role="group" aria-label="Mind map of DSA pattern groups. Choose a group to focus it.">
      {groups.map((g, i) => {
        const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
        const gx = cx + R * Math.cos(a);
        const gy = cy + R * Math.sin(a) * 0.9;
        const ps = g.patterns.filter(visible);
        const span = (((360 / n) - 8) * Math.PI) / 180;
        return (
          <g key={`l-${g.id}`}>
            <line x1={cx} y1={cy} x2={gx} y2={gy} className="stroke-line-strong" strokeWidth={2} />
            {ps.map((p, j) => {
              const t = ps.length === 1 ? 0 : j / (ps.length - 1) - 0.5;
              const aa = a + t * span;
              const rr = R + 80 + (j % 2) * 18;
              const x = cx + rr * Math.cos(aa);
              const y = cy + rr * Math.sin(aa) * 0.9;
              return (
                <g key={p.id}>
                  <line x1={gx} y1={gy} x2={x} y2={y} className="stroke-line-strong" strokeWidth={1} />
                  <g
                    className="pm-svg-node"
                    tabIndex={0}
                    role="button"
                    aria-label={`${p.name}, ${p.state === "solid" ? "solid" : p.state === "shaky" ? "shaky" : "not started"}`}
                    onClick={() => pick(p.id, i)}
                    onKeyDown={keyAct(() => pick(p.id, i))}
                  >
                    <circle cx={x} cy={y} r={p.id === selected ? 10 : 8} strokeWidth={2} className={dotFill(p.state)} />
                    <circle cx={x} cy={y} r={16} className="fill-transparent" />
                    <title>{p.name}</title>
                  </g>
                </g>
              );
            })}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={54} className="fill-primary" />
      <Lines lines={["DSA", `${groups.reduce((s, g) => s + g.patterns.length, 0)} patterns`]} x={cx} y={cy} size={14} className="fill-on-primary font-medium" />
      {groups.map((g, i) => {
        const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
        const gx = cx + R * Math.cos(a);
        const gy = cy + R * Math.sin(a) * 0.9;
        const tone = TONES[i % TONES.length];
        const total = g.patterns.reduce((s, p) => s + p.total, 0);
        const done = g.patterns.reduce((s, p) => s + p.solved, 0);
        return (
          <g key={g.id} className="pm-svg-node" tabIndex={0} role="button" aria-label={`Open ${g.title}, ${done} of ${total} solved`} onClick={() => { setFocus(i); pick(g.patterns[0]?.id ?? "", i); }} onKeyDown={keyAct(() => { setFocus(i); pick(g.patterns[0]?.id ?? "", i); })}>
            <rect x={gx - 64} y={gy - 28} width={128} height={56} rx={20} className={tone.fill} />
            <Lines lines={wrap(g.short, 16)} x={gx} y={gy - 8} size={13.5} className={`${tone.text} font-medium`} />
            <text x={gx} y={gy + 17} textAnchor="middle" fontSize={12} className={tone.text}>
              {done}/{total} solved
            </text>
          </g>
        );
      })}
    </svg>
  );

  const fg = focus === null ? null : groups[focus];
  const fps = fg ? fg.patterns.filter(visible) : [];
  const H = Math.max(540, fps.length * 62 + 70);
  const gy0 = H / 2;
  const focusSvg = fg && (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="group" aria-label={`Patterns in ${fg.title}`}>
      {fps.map((p, j) => {
        const yy = fps.length === 1 ? gy0 : 40 + j * ((H - 80) / (fps.length - 1));
        const on = p.id === selected;
        const label = hide && !revealed.has(p.id) ? p.recognize : p.name;
        const act = () => {
          if (hide) setRevealed((r) => new Set(r).add(p.id));
          pick(p.id);
        };
        return (
          <g key={p.id}>
            <path d={`M230 ${gy0} C 290 ${gy0}, 290 ${yy}, 330 ${yy}`} fill="none" className="stroke-line-strong" strokeWidth={1.5} />
            <g className="pm-svg-node" tabIndex={0} role="button" aria-pressed={on} aria-label={`${label}, ${p.solved} of ${p.total} solved`} onClick={act} onKeyDown={keyAct(act)}>
              <rect x={330} y={yy - 25} width={370} height={50} rx={16} strokeWidth={on ? 2 : 1} className={on ? "fill-primary-container stroke-primary" : "fill-surface stroke-line"} />
              <circle cx={352} cy={yy} r={7} strokeWidth={2} className={dotFill(p.state)} />
              <Lines lines={wrap(label, hide && !revealed.has(p.id) ? 40 : 30).slice(0, 2)} x={500} y={yy} size={hide && !revealed.has(p.id) ? 13 : 14.5} lh={16} className={on ? "fill-on-primary-container" : "fill-foreground"} />
              <text x={690} y={yy + 4} textAnchor="end" fontSize={12.5} className="fill-muted">
                {p.solved}/{p.total}
              </text>
            </g>
          </g>
        );
      })}
      <rect x={50} y={gy0 - 46} width={180} height={92} rx={28} className={TONES[(focus ?? 0) % TONES.length].fill} />
      <Lines lines={wrap(fg.title, 20)} x={140} y={gy0 - 8} size={14.5} className={`${TONES[(focus ?? 0) % TONES.length].text} font-medium`} />
      <text x={140} y={gy0 + 26} textAnchor="middle" fontSize={12.5} className={TONES[(focus ?? 0) % TONES.length].text}>
        {fg.patterns.length} patterns
      </text>
    </svg>
  );

  return (
    <div className="space-y-6">
      {/* Wide content: the mind map and its detail card */}
      <div className="hidden items-start gap-4 @min-[760px]:grid @min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 rounded-lg border border-line bg-surface p-3 dark:border-0">
          <div className="flex flex-wrap items-center gap-2 p-1.5">
            {focus !== null && (
              <button type="button" onClick={() => setFocus(null)} className="inline-flex h-9 items-center gap-1 rounded-sm border border-line-strong pr-3 pl-2 text-sm font-medium hover:bg-surface-2 max-md:h-11">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="m15 6-6 6 6 6" />
                </svg>
                All groups
              </button>
            )}
            <FilterChip
              label="Hide names (test yourself)"
              selected={hide}
              onClick={() => {
                setHide((h) => !h);
                setRevealed(new Set());
              }}
            />
            <FilterChip label="Shaky and not started only" selected={weak} onClick={() => setWeak((w) => !w)} />
          </div>
          {focus === null ? overview : focusSvg}
        </div>

        <aside id="pm-groups-card" aria-label="Selected pattern" aria-live="polite" className="min-w-0 rounded-lg border border-line bg-surface p-5 dark:border-0 @min-[1100px]:sticky @min-[1100px]:top-4">
          {sel ? (
            <div>
              <p className="text-xs font-medium tracking-wide text-muted uppercase">{sel.g.title}</p>
              <h3 className="mt-1 text-[22px] leading-tight font-medium">{sel.p.name}</h3>
              <div className="mt-2">
                <MasteryLine m={{ state: sel.p.state, solved: sel.p.solved, total: sel.p.total }} />
              </div>
              <div className="mt-3 rounded-md bg-primary-container p-3.5 text-sm text-on-primary-container">
                <b className="font-medium">Spot it when</b>
                <br />
                {sel.p.recognize}
              </div>
              {sel.p.idea && (
                <p className="mt-3 text-sm">
                  <b className="font-medium">Core move.</b> {sel.p.idea}
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={PRACTICE_HREF(sel.p.id)} className={buttonClass("primary", "sm")}>
                  Practice this
                </Link>
                <Link href={GUIDE_HREF(sel.p.id)} className={buttonClass("outline", "sm")}>
                  Open guide
                </Link>
                {sel.p.thinkId && (
                  <Link href={nodeHref({ pattern: sel.p.thinkId })} className={buttonClass("tonal", "sm")}>
                    See in thinking map
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">Choose a pattern on the map.</p>
          )}
        </aside>
      </div>

      {/* Narrow content: the same groups as a list */}
      <div className="grid-auto-cards-300 grid gap-3 @min-[760px]:hidden">
        {groups.map((g) => {
          const total = g.patterns.reduce((s, p) => s + p.total, 0);
          const done = g.patterns.reduce((s, p) => s + p.solved, 0);
          return (
            <section key={g.id} className="rounded-lg border border-line bg-surface p-4 dark:border-0">
              <h3 className="flex items-baseline justify-between gap-2 text-base font-medium">
                {g.title}
                <span className="text-xs font-normal text-muted">
                  {done}/{total} solved
                </span>
              </h3>
              <ul className="mt-2">
                {g.patterns.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <MasteryDot state={p.state} />
                    <Link href={GUIDE_HREF(p.id)} className="flex min-h-11 min-w-0 flex-1 items-center text-sm hover:underline">
                      <span className="truncate">{p.name}</span>
                    </Link>
                    {p.thinkId && (
                      <Link href={nodeHref({ pattern: p.thinkId })} className="inline-flex min-h-11 items-center px-1 text-xs font-medium text-primary hover:underline">
                        Map
                      </Link>
                    )}
                    <span className="text-xs text-muted tabular-nums">
                      {p.solved}/{p.total}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {sources.length > 0 && (
        <section aria-labelledby="pm-sources" className="space-y-2">
          <h3 id="pm-sources" className="text-base font-medium">
            Practice sources
          </h3>
          <p className="max-w-[70ch] text-sm text-muted">Problem sets such as CSES are places to practise, not patterns, so they are not on the map.</p>
          <ul className="grid-auto-cards-240 grid gap-2">
            {sources.map((s) => (
              <li key={s.id}>
                <Link href={GUIDE_HREF(s.id)} className="flex min-h-11 items-center justify-between gap-2 rounded-md border border-line bg-surface px-4 py-2.5 text-sm hover:border-line-strong dark:border-0">
                  <span className="min-w-0 truncate">{s.title}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">
                    {s.solved}/{s.total}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
