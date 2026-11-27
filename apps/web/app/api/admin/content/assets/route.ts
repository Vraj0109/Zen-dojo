import { requireAdminRequest } from "@/lib/auth/admin";
import { getContentWriteDb } from "@/lib/content-db/client";
import { putAsset, type AssetMime } from "@/lib/content-db/write";

const MAX_ASSET_BYTES = 1024 * 1024; // 1 MB

export function detectMimeType(bytes: Uint8Array): AssetMime | null {
  if (bytes.length < 8) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // WebP: RIFF ... WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;

  const contentType = request.headers.get("content-type") ?? "";
  let bytes: Uint8Array;

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      return Response.json({ ok: false, error: "Missing file field." }, { status: 400 });
    }
    const buf = await file.arrayBuffer();
    bytes = new Uint8Array(buf);
  } else {
    const buf = await request.arrayBuffer();
    bytes = new Uint8Array(buf);
  }

  if (bytes.byteLength > MAX_ASSET_BYTES) {
    return Response.json({ ok: false, error: "Image is larger than 1 MB." }, { status: 413 });
  }

  // Check SVG: if starts with <svg or <?xml or contains svg tag
  const headerSlice = new TextDecoder().decode(bytes.slice(0, 100)).trim().toLowerCase();
  if (headerSlice.startsWith("<svg") || headerSlice.startsWith("<?xml")) {
    return Response.json(
      { ok: false, error: "SVG images are not allowed (use a Mermaid diagram for vector drawings)." },
      { status: 400 },
    );
  }

  const mime = detectMimeType(bytes);
  if (!mime) {
    return Response.json(
      { ok: false, error: "Only PNG, JPEG, and WebP images are allowed." },
      { status: 400 },
    );
  }

  try {
    const db = await getContentWriteDb(auth.proof);
    let assetId = "";
    await db.transaction(async (tx) => {
      const res = await putAsset(tx, bytes, mime, auth.proof.name || auth.proof.userId);
      assetId = res.id;
    });

    return Response.json({ ok: true, id: assetId, url: `/api/content/assets/${assetId}` });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to store asset." },
      { status: 500 },
    );
  }
}
