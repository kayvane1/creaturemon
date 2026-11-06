import type Phaser from 'phaser';
import { SPECIES } from '../../data/species';
import type { MapDef, TileId } from '../../data/maps';
import type { Species } from '../../types';

const VISUAL_BASE = 'assets/visual_upgrade';
const CHARACTER_BASE = 'assets/sprites/characters/upgraded';

export interface ImageAsset {
  key: string;
  path: string;
}

export interface SpriteSheetAsset extends ImageAsset {
  frameWidth: number;
  frameHeight: number;
}

export interface CharacterSheetAsset extends SpriteSheetAsset {
  name: string;
  scale: number;
}

export const TILE_ASSETS: Record<TileId, ImageAsset | null> = {
  0: null,
  1: { key: 'tile_1', path: `${VISUAL_BASE}/tiles/tile_1.png` },
  2: { key: 'tile_2', path: `${VISUAL_BASE}/tiles/tile_2.png` },
  3: { key: 'tile_3', path: `${VISUAL_BASE}/tiles/tile_3.png` },
  4: null,
  5: { key: 'tile_5', path: `${VISUAL_BASE}/tiles/tile_5.png` },
  6: null,
  7: null,
  8: null,
  9: null,
};

export const CHARACTER_SHEETS: CharacterSheetAsset[] = [
  { name: 'player', key: 'player_overworld', path: `${CHARACTER_BASE}/player_hoodie_walk.png`, frameWidth: 64, frameHeight: 64, scale: 0.57 },
  { name: 'npc_mom', key: 'npc_mom_overworld', path: `${CHARACTER_BASE}/mom_walk.png`, frameWidth: 64, frameHeight: 64, scale: 0.57 },
  { name: 'npc_oak', key: 'npc_oak_overworld', path: `${CHARACTER_BASE}/professor_walk.png`, frameWidth: 64, frameHeight: 64, scale: 0.52 },
  { name: 'npc_rival', key: 'npc_rival_overworld', path: `${CHARACTER_BASE}/rival_walk.png`, frameWidth: 64, frameHeight: 64, scale: 0.59 },
  { name: 'npc_townie', key: 'npc_townie_overworld', path: `${CHARACTER_BASE}/townie_adult_walk.png`, frameWidth: 64, frameHeight: 64, scale: 0.57 },
  { name: 'npc_townie_kid', key: 'npc_townie_kid_overworld', path: `${CHARACTER_BASE}/townie_kid_walk.png`, frameWidth: 64, frameHeight: 64, scale: 0.5 },
  { name: 'npc_townie_trainer', key: 'npc_townie_trainer_overworld', path: `${CHARACTER_BASE}/townie_trainer_walk.png`, frameWidth: 64, frameHeight: 64, scale: 0.57 },
];

export const CREATURE_SHEETS: SpriteSheetAsset[] = [
  { key: 'tuxemon_shybulb', path: `${VISUAL_BASE}/creatures/tuxemon_shybulb_sheet.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'tuxemon_knindling', path: `${VISUAL_BASE}/creatures/tuxemon_knindling_sheet.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'tuxemon_forturtle', path: `${VISUAL_BASE}/creatures/tuxemon_forturtle_sheet.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'tuxemon_birdee', path: `${VISUAL_BASE}/creatures/tuxemon_birdee_sheet.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'tuxemon_squabbit', path: `${VISUAL_BASE}/creatures/tuxemon_squabbit_sheet.png`, frameWidth: 64, frameHeight: 64 },
  { key: 'battle_effects', path: `${VISUAL_BASE}/effects/battle_effects.png`, frameWidth: 32, frameHeight: 32 },
];

export const BATTLE_BACKGROUNDS: Record<'route' | 'lab', ImageAsset> = {
  route: { key: 'battle_bg_route', path: `${VISUAL_BASE}/battle/battle_bg_route.png` },
  lab: { key: 'battle_bg_lab', path: `${VISUAL_BASE}/battle/battle_bg_lab.png` },
};

export const UI_ASSETS: Record<string, ImageAsset> = {
  cursor: { key: 'ui_cursor', path: `${VISUAL_BASE}/ui/cursor.png` },
  continueArrow: { key: 'ui_continue_arrow', path: `${VISUAL_BASE}/ui/continue_arrow.png` },
};

export const PROP_ASSETS: ImageAsset[] = [
  'prop_bed',
  'prop_bookshelf',
  'prop_chair',
  'prop_computer',
  'prop_couch',
  'prop_desk',
  'prop_door_highlight',
  'prop_door_threshold',
  'prop_dresser',
  'prop_exit_arrow_down',
  'prop_exit_arrow_up',
  'prop_flowers',
  'prop_grass_rustle',
  'prop_house_lab',
  'prop_house_player',
  'prop_house_rival',
  'prop_kitchen',
  'prop_lab_machine',
  'prop_lab_table',
  'prop_lab_terminal',
  'prop_mailbox',
  'prop_mat',
  'prop_picture',
  'prop_plant',
  'prop_professor_desk',
  'prop_route_marker',
  'prop_rug_blue',
  'prop_shrub',
  'prop_sign',
  'prop_small_tree',
  'prop_specimen_jars',
  'prop_stairs_down',
  'prop_stairs_up',
  'prop_starter_ball',
  'prop_starter_ball_open',
  'prop_table',
  'prop_tv',
  'prop_whiteboard',
].map((key) => ({ key, path: `${VISUAL_BASE}/props/${key}.png` }));

