import Phaser from 'phaser';

const CUP_COUNT = 3;
const CUP_WIDTH = 100;
const CUP_HEIGHT = 130;
const CUP_SPACING = 160;
const CUP_Y = 300;
const BALL_RADIUS = 18;
const BALL_Y = CUP_Y + CUP_HEIGHT / 2 + BALL_RADIUS + 5;

interface Cup {
  graphic: Phaser.GameObjects.Graphics;
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
  private shuffling = false;
  private cupsDown = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create() {
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
      .fillRoundedRect(50, CUP_Y + CUP_HEIGHT / 2 + 10, 700, 30, 8);

    // Create ball
    this.ball = this.add.graphics();
    this.drawBall();

    // Create cups
    const startX = 400 - (CUP_COUNT - 1) * CUP_SPACING / 2;
    for (let i = 0; i < CUP_COUNT; i++) {
      const x = startX + i * CUP_SPACING;
      const graphic = this.add.graphics();
      this.drawCup(graphic, x, CUP_Y - CUP_HEIGHT);
      graphic.setInteractive(
        new Phaser.Geom.Rectangle(x - CUP_WIDTH / 2, CUP_Y - CUP_HEIGHT, CUP_WIDTH, CUP_HEIGHT),
        Phaser.Geom.Rectangle.Contains
      );
      graphic.on('pointerdown', () => this.onCupClick(i));
      graphic.on('pointerover', () => {
        if (!this.shuffling && this.cupsDown) {
          graphic.setAlpha(0.85);
        }
      });
      graphic.on('pointerout', () => graphic.setAlpha(1));
      this.cups.push({ graphic, x, index: i });
    }

    // Place ball under random cup
    this.ballCupIndex = Phaser.Math.Between(0, CUP_COUNT - 1);
    this.positionBall(this.ballCupIndex);

    // Start the round sequence
    this.startRound();
  }

  private drawCup(g: Phaser.GameObjects.Graphics, x: number, y: number) {
    g.clear();

    // Cup body — trapezoid shape
    const topW = CUP_WIDTH * 0.6;
    const botW = CUP_WIDTH;
    const h = CUP_HEIGHT;

    // Shadow
    g.fillStyle(0x000000, 0.2);
    g.fillEllipse(x, y + h + 5, botW + 10, 16);

    // Main cup body
    g.fillStyle(0xc0392b, 1);
    g.beginPath();
    g.moveTo(x - topW / 2, y);
    g.lineTo(x - botW / 2, y + h);
    g.lineTo(x + botW / 2, y + h);
    g.lineTo(x + topW / 2, y);
    g.closePath();
    g.fillPath();

    // Rim highlight
    g.fillStyle(0xe74c3c, 1);
    g.fillEllipse(x, y, topW, 16);

    // Stripe decoration
    g.fillStyle(0xd44a3a, 1);
    const stripeY = y + h * 0.35;
    const stripeW = topW + (botW - topW) * 0.35;
    g.fillRect(x - stripeW / 2 + 5, stripeY, stripeW - 10, 6);

    // Highlight / shine
    g.fillStyle(0xe8685a, 0.4);
    g.beginPath();
    g.moveTo(x - topW / 2 + 8, y + 10);
    g.lineTo(x - botW / 2 + 15, y + h - 10);
    g.lineTo(x - botW / 2 + 25, y + h - 10);
    g.lineTo(x - topW / 2 + 18, y + 10);
    g.closePath();
    g.fillPath();
  }

  private drawBall() {
    this.ball.clear();
    // Shadow
    this.ball.fillStyle(0x000000, 0.25);
    this.ball.fillEllipse(0, BALL_RADIUS * 0.3, BALL_RADIUS * 2.2, BALL_RADIUS * 0.8);
    // Ball
    this.ball.fillStyle(0xf1c40f, 1);
    this.ball.fillCircle(0, 0, BALL_RADIUS);
    // Shine
    this.ball.fillStyle(0xf9e584, 0.7);
    this.ball.fillCircle(-5, -6, 7);
  }

  private positionBall(cupIndex: number) {
    const cup = this.cups[cupIndex];
    this.ball.setPosition(cup.x, BALL_Y);
  }

