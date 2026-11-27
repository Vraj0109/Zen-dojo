import { describe, expect, it, vi } from "vitest";
import { maybeShowNotification } from "./notify.js";

describe("maybeShowNotification", () => {
  it("does not show notification when setting is disabled", () => {
    const showMock = vi.fn();
    class MockNotification {
      show = showMock;
    }

    const shown = maybeShowNotification({
      enabled: false,
      summary: "1 update in courses you follow",
      NotificationClass: MockNotification as any,
    });

    expect(shown).toBe(false);
    expect(showMock).not.toHaveBeenCalled();
  });

  it("does not show notification when there are zero notices and no summary", () => {
    const showMock = vi.fn();
    class MockNotification {
      show = showMock;
    }

    const shown = maybeShowNotification({
      enabled: true,
      summary: "",
      count: 0,
      NotificationClass: MockNotification as any,
    });

    expect(shown).toBe(false);
    expect(showMock).not.toHaveBeenCalled();
  });

  it("shows notification with summary when enabled", () => {
    const showMock = vi.fn();
    let constructedOpts: any = null;
    let clickHandler: any = null;

    class MockNotification {
      constructor(opts: any) {
        constructedOpts = opts;
      }
      show = showMock;
      on(event: string, handler: any) {
        if (event === "click") clickHandler = handler;
      }
    }

    const onClick = vi.fn();
    const shown = maybeShowNotification({
      enabled: true,
      summary: "Caching: new diagram in Write-through vs write-back",
      NotificationClass: MockNotification as any,
      onClick,
    });

    expect(shown).toBe(true);
    expect(showMock).toHaveBeenCalledTimes(1);
    expect(constructedOpts).toEqual({
      title: "Zen Dojo",
      body: "Caching: new diagram in Write-through vs write-back",
    });

    // Verify click handler is hooked up
    expect(clickHandler).toBeDefined();
    clickHandler();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("derives summary line from count if summary is not provided", () => {
    const showMock = vi.fn();
    let constructedOpts: any = null;

    class MockNotification {
      constructor(opts: any) {
        constructedOpts = opts;
      }
      show = showMock;
    }

    const shown = maybeShowNotification({
      enabled: true,
      count: 3,
      NotificationClass: MockNotification as any,
    });

    expect(shown).toBe(true);
    expect(constructedOpts?.body).toBe("3 updates in courses you follow");
  });
});
