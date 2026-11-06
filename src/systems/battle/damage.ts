import type { BattleStatId, Move, PokemonInstance, Stats } from '../../types';
import { DATA_BATTLE_CATALOG, type BattleCatalog } from './catalog';
import type { BattleRng } from './rng';
import { typeEffectiveness } from './typechart';

export interface DamageResult {
  damage: number;
  hit: boolean;
  critical: boolean;
  effectiveness: number;
  message: string;
}

export type BattleStatStages = Record<BattleStatId, number>;

export interface DamageInput {
  attacker: PokemonInstance;
  defender: PokemonInstance;
  moveId: string;
  attackerStages?: BattleStatStages;
  defenderStages?: BattleStatStages;
  catalog?: BattleCatalog;
}

export interface DamageEstimate {
  baseDamage: number;
  damage: number;
  effectiveness: number;
  stab: number;
  critChance: number;
}

export function estimateDamage({
  attacker,
  defender,
  moveId,
  attackerStages = neutralStages(),
  defenderStages = neutralStages(),
  catalog = DATA_BATTLE_CATALOG,
}: DamageInput): DamageEstimate {
  const move = catalog.moves[moveId];
  const attackerSpecies = catalog.species[attacker.species_id];
  const defenderSpecies = catalog.species[defender.species_id];

  if (move.power === null) {
    return { baseDamage: 0, damage: 0, effectiveness: 1, stab: 1, critChance: 0 };
  }

  const atkStats = applyBattleStages(catalog.statsFor(attackerSpecies, attacker.level, attacker.ivs), attackerStages);
  const defStats = applyBattleStages(catalog.statsFor(defenderSpecies, defender.level, defender.ivs), defenderStages);
  const attack = move.category === 'special' ? atkStats.spc : atkStats.atk;
  const defense = move.category === 'special' ? defStats.spc : defStats.def;
  const critChance = Math.min(1, (atkStats.spd / 512) * (move.highCrit ? 8 : 1));
  const stab = attackerSpecies.types.includes(move.type) ? 1.5 : 1;
  const effectiveness = typeEffectiveness(move.type, defenderSpecies.types);
  const baseDamage = Math.floor(Math.floor(Math.floor((((2 * attacker.level) / 5 + 2) * move.power * (attack / defense)) / 50) + 2));
  const damage = effectiveness === 0 ? 0 : Math.max(1, Math.floor(baseDamage * stab * effectiveness));

  return { baseDamage, damage, effectiveness, stab, critChance };
}

export function resolveDamage(input: DamageInput & { rng: BattleRng }): DamageResult {
  const catalog = input.catalog ?? DATA_BATTLE_CATALOG;
  const move = catalog.moves[input.moveId];

  if (move.power === null) {
    return { damage: 0, hit: true, critical: false, effectiveness: 1, message: `${move.display_name} had no effect yet.` };
  }

  if (input.rng.float() * 100 >= move.accuracy) {
    return { damage: 0, hit: false, critical: false, effectiveness: 1, message: `${move.display_name} missed!` };
  }

  const estimate = estimateDamage({ ...input, catalog });
  const critical = input.rng.float() < estimate.critChance;
  const variance = input.rng.intInclusive(217, 255) / 255;
  const damage = Math.max(1, Math.floor(estimate.baseDamage * estimate.stab * estimate.effectiveness * (critical ? 2 : 1) * variance));

  return {
    damage: estimate.effectiveness === 0 ? 0 : damage,
    hit: true,
    critical,
    effectiveness: estimate.effectiveness,
    message: damageMessage(move, estimate.effectiveness === 0 ? 0 : damage, critical, estimate.effectiveness),
  };
}

export function neutralStages(): BattleStatStages {
  return { atk: 0, def: 0, spc: 0, spd: 0 };
}

export function applyBattleStages(stats: Stats, stages: BattleStatStages): Stats {
  return {
    ...stats,
    atk: Math.max(1, Math.floor(stats.atk * stageMultiplier(stages.atk))),
    def: Math.max(1, Math.floor(stats.def * stageMultiplier(stages.def))),
    spc: Math.max(1, Math.floor(stats.spc * stageMultiplier(stages.spc))),
    spd: Math.max(1, Math.floor(stats.spd * stageMultiplier(stages.spd))),
  };
}

function stageMultiplier(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

function damageMessage(move: Move, damage: number, critical: boolean, effectiveness: number): string {
  if (effectiveness === 0 || damage === 0) return `${move.display_name} had no effect.`;
  if (critical) return `A critical ${move.display_name}!`;
  if (effectiveness > 1) return `${move.display_name} was super effective!`;
  if (effectiveness < 1) return `${move.display_name} was not very effective.`;
  return `${move.display_name} hit!`;
}
