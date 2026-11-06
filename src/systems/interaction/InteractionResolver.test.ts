import { describe, expect, it } from 'vitest';
import type { PropDef } from '../../data/maps';
import { resolveInteraction, type InteractionNpc } from './InteractionResolver';

const npc = (id: string, tileX: number, tileY: number): InteractionNpc => ({ id, tileX, tileY });
const prop = (id: string, x: number, y: number, dialogue_id: string, interact_tiles?: Array<{ x: number; y: number }>): PropDef => ({
  id,
  x,
  y,
  sprite_key: id,
  dialogue_id,
  interact_tiles,
});

describe('InteractionResolver', () => {
  it('resolves normal NPC chat before props', () => {
    expect(
      resolveInteraction({
        playerTile: { x: 5, y: 5 },
        playerFacing: 'up',
        npcs: [npc('townie_1', 5, 4)],
        props: [prop('sign', 5, 4, 'town_sign')],
      }),
    ).toEqual({ type: 'npcChat', npcId: 'townie_1' });
  });

  it('resolves starter balls before normal NPC chat behavior', () => {
    expect(
      resolveInteraction({
        playerTile: { x: 8, y: 7 },
        playerFacing: 'up',
        npcs: [npc('starter_char_eq', 8, 6)],
        props: [],
      }),
    ).toEqual({ type: 'starterChoice', speciesId: 'char_eq' });
  });

  it('prioritizes computer chat over overlapping prop dialogue', () => {
    expect(
      resolveInteraction({
        playerTile: { x: 9, y: 3 },
        playerFacing: 'up',
        npcs: [],
        props: [prop('desk', 9, 2, 'bedroom_desk'), prop('computer', 9, 1, 'player_pc', [{ x: 9, y: 2 }])],
      }),
    ).toEqual({ type: 'computerChat' });
  });

  it('resolves a prop hotspot on the target tile', () => {
    expect(
      resolveInteraction({
        playerTile: { x: 4, y: 7 },
        playerFacing: 'up',
        npcs: [],
        props: [prop('sign', 4, 6, 'town_sign')],
      }),
    ).toEqual({ type: 'propDialogue', dialogueId: 'town_sign' });
  });

  it('returns the first overlapping prop dialogue in map order', () => {
    expect(
      resolveInteraction({
        playerTile: { x: 1, y: 3 },
        playerFacing: 'up',
        npcs: [],
        props: [prop('bookshelf', 1, 1, 'bookshelf', [{ x: 1, y: 2 }]), prop('poster', 1, 1, 'poster', [{ x: 1, y: 2 }])],
      }),
    ).toEqual({ type: 'propDialogue', dialogueId: 'bookshelf' });
  });

  it('resolves empty targets to none', () => {
    expect(
      resolveInteraction({
        playerTile: { x: 0, y: 0 },
        playerFacing: 'right',
        npcs: [],
        props: [],
      }),
    ).toEqual({ type: 'none' });
  });
});
