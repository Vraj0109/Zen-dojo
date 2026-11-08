import { describe, expect, it } from "vitest";
import { isActive } from "./nav";

const today = { href: "/", matches: [] };
const practice = { href: "/dsa", matches: ["/dsa"] };
const learn = { href: "/study", matches: ["/study"] };
const review = { href: "/review", matches: ["/review", "/revise"] };
const profile = { href: "/profile", matches: ["/profile", "/roadmap"] };

const ACTIVE: Record<string, string> = {
  "/": "today",
  "/dsa": "practice",
  "/dsa/boss": "practice",
  "/dsa/pattern/hash-map": "practice",
  "/dsa/lc-1": "practice",
  "/study": "learn",
  "/study/sd": "learn",
  "/study/lld/lldp-parking-lot": "learn",
  "/study/reading": "learn",
  "/study/diagrams": "learn",
  "/review": "review",
  "/revise": "review",
  "/profile": "profile",
  "/profile/settings": "profile",
  "/roadmap": "profile",
};

describe("nav highlighting", () => {
  it.each(Object.entries(ACTIVE))("%s highlights %s only", (pathname, expected) => {
    const hits = Object.entries({ today, practice, learn, review, profile })
      .filter(([, l]) => isActive(l, pathname))
      .map(([name]) => name);
    expect(hits).toEqual([expected]);
  });

  it("highlights nothing while the pathname is unknown", () => {
    for (const l of [today, practice, learn, review, profile]) expect(isActive(l, null)).toBe(false);
  });

  it("does not confuse prefixes", () => {
    expect(isActive(practice, "/dsatest")).toBe(false);
    expect(isActive(review, "/reviewer")).toBe(false);
  });
});
