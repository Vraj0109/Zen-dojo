/** Minimal zip reader (stored + deflate). Browser/Node 18+ via DecompressionStream; no library. */

export const ZIP_MAX_ENTRIES = 20;
export const ZIP_MAX_ENTRY_BYTES = 8 * 1024 * 1024;
export const ZIP_MAX_TOTAL_BYTES = 12 * 1024 * 1024;

export class ZipError extends Error {}

function u16(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8);
}
function u32(b: Uint8Array, o: number): number {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

export function isSafeZipPath(name: string): boolean {
  if (!name || name.startsWith("/") || name.startsWith("\\") || /^[a-zA-Z]:/.test(name)) return false;
  if (name.includes("\0")) return false;
  return !name.split(/[\/]/).includes("..");
}

async function inflateRaw(data: Uint8Array, limit: number): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new ZipError("The zip contains a file that is too large.");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/** Reads every file entry of a zip into a map keyed by path. Throws ZipError with a plain message. */
export async function readZip(bytes: Uint8Array): Promise<Map<string, Uint8Array>> {
  const bad = () => new ZipError("That file is not a valid zip.");
  // End of central directory: last 22 bytes + up to 65535 comment bytes.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (u32(bytes, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw bad();
  const count = u16(bytes, eocd + 10);
  const cdSize = u32(bytes, eocd + 12);
  const cdOffset = u32(bytes, eocd + 16);
  if (count > ZIP_MAX_ENTRIES) throw new ZipError("The zip has too many files.");
  if (cdOffset + cdSize > bytes.length) throw bad();

  const out = new Map<string, Uint8Array>();
  let total = 0;
  let p = cdOffset;
  for (let n = 0; n < count; n++) {
    if (p + 46 > bytes.length || u32(bytes, p) !== 0x02014b50) throw bad();
    const flags = u16(bytes, p + 8);
    const method = u16(bytes, p + 10);
    const compSize = u32(bytes, p + 20);
    const size = u32(bytes, p + 24);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const localOffset = u32(bytes, p + 42);
    const name = new TextDecoder("utf-8").decode(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    if (!isSafeZipPath(name)) throw new ZipError("The zip contains an unsafe file path.");
    if (name.endsWith("/")) continue; // directory
    if (flags & 1) throw new ZipError("Encrypted zips are not supported.");
    if (method !== 0 && method !== 8) throw new ZipError("The zip uses a compression method that is not supported.");
    if (size > ZIP_MAX_ENTRY_BYTES) throw new ZipError("The zip contains a file that is too large.");
    total += size;
    if (total > ZIP_MAX_TOTAL_BYTES) throw new ZipError("The zip is too large.");

    if (localOffset + 30 > bytes.length || u32(bytes, localOffset) !== 0x04034b50) throw bad();
    const dataStart = localOffset + 30 + u16(bytes, localOffset + 26) + u16(bytes, localOffset + 28);
    if (dataStart + compSize > bytes.length) throw bad();
    const raw = bytes.subarray(dataStart, dataStart + compSize);
    const data = method === 0 ? raw.slice() : await inflateRaw(raw, ZIP_MAX_ENTRY_BYTES);
    if (data.length !== size) throw bad();
    out.set(name, data);
  }
  return out;
}
