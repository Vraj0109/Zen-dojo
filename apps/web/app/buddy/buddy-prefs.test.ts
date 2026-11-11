import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUDDY_PREFS_KEY,
  DEFAULT_BUDDY_PREFS,
  readBuddyPrefs,
  resetBuddyPosition,
  sanitizeBuddyPrefs,
  writeBuddyPrefs,
} from "./buddy-prefs";

function stubBrowser(blocked = false) {
  const data = new Map<string, string>();
  const events: string[] = [];
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => {
      if (blocked) throw new Error("blocked");
      return data.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (blocked) throw new Error("blocked");
      data.set(k, v);
    },
  });
  vi.stubGlobal("window", {
    dispatchEvent: (e: { type: string }) => events.push(e.type),
    addEventListener() {},
    removeEventListener() {},
  });
  vi.stubGlobal(
    "CustomEvent",
    class {
      constructor(
        public type: string,
        public init?: unknown,
      ) {}
    },
  );
  return { data, events };
}

beforeEach(() => stubBrowser());
afterEach(() => vi.unstubAllGlobals());

describe("buddy prefs", () => {
  it("returns defaults when nothing is stored", () => {
    expect(readBuddyPrefs()).toEqual(DEFAULT_BUDDY_PREFS);
  });
  it("merges patches, stores them and notifies", () => {
    const { data, events } = stubBrowser();
    writeBuddyPrefs({ avatar: "cat", size: "l" });
    const next = writeBuddyPrefs({ pos: { x: 10, y: 20 } });
    expect(next).toMatchObject({ avatar: "cat", size: "l", pos: { x: 10, y: 20 } });
    expect(JSON.parse(data.get(BUDDY_PREFS_KEY)!)).toMatchObject({ avatar: "cat" });
    expect(events).toEqual(["buddy:prefs", "buddy:prefs"]);
  });
  it("resets only the position", () => {
    writeBuddyPrefs({ avatar: "robot", pos: { x: 1, y: 2 } });
    resetBuddyPosition();
    const p = readBuddyPrefs();
    expect(p.pos).toBeUndefined();
    expect(p.avatar).toBe("robot");
  });
  it("repairs corrupt and out-of-range data", () => {
    expect(sanitizeBuddyPrefs({ avatar: "dragon", size: "xl", frequency: 3, pos: { x: NaN, y: 1 } })).toEqual(
      DEFAULT_BUDDY_PREFS,
    );
    expect(sanitizeBuddyPrefs({ avatar: "custom" }).avatar).toBe(DEFAULT_BUDDY_PREFS.avatar);
    expect(sanitizeBuddyPrefs({ avatar: "custom", customSrc: "data:image/png;base64,AA" }).avatar).toBe("custom");
    expect(sanitizeBuddyPrefs("nope")).toEqual(DEFAULT_BUDDY_PREFS);
  });
  it("survives blocked localStorage", () => {
    stubBrowser(true);
    expect(readBuddyPrefs()).toEqual(DEFAULT_BUDDY_PREFS);
    expect(writeBuddyPrefs({ avatar: "blob" }).avatar).toBe("blob");
  });
});
