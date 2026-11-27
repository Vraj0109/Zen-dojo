import type { Pattern, PatternGroup } from "@habit/shared";
import { getDsaGroups } from "./content-repo/lookups";

export interface PatternNeighbours {
  prev: Pattern | undefined;
  next: Pattern | undefined;
  group: PatternGroup;
  /** The group after this pattern's group (undefined for the last group). */
  nextGroup: PatternGroup | undefined;
  isLastInGroup: boolean;
  /** Group of prev/next when it differs from this pattern's group. */
  prevGroup: PatternGroup | undefined;
  nextPatternGroup: PatternGroup | undefined;
}

/** Previous/next pattern and group facts for the end of a pattern page. Null for an unknown id. */
export async function patternNeighbours(id: string, groups?: PatternGroup[]): Promise<PatternNeighbours | null> {
  const dsaGroups = groups ?? (await getDsaGroups());
  const allPatterns = dsaGroups.flatMap((g) => g.patterns);
  const groupOf = (pid: string) => dsaGroups.find((g) => g.patterns.some((p) => p.id === pid));

  const idx = allPatterns.findIndex((p) => p.id === id);
  const group = groupOf(id);
  if (idx < 0 || !group) return null;
  const prev = allPatterns[idx - 1];
  const next = allPatterns[idx + 1];
  const gIdx = dsaGroups.indexOf(group);
  const prevG = prev ? groupOf(prev.id) : undefined;
  const nextG = next ? groupOf(next.id) : undefined;
  return {
    prev,
    next,
    group,
    nextGroup: dsaGroups[gIdx + 1],
    isLastInGroup: group.patterns[group.patterns.length - 1]?.id === id,
    prevGroup: prevG && prevG.id !== group.id ? prevG : undefined,
    nextPatternGroup: nextG && nextG.id !== group.id ? nextG : undefined,
  };
}
