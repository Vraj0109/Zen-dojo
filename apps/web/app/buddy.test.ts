import { beforeEach, describe, expect, it } from "vitest";
import { getBuddySettings, setBuddySettings } from "@/lib/ui-prefs";
import { getPostSessionCelebration, getStartCheckIn } from "@habit/shared";
import { getZenMode, setZenMode, toggleZenMode } from "@/lib/zen-mode";

beforeEach(() => {
  process.env.DATABASE_URL = ":memory:";
  delete (globalThis as { habitDb?: unknown }).habitDb;
  setZenMode(false);
  try {
    localStorage.clear();
  } catch {
    // Ignore in non-dom tests
  }
});

describe("buddy preference persistence in web app", () => {
  it("defaults to opt-in off mode with gentle pacing", async () => {
    const settings = await getBuddySettings();
    expect(settings.mode).toBe("off");
    expect(settings.pacing).toBe("gentle");
    expect(settings.name).toBe("Buddy");
  });

  it("persists coach persona and custom buddy name", async () => {
    await setBuddySettings({ mode: "coach", name: "Sensei Lin" });
    const settings = await getBuddySettings();
    expect(settings.mode).toBe("coach");
    expect(settings.name).toBe("Sensei Lin");

    // Check dialogue using the saved settings
    const greeting = getStartCheckIn("coach", settings.name);
    expect(greeting).toContain("Sensei Lin:");
    expect(greeting).toContain("lock in");

    const celebration = getPostSessionCelebration("coach", true, settings.name);
    expect(celebration).toContain("Sensei Lin:");
    expect(celebration).toContain("Target achieved");
  });
});

describe("zen mode state manager", () => {
  it("defaults to false and toggles cleanly", () => {
    setZenMode(false);
    expect(getZenMode()).toBe(false);

    toggleZenMode();
    expect(getZenMode()).toBe(true);

    toggleZenMode();
    expect(getZenMode()).toBe(false);
  });
});
