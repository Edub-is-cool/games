import Phaser from 'phaser';
import { addGradientBackground, addSpotlight, addVignette } from '../Backdrop';

const W = 1280;
const H = 720;
const CUP_OPTIONS = [3, 4, 5];

export class MenuScene extends Phaser.Scene {
  private selectedCups = 3;
  private cupButtons: Phaser.GameObjects.Container[] = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    // Load saved cup preference
    const saved = localStorage.getItem('jumpingCup_cupCount');
    if (saved) this.selectedCups = parseInt(saved, 10);

    this.drawBackground();

    // Title
    this.add.text(W / 2, 120, 'The Jumping Cup', {
      fontSize: '64px',
      color: '#f5e6c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setShadow(3, 3, '#000000', 6);

    // Subtitle
    this.add.text(W / 2, 185, 'Follow the ball...', {
      fontSize: '24px',
      color: '#c8b896',
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic',
    }).setOrigin(0.5).setShadow(1, 1, '#000000', 3);

    // High score
    const highScore = this.getHighScore();
    if (highScore > 0) {
      this.add.text(W / 2, 230, `Best Streak: ${highScore}`, {
        fontSize: '22px',
        color: '#f1c40f',
        fontFamily: 'Georgia, serif',
      }).setOrigin(0.5).setShadow(1, 1, '#000000', 3);
    }

    // Cup count selector
    this.add.text(W / 2, 310, 'Number of Cups', {
      fontSize: '26px',
      color: '#f5e6c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setShadow(1, 1, '#000000', 3);

    const btnStartX = W / 2 - (CUP_OPTIONS.length - 1) * 90 / 2;
    CUP_OPTIONS.forEach((count, i) => {
      const x = btnStartX + i * 90;
      const btn = this.createCupButton(x, 370, count);
      this.cupButtons.push(btn);
    });
    this.updateCupButtons();

    // Play button
    const playBtn = this.add.container(W / 2, 490);

    const playBg = this.add.graphics();
    playBg.fillStyle(0xc0392b, 1);
    playBg.fillRoundedRect(-120, -32, 240, 64, 12);
    playBg.lineStyle(2, 0xf1c40f, 0.7);
    playBg.strokeRoundedRect(-120, -32, 240, 64, 12);
    playBtn.add(playBg);

    const playText = this.add.text(0, 0, 'Play', {
      fontSize: '34px',
      color: '#f5e6c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    playBtn.add(playText);

    const playZone = this.add.zone(0, 0, 240, 64).setInteractive({ useHandCursor: true });
    playBtn.add(playZone);

    playZone.on('pointerover', () => playBtn.setScale(1.05));
    playZone.on('pointerout', () => playBtn.setScale(1));
    playZone.on('pointerdown', () => {
      localStorage.setItem('jumpingCup_cupCount', String(this.selectedCups));
      this.scene.start('GameScene', { cupCount: this.selectedCups });
    });

    // Pulse play button
    this.tweens.add({
      targets: playBtn,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Instructions
    this.add.text(W / 2, 580, 'A ball is hidden under a cup. Watch it shuffle, then pick the right cup!', {
      fontSize: '18px',
      color: '#8a9a7a',
      fontFamily: 'Georgia, serif',
      align: 'center',
      wordWrap: { width: 500 },
    }).setOrigin(0.5).setShadow(1, 1, '#000000', 2);
  }

  private createCupButton(x: number, y: number, count: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.graphics();
    container.add(bg);
    container.setData('bg', bg);

    const label = this.add.text(0, 0, String(count), {
      fontSize: '28px',
      color: '#f5e6c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    container.add(label);

    const zone = this.add.zone(0, 0, 70, 55).setInteractive({ useHandCursor: true });
    container.add(zone);

    zone.on('pointerdown', () => {
      this.selectedCups = count;
      this.updateCupButtons();
    });

    container.setData('count', count);
    return container;
  }

  private updateCupButtons() {
    for (const btn of this.cupButtons) {
      const bg = btn.getData('bg') as Phaser.GameObjects.Graphics;
      const count = btn.getData('count') as number;
      bg.clear();
      if (count === this.selectedCups) {
        bg.fillStyle(0xc0392b, 1);
        bg.fillRoundedRect(-32, -25, 64, 50, 10);
        bg.lineStyle(2, 0xf1c40f, 0.8);
        bg.strokeRoundedRect(-32, -25, 64, 50, 10);
      } else {
        bg.fillStyle(0x2a2a3e, 0.8);
        bg.fillRoundedRect(-32, -25, 64, 50, 10);
        bg.lineStyle(1, 0x888888, 0.4);
        bg.strokeRoundedRect(-32, -25, 64, 50, 10);
      }
    }
  }

  private getHighScore(): number {
    return parseInt(localStorage.getItem('jumpingCup_highScore') || '0', 10);
  }

  private drawBackground() {
    addGradientBackground(this, W, H, [
      [0, '#1e5214'],
      [0.55, '#16390e'],
      [1, '#0c2008'],
    ]);
    addSpotlight(this, W / 2, H * 0.36, 1500, 1000, 0.34);
    addVignette(this, W, H, 0.5);
  }
}
