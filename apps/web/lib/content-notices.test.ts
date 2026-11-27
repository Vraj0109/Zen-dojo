import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Notice } from "@habit/shared";
import { getDb } from "./db";
import {
  getRecentNoticesForSection,
  getUnreadNoticeCount,
  listNotices,
  listUnreadNotices,
  markAllNoticesRead,
  markNoticeRead,
  markNoticesForEntityRead,
  MAX_NOTICES_KEPT,
  recordNotices,
} from "./content-notices";

describe("content-notices store and query", () => {
  beforeEach(() => {
    process.env.DATABASE_URL = ":memory:";
    delete (globalThis as { habitDb?: unknown }).habitDb;
  });

  afterEach(() => {
    delete (globalThis as { habitDb?: unknown }).habitDb;
  });

  it("records notices, lists them, and tracks unread count", async () => {
    const db = await getDb();
    expect(await getUnreadNoticeCount(db)).toBe(0);

    const testNotices: Notice[] = [
      {
        id: 101,
        unit: "course:system-design",
        unitTitle: "System Design",
        entity: "lesson",
        entityId: "caching-patterns",
        title: "Caching Patterns",
        sectionId: "write-through",
        note: "Added new diagram on write-through caching",
        at: 1000,
      },
      {
        id: 102,
        unit: "problems:two-pointers",
        unitTitle: "Two Pointers",
        entity: "problem",
        entityId: "3sum",
        title: "3Sum",
        sectionId: null,
        note: "Added Python optimal solution",
        at: 2000,
      },
    ];

    const inserted = await recordNotices(testNotices, db);
    expect(inserted).toBe(2);
    expect(await getUnreadNoticeCount(db)).toBe(2);

    const list = await listNotices(undefined, db);
    expect(list).toHaveLength(2);
    // Ordered by at desc:
    expect(list[0].id).toBe(102);
    expect(list[0].title).toBe("3Sum");
    expect(list[0].readAt).toBeNull();
    expect(list[1].id).toBe(101);

    // Mark single notice read
    await markNoticeRead(102, db);
    expect(await getUnreadNoticeCount(db)).toBe(1);

    const unread = await listUnreadNotices(db);
    expect(unread).toHaveLength(1);
    expect(unread[0].id).toBe(101);

    // Mark all read
    await markAllNoticesRead(db);
    expect(await getUnreadNoticeCount(db)).toBe(0);
  });

  it("handles notice with id=0 (such as refreshNotice) by allocating an id", async () => {
    const db = await getDb();
    const notice: Notice = {
      id: 0,
      unit: "all",
      unitTitle: "All content",
      entity: "course",
      entityId: "",
      title: "Content was refreshed",
      sectionId: null,
      note: "The whole content was downloaded again.",
      at: 5000,
    };

    await recordNotices([notice], db);
    const list = await listNotices(undefined, db);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBeGreaterThan(0);
    expect(list[0].title).toBe("Content was refreshed");
  });

  it("caps notices at MAX_NOTICES_KEPT (200)", async () => {
    const db = await getDb();
    const many: Notice[] = [];
    for (let i = 1; i <= 250; i++) {
      many.push({
        id: i,
        unit: "course:test",
        unitTitle: "Test Course",
        entity: "lesson",
        entityId: `l-${i}`,
        title: `Lesson ${i}`,
        sectionId: null,
        note: `Note ${i}`,
        at: i * 10,
      });
    }

    await recordNotices(many, db);
    const list = await listNotices(undefined, db);
    expect(list).toHaveLength(MAX_NOTICES_KEPT);
    // Oldest 50 were pruned, so newest (id: 250 down to 51) are kept
    expect(list[0].id).toBe(250);
    expect(list[list.length - 1].id).toBe(51);
  });

  it("marks notices for entity and section as read", async () => {
    const db = await getDb();
    await recordNotices(
      [
        {
          id: 1,
          unit: "course:system-design",
          unitTitle: "System Design",
          entity: "lesson",
          entityId: "caching",
          title: "Caching",
          sectionId: "s-1",
          note: "Updated section 1",
          at: 1000,
        },
        {
          id: 2,
          unit: "course:system-design",
          unitTitle: "System Design",
          entity: "lesson",
          entityId: "caching",
          title: "Caching",
          sectionId: "s-2",
          note: "Updated section 2",
          at: 2000,
        },
      ],
      db,
    );

    await markNoticesForEntityRead("lesson", "caching", "s-1", db);
    const unread = await listUnreadNotices(db);
    expect(unread).toHaveLength(1);
    expect(unread[0].id).toBe(2);

    await markNoticesForEntityRead("lesson", "caching", null, db);
    expect(await getUnreadNoticeCount(db)).toBe(0);
  });

  it("finds recent notices for section pill", async () => {
    const db = await getDb();
    const now = Date.now();
    await recordNotices(
      [
        {
          id: 10,
          unit: "course:sys",
          unitTitle: "Sys",
          entity: "lesson",
          entityId: "sharding",
          title: "Sharding",
          sectionId: "s-keys",
          note: "New hint",
          at: now - 1000,
        },
      ],
      db,
    );

    const recent = await getRecentNoticesForSection("lesson", "sharding", 7, db);
    expect(recent).toHaveLength(1);
    expect(recent[0].sectionId).toBe("s-keys");
  });
});
