import type { PropDef } from '../../data/maps';
import type { Direction } from '../../types';

type PropWithDialogue = PropDef & { dialogue_id: string };

export interface InteractionNpc {
  id: string;
  tileX: number;
  tileY: number;
}

export interface InteractionTile {
  x: number;
  y: number;
}

export interface ResolveInteractionInput {
  playerTile: InteractionTile;
  playerFacing: Direction;
  npcs: InteractionNpc[];
  props: PropDef[];
}

export type InteractionResolution =
  | { type: 'none' }
  | { type: 'npcChat'; npcId: string }
  | { type: 'starterChoice'; speciesId: string }
  | { type: 'computerChat' }
  | { type: 'propDialogue'; dialogueId: string };

export function resolveInteraction({ playerTile, playerFacing, npcs, props }: ResolveInteractionInput): InteractionResolution {
  const target = targetTile(playerTile, playerFacing);
  const npc = npcs.find((entry) => entry.tileX === target.x && entry.tileY === target.y);
  if (npc) {
    if (npc.id.startsWith('starter_')) return { type: 'starterChoice', speciesId: npc.id.replace('starter_', '') };
    return { type: 'npcChat', npcId: npc.id };
  }

  const candidates = props.filter((entry): entry is PropWithDialogue => {
    if (!entry.dialogue_id) return false;
    if (entry.x === target.x && entry.y === target.y) return true;
    return entry.interact_tiles?.some((tile) => tile.x === target.x && tile.y === target.y) ?? false;
  });
  const prop = candidates.find((entry) => entry.id === 'computer') ?? candidates[0];
  if (!prop) return { type: 'none' };
  if (prop.id === 'computer') return { type: 'computerChat' };
  return { type: 'propDialogue', dialogueId: prop.dialogue_id };
}

function targetTile(tile: InteractionTile, facing: Direction): InteractionTile {
  if (facing === 'up') return { x: tile.x, y: tile.y - 1 };
  if (facing === 'down') return { x: tile.x, y: tile.y + 1 };
  if (facing === 'left') return { x: tile.x - 1, y: tile.y };
  return { x: tile.x + 1, y: tile.y };
}
