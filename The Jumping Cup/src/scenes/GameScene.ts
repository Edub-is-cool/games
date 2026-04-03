import Phaser from 'phaser';

const CUP_COUNT = 3;
const CUP_WIDTH = 100;
const CUP_HEIGHT = 130;
const CUP_SPACING = 160;
const CUP_Y = 300;
const BALL_RADIUS = 18;
const BALL_Y = CUP_Y + BALL_RADIUS + 5;

interface Cup {
  graphic: Phaser.GameObjects.Graphics;
  zone: Phaser.GameObjects.Zone;
  x: number;
  index: number;
}

export class GameScene extends Phaser.Scene {
  private cups: Cup[] = [];
  private ball!: Phaser.GameObjects.Graphics;
  private ballCupIndex = 0;
  private score = 0;
  private round = 1;
  private scoreText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private messageText!: Phaser.GameObjects.Text;
  private gameOverGroup!: Phaser.GameObjects.Container;
  private shuffling = false;
  private cupsDown = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
    this.cups = [];
    this.score = 0;
    this.round = 1;
    this.shuffling = false;
    this.cupsDown = false;

    // Title
    this.add.text(400, 40, 'The Jumping Cup', {
      fontSize: '36px',
      color: '#f5e6c8',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);

    // Score & round
    this.scoreText = this.add.text(20, 20, 'Score: 0', {
      fontSize: '22px',
      color: '#ffffff',
    });
    this.roundText = this.add.text(20, 50, 'Round: 1', {
      fontSize: '22px',
      color: '#ffffff',
    });

    // Message
    this.messageText = this.add.text(400, 500, 'Watch the ball!', {
      fontSize: '28px',
      color: '#ffdd57',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Table surface
    this.add.graphics()
      .fillStyle(0x3a2a15, 1)
      .fillRoundedRect(50, CUP_Y + 10, 700, 30, 8);

    // Create ball
    this.ball = this.add.graphics();
    this.drawBall();

    // Create cups
    const startX = 400 - (CUP_COUNT - 1) * CUP_SPACING / 2;
    for (let i = 0; i < CUP_COUNT; i++) {
      const x = startX + i * CUP_SPACING;
      const graphic = this.add.graphics();
      this.drawCup(graphic, 0, 0);
      graphic.setPosition(x, CUP_Y);

      // Use a Zone for hit detection — it moves with its position properly
      const zone = this.add.zone(x, CUP_Y - CUP_HEIGHT / 2, CUP_WIDTH + 20, CUP_HEIGHT + 30)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => this.onCupClick(i));

      this.cups.push({ graphic, zone, x, index: i });
    }

    // Game over overlay (hidden initially)
    this.gameOverGroup = this.add.container(400, 300).setVisible(false).setDepth(10);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRoundedRect(-200, -100, 400, 200, 16);
    this.gameOverGroup.add(bg);

    const goText = this.add.text(0, -50, 'Game Over!', {
      fontSize: '40px',
      color: '#e74c3c',
      fontFamily: 'Georgia, serif',
    }).setOrigin(0.5);
    this.gameOverGroup.add(goText);

    const finalScore = this.add.text(0, 0, '', {
      fontSize: '26px',
      color: '#ffffff',
    }).setOrigin(0.5);
    finalScore.setName('finalScore');
    this.gameOverGroup.add(finalScore);

    const restart = this.add.text(0, 55, 'Tap to Retry', {
      fontSize: '24px',
      color: '#f1c40f',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
    this.gameOverGroup.add(restart);

    // Place ball under random cup
    this.ballCupIndex = Phaser.Math.Between(0, CUP_COUNT - 1);
    this.positionBall(this.ballCupIndex);

    // Start the round sequence
    this.startRound();
  }

  private drawCup(g: Phaser.GameObjects.Graphics, cx: number, cy: number) {
    g.clear();

    // Cup drawn relative to its anchor: cx, cy is the bottom-center
    const topW = CUP_WIDTH * 0.6;
    const botW = CUP_WIDTH;
    const h = CUP_HEIGHT;
    const top = cy - h;

    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(cx, cy + 5, botW + 10, 16);

    // Main cup body
    g.fillStyle(0xc0392b, 1);
    g.beginPath();
    g.moveTo(cx - topW / 2, top);
    g.lineTo(cx - botW / 2, cy);
    g.lineTo(cx + botW / 2, cy);
    g.lineTo(cx + topW / 2, top);
    g.closePath();
    g.fillPath();

    // Rim highlight
    g.fillStyle(0xe74c3c, 1);
    g.fillEllipse(cx, top, topW, 16);

    // Stripe decoration
    g.fillStyle(0xd44a3a, 1);
    const stripeY = top + h * 0.35;
    const stripeW = topW + (botW - topW) * 0.35;
    g.fillRect(cx - stripeW / 2 + 5, stripeY, stripeW - 10, 6);

    // Highlight / shine
    g.fillStyle(0xe8685a, 0.4);
    g.beginPath();
    g.moveTo(cx - topW / 2 + 8, top + 10);
    g.lineTo(cx - botW / 2 + 15, cy - 10);
    g.lineTo(cx - botW / 2 + 25, cy - 10);
    g.lineTo(cx - topW / 2 + 18, top + 10);
    g.closePath();
    g.fillPath();
  }

  private drawBall() {
    this.ball.clear();
    this.ball.fillStyle(0x000000, 0.25);
    this.ball.fillEllipse(0, BALL_RADIUS * 0.3, BALL_RADIUS * 2.2, BALL_RADIUS * 0.8);
    this.ball.fillStyle(0xf1c40f, 1);
    this.ball.fillCircle(0, 0, BALL_RADIUS);
    this.ball.fillStyle(0xf9e584, 0.7);
    this.ball.fillCircle(-5, -6, 7);
  }

  private positionBall(cupIndex: number) {
    const cup = this.cups[cupIndex];
    this.ball.setPosition(cup.x, BALL_Y);
  }

  private startRound() {
    this.shuffling = true;
    this.cupsDown = false;
    this.messageText.setText('Watch the ball!').setColor('#ffdd57');

    // Show ball
    this.ball.setVisible(true);
    this.positionBall(this.ballCupIndex);

    // Lift cups up to reveal ball
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
      // Lower cups to hide ball
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
    const numShuffles = Math.min(3 + this.round, 12);
    const speed = Math.max(200, 450 - this.round * 30);
    let shufflesDone = 0;

    const doOne = () => {
      if (shufflesDone >= numShuffles) {
        this.shuffling = false;
        this.cupsDown = true;
        this.messageText.setText('Where is the ball?');
        return;
      }

      let a = Phaser.Math.Between(0, CUP_COUNT - 1);
      let b = Phaser.Math.Between(0, CUP_COUNT - 2);
      if (b >= a) b++;

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
    const arcHeight = 60;

    // Animate cup A
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

    // Animate cup B
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
      // Update logical positions
      cupA.x = xB;
      cupB.x = xA;

      // Snap to final positions
      cupA.graphic.setPosition(cupA.x, CUP_Y);
      cupA.zone.setPosition(cupA.x, CUP_Y - CUP_HEIGHT / 2);
      cupB.graphic.setPosition(cupB.x, CUP_Y);
      cupB.zone.setPosition(cupB.x, CUP_Y - CUP_HEIGHT / 2);

      // Track ball
      if (this.ballCupIndex === a) {
        this.ballCupIndex = b;
      } else if (this.ballCupIndex === b) {
        this.ballCupIndex = a;
      }

      onComplete();
    });
  }

  private onCupClick(cupIndex: number) {
    if (this.shuffling || !this.cupsDown) return;
    this.cupsDown = false;

    // Reveal ball
    this.ball.setVisible(true);
    this.positionBall(this.ballCupIndex);

    // Lift selected cup
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

      this.tweens.add({
        targets: this.ball,
        y: BALL_Y - 30,
        duration: 200,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeOut',
      });

      // Continue to next round
      this.time.delayedCall(1800, () => {
        this.round++;
        this.roundText.setText(`Round: ${this.round}`);
        this.resetCupsDown();
        this.ballCupIndex = Phaser.Math.Between(0, CUP_COUNT - 1);
        this.time.delayedCall(400, () => this.startRound());
      });
    } else {
      this.messageText.setText('Wrong!').setColor('#e74c3c');

      // Lift correct cup to show ball
      const correct = this.cups[this.ballCupIndex];
      this.time.delayedCall(300, () => {
        this.tweens.add({
          targets: [correct.graphic, correct.zone],
          y: CUP_Y - CUP_HEIGHT - 20,
          duration: 350,
          ease: 'Back.easeOut',
        });
      });

      // Show game over
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

  private showGameOver() {
    const finalScore = this.gameOverGroup.getByName('finalScore') as Phaser.GameObjects.Text;
    finalScore.setText(`Score: ${this.score}  |  Round: ${this.round}`);
    this.gameOverGroup.setVisible(true);
    this.gameOverGroup.setAlpha(0);
    this.tweens.add({
      targets: this.gameOverGroup,
      alpha: 1,
      duration: 400,
    });

    // Tap anywhere to restart
    this.time.delayedCall(500, () => {
      this.input.once('pointerdown', () => {
        this.scene.restart();
      });
    });
  }
}
