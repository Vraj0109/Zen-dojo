import { describe, expect, it } from "vitest";
import { matchSettings, type SettingsCategory, type SettingsEntry } from "./settings-search";

const cats: SettingsCategory[] = [
  { id: "appearance", title: "Appearance and reading" },
  { id: "backup", title: "Backup and restore" },
];
const entries: SettingsEntry[] = [
  { id: "theme", title: "Theme", category: "appearance", description: "Light or dark.", keywords: ["dark mode", "font"] },
  { id: "dl", title: "Download a backup", category: "backup", description: "One JSON file.", keywords: ["export", "delete data"] },
];

describe("matchSettings", () => {
  it("returns everything for an empty query", () => {
    expect(matchSettings(entries, cats, "  ")).toEqual(["theme", "dl"]);
  });
  it("matches keywords case-insensitively", () => {
    expect(matchSettings(entries, cats, "DARK Mode")).toEqual(["theme"]);
  });
  it("matches the category name", () => {
    expect(matchSettings(entries, cats, "restore")).toEqual(["dl"]);
  });
  it("requires every word to match", () => {
    expect(matchSettings(entries, cats, "theme backup")).toEqual([]);
    expect(matchSettings(entries, cats, "theme reading")).toEqual(["theme"]);
  });
  it("matches descriptions", () => {
    expect(matchSettings(entries, cats, "json")).toEqual(["dl"]);
  });
});
