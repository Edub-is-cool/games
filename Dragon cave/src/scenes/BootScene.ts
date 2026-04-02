import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create() {
    // Generate textures programmatically (no external assets needed)
    this.scene.start('MenuScene');
  }
}
