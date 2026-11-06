import Phaser from 'phaser';
import { TILE_SIZE } from '../config';
import { characterScale } from '../systems/assets/AssetCatalog';
import type { Direction } from '../types';

export const VECTORS: Record<Direction, Phaser.Math.Vector2> = {
  up: new Phaser.Math.Vector2(0, -1),
  down: new Phaser.Math.Vector2(0, 1),
  left: new Phaser.Math.Vector2(-1, 0),
  right: new Phaser.Math.Vector2(1, 0),
};

export class OverworldCharacter extends Phaser.GameObjects.Sprite {
  protected readonly animKey: string;
  protected readonly characterScale: number;
  facing: Direction;
  protected readonly shadow?: Phaser.GameObjects.Ellipse;

  constructor(scene: Phaser.Scene, x: number, y: number, textureKey: string, facing: Direction) {
    super(scene, x * TILE_SIZE + TILE_SIZE / 2, y * TILE_SIZE + TILE_SIZE, textureKey, 0);
    this.animKey = textureKey.replace(/_overworld$/, '');
    this.characterScale = characterScale(textureKey);
    this.facing = facing;
    this.shadow = scene.add.ellipse(this.x, this.y - 2, 17, 5, 0x1f2b1f, 0.32).setDepth(17);
    this.setOrigin(0.5, 1);
    this.setScale(this.characterScale);
    scene.add.existing(this);
    this.face(facing);
  }

  setPosition(x?: number, y?: number, z?: number, w?: number): this {
    super.setPosition(x, y, z, w);
    this.syncShadow();
    return this;
  }

  setDepth(value: number): this {
    super.setDepth(value);
    this.shadow?.setDepth(value - 1);
    return this;
  }

  face(direction: Direction): void {
    this.facing = direction;
    this.stopWalkCue();
    const key = `${this.animKey}_idle_${direction}`;
    if (this.scene.anims.exists(key)) this.play(key, true);
  }

  playWalk(direction: Direction): void {
    this.facing = direction;
    const key = `${this.animKey}_walk_${direction}`;
    if (this.scene.anims.exists(key)) this.play(key, true);
    this.scene.tweens.killTweensOf(this);
    this.setScale(this.characterScale, this.characterScale);
  }

  stopWalkCue(): void {
    this.scene.tweens.killTweensOf(this);
    this.setScale(this.characterScale, this.characterScale);
  }

  protected syncShadow(): void {
    this.shadow?.setPosition(this.x, this.y - 2);
  }
}