export const PROP_ALIASES: ImageAsset[] = [
  { key: 'ball', path: `${VISUAL_BASE}/props/prop_starter_ball.png` },
  { key: 'ball_open', path: `${VISUAL_BASE}/props/prop_starter_ball_open.png` },
];

const ALL_IMAGE_ASSETS = [
  ...Object.values(TILE_ASSETS).filter((asset): asset is ImageAsset => asset !== null),
  ...Object.values(BATTLE_BACKGROUNDS),
  ...Object.values(UI_ASSETS),
  ...PROP_ASSETS,
  ...PROP_ALIASES,
];

const ALL_SPRITE_SHEETS = [...CHARACTER_SHEETS, ...CREATURE_SHEETS];
const KNOWN_TEXTURE_KEYS = new Set([...ALL_IMAGE_ASSETS.map((asset) => asset.key), ...ALL_SPRITE_SHEETS.map((asset) => asset.key)]);

export function loadAssetCatalog(scene: Phaser.Scene): void {
  for (const asset of ALL_IMAGE_ASSETS) scene.load.image(asset.key, asset.path);
  for (const sheet of ALL_SPRITE_SHEETS) scene.load.spritesheet(sheet.key, sheet.path, { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
}

export function createCatalogAnimations(scene: Phaser.Scene): void {
  const directions = ['down', 'left', 'right', 'up'];
  for (const entry of CHARACTER_SHEETS) {
    directions.forEach((direction, row) => {
      const start = row * 6;
      scene.anims.create({ key: `${entry.name}_idle_${direction}`, frames: [{ key: entry.key, frame: start }], frameRate: 1 });
      scene.anims.create({
        key: `${entry.name}_walk_${direction}`,
        frames: scene.anims.generateFrameNumbers(entry.key, { start, end: start + 5 }),
        frameRate: 8,
        repeat: -1,
      });
    });
  }
}

export function characterScale(textureKey: string): number {
  return CHARACTER_SHEETS.find((entry) => entry.key === textureKey)?.scale ?? 0.57;
}

export function battleSprite(speciesId: string, side: 'player' | 'opponent'): { key: string; frame: number } {
  const species = SPECIES[speciesId];
  return {
    key: side === 'player' ? species.sprite_back : species.sprite_front,
    frame: side === 'player' ? 1 : 0,
  };
}

export function battleBackground(returnMap: string): string {
  return returnMap === 'oaks_lab' ? BATTLE_BACKGROUNDS.lab.key : BATTLE_BACKGROUNDS.route.key;
}

export function battleEffectFrame(moveId: string): number {
  if (moveId === 'scratch' || moveId === 'burrow_bite') return 1;
  if (moveId === 'vine_whip' || moveId === 'leaf_dart' || moveId === 'gust' || moveId === 'peck' || moveId === 'quick_peck') return 2;
  if (moveId === 'ember' || moveId === 'cinder_snap') return 3;
  if (moveId === 'water_gun' || moveId === 'bubble_surge') return 4;
  return 0;
}

export function validateMapAssetKeys(map: MapDef): void {
  const tileIds = [...map.ground, ...map.decoration, ...map.above];
  for (const tileId of tileIds) {
    if (tileId === 0) continue;
    const tileAsset = TILE_ASSETS[tileId];
    if (!tileAsset) throw new Error(`Map "${map.key}" references tile "${tileId}" without a catalog asset`);
  }
  for (const npc of map.npcs) assertTextureKey(map.key, `NPC "${npc.id}"`, npc.sprite_key);
  for (const prop of map.props) assertTextureKey(map.key, `prop "${prop.id}"`, prop.sprite_key);
}

export function validateAssetCatalog(maps: MapDef[]): void {
  for (const map of maps) validateMapAssetKeys(map);
  for (const species of Object.values(SPECIES)) validateSpeciesAssetKeys(species);
  Object.values(BATTLE_BACKGROUNDS).forEach((asset) => assertGlobalKey('battle background', asset.key));
  Object.values(UI_ASSETS).forEach((asset) => assertGlobalKey('UI asset', asset.key));
}

function validateSpeciesAssetKeys(species: Species): void {
  assertGlobalKey(`species "${species.id}" front sprite`, species.sprite_front);
  assertGlobalKey(`species "${species.id}" back sprite`, species.sprite_back);
}

function assertTextureKey(mapKey: string, label: string, key: string): void {
  if (!KNOWN_TEXTURE_KEYS.has(key)) throw new Error(`Map "${mapKey}" ${label} references unknown asset key "${key}"`);
}

function assertGlobalKey(label: string, key: string): void {
  if (!KNOWN_TEXTURE_KEYS.has(key)) throw new Error(`${label} references unknown asset key "${key}"`);
}
