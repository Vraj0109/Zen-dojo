import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "./db";
import { getAppearanceRecord, parseAppearanceRecord } from "./ui-prefs";
import { getAiSettings, getAppearanceSetting, getBuddySettings, getGgufFolders, getGgufImports, getSimpleMode, recordGgufImport, setAiSettings, setGgufFolders, setAppearanceSetting, setBuddySettings, setSimpleMode } from "./ui-prefs";
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

describe("appearance record (plan 0075)", () => {
  const client = async () => (await getDb()).$client;
  const stamp = async () => {
    const r = await (await client()).execute("SELECT updated_at FROM sync_stamps WHERE tbl = 'settings' AND row_key = 'appearance_prefs'");
    return r.rows[0]?.[0] ?? null;
  };
  const dark: Appearance = { ...DEFAULT_APPEARANCE, mode: "dark" };

  it("still reads the old plain format, with at 0", async () => {
    await (await client()).execute({ sql: "INSERT INTO settings (key, value) VALUES ('appearance_prefs', ?)", args: [JSON.stringify(dark)] });
    expect(await getAppearanceRecord()).toEqual({ prefs: dark, at: 0 });
    expect(parseAppearanceRecord("not json")).toBeNull();
  });

  it("round trips the new record with its time and custom theme", async () => {
    const prefs: Appearance = { ...dark, style: "paper", customTheme: JSON.stringify({ accent: "#123456" }) };
    expect(await setAppearanceSetting(prefs, 1234)).toBe(true);
    expect(await getAppearanceRecord()).toEqual({ prefs, at: 1234 });
  });

  it("an identical write does not touch the row or its sync stamp", async () => {
    await setAppearanceSetting(dark, 1000);
    const before = await stamp();
    expect(before).not.toBeNull();
    await new Promise((r) => setTimeout(r, 5));
    expect(await setAppearanceSetting(dark, 5000)).toBe(false);
    expect(await stamp()).toBe(before);
    expect((await getAppearanceRecord())?.at).toBe(1000);
  });

  it("an older write never replaces a newer record", async () => {
    await setAppearanceSetting(dark, 2000);
    expect(await setAppearanceSetting({ ...dark, mode: "light" }, 1000)).toBe(false);
    expect((await getAppearanceRecord())?.prefs.mode).toBe("dark");
  });

  it("sanitises an invalid value inside the record", async () => {
    await (await client()).execute({ sql: "INSERT INTO settings (key, value) VALUES ('appearance_prefs', ?)", args: [JSON.stringify({ v: 1, at: 9, prefs: { mode: "neon", customTheme: "[1]" } })] });
    expect(await getAppearanceRecord()).toEqual({ prefs: { ...DEFAULT_APPEARANCE, customTheme: null }, at: 9 });
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
    expect(await getAiSettings()).toEqual({
      enabled: false,
      model: "",
      url: "http://127.0.0.1:11434",
      provider: "ollama",
      consent: [],
      foldSystem: false,
    });
  });
  it("round trips the fold setting (plan 0078)", async () => {
    await setAiSettings({ foldSystem: true });
    expect((await getAiSettings()).foldSystem).toBe(true);
    await setAiSettings({ foldSystem: false });
    expect((await getAiSettings()).foldSystem).toBe(false);
  });
  it("reads a saved legacy lmstudio provider as ollama (plan 0082)", async () => {
    const { settings } = await import("./schema");
    const db = await getDb();
    await db.insert(settings).values({ key: "ai_provider", value: "lmstudio" }).onConflictDoUpdate({ target: settings.key, set: { value: "lmstudio" } });
    expect((await getAiSettings()).provider).toBe("ollama");
  });
  it("stores GGUF folders and imports (plan 0082)", async () => {
    expect(await getGgufFolders()).toBeNull();
    await setGgufFolders(["/a", "/b", "/a", ""]);
    expect(await getGgufFolders()).toEqual(["/a", "/b"]);
    await setGgufFolders(Array.from({ length: 15 }, (_, i) => `/f${i}`));
    expect(await getGgufFolders()).toHaveLength(10);
    await setGgufFolders([]);
    expect(await getGgufFolders()).toEqual([]);
    expect(await getGgufImports()).toEqual({});
    await recordGgufImport("/a/x.gguf", "my-model");
    await recordGgufImport("/a/y.gguf", "other");
    expect(await getGgufImports()).toEqual({ "/a/x.gguf": "my-model", "/a/y.gguf": "other" });
  });
  it("saves the provider and consent list, and ignores unknown ids", async () => {
    await setAiSettings({ provider: "claude", consent: ["claude", "agy", "claude", "bogus" as never] });
    expect(await getAiSettings()).toMatchObject({ provider: "claude", consent: ["claude", "agy"] });
    await setAiSettings({ provider: "evil" as never });
    expect((await getAiSettings()).provider).toBe("claude");
    await setAiSettings({ consent: [] });
    expect((await getAiSettings()).consent).toEqual([]);
  });
  it("persists the switch and a valid model, and ignores a bad model name", async () => {
    await setAiSettings({ enabled: true, model: "llama3.2:3b" });
    await setAiSettings({ model: "bad name;" });
    expect(await getAiSettings()).toMatchObject({ enabled: true, model: "llama3.2:3b" });
  });
});
