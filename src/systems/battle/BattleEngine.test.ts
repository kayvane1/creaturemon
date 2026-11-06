import { describe, expect, it } from 'vitest';
import { createPokemon } from '../../data/species';
import type { Move, PokemonInstance, Species, Stats, TypeId } from '../../types';
import { BattleEngine, FixedOpponentPolicy } from './BattleEngine';
import type { BattleCatalog } from './catalog';
import { estimateDamage, resolveDamage } from './damage';
import { ScriptedBattleRng } from './rng';
import { typeEffectiveness } from './typechart';

const testStats: Stats = { hp: 30, atk: 20, def: 20, spc: 20, spd: 10 };

function testMove(id: string, type: TypeId, power: number | null, accuracy = 100): Move {
  return {
    id,
    display_name: id.replace(/_/g, ' '),
    type,
    power,
    accuracy,
    pp: 10,
    category: power === null ? 'status' : ['fire', 'water', 'grass', 'electric', 'ice', 'psychic', 'dragon'].includes(type) ? 'special' : 'physical',
  };
}

function testSpecies(id: string, types: TypeId[]): Species {
  return {
    id,
    display_name: id,
    types,
    base_stats: testStats,
    base_exp: 10,
    growth_rate: 'medium_fast',
    learnset: [],
    sprite_front: id,
    sprite_back: id,
  };
}

const fixtureCatalog: BattleCatalog = {
  moves: {
    fire_hit: testMove('fire_hit', 'fire', 40),
    normal_hit: testMove('normal_hit', 'normal', 40),
    growl: { ...testMove('growl', 'normal', null), stat_changes: { atk: -1 }, stat_target: 'target' },
  },
  species: {
    firemon: testSpecies('firemon', ['fire']),
    normalmon: testSpecies('normalmon', ['normal']),
    ghostmon: testSpecies('ghostmon', ['ghost']),
  },
  expForLevel: (_species, level) => level * 10,
  statsFor: () => testStats,
};

function fixtureMon(speciesId: string, moveIds = ['normal_hit'], currentHp = testStats.hp): PokemonInstance {
  return {
    species_id: speciesId,
    nickname: null,
    level: 5,
    exp: 0,
    current_hp: currentHp,
    ivs: testStats,
    moves: moveIds.map((id) => ({ id, pp: fixtureCatalog.moves[id].pp })),
    status: null,
  };
}

