import { ALL_PATTERNS, DSA_GROUPS } from "@habit/shared";

type Pattern = (typeof ALL_PATTERNS)[number];
type Group = (typeof DSA_GROUPS)[number];

export interface PatternNeighbours {
  prev: Pattern | undefined;
  next: Pattern | undefined;
  group: Group;
  /** The group after this pattern's group (undefined for the last group). */
  nextGroup: Group | undefined;
  isLastInGroup: boolean;
  /** Group of prev/next when it differs from this pattern's group. */
  prevGroup: Group | undefined;
  nextPatternGroup: Group | undefined;
}

const groupOf = (id: string) => DSA_GROUPS.find((g) => g.patterns.some((p) => p.id === id));

/** Previous/next pattern and group facts for the end of a pattern page. Null for an unknown id. */
export function patternNeighbours(id: string): PatternNeighbours | null {
  const idx = ALL_PATTERNS.findIndex((p) => p.id === id);
  const group = groupOf(id);
  if (idx < 0 || !group) return null;
  const prev = ALL_PATTERNS[idx - 1];
  const next = ALL_PATTERNS[idx + 1];
  const gIdx = DSA_GROUPS.indexOf(group);
  const prevG = prev ? groupOf(prev.id) : undefined;
  const nextG = next ? groupOf(next.id) : undefined;
  return {
    prev,
    next,
    group,
    nextGroup: DSA_GROUPS[gIdx + 1],
    isLastInGroup: group.patterns[group.patterns.length - 1]?.id === id,
    prevGroup: prevG && prevG.id !== group.id ? prevG : undefined,
    nextPatternGroup: nextG && nextG.id !== group.id ? nextG : undefined,
  };
}
