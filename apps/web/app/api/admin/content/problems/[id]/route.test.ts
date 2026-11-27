import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { revOf } from "@habit/shared";
import { base64UrlEncode, clearJwksCache } from "@/lib/auth/jwks";
import { resetContentDbForTests, getContentDb } from "@/lib/content-db/client";
import { listAudit } from "@/lib/content-db/audit";
import { sampleProblem } from "@/lib/content-db/fixtures";
import { saveProblem } from "@/lib/admin-content/write";
import { mintAdminProof } from "@/lib/auth/admin-proof";
import { DELETE, GET, PUT } from "./route";

const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {},
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  updateTag: vi.fn(),
}));

describe("/api/admin/content/problems/[id] route", () => {
  let keyPair: CryptoKeyPair;
  let publicJwk: JsonWebKey & { kid: string; alg: string };

  beforeEach(async () => {
    process.env.CONTENT_DATABASE_URL = ":memory:";
    delete process.env.ADMIN_USER_IDS;
    delete process.env.PUBLIC_SITE_URL;
    clearJwksCache();
    vi.clearAllMocks();

    keyPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const exported = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
    publicJwk = { ...exported, kid: "test-kid", alg: "ES256" };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (info) => {
      const url = String(info);
      if (url.includes("/.well-known/jwks.json")) {
        return new Response(JSON.stringify({ keys: [publicJwk] }), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    });
  });

  afterEach(async () => {
    await resetContentDbForTests();
    vi.restoreAllMocks();
  });

  async function makeToken(adm: boolean, sub = "gh:100"): Promise<string> {
    const enc = new TextEncoder();
    const nowSec = Math.floor(Date.now() / 1000);
    const claims = {
      iss: "zen-dojo-sync",
      sub,
      sid: "session-1",
      adm,
      iat: nowSec,
      exp: nowSec + 900,
    };
    const h = base64UrlEncode(enc.encode(JSON.stringify({ alg: "ES256", kid: "test-kid" })));
    const p = base64UrlEncode(enc.encode(JSON.stringify(claims)));
    const data = enc.encode(`${h}.${p}`);
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyPair.privateKey, data);
    const s = base64UrlEncode(new Uint8Array(sig));
    return `${h}.${p}.${s}`;
  }

  function req(method: string, token?: string, body?: unknown, headers?: Record<string, string>) {
    return new Request("http://localhost:3000/api/admin/content/problems/test-id", {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    });
  }

  it("answers 401 for anonymous requests on GET, PUT and DELETE", async () => {
    const ctx = { params: Promise.resolve({ id: "two-sum" }) };
    expect((await GET(req("GET"), ctx)).status).toBe(401);
    expect((await PUT(req("PUT", undefined, {}), ctx)).status).toBe(401);
    expect((await DELETE(req("DELETE"), ctx)).status).toBe(401);
  });

  it("answers 403 for valid non-admin token on GET, PUT and DELETE", async () => {
    const nonAdmin = await makeToken(false);
    const ctx = { params: Promise.resolve({ id: "two-sum" }) };
    expect((await GET(req("GET", nonAdmin), ctx)).status).toBe(403);
    expect((await PUT(req("PUT", nonAdmin, {}), ctx)).status).toBe(403);
    expect((await DELETE(req("DELETE", nonAdmin), ctx)).status).toBe(403);
  });

  it("GET returns 404 when problem not found and 200 with rev when found", async () => {
    const admin = await makeToken(true);
    const ctx = { params: Promise.resolve({ id: "lc-test-two-sum" }) };

    // Missing
    const missingRes = await GET(req("GET", admin), ctx);
    expect(missingRes.status).toBe(404);

    // Save problem
    const p = sampleProblem();
    const proof = mintAdminProof("gh:100", "Admin");
    await saveProblem(proof, p, null);

    const foundRes = await GET(req("GET", admin), ctx);
    expect(foundRes.status).toBe(200);
    const body = (await foundRes.json()) as { problem: unknown; rev: string };
    expect(body.rev).toBe(revOf(p));
  });

  it("PUT returns 200, creates one audit row, and expires cache tags", async () => {
    const admin = await makeToken(true);
    const p = sampleProblem();
    const ctx = { params: Promise.resolve({ id: p.row.id }) };

    const res = await PUT(req("PUT", admin, { draft: p, baseRev: null }), ctx);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; rev: string; version: number };
    expect(body.ok).toBe(true);
    expect(body.rev).toBe(revOf(p));

    const db = await getContentDb();
    const audits = await listAudit(db, { entity: "problem", entityId: p.row.id, limit: 10 });
    expect(audits).toHaveLength(1);
    expect(audits[0].action).toBe("create");

    expect(mockRevalidateTag).toHaveBeenCalled();
  });

  it("PUT returns 400 for invalid draft", async () => {
    const admin = await makeToken(true);
    const invalid = { ...sampleProblem(), row: { ...sampleProblem().row, title: "" } };
    const ctx = { params: Promise.resolve({ id: invalid.row.id }) };

    const res = await PUT(req("PUT", admin, { draft: invalid, baseRev: null }), ctx);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; errors: string[] };
    expect(body.ok).toBe(false);
    expect(body.errors.length).toBeGreaterThan(0);
  });

  it("PUT returns 409 for rev conflict", async () => {
    const admin = await makeToken(true);
    const p = sampleProblem();
    const proof = mintAdminProof("gh:100", "Admin");
    await saveProblem(proof, p, null);

    const updated = { ...p, row: { ...p.row, title: "Updated Title" } };
    const ctx = { params: Promise.resolve({ id: p.row.id }) };

    const res = await PUT(req("PUT", admin, { draft: updated, baseRev: "conflict-rev" }), ctx);
    expect(res.status).toBe(409);
    const body = (await res.json()) as { ok: boolean; conflict: boolean; current: unknown };
    expect(body.conflict).toBe(true);
    expect(body.current).not.toBeNull();
  });

  it("PUT returns 413 when body exceeds 2 MB", async () => {
    const admin = await makeToken(true);
    const largeStr = "a".repeat(2 * 1024 * 1024 + 10);
    const ctx = { params: Promise.resolve({ id: "two-sum" }) };

    const res = await PUT(req("PUT", admin, largeStr), ctx);
    expect(res.status).toBe(413);
  });

  it("DELETE returns 200 on success, 404 if missing, and 409 on conflict", async () => {
    const admin = await makeToken(true);
    const p = sampleProblem();
    const ctx = { params: Promise.resolve({ id: p.row.id }) };

    // Missing
    expect((await DELETE(req("DELETE", admin), ctx)).status).toBe(404);

    // Save
    const proof = mintAdminProof("gh:100", "Admin");
    await saveProblem(proof, p, null);

    // Conflict
    const conflictRes = await DELETE(req("DELETE", admin, { baseRev: "wrong-rev" }), ctx);
    expect(conflictRes.status).toBe(409);

    // Successful delete
    const successRes = await DELETE(req("DELETE", admin, { baseRev: revOf(p) }), ctx);
    expect(successRes.status).toBe(200);

    const db = await getContentDb();
    const audits = await listAudit(db, { entity: "problem", entityId: p.row.id, limit: 10 });
    expect(audits).toHaveLength(2);
    expect(audits[0].action).toBe("delete");
  });
});
