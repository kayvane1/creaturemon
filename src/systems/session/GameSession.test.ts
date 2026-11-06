import { beforeEach, describe, expect, it } from 'vitest';
import { SAVE_KEY } from '../../config';
import { FLAGS } from '../../data/flags';
import { createPokemon } from '../../data/species';
import { GameState } from '../../state/GameState';
import type { BattleRequest, SaveData } from '../../types';
import { installLocalStorage } from '../../test/localStorage';
import { GameSession } from './GameSession';

function savedData(): SaveData {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) throw new Error('Expected save data');
  return JSON.parse(raw) as SaveData;
}

function rivalBattle(): BattleRequest {
  return {
    kind: 'trainer',
    opponentName: 'Blue',
    roster: [createPokemon('char_eq', 5)],
    canRun: false,
    returnMap: 'oaks_lab',
    returnX: 8,
    returnY: 10,
    returnFacing: 'up',
    postBattleEvent: 'rival_battle_1',
  };
}

describe('GameSession', () => {
  beforeEach(() => {
    installLocalStorage();
    localStorage.clear();
    GameSession.newGame({ playerName: 'Red', rivalName: 'Blue' });
    GameState.party = [createPokemon('bulb_eq', 5)];
  });

  it('saves rival battle story effects before returning to the world', () => {
    GameSession.beginBattle(rivalBattle());

    const result = GameSession.finishBattle('win');

    expect(result).toEqual({ outcome: 'win', kind: 'trainer' });
    expect(GameState.pendingBattle).toBeNull();
    expect(GameState.hasFlag(FLAGS.BEAT_RIVAL_1)).toBe(true);
    expect(GameState.hasFlag(FLAGS.ROUTE_1_CLEAR)).toBe(true);
    expect(savedData().flags).toMatchObject({
      [FLAGS.BEAT_RIVAL_1]: true,
      [FLAGS.LAB_POST_BATTLE]: true,
      [FLAGS.ROUTE_1_CLEAR]: true,
    });
    expect(GameSession.consumeWorldEntryEffects()).toEqual([{ type: 'dialogue', dialogueId: 'lab_post_battle' }]);
  });

  it('returns a wild battle run to the exact route position', () => {
    GameSession.beginBattle({
      kind: 'wild',
      opponentName: 'Wild Nibwing',
      roster: [createPokemon('bird_eq', 3)],
      canRun: true,
      returnMap: 'route_1',
      returnX: 5,
      returnY: 12,
      returnFacing: 'left',
    });

    GameSession.finishBattle('run');

    expect(GameState.map).toBe('route_1');
    expect(GameState.x).toBe(5);
    expect(GameState.y).toBe(12);
    expect(GameState.facing).toBe('left');
    expect(savedData().player).toMatchObject({ map: 'route_1', x: 5, y: 12, facing: 'left' });
  });

  it('continues map, position, party, inventory, rival data, and flags from a save', () => {
    const save: SaveData = {
      version: 1,
      player: { name: 'Leaf', map: 'route_1', x: 7, y: 9, facing: 'up' },
      party: [createPokemon('rodent_eq', 4)],
      inventory: { potion: 2 },
      rival_name: 'Gary',
      rival_starter: 'char_eq',
      flags: { [FLAGS.GOT_STARTER]: true, [FLAGS.ROUTE_1_CLEAR]: true },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));

    expect(GameSession.continueGame()).toBe(true);

    expect(GameState.playerName).toBe('Leaf');
    expect(GameState.rivalName).toBe('Gary');
    expect(GameState.map).toBe('route_1');
    expect(GameState.x).toBe(7);
    expect(GameState.y).toBe(9);
    expect(GameState.facing).toBe('up');
    expect(GameState.party[0]?.species_id).toBe('rodent_eq');
    expect(GameState.inventory).toEqual({ potion: 2 });
    expect(GameState.flags[FLAGS.ROUTE_1_CLEAR]).toBe(true);
  });

  it('rejects malformed continue data without mutating the current session', () => {
    GameState.playerName = 'StillRed';
    localStorage.setItem(SAVE_KEY, '{not json');

    expect(GameSession.continueGame()).toBe(false);

    expect(GameState.playerName).toBe('StillRed');
  });

  it('saves Codex gifts once only', () => {
    expect(GameSession.acceptCodexGift({ id: 'mom_snack' })).toBe(true);
    expect(GameState.itemCount('mom_snack')).toBe(1);
    expect(savedData().inventory?.mom_snack).toBe(1);

    expect(GameSession.acceptCodexGift({ id: 'mom_snack' })).toBe(false);
    expect(GameState.itemCount('mom_snack')).toBe(1);
  });

  it('saves menu position through the session', () => {
    GameSession.saveFromMenu({ map: 'pallet_town', x: 9, y: 13, facing: 'down' });

    expect(savedData().player).toMatchObject({ map: 'pallet_town', x: 9, y: 13, facing: 'down' });
  });
});
