import { describe, expect, it } from "vitest";
import { buildBuddyMessages, cleanBuddyLine, parseBuddyRequest } from "./buddy";

describe("buddy ai prompt", () => {
  it("validates the request and strips control characters from the name", () => {
    expect(parseBuddyRequest({ event: "solved", tone: "peer", name: "Pip\n\u0007" })).toEqual({ event: "solved", tone: "peer", name: "Pip" });
    expect(parseBuddyRequest({ event: "solved", tone: "peer", name: "  " })?.name).toBe("Buddy");
    expect(parseBuddyRequest({ event: "nope", tone: "peer", name: "A" })).toBeNull();
    expect(parseBuddyRequest({ event: "solved", tone: "evil", name: "A" })).toBeNull();
    expect(parseBuddyRequest({ event: "solved", tone: "calm", name: "x".repeat(31) })).toBeNull();
    expect(parseBuddyRequest({ event: "solved", tone: "calm" })).toBeNull();
    expect(parseBuddyRequest(null)).toBeNull();
  });

  it("builds a prompt from only the event, tone and name", () => {
    const m = buildBuddyMessages({ event: "solved", tone: "coach", name: "Rex" });
    expect(m).toHaveLength(2);
    expect(m[0]!.role).toBe("system");
    expect(m[0]!.content).toContain("Rex");
    expect(m[0]!.content).toContain("direct and motivating");
    expect(m[0]!.content).toContain("solved a practice problem");
    expect(m[1]).toEqual({ role: "user", content: "Say it." });
  });

  it("cleans the answer and rejects an empty one", () => {
    expect(cleanBuddyLine('  "Nice work!"\n')).toBe("Nice work!");
    expect(cleanBuddyLine("Line one\nline two")).toBe("Line one line two");
    expect(cleanBuddyLine("a".repeat(300))!.length).toBeLessThanOrEqual(140);
    expect(cleanBuddyLine("   \n ")).toBeNull();
    expect(cleanBuddyLine('""')).toBeNull();
  });

  it("accepts an optional persona, capping and cleaning it", () => {
    const r = parseBuddyRequest({ event: "solved", tone: "peer", name: "Pip", persona: { name: "Shinchan", description: "x".repeat(500) } });
    expect(r?.persona?.name).toBe("Shin chan");
    expect(r?.persona?.description).toHaveLength(300);
    expect(parseBuddyRequest({ event: "solved", tone: "peer", name: "Pip", persona: "bad" })).toBeNull();
    expect(parseBuddyRequest({ event: "solved", tone: "peer", name: "Pip", persona: { name: "  " } })).toBeNull();
    expect(parseBuddyRequest({ event: "solved", tone: "peer", name: "Pip" })?.persona).toBeUndefined();
  });

  it("builds the persona prompt from only the event, tone and the pet's name and description", () => {
    const m = buildBuddyMessages({ event: "solved", tone: "coach", name: "Rex", persona: { name: "Shinchan", description: "A mischievous boy" } });
    expect(m[0]!.content).toContain("You are playing Shinchan.");
    expect(m[0]!.content).toContain("A mischievous boy");
    expect(m[0]!.content).toContain("solved a practice problem");
    expect(m[0]!.content).not.toContain("Rex");
  });
});
