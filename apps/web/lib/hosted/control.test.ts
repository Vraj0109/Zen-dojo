import { createClient } from "@libsql/client";
import { describe, expect, it } from "vitest";
import { getHostedUser, insertHostedUser } from "./control";

describe("hosted control database", () => {
  it("returns null before insert, then the row", async () => {
    const c = createClient({ url: ":memory:" });
    expect(await getHostedUser(c, "u1")).toBeNull();
    await insertHostedUser(c, "u1", "libsql://a.example", new Date("2026-01-02T00:00:00Z"));
    expect(await getHostedUser(c, "u1")).toEqual({ dbUrl: "libsql://a.example", createdAt: "2026-01-02T00:00:00.000Z" });
  });
  it("a double insert is a no-op", async () => {
    const c = createClient({ url: ":memory:" });
    await insertHostedUser(c, "u1", "libsql://first");
    await insertHostedUser(c, "u1", "libsql://second");
    expect((await getHostedUser(c, "u1"))?.dbUrl).toBe("libsql://first");
  });
});
