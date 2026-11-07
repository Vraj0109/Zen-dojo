// Draws build/icon.png (1024x1024): a green rounded square with a white check mark.
// electron-builder makes the .ico / .icns / Linux icons from it. Rerun after changing the design:
//   node scripts/make-icon.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const SIZE = 1024;
const SS = 4; // supersampling per axis, for smooth edges
const GREEN = [0x2f, 0x7d, 0x5b]; // --accent in apps/web/app/globals.css
const WHITE = [0xff, 0xff, 0xff];

/** Distance from p to segment ab. @param {number} px @param {number} py @param {number} ax @param {number} ay @param {number} bx @param {number} by */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Inside a rounded square with margin m and corner radius r (unit coordinates 0..1). @param {number} x @param {number} y */
function inRoundedSquare(x, y, m = 0.06, r = 0.2) {
  const cx = Math.min(Math.max(x, m + r), 1 - m - r);
  const cy = Math.min(Math.max(y, m + r), 1 - m - r);
  return Math.hypot(x - cx, y - cy) <= r;
}

/** @param {number} x @param {number} y */
function inCheck(x, y) {
  const w = 0.075; // half stroke width
  return segDist(x, y, 0.28, 0.53, 0.43, 0.68) <= w || segDist(x, y, 0.43, 0.68, 0.73, 0.36) <= w;
}

const rows = [];
for (let py = 0; py < SIZE; py++) {
  const row = Buffer.alloc(1 + SIZE * 4); // filter byte 0 + RGBA
  for (let px = 0; px < SIZE; px++) {
    let bg = 0, fg = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const x = (px + (sx + 0.5) / SS) / SIZE, y = (py + (sy + 0.5) / SS) / SIZE;
        if (inRoundedSquare(x, y)) inCheck(x, y) ? fg++ : bg++;
      }
    }
    const n = SS * SS, cover = (bg + fg) / n;
    const mix = fg / Math.max(1, bg + fg);
    const o = 1 + px * 4;
    for (let c = 0; c < 3; c++) row[o + c] = Math.round(GREEN[c] * (1 - mix) + WHITE[c] * mix);
    row[o + 3] = Math.round(cover * 255);
  }
  rows.push(row);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (/** @type {Buffer} */ buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (/** @type {string} */ type, /** @type {Buffer} */ data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // RGBA
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk("IHDR", ihdr),
  chunk("IDAT", deflateSync(Buffer.concat(rows), { level: 9 })),
  chunk("IEND", Buffer.alloc(0)),
]);

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "build", "icon.png");
mkdirSync(path.dirname(out), { recursive: true });
writeFileSync(out, png);
console.log(`Wrote ${out} (${(png.length / 1024).toFixed(0)} KB)`);
