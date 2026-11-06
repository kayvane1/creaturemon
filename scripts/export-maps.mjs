import { build } from 'esbuild';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url);
const tempFile = new URL('./.tmp-map-catalog.mjs', import.meta.url);
const outDir = new URL('../public/assets/maps/', import.meta.url);

await build({
  entryPoints: [new URL('../src/systems/maps/MapCatalog.ts', import.meta.url).pathname],
  outfile: tempFile.pathname,
  bundle: true,
  format: 'esm',
  platform: 'node',
  logLevel: 'silent',
});

const { MAP_IDS, getSourceMap, validateMapCatalog } = await import(pathToFileURL(tempFile.pathname).href);
await mkdir(outDir, { recursive: true });
validateMapCatalog();

for (const id of MAP_IDS) {
  const map = getSourceMap(id);
  const tiled = toTiledJson(map);
  await writeFile(join(outDir.pathname, `${map.key}.json`), `${JSON.stringify(tiled, null, 2)}\n`);
}

await rm(tempFile, { force: true });
console.log(`Exported ${MAP_IDS.length} maps to ${outDir.pathname.replace(root.pathname, '')}`);

function toTiledJson(map) {
  return {
    compressionlevel: -1,
    height: map.height,
    infinite: false,
    layers: [
      tileLayer('ground', map, map.ground),
      tileLayer('decoration', map, map.decoration),
      tileLayer('above_player', map, map.above),
      objectLayer(
        'collision',
        map.collision.flatMap((blocked, index) => {
          if (!blocked) return [];
          return [rectObject(`collision_${index}`, index % map.width, Math.floor(index / map.width), 1, 1, {})];
        }),
      ),
      objectLayer(
        'warps',
        map.warps.map((warp, index) =>
          rectObject(`warp_${index}`, warp.x, warp.y, 1, 1, {
            target_map: warp.target_map,
            target_spawn: warp.target_spawn,
            facing: warp.facing ?? '',
            blockedUntilFlag: warp.blockedUntilFlag ?? '',
            blockedText: warp.blockedText ?? '',
          }),
        ),
      ),
      objectLayer(
        'npcs',
        map.npcs.map((npc) =>
          rectObject(npc.id, npc.x, npc.y, 1, 1, {
            id: npc.id,
            sprite_key: npc.sprite_key,
            dialogue_id: npc.dialogue_id,
            facing: npc.facing,
            path: npc.path ? JSON.stringify(npc.path) : '',
          }),
        ),
      ),
      objectLayer(
        'props',
        map.props.map((prop) =>
          rectObject(prop.id, prop.x, prop.y, 1, 1, {
            id: prop.id,
            sprite_key: prop.sprite_key,
            depth: prop.depth ?? 5,
            dialogue_id: prop.dialogue_id ?? '',
            interact_tiles: prop.interact_tiles ? JSON.stringify(prop.interact_tiles) : '',
          }),
        ),
      ),
      objectLayer(
        'encounter_zones',
        map.encounterZones.map((zone) =>
          rectObject(zone.id, zone.x, zone.y, zone.width, zone.height, {
            id: zone.id,
            table: zone.table,
            requiredFlag: zone.requiredFlag ?? '',
          }),
        ),
      ),
      objectLayer(
        'spawn_points',
        map.spawns.map((spawn) =>
          rectObject(spawn.name, spawn.x, spawn.y, 1, 1, {
            name: spawn.name,
            facing: spawn.facing,
          }),
        ),
      ),
      objectLayer(
        'script_triggers',
        map.scriptTriggers.map((trigger) => rectObject(trigger.id, trigger.x, trigger.y, trigger.width, trigger.height, { id: trigger.id })),
      ),
    ],
    nextlayerid: 10,
    nextobjectid: 1,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.10.2',
    tileheight: 16,
    tilesets: [{ firstgid: 1, source: '../tilesets/placeholder.tsx' }],
    tilewidth: 16,
    type: 'map',
    version: '1.10',
    width: map.width,
  };
}

function tileLayer(name, map, data) {
  return {
    data,
    height: map.height,
    id: 0,
    name,
    opacity: 1,
    type: 'tilelayer',
    visible: true,
    width: map.width,
    x: 0,
    y: 0,
  };
}

function objectLayer(name, objects) {
  return {
    draworder: 'topdown',
    id: 0,
    name,
    objects,
    opacity: 1,
    type: 'objectgroup',
    visible: true,
    x: 0,
    y: 0,
  };
}

function rectObject(name, x, y, width, height, properties) {
  return {
    height: height * 16,
    id: 0,
    name,
    properties: Object.entries(properties).map(([propertyName, value]) => ({
      name: propertyName,
      type: typeof value === 'number' ? 'int' : typeof value === 'boolean' ? 'bool' : 'string',
      value,
    })),
    rotation: 0,
    type: '',
    visible: true,
    width: width * 16,
    x: x * 16,
    y: y * 16,
  };
}
