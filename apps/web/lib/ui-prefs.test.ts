import { beforeEach, describe, expect, it } from "vitest";
import { getSimpleMode, setSimpleMode } from "./ui-prefs";

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