describe('Battle rules', () => {
  it('imports and runs in the Vitest Node environment without browser globals', () => {
    expect(typeof window).toBe('undefined');
    expect(() => {
      new BattleEngine({
        player: createPokemon('char_eq', 5),
        opponent: createPokemon('bulb_eq', 5),
        opponentPolicy: new FixedOpponentPolicy('growl'),
      });
    }).not.toThrow();
  });

  it('covers the type chart including immunity', () => {
    expect(typeEffectiveness('fire', ['grass'])).toBe(2);
    expect(typeEffectiveness('grass', ['fire'])).toBe(0.5);
    expect(typeEffectiveness('normal', ['ghost'])).toBe(0);
  });

  it('resolves super-effective STAB damage with deterministic variance', () => {
    const result = resolveDamage({
      attacker: createPokemon('char_eq', 5),
      defender: createPokemon('bulb_eq', 5),
      moveId: 'cinder_snap',
      rng: new ScriptedBattleRng({ floats: [0, 1], ints: [255] }),
    });

    expect(result).toMatchObject({ damage: 15, hit: true, critical: false, effectiveness: 2 });
  });

  it('separates damage variance from deterministic estimates', () => {
    const estimate = estimateDamage({
      attacker: createPokemon('char_eq', 5),
      defender: createPokemon('bulb_eq', 5),
      moveId: 'cinder_snap',
    });
    const low = resolveDamage({
      attacker: createPokemon('char_eq', 5),
      defender: createPokemon('bulb_eq', 5),
      moveId: 'cinder_snap',
      rng: new ScriptedBattleRng({ floats: [0, 1], ints: [217] }),
    });
    const high = resolveDamage({
      attacker: createPokemon('char_eq', 5),
      defender: createPokemon('bulb_eq', 5),
      moveId: 'cinder_snap',
      rng: new ScriptedBattleRng({ floats: [0, 1], ints: [255] }),
    });

    expect(estimate.damage).toBe(15);
    expect(low.damage).toBeLessThan(high.damage);
    expect(high.damage).toBe(15);
  });

  it('can force miss, crit, and immunity without Phaser', () => {
    const miss = resolveDamage({
      attacker: createPokemon('bulb_eq', 5),
      defender: createPokemon('char_eq', 5),
      moveId: 'tackle',
      rng: new ScriptedBattleRng({ floats: [0.95] }),
    });
    const nonCrit = resolveDamage({
      attacker: createPokemon('bulb_eq', 5),
      defender: createPokemon('char_eq', 5),
      moveId: 'leaf_dart',
      rng: new ScriptedBattleRng({ floats: [0, 1], ints: [255] }),
    });
    const crit = resolveDamage({
      attacker: createPokemon('bulb_eq', 5),
      defender: createPokemon('char_eq', 5),
      moveId: 'leaf_dart',
      rng: new ScriptedBattleRng({ floats: [0, 0], ints: [255] }),
    });
    const immune = resolveDamage({
      attacker: fixtureMon('normalmon', ['normal_hit']),
      defender: fixtureMon('ghostmon', ['normal_hit']),
      moveId: 'normal_hit',
      catalog: fixtureCatalog,
      rng: new ScriptedBattleRng({ floats: [0, 1], ints: [255] }),
    });

    expect(miss).toMatchObject({ hit: false, damage: 0 });
    expect(nonCrit).toMatchObject({ critical: false, damage: 4 });
    expect(crit).toMatchObject({ critical: true, damage: 9 });
    expect(immune).toMatchObject({ hit: true, damage: 0, effectiveness: 0 });
  });

  it('applies STAB for matching move types', () => {
    const noStab = resolveDamage({
      attacker: fixtureMon('firemon', ['normal_hit']),
      defender: fixtureMon('normalmon', ['normal_hit']),
      moveId: 'normal_hit',
      catalog: fixtureCatalog,
      rng: new ScriptedBattleRng({ floats: [0, 1], ints: [255] }),
    });
    const stab = resolveDamage({
      attacker: fixtureMon('firemon', ['fire_hit']),
      defender: fixtureMon('normalmon', ['normal_hit']),
      moveId: 'fire_hit',
      catalog: fixtureCatalog,
      rng: new ScriptedBattleRng({ floats: [0, 1], ints: [255] }),
    });

    expect(stab.damage).toBeGreaterThan(noStab.damage);
  });

  it('uses scripted RNG for speed ties', () => {
    const player = fixtureMon('normalmon', ['normal_hit']);
    const opponent = fixtureMon('normalmon', ['normal_hit']);
    opponent.current_hp = 1;
    const engine = new BattleEngine({
      player,
      opponent,
      catalog: fixtureCatalog,
      rng: new ScriptedBattleRng({ floats: [0, 0, 1], ints: [255] }),
      opponentPolicy: new FixedOpponentPolicy('normal_hit'),
    });

    const result = engine.choosePlayerMove('normal_hit');

    expect(result.messages[0]).toBe('normalmon used normal hit!');
    expect(result.outcome).toBe('win');
  });

  it('tracks PP, fainting, XP, and level-up on the player reference', () => {
    const player = createPokemon('char_eq', 5);
    const opponent = createPokemon('bulb_eq', 5);
    opponent.current_hp = 1;
    const engine = new BattleEngine({
      player,
      opponent,
      rng: new ScriptedBattleRng({ floats: [0, 1], ints: [255] }),
      opponentPolicy: new FixedOpponentPolicy('growl'),
    });

    const result = engine.choosePlayerMove('scratch');

    expect(result).toMatchObject({ opponentFainted: true, battleOver: true, outcome: 'win' });
    expect(player.moves.find((move) => move.id === 'scratch')?.pp).toBe(34);
    expect(player.exp).toBeGreaterThanOrEqual(180);
    expect(player.level).toBe(6);
  });

  it('applies status and stat-stage effects deterministically', () => {
    const player = createPokemon('char_eq', 5);
    const opponent = createPokemon('bulb_eq', 5);
    const engine = new BattleEngine({
      player,
      opponent,
      rng: new ScriptedBattleRng({ floats: [0, 1, 0], ints: [255] }),
      opponentPolicy: new FixedOpponentPolicy('growl'),
    });

    const result = engine.choosePlayerMove('cinder_snap');
    const snapshot = engine.snapshot();

    expect(result.messages).toContain('Sproutle was burned!');
    expect(snapshot.opponent.mon.status).toBe('burn');
    expect(snapshot.opponent.mon.current_hp).toBeLessThan(snapshot.opponent.maxHp);
    expect(snapshot.stages.player.atk).toBe(-1);
  });

  it('rejects off-list moves and zero-PP moves', () => {
    const player = fixtureMon('normalmon', ['normal_hit']);
    const opponent = fixtureMon('normalmon', ['normal_hit']);
    player.moves[0].pp = 0;
    const engine = new BattleEngine({
      player,
      opponent,
      catalog: fixtureCatalog,
      opponentPolicy: new FixedOpponentPolicy('normal_hit'),
    });

    expect(engine.choosePlayerMove('fire_hit').messages).toEqual(['That move cannot be used.']);
    expect(engine.choosePlayerMove('normal_hit').messages).toEqual(['normal hit has no PP left!']);
  });

  it('does not consume damage variance RNG while the opponent AI estimates moves', () => {
    const rng = new ScriptedBattleRng({
      floats: [0, 0, 1, 1, 0, 1],
      ints: [255, 255],
    });
    const engine = new BattleEngine({
      player: createPokemon('bulb_eq', 5),
      opponent: createPokemon('char_eq', 5),
      rng,
    });

    engine.choosePlayerMove('tackle');

    expect(rng.calls.filter((call) => call === 'int')).toHaveLength(2);
  });
});
