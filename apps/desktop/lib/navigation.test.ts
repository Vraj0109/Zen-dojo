import { describe, expect, it } from "vitest";
import { appCommandAction, swipeAction, withFeature } from "./navigation.js";

describe("back and forward gestures", () => {
  it("maps a macOS swipe to back or forward", () => {
    expect(swipeAction("left")).toBe("back");
    expect(swipeAction("right")).toBe("forward");
    expect(swipeAction("up")).toBeNull();
  });

  it("maps Windows app commands (mouse side buttons, browser keys)", () => {
    expect(appCommandAction("browser-backward")).toBe("back");
    expect(appCommandAction("browser-forward")).toBe("forward");
    expect(appCommandAction("media-play")).toBeNull();
  });

  it("adds the overscroll feature once and keeps other enabled features", () => {
    expect(withFeature(undefined)).toBe("OverscrollHistoryNavigation");
    expect(withFeature("A,B")).toBe("A,B,OverscrollHistoryNavigation");
    expect(withFeature("A,OverscrollHistoryNavigation")).toBe("A,OverscrollHistoryNavigation");
  });
});
