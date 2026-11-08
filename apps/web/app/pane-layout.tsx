"use client";

import { useCallback, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";

// A small window manager for the problem page, like LeetCode's: three panes you can resize (drag the dividers, or focus
// one and use the arrow keys), swap by dragging a pane's title onto another, switch between layouts, and maximise.
// The layout is remembered in this browser. On a narrow screen the panes simply stack and scroll.

export type PaneId = "problem" | "code" | "results";
export type PresetId = "classic" | "columns" | "stacked" | "focus";

type Node =
  | { kind: "slot"; slot: number }
  | { kind: "split"; id: string; dir: "row" | "col"; children: Node[]; sizes: number[] };

const slot = (n: number): Node => ({ kind: "slot", slot: n });

/** Each preset: the shape of the layout, which pane starts in which slot, and the starting sizes (percent). */
const PRESETS: Record<PresetId, { label: string; order: PaneId[]; tree: Node }> = {
  classic: {
    label: "Classic",
    order: ["problem", "code", "results"],
    tree: { kind: "split", id: "root", dir: "row", sizes: [44, 56], children: [slot(0), { kind: "split", id: "right", dir: "col", sizes: [64, 36], children: [slot(1), slot(2)] }] },
  },
  columns: {
    label: "Columns",
    order: ["problem", "code", "results"],
    tree: { kind: "split", id: "root", dir: "row", sizes: [32, 42, 26], children: [slot(0), slot(1), slot(2)] },
  },
  stacked: {
    label: "Stacked",
    order: ["problem", "code", "results"],
    tree: { kind: "split", id: "root", dir: "col", sizes: [32, 44, 24], children: [slot(0), slot(1), slot(2)] },
  },
  focus: {
    label: "Code focus",
    order: ["code", "problem", "results"],
    tree: { kind: "split", id: "root", dir: "row", sizes: [62, 38], children: [slot(0), { kind: "split", id: "side", dir: "col", sizes: [58, 42], children: [slot(1), slot(2)] }] },
  },
};
const PRESET_IDS = Object.keys(PRESETS) as PresetId[];
const MIN = 10; // percent: no pane gets narrower than this

interface Saved {
  preset: PresetId;
  /** Pane in each slot of the current preset */
  order: PaneId[];
  /** Sizes by preset, then by split id */
  sizes: Partial<Record<PresetId, Record<string, number[]>>>;
}

const KEY = "habit-pane-layout";
const DEFAULT: Saved = { preset: "classic", order: PRESETS.classic.order, sizes: {} };
const DEFAULT_RAW = JSON.stringify(DEFAULT);

const listeners = new Set<() => void>();
const read = () => {
  try {
    return localStorage.getItem(KEY) ?? DEFAULT_RAW;
  } catch {
    return DEFAULT_RAW;
  }
};
const write = (value: Saved) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage can be blocked; the layout then lasts until the page reloads.
    memory = JSON.stringify(value);
  }
  listeners.forEach((l) => l());
};
let memory: string | null = null;
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => void listeners.delete(l);
};
const snapshot = () => memory ?? read();

function parse(raw: string): Saved {
  try {
    const v = JSON.parse(raw) as Partial<Saved>;
    const preset = PRESET_IDS.includes(v.preset as PresetId) ? (v.preset as PresetId) : "classic";
    const panes: PaneId[] = ["problem", "code", "results"];
    const order = Array.isArray(v.order) && v.order.length === 3 && panes.every((p) => v.order!.includes(p)) ? (v.order as PaneId[]) : PRESETS[preset].order;
    return { preset, order, sizes: v.sizes && typeof v.sizes === "object" ? v.sizes : {} };
  } catch {
    return DEFAULT;
  }
}

