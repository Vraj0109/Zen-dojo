// Plan 0060: which local model (run by the user's own Ollama) fits a computer. Pure data and rules, no I/O.
// Tags checked against https://ollama.com/library/<name> on 2026-11-11 (see the plan's implementation notes).

export interface Hardware {
  /** Total system memory in GB. 0 when unknown. */
  ramGb: number;
  /** Memory of the largest discrete GPU in GB, or null when there is none or it could not be read. */
  gpuGb: number | null;
  gpuName?: string;
  /** Apple Silicon shares memory with the system, so RAM is what counts. */
  appleSilicon?: boolean;
}

export interface ModelTier {
  /** Ollama tag. */
  model: string;
  /** Short label for the picker. */
  label: string;
  /** Usable memory (GB) the model needs to run at a reasonable speed. */
  minGb: number;
  /** Approximate download size in GB. */
  downloadGb: number;
}

/** Smallest to largest. Update here when Ollama renames or retires a tag. */
export const MODEL_TIERS: readonly ModelTier[] = [
  { model: "llama3.2:3b", label: "Small (3B)", minGb: 2, downloadGb: 2 },
  { model: "qwen2.5-coder:7b", label: "Medium (7B)", minGb: 6, downloadGb: 4.7 },
  { model: "qwen2.5-coder:14b", label: "Large (14B)", minGb: 12, downloadGb: 9 },
  { model: "qwen2.5-coder:32b", label: "Extra large (32B)", minGb: 20, downloadGb: 20 },
];

/** Share of system memory a model may use when there is no discrete GPU (the app and the OS need the rest). */
const RAM_SHARE = 0.6;

/** Memory a model can use: the GPU's memory when there is a discrete GPU, else about 60% of RAM. */
export function usableGb(hw: Hardware): number {
  if (hw.gpuGb !== null && hw.gpuGb !== undefined && hw.gpuGb > 0 && Number.isFinite(hw.gpuGb)) return hw.gpuGb;
  if (!Number.isFinite(hw.ramGb) || hw.ramGb <= 0) return 0;
  return hw.ramGb * RAM_SHARE;
}

/** The largest tier that fits. Unknown or tiny hardware gets the smallest tier ("smaller is fine"). */
export function recommendModel(hw: Hardware): ModelTier {
  const usable = usableGb(hw);
  let pick = MODEL_TIERS[0];
  for (const t of MODEL_TIERS) if (t.minGb <= usable) pick = t;
  return pick;
}

/** Plain-language summary of the computer and what will run on it. */
export function describeHardware(hw: Hardware): string {
  const ram = hw.ramGb > 0 ? `${Math.round(hw.ramGb)} GB of memory` : "an unknown amount of memory";
  const gpu =
    hw.gpuGb && hw.gpuGb > 0
      ? `a graphics card with ${Math.round(hw.gpuGb)} GB${hw.gpuName ? ` (${hw.gpuName})` : ""}`
      : hw.appleSilicon
        ? "shared graphics memory (Apple Silicon)"
        : "no dedicated graphics card that could be read";
  const rec = recommendModel(hw);
  const slow = !(hw.gpuGb && hw.gpuGb > 0) && !hw.appleSilicon ? ", slowly on long answers" : "";
  return `Your computer has ${ram} and ${gpu}. ${rec.label} will run${slow}.`;
}
