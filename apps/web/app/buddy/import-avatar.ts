/** Pure checks for an imported Buddy avatar image. The image is only ever shown through an <img>, never inlined. */

export const AVATAR_MAX_BYTES = 300 * 1024;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"] as const;
export const AVATAR_ACCEPT = AVATAR_TYPES.join(",");

export type AvatarCheck = { ok: true } | { ok: false; error: string };

const BAD_SVG = ["<script", "onload=", "onerror=", "javascript:", "<foreignobject"];

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);

function magicMatches(type: string, b: Uint8Array): boolean {
  switch (type) {
    case "image/png":
      return startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/jpeg":
      return startsWith(b, [0xff, 0xd8, 0xff]);
    case "image/gif":
      return startsWith(b, [0x47, 0x49, 0x46, 0x38]); // GIF8
    case "image/webp":
      return startsWith(b, [0x52, 0x49, 0x46, 0x46]) && startsWith(b, [0x57, 0x45, 0x42, 0x50], 8); // RIFF....WEBP
    default:
      return false;
  }
}

/**
 * `bytesHead` is the start of the file. For SVG it should be the whole file (it is text and capped at 300 KB),
 * because the script check needs to see all of it.
 */
export function validateAvatarFile(f: { type: string; size: number; bytesHead: Uint8Array }): AvatarCheck {
  if (!(AVATAR_TYPES as readonly string[]).includes(f.type)) {
    return { ok: false, error: "Use a PNG, JPEG, GIF, WebP or SVG image." };
  }
  if (f.size <= 0) return { ok: false, error: "That file is empty." };
  if (f.size > AVATAR_MAX_BYTES) return { ok: false, error: "That image is bigger than 300 KB. Pick a smaller one." };

  if (f.type === "image/svg+xml") {
    let text = new TextDecoder("utf-8").decode(f.bytesHead);
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const lower = text.trimStart().toLowerCase();
    if (!lower.startsWith("<svg") && !lower.startsWith("<?xml")) {
      return { ok: false, error: "That file does not look like an SVG image." };
    }
    if (BAD_SVG.some((s) => lower.includes(s))) {
      return { ok: false, error: "That SVG contains scripts, so it was refused. Use a plain image." };
    }
    return { ok: true };
  }

  if (!magicMatches(f.type, f.bytesHead)) {
    return { ok: false, error: "That file is not a real image of the type it claims to be." };
  }
  return { ok: true };
}

/** Reads a file and returns a data URL, or an error message. Runs the checks above first. */
export async function fileToDataUrl(file: File): Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }> {
  try {
    const head = new Uint8Array(await file.slice(0, AVATAR_MAX_BYTES + 1).arrayBuffer());
    const check = validateAvatarFile({ type: file.type, size: file.size, bytesHead: head });
    if (!check.ok) return check;
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => (typeof r.result === "string" ? resolve(r.result) : reject(new Error("bad result")));
      r.onerror = () => reject(r.error ?? new Error("read failed"));
      r.readAsDataURL(file);
    });
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, error: "Could not read that file." };
  }
}
