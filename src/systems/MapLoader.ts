import type { MapDef } from '../data/maps';
import type { FlagId } from '../data/flags';
import type { Direction } from '../types';

export function tiledJsonToMapDef(key: string, raw: unknown): MapDef {
  const json = raw as {
    width: number;
    height: number;
    layers: Array<{ name: string; data?: number[]; objects?: TiledObject[] }>;
  };
  const layer = (name: string) => json.layers.find((entry) => entry.name === name);
  const tileData = (name: string) => (layer(name)?.data ?? []) as MapDef['ground'];
  const collision = Array.from({ length: json.width * json.height }, () => false);
  for (const object of layer('collision')?.objects ?? []) {
    const x = Math.floor(object.x / 16);
    const y = Math.floor(object.y / 16);
    const width = Math.max(1, Math.floor(object.width / 16));
    const height = Math.max(1, Math.floor(object.height / 16));
    for (let yy = y; yy < y + height; yy += 1) {
      for (let xx = x; xx < x + width; xx += 1) collision[yy * json.width + xx] = true;
    }
  }

  return {
    key,
    width: json.width,
    height: json.height,
    ground: tileData('ground'),
    decoration: tileData('decoration'),
    above: tileData('above_player'),
    collision,
    spawns: (layer('spawn_points')?.objects ?? []).map((object) => ({
      name: String(prop(object, 'name') || object.name),
      x: Math.floor(object.x / 16),
      y: Math.floor(object.y / 16),
      facing: direction(prop(object, 'facing'), 'down'),
    })),
    warps: (layer('warps')?.objects ?? []).map((object) => ({
      x: Math.floor(object.x / 16),
      y: Math.floor(object.y / 16),
      target_map: String(prop(object, 'target_map')),
      target_spawn: String(prop(object, 'target_spawn')),
      facing: optionalDirection(prop(object, 'facing')),
      blockedUntilFlag: optionalString(prop(object, 'blockedUntilFlag')),
      blockedText: optionalString(prop(object, 'blockedText')),
    })),
    npcs: (layer('npcs')?.objects ?? []).map((object) => ({
      id: String(prop(object, 'id') || object.name),
      sprite_key: String(prop(object, 'sprite_key')),
      x: Math.floor(object.x / 16),
      y: Math.floor(object.y / 16),
      facing: direction(prop(object, 'facing'), 'down'),
      dialogue_id: String(prop(object, 'dialogue_id')),
      path: parsePath(prop(object, 'path')),
    })),
    props: (layer('props')?.objects ?? []).map((object) => ({
      id: String(prop(object, 'id') || object.name),
      sprite_key: String(prop(object, 'sprite_key')),
      x: Math.floor(object.x / 16),
      y: Math.floor(object.y / 16),
      depth: optionalNumber(prop(object, 'depth')),
      dialogue_id: optionalString(prop(object, 'dialogue_id')),
      interact_tiles: parsePath(prop(object, 'interact_tiles')),
    })),
    encounterZones: (layer('encounter_zones')?.objects ?? []).map((object) => ({
      id: String(prop(object, 'id') || object.name),
      x: Math.floor(object.x / 16),
      y: Math.floor(object.y / 16),
      width: Math.max(1, Math.floor(object.width / 16)),
      height: Math.max(1, Math.floor(object.height / 16)),
      table: optionalString(prop(object, 'table')) ?? '',
      requiredFlag: optionalString(prop(object, 'requiredFlag')) as FlagId | undefined,
    })),
    scriptTriggers: (layer('script_triggers')?.objects ?? []).map((object) => ({
      id: String(prop(object, 'id') || object.name),
      x: Math.floor(object.x / 16),
      y: Math.floor(object.y / 16),
      width: Math.max(1, Math.floor(object.width / 16)),
      height: Math.max(1, Math.floor(object.height / 16)),
    })),
  };
}

interface TiledObject {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties?: Array<{ name: string; value: string | number | boolean }>;
}

function prop(object: TiledObject, name: string): string | number | boolean | undefined {
  return object.properties?.find((entry) => entry.name === name)?.value;
}

function optionalString(value: string | number | boolean | undefined): string | undefined {
  if (value === undefined || value === '') return undefined;
  return String(value);
}

function optionalDirection(value: string | number | boolean | undefined): Direction | undefined {
  if (value === undefined || value === '') return undefined;
  return direction(value, 'down');
}

function optionalNumber(value: string | number | boolean | undefined): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value.length === 0) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function direction(value: string | number | boolean | undefined, fallback: Direction): Direction {
  return value === 'up' || value === 'down' || value === 'left' || value === 'right' ? value : fallback;
}

function parsePath(value: string | number | boolean | undefined): { x: number; y: number }[] | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  try {
    const parsed = JSON.parse(value) as Array<{ x: number; y: number }>;
    return Array.isArray(parsed) ? parsed.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y)) : undefined;
  } catch {
    return undefined;
  }
}
