import { describe, expect, it } from "vitest";
import { isPublicHostedPath, shouldRedirectToWelcome } from "./gate";

describe("hosted gate", () => {
  it("lets /welcome and /auth/* through, blocks pages", () => {
    expect(isPublicHostedPath("/welcome")).toBe(true);
    expect(isPublicHostedPath("/auth/start")).toBe(true);
    expect(isPublicHostedPath("/dsa")).toBe(false);
    expect(isPublicHostedPath("/authors")).toBe(false);
  });
  it("redirects only hosted, signed-out, non-public requests", () => {
    expect(shouldRedirectToWelcome(true, "/", false)).toBe(true);
    expect(shouldRedirectToWelcome(true, "/", true)).toBe(false);
    expect(shouldRedirectToWelcome(false, "/", false)).toBe(false);
    expect(shouldRedirectToWelcome(true, "/welcome", false)).toBe(false);
  });
});
