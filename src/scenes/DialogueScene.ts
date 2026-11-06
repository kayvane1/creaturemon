import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { DialogueRunner } from '../systems/dialogue/DialogueRunner';
import { isConfirmKey } from '../systems/input';

interface DialoguePayload {
  dialogueId: string;
  customText?: string;
  speaker?: string;
  confirm?: boolean;
  onComplete?: (choice?: boolean) => void;
}

export class DialogueScene extends Phaser.Scene {
  private runner!: DialogueRunner;
  private payload!: DialoguePayload;
  private speaker!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private prompt!: Phaser.GameObjects.Text;
  private continueArrow!: Phaser.GameObjects.Image;
  private revealed = 0;
  private revealEvent?: Phaser.Time.TimerEvent;
  private choosing = false;
  private choice = true;
  private keyHandler?: (event: KeyboardEvent) => void;

  constructor() {
    super('DialogueScene');
  }

  create(payload: DialoguePayload): void {
    this.payload = payload;
    this.runner = payload.customText
      ? ({ pages: [{ text: payload.customText, speaker: payload.speaker }], index: 0, current() { return this.pages[this.index]; }, advance() { return false; } } as DialogueRunner)
      : new DialogueRunner(payload.dialogueId);
    this.add.rectangle(8, GAME_HEIGHT - 60, GAME_WIDTH - 16, 52, 0xf8efd2, 1).setOrigin(0, 0).setStrokeStyle(2, 0x26242a);
    this.add.rectangle(11, GAME_HEIGHT - 57, GAME_WIDTH - 22, 46, 0xfff7dd, 0.42).setOrigin(0, 0).setStrokeStyle(1, 0x796c58);
    this.speaker = this.add.text(16, GAME_HEIGHT - 56, '', { fontFamily: 'monospace', fontSize: '9px', color: '#6f6047' });
    this.body = this.add.text(16, GAME_HEIGHT - 43, '', {
      fontFamily: 'monospace',
      fontSize: '11px',
      color: '#26242a',
      wordWrap: { width: GAME_WIDTH - 32 },
      lineSpacing: 2,
    });
    this.prompt = this.add.text(GAME_WIDTH - 72, GAME_HEIGHT - 16, '', { fontFamily: 'monospace', fontSize: '10px', color: '#26242a' });
    this.continueArrow = this.add.image(GAME_WIDTH - 20, GAME_HEIGHT - 17, 'ui_continue_arrow').setVisible(false);
    this.keyHandler = (event: KeyboardEvent) => this.handleKey(event);
    this.input.keyboard?.on('keydown', this.keyHandler);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.revealEvent?.remove();
      if (this.keyHandler) this.input.keyboard?.off('keydown', this.keyHandler);
      this.keyHandler = undefined;
    });
    this.showPage();
  }

  private showPage(): void {
    this.revealEvent?.remove();
    this.choosing = false;
    this.prompt.setText('');
    this.continueArrow.setVisible(false);
    const page = this.runner.current();
    this.speaker.setText(page.speaker ?? '');
    this.body.setText('');
    this.revealed = 0;
    this.revealEvent = this.time.addEvent({
      delay: 33,
      loop: true,
      callback: () => {
        this.revealed += 1;
        this.body.setText(page.text.slice(0, this.revealed));
        if (this.revealed >= page.text.length) {
          this.revealEvent?.remove();
          this.prompt.setText('Z');
          this.continueArrow.setVisible(true);
        }
      },
    });
  }

  private handleKey(event: KeyboardEvent): void {
    if (!isConfirmKey(event) && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;

    if (this.choosing) {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        this.choice = !this.choice;
        this.prompt.setText(this.choice ? '>YES  NO' : ' YES >NO');
        return;
      }
      this.close(this.choice);
      return;
    }

    const page = this.runner.current();
    if (this.revealed < page.text.length) {
      this.revealEvent?.remove();
      this.revealed = page.text.length;
      this.body.setText(page.text);
      this.prompt.setText('Z');
      this.continueArrow.setVisible(true);
      return;
    }

    if (this.runner.advance()) {
      this.showPage();
      return;
    }

    if (this.payload.confirm) {
      this.choosing = true;
      this.choice = true;
      this.prompt.setText('>YES  NO');
      this.continueArrow.setVisible(false);
      return;
    }

    this.close();
  }

  private close(choice?: boolean): void {
    const onComplete = this.payload.onComplete;
    this.scene.stop();
    onComplete?.(choice);
  }
}
