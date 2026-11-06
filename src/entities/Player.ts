import { STEP_MS, TILE_SIZE } from '../config';
import { OverworldCharacter, VECTORS } from './OverworldCharacter';
import type { Direction } from '../types';

export class Player extends OverworldCharacter {
  tileX: number;
  tileY: number;
  moving = false;

  constructor(scene: Phaser.Scene, x: number, y: number, facing: Direction) {
    super(scene, x, y, 'player_overworld', facing);
    this.tileX = x;
    this.tileY = y;
    this.setDepth(20);
  }

  target(direction: Direction): { x: number; y: number } {
    const vector = VECTORS[direction];
    return { x: this.tileX + vector.x, y: this.tileY + vector.y };
  }

  step(direction: Direction, onComplete: () => void): void {
    this.face(direction);
    const target = this.target(direction);
    this.tileX = target.x;
    this.tileY = target.y;
    this.moving = true;
    this.playWalk(direction);
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
        this.stopWalkCue();
        this.face(direction);
        onComplete();
      },
    });
  }

  bump(direction: Direction): void {
    this.face(direction);
    const offset = VECTORS[direction].clone().scale(2);
    this.scene.tweens.add({
      targets: this,
      x: this.x + offset.x,
      y: this.y + offset.y,
      yoyo: true,
      duration: 55,
      onUpdate: () => this.syncShadow(),
      onComplete: () => this.syncShadow(),
    });
  }
}
