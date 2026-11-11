/** Petdex pet packages: validate pet.json, check the sheet, normalise it to half size. Decoding is browser-only. */
import { readZip, ZipError } from "./zip";

export interface PetPackage {
  id: string;
  displayName: string;
  description: string;
  sheet: Blob;
}
export const PET_ROWS = ["idle", "running-right", "running-left", "waving", "jumping", "failed", "waiting", "running", "review"] as const;
export type PetRow = (typeof PET_ROWS)[number];
export interface PetMeta {
  id: string;
  name: string;
  description: string;
  cols: number;
  rows: number;
  frames: Record<PetRow, number>;
  cellW: number;
  cellH: number;
}
export class PetImportError extends Error {}

export const PET_COLS = 8;
export const PET_ROW_COUNT = 9;
/** Typical used frames per row, in PET_ROWS order; used when the alpha scan finds nothing. */
export const TYPICAL_FRAMES = [6, 8, 8, 4, 5, 8, 6, 6, 6] as const;
export const SHEET_MAX_BYTES = 2 * 1024 * 1024;
const ALPHA_THRESHOLD = 16;

const ID_RE = /^[a-z0-9][a-z0-9-]{0,63}$/;
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f]/g;
const clean = (s: string) => s.replace(CONTROL_RE, " ").replace(/\s+/g, " ").trim();

export interface PetJson {
  id: string;
  displayName: string;
  description: string;
  spritesheetPath: string;
}

/** Validates the parsed pet.json. Throws PetImportError with a plain message. */
export function parsePetJson(text: string): PetJson {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new PetImportError("The pet's pet.json is not valid.");
  }
  if (!raw || typeof raw !== "object") throw new PetImportError("The pet's pet.json is not valid.");
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!ID_RE.test(id)) throw new PetImportError("The pet has an invalid id.");
  const displayName = typeof o.displayName === "string" ? clean(o.displayName) : "";
  if (displayName.length < 1 || displayName.length > 60) throw new PetImportError("The pet needs a name of 1 to 60 characters.");
  const description = typeof o.description === "string" ? clean(o.description).slice(0, 300) : "";
  const path = typeof o.spritesheetPath === "string" ? o.spritesheetPath : "";
  if (!/^[^/\\:]+\.(webp|png)$/i.test(path) || path.startsWith(".")) {
    throw new PetImportError("The pet's sprite sheet must be a .webp or .png file name.");
  }
  return { id, displayName, description, spritesheetPath: path };
}

const startsWith = (b: Uint8Array, sig: number[], at = 0) => b.length >= at + sig.length && sig.every((v, i) => b[at + i] === v);

/** Returns the image mime type if the magic bytes are WebP or PNG, else null. */
export function sheetMime(b: Uint8Array): "image/webp" | "image/png" | null {
  if (startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  if (startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  return null;
}

/** Checks the sheet is a whole 8 x 9 grid; returns the full-size cell size. */
export function gridCell(width: number, height: number): { cellW: number; cellH: number } {
  if (width <= 0 || height <= 0 || width % PET_COLS !== 0 || height % PET_ROW_COUNT !== 0) {
    throw new PetImportError("This does not look like a Petdex sheet.");
  }
  return { cellW: width / PET_COLS, cellH: height / PET_ROW_COUNT };
}

/**
 * Used frames per row from per-cell "has visible pixels" flags (`cellUsed[row][col]`).
 * Trims empty trailing cells; a row with no visible cell falls back to the typical count.
 */
export function framesFromUsage(cellUsed: boolean[][]): Record<PetRow, number> {
  const out = {} as Record<PetRow, number>;
  PET_ROWS.forEach((row, r) => {
    const cells = cellUsed[r] ?? [];
    let n = 0;
    for (let c = PET_COLS - 1; c >= 0; c--) {
      if (cells[c]) {
        n = c + 1;
        break;
      }
    }
    out[row] = n > 0 ? n : TYPICAL_FRAMES[r];
  });
  return out;
}

export function buildMeta(json: PetJson, frames: Record<PetRow, number>, cellW: number, cellH: number): PetMeta {
  return { id: json.id, name: json.displayName, description: json.description, cols: PET_COLS, rows: PET_ROW_COUNT, frames, cellW, cellH };
}

async function normaliseSheet(
  bytes: Uint8Array,
  mime: string,
): Promise<{ sheet: Blob; frames: Record<PetRow, number>; cellW: number; cellH: number }> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(new Blob([bytes as BlobPart], { type: mime }));
  } catch {
    throw new PetImportError("The sprite sheet could not be read as an image.");
  }
  try {
    const { cellW: fullW, cellH: fullH } = gridCell(bitmap.width, bitmap.height);
    const full = new OffscreenCanvas(bitmap.width, bitmap.height);
    const fctx = full.getContext("2d", { willReadFrequently: true });
    if (!fctx) throw new PetImportError("This browser cannot process images here.");
    fctx.drawImage(bitmap, 0, 0);
    const used: boolean[][] = [];
    for (let r = 0; r < PET_ROW_COUNT; r++) {
      used.push([]);
      for (let c = 0; c < PET_COLS; c++) {
        const data = fctx.getImageData(c * fullW, r * fullH, fullW, fullH).data;
        let seen = false;
        for (let i = 3; i < data.length; i += 4) {
          if (data[i] > ALPHA_THRESHOLD) {
            seen = true;
            break;
          }
        }
        used[r].push(seen);
      }
    }
    const cellW = Math.max(1, Math.round(fullW / 2));
    const cellH = Math.max(1, Math.round(fullH / 2));
    const half = new OffscreenCanvas(cellW * PET_COLS, cellH * PET_ROW_COUNT);
    const hctx = half.getContext("2d");
    if (!hctx) throw new PetImportError("This browser cannot process images here.");
    hctx.imageSmoothingQuality = "high";
    hctx.drawImage(bitmap, 0, 0, half.width, half.height);
    let sheet = await half.convertToBlob({ type: "image/webp", quality: 0.9 });
    if (sheet.type !== "image/webp") sheet = await half.convertToBlob({ type: "image/png" });
    if (sheet.size > SHEET_MAX_BYTES) throw new PetImportError("The sprite sheet is too large even after shrinking.");
    return { sheet, frames: framesFromUsage(used), cellW, cellH };
  } finally {
    bitmap.close();
  }
}

/** Reads a Petdex pet zip. Browser only. Throws PetImportError with a plain message. */
export async function importPetZip(bytes: Uint8Array): Promise<{ pkg: PetPackage; meta: PetMeta }> {
  let files: Map<string, Uint8Array>;
  try {
    files = await readZip(bytes);
  } catch (e) {
    if (e instanceof ZipError) throw new PetImportError(e.message);
    throw new PetImportError("That file could not be read as a zip.");
  }
  const jsonBytes = files.get("pet.json");
  if (!jsonBytes) throw new PetImportError("The zip has no pet.json, so it is not a Petdex pet.");
  const json = parsePetJson(new TextDecoder("utf-8").decode(jsonBytes));
  const sheetBytes = files.get(json.spritesheetPath);
  if (!sheetBytes) throw new PetImportError("The zip is missing the pet's sprite sheet.");
  const mime = sheetMime(sheetBytes);
  if (!mime) throw new PetImportError("The sprite sheet is not a real WebP or PNG image.");
  const { sheet, frames, cellW, cellH } = await normaliseSheet(sheetBytes, mime);
  return {
    pkg: { id: json.id, displayName: json.displayName, description: json.description, sheet },
    meta: buildMeta(json, frames, cellW, cellH),
  };
}
