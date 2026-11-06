import type { BattleStatId, Move, PokemonInstance, Species, StatusId } from '../../types';
import { DATA_BATTLE_CATALOG, type BattleCatalog } from './catalog';
import { applyBattleStages, estimateDamage, neutralStages, resolveDamage, type BattleStatStages, type DamageResult } from './damage';
import { MathBattleRng, clamp, type BattleRng } from './rng';

type BattleSide = 'player' | 'opponent';

export interface BattleMoveSnapshot {
  id: string;
  displayName: string;
  pp: number;
  maxPp: number;
}

export interface BattlePokemonSnapshot {
  mon: PokemonInstance;
  species: Species;
  maxHp: number;
  moves: BattleMoveSnapshot[];
}

export interface BattleSnapshot {
  player: BattlePokemonSnapshot;
  opponent: BattlePokemonSnapshot;
  stages: Record<BattleSide, BattleStatStages>;
}

export interface BattleActionResult {
  messages: string[];
  playerFainted: boolean;
  opponentFainted: boolean;
  battleOver: boolean;
  outcome?: 'win' | 'loss';
}

export interface OpponentPolicyInput {
  player: PokemonInstance;
  opponent: PokemonInstance;
  stages: Record<BattleSide, BattleStatStages>;
  catalog: BattleCatalog;
  rng: BattleRng;
}

export interface OpponentPolicy {
  chooseMove(input: OpponentPolicyInput): string;
}

export class HeuristicOpponentPolicy implements OpponentPolicy {
  chooseMove({ player, opponent, stages, catalog, rng }: OpponentPolicyInput): string {
    const usable = opponent.moves.filter((entry) => entry.pp > 0);
    const pool = usable.length ? usable : opponent.moves;
    const scored = pool.map((entry) => {
      const move = catalog.moves[entry.id];
      const damage =
        move.power === null
          ? 0
          : estimateDamage({
              attacker: opponent,
              defender: player,
              moveId: entry.id,
              attackerStages: stages.opponent,
              defenderStages: stages.player,
              catalog,
            }).damage;
      const utility = move.power === null ? 8 : damage;
      const finisher = damage >= player.current_hp ? 100 : 0;
      return { id: entry.id, score: utility + finisher };
    });
    scored.sort((a, b) => b.score - a.score);
    return rng.chance(72) ? scored[0].id : pool[rng.pickIndex(pool.length)].id;
  }
}

export class FixedOpponentPolicy implements OpponentPolicy {
  constructor(private readonly moveId: string) {}

  chooseMove(): string {
    return this.moveId;
  }
}

export interface BattleEngineOptions {
  player: PokemonInstance;
  opponent: PokemonInstance;
  catalog?: BattleCatalog;
  rng?: BattleRng;
  opponentPolicy?: OpponentPolicy;
}

export class BattleEngine {
  private readonly player: PokemonInstance;
  private readonly opponent: PokemonInstance;
  private readonly catalog: BattleCatalog;
  private readonly rng: BattleRng;
  private readonly opponentPolicy: OpponentPolicy;
  private stages: Record<BattleSide, BattleStatStages> = {
    player: neutralStages(),
    opponent: neutralStages(),
  };

  constructor({ player, opponent, catalog = DATA_BATTLE_CATALOG, rng = new MathBattleRng(), opponentPolicy = new HeuristicOpponentPolicy() }: BattleEngineOptions) {
    this.player = player;
    this.opponent = structuredClone(opponent);
    this.catalog = catalog;
    this.rng = rng;
    this.opponentPolicy = opponentPolicy;
  }

  availablePlayerMoves(): Move[] {
    return this.player.moves.map((entry) => this.catalog.moves[entry.id]).filter(Boolean);
  }

