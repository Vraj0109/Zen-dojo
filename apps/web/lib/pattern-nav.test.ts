import { describe, expect, it } from "vitest";
import { ALL_PATTERNS, DSA_GROUPS } from "@habit/shared";
import { patternNeighbours } from "./pattern-nav";

describe("patternNeighbours", () => {
  it("first pattern has no prev", () => {
    expect(patternNeighbours(ALL_PATTERNS[0].id)?.prev).toBeUndefined();
  });
  it("last pattern has no next", () => {
    expect(patternNeighbours(ALL_PATTERNS.at(-1)!.id)?.next).toBeUndefined();
  });
  it("last pattern of the first group links to the second group", () => {
    const last = DSA_GROUPS[0].patterns.at(-1)!;
    const n = patternNeighbours(last.id)!;
    expect(n.isLastInGroup).toBe(true);
    expect(n.nextGroup?.id).toBe(DSA_GROUPS[1].id);
    expect(n.nextPatternGroup?.id).toBe(DSA_GROUPS[1].id);
  });
  it("first pattern of a group is not last in group", () => {
    expect(patternNeighbours(DSA_GROUPS[0].patterns[0].id)?.isLastInGroup).toBe(DSA_GROUPS[0].patterns.length === 1);
  });
  it("unknown id returns null", () => {
    expect(patternNeighbours("no-such-pattern")).toBeNull();
  });
});
