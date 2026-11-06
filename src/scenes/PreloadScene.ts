import Phaser from 'phaser';
import { FLAGS } from '../data/flags';
import { createPokemon } from '../data/species';
import { GameState } from '../state/GameState';
import { createCatalogAnimations, loadAssetCatalog } from '../systems/assets/AssetCatalog';
import { preloadMaps } from '../systems/maps/MapCatalog';
import type { Direction } from '../types';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload(): void {
    preloadMaps(this.load);
    loadAssetCatalog(this);
  }

  create(): void {
    createCatalogAnimations(this);
    if (this.startQaScene()) return;
    this.scene.start('TitleScene');
  }

  private startQaScene(): boolean {
    const params = new URLSearchParams(window.location.search);
    const map = params.get('qaMap');
    if (!map) return false;
    const x = Number(params.get('qaX') ?? '5');
    const y = Number(params.get('qaY') ?? '5');
    const facing = params.get('qaFacing');
    GameState.reset();
    GameState.setPosition(map, Number.isFinite(x) ? x : 5, Number.isFinite(y) ? y : 5, this.direction(facing, 'down'));
    const starter = params.get('qaStarter');
    if (starter) {
      GameState.party = [createPokemon(starter, 5)];
      GameState.rivalStarter = starter === 'bulb_eq' ? 'char_eq' : starter === 'char_eq' ? 'squirt_eq' : 'bulb_eq';
      GameState.setFlag(FLAGS.GOT_STARTER);
      if (params.get('qaRouteClear') === '1') GameState.setFlag(FLAGS.ROUTE_1_CLEAR);
    }
    this.scene.start('WorldScene');
    return true;
  }

  private direction(value: string | null, fallback: Direction): Direction {
    return value === 'up' || value === 'down' || value === 'left' || value === 'right' ? value : fallback;
  }
}