  choosePlayerMove(moveId: string): BattleActionResult {
    const playerMoveEntry = this.player.moves.find((entry) => entry.id === moveId);
    const move = this.catalog.moves[moveId];
    if (!move || !playerMoveEntry) {
      return this.invalidMove(`That move cannot be used.`);
    }
    if (playerMoveEntry.pp <= 0) {
      return this.invalidMove(`${move.display_name} has no PP left!`);
    }

    const opponentMove = this.opponentPolicy.chooseMove({
      player: this.player,
      opponent: this.opponent,
      stages: this.stages,
      catalog: this.catalog,
      rng: this.rng,
    });
    const playerSpeed = this.effectiveSpeed(this.player, this.stages.player);
    const opponentSpeed = this.effectiveSpeed(this.opponent, this.stages.opponent);
    const playerFirst = playerSpeed === opponentSpeed ? this.rng.chance(50) : playerSpeed > opponentSpeed;
    const messages: string[] = [];

    const first = playerFirst
      ? { user: this.player, target: this.opponent, moveId, label: 'player' as const }
      : { user: this.opponent, target: this.player, moveId: opponentMove, label: 'opponent' as const };
    const second = playerFirst
      ? { user: this.opponent, target: this.player, moveId: opponentMove, label: 'opponent' as const }
      : { user: this.player, target: this.opponent, moveId, label: 'player' as const };

    this.applyMove(first.user, first.target, first.moveId, first.label, messages);
    if (this.isFainted(first.target)) return this.finishTurn(messages);

    this.applyMove(second.user, second.target, second.moveId, second.label, messages);
    return this.finishTurn(messages);
  }

  snapshot(): BattleSnapshot {
    return {
      player: this.snapshotPokemon(this.player),
      opponent: this.snapshotPokemon(this.opponent),
      stages: {
        player: { ...this.stages.player },
        opponent: { ...this.stages.opponent },
      },
    };
  }

  recoverPlayerAfterBattle(): void {
    if (this.player.current_hp > 0) return;
    this.player.current_hp = Math.max(1, Math.floor(this.maxHp(this.player) / 2));
    this.player.status = null;
  }

  private applyMove(user: PokemonInstance, target: PokemonInstance, moveId: string, label: BattleSide, messages: string[]): DamageResult {
    const species = this.catalog.species[user.species_id];
    const move = this.catalog.moves[moveId];
    const ppEntry = user.moves.find((entry) => entry.id === moveId);
    if (!move || !ppEntry) return this.emptyResult('That move cannot be used.', messages);
    if (ppEntry.pp <= 0) return this.emptyResult(`${move.display_name} has no PP left!`, messages);
    ppEntry.pp -= 1;

    messages.push(`${label === 'player' ? species.display_name : `Foe ${species.display_name}`} used ${move.display_name}!`);
    if (this.isFullyParalyzed(user)) return this.emptyResult(`${species.display_name} is fully paralyzed!`, messages);

    const userStages = this.stages[label];
    const targetLabel = label === 'player' ? 'opponent' : 'player';
    const targetStages = this.stages[targetLabel];
    const result = resolveDamage({
      attacker: user,
      defender: target,
      moveId,
      attackerStages: userStages,
      defenderStages: targetStages,
      catalog: this.catalog,
      rng: this.rng,
    });
    if (move.power !== null) {
      target.current_hp = Math.max(0, target.current_hp - result.damage);
      messages.push(result.message);
    }
    if (result.hit && !this.isFainted(target)) this.applyMoveEffects(user, target, move, label, messages);
    return result;
  }

  private finishTurn(messages: string[]): BattleActionResult {
    this.applyEndOfTurnStatus(messages);
    const playerFainted = this.isFainted(this.player);
    const opponentFainted = this.isFainted(this.opponent);
    if (opponentFainted) {
      const xp = this.grantXp();
      messages.push(`Foe ${this.catalog.species[this.opponent.species_id].display_name} fainted!`);
      messages.push(`${this.catalog.species[this.player.species_id].display_name} gained ${xp} XP.`);
    }
    if (playerFainted) messages.push(`${this.catalog.species[this.player.species_id].display_name} fainted!`);
    return {
      messages,
      playerFainted,
      opponentFainted,
      battleOver: playerFainted || opponentFainted,
      outcome: opponentFainted ? 'win' : playerFainted ? 'loss' : undefined,
    };
  }

  private isFainted(mon: PokemonInstance): boolean {
    if (mon.current_hp <= 0) {
      mon.current_hp = 0;
      mon.status = 'faint';
      return true;
    }
    return false;
  }

  private grantXp(): number {
    const opponentSpecies = this.catalog.species[this.opponent.species_id];
    const gained = Math.floor((opponentSpecies.base_exp * this.opponent.level) / 7);
    const playerSpecies = this.catalog.species[this.player.species_id];
    this.player.exp += gained;
    const nextLevel = this.player.level + 1;
    if (this.player.exp >= this.catalog.expForLevel(playerSpecies, nextLevel)) {
      const oldMaxHp = this.catalog.statsFor(playerSpecies, this.player.level, this.player.ivs).hp;
      this.player.level = nextLevel;
      const newMaxHp = this.catalog.statsFor(playerSpecies, this.player.level, this.player.ivs).hp;
      this.player.current_hp += newMaxHp - oldMaxHp;
      this.player.status = null;
    }
    return gained;
  }

