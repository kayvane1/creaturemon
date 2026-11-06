export type Direction = 'up' | 'down' | 'left' | 'right';

export type TypeId =
  | 'normal'
  | 'fire'
  | 'water'
  | 'grass'
  | 'electric'
  | 'ice'
  | 'fighting'
  | 'poison'
  | 'ground'
  | 'flying'
  | 'psychic'
  | 'bug'
  | 'rock'
  | 'ghost'
  | 'dragon';

export type GrowthRate = 'fast' | 'medium_fast' | 'medium_slow' | 'slow';
export type StatusId = 'faint' | 'poison' | 'burn' | 'paralyze' | 'sleep' | 'freeze' | null;
export type BattleStatId = 'atk' | 'def' | 'spc' | 'spd';

export interface Stats {
  hp: number;
  atk: number;
  def: number;
  spc: number;
  spd: number;
}

export interface Species {
  id: string;
  display_name: string;
  types: TypeId[];
  base_stats: Stats;
  base_exp: number;
  growth_rate: GrowthRate;
  learnset: { level: number; move_id: string }[];
  sprite_front: string;
  sprite_back: string;
}

export interface Move {
  id: string;
  display_name: string;
  type: TypeId;
  power: number | null;
  accuracy: number;
  pp: number;
  category: 'physical' | 'special' | 'status';
  highCrit?: boolean;
  stat_changes?: Partial<Record<BattleStatId, number>>;
  stat_target?: 'user' | 'target';
  status_effect?: Exclude<StatusId, 'faint' | null>;
  status_chance?: number;
}

export interface PokemonInstance {
  species_id: string;
  nickname: string | null;
  level: number;
  exp: number;
  current_hp: number;
  ivs: Stats;
  moves: { id: string; pp: number }[];
  status: StatusId;
}

export interface SavePlayer {
  name: string;
  map: string;
  x: number;
  y: number;
  facing: Direction;
}

export interface SaveData {
  version: 1;
  player: SavePlayer;
  party: PokemonInstance[];
  inventory?: Record<string, number>;
  rival_name: string;
  rival_starter: string | null;
  flags: Record<string, boolean>;
}

export interface WarpObject {
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, string | number | boolean>;
}

export interface DialoguePage {
  text: string;
  speaker?: string;
}

export type BattleKind = 'wild' | 'trainer';

export interface BattleRequest {
  kind: BattleKind;
  opponentName: string;
  roster: PokemonInstance[];
  canRun: boolean;
  returnMap: string;
  returnX: number;
  returnY: number;
  returnFacing: Direction;
  onWinStory?: string;
  onLoseStory?: string;
  postBattleEvent?: string;
}

export interface BattleResult {
  outcome: 'win' | 'loss' | 'run';
  kind: BattleKind;
}
