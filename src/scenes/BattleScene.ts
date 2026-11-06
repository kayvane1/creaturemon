import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { GameState } from '../state/GameState';
import { BattleEngine, type BattlePokemonSnapshot } from '../systems/battle/BattleEngine';
import { battleBackground, battleEffectFrame, battleSprite } from '../systems/assets/AssetCatalog';
import { isCancelKey, isConfirmKey } from '../systems/input';
import { GameSession } from '../systems/session/GameSession';
import type { BattleRequest } from '../types';

type BattleMode = 'actions' | 'fight' | 'messages' | 'ending';

export class BattleScene extends Phaser.Scene {
  private request!: BattleRequest;
  private engine!: BattleEngine;
  private mode: BattleMode = 'actions';
  private selected = 0;
  private messages: string[] = [];
  private title!: Phaser.GameObjects.Text;
  private playerHp!: Phaser.GameObjects.Text;
  private foeHp!: Phaser.GameObjects.Text;
  private menu!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private playerSprite!: Phaser.GameObjects.Image;
  private opponentSprite!: Phaser.GameObjects.Image;
  private keyHandler?: (event: KeyboardEvent) => void;
  private endingKeyHandler?: (event: KeyboardEvent) => void;
  private hpBars: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super('BattleScene');
  }

  create(): void {
    const request = GameState.pendingBattle;
    if (!request || GameState.party.length === 0) {
      this.scene.start('WorldScene');
      return;
    }
    this.request = request;
    const player = GameState.party[0];
    if (player.current_hp <= 0) player.current_hp = 1;
    this.engine = new BattleEngine({ player, opponent: request.roster[0] });
    this.cameras.main.setBackgroundColor('#e8f0ff');
    this.drawBattlefield();
    this.keyHandler = (event: KeyboardEvent) => this.handleKey(event);
    this.input.keyboard?.on('keydown', this.keyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler);
      if (this.endingKeyHandler) this.input.keyboard?.off('keydown', this.endingKeyHandler);
      this.keyHandler = undefined;
      this.endingKeyHandler = undefined;
    });
    this.render();
    this.queue([`${request.opponentName} wants to battle!`]);
  }

  private drawBattlefield(): void {
    this.add.image(0, 0, battleBackground(this.request.returnMap)).setOrigin(0);
    const { player, opponent } = this.engine.snapshot();
    const playerSprite = battleSprite(player.species.id, 'player');
    const opponentSprite = battleSprite(opponent.species.id, 'opponent');
    this.playerSprite = this.add.image(72, 104, playerSprite.key, playerSprite.frame).setScale(1.35);
    this.opponentSprite = this.add.image(184, 48, opponentSprite.key, opponentSprite.frame).setScale(1.2);
    this.add.rectangle(6, 6, 116, 36, 0xf8efd2).setOrigin(0).setStrokeStyle(2, 0x26242a);
    this.add.rectangle(132, 104, 118, 42, 0xf8efd2).setOrigin(0).setStrokeStyle(2, 0x26242a);
    this.hpBars = [
      this.add.rectangle(56, 34, 54, 4, 0x5ccc70).setOrigin(0, 0.5),
      this.add.rectangle(174, 136, 54, 4, 0x5ccc70).setOrigin(0, 0.5),
    ];
    this.title = this.add.text(12, 10, '', { fontFamily: 'monospace', fontSize: '9px', color: '#26242a' });
    this.foeHp = this.add.text(12, 25, '', { fontFamily: 'monospace', fontSize: '8px', color: '#26242a' });
    this.playerHp = this.add.text(140, 110, '', { fontFamily: 'monospace', fontSize: '8px', color: '#26242a' });
    this.add.rectangle(8, GAME_HEIGHT - 48, GAME_WIDTH - 16, 40, 0xf8efd2).setOrigin(0).setStrokeStyle(2, 0x26242a);
    this.messageText = this.add.text(16, GAME_HEIGHT - 50, '', {
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#26242a',
      wordWrap: { width: 118 },
    });
    this.messageText.setY(GAME_HEIGHT - 40);
    this.menu = this.add.text(146, GAME_HEIGHT - 40, '', { fontFamily: 'monospace', fontSize: '9px', color: '#26242a' });
  }

  private handleKey(event: KeyboardEvent): void {
    const confirm = isConfirmKey(event);
    const cancel = isCancelKey(event);

    if (this.mode === 'messages') {
      if (confirm) this.nextMessage();
      return;
    }
    if (this.mode === 'ending') return;

    const optionCount = this.mode === 'fight' ? this.engine.availablePlayerMoves().length : 4;
    if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') this.selected = (this.selected + optionCount - 1) % optionCount;
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') this.selected = (this.selected + 1) % optionCount;
    if (cancel && this.mode === 'fight') {
      this.mode = 'actions';
      this.selected = 0;
    }
    if (confirm) this.confirm();
    this.render();
  }

  private confirm(): void {
    if (this.mode === 'actions') {
      if (this.selected === 0) {
        this.mode = 'fight';
        this.selected = 0;
      } else if (this.selected === 3) {
        if (this.request.canRun) this.end('run', ['Got away safely!']);
        else this.queue(["No! There's no running from a trainer battle!"]);
      } else {
        this.queue([this.selected === 1 ? 'The BAG is empty in this prototype.' : 'Switching is disabled in this prototype.']);
      }
      return;
    }

    const move = this.engine.availablePlayerMoves()[this.selected];
    if (!move) return;
    this.playAttackMotion('player', move.id);
    const result = this.engine.choosePlayerMove(move.id);
    if (result.outcome === 'win') {
      this.end('win', result.messages);
      return;
    }
    if (result.outcome === 'loss') {
      this.end('loss', result.messages);
      return;
    }
    this.queue(result.messages);
    this.mode = 'actions';
    this.selected = 0;
  }

  private queue(messages: string[]): void {
    this.messages = [...messages];
    this.mode = 'messages';
    this.nextMessage();
  }

  private nextMessage(): void {
    const message = this.messages.shift();
    if (message) {
      this.messageText.setText(message);
      this.menu.setText('');
      this.updateHud();
      return;
    }
    this.mode = 'actions';
    this.selected = 0;
    this.render();
  }

  private end(outcome: 'win' | 'loss' | 'run', messages: string[]): void {
    this.messages = [...messages, outcome === 'win' ? 'You won the battle!' : outcome === 'loss' ? 'You blacked out... but the prototype nudges you onward.' : 'The wild creature disappeared.'];
    this.mode = 'ending';
    const advance = () => {
      const next = this.messages.shift();
      if (next) {
        this.messageText.setText(next);
        return;
      }
      this.finish(outcome);
    };
    if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler);
    this.keyHandler = undefined;
    this.endingKeyHandler = (event: KeyboardEvent) => {
      if (isConfirmKey(event)) advance();
    };
    this.input.keyboard?.on('keydown', this.endingKeyHandler);
    advance();
  }

  private finish(outcome: 'win' | 'loss' | 'run'): void {
    this.engine.recoverPlayerAfterBattle();
    GameSession.finishBattle(outcome);
    this.scene.start('WorldScene');
  }

  private render(): void {
    this.updateHud();
    if (this.mode === 'actions') {
      const options = ['Fight', 'Bag', 'Pokemon', 'Run'];
      this.messageText.setText('What will you do?');
      this.menu.setText(`${optionLabel(options, this.selected, 0)}  ${optionLabel(options, this.selected, 1)}\n${optionLabel(options, this.selected, 2)}  ${optionLabel(options, this.selected, 3)}`);
    }
    if (this.mode === 'fight') {
      const moves = this.engine.snapshot().player.moves.map((move, index) => {
        const empty = move.pp <= 0 ? '!' : '';
        return `${this.selected === index ? '>' : ' '} ${move.displayName}${empty} ${move.pp}/${move.maxPp}`;
      });
      this.messageText.setText('Choose a move.');
      this.menu.setText(moves.join('\n'));
    }
  }

  private updateHud(): void {
    const { player, opponent: foe } = this.engine.snapshot();
    this.title.setText(`Foe ${foe.species.display_name}  L${foe.mon.level}${statusTag(foe)}`);
    this.foeHp.setText(hpLine(foe));
    this.playerHp.setText(`${player.species.display_name} L${player.mon.level}${statusTag(player)}\n${hpLine(player)}`);
    this.hpBars[0]?.setScale(hpRatio(foe), 1).setFillStyle(hpColor(foe));
    this.hpBars[1]?.setScale(hpRatio(player), 1).setFillStyle(hpColor(player));
  }

  private playAttackMotion(attacker: 'player' | 'opponent', moveId: string): void {
    const sprite = attacker === 'player' ? this.playerSprite : this.opponentSprite;
    const target = attacker === 'player' ? this.opponentSprite : this.playerSprite;
    const lungeX = attacker === 'player' ? 10 : -10;
    this.tweens.add({
      targets: sprite,
      x: sprite.x + lungeX,
      y: sprite.y - 4,
      yoyo: true,
      duration: 80,
      ease: 'Quad.easeOut',
    });
    this.time.delayedCall(80, () => {
      this.playBattleEffect(moveId, target.x, target.y);
      this.tweens.add({
        targets: target,
        alpha: 0.35,
        yoyo: true,
        repeat: 2,
        duration: 45,
        onComplete: () => target.setAlpha(1),
      });
    });
  }

  private playBattleEffect(moveId: string, x: number, y: number): void {
    const effect = this.add.sprite(x, y, 'battle_effects', battleEffectFrame(moveId)).setScale(1.65).setDepth(20);
    this.tweens.add({
      targets: effect,
      alpha: 0,
      scale: 2.2,
      duration: 240,
      ease: 'Cubic.easeOut',
      onComplete: () => effect.destroy(),
    });
  }
}

function hpLine(snapshot: BattlePokemonSnapshot): string {
  return `HP ${snapshot.mon.current_hp}/${snapshot.maxHp}`;
}

function hpRatio(snapshot: BattlePokemonSnapshot): number {
  return Phaser.Math.Clamp(snapshot.mon.current_hp / snapshot.maxHp, 0, 1);
}

function hpColor(snapshot: BattlePokemonSnapshot): number {
  const ratio = hpRatio(snapshot);
  if (ratio <= 0.25) return 0xd64f45;
  if (ratio <= 0.5) return 0xefca58;
  return 0x5ccc70;
}

function statusTag(snapshot: BattlePokemonSnapshot): string {
  if (!snapshot.mon.status || snapshot.mon.status === 'faint') return '';
  if (snapshot.mon.status === 'burn') return ' BRN';
  if (snapshot.mon.status === 'poison') return ' PSN';
  if (snapshot.mon.status === 'paralyze') return ' PAR';
  if (snapshot.mon.status === 'sleep') return ' SLP';
  return ' FRZ';
}

function optionLabel(options: string[], selected: number, index: number): string {
  const prefix = selected === index ? '>' : ' ';
  return `${prefix} ${options[index]}`;
}
