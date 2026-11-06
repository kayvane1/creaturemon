import { FLAGS, type FlagId } from './flags';
import type { Direction } from '../types';

export type TileId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface SpawnPoint {
  name: string;
  x: number;
  y: number;
  facing: Direction;
}

export interface WarpDef {
  x: number;
  y: number;
  target_map: string;
  target_spawn: string;
  facing?: Direction;
  blockedUntilFlag?: string;
  blockedText?: string;
}

export interface NpcDef {
  id: string;
  sprite_key: string;
  x: number;
  y: number;
  facing: Direction;
  dialogue_id: string;
  path?: { x: number; y: number }[];
}

export interface EncounterZoneDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  table: string;
  requiredFlag?: FlagId;
}

export interface ScriptTriggerDef {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PropDef {
  id: string;
  sprite_key: string;
  x: number;
  y: number;
  depth?: number;
  dialogue_id?: string;
  interact_tiles?: { x: number; y: number }[];
}

export interface MapDef {
  key: string;
  width: number;
  height: number;
  ground: TileId[];
  decoration: TileId[];
  above: TileId[];
  collision: boolean[];
  spawns: SpawnPoint[];
  warps: WarpDef[];
  npcs: NpcDef[];
  props: PropDef[];
  encounterZones: EncounterZoneDef[];
  scriptTriggers: ScriptTriggerDef[];
}

const legend: Record<string, TileId> = {
  '.': 1,
  ',': 2,
  '#': 3,
  '~': 4,
  '=': 5,
  '+': 6,
  ':': 7,
  '^': 8,
  ' ': 0,
};

function mapTiles(rows: string[]): TileId[] {
  return rows.flatMap((row) => [...row].map((char) => legend[char] ?? 1));
}

function empty(width: number, height: number): TileId[] {
  return Array.from({ length: width * height }, () => 0 as TileId);
}

function walls(width: number, height: number, extra: Array<[number, number]> = []): boolean[] {
  const data = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    return x === 0 || y === 0 || x === width - 1 || y === height - 1;
  });
  for (const [x, y] of extra) data[y * width + x] = true;
  return data;
}

function rect(blocks: boolean[], width: number, x: number, y: number, w: number, h: number): void {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      blocks[yy * width + xx] = true;
    }
  }
}

function clear(blocks: boolean[], width: number, x: number, y: number): void {
  blocks[y * width + x] = false;
}

function frontOfRect(x: number, y: number, w: number, h: number, side: 'up' | 'down' | 'left' | 'right' = 'down'): { x: number; y: number }[] {
  if (side === 'up') return Array.from({ length: w }, (_, offset) => ({ x: x + offset, y }));
  if (side === 'left') return Array.from({ length: h }, (_, offset) => ({ x, y: y + offset }));
  if (side === 'right') return Array.from({ length: h }, (_, offset) => ({ x: x + w - 1, y: y + offset }));
  return Array.from({ length: w }, (_, offset) => ({ x: x + offset, y: y + h - 1 }));
}

const bedroomCollision = walls(12, 9);
rect(bedroomCollision, 12, 1, 1, 3, 2);
rect(bedroomCollision, 12, 4, 1, 2, 1);
rect(bedroomCollision, 12, 8, 1, 3, 2);
clear(bedroomCollision, 12, 5, 7);
clear(bedroomCollision, 12, 10, 7);

const downstairsCollision = walls(12, 9);
rect(downstairsCollision, 12, 1, 1, 3, 2);
rect(downstairsCollision, 12, 8, 1, 2, 2);
rect(downstairsCollision, 12, 6, 3, 3, 1);
rect(downstairsCollision, 12, 1, 5, 3, 2);
rect(downstairsCollision, 12, 10, 1, 1, 1);
downstairsCollision[8 * 12 + 6] = false;

