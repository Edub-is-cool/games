import Phaser from 'phaser';

interface GamePrefs {
  masterVolume: number;    // 0-100
  sfxVolume: number;       // 0-100
  musicVolume: number;     // 0-100
  uiScale: number;         // 50-150 (percentage)
  scrollSpeed: number;     // 50-200 (percentage)
  edgeScrolling: boolean;
  showFPS: boolean;
  showMinimap: boolean;
  fullscreen: boolean;
  pixelArt: boolean;
  dayNightCycle: boolean;
  screenShake: boolean;
  autoSave: boolean;
  language: string;
}

const DEFAULTS: GamePrefs = {
  masterVolume: 80,
  sfxVolume: 100,
  musicVolume: 60,
  uiScale: 100,
  scrollSpeed: 100,
  edgeScrolling: true,
  showFPS: false,
  showMinimap: true,
  fullscreen: false,
  pixelArt: true,
  dayNightCycle: true,
  screenShake: true,
  autoSave: true,
  language: 'English',
};

// Persist to localStorage
function loadPrefs(): GamePrefs {
  try {
    const raw = localStorage.getItem('bota_settings');
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

function savePrefs(prefs: GamePrefs) {
  try {
    localStorage.setItem('bota_settings', JSON.stringify(prefs));
  } catch {}
}

export { GamePrefs, loadPrefs, savePrefs };

export class SettingsScene extends Phaser.Scene {
  private prefs!: GamePrefs;
  private container!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'SettingsScene' });
  }

  create() {
    this.prefs = loadPrefs();

    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1a1a3e, 0x1a1a3e, 1);
    bg.fillRect(0, 0, w, h);

    // Title
    this.add.text(cx, 30, 'SETTINGS', {
      fontSize: '24px', color: '#ccaa44', fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    this.container = this.add.container(0, 0).setDepth(10);
    this.buildSettings(cx, w, h);

    // Back button
    const backBtn = this.add.rectangle(cx, h - 40, 140, 36, 0x222233, 0.9)
      .setStrokeStyle(1, 0x555566).setInteractive({ useHandCursor: true }).setDepth(10);
    const backLabel = this.add.text(cx, h - 40, 'BACK', {
      fontSize: '15px', color: '#88cc44', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(11);

    backBtn.on('pointerover', () => { backBtn.setStrokeStyle(2, 0x88cc44); backLabel.setColor('#aaffaa'); });
    backBtn.on('pointerout', () => { backBtn.setStrokeStyle(1, 0x555566); backLabel.setColor('#88cc44'); });
    backBtn.on('pointerdown', () => {
      savePrefs(this.prefs);
      this.scene.start('MenuScene');
    });

    this.input.keyboard?.on('keydown-ESC', () => {
      savePrefs(this.prefs);
      this.scene.start('MenuScene');
    });
  }

  private buildSettings(cx: number, w: number, _h: number) {
    this.container.removeAll(true);

    const panelW = Math.min(500, w - 40);
    const panelX = cx - panelW / 2;
    let y = 65;

    // ── Audio ──
    y = this.addSection('AUDIO', cx, y);
    y = this.addSlider('Master Volume', panelX, cx, y, this.prefs.masterVolume, 0, 100, (v) => { this.prefs.masterVolume = v; });
    y = this.addSlider('SFX Volume', panelX, cx, y, this.prefs.sfxVolume, 0, 100, (v) => { this.prefs.sfxVolume = v; });
    y = this.addSlider('Music Volume', panelX, cx, y, this.prefs.musicVolume, 0, 100, (v) => { this.prefs.musicVolume = v; });

    // ── Display ──
    y = this.addSection('DISPLAY', cx, y);
    y = this.addSlider('UI Scale', panelX, cx, y, this.prefs.uiScale, 50, 150, (v) => { this.prefs.uiScale = v; });
    y = this.addToggle('Fullscreen', panelX, cx, y, this.prefs.fullscreen, (v) => {
      this.prefs.fullscreen = v;
      if (v) this.scale.startFullscreen();
      else this.scale.stopFullscreen();
    });
    y = this.addToggle('Pixel Art (Crisp)', panelX, cx, y, this.prefs.pixelArt, (v) => { this.prefs.pixelArt = v; });
    y = this.addToggle('Day/Night Cycle', panelX, cx, y, this.prefs.dayNightCycle, (v) => { this.prefs.dayNightCycle = v; });
    y = this.addToggle('Show FPS', panelX, cx, y, this.prefs.showFPS, (v) => { this.prefs.showFPS = v; });

    // ── Controls ──
    y = this.addSection('CONTROLS', cx, y);
    y = this.addSlider('Scroll Speed', panelX, cx, y, this.prefs.scrollSpeed, 50, 200, (v) => { this.prefs.scrollSpeed = v; });
    y = this.addToggle('Edge Scrolling', panelX, cx, y, this.prefs.edgeScrolling, (v) => { this.prefs.edgeScrolling = v; });
    y = this.addToggle('Screen Shake', panelX, cx, y, this.prefs.screenShake, (v) => { this.prefs.screenShake = v; });

    // ── Game ──
    y = this.addSection('GAME', cx, y);
    y = this.addToggle('Show Minimap', panelX, cx, y, this.prefs.showMinimap, (v) => { this.prefs.showMinimap = v; });
    y = this.addToggle('Auto-Save', panelX, cx, y, this.prefs.autoSave, (v) => { this.prefs.autoSave = v; });
    y = this.addCycle('Language', panelX, cx, y, this.prefs.language,
      ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Chinese', 'Japanese', 'Korean'],
      (v) => { this.prefs.language = v; });

    // ── Reset ──
    y += 10;
    const resetBtn = this.add.rectangle(cx, y + 12, 160, 28, 0x332222, 1)
      .setStrokeStyle(1, 0x664444).setInteractive({ useHandCursor: true });
    const resetLabel = this.add.text(cx, y + 12, 'Reset to Defaults', {
      fontSize: '12px', color: '#cc6644', fontFamily: 'monospace',
    }).setOrigin(0.5);
    resetBtn.on('pointerover', () => resetBtn.setStrokeStyle(1, 0xcc4444));
    resetBtn.on('pointerout', () => resetBtn.setStrokeStyle(1, 0x664444));
    resetBtn.on('pointerdown', () => {
      this.prefs = { ...DEFAULTS };
      savePrefs(this.prefs);
      this.buildSettings(cx, this.scale.width, this.scale.height);
    });
    this.container.add([resetBtn, resetLabel]);

    // Panel background
    const panelBg = this.add.rectangle(cx, 60, panelW + 20, y - 30, 0x111122, 0.85)
      .setOrigin(0.5, 0).setStrokeStyle(1, 0x333344);
    this.container.addAt(panelBg, 0);
  }

  // ── UI Builders ──

  private addSection(title: string, cx: number, y: number): number {
    const line = this.add.graphics();
    line.lineStyle(1, 0x444455, 0.4);
    line.lineBetween(cx - 200, y + 2, cx + 200, y + 2);
    this.container.add(line);

    const label = this.add.text(cx, y + 12, title, {
      fontSize: '11px', color: '#ccaa44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.container.add(label);
    return y + 28;
  }

  private addSlider(label: string, px: number, cx: number, y: number,
    value: number, min: number, max: number, onChange: (v: number) => void): number {

    const lbl = this.add.text(px + 10, y + 3, label, {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    });
    this.container.add(lbl);

    const barX = cx + 20;
    const barW = 140;
    const barY = y + 8;

    // Track
    const track = this.add.rectangle(barX, barY, barW, 6, 0x333344).setOrigin(0, 0.5);
    this.container.add(track);

    // Fill
    const pct = (value - min) / (max - min);
    const fill = this.add.rectangle(barX, barY, barW * pct, 6, 0x88cc44).setOrigin(0, 0.5);
    this.container.add(fill);

    // Value text
    const valText = this.add.text(barX + barW + 10, y + 2, `${value}`, {
      fontSize: '11px', color: '#cccccc', fontFamily: 'monospace',
    });
    this.container.add(valText);

    // Clickable area
    const hit = this.add.rectangle(barX + barW / 2, barY, barW + 10, 18, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.container.add(hit);

    hit.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - (barX);
      const newPct = Phaser.Math.Clamp(localX / barW, 0, 1);
      const newVal = Math.round(min + newPct * (max - min));
      onChange(newVal);
      fill.setSize(barW * newPct, 6);
      valText.setText(`${newVal}`);
    });

    return y + 26;
  }

  private addToggle(label: string, px: number, cx: number, y: number,
    value: boolean, onChange: (v: boolean) => void): number {

    const lbl = this.add.text(px + 10, y + 3, label, {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    });
    this.container.add(lbl);

    const btnX = cx + 80;
    const bg = this.add.rectangle(btnX, y + 8, 50, 20, value ? 0x335533 : 0x333344, 1)
      .setStrokeStyle(1, value ? 0x88cc44 : 0x555566)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(btnX, y + 8, value ? 'ON' : 'OFF', {
      fontSize: '11px', color: value ? '#88cc44' : '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      const newVal = !value;
      value = newVal;
      onChange(newVal);
      bg.setFillStyle(newVal ? 0x335533 : 0x333344);
      bg.setStrokeStyle(1, newVal ? 0x88cc44 : 0x555566);
      txt.setText(newVal ? 'ON' : 'OFF');
      txt.setColor(newVal ? '#88cc44' : '#888888');
    });

    this.container.add([bg, txt]);
    return y + 26;
  }

  private addCycle(label: string, px: number, cx: number, y: number,
    value: string, options: string[], onChange: (v: string) => void): number {

    const lbl = this.add.text(px + 10, y + 3, label, {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    });
    this.container.add(lbl);

    const btnX = cx + 80;
    const bg = this.add.rectangle(btnX, y + 8, 100, 20, 0x222233, 1)
      .setStrokeStyle(1, 0x444455)
      .setInteractive({ useHandCursor: true });
    const txt = this.add.text(btnX, y + 8, value, {
      fontSize: '11px', color: '#cccccc', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setStrokeStyle(1, 0x88cc44));
    bg.on('pointerout', () => bg.setStrokeStyle(1, 0x444455));
    bg.on('pointerdown', () => {
      const idx = options.indexOf(value);
      value = options[(idx + 1) % options.length];
      onChange(value);
      txt.setText(value);
    });

    this.container.add([bg, txt]);
    return y + 26;
  }
}
