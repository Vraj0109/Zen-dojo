"use client";

import type { BlockRow } from "@habit/shared";
import { Diagram } from "@/app/diagram";

const STARTERS = {
  flowchart: "flowchart LR\n  A[Start] --> B{Choice}\n  B -->|Yes| C[Process]\n  B -->|No| D[End]\n  C --> D",
  sequence: "sequenceDiagram\n  autonumber\n  Client->>Server: HTTP GET /api\n  Server-->>Client: 200 OK (JSON)",
  class: "classDiagram\n  class Cache {\n    +get(key: String)\n    +put(key: String, val: Any)\n  }",
  er: "erDiagram\n  USER ||--o{ ORDER : places\n  ORDER ||--|{ ITEM : contains",
};

export function DiagramBlockEditor({
  block,
  onChange,
}: {
  block: BlockRow;
  onChange: (updates: Partial<BlockRow>) => void;
}) {
  const source = block.body ?? "";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-muted">Mermaid diagram</span>
        <div className="flex items-center gap-1">
          <span className="text-muted">Start from:</span>
          {(Object.keys(STARTERS) as (keyof typeof STARTERS)[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                // A starter replaces the whole source, so ask first when there is source to lose.
                if (source.trim() && !window.confirm("Replace the diagram source with this starter?")) return;
                onChange({ body: STARTERS[k] });
              }}
              className="rounded border border-line bg-surface px-1.5 py-0.5 text-xs text-muted hover:text-foreground capitalize"
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div>
          <textarea
            value={source}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="flowchart LR&#10;  A --> B"
            rows={8}
            className="w-full rounded-md border border-line bg-surface/50 p-3 font-mono text-xs leading-relaxed focus:border-accent focus:outline-none"
          />
        </div>
        <div className="overflow-x-auto rounded-md border border-line bg-surface/20 p-3 flex flex-col items-center justify-center min-h-[10rem]">
          {source.trim() ? (
            <Diagram source={source} caption={block.caption ?? undefined} />
          ) : (
            <span className="text-xs italic text-muted">Diagram preview appears here</span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted mb-1">Caption (optional)</label>
        <input
          type="text"
          value={block.caption ?? ""}
          onChange={(e) => onChange({ caption: e.target.value || null })}
          placeholder="Figure caption..."
          className="w-full rounded-md border border-line bg-surface/50 px-3 py-1.5 text-xs focus:border-accent focus:outline-none"
        />
      </div>
    </div>
  );
}
