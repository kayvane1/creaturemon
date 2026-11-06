import type { BattleStatId, Move, StatusId, TypeId } from '../types';

const SPECIAL_TYPES: TypeId[] = ['fire', 'water', 'grass', 'electric', 'ice', 'psychic', 'dragon'];

function categoryFor(type: TypeId, power: number | null): Move['category'] {
  if (power === null) return 'status';
  return SPECIAL_TYPES.includes(type) ? 'special' : 'physical';
}

interface MoveOptions {
  highCrit?: boolean;
  stat_changes?: Partial<Record<BattleStatId, number>>;
  stat_target?: 'user' | 'target';
  status_effect?: Exclude<StatusId, 'faint' | null>;
  status_chance?: number;
}

function move(id: string, display_name: string, type: TypeId, power: number | null, accuracy: number, pp: number, options: MoveOptions = {}): Move {
  return {
    id,
    display_name,
    type,
    power,
    accuracy,
    pp,
    category: categoryFor(type, power),
    ...options,
  };
}

export const MOVES: Record<string, Move> = {
  tackle: move('tackle', 'Tackle', 'normal', 35, 95, 35),
  scratch: move('scratch', 'Scratch', 'normal', 40, 100, 35),
  growl: move('growl', 'Growl', 'normal', null, 100, 40, { stat_changes: { atk: -1 }, stat_target: 'target' }),
  tail_whip: move('tail_whip', 'Tail Whip', 'normal', null, 100, 30, { stat_changes: { def: -1 }, stat_target: 'target' }),
  ember: move('ember', 'Ember', 'fire', 40, 100, 25, { status_effect: 'burn', status_chance: 10 }),
  water_gun: move('water_gun', 'Water Gun', 'water', 40, 100, 25),
  vine_whip: move('vine_whip', 'Vine Whip', 'grass', 35, 100, 10),
  gust: move('gust', 'Gust', 'normal', 40, 100, 35),
  peck: move('peck', 'Peck', 'flying', 35, 100, 35),
  leaf_dart: move('leaf_dart', 'Leaf Dart', 'grass', 45, 95, 20, { highCrit: true }),
  cinder_snap: move('cinder_snap', 'Cinder Snap', 'fire', 45, 95, 20, { status_effect: 'burn', status_chance: 20 }),
  bubble_surge: move('bubble_surge', 'Bubble Surge', 'water', 45, 95, 20, { stat_changes: { spd: -1 }, stat_target: 'target' }),
  quick_peck: move('quick_peck', 'Quick Peck', 'flying', 45, 100, 25, { highCrit: true }),
  burrow_bite: move('burrow_bite', 'Burrow Bite', 'normal', 45, 95, 25, { stat_changes: { def: -1 }, stat_target: 'target' }),
};
