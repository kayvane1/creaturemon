import { PNG } from 'pngjs';
import { build } from 'esbuild';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const CELL = 64;
const COLUMNS = 6;
const ROWS = 4;
const tempFile = new URL('./.tmp-asset-catalog.mjs', import.meta.url);

await build({
  entryPoints: [new URL('../src/systems/assets/AssetCatalog.ts', import.meta.url).pathname],
  outfile: tempFile.pathname,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});

const { CHARACTER_SHEETS } = await import(pathToFileURL(tempFile.pathname).href);
await rm(tempFile, { force: true });
const SHEETS = CHARACTER_SHEETS.map((entry) => `public/${entry.path}`);

function alphaAt(png, x, y) {
  return png.data[(png.width * y + x) * 4 + 3];
}

function bounds(png, frameX, frameY) {
  let minX = CELL;
  let minY = CELL;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      if (alphaAt(png, frameX * CELL + x, frameY * CELL + y) <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX === -1) return null;
  return { minX, minY, maxX, maxY, centerX: (minX + maxX) / 2 };
}

function copyFrame(source, target, frameX, frameY, dx, dy) {
  for (let y = 0; y < CELL; y += 1) {
    for (let x = 0; x < CELL; x += 1) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= CELL || ty >= CELL) continue;
      const sourceIndex = (source.width * (frameY * CELL + y) + frameX * CELL + x) * 4;
      if (source.data[sourceIndex + 3] <= 0) continue;
      const targetIndex = (target.width * (frameY * CELL + ty) + frameX * CELL + tx) * 4;
      target.data[targetIndex] = source.data[sourceIndex];
      target.data[targetIndex + 1] = source.data[sourceIndex + 1];
      target.data[targetIndex + 2] = source.data[sourceIndex + 2];
      target.data[targetIndex + 3] = source.data[sourceIndex + 3];
    }
  }
}

for (const path of SHEETS) {
  const png = PNG.sync.read(await readFile(path));
  if (png.width !== CELL * COLUMNS || png.height !== CELL * ROWS) {
    throw new Error(`${path} must be ${CELL * COLUMNS}x${CELL * ROWS}`);
  }
  const frameBounds = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) frameBounds.push(bounds(png, col, row));
  }
  const concrete = frameBounds.filter(Boolean);
  const targetBottom = Math.min(60, Math.max(...concrete.map((entry) => entry.maxY)));
  const targetCenterX = concrete.map((entry) => entry.centerX).sort((a, b) => a - b)[Math.floor(concrete.length / 2)];
  const output = new PNG({ width: png.width, height: png.height });
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLUMNS; col += 1) {
      const box = bounds(png, col, row);
      if (!box) continue;
      const dx = Math.round(targetCenterX - box.centerX);
      const dy = Math.round(targetBottom - box.maxY);
      copyFrame(png, output, col, row, dx, dy);
    }
  }
  await writeFile(path, PNG.sync.write(output));
  console.log(`Normalized ${path}`);
}
