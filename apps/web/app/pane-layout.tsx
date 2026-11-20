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

/** Below this width (of the workspace itself, not the window) the panes stack in one column. */
const STACK_BELOW = 980;
/** Used only until the workspace has been measured (first paint). */
const narrowQuery = `(max-width: ${STACK_BELOW}px)`;

const PRESET_ICON: Record<PresetId, ReactNode> = {
  // Each icon draws its layout: rectangles for the panes.
  classic: (
    <>
      <rect x="3" y="4" width="7" height="16" rx="1.5" />
      <rect x="12" y="4" width="9" height="9" rx="1.5" />
      <rect x="12" y="15" width="9" height="5" rx="1.5" />
    </>
  ),
  columns: (
    <>
      <rect x="3" y="4" width="5" height="16" rx="1.5" />
      <rect x="10" y="4" width="5" height="16" rx="1.5" />
      <rect x="17" y="4" width="4" height="16" rx="1.5" />
    </>
  ),
  stacked: (
    <>
      <rect x="3" y="3" width="18" height="5" rx="1.5" />
      <rect x="3" y="10" width="18" height="6" rx="1.5" />
      <rect x="3" y="18" width="18" height="3" rx="1" />
    </>
  ),
  focus: (
    <>
      <rect x="3" y="4" width="11" height="16" rx="1.5" />
      <rect x="16" y="4" width="5" height="9" rx="1.5" />
      <rect x="16" y="15" width="5" height="5" rx="1.5" />
    </>
  ),
};

/**
 * The four layout presets as icon buttons, plus "Reset sizes". Reads and writes the same stored layout as PaneLayout
 * (`habit-pane-layout`), so it can sit anywhere on the page, such as the workspace header. Hidden where panes stack.
 */