  private effectiveSpeed(mon: PokemonInstance, stages: BattleStatStages): number {
    const stats = applyBattleStages(this.catalog.statsFor(this.catalog.species[mon.species_id], mon.level, mon.ivs), stages);
    return mon.status === 'paralyze' ? Math.max(1, Math.floor(stats.spd / 4)) : stats.spd;
  }

  private applyMoveEffects(user: PokemonInstance, target: PokemonInstance, move: Move, label: BattleSide, messages: string[]): void {
    if (move.stat_changes) {
      const affectedLabel = move.stat_target === 'user' ? label : label === 'player' ? 'opponent' : 'player';
      const affected = move.stat_target === 'user' ? user : target;
      for (const [stat, delta] of Object.entries(move.stat_changes) as [BattleStatId, number][]) {
        const stages = this.stages[affectedLabel];
        const before = stages[stat];
        stages[stat] = clamp(before + delta, -6, 6);
        messages.push(this.statMessage(affected, stat, before, stages[stat]));
      }
    }

    if (move.status_effect && !target.status && this.rng.chance(move.status_chance ?? 100)) {
      target.status = move.status_effect;
      messages.push(`${this.catalog.species[target.species_id].display_name} ${this.statusVerb(move.status_effect)}!`);
    }
  }

  private applyEndOfTurnStatus(messages: string[]): void {
    for (const mon of [this.player, this.opponent]) {
      if (this.isFainted(mon)) continue;
      if (mon.status !== 'poison' && mon.status !== 'burn') continue;
      const chip = Math.max(1, Math.floor(this.maxHp(mon) / 16));
      mon.current_hp = Math.max(0, mon.current_hp - chip);
      messages.push(`${this.catalog.species[mon.species_id].display_name} is hurt by ${mon.status}!`);
    }
  }

  private isFullyParalyzed(mon: PokemonInstance): boolean {
    return mon.status === 'paralyze' && this.rng.chance(25);
  }

  private snapshotPokemon(mon: PokemonInstance): BattlePokemonSnapshot {
    const species = this.catalog.species[mon.species_id];
    return {
      mon: structuredClone(mon),
      species,
      maxHp: this.maxHp(mon),
      moves: mon.moves
        .map((entry) => {
          const move = this.catalog.moves[entry.id];
          return move ? { id: entry.id, displayName: move.display_name, pp: entry.pp, maxPp: move.pp } : null;
        })
        .filter((entry): entry is BattleMoveSnapshot => entry !== null),
    };
  }

  private maxHp(mon: PokemonInstance): number {
    return this.catalog.statsFor(this.catalog.species[mon.species_id], mon.level, mon.ivs).hp;
  }

  private statMessage(mon: PokemonInstance, stat: BattleStatId, before: number, after: number): string {
    if (before === after) return `${this.catalog.species[mon.species_id].display_name}'s ${statLabel(stat)} won't go ${after > 0 ? 'higher' : 'lower'}!`;
    return `${this.catalog.species[mon.species_id].display_name}'s ${statLabel(stat)} ${after > before ? 'rose' : 'fell'}!`;
  }

  private statusVerb(status: Exclude<StatusId, 'faint' | null>): string {
    if (status === 'burn') return 'was burned';
    if (status === 'poison') return 'was poisoned';
    if (status === 'paralyze') return 'was paralyzed';
    if (status === 'sleep') return 'fell asleep';
    return 'was frozen';
  }

  private invalidMove(message: string): BattleActionResult {
    return {
      messages: [message],
      playerFainted: false,
      opponentFainted: false,
      battleOver: false,
    };
  }

  private emptyResult(message: string, messages: string[]): DamageResult {
    messages.push(message);
    return { damage: 0, hit: false, critical: false, effectiveness: 1, message };
  }
}

function statLabel(stat: BattleStatId): string {
  if (stat === 'atk') return 'Attack';
  if (stat === 'def') return 'Defense';
  if (stat === 'spc') return 'Special';
  return 'Speed';
}
