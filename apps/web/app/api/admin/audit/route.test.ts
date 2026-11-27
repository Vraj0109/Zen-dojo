import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { base64UrlEncode, clearJwksCache } from "@/lib/auth/jwks";
import { resetContentDbForTests } from "@/lib/content-db/client";
import { sampleProblem } from "@/lib/content-db/fixtures";
import { saveProblem } from "@/lib/admin-content/write";
import { mintAdminProof } from "@/lib/auth/admin-proof";
import { GET, POST } from "./route";

const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({ cacheTag: () => {}, cacheLife: () => {},
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
  updateTag: vi.fn(),
}));

describe("/api/admin/audit route", () => {
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

  function req(method: string, path = "", token?: string, body?: unknown) {
    return new Request(`http://localhost:3000/api/admin/audit${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
    });
  }

  it("answers 401 for anonymous and 403 for non-admin on GET and POST", async () => {
    expect((await GET(req("GET"))).status).toBe(401);
    expect((await POST(req("POST", "", undefined, { auditId: 1 }))).status).toBe(401);

    const nonAdmin = await makeToken(false);
    expect((await GET(req("GET", "", nonAdmin))).status).toBe(403);
    expect((await POST(req("POST", "", nonAdmin, { auditId: 1 }))).status).toBe(403);
  });

  it("GET returns 200 and lists filtered audit rows", async () => {
    const admin = await makeToken(true);
    const proof = mintAdminProof("gh:100", "Admin");

    const p = sampleProblem();
    await saveProblem(proof, p, null);

    const res = await GET(req("GET", "?entity=problem", admin));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { rows: Array<{ entity: string; entityId: string; action: string }> };
    expect(body.rows).toHaveLength(1);
    expect(body.rows[0].entity).toBe("problem");
    expect(body.rows[0].entityId).toBe(p.row.id);
  });

  it("POST restores version from audit row", async () => {
    const admin = await makeToken(true);
    const proof = mintAdminProof("gh:100", "Admin");

    const p = sampleProblem();
    await saveProblem(proof, p, null);

    // Save modified
    const modified = { ...p, row: { ...p.row, title: "Modified Title" } };
    await saveProblem(proof, modified, null);

    // List audits
    const getRes = await GET(req("GET", "?entity=problem", admin));
    const { rows } = (await getRes.json()) as { rows: Array<{ id: number; action: string; after: { row: { title: string } } }> };
    expect(rows).toHaveLength(2);
    // rows[1] is the older row with title "Two Sum"
    const oldAuditId = rows[1].id;

    // Restore older
    const postRes = await POST(req("POST", "", admin, { auditId: oldAuditId }));
    expect(postRes.status).toBe(200);
    const postBody = (await postRes.json()) as { ok: boolean; rev: string };
    expect(postBody.ok).toBe(true);

    expect(mockRevalidateTag).toHaveBeenCalled();
  });

  it("POST returns 400 for invalid/missing auditId", async () => {
    const admin = await makeToken(true);

    const res1 = await POST(req("POST", "", admin, {}));
    expect(res1.status).toBe(400);

    const res2 = await POST(req("POST", "", admin, { auditId: 99999 }));
    expect(res2.status).toBe(400);
  });

  it("POST returns 413 when body exceeds 2 MB", async () => {
    const admin = await makeToken(true);
    const largeStr = "a".repeat(2 * 1024 * 1024 + 10);

    const res = await POST(req("POST", "", admin, largeStr));
    expect(res.status).toBe(413);
  });
});
