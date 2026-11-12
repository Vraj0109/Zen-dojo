import { describe, expect, it } from "vitest";
import { anonUserId, isAnonId, needsAnonCookie } from "./gate";

const ID = "3f2b8c1e-9d4a-4e6b-8a1c-0b7d5e2f4a91";

describe("hosted anonymous visitors", () => {
  it("accepts only uuid-shaped ids", () => {
    expect(isAnonId(ID)).toBe(true);
    expect(isAnonId("gh:123")).toBe(false);
    expect(isAnonId("../etc")).toBe(false);
    expect(isAnonId(undefined)).toBe(false);
  });
  it("names the database owner with a prefix an account id can never have", () => {
    expect(anonUserId(ID)).toBe(`anon:${ID}`);
  });
  it("issues an id only to hosted visitors with no session and no valid cookie", () => {
    expect(needsAnonCookie(true, false, undefined)).toBe(true);
    expect(needsAnonCookie(true, false, "bad")).toBe(true);
    expect(needsAnonCookie(true, false, ID)).toBe(false);
    expect(needsAnonCookie(true, true, undefined)).toBe(false);
    expect(needsAnonCookie(false, false, undefined)).toBe(false);
  });
});
