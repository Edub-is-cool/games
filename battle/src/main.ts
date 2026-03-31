import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { MultiplayerScene } from './scenes/MultiplayerScene';
import { GameScene } from './scenes/GameScene';
import { HUDScene } from './scenes/HUDScene';
import { DiplomacyPanelScene } from './scenes/DiplomacyPanelScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  backgroundColor: '#1a1a2e',
  parent: 'game-container',
  scene: [BootScene, MenuScene, MultiplayerScene, GameScene, HUDScene, DiplomacyPanelScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    parent: 'game-container',
    width: '100%',
    height: '100%',
    autoCenter: Phaser.Scale.CENTER_BOTH,
    expandParent: true,
  },
  render: {
    antialias: false,
    pixelArt: true,
  },
  input: {
    touch: true,
    mouse: true,
  },
  audio: {
    noAudio: true, // no audio assets yet
  },
};

new Phaser.Game(config);
