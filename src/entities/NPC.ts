import { STEP_MS, TILE_SIZE } from '../config';
import { OverworldCharacter } from './OverworldCharacter';
import type { Direction } from '../types';

export class NPC extends OverworldCharacter {
  id: string;
  tileX: number;
  tileY: number;
  dialogueId: string;
  path: { x: number; y: number }[];
  pathIndex = 0;
  moving = false;
  private readonly isCharacter: boolean;

  constructor(scene: Phaser.Scene, id: string, spriteKey: string, x: number, y: number, facing: Direction, dialogueId: string, path: { x: number; y: number }[] = []) {
    super(scene, x, y, spriteKey, facing);
    this.id = id;
    this.tileX = x;
    this.tileY = y;
    this.dialogueId = dialogueId;
    this.path = path;
    this.isCharacter = spriteKey !== 'ball' && spriteKey !== 'ball_open';
    if (!this.isCharacter) {
      this.stopWalkCue();
      this.hideShadow();
      this.setOrigin(0.5);
      this.setScale(1);
      this.setPosition(x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE / 2);
    }
    this.setDepth(18);
  }

  wanderStep(): void {
    if (this.moving || this.path.length === 0) return;
    this.pathIndex = (this.pathIndex + 1) % this.path.length;
    const target = this.path[this.pathIndex];
    const dx = target.x - this.tileX;
    const dy = target.y - this.tileY;
    if (Math.abs(dx) + Math.abs(dy) > 1) {
      this.tileX = target.x;
      this.tileY = target.y;
      this.setPosition(target.x * TILE_SIZE + TILE_SIZE / 2, target.y * TILE_SIZE + TILE_SIZE);
      return;
    }
    this.facing = dx < 0 ? 'left' : dx > 0 ? 'right' : dy < 0 ? 'up' : 'down';
    this.tileX = target.x;
    this.tileY = target.y;
    this.moving = true;
    if (this.isCharacter) this.playWalk(this.facing);
    this.scene.tweens.add({
      targets: this,
      x: target.x * TILE_SIZE + TILE_SIZE / 2,
      y: target.y * TILE_SIZE + TILE_SIZE,
      duration: STEP_MS,
      ease: 'Linear',
      onUpdate: () => this.syncShadow(),
      onComplete: () => {
        this.moving = false;
        this.syncShadow();
        if (this.isCharacter) {
          this.stopWalkCue();
          this.face(this.facing);
        }
      },
    });
  }

  private hideShadow(): void {
    this.shadow?.setVisible(false);
  }
}
