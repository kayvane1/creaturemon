import { PNG } from 'pngjs';
import { build } from 'esbuild';
import { readFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const CELL = 64;
const COLUMNS = 6;
const DIRECTIONS = ['down', 'left', 'right', 'up'];
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
const SHEETS = CHARACTER_SHEETS.map((entry) => [entry.name.replace(/^npc_/, ''), `public/${entry.path}`]);

const failures = [];
const report = [];

function fail(message) {
  failures.push(message);
}

function alphaAt(png, x, y) {
  return png.data[(png.width * y + x) * 4 + 3];
}

function frameBounds(png, frameX, frameY) {
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
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    centerX: (minX + maxX) / 2,
  };
}

for (const [name, path] of SHEETS) {
  const png = PNG.sync.read(await readFile(path));
  if (png.width !== CELL * COLUMNS || png.height !== CELL * DIRECTIONS.length) {
    fail(`${name}: expected ${CELL * COLUMNS}x${CELL * DIRECTIONS.length}, got ${png.width}x${png.height}`);
    continue;
  }
  const directionSummaries = [];
  for (let row = 0; row < DIRECTIONS.length; row += 1) {
    const frames = Array.from({ length: COLUMNS }, (_, col) => frameBounds(png, col, row));
    if (frames.some((frame) => frame === null)) {
      fail(`${name}:${DIRECTIONS[row]} contains an empty frame`);
      continue;
    }
    const concrete = frames;
    const bottoms = concrete.map((frame) => frame.maxY);
    const heights = concrete.map((frame) => frame.height);
    const centers = concrete.map((frame) => frame.centerX);
    const baselineDrift = Math.max(...bottoms) - Math.min(...bottoms);
    const heightDrift = Math.max(...heights) - Math.min(...heights);
    const centerDrift = Math.max(...centers) - Math.min(...centers);
    if (baselineDrift > 6) fail(`${name}:${DIRECTIONS[row]} baseline drift ${baselineDrift}px exceeds 6px`);
    if (heightDrift > 12) fail(`${name}:${DIRECTIONS[row]} height drift ${heightDrift}px exceeds 12px`);
    if (centerDrift > 10) fail(`${name}:${DIRECTIONS[row]} center drift ${centerDrift.toFixed(1)}px exceeds 10px`);
    directionSummaries.push({ direction: DIRECTIONS[row], baselineDrift, heightDrift, centerDrift: Number(centerDrift.toFixed(1)) });
  }
  const firstFrameByDirection = DIRECTIONS.map((direction, row) => ({ direction, bounds: frameBounds(png, 0, row) })).filter((entry) => entry.bounds);
  const idleBottoms = firstFrameByDirection.map((entry) => entry.bounds.maxY);
  const idleHeights = firstFrameByDirection.map((entry) => entry.bounds.height);
  const crossDirectionBaselineDrift = Math.max(...idleBottoms) - Math.min(...idleBottoms);
  const crossDirectionHeightDrift = Math.max(...idleHeights) - Math.min(...idleHeights);
  if (crossDirectionBaselineDrift > 7) fail(`${name}: cross-direction idle baseline drift ${crossDirectionBaselineDrift}px exceeds 7px`);
  if (crossDirectionHeightDrift > 14) fail(`${name}: cross-direction idle height drift ${crossDirectionHeightDrift}px exceeds 14px`);
  report.push({ name, directionSummaries, crossDirectionBaselineDrift, crossDirectionHeightDrift });
}

if (failures.length > 0) {
  console.error(`Sprite baseline QA failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(JSON.stringify({ sheets: report }, null, 2));
