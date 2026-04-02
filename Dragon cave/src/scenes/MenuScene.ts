import Phaser from 'phaser';
import { CAMERA_WIDTH, CAMERA_HEIGHT } from '../utils/constants';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const cx = CAMERA_WIDTH / 2;
    const cy = CAMERA_HEIGHT / 2;

    // Background
    this.cameras.main.setBackgroundColor('#0a0a0a');

    // Title
    this.add.text(cx, cy - 120, 'DRAGON CAVE', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#ff6644',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(cx, cy - 60, 'A Dungeon Crawler', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#888888',
    }).setOrigin(0.5);

    // Dragon ASCII art
    this.add.text(cx, cy + 10, [
      '      /\\_/\\',
      '     ( o.o )',
      '      > ^ <',
      '     /|   |\\',
      '    (_|   |_)',
    ].join('\n'), {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ff4444',
      align: 'center',
    }).setOrigin(0.5);

    // Instructions
    this.add.text(cx, cy + 110, 'WASD / Arrow Keys to move', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5);

    this.add.text(cx, cy + 135, '1-4 to use items  |  Bump enemies to attack', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#666666',
    }).setOrigin(0.5);

    // Start prompt
    const startText = this.add.text(cx, cy + 190, '[ Press SPACE or ENTER to start ]', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffcc00',
    }).setOrigin(0.5);

    // Blink animation
    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Input
    this.input.keyboard!.once('keydown-SPACE', () => this.startGame());
    this.input.keyboard!.once('keydown-ENTER', () => this.startGame());
  }

  startGame() {
    this.scene.start('GameScene', { floor: 1, seed: Date.now() });
  }
}
