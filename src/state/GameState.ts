import type { BattleRequest, Direction, PokemonInstance, SaveData } from '../types';
import { createPokemon } from '../data/species';

export class GameState {
  static playerName = 'Red';
  static rivalName = 'Blue';
  static map = 'bedroom';
  static x = 5;
  static y = 6;
  static facing: Direction = 'down';
  static party: PokemonInstance[] = [];
  static inventory: Record<string, number> = {};
  static rivalStarter: string | null = null;
  static flags: Record<string, boolean> = {};
  static pendingBattle: BattleRequest | null = null;

  static reset(): void {
    this.playerName = 'Red';
    this.rivalName = 'Blue';
    this.map = 'bedroom';
    this.x = 5;
    this.y = 6;
    this.facing = 'down';
    this.party = [];
    this.inventory = {};
    this.rivalStarter = null;
    this.flags = {};
    this.pendingBattle = null;
  }

  static setPosition(map: string, x: number, y: number, facing: Direction): void {
    this.map = map;
    this.x = x;
    this.y = y;
    this.facing = facing;
  }

  static setFlag(flag: string, value = true): void {
    this.flags[flag] = value;
  }

  static hasFlag(flag: string): boolean {
    return this.flags[flag] === true;
  }

  static giveStarter(speciesId: string): void {
    this.party = [createPokemon(speciesId, 5)];
    const counters: Record<string, string> = {
      bulb_eq: 'char_eq',
      char_eq: 'squirt_eq',
      squirt_eq: 'bulb_eq',
    };
    this.rivalStarter = counters[speciesId];
  }

  static giveItem(itemId: string, quantity = 1): number {
    const safeQuantity = Math.max(1, Math.floor(quantity));
    this.inventory[itemId] = (this.inventory[itemId] ?? 0) + safeQuantity;
    return this.inventory[itemId];
  }

  static itemCount(itemId: string): number {
    return this.inventory[itemId] ?? 0;
  }

  static toSaveData(): SaveData {
    return {
      version: 1,
      player: {
        name: this.playerName,
        map: this.map,
        x: this.x,
        y: this.y,
        facing: this.facing,
      },
      party: this.party,
      inventory: this.inventory,
      rival_name: this.rivalName,
      rival_starter: this.rivalStarter,
      flags: this.flags,
    };
  }

  static fromSaveData(data: SaveData): void {
    this.playerName = data.player.name;
    this.map = data.player.map;
    this.x = data.player.x;
    this.y = data.player.y;
    this.facing = data.player.facing;
    this.party = data.party;
    this.inventory = data.inventory ?? {};
    this.rivalName = data.rival_name;
    this.rivalStarter = data.rival_starter;
    this.flags = data.flags ?? {};
    this.pendingBattle = null;
  }
}
