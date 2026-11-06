import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CODEX_GIFTS } from '../data/codexChat';
import { MOVES } from '../data/moves';
import { SPECIES, expForLevel, statsFor } from '../data/species';
import { GameState } from '../state/GameState';
import { isCancelKey, isConfirmKey } from '../systems/input';
import { GameSession } from '../systems/session/GameSession';
import type { PokemonInstance, TypeId } from '../types';

type MenuMode = 'main' | 'party' | 'stats' | 'bag';

interface MenuPayload {
  mode?: MenuMode;
}

const TYPE_COLORS: Record<TypeId, number> = {
  normal: 0xb8b2a2,
  fire: 0xe86b3d,
  water: 0x4b86d9,
  grass: 0x56a84a,
  electric: 0xe5c74a,
  ice: 0x78c8d8,
  fighting: 0xa95742,
  poison: 0x8f5aa7,
  ground: 0xb99155,
  flying: 0x7f9ed8,
  psychic: 0xd85b91,
  bug: 0x8ca842,
  rock: 0x9d8951,
  ghost: 0x5e568b,
  dragon: 0x6957c8,
};

export class MenuScene extends Phaser.Scene {
  private selected = 0;
  private mode: MenuMode = 'main';
  private layer!: Phaser.GameObjects.Container;
  private keyHandler?: (event: KeyboardEvent) => void;

  constructor() {
    super('MenuScene');
  }

