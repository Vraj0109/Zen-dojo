import "server-only";
import { desc, eq } from "drizzle-orm";
import { ALL_EXERCISES, toLocalDate } from "@habit/shared";
import { getDb } from "./db";
import { diagrams } from "./schema";

// Your own diagrams for designs and LLD problems: a link (Excalidraw, draw.io, Miro…) and/or an
// uploaded image. Images are stored base64 in the database so backups include them.

export const DIAGRAM_LIMITS = { bytes: 3_000_000, title: 200, url: 500 } as const;
/** No SVG: it can carry scripts. */
export const DIAGRAM_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;

export interface DiagramView {
  id: number;
  itemId: string;
  title: string;
  url: string | null;
  hasImage: boolean;
  createdOn: string;
}

const view = (d: { id: number; itemId: string; title: string; url: string | null; image: string | null; createdOn: string }): DiagramView => ({
  id: d.id,
  itemId: d.itemId,
  title: d.title,
  url: d.url,
  hasImage: !!d.image,
  createdOn: d.createdOn,
});

const columns = { id: diagrams.id, itemId: diagrams.itemId, title: diagrams.title, url: diagrams.url, image: diagrams.image, createdOn: diagrams.createdOn };

export async function getDiagrams(itemId?: string): Promise<DiagramView[]> {
  const db = await getDb();
  const q = db.select(columns).from(diagrams);
  const rows = await (itemId ? q.where(eq(diagrams.itemId, itemId)) : q).orderBy(desc(diagrams.id));
  return rows.map(view);
}

export type AddDiagramResult = { ok: true; id: number } | { ok: false; error: string };

/** Detect the image type from its first bytes (don't trust the browser's content type). */
export function sniffImage(bytes: Uint8Array): (typeof DIAGRAM_TYPES)[number] | null {
  const b = bytes;
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return "image/gif";
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

export async function addDiagram(input: { itemId: string; title: string; url: string; image: Uint8Array | null }): Promise<AddDiagramResult> {
  if (!(input.itemId in ALL_EXERCISES)) return { ok: false, error: "Unknown design or problem." };
  const url = input.url.trim();
  if (url && (!/^https?:\/\/\S+$/i.test(url) || url.length > DIAGRAM_LIMITS.url)) return { ok: false, error: "The link must start with http:// or https://." };
  let mime: string | null = null;
  let image: string | null = null;
  if (input.image && input.image.length > 0) {
    if (input.image.length > DIAGRAM_LIMITS.bytes) return { ok: false, error: "Images can be up to 3 MB." };
    mime = sniffImage(input.image);
    if (!mime) return { ok: false, error: "Upload a PNG, JPEG, WebP or GIF image." };
    image = Buffer.from(input.image).toString("base64");
  }
  if (!url && !image) return { ok: false, error: "Add a link or an image." };
  const db = await getDb();
  const [row] = await db
    .insert(diagrams)
    .values({ itemId: input.itemId, title: input.title.trim().slice(0, DIAGRAM_LIMITS.title), url: url || null, mime, image, createdOn: toLocalDate() })
    .returning({ id: diagrams.id });
  return { ok: true, id: row.id };
}

export async function getDiagramImage(id: number): Promise<{ mime: string; bytes: Buffer } | null> {
  const db = await getDb();
  const row = await db.query.diagrams.findFirst({ where: eq(diagrams.id, id) });
  if (!row?.image || !row.mime || !(DIAGRAM_TYPES as readonly string[]).includes(row.mime)) return null;
  return { mime: row.mime, bytes: Buffer.from(row.image, "base64") };
}

export async function deleteDiagram(id: number) {
  const db = await getDb();
  await db.delete(diagrams).where(eq(diagrams.id, id));
}
