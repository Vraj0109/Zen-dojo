import { beforeEach, describe, expect, it, vi } from "vitest";
import { BYOK_STORAGE_KEY, byokHeaders, currentByokHeaders, forgetByok, loadByok, parseByok, saveByok } from "./ai-key-store";

const KEY = "AIza-fake-key-1234567890";

function stubWindow(store: Record<string, string>, throws = false) {
  const ls = {
    getItem: (k: string) => {
      if (throws) throw new Error("blocked");
      return k in store ? store[k]! : null;
    },
    setItem: (k: string, v: string) => {
      if (throws) throw new Error("blocked");
      store[k] = v;
    },
    removeItem: (k: string) => {
      if (throws) throw new Error("blocked");
      delete store[k];
    },
  };
  vi.stubGlobal("window", { localStorage: ls, dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal("Event", class {
    constructor(public type: string) {}
  });
}

beforeEach(() => vi.unstubAllGlobals());

describe("ai-key-store", () => {
  it("saves to localStorage only, loads, builds headers and forgets", () => {
    const store: Record<string, string> = {};
    stubWindow(store);
    expect(saveByok({ provider: "gemini", key: ` ${KEY} `, model: "" })).toBe(true);
    expect(Object.keys(store)).toEqual([BYOK_STORAGE_KEY]);
    expect(loadByok()).toEqual({ provider: "gemini", key: KEY, model: "" });
    expect(currentByokHeaders()).toEqual({ "x-ai-provider": "gemini", "x-ai-key": KEY });
    forgetByok();
    expect(loadByok()).toBeNull();
    expect(store).toEqual({});
  });
  it("rejects bad input and survives blocked storage", () => {
    stubWindow({});
    expect(saveByok({ provider: "openai", key: "no spaces allowed here", model: "" })).toBe(false);
    expect(saveByok({ provider: "openai", key: KEY, model: "bad model!" })).toBe(false);
    stubWindow({}, true);
    expect(saveByok({ provider: "openai", key: KEY, model: "" })).toBe(false);
    expect(loadByok()).toBeNull();
    expect(() => forgetByok()).not.toThrow();
  });
  it("parse is strict and headers are empty without a key", () => {
    expect(parseByok("not json")).toBeNull();
    expect(parseByok(JSON.stringify({ provider: "x", key: KEY }))).toBeNull();
    expect(byokHeaders(null)).toEqual({});
    expect(byokHeaders({ provider: "openai", key: KEY, model: "m" })["x-ai-model"]).toBe("m");
  });
});
