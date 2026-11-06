import { MAPS, type MapDef, type NpcDef, type PropDef, type SpawnPoint, type WarpDef } from '../../data/maps';
import type { Direction } from '../../types';
import { tiledJsonToMapDef } from '../MapLoader';
import { validateEncounterReferencesForMap } from '../encounters/EncounterRuntime';
import { validateStoryReferencesForMap } from '../scripts/story';

export const MAP_IDS = [
  'bedroom',
  'house_downstairs',
  'rival_house',
  'pallet_town',
  'oaks_lab',
  'route_1',
  'viridian_stub',
] as const;

export type MapId = (typeof MAP_IDS)[number];
export type MapCatalogRecord = Record<MapId, MapDef>;

const REQUIRED_LAYERS = ['ground', 'decoration', 'above', 'collision'] as const;
let runtimeCatalog: MapCatalogRecord | null = null;

export function preloadMaps(loader: { json(key: string, url: string): unknown }): void {
  MAP_IDS.forEach((id) => loader.json(mapCacheKey(id), `assets/maps/${id}.json`));
}

export function mapCacheKey(id: MapId): string {
  return `map_${id}`;
}

export function installRuntimeMapCatalog(cache: { json: { get(key: string): unknown } }): void {
  const rawMaps = Object.fromEntries(MAP_IDS.map((id) => [id, cache.json.get(mapCacheKey(id))])) as Partial<Record<MapId, unknown>>;
  runtimeCatalog = normalizeMapCatalog(rawMaps);
}

export function getMap(id: string): MapDef {
  if (!isMapId(id)) throw new Error(`Unknown map "${id}"`);
  return (runtimeCatalog ?? sourceMapCatalog())[id];
}

export function getSourceMap(id: MapId): MapDef {
  return MAPS[id];
}

export function sourceMapCatalog(): MapCatalogRecord {
  return Object.fromEntries(MAP_IDS.map((id) => [id, MAPS[id]])) as MapCatalogRecord;
}

export function resolveWarp(_fromMap: MapDef, warp: WarpDef): { map: MapDef; spawn: SpawnPoint; facing: Direction } {
  const target = getMap(warp.target_map);
  const spawn = target.spawns.find((entry) => entry.name === warp.target_spawn);
  if (!spawn) throw new Error(`Map "${target.key}" is missing spawn "${warp.target_spawn}"`);
  return { map: target, spawn, facing: warp.facing ?? spawn.facing };
}

export function normalizeMapCatalog(rawMaps: Partial<Record<MapId, unknown>> = {}): MapCatalogRecord {
  const maps = Object.fromEntries(
    MAP_IDS.map((id) => {
      const raw = rawMaps[id];
      return [id, raw ? tiledJsonToMapDef(id, raw) : MAPS[id]];
    }),
  ) as MapCatalogRecord;
  validateMapCatalog(maps);
  return maps;
}

export function validateMapCatalog(catalog: MapCatalogRecord = runtimeCatalog ?? sourceMapCatalog()): void {
  const ids = new Set<string>();
  for (const id of MAP_IDS) {
    if (ids.has(id)) throw new Error(`Duplicate map id "${id}"`);
    ids.add(id);
    const map = catalog[id];
    if (!map) throw new Error(`Missing map "${id}"`);
    validateMap(id, map, catalog);
  }
}

function validateMap(expectedId: MapId, map: MapDef, catalog: MapCatalogRecord): void {
  if (map.key !== expectedId) throw new Error(`Map "${expectedId}" has mismatched key "${map.key}"`);
  if (!Number.isInteger(map.width) || !Number.isInteger(map.height) || map.width <= 0 || map.height <= 0) {
    throw new Error(`Map "${map.key}" has invalid dimensions`);
  }

  const expectedCells = map.width * map.height;
  for (const layer of REQUIRED_LAYERS) {
    if (map[layer].length !== expectedCells) throw new Error(`Map "${map.key}" layer "${layer}" has ${map[layer].length} cells; expected ${expectedCells}`);
  }

  assertUnique(map.key, 'spawn', map.spawns.map((spawn) => spawn.name));
  assertUnique(map.key, 'npc', map.npcs.map((npc) => npc.id));
  assertUnique(map.key, 'prop', map.props.map((prop) => prop.id));
  assertUnique(map.key, 'encounter zone', map.encounterZones.map((zone) => zone.id));
  assertUnique(map.key, 'script trigger', map.scriptTriggers.map((trigger) => trigger.id));

  map.spawns.forEach((spawn) => assertPoint(map, spawn.x, spawn.y, `spawn "${spawn.name}"`));
  map.warps.forEach((warp) => {
    assertPoint(map, warp.x, warp.y, `warp to "${warp.target_map}.${warp.target_spawn}"`);
    if (!isMapId(warp.target_map) || !catalog[warp.target_map]) throw new Error(`Map "${map.key}" has warp to unknown map "${warp.target_map}"`);
    if (!catalog[warp.target_map].spawns.some((spawn) => spawn.name === warp.target_spawn)) {
      throw new Error(`Map "${map.key}" has warp to missing spawn "${warp.target_map}.${warp.target_spawn}"`);
    }
  });
  map.npcs.forEach((npc) => assertNpc(map, npc));
  map.props.forEach((prop) => assertProp(map, prop));
  map.encounterZones.forEach((zone) => assertRect(map, zone.x, zone.y, zone.width, zone.height, `encounter zone "${zone.id}"`));
  map.scriptTriggers.forEach((trigger) => assertRect(map, trigger.x, trigger.y, trigger.width, trigger.height, `script trigger "${trigger.id}"`));

  validateEncounterReferencesForMap(map);
  validateStoryReferencesForMap(map);
}

function assertNpc(map: MapDef, npc: NpcDef): void {
  assertPoint(map, npc.x, npc.y, `npc "${npc.id}"`);
  npc.path?.forEach((point, index) => assertPoint(map, point.x, point.y, `npc "${npc.id}" path ${index}`));
}

function assertProp(map: MapDef, prop: PropDef): void {
  assertPoint(map, prop.x, prop.y, `prop "${prop.id}"`);
  prop.interact_tiles?.forEach((point, index) => assertPoint(map, point.x, point.y, `prop "${prop.id}" interact tile ${index}`));
}

function assertRect(map: MapDef, x: number, y: number, width: number, height: number, label: string): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) throw new Error(`Map "${map.key}" ${label} has invalid size`);
  assertPoint(map, x, y, label);
  assertPoint(map, x + width - 1, y + height - 1, label);
}

function assertPoint(map: MapDef, x: number, y: number, label: string): void {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= map.width || y >= map.height) {
    throw new Error(`Map "${map.key}" ${label} (${x},${y}) is out of bounds`);
  }
}

function assertUnique(mapKey: string, label: string, values: string[]): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) throw new Error(`Map "${mapKey}" has duplicate ${label} id "${value}"`);
    seen.add(value);
  }
}

function isMapId(id: string): id is MapId {
  return (MAP_IDS as readonly string[]).includes(id);
}
