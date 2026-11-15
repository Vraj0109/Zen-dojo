import { describe, expect, it } from "vitest";
import {
  SYNCED_PREF_KEYS,
  SYNCED_PREFS_SETTING_KEY,
  applyValues,
  buildSnapshot,
  dirtyValues,
  mergeSyncedPrefs,
  planPull,
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
    const s = fake({ zd_haptics: "off", "habit-pane-layout": "[1,2]", "habit-judge-lang": "py", "habit.timer": "{}", "zd-ai-byok-v1": "secret", "zen-dojo:project:x": "code", tools_notice_dismissed: "1" });
    expect(buildSnapshot(s)).toEqual({ "habit-judge-lang": "py" });
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
    const s = fake({ "habit-judge-lang": "off" });
    expect(applyValues(s, { "habit-judge-lang": "off", "zd-ai-byok-v1": "x", "habit.timer": "y" })).toBe(false);
    expect(s.data["zd-ai-byok-v1"]).toBeUndefined();
    expect(s.data["habit.timer"]).toBeUndefined();
    expect(applyValues(s, { "habit-judge-lang": "on" })).toBe(true);
    expect(s.data["habit-judge-lang"]).toBe("on");
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
    expect(parseSyncedPrefs(JSON.stringify({ updatedAt: 1, values: { "habit-judge-lang": "x".repeat(20000) } }))).toBeNull();
    const ok = parseSyncedPrefs(JSON.stringify({ updatedAt: 5, values: { "habit-judge-lang": "off", "zd-ai-byok-v1": "k", "habit-pane-layout": 3 } }));
    expect(ok).toEqual({ updatedAt: 5, values: { "habit-judge-lang": "off" } });
    expect(serializeSyncedPrefs(1, { "habit-judge-lang": "x".repeat(9000) })).toBe("{\"updatedAt\":1,\"values\":{}}");
  });

  it("reload happens once, then the flag stops a loop", () => {
    expect(reloadDecision(false, false)).toEqual({ reload: false, flag: false });
    expect(reloadDecision(true, false)).toEqual({ reload: true, flag: true });
    expect(reloadDecision(true, true)).toEqual({ reload: false, flag: true });
    expect(reloadDecision(false, true)).toEqual({ reload: false, flag: false });
  });
});

describe("synced prefs, plan 0075", () => {
  it("haptics, pane layout and the custom theme are per device now", () => {
    const s = fake({ zd_haptics: "off", "habit-pane-layout": "[1,2]", "habit-custom-theme": "{}" });
    expect(buildSnapshot(s)).toEqual({});
    for (const k of ["zd_haptics", "habit-pane-layout", "habit-custom-theme"]) expect(SYNCED_PREF_KEYS).not.toContain(k);
  });

  it("device B with a clock 10 minutes behind still receives A's change, and A receives B's", () => {
    const tA = 1_000_000_000;
    const tB = tA - 10 * 60_000;
    // A pushed at tA; B last synced with A's older stamp.
    const server = parseSyncedPrefs(serializeSyncedPrefs(tA, { "habit-judge-lang": "py" }, { "habit-judge-lang": tA }))!;
    const knownB = { "habit-judge-lang": { v: "cpp", s: tA - 1 } };
    const planB = planPull(server, knownB, { "habit-judge-lang": "cpp" });
    expect(planB.apply).toEqual({ "habit-judge-lang": "py" });
    // B then changes the language with its own (earlier) clock; A, which knows tA, still takes it.
    const fromB = parseSyncedPrefs(serializeSyncedPrefs(tB + 5, { "habit-judge-lang": "java" }, { "habit-judge-lang": tB + 5 }))!;
    const merged = mergeSyncedPrefs(server, fromB);
    const planA = planPull(merged, { "habit-judge-lang": { v: "py", s: tA } }, { "habit-judge-lang": "py" });
    expect(planA.apply).toEqual({ "habit-judge-lang": "java" });
  });

  it("a partial snapshot does not delete other keys", () => {
    const stored = parseSyncedPrefs(serializeSyncedPrefs(10, { "habit-judge-lang": "py", "zen-dojo.solution-lang": "java" }))!;
    const incoming = parseSyncedPrefs(serializeSyncedPrefs(20, { "habit-judge-lang": "cpp" }, { "habit-judge-lang": 20 }))!;
    const merged = mergeSyncedPrefs(stored, incoming);
    expect(merged.values).toEqual({ "habit-judge-lang": "cpp", "zen-dojo.solution-lang": "java" });
    expect(merged.stamps).toEqual({ "habit-judge-lang": 20, "zen-dojo.solution-lang": 10 });
  });

  it("a local change not pushed yet is kept, and only changed keys are pushed", () => {
    const server = parseSyncedPrefs(serializeSyncedPrefs(50, { "habit-judge-lang": "py" }, { "habit-judge-lang": 50 }))!;
    const known = { "habit-judge-lang": { v: "cpp", s: 40 }, "zen-dojo.solution-lang": { v: "java", s: 40 } };
    expect(planPull(server, known, { "habit-judge-lang": "js" }).apply).toEqual({});
    expect(dirtyValues({ "habit-judge-lang": "js", "zen-dojo.solution-lang": "java" }, known)).toEqual({ "habit-judge-lang": "js" });
  });

  it("an unchanged stamp is not applied again; old blobs without stamps still read", () => {
    const old = parseSyncedPrefs(JSON.stringify({ updatedAt: 7, values: { "habit-judge-lang": "py" } }))!;
    expect(planPull(old, { "habit-judge-lang": { v: "py", s: 7 } }, { "habit-judge-lang": "py" }).apply).toEqual({});
    expect(planPull(old, {}, {}).apply).toEqual({ "habit-judge-lang": "py" });
  });
});
