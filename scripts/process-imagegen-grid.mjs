import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { inflateSync, deflateSync } from 'node:zlib';

const [input, output, columnsArg = '6', rowsArg = '4', cellArg = '64'] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node scripts/process-imagegen-grid.mjs <input.png> <output.png> [columns] [rows] [cell]');
  process.exit(1);
}

const columns = Number(columnsArg);
const rows = Number(rowsArg);
const cell = Number(cellArg);
const crcTable = makeCrcTable();
const src = decodePng(await readFile(input));
const out = makeImage(columns * cell, rows * cell);
const slotW = src.width / columns;
const slotH = src.height / rows;

for (let row = 0; row < rows; row += 1) {
  for (let column = 0; column < columns; column += 1) {
    const x0 = Math.floor(column * slotW);
    const x1 = Math.floor((column + 1) * slotW);
    const y0 = Math.floor(row * slotH);
    const y1 = Math.floor((row + 1) * slotH);
    const bbox = findSpriteBox(src, x0, y0, x1, y1);
    if (!bbox) continue;
    const sourceW = bbox.x1 - bbox.x0 + 1;
    const sourceH = bbox.y1 - bbox.y0 + 1;
    const targetH = Math.min(56, Math.max(38, Math.round(cell * 0.78)));
    const targetW = Math.max(16, Math.round((sourceW / sourceH) * targetH));
    const dx = column * cell + Math.floor((cell - targetW) / 2);
    const dy = row * cell + cell - targetH - 3;
    drawNearestSprite(src, out, bbox, dx, dy, targetW, targetH);
  }
}

await mkdir(dirname(output), { recursive: true });
await writeFile(output, encodePng(out));

function isBackground(r, g, b) {
  return g > 135 && r < 115 && b < 115 && g > r * 1.45 && g > b * 1.45;
}

function findSpriteBox(img, x0, y0, x1, y1) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = (y * img.width + x) * 4;
      if (img.data[i + 3] === 0 || isBackground(img.data[i], img.data[i + 1], img.data[i + 2])) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (!Number.isFinite(minX)) return null;
  const pad = 2;
  return {
    x0: Math.max(x0, minX - pad),
    y0: Math.max(y0, minY - pad),
    x1: Math.min(x1 - 1, maxX + pad),
    y1: Math.min(y1 - 1, maxY + pad),
  };
}

function drawNearestSprite(src, dst, bbox, dx, dy, dw, dh) {
  for (let y = 0; y < dh; y += 1) {
    for (let x = 0; x < dw; x += 1) {
      const sx = bbox.x0 + Math.floor((x / dw) * (bbox.x1 - bbox.x0 + 1));
      const sy = bbox.y0 + Math.floor((y / dh) * (bbox.y1 - bbox.y0 + 1));
      const si = (sy * src.width + sx) * 4;
      const r = src.data[si];
      const g = src.data[si + 1];
      const b = src.data[si + 2];
      if (src.data[si + 3] === 0 || isBackground(r, g, b)) continue;
      dst.data.set(quantize([r, g, b, 255]), ((dy + y) * dst.width + dx + x) * 4);
    }
  }
}

function quantize([r, g, b, a]) {
  const step = 17;
  return [Math.round(r / step) * step, Math.round(g / step) * step, Math.round(b / step) * step, a];
}

function makeImage(width, height) {
  return { width, height, data: new Uint8Array(width * height * 4) };
}

function decodePng(buffer) {
  let pos = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  const idat = [];
  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos);
    const type = buffer.subarray(pos + 4, pos + 8).toString('ascii');
    const data = buffer.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      colorType = data[9];
      if (![2, 6].includes(colorType)) throw new Error(`Unsupported color type ${colorType}`);
      if (data[12] !== 0) throw new Error('Interlaced PNG unsupported');
    }
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
    pos += len + 12;
  }
  const channels = colorType === 6 ? 4 : 3;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(idat));
  const recon = new Uint8Array(height * stride);
  let rp = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rp++];
    const row = raw.subarray(rp, rp + stride);
    const prev = y === 0 ? null : recon.subarray((y - 1) * stride, y * stride);
    const out = recon.subarray(y * stride, (y + 1) * stride);
    unfilter(filter, row, prev, out, channels);
    rp += stride;
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < recon.length; i += channels, j += 4) {
    rgba[j] = recon[i];
    rgba[j + 1] = recon[i + 1];
    rgba[j + 2] = recon[i + 2];
    rgba[j + 3] = channels === 4 ? recon[i + 3] : 255;
  }
  return { width, height, data: rgba };
}

function unfilter(filter, row, prev, out, bpp) {
  for (let i = 0; i < row.length; i += 1) {
    const left = i >= bpp ? out[i - bpp] : 0;
    const up = prev ? prev[i] : 0;
    const upLeft = prev && i >= bpp ? prev[i - bpp] : 0;
    let val = row[i];
    if (filter === 1) val += left;
    else if (filter === 2) val += up;
    else if (filter === 3) val += Math.floor((left + up) / 2);
    else if (filter === 4) val += paeth(left, up, upLeft);
    out[i] = val & 255;
  }
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

function encodePng({ width, height, data }) {
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(data.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk('IHDR', ihdr(width, height)), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  return data;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