const rivalHouseCollision = walls(12, 9);
rect(rivalHouseCollision, 12, 1, 1, 4, 2);
rect(rivalHouseCollision, 12, 8, 1, 3, 2);
rect(rivalHouseCollision, 12, 1, 5, 2, 2);
rect(rivalHouseCollision, 12, 6, 4, 3, 1);
clear(rivalHouseCollision, 12, 6, 8);

const townCollision = walls(20, 16);
rect(townCollision, 20, 2, 4, 5, 3);
rect(townCollision, 20, 12, 3, 5, 3);
rect(townCollision, 20, 6, 10, 6, 4);
rect(townCollision, 20, 7, 7, 1, 1);
rect(townCollision, 20, 18, 6, 1, 1);
rect(townCollision, 20, 15, 11, 2, 1);
rect(townCollision, 20, 2, 8, 2, 1);
rect(townCollision, 20, 12, 14, 2, 1);
rect(townCollision, 20, 1, 12, 2, 1);
rect(townCollision, 20, 17, 12, 2, 1);
rect(townCollision, 20, 1, 1, 1, 1);
rect(townCollision, 20, 17, 1, 1, 1);
for (let x = 8; x <= 11; x += 1) townCollision[14 * 20 + x] = false;
clear(townCollision, 20, 4, 7);
clear(townCollision, 20, 14, 6);
clear(townCollision, 20, 8, 14);
for (let y = 0; y < 3; y += 1) townCollision[y * 20 + 9] = false;

const labCollision = walls(16, 12);
rect(labCollision, 16, 2, 1, 4, 2);
rect(labCollision, 16, 10, 1, 4, 2);
rect(labCollision, 16, 1, 5, 2, 2);
rect(labCollision, 16, 13, 5, 2, 2);
rect(labCollision, 16, 1, 8, 3, 1);
rect(labCollision, 16, 6, 1, 4, 3);
rect(labCollision, 16, 6, 3, 4, 1);
rect(labCollision, 16, 5, 5, 6, 2);
labCollision[10 * 16 + 7] = false;
labCollision[10 * 16 + 8] = false;
labCollision[11 * 16 + 8] = false;

const routeCollision = walls(16, 24);
for (let y = 22; y < 24; y += 1) routeCollision[y * 16 + 7] = false;
for (let y = 0; y < 2; y += 1) routeCollision[y * 16 + 7] = false;

const viridianCollision = walls(18, 12);
for (let y = 10; y < 12; y += 1) viridianCollision[y * 18 + 8] = false;

