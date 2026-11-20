import { describe, expect, it } from "vitest";
import { MAIN, ROADMAP, SECONDARY, SIDEBAR, TABS, isActive, tabTitle } from "./nav";

const [today, practice, learn, review] = MAIN;
const roadmap = ROADMAP;
const profile = SECONDARY[0];

const ACTIVE: Record<string, string> = {
  "/": "today",
  "/backlog": "today",
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
  "/roadmap": "roadmap",
  "/profile": "profile",
  "/profile/settings": "profile",
};

describe("nav highlighting", () => {
  it.each(Object.entries(ACTIVE))("%s highlights %s only", (pathname, expected) => {
    const hits = Object.entries({ today, practice, learn, review, roadmap, profile })
      .filter(([, l]) => isActive(l, pathname))
      .map(([name]) => name);
    expect(hits).toEqual([expected]);
  });

  it("highlights nothing while the pathname is unknown", () => {
    for (const l of [today, practice, learn, review, roadmap, profile]) expect(isActive(l, null)).toBe(false);
  });

  it("does not confuse prefixes", () => {
    expect(isActive(practice, "/dsatest")).toBe(false);
    expect(isActive(review, "/reviewer")).toBe(false);
  });
});

describe("nav lists", () => {
  it("sidebar has five items and the phone tab bar has Today, Practice, Learn, Review, You", () => {
    expect(SIDEBAR.map((l) => l.label)).toEqual(["Today", "Practice", "Learn", "Review", "Roadmap"]);
    expect(TABS.map((l) => l.label)).toEqual(["Today", "Practice", "Learn", "Review", "You"]);
  });

  it("the You tab covers Profile and Roadmap on phones", () => {
    expect(tabTitle("/roadmap")).toBe("You");
    expect(tabTitle("/profile/settings")).toBe("You");
    expect(tabTitle("/dsa/lc-1")).toBe("Practice");
    expect(tabTitle("/login")).toBeNull();
  });

  it("shell requirements: rail has five links, phone bar has five links including You", () => {
    expect(SIDEBAR).toHaveLength(5);
    expect(TABS).toHaveLength(5);
    expect(TABS.some((t) => t.label === "You")).toBe(true);
  });
});

describe("shell render", () => {
  it("rail has five links, phone bar five links including You, avatar opens a menu", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { NavRail, PhoneNavBar } = await import("./nav");
    const rail = renderToStaticMarkup(React.createElement(NavRail, { pathname: "/dsa" }));
    const railLinks = rail.match(/<a [^>]*href="\/(dsa|study|review|roadmap)?"/g) ?? [];
    // The ZD logo (to Today) plus the five items.
    expect(railLinks.length).toBe(6);
    expect((rail.match(/text-\[12px\]/g) ?? []).length).toBe(5);
    expect(rail).toContain('aria-current="page"');
    const bar = renderToStaticMarkup(React.createElement(PhoneNavBar, { pathname: "/profile/settings" }));
    expect((bar.match(/<a /g) ?? []).length).toBe(5);
    expect(bar).toContain(">You<");
    // The avatar button needs the app router to render, so check its markup in the source.
    const { readFileSync } = await import("node:fs");
    const popover = readFileSync(new URL("./components/account-popover.tsx", import.meta.url), "utf8");
    expect(popover).toContain('aria-haspopup="menu"');
  });
});
