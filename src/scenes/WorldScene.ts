import Phaser from 'phaser';
import { DEBUG, GAME_HEIGHT, GAME_WIDTH, TILE_SIZE } from '../config';
import { NPC } from '../entities/NPC';
import { Player } from '../entities/Player';
import { FLAGS } from '../data/flags';
import type { MapDef, NpcDef, PropDef, TileId } from '../data/maps';
import { GameState } from '../state/GameState';
import { MathBattleRng } from '../systems/battle/rng';
import { tryWildEncounter } from '../systems/encounters/EncounterRuntime';
import { getMap, installRuntimeMapCatalog, resolveWarp } from '../systems/maps/MapCatalog';
import { saveGame } from '../systems/save';
import { handleStoryEvent, validateStoryCatalog, type StoryEvent, type StoryOutcome } from '../systems/scripts/story';
import { GameSession } from '../systems/session/GameSession';
import { resolveInteraction } from '../systems/interaction/InteractionResolver';
import type { BattleRequest, Direction } from '../types';

const DIR_KEYS: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export class WorldScene extends Phaser.Scene {
  private map!: MapDef;
  private player!: Player;
  private npcs: NPC[] = [];
  private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
  private debugPanel?: HTMLDivElement;
  private debugVisible = true;
  private debugOverlay?: Phaser.GameObjects.Graphics;
  private debugOverlayVisible = false;
  private busy = false;
  private queuedDirection: Direction | null = null;
  private worldKeyHandler?: (event: KeyboardEvent) => void;

  constructor() {
    super('WorldScene');
  }

  create(): void {
    this.busy = false;
    this.queuedDirection = null;
    validateStoryCatalog();
    installRuntimeMapCatalog(this.cache);
    this.cameras.main.fadeIn(180, 0, 0, 0);
    this.loadMap(GameState.map);
    this.cursors = this.input.keyboard?.createCursorKeys();
    this.worldKeyHandler = (event: KeyboardEvent) => {
      if (this.scene.isActive('ChatScene')) return;
      const direction = DIR_KEYS[event.key];
      if (direction) {
        this.queuedDirection = direction;
        return;
      }
      if (DEBUG && event.key === 'F3' && this.debugPanel) {
        this.debugVisible = !this.debugVisible;
        this.debugPanel.hidden = !this.debugVisible;
        return;
      }
      if (DEBUG && event.key === 'F4') {
        this.debugOverlayVisible = !this.debugOverlayVisible;
        this.debugOverlay?.setVisible(this.debugOverlayVisible);
        return;
      }
      if (event.key === 'z' || event.key === 'Z' || event.key === 'a' || event.key === 'A' || event.key === 'Enter') this.interact();
      if (event.key === 'm' || event.key === 'M' || event.key === ' ') this.openMenu();
    };
    this.input.keyboard?.on('keydown', this.worldKeyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.worldKeyHandler) this.input.keyboard?.off('keydown', this.worldKeyHandler);
      this.debugPanel?.remove();
      this.worldKeyHandler = undefined;
      this.debugPanel = undefined;
    });
    if (DEBUG) {
      this.debugPanel = document.createElement('div');
      this.debugPanel.className = 'debug-panel';
      document.body.append(this.debugPanel);
    }
    const handledReturn = this.handleBattleReturn();
    const params = new URLSearchParams(window.location.search);
    if (!handledReturn && !params.has('qaMap')) this.time.delayedCall(220, () => this.runStoryEvent({ type: 'mapEntered', map: this.map.key }));
    const qaMenu = params.get('qaMenu');
    if (qaMenu === 'party' || qaMenu === 'stats') {
      this.time.delayedCall(250, () => this.scene.launch('MenuScene', { mode: qaMenu }));
    }
  }

  update(): void {
    this.updateDebug();
    if (this.busy || this.player.moving || this.scene.isActive('DialogueScene') || this.scene.isActive('ChatScene') || this.scene.isActive('MenuScene')) return;
    const direction = this.readDirection();
    if (!direction) return;
    const target = this.player.target(direction);
    if (this.isBlocked(target.x, target.y)) {
      this.player.bump(direction);
      GameState.facing = direction;
      return;
    }
    this.player.step(direction, () => this.afterStep());
    GameState.facing = direction;
  }

  private loadMap(key: string): void {
    this.children.removeAll();
    this.npcs = [];
    this.map = getMap(key);
    this.cameras.main.setBounds(0, 0, this.map.width * TILE_SIZE, this.map.height * TILE_SIZE);
    this.renderLayer(this.map.ground, 0);
    this.renderLayer(this.map.decoration, 4);
    this.map.props.forEach((prop) => this.spawnProp(prop));

    this.map.npcs.forEach((npc) => this.spawnNpc(npc));
    this.player = new Player(this, GameState.x, GameState.y, GameState.facing);
    this.renderLayer(this.map.above, 40);
    if (DEBUG) this.drawDebugOverlay();
    this.frameCamera();
  }

  private frameCamera(): void {
    const mapWidth = this.map.width * TILE_SIZE;
    const mapHeight = this.map.height * TILE_SIZE;
    const fillZoom = Math.max(GAME_WIDTH / mapWidth, GAME_HEIGHT / mapHeight);
    const zoom = Phaser.Math.Clamp(fillZoom, 1, 1.6);
    this.cameras.main.setZoom(zoom);
    const viewWidth = GAME_WIDTH / zoom;
    const viewHeight = GAME_HEIGHT / zoom;
    if (mapWidth <= viewWidth + 1 && mapHeight <= viewHeight + 1) {
      this.cameras.main.stopFollow();
      this.cameras.main.centerOn(mapWidth / 2, mapHeight / 2);
      return;
    }
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.setDeadzone(Math.floor(viewWidth * 0.25), Math.floor(viewHeight * 0.22));
  }

  private renderLayer(data: TileId[], depth: number): void {
    data.forEach((tile, index) => {
      if (tile === 0) return;
      const x = (index % this.map.width) * TILE_SIZE;
      const y = Math.floor(index / this.map.width) * TILE_SIZE;
      this.add.image(x, y, `tile_${tile}`).setOrigin(0).setDepth(depth);
    });
  }

  private spawnNpc(def: NpcDef): void {
    const npc = new NPC(this, def.id, this.spriteKeyForNpc(def), def.x, def.y, def.facing, def.dialogue_id, def.path);
    this.npcs.push(npc);
    if (def.path && def.path.length > 0) {
      this.time.addEvent({
        delay: 1100,
        loop: true,
        callback: () => {
          if (!this.busy && !this.scene.isActive('DialogueScene') && !this.scene.isActive('MenuScene') && !this.player.moving) npc.wanderStep();
        },
      });
    }
  }

  private spawnProp(def: PropDef): void {
    this.add.image(def.x * TILE_SIZE, def.y * TILE_SIZE, def.sprite_key).setOrigin(0).setDepth(def.depth ?? 5);
  }

  private spriteKeyForNpc(def: NpcDef): string {
    if (!def.id.startsWith('starter_')) return def.sprite_key;
    return this.spentStarterIds().has(def.id.replace('starter_', '')) ? 'ball_open' : 'ball';
  }

  private spentStarterIds(): Set<string> {
    if (!GameState.hasFlag(FLAGS.GOT_STARTER)) return new Set();
    const playerStarter = GameState.party[0]?.species_id;
    return new Set([playerStarter, GameState.rivalStarter].filter((id): id is string => Boolean(id)));
  }

  private refreshStarterBalls(): void {
    const spent = this.spentStarterIds();
    for (const npc of this.npcs) {
      if (!npc.id.startsWith('starter_')) continue;
      const speciesId = npc.id.replace('starter_', '');
      npc.setTexture(spent.has(speciesId) ? 'ball_open' : 'ball');
    }
  }

  private readDirection(): Direction | null {
    if (this.queuedDirection) {
      const direction = this.queuedDirection;
      this.queuedDirection = null;
      return direction;
    }
    if (this.cursors?.up?.isDown) return 'up';
    if (this.cursors?.down?.isDown) return 'down';
    if (this.cursors?.left?.isDown) return 'left';
    if (this.cursors?.right?.isDown) return 'right';
    return null;
  }

  private isBlocked(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.map.width || y >= this.map.height) return true;
    if (this.map.collision[y * this.map.width + x]) return true;
    return this.npcs.some((npc) => npc.tileX === x && npc.tileY === y);
  }

  private afterStep(): void {
    GameSession.commitWorldPosition({ map: this.map.key, x: this.player.tileX, y: this.player.tileY, facing: this.player.facing });
    this.checkWarps();
    if (this.busy) return;
    this.checkScripts();
    if (this.busy) return;
    this.rollEncounter();
  }

  private checkWarps(): void {
    const warp = this.map.warps.find((entry) => entry.x === this.player.tileX && entry.y === this.player.tileY);
    if (!warp) return;
    if (this.runStoryEvent({ type: 'warpAttempted', warp })) return;
    const target = resolveWarp(this.map, warp);
    this.busy = true;
    this.cameras.main.fadeOut(180, 0, 0, 0);
    this.time.delayedCall(190, () => {
      GameState.setPosition(target.map.key, target.spawn.x, target.spawn.y, target.facing);
      this.scene.restart();
    });
  }

  private checkScripts(): void {
    for (const trigger of this.map.scriptTriggers) {
      const inside =
        this.player.tileX >= trigger.x &&
        this.player.tileY >= trigger.y &&
        this.player.tileX < trigger.x + trigger.width &&
        this.player.tileY < trigger.y + trigger.height;
      if (!inside) continue;
      if (this.runStoryEvent({ type: 'stepTriggerEntered', triggerId: trigger.id })) return;
    }
  }

  private rollEncounter(): void {
    const decision = tryWildEncounter({
      mapId: this.map.key,
      tile: { x: this.player.tileX, y: this.player.tileY },
      facing: this.player.facing,
      encounterZones: this.map.encounterZones,
      flags: GameState.flags,
      returnPosition: { map: this.map.key, x: this.player.tileX, y: this.player.tileY, facing: this.player.facing },
      rng: new MathBattleRng(),
    });
    if (decision) this.startBattle(decision.battleRequest);
  }

  private interact(): void {
    if (this.busy || this.player.moving || this.scene.isActive('DialogueScene') || this.scene.isActive('MenuScene')) return;
    const resolution = resolveInteraction({
      playerTile: { x: this.player.tileX, y: this.player.tileY },
      playerFacing: this.player.facing,
      npcs: this.npcs,
      props: this.map.props,
    });
    if (resolution.type === 'none') return;
    if (resolution.type === 'starterChoice') {
      this.chooseStarter(resolution.speciesId);
      return;
    }
    if (resolution.type === 'npcChat') {
      const npc = this.npcs.find((entry) => entry.id === resolution.npcId);
      npc?.face(this.opposite(this.player.facing));
      this.openCodexChat('npc', resolution.npcId);
      return;
    }
    if (resolution.type === 'computerChat') {
      this.openCodexChat('computer');
      return;
    }
    this.say(resolution.dialogueId);
  }

  private openCodexChat(mode: 'npc' | 'computer', npcId?: string): void {
    if (this.scene.isActive('ChatScene')) return;
    this.busy = true;
    this.scene.launch('ChatScene', {
      mode,
      npcId,
      conversationId: mode === 'computer' ? 'computer:bedroom' : `npc:${npcId ?? 'unknown'}`,
      onClose: () => {
        this.busy = false;
      },
    });
  }

  private opposite(direction: Direction): Direction {
    if (direction === 'up') return 'down';
    if (direction === 'down') return 'up';
    if (direction === 'left') return 'right';
    return 'left';
  }

  private chooseStarter(speciesId: string): void {
    if (GameState.hasFlag(FLAGS.GOT_STARTER)) {
      this.runStoryEvent({ type: 'starterConfirmed', speciesId });
      return;
    }
    this.say(`starter_${speciesId}`, (choice) => {
      if (!choice) return;
      this.runStoryEvent({ type: 'starterConfirmed', speciesId });
    }, true);
  }

  private startBattle(request: BattleRequest): void {
    this.busy = true;
    GameSession.beginBattle(request);
    this.cameras.main.fadeOut(220, 255, 255, 255);
    this.time.delayedCall(230, () => this.scene.start('BattleScene'));
  }

  private handleBattleReturn(): boolean {
    const effect = GameSession.consumeWorldEntryEffects()[0];
    if (effect?.type === 'dialogue') {
      this.say(effect.dialogueId);
      return true;
    }
    return false;
  }

  private runStoryEvent(event: StoryEvent): boolean {
    return this.applyStoryOutcome(handleStoryEvent(event, this.storySnapshot()));
  }

  private storySnapshot() {
    return {
      map: this.map.key,
      flags: GameState.flags,
      rivalName: GameState.rivalName,
      rivalStarter: GameState.rivalStarter,
    };
  }

  private applyStoryOutcome(outcome: StoryOutcome): boolean {
    const hasEffect =
      outcome.setFlags.length > 0 ||
      Boolean(outcome.showDialogue || outcome.teleport || outcome.startBattle || outcome.blockWarp || outcome.giveStarter || outcome.save);
    if (!hasEffect) return false;

    for (const mutation of outcome.setFlags) GameState.setFlag(mutation.flag, mutation.value ?? true);
    if (outcome.giveStarter) {
      GameState.giveStarter(outcome.giveStarter);
      this.refreshStarterBalls();
    }
    if (outcome.save) saveGame();

    const afterDialogue = () => {
      if (outcome.teleport) {
        GameState.setPosition(outcome.teleport.map, outcome.teleport.x, outcome.teleport.y, outcome.teleport.facing);
        this.scene.restart();
        return;
      }
      if (outcome.startBattle) this.startBattle(outcome.startBattle);
    };

    if (outcome.blockWarp) {
      this.sayCustom(outcome.blockWarp);
      return true;
    }
    if (outcome.showDialogue) {
      this.say(outcome.showDialogue.dialogueId, afterDialogue);
      return true;
    }
    afterDialogue();
    return true;
  }

  private say(dialogueId: string, onComplete?: (choice?: boolean) => void, confirm = false): void {
    this.busy = true;
    this.scene.launch('DialogueScene', {
      dialogueId,
      confirm,
      onComplete: (choice?: boolean) => {
        this.busy = false;
        onComplete?.(choice);
      },
    });
  }

  private sayCustom(text: string): void {
    this.busy = true;
    this.scene.launch('DialogueScene', {
      dialogueId: 'custom',
      customText: text,
      onComplete: () => {
        this.busy = false;
      },
    });
  }

  private openMenu(): void {
    if (this.busy || this.player.moving || this.scene.isActive('DialogueScene') || this.scene.isActive('MenuScene')) return;
    GameState.setPosition(this.map.key, this.player.tileX, this.player.tileY, this.player.facing);
    this.scene.launch('MenuScene');
  }

  private updateDebug(): void {
    if (!this.debugPanel) return;
    const flags = Object.entries(GameState.flags)
      .filter(([, value]) => value)
      .map(([key]) => key.replace(/_/g, ' '))
      .slice(-4);
    const extraFlagCount = Math.max(0, Object.values(GameState.flags).filter(Boolean).length - flags.length);
    this.debugPanel.textContent =
      [
        `${this.map.key}`,
        `${this.player.tileX},${this.player.tileY} ${this.player.facing}`,
        flags.length > 0 ? flags.join('\n') : 'no flags',
        extraFlagCount > 0 ? `+${extraFlagCount} more` : 'F3 hide / F4 grid',
      ].join('\n');
  }

  private drawDebugOverlay(): void {
    this.debugOverlay?.destroy();
    this.debugOverlay = this.add.graphics().setDepth(210).setVisible(this.debugOverlayVisible);
    const g = this.debugOverlay;
    this.map.collision.forEach((blocked, index) => {
      if (!blocked) return;
      g.fillStyle(0xff3158, 0.25);
      g.fillRect((index % this.map.width) * TILE_SIZE, Math.floor(index / this.map.width) * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    });
    g.fillStyle(0x3aa2ff, 0.35);
    this.map.warps.forEach((warp) => g.fillRect(warp.x * TILE_SIZE, warp.y * TILE_SIZE, TILE_SIZE, TILE_SIZE));
    g.fillStyle(0xffd23a, 0.28);
    this.map.props.forEach((prop) => {
      if (!prop.dialogue_id) return;
      g.fillRect(prop.x * TILE_SIZE + 3, prop.y * TILE_SIZE + 3, TILE_SIZE - 6, TILE_SIZE - 6);
      prop.interact_tiles?.forEach((tile) => g.fillRect(tile.x * TILE_SIZE + 5, tile.y * TILE_SIZE + 5, TILE_SIZE - 10, TILE_SIZE - 10));
    });
    g.fillStyle(0x63df63, 0.22);
    this.map.encounterZones.forEach((zone) => g.fillRect(zone.x * TILE_SIZE, zone.y * TILE_SIZE, zone.width * TILE_SIZE, zone.height * TILE_SIZE));
  }
}
