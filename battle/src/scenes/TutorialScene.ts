import Phaser from 'phaser';

interface TutorialStep {
  title: string;
  text: string;
  highlight?: string; // 'top-left' | 'bottom-right' | 'center' | 'none'
  action?: string; // hint for what to do
}

const STEPS: TutorialStep[] = [
  {
    title: 'Welcome to Battle of the Ages!',
    text: 'This tutorial will teach you the basics.\nClick "Next" to continue or "Skip" to jump into the game.',
  },
  {
    title: 'Selecting Units',
    text: 'Click on a unit to select it.\nDrag to box-select multiple units.\nDouble-click to select all of the same type on screen.',
    action: 'Try clicking on a villager!',
  },
  {
    title: 'Moving Units',
    text: 'With units selected, click on empty ground to move them.\nOn desktop: right-click also works.\nOn mobile: tap where you want them to go.',
  },
  {
    title: 'Gathering Resources',
    text: 'Select villagers and click on a resource (trees, gold, stone, berries).\nThey will gather automatically and return resources to your Town Center.\n\nUse the Gather buttons (G/W/O/N) to auto-assign to a resource type.',
    highlight: 'bottom-right',
  },
  {
    title: 'Building Structures',
    text: 'Select a villager, then click a Build button in the action panel.\nA green hologram follows your cursor — click to place it.\nThe villager will walk over and construct it.\n\nRight-click, Escape, or two-finger tap to cancel placement.',
    highlight: 'bottom-right',
  },
  {
    title: 'Multiple Builders',
    text: 'Select multiple villagers and click an unfinished building.\nThey will all help build it, speeding up construction!\n\n2 builders = 1.6x speed\n3 builders = 2.2x speed',
  },
  {
    title: 'Training Units',
    text: 'Click on a military building (Barracks, Archery Range, Stable).\nUse the action panel to train soldiers.\n\nThe Town Center trains Villagers (V), Settlers (P), and Scouts.',
    highlight: 'bottom-right',
  },
  {
    title: 'Combat',
    text: 'Select military units and click an enemy to attack.\nPress A to attack the nearest enemy.\n\nUnit counters matter!\n  Spearmen beat Cavalry\n  Cavalry beats Archers\n  Archers beat Infantry',
  },
  {
    title: 'Advancing Ages',
    text: 'Select your Town Center and press T to advance to the next age.\nRequires: enough resources + at least 2 buildings from your current age.\n\nEach age unlocks new units, buildings, and technologies!',
    highlight: 'bottom-right',
  },
  {
    title: 'Settlers & New Cities',
    text: 'Train a Settler at your Town Center (P key).\nSelect the Settler and press F to "Found City".\nThis creates a new Town Center and 2 villagers!',
  },
  {
    title: 'Defensive Buildings',
    text: 'Build walls, towers, and traps to protect your base.\nOutposts and Guard Towers automatically shoot nearby enemies.\nWalls block enemy movement.',
  },
  {
    title: 'Diplomacy',
    text: 'Press P to open the Diplomacy panel.\nYou can offer peace, propose alliances, send tribute, or declare war.\nAllies share vision and generate trade income together.',
  },
  {
    title: 'Nations & Bonuses',
    text: 'Each nation has unique units, buildings, and economic bonuses.\nChoose your nation in the settings before starting a game.\nHover over nations to see their special abilities.',
  },
  {
    title: 'Hotkeys',
    text: 'Ctrl+1-9: Assign control groups\n1-9: Select control group (double-tap to jump)\nEsc: Deselect / Cancel placement\n.: Cycle idle villagers\nP: Diplomacy panel\nT: Advance age\nScroll wheel: Zoom in/out',
  },
  {
    title: 'Victory!',
    text: 'Win by:\n  Domination — destroy all enemies\n  Wonder — build a Wonder and defend it for 5 minutes\n  Timed — highest score when time runs out\n\nGood luck, Commander!',
  },
];

