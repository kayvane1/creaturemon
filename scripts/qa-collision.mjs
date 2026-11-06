import { build } from 'esbuild';
import { readFile, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const tempFile = new URL('./.tmp-qa-map-catalog.mjs', import.meta.url);

await build({
  entryPoints: [new URL('../src/systems/maps/MapCatalog.ts', import.meta.url).pathname],
  outfile: tempFile.pathname,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});

const { MAP_IDS, normalizeMapCatalog, validateMapCatalog } = await import(pathToFileURL(tempFile.pathname).href);
await rm(tempFile, { force: true });

const rawMaps = {};
for (const id of MAP_IDS) {
  const file = new URL(`../public/assets/maps/${id}.json`, import.meta.url);
  rawMaps[id] = JSON.parse(await readFile(file, 'utf8'));
}

const MAPS = normalizeMapCatalog(rawMaps);
validateMapCatalog(MAPS);

const failures = [];

function fail(message) {
  failures.push(message);
}

function inBounds(map, x, y) {
  return x >= 0 && y >= 0 && x < map.width && y < map.height;
}

function blocked(map, x, y) {
  return map.collision[y * map.width + x];
}

function expectOpen(mapKey, x, y, label) {
  const map = MAPS[mapKey];
  if (!inBounds(map, x, y)) fail(`${mapKey}:${label} (${x},${y}) is out of bounds`);
  else if (blocked(map, x, y)) fail(`${mapKey}:${label} (${x},${y}) should be walkable`);
}

function expectBlockedRect(mapKey, x, y, width, height, label, openings = []) {
  const map = MAPS[mapKey];
  const open = new Set(openings.map(([xx, yy]) => `${xx},${yy}`));
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      if (open.has(`${xx},${yy}`)) continue;
      if (!inBounds(map, xx, yy)) fail(`${mapKey}:${label} (${xx},${yy}) is out of bounds`);
      else if (!blocked(map, xx, yy)) fail(`${mapKey}:${label} (${xx},${yy}) should be blocked`);
    }
  }
}

for (const map of Object.values(MAPS)) {
  const expectedCells = map.width * map.height;
  for (const layer of ['ground', 'decoration', 'above', 'collision']) {
    if (map[layer].length !== expectedCells) fail(`${map.key}:${layer} has ${map[layer].length} cells; expected ${expectedCells}`);
  }
  for (const warp of map.warps) expectOpen(map.key, warp.x, warp.y, `warp to ${warp.target_map}.${warp.target_spawn}`);
  for (const spawn of map.spawns) expectOpen(map.key, spawn.x, spawn.y, `spawn ${spawn.name}`);
  for (const prop of map.props) {
    if (!inBounds(map, prop.x, prop.y)) fail(`${map.key}:prop ${prop.id} origin is out of bounds`);
    for (const tile of prop.interact_tiles ?? []) {
      if (!inBounds(map, tile.x, tile.y)) fail(`${map.key}:prop ${prop.id} interact tile (${tile.x},${tile.y}) is out of bounds`);
    }
  }
}

expectBlockedRect('pallet_town', 2, 4, 5, 3, 'player house footprint');
expectBlockedRect('pallet_town', 12, 3, 5, 3, 'rival house footprint');
expectBlockedRect('pallet_town', 6, 10, 6, 4, 'oak lab footprint');
expectOpen('pallet_town', 4, 3, 'player house upper roof edge');
expectOpen('pallet_town', 14, 2, 'rival house upper roof edge');
expectOpen('pallet_town', 8, 9, 'oak lab upper roof edge');
expectOpen('pallet_town', 4, 7, 'player house threshold');
expectOpen('pallet_town', 14, 6, 'rival house threshold');
expectOpen('pallet_town', 8, 14, 'oak lab threshold');

expectBlockedRect('oaks_lab', 5, 5, 6, 2, 'starter table and capsules');
expectOpen('oaks_lab', 6, 7, 'left starter interaction lane');
expectOpen('oaks_lab', 8, 7, 'middle starter interaction lane');
expectOpen('oaks_lab', 10, 7, 'right starter interaction lane');
expectOpen('oaks_lab', 8, 11, 'lab exit');

expectBlockedRect('bedroom', 1, 1, 3, 2, 'bed footprint');
expectBlockedRect('house_downstairs', 6, 3, 3, 1, 'couch footprint');
expectBlockedRect('rival_house', 1, 1, 4, 2, 'rival table footprint');
expectOpen('rival_house', 6, 8, 'rival house exit');

const requiredInteractiveProps = [
  ['bedroom', 'computer'],
  ['bedroom', 'bookshelf'],
  ['house_downstairs', 'tv'],
  ['pallet_town', 'home_mailbox'],
  ['pallet_town', 'rival_mailbox'],
  ['pallet_town', 'town_sign'],
  ['oaks_lab', 'lab_machine'],
  ['oaks_lab', 'whiteboard'],
  ['oaks_lab', 'starter_table'],
  ['rival_house', 'rival_bookshelf'],
  ['rival_house', 'rival_tv'],
];

for (const [mapKey, propId] of requiredInteractiveProps) {
  const prop = MAPS[mapKey].props.find((entry) => entry.id === propId);
  if (!prop) fail(`${mapKey}:${propId} is missing`);
  else if (!prop.dialogue_id) fail(`${mapKey}:${propId} has no dialogue_id`);
}

if (failures.length > 0) {
  console.error(`Collision QA failed with ${failures.length} issue(s):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Collision QA passed across ${Object.keys(MAPS).length} maps.`);