export const MAPS: Record<string, MapDef> = {
  bedroom: {
    key: 'bedroom',
    width: 12,
    height: 9,
    ground: mapTiles(['============', '============', '============', '============', '============', '============', '============', '============', '============']),
    decoration: empty(12, 9),
    above: empty(12, 9),
    collision: bedroomCollision,
    spawns: [{ name: 'start', x: 5, y: 6, facing: 'down' }],
    warps: [
      { x: 5, y: 7, target_map: 'house_downstairs', target_spawn: 'stairs', facing: 'down' },
      { x: 10, y: 7, target_map: 'house_downstairs', target_spawn: 'stairs', facing: 'down' },
    ],
    props: [
      { id: 'bed', sprite_key: 'prop_bed', x: 1, y: 1, depth: 6, dialogue_id: 'bedroom_bed', interact_tiles: frontOfRect(1, 1, 3, 2) },
      { id: 'desk', sprite_key: 'prop_desk', x: 8, y: 1, depth: 6, dialogue_id: 'bedroom_desk', interact_tiles: frontOfRect(8, 1, 2, 1) },
      { id: 'computer', sprite_key: 'prop_computer', x: 9, y: 1, depth: 7, dialogue_id: 'player_pc', interact_tiles: [{ x: 9, y: 2 }, { x: 10, y: 2 }] },
      { id: 'desk_chair', sprite_key: 'prop_chair', x: 8, y: 2, depth: 6 },
      { id: 'dresser', sprite_key: 'prop_dresser', x: 4, y: 1, depth: 6, dialogue_id: 'bedroom_dresser', interact_tiles: frontOfRect(4, 1, 2, 1) },
      { id: 'bookshelf', sprite_key: 'prop_bookshelf', x: 10, y: 1, depth: 6, dialogue_id: 'bedroom_bookshelf', interact_tiles: [{ x: 10, y: 3 }, { x: 11, y: 2 }] },
      { id: 'rug', sprite_key: 'prop_rug_blue', x: 4, y: 5, depth: 1 },
      { id: 'stairs_main', sprite_key: 'prop_stairs_down', x: 5, y: 7, depth: 5, dialogue_id: 'stairs_down', interact_tiles: [{ x: 5, y: 6 }] },
      { id: 'stairs_corner', sprite_key: 'prop_stairs_down', x: 10, y: 7, depth: 5, dialogue_id: 'stairs_down', interact_tiles: [{ x: 10, y: 6 }] },
      { id: 'stairs_glow', sprite_key: 'prop_door_highlight', x: 5, y: 7, depth: 6 },
    ],
    npcs: [],
    encounterZones: [],
    scriptTriggers: [],
  },
  house_downstairs: {
    key: 'house_downstairs',
    width: 12,
    height: 9,
    ground: mapTiles(['============', '============', '============', '============', '============', '============', '============', '============', '============']),
    decoration: empty(12, 9),
    above: empty(12, 9),
    collision: downstairsCollision,
    spawns: [
      { name: 'stairs', x: 10, y: 7, facing: 'down' },
      { name: 'front_door', x: 6, y: 7, facing: 'up' },
    ],
    warps: [
      { x: 10, y: 7, target_map: 'bedroom', target_spawn: 'start', facing: 'left' },
      { x: 6, y: 8, target_map: 'pallet_town', target_spawn: 'from_house', facing: 'down' },
    ],
    props: [
      { id: 'kitchen_table', sprite_key: 'prop_table', x: 1, y: 1, depth: 6, dialogue_id: 'home_table', interact_tiles: frontOfRect(1, 1, 2, 2) },
      { id: 'tv', sprite_key: 'prop_tv', x: 8, y: 1, depth: 6, dialogue_id: 'home_tv', interact_tiles: frontOfRect(8, 1, 2, 2) },
      { id: 'couch', sprite_key: 'prop_couch', x: 6, y: 3, depth: 6, dialogue_id: 'home_couch', interact_tiles: frontOfRect(6, 3, 3, 1) },
      { id: 'kitchen', sprite_key: 'prop_kitchen', x: 1, y: 5, depth: 6, dialogue_id: 'home_kitchen', interact_tiles: frontOfRect(1, 5, 3, 2, 'right') },
      { id: 'plant', sprite_key: 'prop_plant', x: 10, y: 1, depth: 6, dialogue_id: 'home_plant', interact_tiles: [{ x: 10, y: 2 }] },
      { id: 'picture', sprite_key: 'prop_picture', x: 5, y: 1, depth: 6, dialogue_id: 'home_picture', interact_tiles: [{ x: 5, y: 2 }] },
      { id: 'welcome_mat', sprite_key: 'prop_mat', x: 5, y: 7, depth: 4 },
      { id: 'stairs_up', sprite_key: 'prop_stairs_up', x: 10, y: 7, depth: 5, dialogue_id: 'stairs_up', interact_tiles: [{ x: 10, y: 6 }] },
      { id: 'front_door', sprite_key: 'prop_door_threshold', x: 6, y: 8, depth: 5, dialogue_id: 'home_front_door', interact_tiles: [{ x: 6, y: 7 }] },
      { id: 'front_door_glow', sprite_key: 'prop_door_highlight', x: 6, y: 8, depth: 6 },
    ],
    npcs: [{ id: 'mom', sprite_key: 'npc_mom_overworld', x: 5, y: 4, facing: 'down', dialogue_id: 'mom' }],
    encounterZones: [],
    scriptTriggers: [{ id: 'intro_mom', x: 3, y: 3, width: 7, height: 4 }],
  },
  rival_house: {
    key: 'rival_house',
    width: 12,
    height: 9,
    ground: mapTiles(['============', '============', '============', '============', '============', '============', '============', '============', '============']),
    decoration: empty(12, 9),
    above: empty(12, 9),
    collision: rivalHouseCollision,
    spawns: [{ name: 'front_door', x: 6, y: 7, facing: 'up' }],
    warps: [{ x: 6, y: 8, target_map: 'pallet_town', target_spawn: 'from_rival_house', facing: 'down' }],
    props: [
      { id: 'rival_table', sprite_key: 'prop_table', x: 1, y: 1, depth: 6, dialogue_id: 'rival_house_table', interact_tiles: frontOfRect(1, 1, 4, 2) },
      { id: 'rival_bookshelf', sprite_key: 'prop_bookshelf', x: 8, y: 1, depth: 6, dialogue_id: 'rival_house_bookshelf', interact_tiles: frontOfRect(8, 1, 3, 2) },
      { id: 'rival_tv', sprite_key: 'prop_tv', x: 1, y: 5, depth: 6, dialogue_id: 'rival_house_tv', interact_tiles: frontOfRect(1, 5, 2, 2, 'right') },
      { id: 'rival_desk', sprite_key: 'prop_desk', x: 6, y: 4, depth: 6, dialogue_id: 'rival_house_desk', interact_tiles: frontOfRect(6, 4, 2, 1) },
      { id: 'rival_plant', sprite_key: 'prop_plant', x: 10, y: 1, depth: 6, dialogue_id: 'home_plant', interact_tiles: [{ x: 10, y: 3 }] },
      { id: 'rival_mat', sprite_key: 'prop_mat', x: 5, y: 7, depth: 4 },
      { id: 'rival_front_door', sprite_key: 'prop_door_threshold', x: 6, y: 8, depth: 5, dialogue_id: 'rival_house_front_door', interact_tiles: [{ x: 6, y: 7 }] },
      { id: 'rival_front_door_glow', sprite_key: 'prop_door_highlight', x: 6, y: 8, depth: 6 },
    ],
    npcs: [{ id: 'rival_sibling', sprite_key: 'npc_townie_kid_overworld', x: 8, y: 6, facing: 'left', dialogue_id: 'rival_house_sibling' }],
    encounterZones: [],
    scriptTriggers: [],
  },
  pallet_town: {
    key: 'pallet_town',
    width: 20,
    height: 16,
    ground: mapTiles([
      '####################',
      '#.......,,,........#',
      '#.......,,,........#',
      '#..................#',
      '#.#####.....######.#',
      '#.#####.....######.#',
      '#.#####.....######.#',
      '#..................#',
      '#..................#',
      '#..................#',
      '#......######......#',
      '#......######......#',
      '#......######......#',
      '#......######......#',
      '#.......,,,,.......#',
      '#########,,#########',
    ]),
    decoration: empty(20, 16),
    above: empty(20, 16),
    collision: townCollision,
    spawns: [
      { name: 'from_house', x: 4, y: 8, facing: 'down' },
      { name: 'from_rival_house', x: 14, y: 7, facing: 'down' },
      { name: 'from_lab', x: 8, y: 14, facing: 'down' },
      { name: 'from_route_1', x: 9, y: 2, facing: 'down' },
    ],
    warps: [
      { x: 4, y: 7, target_map: 'house_downstairs', target_spawn: 'front_door', facing: 'up' },
      { x: 14, y: 6, target_map: 'rival_house', target_spawn: 'front_door', facing: 'up' },
      { x: 8, y: 14, target_map: 'oaks_lab', target_spawn: 'door', facing: 'up' },
      { x: 9, y: 0, target_map: 'route_1', target_spawn: 'south', facing: 'up', blockedUntilFlag: 'route_1_clear', blockedText: 'A stern voice calls out: Wait! Do not go into the grass alone!' },
    ],
    props: [
      { id: 'player_house', sprite_key: 'prop_house_player', x: 2, y: 3, depth: 3, dialogue_id: 'player_house_sign', interact_tiles: [{ x: 4, y: 8 }] },
      { id: 'rival_house', sprite_key: 'prop_house_rival', x: 12, y: 2, depth: 3, dialogue_id: 'rival_house_sign', interact_tiles: [{ x: 14, y: 7 }] },
      { id: 'oak_lab', sprite_key: 'prop_house_lab', x: 6, y: 9, depth: 3, dialogue_id: 'lab_sign', interact_tiles: [{ x: 8, y: 15 }] },
      { id: 'home_door', sprite_key: 'prop_door_threshold', x: 4, y: 7, depth: 5, dialogue_id: 'home_exterior_door', interact_tiles: [{ x: 4, y: 8 }] },
      { id: 'home_door_glow', sprite_key: 'prop_door_highlight', x: 4, y: 7, depth: 6 },
      { id: 'rival_door', sprite_key: 'prop_door_threshold', x: 14, y: 6, depth: 5, dialogue_id: 'rival_exterior_door', interact_tiles: [{ x: 14, y: 7 }] },
      { id: 'rival_door_glow', sprite_key: 'prop_door_highlight', x: 14, y: 6, depth: 6 },
      { id: 'lab_door', sprite_key: 'prop_door_threshold', x: 8, y: 14, depth: 5, dialogue_id: 'lab_exterior_door', interact_tiles: [{ x: 8, y: 15 }] },
      { id: 'lab_door_glow', sprite_key: 'prop_door_highlight', x: 8, y: 14, depth: 6 },
      { id: 'home_mailbox', sprite_key: 'prop_mailbox', x: 7, y: 7, depth: 5, dialogue_id: 'home_mailbox', interact_tiles: frontOfRect(7, 7, 1, 1) },
      { id: 'rival_mailbox', sprite_key: 'prop_mailbox', x: 18, y: 6, depth: 5, dialogue_id: 'rival_mailbox', interact_tiles: [{ x: 17, y: 6 }, { x: 18, y: 7 }] },
      { id: 'flowers_home', sprite_key: 'prop_flowers', x: 2, y: 8, depth: 5 },
      { id: 'flowers_lab', sprite_key: 'prop_flowers', x: 12, y: 14, depth: 5 },
      { id: 'town_sign', sprite_key: 'prop_route_marker', x: 15, y: 11, depth: 5, dialogue_id: 'town_sign', interact_tiles: frontOfRect(15, 11, 2, 1) },
      { id: 'north_tree_l', sprite_key: 'prop_small_tree', x: 1, y: 1, depth: 5 },
      { id: 'north_tree_r', sprite_key: 'prop_small_tree', x: 17, y: 1, depth: 5 },
      { id: 'shrub_l', sprite_key: 'prop_shrub', x: 1, y: 12, depth: 5 },
      { id: 'shrub_r', sprite_key: 'prop_shrub', x: 17, y: 12, depth: 5 },
      { id: 'route_arrow', sprite_key: 'prop_exit_arrow_up', x: 9, y: 1, depth: 5 },
    ],
    npcs: [
      { id: 'townie_1', sprite_key: 'npc_townie_overworld', x: 14, y: 9, facing: 'left', dialogue_id: 'townie_1', path: [{ x: 14, y: 9 }, { x: 15, y: 9 }, { x: 15, y: 10 }, { x: 14, y: 10 }] },
      { id: 'townie_2', sprite_key: 'npc_townie_kid_overworld', x: 5, y: 13, facing: 'right', dialogue_id: 'townie_2', path: [{ x: 5, y: 13 }, { x: 5, y: 12 }, { x: 4, y: 12 }, { x: 4, y: 13 }] },
    ],
    encounterZones: [],
    scriptTriggers: [{ id: 'oak_intercept', x: 8, y: 1, width: 3, height: 2 }],
  },
  oaks_lab: {
    key: 'oaks_lab',
    width: 16,
    height: 12,
    ground: mapTiles(['================', '================', '================', '================', '================', '================', '================', '================', '================', '================', '================', '================']),
    decoration: empty(16, 12),
    above: empty(16, 12),
    collision: labCollision,
    spawns: [{ name: 'door', x: 8, y: 10, facing: 'up' }],
    warps: [{ x: 8, y: 11, target_map: 'pallet_town', target_spawn: 'from_lab', facing: 'down', blockedUntilFlag: 'route_1_clear', blockedText: 'Oak says: Stay until your match is finished.' }],
    props: [
      { id: 'bookcase_l', sprite_key: 'prop_bookshelf', x: 2, y: 1, depth: 6, dialogue_id: 'lab_bookshelf', interact_tiles: frontOfRect(2, 1, 4, 2) },
      { id: 'bookcase_r', sprite_key: 'prop_bookshelf', x: 12, y: 1, depth: 6, dialogue_id: 'lab_bookshelf', interact_tiles: frontOfRect(10, 1, 4, 2) },
      { id: 'lab_machine', sprite_key: 'prop_lab_machine', x: 6, y: 1, depth: 6, dialogue_id: 'lab_machine', interact_tiles: frontOfRect(6, 1, 4, 3) },
      { id: 'lab_terminal_l', sprite_key: 'prop_lab_terminal', x: 1, y: 5, depth: 6, dialogue_id: 'lab_terminal', interact_tiles: frontOfRect(1, 5, 2, 2, 'right') },
      { id: 'lab_terminal_r', sprite_key: 'prop_lab_terminal', x: 13, y: 5, depth: 6, dialogue_id: 'lab_terminal', interact_tiles: frontOfRect(13, 5, 2, 2, 'left') },
      { id: 'specimen_jars', sprite_key: 'prop_specimen_jars', x: 1, y: 8, depth: 6, dialogue_id: 'lab_specimens', interact_tiles: frontOfRect(1, 8, 3, 1) },
      { id: 'whiteboard', sprite_key: 'prop_whiteboard', x: 6, y: 0, depth: 6, dialogue_id: 'lab_whiteboard', interact_tiles: [{ x: 7, y: 4 }, { x: 8, y: 4 }] },
      { id: 'oak_desk', sprite_key: 'prop_professor_desk', x: 6, y: 3, depth: 19, dialogue_id: 'oak_desk', interact_tiles: frontOfRect(6, 3, 4, 1) },
      { id: 'starter_table', sprite_key: 'prop_lab_table', x: 5, y: 5, depth: 5, dialogue_id: 'starter_table', interact_tiles: frontOfRect(5, 5, 6, 2) },
      { id: 'lab_exit', sprite_key: 'prop_door_threshold', x: 8, y: 11, depth: 5, dialogue_id: 'lab_exit_door', interact_tiles: [{ x: 8, y: 10 }] },
      { id: 'lab_exit_glow', sprite_key: 'prop_door_highlight', x: 8, y: 11, depth: 6 },
    ],
    npcs: [
      { id: 'oak', sprite_key: 'npc_oak_overworld', x: 8, y: 3, facing: 'down', dialogue_id: 'oak_lab' },
      { id: 'rival', sprite_key: 'npc_rival_overworld', x: 12, y: 7, facing: 'left', dialogue_id: 'rival_lab' },
      { id: 'starter_bulb_eq', sprite_key: 'ball', x: 6, y: 6, facing: 'down', dialogue_id: 'starter_bulb_eq' },
      { id: 'starter_char_eq', sprite_key: 'ball', x: 8, y: 6, facing: 'down', dialogue_id: 'starter_char_eq' },
      { id: 'starter_squirt_eq', sprite_key: 'ball', x: 10, y: 6, facing: 'down', dialogue_id: 'starter_squirt_eq' },
    ],
    encounterZones: [],
    scriptTriggers: [],
  },
  route_1: {
    key: 'route_1',
    width: 16,
    height: 24,
    ground: mapTiles([
      '#######,,#######',
      '#......,,......#',
      '#..,,,,,,,,,,..#',
      '#..,,,,,,,,,,..#',
      '#......,,......#',
      '#......,,......#',
      '#..,,,,,,,,,,..#',
      '#..,,,,,,,,,,..#',
      '#......,,......#',
      '#......,,......#',
      '#..,,,,,,,,,,..#',
      '#..,,,,,,,,,,..#',
      '#......,,......#',
      '#......,,......#',
      '#..,,,,,,,,,,..#',
      '#..,,,,,,,,,,..#',
      '#......,,......#',
      '#......,,......#',
      '#..,,,,,,,,,,..#',
      '#..,,,,,,,,,,..#',
      '#......,,......#',
      '#......,,......#',
      '#######,,#######',
      '#######,,#######',
    ]),
    decoration: empty(16, 24),
    above: empty(16, 24),
    collision: routeCollision,
    spawns: [
      { name: 'south', x: 7, y: 22, facing: 'up' },
      { name: 'north', x: 7, y: 1, facing: 'down' },
    ],
    warps: [
      { x: 7, y: 23, target_map: 'pallet_town', target_spawn: 'from_route_1', facing: 'down' },
      { x: 7, y: 0, target_map: 'viridian_stub', target_spawn: 'south', facing: 'up' },
    ],
    props: [
      { id: 'south_exit', sprite_key: 'prop_exit_arrow_down', x: 7, y: 22, depth: 5 },
      { id: 'north_exit', sprite_key: 'prop_exit_arrow_up', x: 7, y: 1, depth: 5 },
      { id: 'route_marker', sprite_key: 'prop_route_marker', x: 10, y: 20, depth: 5 },
      { id: 'grass_rustle_1', sprite_key: 'prop_grass_rustle', x: 4, y: 3, depth: 5 },
      { id: 'grass_rustle_2', sprite_key: 'prop_grass_rustle', x: 11, y: 7, depth: 5 },
      { id: 'route_shrub_1', sprite_key: 'prop_shrub', x: 1, y: 6, depth: 5 },
      { id: 'route_shrub_2', sprite_key: 'prop_shrub', x: 13, y: 12, depth: 5 },
      { id: 'route_tree_1', sprite_key: 'prop_small_tree', x: 1, y: 15, depth: 5 },
    ],
    npcs: [{ id: 'route_tips', sprite_key: 'npc_townie_trainer_overworld', x: 12, y: 5, facing: 'left', dialogue_id: 'route_tips', path: [{ x: 12, y: 5 }, { x: 12, y: 6 }, { x: 11, y: 6 }, { x: 11, y: 5 }] }],
    encounterZones: [{ id: 'route_1_grass', x: 2, y: 2, width: 12, height: 18, table: 'route_1', requiredFlag: FLAGS.ROUTE_1_CLEAR }],
    scriptTriggers: [],
  },
  viridian_stub: {
    key: 'viridian_stub',
    width: 18,
    height: 12,
    ground: mapTiles([
      '##################',
      '#................#',
      '#................#',
      '#....######......#',
      '#....######......#',
      '#................#',
      '#................#',
      '#................#',
      '#................#',
      '#.......,,.......#',
      '########,,########',
      '########,,########',
    ]),
    decoration: empty(18, 12),
    above: empty(18, 12),
    collision: viridianCollision,
    spawns: [{ name: 'south', x: 8, y: 10, facing: 'up' }],
    warps: [{ x: 8, y: 11, target_map: 'route_1', target_spawn: 'north', facing: 'down' }],
    props: [
      { id: 'return_exit', sprite_key: 'prop_exit_arrow_down', x: 8, y: 10, depth: 5 },
      { id: 'city_sign', sprite_key: 'prop_sign', x: 7, y: 4, depth: 5 },
    ],
    npcs: [],
    encounterZones: [],
    scriptTriggers: [{ id: 'viridian_to_be_continued', x: 6, y: 2, width: 6, height: 6 }],
  },
};
