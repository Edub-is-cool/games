import Phaser from 'phaser';
import { playCorrect, playWrong, playShuffle, playLift, playSlam, playSelect } from '../SoundManager';

const W = 1280;
const H = 720;
const CUP_WIDTH = 120;
const CUP_HEIGHT = 155;
const TABLE_Y = 460;
const CUP_Y = TABLE_Y - 5;
const BALL_RADIUS = 20;
const BALL_Y = CUP_Y + BALL_RADIUS + 5;

interface Cup {
  graphic: Phaser.GameObjects.Graphics;
  zone: Phaser.GameObjects.Zone;
  x: number;
  index: number;
}

function getDifficulty(round: number): { label: string; color: string } {
  if (round <= 2) return { label: 'Easy', color: '#2ecc71' };
  if (round <= 5) return { label: 'Medium', color: '#f39c12' };
  if (round <= 8) return { label: 'Hard', color: '#e67e22' };
  return { label: 'Insane', color: '#e74c3c' };
}

export class GameScene extends Phaser.Scene {
  private cups: Cup[] = [];
  private cupCount = 3;
  private cupSpacing = 210;
  private ball!: Phaser.GameObjects.Graphics;
  private ballCupIndex = 0;
  private score = 0;
  private round = 1;
  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private difficultyText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private gameOverGroup!: Phaser.GameObjects.Container;
  private shuffling = false;
  private cupsDown = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { cupCount?: number }) {
    this.cupCount = data.cupCount ?? 3;
    // Adjust spacing based on cup count so they fit on screen
    const maxWidth = 900;
    this.cupSpacing = Math.min(210, maxWidth / (this.cupCount - 1 || 1));
  }

  create() {
    this.cups = [];
    this.score = 0;
    this.round = 1;
    this.shuffling = false;
    this.cupsDown = false;

    this.drawBackground();

    // Title
    this.add.text(W / 2, 50, 'The Jumping Cup', {
      fontSize: '48px',
      color: '#f5e6c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setShadow(2, 2, '#000000', 4);

    // Score — top right
    this.scoreText = this.add.text(W - 30, 22, 'Score: 0', {
      fontSize: '26px',
      color: '#f5e6c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(1, 0).setShadow(1, 1, '#000000', 3);

    // Round — below score
    this.roundText = this.add.text(W - 30, 55, 'Round: 1', {
      fontSize: '22px',
      color: '#c8b896',
      fontFamily: 'Georgia, serif',
    }).setOrigin(1, 0).setShadow(1, 1, '#000000', 3);

    // High score — top left
    const hs = this.getHighScore();
    this.highScoreText = this.add.text(30, 22, hs > 0 ? `Best: ${hs}` : '', {
      fontSize: '22px',
      color: '#f1c40f',
      fontFamily: 'Georgia, serif',
    }).setShadow(1, 1, '#000000', 3);

    // Difficulty — below high score
    const diff = getDifficulty(1);
    this.difficultyText = this.add.text(30, 52, diff.label, {
      fontSize: '20px',
      color: diff.color,
      fontFamily: 'Georgia, serif',
    }).setShadow(1, 1, '#000000', 3);

    // Message
    this.messageText = this.add.text(W / 2, H - 80, 'Watch the ball!', {
      fontSize: '32px',
      color: '#ffdd57',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setShadow(1, 1, '#000000', 4);

    // Create ball
    this.ball = this.add.graphics();
    this.drawBall();

    // Create cups
    const startX = W / 2 - (this.cupCount - 1) * this.cupSpacing / 2;
    for (let i = 0; i < this.cupCount; i++) {
      const x = startX + i * this.cupSpacing;
      const graphic = this.add.graphics();
      this.drawCup(graphic, 0, 0);
      graphic.setPosition(x, CUP_Y);

      const zone = this.add.zone(x, CUP_Y - CUP_HEIGHT / 2, CUP_WIDTH + 30, CUP_HEIGHT + 40)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.onCupClick(i));

      this.cups.push({ graphic, zone, x, index: i });
    }

    this.createGameOverOverlay();

    this.ballCupIndex = Phaser.Math.Between(0, this.cupCount - 1);
    this.positionBall(this.ballCupIndex);

    this.startRound();
  }

  private drawBackground() {
    const bg = this.add.graphics();
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Phaser.Math.Linear(0x1a, 0x10, t);
      const g = Phaser.Math.Linear(0x4a, 0x2a, t);
      const b = Phaser.Math.Linear(0x12, 0x08, t);
      const color = (r << 16) | (g << 8) | b;
      const y = (H / steps) * i;
      bg.fillStyle(color, 1);
      bg.fillRect(0, y, W, H / steps + 1);
    }

    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.15);
    vignette.fillRect(0, 0, W, 60);
    vignette.fillRect(0, H - 40, W, 40);
    vignette.fillStyle(0x000000, 0.08);
    vignette.fillRect(0, 0, 40, H);
    vignette.fillRect(W - 40, 0, 40, H);

    const table = this.add.graphics();
    table.fillStyle(0x000000, 0.3);
    table.fillRoundedRect(W / 2 - 520, TABLE_Y + 18, 1040, 40, 12);
    table.fillStyle(0x5c3a1e, 1);
    table.fillRoundedRect(W / 2 - 515, TABLE_Y + 8, 1030, 35, 10);
    table.fillStyle(0x6d4527, 1);
    table.fillRoundedRect(W / 2 - 510, TABLE_Y + 10, 1020, 18, 8);
    table.fillStyle(0x7a5030, 0.6);
    table.fillRoundedRect(W / 2 - 505, TABLE_Y + 12, 1010, 6, 4);
    table.fillStyle(0x4a2c12, 0.5);
    for (let i = 0; i < 11; i++) {
      const dx = W / 2 - 400 + i * 80;
      table.fillCircle(dx, TABLE_Y + 32, 3);
    }
  }

  private createGameOverOverlay() {
    this.gameOverGroup = this.add.container(W / 2, H / 2).setVisible(false).setDepth(10);

    const dim = this.add.graphics();
    dim.fillStyle(0x000000, 0.6);
    dim.fillRect(-W / 2, -H / 2, W, H);
    this.gameOverGroup.add(dim);

    const panel = this.add.graphics();
    panel.fillStyle(0x000000, 0.4);
    panel.fillRoundedRect(-234, -134, 468, 268, 20);
    panel.fillStyle(0x1a1a2e, 0.95);
    panel.fillRoundedRect(-230, -130, 460, 260, 18);
    panel.lineStyle(2, 0xf1c40f, 0.6);
    panel.strokeRoundedRect(-230, -130, 460, 260, 18);
    this.gameOverGroup.add(panel);

    const goText = this.add.text(0, -80, 'Game Over', {
      fontSize: '44px',
      color: '#e74c3c',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setShadow(2, 2, '#000000', 4);
    this.gameOverGroup.add(goText);

    const finalScore = this.add.text(0, -20, '', {
      fontSize: '28px',
      color: '#f5e6c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    finalScore.setName('finalScore');
    this.gameOverGroup.add(finalScore);

    const newBest = this.add.text(0, 20, '', {
      fontSize: '22px',
      color: '#f1c40f',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    newBest.setName('newBest');
    this.gameOverGroup.add(newBest);

    const restart = this.add.text(0, 70, 'Tap to Retry', {
      fontSize: '22px',
      color: '#f1c40f',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    this.gameOverGroup.add(restart);

    const menuBtn = this.add.text(0, 105, 'Menu', {
      fontSize: '18px',
      color: '#8a9a7a',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    menuBtn.on('pointerover', () => menuBtn.setColor('#f5e6c8'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#8a9a7a'));
    this.gameOverGroup.add(menuBtn);

    this.tweens.add({
      targets: restart,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawCup(g: Phaser.GameObjects.Graphics, cx: number, cy: number) {
    g.clear();
    const topW = CUP_WIDTH * 0.55;
    const botW = CUP_WIDTH;
    const h = CUP_HEIGHT;
    const top = cy - h;

    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(cx, cy + 6, botW + 14, 18);

    g.fillStyle(0xb5332a, 1);
    g.beginPath();
    g.moveTo(cx - topW / 2, top);
    g.lineTo(cx - botW / 2, cy);
    g.lineTo(cx + botW / 2, cy);
    g.lineTo(cx + topW / 2, top);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x8a2520, 0.5);
    g.beginPath();
    g.moveTo(cx + topW * 0.1, top);
    g.lineTo(cx + botW * 0.1, cy);
    g.lineTo(cx + botW / 2, cy);
    g.lineTo(cx + topW / 2, top);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xd94a40, 0.4);
    g.beginPath();
    g.moveTo(cx - topW / 2 + 6, top + 8);
    g.lineTo(cx - botW / 2 + 10, cy - 6);
    g.lineTo(cx - botW / 2 + 24, cy - 6);
    g.lineTo(cx - topW / 2 + 16, top + 8);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xcc3b32, 1);
    g.fillEllipse(cx, top, topW, 18);
    g.fillStyle(0x1a1a1a, 0.7);
    g.fillEllipse(cx, top, topW - 10, 12);

    g.fillStyle(0xd4a843, 0.7);
    const stripeY = top + h * 0.3;
    const stripeW = topW + (botW - topW) * 0.3;
    g.fillRect(cx - stripeW / 2 + 6, stripeY, stripeW - 12, 4);

    g.lineStyle(2, 0x8a2520, 0.6);
    g.beginPath();
    g.moveTo(cx - botW / 2, cy);
    g.lineTo(cx + botW / 2, cy);
    g.strokePath();
  }

  private drawBall() {
    this.ball.clear();
    this.ball.fillStyle(0x000000, 0.3);
    this.ball.fillEllipse(0, BALL_RADIUS * 0.4, BALL_RADIUS * 2.4, BALL_RADIUS * 0.8);
    this.ball.fillStyle(0xd4a020, 1);
    this.ball.fillCircle(0, 0, BALL_RADIUS);
    this.ball.fillStyle(0xf1c40f, 1);
    this.ball.fillCircle(-2, -2, BALL_RADIUS - 3);
    this.ball.fillStyle(0xfef3b0, 0.8);
    this.ball.fillCircle(-6, -7, 6);
  }

  private positionBall(cupIndex: number) {
    const cup = this.cups[cupIndex];
    this.ball.setPosition(cup.x, BALL_Y);
  }

  private updateDifficulty() {
    const diff = getDifficulty(this.round);
    this.difficultyText.setText(diff.label).setColor(diff.color);
  }

  private startRound() {
    this.shuffling = true;
    this.cupsDown = false;
    this.updateDifficulty();
    this.messageText.setText('Watch the ball!').setColor('#ffdd57');

    this.ball.setVisible(true);
    this.positionBall(this.ballCupIndex);

    playLift();
    const liftDuration = 400;
    for (const cup of this.cups) {
      this.tweens.add({
        targets: [cup.graphic, cup.zone],
        y: CUP_Y - CUP_HEIGHT * 0.6,
        duration: liftDuration,
        ease: 'Back.easeOut',
      });
    }

    this.time.delayedCall(liftDuration + 800, () => {
      playSlam();
      for (const cup of this.cups) {
        this.tweens.add({
          targets: cup.graphic,
          y: CUP_Y,
          duration: 350,
          ease: 'Bounce.easeOut',
        });
        this.tweens.add({
          targets: cup.zone,
          y: CUP_Y - CUP_HEIGHT / 2,
          duration: 350,
          ease: 'Bounce.easeOut',
        });
      }
      this.time.delayedCall(500, () => {
        this.ball.setVisible(false);
        this.messageText.setText('Shuffling...');
        this.time.delayedCall(300, () => this.doShuffles());
      });
    });
  }

  private doShuffles() {
    const numShuffles = Math.min(3 + this.round, 15);
    const speed = Math.max(150, 450 - this.round * 30);
    let shufflesDone = 0;

    const doOne = () => {
      if (shufflesDone >= numShuffles) {
        this.shuffling = false;
        this.cupsDown = true;
        this.messageText.setText('Where is the ball?');
        return;
      }

      let a = Phaser.Math.Between(0, this.cupCount - 1);
      let b = Phaser.Math.Between(0, this.cupCount - 2);
      if (b >= a) b++;

      playShuffle();
      this.swapCups(a, b, speed, () => {
        shufflesDone++;
        doOne();
      });
    };

    doOne();
  }

  private swapCups(a: number, b: number, duration: number, onComplete: () => void) {
    const cupA = this.cups[a];
    const cupB = this.cups[b];
    const xA = cupA.x;
    const xB = cupB.x;
    const arcHeight = 70;

    this.tweens.add({
      targets: [cupA.graphic, cupA.zone],
      x: xB,
      duration,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: cupA.graphic,
      y: CUP_Y - arcHeight,
      duration: duration / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
    });
    this.tweens.add({
      targets: cupA.zone,
      y: CUP_Y - CUP_HEIGHT / 2 - arcHeight,
      duration: duration / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
    });

    this.tweens.add({
      targets: [cupB.graphic, cupB.zone],
      x: xA,
      duration,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: cupB.graphic,
      y: CUP_Y - arcHeight * 0.3,
      duration: duration / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
    });
    this.tweens.add({
      targets: cupB.zone,
      y: CUP_Y - CUP_HEIGHT / 2 - arcHeight * 0.3,
      duration: duration / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
    });

    this.time.delayedCall(duration + 20, () => {
      cupA.x = xB;
      cupB.x = xA;

      cupA.graphic.setPosition(cupA.x, CUP_Y);
      cupA.zone.setPosition(cupA.x, CUP_Y - CUP_HEIGHT / 2);
      cupB.graphic.setPosition(cupB.x, CUP_Y);
      cupB.zone.setPosition(cupB.x, CUP_Y - CUP_HEIGHT / 2);

      onComplete();
    });
  }

  private onCupClick(cupIndex: number) {
    if (this.shuffling || !this.cupsDown) return;
    this.cupsDown = false;

    playSelect();
    this.ball.setVisible(true);
    this.positionBall(this.ballCupIndex);

    const selected = this.cups[cupIndex];
    this.tweens.add({
      targets: [selected.graphic, selected.zone],
      y: CUP_Y - CUP_HEIGHT - 20,
      duration: 350,
      ease: 'Back.easeOut',
    });

    if (cupIndex === this.ballCupIndex) {
      this.score++;
      this.scoreText.setText(`Score: ${this.score}`);
      this.messageText.setText('Correct!').setColor('#2ecc71');
      playCorrect();

      this.tweens.add({
        targets: this.ball,
        y: BALL_Y - 30,
        duration: 200,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeOut',
      });

      this.time.delayedCall(1800, () => {
        this.round++;
        this.roundText.setText(`Round: ${this.round}`);
        this.resetCupsDown();
        this.ballCupIndex = Phaser.Math.Between(0, this.cupCount - 1);
        this.time.delayedCall(400, () => this.startRound());
      });
    } else {
      this.messageText.setText('Wrong!').setColor('#e74c3c');
      playWrong();

      const correct = this.cups[this.ballCupIndex];
      this.time.delayedCall(300, () => {
        this.tweens.add({
          targets: [correct.graphic, correct.zone],
          y: CUP_Y - CUP_HEIGHT - 20,
          duration: 350,
          ease: 'Back.easeOut',
        });
      });

      this.time.delayedCall(1500, () => this.showGameOver());
    }
  }

  private resetCupsDown() {
    for (const cup of this.cups) {
      this.tweens.add({
        targets: cup.graphic,
        y: CUP_Y,
        duration: 300,
        ease: 'Sine.easeIn',
      });
      this.tweens.add({
        targets: cup.zone,
        y: CUP_Y - CUP_HEIGHT / 2,
        duration: 300,
        ease: 'Sine.easeIn',
      });
    }
  }

  private getHighScore(): number {
    return parseInt(localStorage.getItem('jumpingCup_highScore') || '0', 10);
  }

  private saveHighScore(score: number) {
    const current = this.getHighScore();
    if (score > current) {
      localStorage.setItem('jumpingCup_highScore', String(score));
    }
  }

  private showGameOver() {
    const prev = this.getHighScore();
    this.saveHighScore(this.score);
    const isNewBest = this.score > prev && this.score > 0;

    this.highScoreText.setText(`Best: ${this.getHighScore()}`);

    const finalScore = this.gameOverGroup.getByName('finalScore') as Phaser.GameObjects.Text;
    finalScore.setText(`Score: ${this.score}  ·  Round: ${this.round}`);

    const newBest = this.gameOverGroup.getByName('newBest') as Phaser.GameObjects.Text;
    newBest.setText(isNewBest ? 'New Best!' : '');

    this.gameOverGroup.setVisible(true);
    this.gameOverGroup.setAlpha(0);
    this.tweens.add({
      targets: this.gameOverGroup,
      alpha: 1,
      duration: 400,
    });

    this.time.delayedCall(500, () => {
      this.input.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
        // Check if they clicked the Menu button (bottom area of panel)
        const menuY = H / 2 + 105;
        if (Math.abs(pointer.y - menuY) < 20 && Math.abs(pointer.x - W / 2) < 40) {
          return; // Let the menu button handler deal with it
        }
        this.scene.start('GameScene', { cupCount: this.cupCount });
      });
    });
  }
}
