import { describe, expect, it } from "vitest";
import {
  SYNCED_PREF_KEYS,
  SYNCED_PREFS_SETTING_KEY,
  applyValues,
  buildSnapshot,
  parseSyncedPrefs,
  reloadDecision,
  sameValues,
  serializeSyncedPrefs,
  shouldPull,
  type StorageLike,
} from "./synced-prefs";
import { isSyncableSettingKey } from "./sync-triggers";

function fake(init: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...init };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

describe("synced prefs", () => {
  it("the setting key syncs through the settings sync", () => {
    expect(isSyncableSettingKey(SYNCED_PREFS_SETTING_KEY)).toBe(true);
  });

  it("snapshot holds allowlisted keys only", () => {
    const s = fake({ zd_haptics: "off", "habit-pane-layout": "[1,2]", "habit.timer": "{}", "zd-ai-byok-v1": "secret", "zen-dojo:project:x": "code", tools_notice_dismissed: "1" });
    expect(buildSnapshot(s)).toEqual({ zd_haptics: "off", "habit-pane-layout": "[1,2]" });
  });

  it("never includes AI keys or pets", () => {
    expect(SYNCED_PREF_KEYS.some((k) => /byok|ai-|ai_|timer|adopt|study-mode|project/.test(k))).toBe(false);
    const s = fake({
      "habit-buddy-prefs": JSON.stringify({ avatar: "pet", pet: { id: "x", name: "X", description: "" }, aiLines: true, pos: { x: 1, y: 2 }, customSrc: "data:image/png;base64,AA", size: "l", frequency: "rare" }),
    });
    const snap = buildSnapshot(s);
    expect(JSON.parse(snap["habit-buddy-prefs"])).toEqual({ frequency: "rare", size: "l" });
    expect(snap["habit-buddy-prefs"]).not.toMatch(/pet|aiLines|pos|customSrc/);
  });

  it("applying buddy values keeps local pet, position and AI consent", () => {
    const local = { avatar: "pet", pet: { id: "p", name: "P", description: "" }, aiLines: true, pos: { x: 5, y: 6 }, size: "m", frequency: "normal" };
    const s = fake({ "habit-buddy-prefs": JSON.stringify(local) });
    expect(applyValues(s, { "habit-buddy-prefs": JSON.stringify({ size: "s", frequency: "off" }) })).toBe(true);
    const after = JSON.parse(s.data["habit-buddy-prefs"]);
    expect(after).toMatchObject({ pet: local.pet, aiLines: true, pos: local.pos, size: "s", frequency: "off" });
  });

  it("apply ignores keys off the allowlist and reports no change when equal", () => {
    const s = fake({ zd_haptics: "off" });
    expect(applyValues(s, { zd_haptics: "off", "zd-ai-byok-v1": "x", "habit.timer": "y" })).toBe(false);
    expect(s.data["zd-ai-byok-v1"]).toBeUndefined();
    expect(s.data["habit.timer"]).toBeUndefined();
    expect(applyValues(s, { zd_haptics: "on" })).toBe(true);
    expect(s.data.zd_haptics).toBe("on");
  });

  it("newest wins both ways", () => {
    const server = { updatedAt: 200, values: {} };
    expect(shouldPull(server, 100)).toBe(true);
    expect(shouldPull(server, 200)).toBe(false);
    expect(shouldPull(server, 300)).toBe(false);
    expect(shouldPull(null, 0)).toBe(false);
  });

  it("detects changes against the last pushed snapshot", () => {
    expect(sameValues({ a: "1" }, { a: "1" })).toBe(true);
    expect(sameValues({ a: "1" }, { a: "2" })).toBe(false);
    expect(sameValues({ a: "1" }, null)).toBe(false);
  });

  it("ignores malformed, oversized and non-allowlisted JSON", () => {
    expect(parseSyncedPrefs("not json")).toBeNull();
    expect(parseSyncedPrefs(null)).toBeNull();
    expect(parseSyncedPrefs("[]")).toBeNull();
    expect(parseSyncedPrefs(JSON.stringify({ updatedAt: "x", values: {} }))).toBeNull();
    expect(parseSyncedPrefs(JSON.stringify({ updatedAt: 1, values: "x" }))).toBeNull();
    expect(parseSyncedPrefs(JSON.stringify({ updatedAt: 1, values: { zd_haptics: "x".repeat(20000) } }))).toBeNull();
    const ok = parseSyncedPrefs(JSON.stringify({ updatedAt: 5, values: { zd_haptics: "off", "zd-ai-byok-v1": "k", "habit-pane-layout": 3 } }));
    expect(ok).toEqual({ updatedAt: 5, values: { zd_haptics: "off" } });
    expect(serializeSyncedPrefs(1, { zd_haptics: "x".repeat(9000) })).toBe("{\"updatedAt\":1,\"values\":{}}");
  });

  it("reload happens once, then the flag stops a loop", () => {
    expect(reloadDecision(false, false)).toEqual({ reload: false, flag: false });
    expect(reloadDecision(true, false)).toEqual({ reload: true, flag: true });
    expect(reloadDecision(true, true)).toEqual({ reload: false, flag: true });
    expect(reloadDecision(false, true)).toEqual({ reload: false, flag: false });
  });
});
