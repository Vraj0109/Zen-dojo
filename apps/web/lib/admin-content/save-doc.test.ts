import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mintAdminProof } from "../auth/admin-proof";
import { fetchWithAccessToken } from "../auth/session";
import type { ContentDb } from "../content-db/client";
import { listAudit } from "../content-db/audit";
import { loadDoc } from "../content-db/load";
import { makeDb } from "../content-sync/test-helpers";
import { cleanSaveNote, saveDoc } from "./write";

// saveDoc (lead, round B): hosted write with audit and conflict check, desktop forwarding, and the save note rules.
const hoisted = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("../content-db/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../content-db/client")>()),
  getContentWriteDb: vi.fn(async () => hoisted.db),
  getContentDb: vi.fn(async () => hoisted.db),
}));
vi.mock("../content-repo/invalidate", () => ({ contentTagsFor: () => ["content"], expireContentTagsInAction: () => ["content"] }));
vi.mock("../auth/session", () => ({ fetchWithAccessToken: vi.fn() }));
vi.mock("../content-sync/sync", () => ({ syncContent: vi.fn(async () => ({})) }));

const proof = mintAdminProof("owner-1", "Owner");
const doc = (body: unknown) => ({ row: { kind: "reading", id: "main", body } });
let db: ContentDb;

beforeEach(async () => {
  delete process.env.HABIT_DESKTOP;
  db = await makeDb();
  hoisted.db = db;
});
afterEach(() => vi.mocked(fetchWithAccessToken).mockReset());

describe("saveDoc", () => {
  it("saves on the hosted site with one audit row, and a stale baseRev is a conflict", async () => {
    const first = await saveDoc(proof, doc([{ title: "A" }]), null);
    expect(first).toMatchObject({ ok: true, changed: true });
    expect((await loadDoc(db, "reading", "main"))?.row.body).toEqual([{ title: "A" }]);
    expect((await listAudit(db, { entity: "doc", limit: 10 })).length).toBe(1);
    const stale = await saveDoc(proof, doc([{ title: "B" }]), "not-the-current-rev");
    expect(stale).toMatchObject({ ok: false, conflict: true });
  });

  it("refuses an unknown kind", async () => {
    const r = await saveDoc(proof, { row: { kind: "nope", id: "x", body: 1 } }, null);
    expect(r).toMatchObject({ ok: false });
  });

  it("on desktop it forwards to the hosted admin API and does not write locally", async () => {
    process.env.HABIT_DESKTOP = "1";
    vi.mocked(fetchWithAccessToken).mockResolvedValue(Response.json({ ok: true, rev: "r1", version: 9 }));
    const r = await saveDoc(proof, doc([{ title: "A" }]), null, { note: "New link", notify: true });
    expect(r).toMatchObject({ ok: true, rev: "r1", version: 9 });
    const [url, init] = vi.mocked(fetchWithAccessToken).mock.calls[0];
    expect(String(url)).toMatch(/\/api\/admin\/content\/docs\/reading\/main$/);
    expect(JSON.parse(String(init?.body))).toMatchObject({ note: "New link", notify: true });
    expect(await loadDoc(db, "reading", "main")).toBeNull();
  });

  it("a notice needs a note of 1 to 140 characters", () => {
    expect(cleanSaveNote({ notify: true })).toHaveProperty("error");
    expect(cleanSaveNote({ note: "x".repeat(141) })).toHaveProperty("error");
    expect(cleanSaveNote({ note: "  Fixed hint 2 ", notify: true })).toEqual({ note: "Fixed hint 2", notify: true });
    expect(cleanSaveNote({})).toEqual({ note: null, notify: false });
  });
});
