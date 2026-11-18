/**
 * Generate valid PNG PWA icons (192x192 & 512x512) using Node.js built-in zlib
 * Zero external dependencies.
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const dir = path.resolve('public/icons');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createStroopIconPNG(size) {
  const raw = Buffer.alloc(size * (1 + size * 4));
  const bgR = 217, bgG = 119, bgB = 6; // #D97706 Amber
  const cardR = 251, cardG = 247, cardB = 238; // #FBF7EE Warm Sepia

  const dots = [
    { cx: size * 0.34, cy: size * 0.5, r: size * 0.08, rgb: [239, 68, 68] },   // Red
    { cx: size * 0.50, cy: size * 0.5, r: size * 0.08, rgb: [59, 130, 246] },  // Blue
    { cx: size * 0.66, cy: size * 0.5, r: size * 0.08, rgb: [16, 185, 129] }   // Green
  ];

  const margin = size * 0.14;
  const radius = size * 0.18;

  for (let y = 0; y < size; y++) {
    const rowStart = y * (1 + size * 4);
    raw[rowStart] = 0; // filter type 0

    for (let x = 0; x < size; x++) {
      const idx = rowStart + 1 + x * 4;
      let r = bgR, g = bgG, b = bgB, a = 255;

      // Inner rounded card
      const inInnerX = x >= margin && x < size - margin;
      const inInnerY = y >= margin && y < size - margin;
      if (inInnerX && inInnerY) {
        r = cardR; g = cardG; b = cardB;
      }

      // Three Stroop color dots
      for (const dot of dots) {
        const dx = x - dot.cx;
        const dy = y - dot.cy;
        if (dx * dx + dy * dy <= dot.r * dot.r) {
          [r, g, b] = dot.rgb;
          break;
        }
      }

      // Outer rounded corner alpha mask
      const cornerDist = (cx, cy) => Math.hypot(x - cx, y - cy);
      const inCorner =
        (x < radius && y < radius && cornerDist(radius, radius) > radius) ||
        (x >= size - radius && y < radius && cornerDist(size - radius - 1, radius) > radius) ||
        (x < radius && y >= size - radius && cornerDist(radius, size - radius - 1) > radius) ||
        (x >= size - radius && y >= size - radius && cornerDist(size - radius - 1, size - radius - 1) > radius);

      if (inCorner) {
        a = 0;
      }

      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const compressed = zlib.deflateSync(raw);

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

fs.writeFileSync(path.join(dir, 'icon-192.png'), createStroopIconPNG(192));
fs.writeFileSync(path.join(dir, 'icon-512.png'), createStroopIconPNG(512));
console.log('✅ Generated valid PNG icons: public/icons/icon-192.png & public/icons/icon-512.png');
