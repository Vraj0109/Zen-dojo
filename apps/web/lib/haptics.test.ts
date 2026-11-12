import { afterEach, describe, expect, it, vi } from "vitest";
import { HAPTICS_KEY, hapticsEnabled, setHapticsEnabled, tick } from "./haptics";

function stubBrowser(opts: { off?: boolean; reduce?: boolean; vibrate?: boolean }) {
  const store: Record<string, string> = opts.off ? { [HAPTICS_KEY]: "off" } : {};
  const vibrate = vi.fn();
  vi.stubGlobal("window", {
    localStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => void (store[k] = v) },
    matchMedia: () => ({ matches: Boolean(opts.reduce) }),
  });
  vi.stubGlobal("navigator", opts.vibrate === false ? {} : { vibrate });
  return { vibrate, store };
}

describe("haptics", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("vibrates once per tick when supported and on", () => {
    const { vibrate } = stubBrowser({});
    tick(8);
    expect(vibrate).toHaveBeenCalledWith(8);
  });

  it("does nothing when turned off or when reduced motion is preferred", () => {
    const a = stubBrowser({ off: true });
    tick();
    expect(a.vibrate).not.toHaveBeenCalled();
    const b = stubBrowser({ reduce: true });
    tick();
    expect(b.vibrate).not.toHaveBeenCalled();
    expect(hapticsEnabled()).toBe(false);
  });

  it("remembers the choice", () => {
    const { store } = stubBrowser({});
    setHapticsEnabled(false);
    expect(store[HAPTICS_KEY]).toBe("off");
    expect(hapticsEnabled()).toBe(false);
    setHapticsEnabled(true);
    expect(hapticsEnabled()).toBe(true);
  });

  it("never throws where storage or vibration is missing", () => {
    vi.stubGlobal("window", { get localStorage(): never { throw new Error("blocked"); } });
    expect(() => tick()).not.toThrow();
  });
});
