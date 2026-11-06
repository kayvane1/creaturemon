import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { ChatScene } from './scenes/ChatScene';
import { DialogueScene } from './scenes/DialogueScene';
import { MenuScene } from './scenes/MenuScene';
import { PreloadScene } from './scenes/PreloadScene';
import { TitleScene } from './scenes/TitleScene';
import { WorldScene } from './scenes/WorldScene';

import './style.css';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#111111',
  scale: {
    mode: Phaser.Scale.NONE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    zoom: integerZoom(),
  },
  scene: [BootScene, PreloadScene, TitleScene, WorldScene, DialogueScene, ChatScene, MenuScene, BattleScene],
});

window.addEventListener('resize', () => {
  game.scale.setZoom(integerZoom());
  game.scale.refresh();
});

function integerZoom(): number {
  return Math.max(1, Math.floor(Math.min(window.innerWidth / GAME_WIDTH, window.innerHeight / GAME_HEIGHT)));
}
