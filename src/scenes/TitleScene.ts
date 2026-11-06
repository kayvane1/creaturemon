import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { isConfirmKey } from '../systems/input';
import { hasSave } from '../systems/save';
import { GameSession } from '../systems/session/GameSession';

export class TitleScene extends Phaser.Scene {
  private selected = 0;
  private enteringName: 'player' | 'rival' | null = null;
  private nameValue = 'Red';
  private pendingPlayerName = 'Red';
  private titleText?: Phaser.GameObjects.Text;
  private optionTexts: Phaser.GameObjects.Text[] = [];
  private nameText?: Phaser.GameObjects.Text;

  constructor() {
    super('TitleScene');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#f7f0d8');
    this.add.text(GAME_WIDTH / 2, 34, 'CREATUREMON', { fontFamily: 'monospace', fontSize: '25px', color: '#1f2b2b' }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 60, 'Level 1 Prototype', { fontFamily: 'monospace', fontSize: '10px', color: '#445' }).setOrigin(0.5);
    this.titleText = this.add.text(52, 98, '', { fontFamily: 'monospace', fontSize: '13px', color: '#1f2b2b' });
    this.optionTexts = [
      this.add.text(72, 112, '', { fontFamily: 'monospace', fontSize: '12px', color: '#1f2b2b' }),
      this.add.text(72, 130, '', { fontFamily: 'monospace', fontSize: '12px', color: '#1f2b2b' }),
    ];
    this.nameText = this.add.text(44, 112, '', { fontFamily: 'monospace', fontSize: '12px', color: '#1f2b2b', wordWrap: { width: 170 } });
    this.nameText.setVisible(false);
    this.renderOptions();

    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => this.handleKey(event));
  }

  private handleKey(event: KeyboardEvent): void {
    if (this.enteringName) {
      this.handleNameKey(event);
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      this.selected = this.selected === 0 ? 1 : 0;
      this.renderOptions();
    }
    if (isConfirmKey(event)) {
      if (this.selected === 0) this.startNameEntry();
      if (this.selected === 1 && hasSave() && GameSession.continueGame()) this.scene.start('WorldScene');
    }
  }

  private startNameEntry(): void {
    this.enteringName = 'player';
    this.nameValue = 'Red';
    this.titleText?.setText('Your name?');
    this.optionTexts.forEach((text) => text.setVisible(false));
    this.nameText?.setVisible(true);
    this.renderName();
  }

  private handleNameKey(event: KeyboardEvent): void {
    if (event.key === 'Backspace') this.nameValue = this.nameValue.slice(0, -1);
    if (/^[a-z0-9]$/i.test(event.key) && this.nameValue.length < 7) {
      this.nameValue += event.key;
    }
    if (isConfirmKey(event) && this.nameValue.length > 0) {
      if (this.enteringName === 'player') {
        this.pendingPlayerName = this.nameValue;
        this.enteringName = 'rival';
        this.nameValue = 'Blue';
        this.titleText?.setText('Rival name?');
        this.renderName();
        return;
      }
      GameSession.newGame({ playerName: this.pendingPlayerName, rivalName: this.nameValue });
      this.scene.start('WorldScene');
    }
    this.renderName();
  }

  private renderName(): void {
    this.nameText?.setText(`${this.nameValue}_\n\nEnter/Z to start`);
  }

  private renderOptions(): void {
    this.titleText?.setText('Select');
    const save = hasSave();
    const labels = ['New Game', save ? 'Continue' : 'Continue (empty)'];
    this.optionTexts.forEach((text, index) => {
      text.setText(`${this.selected === index ? '>' : ' '} ${labels[index]}`);
      text.setAlpha(index === 1 && !save ? 0.45 : 1);
    });
  }
}