export class TutorialScene extends Phaser.Scene {
  private currentStep = 0;
  private container!: Phaser.GameObjects.Container;
  private stepTitle!: Phaser.GameObjects.Text;
  private stepText!: Phaser.GameObjects.Text;
  private stepAction!: Phaser.GameObjects.Text;
  private stepCounter!: Phaser.GameObjects.Text;
  private panelBg!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'TutorialScene' });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    // Dark background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1a1a3e, 0x1a1a3e, 1);
    bg.fillRect(0, 0, w, h);

    this.container = this.add.container(0, 0).setDepth(10);

    // Panel
    const panelW = 520;
    const panelH = 360;
    this.panelBg = this.add.rectangle(cx, cy, panelW, panelH, 0x111122, 0.95)
      .setStrokeStyle(2, 0x444466);
    this.container.add(this.panelBg);

    // Title
    this.stepTitle = this.add.text(cx, cy - 140, '', {
      fontSize: '20px', color: '#ccaa44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(this.stepTitle);

    // Divider
    const div = this.add.rectangle(cx, cy - 118, panelW - 40, 1, 0x444466);
    this.container.add(div);

    // Body text
    this.stepText = this.add.text(cx, cy - 20, '', {
      fontSize: '13px', color: '#cccccc', fontFamily: 'monospace',
      lineSpacing: 4, align: 'left', wordWrap: { width: panelW - 60 },
    }).setOrigin(0.5);
    this.container.add(this.stepText);

    // Action hint
    this.stepAction = this.add.text(cx, cy + 100, '', {
      fontSize: '12px', color: '#88cc44', fontFamily: 'monospace', fontStyle: 'italic',
    }).setOrigin(0.5);
    this.container.add(this.stepAction);

    // Step counter
    this.stepCounter = this.add.text(cx, cy + 140, '', {
      fontSize: '11px', color: '#666677', fontFamily: 'monospace',
    }).setOrigin(0.5);
    this.container.add(this.stepCounter);

    // Navigation buttons
    const btnY = cy + panelH / 2 - 30;

    // Previous
    const prevBtn = this.createButton(cx - 120, btnY, 90, 'Previous', '#aaaaaa', () => {
      if (this.currentStep > 0) { this.currentStep--; this.showStep(); }
    });
    this.container.add(prevBtn);

    // Next
    const nextBtn = this.createButton(cx, btnY, 90, 'Next', '#88cc44', () => {
      if (this.currentStep < STEPS.length - 1) { this.currentStep++; this.showStep(); }
      else { this.scene.start('MenuScene'); }
    });
    this.container.add(nextBtn);

    // Skip
    const skipBtn = this.createButton(cx + 120, btnY, 90, 'Skip', '#884444', () => {
      this.scene.start('MenuScene');
    });
    this.container.add(skipBtn);

    // Keyboard nav
    this.input.keyboard?.on('keydown-RIGHT', () => {
      if (this.currentStep < STEPS.length - 1) { this.currentStep++; this.showStep(); }
      else { this.scene.start('MenuScene'); }
    });
    this.input.keyboard?.on('keydown-LEFT', () => {
      if (this.currentStep > 0) { this.currentStep--; this.showStep(); }
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      this.scene.start('MenuScene');
    });

    this.showStep();
  }

  private showStep() {
    const step = STEPS[this.currentStep];
    this.stepTitle.setText(step.title);
    this.stepText.setText(step.text);
    this.stepAction.setText(step.action ?? '');
    this.stepCounter.setText(`${this.currentStep + 1} / ${STEPS.length}`);

    // Highlight indicator
    if (step.highlight === 'bottom-right') {
      this.stepAction.setText((step.action ?? '') + (step.action ? '\n' : '') + '(See the action panel on the right side)');
    }
  }

  private createButton(x: number, y: number, w: number, label: string, color: string, onClick: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, 30, 0x222233, 1)
      .setStrokeStyle(1, 0x555566)
      .setInteractive({ useHandCursor: true });

    const txt = this.add.text(0, 0, label, {
      fontSize: '13px', color, fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerover', () => { bg.setStrokeStyle(1, 0x88cc44); txt.setColor('#ffffff'); });
    bg.on('pointerout', () => { bg.setStrokeStyle(1, 0x555566); txt.setColor(color); });
    bg.on('pointerdown', onClick);

    container.add([bg, txt]);
    return container;
  }
}