  private getCupX(index: number): number {
    return this.cups[index].x;
  }

  private startRound() {
    this.shuffling = true;
    this.cupsDown = false;
    this.messageText.setText('Watch the ball!');

    // Show ball
    this.ball.setVisible(true);
    this.positionBall(this.ballCupIndex);

    // Lift cups up to reveal ball
    const liftDuration = 400;
    for (const cup of this.cups) {
      this.tweens.add({
        targets: cup.graphic,
        y: -CUP_HEIGHT * 0.6,
        duration: liftDuration,
        ease: 'Back.easeOut',
      });
    }

    this.time.delayedCall(liftDuration + 800, () => {
      // Lower cups to hide ball
      for (const cup of this.cups) {
        this.tweens.add({
          targets: cup.graphic,
          y: 0,
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

      // Pick two different cups to swap
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

    // Arc height for the swap animation
    const arcHeight = -60;

    // Animate cup A to cup B's position (arc over)
    this.tweens.add({
      targets: cupA.graphic,
      x: xB - xA,
      duration,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: cupA.graphic,
      y: arcHeight,
      duration: duration / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
    });

    // Animate cup B to cup A's position (arc under)
    this.tweens.add({
      targets: cupB.graphic,
      x: xA - xB,
      duration,
      ease: 'Sine.easeInOut',
    });
    this.tweens.add({
      targets: cupB.graphic,
      y: arcHeight * 0.3,
      duration: duration / 2,
      ease: 'Sine.easeOut',
      yoyo: true,
    });

    this.time.delayedCall(duration + 20, () => {
      // Reset graphic positions and swap logical x positions
      cupA.graphic.setPosition(0, 0);
      cupB.graphic.setPosition(0, 0);

      cupA.x = xB;
      cupB.x = xA;

      // Redraw cups at new positions
      this.drawCup(cupA.graphic, cupA.x, CUP_Y - CUP_HEIGHT);
      this.drawCup(cupB.graphic, cupB.x, CUP_Y - CUP_HEIGHT);

      // Update interactive areas
      cupA.graphic.setInteractive(
        new Phaser.Geom.Rectangle(cupA.x - CUP_WIDTH / 2, CUP_Y - CUP_HEIGHT, CUP_WIDTH, CUP_HEIGHT),
        Phaser.Geom.Rectangle.Contains
      );
      cupB.graphic.setInteractive(
        new Phaser.Geom.Rectangle(cupB.x - CUP_WIDTH / 2, CUP_Y - CUP_HEIGHT, CUP_WIDTH, CUP_HEIGHT),
        Phaser.Geom.Rectangle.Contains
      );

      // Track ball position
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
      targets: selected.graphic,
      y: -CUP_HEIGHT * 0.6,
      duration: 350,
      ease: 'Back.easeOut',
    });

    if (cupIndex === this.ballCupIndex) {
      this.score++;
      this.scoreText.setText(`Score: ${this.score}`);
      this.messageText.setText('Correct!').setColor('#2ecc71');

      // Celebrate ball bounce
      this.tweens.add({
        targets: this.ball,
        y: BALL_Y - 30,
        duration: 200,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeOut',
      });
    } else {
      this.messageText.setText('Wrong!').setColor('#e74c3c');

      // Also lift the correct cup to show where ball was
      const correct = this.cups[this.ballCupIndex];
      this.time.delayedCall(300, () => {
        this.tweens.add({
          targets: correct.graphic,
          y: -CUP_HEIGHT * 0.6,
          duration: 350,
          ease: 'Back.easeOut',
        });
      });
    }

    // Next round
    this.time.delayedCall(1800, () => {
      this.messageText.setColor('#ffdd57');
      this.round++;
      this.roundText.setText(`Round: ${this.round}`);

      // Lower all cups back
      for (const cup of this.cups) {
        this.tweens.add({
          targets: cup.graphic,
          y: 0,
          duration: 300,
          ease: 'Sine.easeIn',
        });
      }

      // Pick new random ball position
      this.ballCupIndex = Phaser.Math.Between(0, CUP_COUNT - 1);

      this.time.delayedCall(400, () => this.startRound());
    });
  }
}