const narrowQuery = "(max-width: 1023px)";
const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia(narrowQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export interface PaneDef {
  title: string;
  /** Extra controls shown in the pane's title bar */
  actions?: ReactNode;
  children: ReactNode;
}

export function PaneLayout({ panes, height = "calc(100dvh - 13rem)" }: { panes: Record<PaneId, PaneDef>; height?: string }) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_RAW);
  const narrow = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(narrowQuery).matches, () => false);
  const saved = parse(raw);
  const preset = PRESETS[saved.preset];
  const [maximised, setMaximised] = useState<PaneId | null>(null);
  const [dragging, setDragging] = useState<PaneId | null>(null);
  const [over, setOver] = useState<PaneId | null>(null);

  const sizesOf = (node: Extract<Node, { kind: "split" }>) => saved.sizes[saved.preset]?.[node.id] ?? node.sizes;
  const setSizes = (id: string, sizes: number[]) => write({ ...saved, sizes: { ...saved.sizes, [saved.preset]: { ...saved.sizes[saved.preset], [id]: sizes } } });
  const choose = (p: PresetId) => write({ preset: p, order: PRESETS[p].order, sizes: saved.sizes });
  const reset = () => write({ preset: saved.preset, order: PRESETS[saved.preset].order, sizes: { ...saved.sizes, [saved.preset]: {} } });
  const swap = (a: PaneId, b: PaneId) => {
    if (a === b) return;
    write({ ...saved, order: saved.order.map((p) => (p === a ? b : p === b ? a : p)) });
  };

  const frame = (id: PaneId) => (
    <PaneFrame
      key={id}
      id={id}
      def={panes[id]}
      maximised={maximised === id}
      onMaximise={() => setMaximised((m) => (m === id ? null : id))}
      isDragging={dragging === id}
      isOver={over === id && dragging !== id}
      onDragStart={() => setDragging(id)}
      onDragEnd={() => {
        setDragging(null);
        setOver(null);
      }}
      onDragEnter={() => setOver(id)}
      onDrop={() => {
        if (dragging) swap(dragging, id);
        setDragging(null);
        setOver(null);
      }}
      draggable={!narrow}
    />
  );

  const render = (node: Node): ReactNode => {
    if (node.kind === "slot") return frame(saved.order[node.slot]);
    return <SplitView key={node.id} node={node} sizes={sizesOf(node)} onSizes={(s) => setSizes(node.id, s)} onReset={() => setSizes(node.id, node.sizes)} render={render} />;
  };

  const toolbar = (
    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted">Layout</span>
      <div role="group" aria-label="Layout" className="flex overflow-hidden rounded-lg border border-line">
        {PRESET_IDS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={saved.preset === p}
            onClick={() => choose(p)}
            className={`px-2.5 py-1 ${saved.preset === p ? "bg-accent text-on-accent" : "bg-surface hover:bg-background"}`}
          >
            {PRESETS[p].label}
          </button>
        ))}
      </div>
      <button type="button" onClick={reset} className="rounded-lg border border-line px-2.5 py-1 hover:bg-background">
        Reset sizes
      </button>
      <span className="text-muted">Drag a divider to resize. Drag a pane&apos;s title onto another pane to swap them.</span>
    </div>
  );

  if (narrow) {
    return (
      <div className="space-y-4">
        {saved.order.map((id) => (
          <section key={id} aria-label={panes[id].title} className="overflow-hidden rounded-xl border border-line bg-surface">
            <header className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
              <h3 className="text-sm font-semibold">{panes[id].title}</h3>
              {panes[id].actions}
            </header>
            <div className={id === "code" ? "h-[28rem]" : "p-3"}>{panes[id].children}</div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div>
      {toolbar}
      <div style={{ height }} className="min-h-[30rem]">
        {maximised ? frame(maximised) : render(preset.tree)}
      </div>
    </div>
  );
}

function SplitView({
  node,
  sizes,
  onSizes,
  onReset,
  render,
}: {
  node: Extract<Node, { kind: "split" }>;
  sizes: number[];
  onSizes: (s: number[]) => void;
  onReset: () => void;
  render: (n: Node) => ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const row = node.dir === "row";

  const move = useCallback(
    (index: number, deltaPercent: number) => {
      const a = sizes[index] + deltaPercent;
      const b = sizes[index + 1] - deltaPercent;
      if (a < MIN || b < MIN) return;
      const next = [...sizes];
      next[index] = a;
      next[index + 1] = b;
      onSizes(next);
    },
    [sizes, onSizes],
  );

  return (
    <div ref={ref} className={`flex h-full w-full ${row ? "flex-row" : "flex-col"}`}>
      {node.children.map((child, i) => (
        <div key={i} className="contents">
          <div style={{ flex: `${sizes[i]} 1 0%` }} className="min-h-0 min-w-0">
            {render(child)}
          </div>
          {i < node.children.length - 1 && <Divider row={row} containerRef={ref} sizes={sizes} index={i} onMove={move} onReset={onReset} />}
        </div>
      ))}
    </div>
  );
}

function Divider({
  row,
  containerRef,
  sizes,
  index,
  onMove,
  onReset,
}: {
  row: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
  sizes: number[];
  index: number;
  onMove: (index: number, deltaPercent: number) => void;
  onReset: () => void;
}) {
  const [active, setActive] = useState(false);
  const startRef = useRef<{ pos: number; sizes: number[]; total: number } | null>(null);

  return (
    <div
      role="separator"
      aria-orientation={row ? "vertical" : "horizontal"}
      aria-label="Resize panes"
      aria-valuenow={Math.round(sizes[index])}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onDoubleClick={onReset}
      onPointerDown={(e) => {
        const box = containerRef.current?.getBoundingClientRect();
        if (!box) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        startRef.current = { pos: row ? e.clientX : e.clientY, sizes: [...sizes], total: row ? box.width : box.height };
        setActive(true);
      }}
      onPointerMove={(e) => {
        const s = startRef.current;
        if (!s) return;
        const delta = (((row ? e.clientX : e.clientY) - s.pos) / s.total) * 100;
        const a = s.sizes[index] + delta;
        const b = s.sizes[index + 1] - delta;
        if (a < MIN || b < MIN) return;
        // Apply relative to the sizes when the drag started, so the divider follows the pointer exactly.
        onMove(index, a - sizes[index]);
      }}
      onPointerUp={() => {
        startRef.current = null;
        setActive(false);
      }}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 6 : 2;
        const back = row ? "ArrowLeft" : "ArrowUp";
        const forward = row ? "ArrowRight" : "ArrowDown";
        if (e.key === back) onMove(index, -step);
        else if (e.key === forward) onMove(index, step);
        else return;
        e.preventDefault();
      }}
      className={`group relative shrink-0 ${row ? "w-2 cursor-col-resize" : "h-2 cursor-row-resize"} touch-none outline-none`}
    >
      <span
        aria-hidden
        className={`absolute rounded-full bg-line transition-colors group-hover:bg-accent group-focus-visible:bg-accent ${active ? "bg-accent" : ""} ${
          row ? "inset-y-2 left-1/2 w-0.5 -translate-x-1/2" : "inset-x-2 top-1/2 h-0.5 -translate-y-1/2"
        }`}
      />
    </div>
  );
}

function PaneFrame({
  id,
  def,
  maximised,
  onMaximise,
  isDragging,
  isOver,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDrop,
  draggable,
}: {
  id: PaneId;
  def: PaneDef;
  maximised: boolean;
  onMaximise: () => void;
  isDragging: boolean;
  isOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragEnter: () => void;
  onDrop: () => void;
  draggable: boolean;
}) {
  return (
    <section
      aria-label={def.title}
      data-pane={id}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnter}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-surface transition-colors ${
        isOver ? "border-accent ring-2 ring-accent/40" : "border-line"
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line bg-background/60 px-2 py-1">
        <div
          draggable={draggable}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", id);
            e.dataTransfer.effectAllowed = "move";
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          title={draggable ? "Drag onto another pane to swap them" : undefined}
          className={`flex min-w-0 items-center gap-1.5 rounded px-1 py-0.5 text-sm font-semibold ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          <span aria-hidden className="text-muted">
            ⠿
          </span>
          <span className="truncate">{def.title}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {def.actions}
          <button
            type="button"
            onClick={onMaximise}
            aria-pressed={maximised}
            aria-label={maximised ? `Restore ${def.title}` : `Maximise ${def.title}`}
            title={maximised ? "Restore" : "Maximise"}
            className="grid size-6 place-items-center rounded text-muted hover:bg-background hover:text-foreground"
          >
            {maximised ? "–" : "⤢"}
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{def.children}</div>
    </section>
  );
}
