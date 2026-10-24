// Generates PWA icons (PNG) without external dependencies.
// Design: brand-blue rounded square with a white "+" cross and teal dot (medical/diagnostic motif).
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pixel) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = pixel(x, y);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const BLUE = [11, 95, 165];
const TEAL = [18, 165, 148];
const WHITE = [255, 255, 255];

function icon(size, maskable) {
  const pad = maskable ? size * 0.1 : 0; // maskable: safe zone
  const inner = size - pad * 2;
  const radius = maskable ? 0 : inner * 0.22;
  const cx = size / 2, cy = size / 2;
  const arm = inner * 0.11; // half thickness of cross
  const len = inner * 0.3; // half length of cross
  const dotR = inner * 0.09;
  const dotX = cx + inner * 0.26, dotY = cy - inner * 0.26;
  return png(size, (x, y) => {
    const px = x + 0.5, py = y + 0.5;
    // rounded square
    const lx = px - pad, ly = py - pad;
    let inside = lx >= 0 && ly >= 0 && lx < inner && ly < inner;
    if (inside && radius > 0) {
      const rx = Math.max(radius - lx, lx - (inner - radius), 0);
      const ry = Math.max(radius - ly, ly - (inner - radius), 0);
      if (rx * rx + ry * ry > radius * radius) inside = false;
    }
    if (maskable) inside = true;
    if (!inside) return [0, 0, 0, 0];
    if ((px - dotX) ** 2 + (py - dotY) ** 2 <= dotR * dotR) return [...TEAL, 255];
    const inCross = (Math.abs(px - cx) <= arm && Math.abs(py - cy) <= len) || (Math.abs(py - cy) <= arm && Math.abs(px - cx) <= len);
    if (inCross) return [...WHITE, 255];
    return [...BLUE, 255];
  });
}

const out = join(process.cwd(), "public", "icons");
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "icon-192.png"), icon(192, false));
writeFileSync(join(out, "icon-512.png"), icon(512, false));
writeFileSync(join(out, "icon-512-maskable.png"), icon(512, true));
writeFileSync(join(out, "apple-touch-icon.png"), icon(180, true));
writeFileSync(join(process.cwd(), "public", "favicon.ico"), icon(32, false)); // PNG data in .ico is accepted by browsers
console.log("icons written to", out);
