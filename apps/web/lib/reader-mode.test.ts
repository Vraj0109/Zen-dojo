import { describe, expect, it } from "vitest";
import { READER_COOKIE, parseReaderCookie, readerCookieValue } from "./reader-mode";

describe("reader mode cookie", () => {
  it("is off by default", () => {
    expect(parseReaderCookie(undefined)).toBe(false);
    expect(parseReaderCookie(null)).toBe(false);
    expect(parseReaderCookie("")).toBe(false);
  });
  it("is on only for 1", () => {
    expect(parseReaderCookie("1")).toBe(true);
    expect(parseReaderCookie("0")).toBe(false);
    expect(parseReaderCookie("true")).toBe(false);
  });
  it("toggles: on stores 1, off removes the cookie", () => {
    expect(readerCookieValue(true)).toBe("1");
    expect(readerCookieValue(false)).toBeNull();
    expect(parseReaderCookie(readerCookieValue(true))).toBe(true);
    expect(parseReaderCookie(readerCookieValue(false))).toBe(false);
  });
  it("uses the documented cookie name", () => {
    expect(READER_COOKIE).toBe("zd_reader");
  });
});
