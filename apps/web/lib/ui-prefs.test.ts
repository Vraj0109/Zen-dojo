import { beforeEach, describe, expect, it } from "vitest";
import { getAiSettings, getAppearanceSetting, getBuddySettings, getSimpleMode, setAiSettings, setAppearanceSetting, setBuddySettings, setSimpleMode } from "./ui-prefs";
import { DEFAULT_APPEARANCE, type Appearance } from "./theme";

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
});

describe("simple mode", () => {
  it("is on by default", async () => {
    expect(await getSimpleMode()).toBe(true);
  });

  it("can be switched off and on again, and the choice persists", async () => {
    await setSimpleMode(false);
    expect(await getSimpleMode()).toBe(false);
    await setSimpleMode(false); // setting the same value twice is fine
    expect(await getSimpleMode()).toBe(false);
    await setSimpleMode(true);
    expect(await getSimpleMode()).toBe(true);
  });
});

describe("appearance setting", () => {
  it("returns null when no appearance preference is saved", async () => {
    expect(await getAppearanceSetting()).toBeNull();
  });

  it("saves and retrieves appearance preferences", async () => {
    const prefs: Appearance = {
      mode: "dark",
      accent: "violet",
      style: "terminal",
      font: "lexend",
      gamify: true,
      bionic: "subtle",
      motion: "off",
    };
    await setAppearanceSetting(prefs);
    expect(await getAppearanceSetting()).toEqual(prefs);

    // Overwriting updates the persisted preference
    const updated: Appearance = {
      ...prefs,
      accent: "rose",
      gamify: false,
    };
    await setAppearanceSetting(updated);
    expect(await getAppearanceSetting()).toEqual(updated);
  });

  it("sanitizes invalid or partial values to defaults", async () => {
    // If somehow corrupted or partial, it parses safely
    await setAppearanceSetting({ ...DEFAULT_APPEARANCE, mode: "invalid" as unknown as "dark" });
    const res = await getAppearanceSetting();
    expect(res?.mode).toBe("system");
  });
});

describe("buddy and pacing settings", () => {
  it("defaults to mode off, name Buddy, pacing gentle", async () => {
    const s = await getBuddySettings();
    expect(s.mode).toBe("off");
    expect(s.name).toBe("Buddy");
    expect(s.pacing).toBe("gentle");
  });

  it("persists buddy mode, custom name, and pacing", async () => {
    await setBuddySettings({ mode: "coach", name: "Sensei Kai", pacing: "standard" });
    let s = await getBuddySettings();
    expect(s.mode).toBe("coach");
    expect(s.name).toBe("Sensei Kai");
    expect(s.pacing).toBe("standard");

    await setBuddySettings({ mode: "peer" });
    s = await getBuddySettings();
    expect(s.mode).toBe("peer");
    expect(s.name).toBe("Sensei Kai");
  });
});

describe("local AI settings", () => {
  it("is off by default with the loopback URL", async () => {
    expect(await getAiSettings()).toEqual({ enabled: false, model: "", url: "http://127.0.0.1:11434" });
  });
  it("persists the switch and a valid model, and ignores a bad model name", async () => {
    await setAiSettings({ enabled: true, model: "llama3.2:3b" });
    await setAiSettings({ model: "bad name;" });
    expect(await getAiSettings()).toMatchObject({ enabled: true, model: "llama3.2:3b" });
  });
});