export function LayoutSwitcher() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_RAW);
  const saved = parse(raw);
  const choose = (p: PresetId) => write({ preset: p, order: PRESETS[p].order, sizes: saved.sizes });
  return (
    // Hidden where the panes stack (the nearest @container is the workspace).
    <div className="flex items-center gap-1 @max-[980px]:hidden">
      <div role="radiogroup" aria-label="Layout" className="flex items-center gap-0.5 rounded-full bg-surface p-1">
        {PRESET_IDS.map((p) => {
          const isSelected = saved.preset === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${PRESETS[p].label} layout`}
              title={`${PRESETS[p].label} layout. Drag a pane's title onto another pane to swap them.`}
              onClick={() => choose(p)}
              className={`grid h-8 w-9 place-items-center rounded-full transition-colors duration-120 ${
                isSelected ? "bg-primary-soft text-on-primary-soft" : "text-muted hover:text-foreground"
              }`}
            >
              <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                {PRESET_ICON[p]}
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia(narrowQuery);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export interface PaneDef {
  title: string;
  /** Tabs shown in the title bar in place of the title (the title stays the pane's accessible name) */
  tabs?: ReactNode;
  /** Extra controls shown in the pane's title bar */
  actions?: ReactNode;
  /** Not shown below the `md` breakpoint (phones), for panes that only make sense with a keyboard. */
  phoneHidden?: boolean;
  children: ReactNode;
}

export function PaneLayout({
  panes,
  height = "var(--pane-h, calc(100dvh - 13rem))",
  maximised: controlledMaximised,
  onMaximise: setControlledMaximised,
}: {
  panes: Record<PaneId, PaneDef>;
  height?: string;
  maximised?: PaneId | null;
  onMaximise?: (id: PaneId | null | ((prev: PaneId | null) => PaneId | null)) => void;
}) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => DEFAULT_RAW);
  const narrowViewport = useSyncExternalStore(subscribeNarrow, () => window.matchMedia(narrowQuery).matches, () => false);
  // The workspace's own width decides stacking, so a wide window with a side rail still stacks when the panes would be
  // squeezed. Measured with a ResizeObserver on whichever root is rendered; the window query is only the first guess.
  const [width, setWidth] = useState<number | null>(null);
  const measure = useCallback((el: HTMLDivElement | null) => {
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(Math.round(w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrow = width === null ? narrowViewport : width < STACK_BELOW;
  const saved = parse(raw);
  const preset = PRESETS[saved.preset];
  const [internalMaximised, setInternalMaximised] = useState<PaneId | null>(null);
  const maximised = controlledMaximised !== undefined ? controlledMaximised : internalMaximised;
  const setMaximised = (val: PaneId | null | ((prev: PaneId | null) => PaneId | null)) => {
    if (setControlledMaximised) setControlledMaximised(val);
    else setInternalMaximised(val);
  };
  const [dragging, setDragging] = useState<PaneId | null>(null);
  const [over, setOver] = useState<PaneId | null>(null);

  const sizesOf = (node: Extract<Node, { kind: "split" }>) => saved.sizes[saved.preset]?.[node.id] ?? node.sizes;
  const setSizes = (id: string, sizes: number[]) => write({ ...saved, sizes: { ...saved.sizes, [saved.preset]: { ...saved.sizes[saved.preset], [id]: sizes } } });
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

  if (narrow) {
    return (
      <div ref={measure} className="w-full space-y-2 p-2">
        {(["problem", "code", "results"] as const).map((id) => (
          // phoneHidden hides a pane only on phones (under 768px); tablets (768-980px) keep every pane, stacked.
          <section key={id} aria-label={panes[id].title} className={`overflow-hidden rounded-[24px] border border-line bg-surface dark:border-0 ${panes[id].phoneHidden ? "max-md:hidden" : ""}`}>
            <header className="flex min-h-12 flex-wrap items-center justify-between gap-2 px-3 py-1.5">
              {panes[id].tabs ? <div className="min-w-0 flex-1">{panes[id].tabs}</div> : <h3 className="text-sm font-semibold">{panes[id].title}</h3>}
              {panes[id].actions}
            </header>
            <div className={id === "code" ? "md:h-[28rem] max-md:p-3" : "p-3"}>{panes[id].children}</div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div ref={measure} className="pane-root w-full">
      <div style={{ height }} className="pane-box min-h-[30rem] rounded-[24px] bg-background p-2">
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
        className={`absolute rounded-full transition-colors duration-120 group-hover:bg-primary group-focus-visible:bg-primary ${active ? "bg-primary" : "bg-transparent"} ${
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
      className={`@container flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[24px] bg-surface text-foreground transition-colors duration-120 ${
        isOver ? "ring-2 ring-primary" : ""
      } ${isDragging ? "opacity-50" : ""}`}
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 px-3 pt-1">
        <div
          draggable={draggable}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", id);
            e.dataTransfer.effectAllowed = "move";
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          title={draggable ? `Drag ${def.title} onto another pane to swap them` : undefined}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-2 hover:text-foreground ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
            <circle cx="6" cy="4" r="1.1" />
            <circle cx="10" cy="4" r="1.1" />
            <circle cx="6" cy="8" r="1.1" />
            <circle cx="10" cy="8" r="1.1" />
            <circle cx="6" cy="12" r="1.1" />
            <circle cx="10" cy="12" r="1.1" />
          </svg>
          <span className={def.tabs ? "sr-only" : "truncate text-foreground"}>{def.title}</span>
        </div>
        {def.tabs && <div className="min-w-0 flex-1 self-stretch">{def.tabs}</div>}
        <div className="flex min-w-0 items-center gap-1">
          {/* The section is a size container, so pane controls can drop their less important parts when it is narrow. */}
          {def.actions}
          <button
            type="button"
            onClick={onMaximise}
            aria-pressed={maximised}
            aria-label={maximised ? `Restore ${def.title}` : `Maximise ${def.title}`}
            title={maximised ? "Restore" : "Maximise"}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted transition-colors duration-120 hover:bg-surface-2 hover:text-foreground"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              {maximised ? <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" /> : <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />}
            </svg>
          </button>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{def.children}</div>
    </section>
  );
}
