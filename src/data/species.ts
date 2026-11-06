import type { PokemonInstance, Species, Stats } from '../types';
import { MOVES } from './moves';

export const SPECIES: Record<string, Species> = {
  bulb_eq: {
    id: 'bulb_eq',
    display_name: 'Sproutle',
    types: ['grass'],
    base_stats: { hp: 45, atk: 49, def: 49, spc: 65, spd: 45 },
    base_exp: 64,
    growth_rate: 'medium_slow',
    learnset: [
      { level: 1, move_id: 'tackle' },
      { level: 1, move_id: 'growl' },
      { level: 5, move_id: 'leaf_dart' },
      { level: 7, move_id: 'vine_whip' },
    ],
    sprite_front: 'tuxemon_shybulb',
    sprite_back: 'tuxemon_shybulb',
  },
  char_eq: {
    id: 'char_eq',
    display_name: 'Kindlett',
    types: ['fire'],
    base_stats: { hp: 39, atk: 52, def: 43, spc: 50, spd: 65 },
    base_exp: 65,
    growth_rate: 'medium_slow',
    learnset: [
      { level: 1, move_id: 'scratch' },
      { level: 1, move_id: 'growl' },
      { level: 5, move_id: 'cinder_snap' },
      { level: 9, move_id: 'ember' },
    ],
    sprite_front: 'tuxemon_knindling',
    sprite_back: 'tuxemon_knindling',
  },
  squirt_eq: {
    id: 'squirt_eq',
    display_name: 'Shelldrop',
    types: ['water'],
    base_stats: { hp: 44, atk: 48, def: 65, spc: 50, spd: 43 },
    base_exp: 66,
    growth_rate: 'medium_slow',
    learnset: [
      { level: 1, move_id: 'tackle' },
      { level: 1, move_id: 'tail_whip' },
      { level: 5, move_id: 'bubble_surge' },
      { level: 8, move_id: 'water_gun' },
    ],
    sprite_front: 'tuxemon_forturtle',
    sprite_back: 'tuxemon_forturtle',
  },
  bird_eq: {
    id: 'bird_eq',
    display_name: 'Nibwing',
    types: ['normal', 'flying'],
    base_stats: { hp: 40, atk: 45, def: 40, spc: 35, spd: 56 },
    base_exp: 55,
    growth_rate: 'medium_slow',
    learnset: [
      { level: 1, move_id: 'gust' },
      { level: 5, move_id: 'peck' },
      { level: 7, move_id: 'quick_peck' },
    ],
    sprite_front: 'tuxemon_birdee',
    sprite_back: 'tuxemon_birdee',
  },
  rodent_eq: {
    id: 'rodent_eq',
    display_name: 'Nibblit',
    types: ['normal'],
    base_stats: { hp: 30, atk: 56, def: 35, spc: 25, spd: 72 },
    base_exp: 57,
    growth_rate: 'medium_fast',
    learnset: [
      { level: 1, move_id: 'tackle' },
      { level: 1, move_id: 'tail_whip' },
      { level: 5, move_id: 'burrow_bite' },
    ],
    sprite_front: 'tuxemon_squabbit',
    sprite_back: 'tuxemon_squabbit',
  },
};

export function expForLevel(species: Species, level: number): number {
  if (species.growth_rate === 'fast') return Math.floor((4 * level ** 3) / 5);
  if (species.growth_rate === 'slow') return Math.floor((5 * level ** 3) / 4);
  if (species.growth_rate === 'medium_slow') {
    return Math.floor((6 / 5) * level ** 3 - 15 * level ** 2 + 100 * level - 140);
  }
  return level ** 3;
}

export function statsFor(species: Species, level: number, ivs: Stats): Stats {
  return {
    hp: Math.floor(((species.base_stats.hp + ivs.hp) * 2 * level) / 100) + level + 10,
    atk: Math.floor(((species.base_stats.atk + ivs.atk) * 2 * level) / 100) + 5,
    def: Math.floor(((species.base_stats.def + ivs.def) * 2 * level) / 100) + 5,
    spc: Math.floor(((species.base_stats.spc + ivs.spc) * 2 * level) / 100) + 5,
    spd: Math.floor(((species.base_stats.spd + ivs.spd) * 2 * level) / 100) + 5,
  };
}

export function createPokemon(speciesId: string, level: number): PokemonInstance {
  const species = SPECIES[speciesId];
  const ivs: Stats = { hp: 15, atk: 15, def: 15, spc: 15, spd: 15 };
  const stats = statsFor(species, level, ivs);
  const moveIds = species.learnset.filter((entry) => entry.level <= level).slice(-4).map((entry) => entry.move_id);

  return {
    species_id: speciesId,
    nickname: null,
    level,
    exp: expForLevel(species, level),
    current_hp: stats.hp,
    ivs,
    moves: moveIds.map((id) => ({ id, pp: MOVES[id].pp })),
    status: null,
  };
}