  create(payload: MenuPayload = {}): void {
    this.mode = payload.mode ?? 'main';
    this.selected = 0;
    this.layer = this.add.container(0, 0).setDepth(400);
    this.keyHandler = (event: KeyboardEvent) => this.handleKey(event);
    this.input.keyboard?.on('keydown', this.keyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler);
      this.keyHandler = undefined;
    });
    this.render();
  }

  private handleKey(event: KeyboardEvent): void {
    const confirm = isConfirmKey(event);
    const cancel = isCancelKey(event) || event.key.toLowerCase() === 'm';
    const count = this.selectionCount();
    if (event.key === 'ArrowUp') this.selected = (this.selected + count - 1) % count;
    if (event.key === 'ArrowDown') this.selected = (this.selected + 1) % count;
    if (cancel) {
      if (this.mode === 'main') this.scene.stop();
      else {
        this.mode = this.mode === 'stats' ? 'party' : 'main';
        this.selected = Math.min(this.selected, Math.max(0, GameState.party.length - 1));
      }
    }
    if (confirm) this.confirm();
    this.render();
  }

  private confirm(): void {
    if (this.mode === 'main') {
      if (this.selected === 0) {
        this.mode = 'party';
        this.selected = 0;
      }
      if (this.selected === 1) {
        this.mode = 'bag';
        this.selected = 0;
      }
      if (this.selected === 2) {
        GameSession.saveFromMenu({ map: GameState.map, x: GameState.x, y: GameState.y, facing: GameState.facing });
        this.flash('SAVE', 'Progress saved.');
      }
      if (this.selected === 3) this.scene.stop();
      return;
    }
    if (this.mode === 'party' && GameState.party[this.selected]) this.mode = 'stats';
    else if (this.mode === 'stats') this.mode = 'party';
  }

  private render(): void {
    this.layer.removeAll(true);
    if (this.mode === 'main') this.renderMain();
    else if (this.mode === 'party') this.renderParty();
    else if (this.mode === 'bag') this.renderBag();
    else this.renderStats();
  }

  private selectionCount(): number {
    if (this.mode === 'main') return 4;
    if (this.mode === 'bag') return Math.max(1, this.inventoryEntries().length);
    return Math.max(1, GameState.party.length);
  }

  private renderMain(): void {
    this.addPanel(GAME_WIDTH - 94, 8, 86, 126);
    this.addText(GAME_WIDTH - 82, 18, 'MENU', 10, '#6f6047');
    ['Pokemon', 'Bag', 'Save', 'Exit'].forEach((label, index) => {
      const y = 40 + index * 22;
      if (this.selected === index) this.addCursor(GAME_WIDTH - 82, y + 4);
      this.addText(GAME_WIDTH - 70, y, label, 10);
    });
  }

  private renderParty(): void {
    this.addPanel(8, 8, GAME_WIDTH - 16, GAME_HEIGHT - 16);
    this.addText(18, 16, 'POKEMON', 11, '#26242a');
    this.addText(GAME_WIDTH - 76, 17, 'Z:INFO  X:BACK', 7, '#6f6047');
    if (GameState.party.length === 0) {
      this.addText(26, 82, 'No creatures yet.', 10);
      return;
    }
    GameState.party.forEach((mon, index) => this.renderPartyCard(mon, index));
  }

  private renderBag(): void {
    const entries = this.inventoryEntries();
    this.addPanel(8, 8, GAME_WIDTH - 16, GAME_HEIGHT - 16);
    this.addText(18, 16, 'BAG', 11, '#26242a');
    this.addText(GAME_WIDTH - 52, 17, 'X:BACK', 7, '#6f6047');
    if (entries.length === 0) {
      this.addText(26, 82, 'No items yet.', 10);
      return;
    }

    entries.forEach(([itemId, count], index) => {
      const def = CODEX_GIFTS[itemId];
      const y = 34 + index * 26;
      const selected = this.selected === index;
      if (selected) this.addRect(16, y - 3, GAME_WIDTH - 32, 24, 0xfff0b6, 1, 0xd88b2d);
      if (selected) this.addCursor(20, y + 6);
      this.addText(33, y, `${def?.displayName ?? itemId} x${count}`, 9);
      const description = def?.description ?? 'A curious keepsake.';
      this.addText(33, y + 12, description.length > 48 ? `${description.slice(0, 45)}...` : description, 7, '#6f6047');
    });
  }

  private inventoryEntries(): [string, number][] {
    return Object.entries(GameState.inventory).filter(([, count]) => count > 0);
  }

  private renderPartyCard(mon: PokemonInstance, index: number): void {
    const species = SPECIES[mon.species_id];
    const stats = statsFor(species, mon.level, mon.ivs);
    const x = 16;
    const y = 35 + index * 45;
    const selected = this.selected === index;
    const bg = selected ? 0xfff0b6 : 0xfff7dd;
    const border = selected ? 0xd88b2d : 0x796c58;
    this.addRect(x, y, GAME_WIDTH - 32, 38, bg, 1, border);
    if (selected) this.addCursor(x + 4, y + 15);
    this.layer.add(this.add.sprite(x + 28, y + 20, species.sprite_front, 0).setScale(0.42));
    this.addText(x + 50, y + 7, species.display_name, 10);
    this.addText(x + 146, y + 7, `Lv ${mon.level}`, 9, '#3b3340');
    this.addHpBar(x + 50, y + 23, 86, 5, mon.current_hp, stats.hp);
    this.addText(x + 142, y + 20, `${mon.current_hp}/${stats.hp}`, 8, '#3b3340');
    this.addStatusBadge(x + 190, y + 18, mon.status);
  }

  private renderStats(): void {
    const mon = GameState.party[this.selected];
    if (!mon) {
      this.mode = 'party';
      this.renderParty();
      return;
    }
    const species = SPECIES[mon.species_id];
    const stats = statsFor(species, mon.level, mon.ivs);
    const currentLevelExp = expForLevel(species, mon.level);
    const nextLevelExp = expForLevel(species, mon.level + 1);
    const expProgress = Math.max(0, mon.exp - currentLevelExp);
    const expNeeded = Math.max(1, nextLevelExp - currentLevelExp);

    this.addPanel(8, 8, GAME_WIDTH - 16, GAME_HEIGHT - 16);
    this.addText(18, 16, 'SUMMARY', 11, '#26242a');
    this.addText(GAME_WIDTH - 58, 17, 'X:BACK', 7, '#6f6047');
    this.addRect(18, 32, 74, 74, 0xefe4bf, 1, 0x26242a);
    this.layer.add(this.add.sprite(55, 68, species.sprite_front, 0).setScale(0.96));
    this.addText(104, 34, species.display_name, 12);
    this.addText(104, 50, `Lv ${mon.level}`, 9);
    species.types.forEach((type, index) => this.addTypeBadge(104 + index * 45, 64, type));
    this.addText(104, 83, `Status: ${mon.status ? mon.status.toUpperCase() : 'OK'}`, 8, '#3b3340');
    this.addHpBar(104, 96, 98, 6, mon.current_hp, stats.hp);
    this.addText(207, 92, `${mon.current_hp}/${stats.hp}`, 8, '#3b3340');
    this.addExpBar(104, 108, 98, 4, expProgress, expNeeded);
    this.addText(207, 103, `${expNeeded - expProgress} next`, 7, '#6f6047');

    this.addText(22, 119, `HP ${stats.hp}`, 8);
    this.addText(70, 119, `ATK ${stats.atk}`, 8);
    this.addText(122, 119, `DEF ${stats.def}`, 8);
    this.addText(22, 132, `SPC ${stats.spc}`, 8);
    this.addText(70, 132, `SPD ${stats.spd}`, 8);

    this.addText(22, 150, 'MOVES', 8, '#6f6047');
    mon.moves.forEach((moveSlot, index) => {
      const move = MOVES[moveSlot.id];
      const x = 66 + (index % 2) * 86;
      const y = 145 + Math.floor(index / 2) * 18;
      this.addRect(x, y, 78, 15, 0xfff7dd, 1, 0x796c58);
      this.addText(x + 4, y + 3, move.display_name, 7);
      this.addText(x + 52, y + 3, `${moveSlot.pp}/${move.pp}`, 7, '#6f6047');
    });
  }

  private addPanel(x: number, y: number, width: number, height: number): void {
    this.addRect(x, y, width, height, 0xf8efd2, 1, 0x26242a, 2);
    this.addRect(x + 3, y + 3, width - 6, height - 6, 0xfff7dd, 0.42, 0x796c58);
  }

  private addRect(x: number, y: number, width: number, height: number, color: number, alpha: number, stroke?: number, strokeWidth = 1): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x, y, width, height, color, alpha).setOrigin(0);
    if (stroke !== undefined) rect.setStrokeStyle(strokeWidth, stroke);
    this.layer.add(rect);
    return rect;
  }

  private addText(x: number, y: number, text: string, size = 9, color = '#26242a'): Phaser.GameObjects.Text {
    const label = this.add.text(x, y, text, { fontFamily: 'monospace', fontSize: `${size}px`, color });
    this.layer.add(label);
    return label;
  }

  private addCursor(x: number, y: number): void {
    this.layer.add(this.add.image(x, y, 'ui_cursor').setScale(0.7));
  }

  private addHpBar(x: number, y: number, width: number, height: number, current: number, max: number): void {
    const pct = Phaser.Math.Clamp(current / max, 0, 1);
    this.addRect(x, y, width, height, 0x26242a, 1);
    this.addRect(x + 1, y + 1, Math.max(1, Math.floor((width - 2) * pct)), height - 2, pct > 0.5 ? 0x58b957 : pct > 0.2 ? 0xe6c04d : 0xd95545, 1);
  }

  private addExpBar(x: number, y: number, width: number, height: number, current: number, max: number): void {
    const pct = Phaser.Math.Clamp(current / max, 0, 1);
    this.addRect(x, y, width, height, 0x26242a, 1);
    this.addRect(x + 1, y + 1, Math.max(1, Math.floor((width - 2) * pct)), height - 2, 0x5aa7d8, 1);
  }

  private addTypeBadge(x: number, y: number, type: TypeId): void {
    this.addRect(x, y, 40, 12, TYPE_COLORS[type], 1, 0x26242a);
    this.addText(x + 4, y + 2, type.toUpperCase(), 7, '#ffffff');
  }

  private addStatusBadge(x: number, y: number, status: PokemonInstance['status']): void {
    this.addRect(x, y, 34, 12, status ? 0xcc6f4a : 0x56a84a, 1, 0x26242a);
    this.addText(x + 5, y + 2, status ? status.toUpperCase() : 'OK', 7, '#ffffff');
  }

  private flash(title: string, message: string): void {
    this.layer.removeAll(true);
    this.addPanel(38, 54, 180, 70);
    this.addText(50, 68, title, 11);
    this.addText(50, 88, message, 10);
    this.time.delayedCall(700, () => this.render());
  }
}
