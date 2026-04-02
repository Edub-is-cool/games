import Phaser from 'phaser';
import { CAMERA_WIDTH, CAMERA_HEIGHT } from '../utils/constants';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: { victory: boolean; floor: number; level: number }) {
    const cx = CAMERA_WIDTH / 2;
    const cy = CAMERA_HEIGHT / 2;

    this.cameras.main.setBackgroundColor('#0a0a0a');

    if (data.victory) {
      this.add.text(cx, cy - 80, 'VICTORY!', {
        fontSize: '48px',
        fontFamily: 'monospace',
        color: '#ffcc00',
      }).setOrigin(0.5);

      this.add.text(cx, cy - 20, 'You slew the Dragon!', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#44bb44',
      }).setOrigin(0.5);
    } else {
      this.add.text(cx, cy - 80, 'YOU DIED', {
        fontSize: '48px',
        fontFamily: 'monospace',
        color: '#ff4444',
      }).setOrigin(0.5);
    }

    this.add.text(cx, cy + 20, `Floor: ${data.floor}  |  Level: ${data.level}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    const restartText = this.add.text(cx, cy + 80, '[ Press SPACE to try again ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: restartText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.start('MenuScene');
    });
  }
}
