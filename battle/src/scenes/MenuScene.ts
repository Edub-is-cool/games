import Phaser from 'phaser';
import {
  GameSettings,
  CPUPlayer,
  Difficulty,
  MapSize,
  StartingRes,
  PLAYER_COLORS,
  DIFFICULTY_LABELS,
  MAP_SIZE_LABELS,
  STARTING_RES_LABELS,
  DEFAULT_SETTINGS,
} from '../config/gameSettings';
import { NATIONS, NATION_LIST, getNationIds } from '../config/nations';

const PARTICLE_COUNT = 60;

interface MenuParticle {
  x: number; y: number; vx: number; vy: number;
  size: number; color: number; alpha: number;
}

export class MenuScene extends Phaser.Scene {
  private particles: MenuParticle[] = [];
  private particleGraphics!: Phaser.GameObjects.Graphics;
  private settingsContainer!: Phaser.GameObjects.Container;
  private nationTooltip!: Phaser.GameObjects.Container;

  // Mutable settings state
  private playerName = DEFAULT_SETTINGS.playerName;
  private playerColor = DEFAULT_SETTINGS.playerColor;
  private playerColorName = DEFAULT_SETTINGS.playerColorName;
  private cpuPlayers: CPUPlayer[] = [...DEFAULT_SETTINGS.cpuPlayers.map((c) => ({ ...c }))];
  private playerNation: string = DEFAULT_SETTINGS.playerNation;
  private mapSize: MapSize = DEFAULT_SETTINGS.mapSize;
  private startingRes: StartingRes = DEFAULT_SETTINGS.startingResources;
  private revealMap = DEFAULT_SETTINGS.revealMap;
  private victoryMode: 'any' | 'domination' | 'wonder' | 'timed' = DEFAULT_SETTINGS.victoryMode;
  private timeLimit = DEFAULT_SETTINGS.timeLimit;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a1e, 0x0a0a1e, 0x1a1a3e, 0x1a1a3e, 1);
    bg.fillRect(0, 0, w, h);

    // Particles
    this.particleGraphics = this.add.graphics().setDepth(1);
    this.particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 20, vy: -10 - Math.random() * 30,
        size: 1 + Math.random() * 2,
        color: Phaser.Math.RND.pick([0xff6633, 0xffaa22, 0xffcc44, 0x888888]),
        alpha: 0.2 + Math.random() * 0.6,
      });
    }

    // Ground & building silhouettes
    const ground = this.add.graphics().setDepth(2);
    ground.fillStyle(0x111118, 1);
    ground.beginPath();
    ground.moveTo(0, h);
    for (let x = 0; x <= w; x += 40) {
      ground.lineTo(x, h - (Math.sin(x * 0.005) * 30 + Math.sin(x * 0.013) * 15 + 60));
    }
    ground.lineTo(w, h);
    ground.closePath();
    ground.fillPath();

    const sil = this.add.graphics().setDepth(3);
    sil.fillStyle(0x0d0d15, 1);
    for (const bx of [w * 0.15, w * 0.35, w * 0.55, w * 0.7, w * 0.85]) {
      const by = h - (Math.sin(bx * 0.005) * 30 + Math.sin(bx * 0.013) * 15 + 60);
      const bw = 12 + Math.random() * 16;
      const bh = 16 + Math.random() * 24;
      sil.fillRect(bx - bw / 2, by - bh, bw, bh);
      if (Math.random() > 0.5) sil.fillTriangle(bx - bw / 2 - 2, by - bh, bx, by - bh - 10, bx + bw / 2 + 2, by - bh);
    }

    // Emblem
    const emblem = this.add.graphics().setDepth(5);
    const ey = 55;
    emblem.lineStyle(3, 0xccaa44, 0.8);
    emblem.lineBetween(cx - 25, ey - 16, cx + 25, ey + 16);
    emblem.lineBetween(cx + 25, ey - 16, cx - 25, ey + 16);
    emblem.lineStyle(4, 0x886622, 1);
    emblem.lineBetween(cx - 25, ey + 14, cx - 25, ey + 22);
    emblem.lineBetween(cx + 25, ey + 14, cx + 25, ey + 22);
    emblem.lineStyle(2, 0xccaa44, 0.6);
    emblem.strokeCircle(cx, ey, 15);

    // Title
    this.add.text(cx, 90, 'BATTLE OF', {
      fontSize: '24px', color: '#aa8833', fontFamily: 'monospace',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(cx, 130, 'THE AGES', {
      fontSize: '52px', color: '#ffcc44', fontFamily: 'monospace',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setDepth(10);

    this.add.text(cx, 160, 'REAL-TIME STRATEGY', {
      fontSize: '11px', color: '#776633', fontFamily: 'monospace',
      letterSpacing: 6, stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(10);

    // Divider
    const div = this.add.graphics().setDepth(10);
    div.lineStyle(1, 0xccaa44, 0.3);
    div.lineBetween(cx - 200, 178, cx + 200, 178);

    // Settings panel
    this.buildSettingsPanel(cx);

    // Bottom buttons
    this.buildMenuButtons(cx, h);

    // Version
    this.add.text(cx, h - 14, 'v0.1  |  Battle of the Ages', {
      fontSize: '10px', color: '#444455', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(10);

    this.scale.on('resize', () => this.scene.restart());
  }

  // ─── Settings Panel ─────────────────────────────────────────

  private buildSettingsPanel(cx: number) {
    if (this.settingsContainer) this.settingsContainer.destroy();
    this.settingsContainer = this.add.container(0, 0).setDepth(10);

    const panelW = 540;
    const panelX = cx - panelW / 2;
    const panelY = 190;
    const col1 = panelX + 14;           // labels
    const col2 = panelX + 110;          // difficulty
    const col3 = panelX + 230;          // color column
    const col4 = panelX + 340;          // nation column
    const colX = panelX + panelW - 30;  // remove btn

    let y = panelY + 12;

    // ── Section: YOUR PLAYER ──
    y = this.addSectionHeader('YOUR PLAYER', cx, y);

    // Player name
    y = this.addSettingRow('Name', col1, col2, y, this.playerName, () => {
      // cycle through some preset names
      const names = ['Player', 'Commander', 'Warlord', 'Emperor', 'General', 'King', 'Champion'];
      const idx = names.indexOf(this.playerName);
      this.playerName = names[(idx + 1) % names.length];
      this.buildSettingsPanel(cx);
    });

    // Player color
    y = this.addColorRow('Color', col1, col2, y, this.playerColor, this.playerColorName, (next) => {
      this.playerColor = next.hex;
      this.playerColorName = next.name;
      this.buildSettingsPanel(cx);
    });

    // Player nation — horizontal selection bar
    const nationLabel = this.add.text(col1, y + 3, 'Nation', {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    });
    this.settingsContainer.add(nationLabel);
    y += 22;

    const nationIds = getNationIds();
    const perRow = 7;
    const btnW = 68;
    const btnH = 24;
    const gapX = 4;
    const gapY = 4;
    const totalRows = Math.ceil(nationIds.length / perRow);

    for (let ni = 0; ni < nationIds.length; ni++) {
      const nId = nationIds[ni];
      const nation = NATIONS[nId];
      const isSelected = nId === this.playerNation;
      const row = Math.floor(ni / perRow);
      const col = ni % perRow;
      const rowWidth = Math.min(perRow, nationIds.length - row * perRow) * (btnW + gapX) - gapX;
      const rowStartX = cx - rowWidth / 2;
      const bx = rowStartX + col * (btnW + gapX) + btnW / 2;
      const by = y + row * (btnH + gapY) + btnH / 2;

      const bg = this.add.rectangle(bx, by, btnW, btnH,
        isSelected ? 0x334433 : 0x222233, 1)
        .setStrokeStyle(isSelected ? 2 : 1, isSelected ? 0x88cc44 : 0x444455)
        .setInteractive({ useHandCursor: true });

      const txt = this.add.text(bx, by, nation?.name?.slice(0, 7) ?? nId.slice(0, 7), {
        fontSize: '9px',
        color: isSelected ? '#88cc44' : '#888888',
        fontFamily: 'monospace',
      }).setOrigin(0.5);

      bg.on('pointerover', () => {
        if (!isSelected) bg.setStrokeStyle(1, 0x88cc44);
        this.showNationTooltip(nId, bx, by + btnH / 2 + 4);
      });
      bg.on('pointerout', () => {
        if (!isSelected) bg.setStrokeStyle(1, 0x444455);
        this.hideNationTooltip();
      });
      bg.on('pointerdown', () => {
        this.playerNation = nId;
        this.hideNationTooltip();
        this.buildSettingsPanel(cx);
      });

      this.settingsContainer.add([bg, txt]);
    }
    y += totalRows * (btnH + gapY) + 4;

    y += 6;

    // ── Section: OPPONENTS ──
    y = this.addSectionHeader('OPPONENTS', cx, y);

    // Column sub-headers — positioned to match actual columns
    for (const [label, lx] of [['PLAYER', col1], ['DIFFICULTY', col2 + 30], ['COLOR', col3 + 14], ['NATION', col4 + 45]] as const) {
      const h = this.add.text(lx as number, y, label as string, {
        fontSize: '10px', color: '#555566', fontFamily: 'monospace',
      }).setOrigin(label === 'PLAYER' ? 0 : 0.5, 0);
      this.settingsContainer.add(h);
    }
    y += 18;

    for (let i = 0; i < this.cpuPlayers.length; i++) {
      const cpu = this.cpuPlayers[i];
      const rowY = y;

      // Label
      this.settingsContainer.add(
        this.add.text(col1, rowY + 4, `CPU ${i + 1}`, {
          fontSize: '12px', color: '#cccccc', fontFamily: 'monospace',
        })
      );

      // Difficulty cycle button
      this.addCycleBtn(col2 + 30, rowY, 86, DIFFICULTY_LABELS[cpu.difficulty],
        this.getDiffColor(cpu.difficulty), () => {
          const diffs: Difficulty[] = ['easy', 'normal', 'hard'];
          cpu.difficulty = diffs[(diffs.indexOf(cpu.difficulty) + 1) % diffs.length];
          this.buildSettingsPanel(cx);
        });

      // Color cycle
      this.addColorSwatch(col3, rowY, cpu.color, cpu.colorName, (next) => {
        cpu.color = next.hex;
        cpu.colorName = next.name;
        this.buildSettingsPanel(cx);
      });

      // Nation (inline)
      const cpuNation = NATIONS[cpu.nation];
      this.addCycleBtn(col4 + 45, rowY, 90, cpuNation?.name ?? 'Random', '#cccccc', () => {
        const ids = getNationIds();
        const idx = ids.indexOf(cpu.nation);
        cpu.nation = ids[(idx + 1) % ids.length];
        this.buildSettingsPanel(cx);
      });

      // Remove
      if (this.cpuPlayers.length > 1) {
        const rm = this.add.text(colX, rowY + 2, 'X', {
          fontSize: '13px', color: '#664444', fontFamily: 'monospace',
          backgroundColor: '#1a1a22', padding: { x: 5, y: 2 },
        }).setInteractive({ useHandCursor: true });
        rm.on('pointerover', () => rm.setColor('#ff4444'));
        rm.on('pointerout', () => rm.setColor('#664444'));
        rm.on('pointerdown', () => { this.cpuPlayers.splice(i, 1); this.buildSettingsPanel(cx); });
        this.settingsContainer.add(rm);
      }

      y += 32;
    }

    // + Add CPU
    if (this.cpuPlayers.length < 7) {
      this.addCycleBtn(cx, y, 130, '+ ADD CPU', '#88cc44', () => {
        const used = new Set([this.playerColor, ...this.cpuPlayers.map((c) => c.color)]);
        const avail = PLAYER_COLORS.find((c) => !used.has(c.hex)) ?? PLAYER_COLORS[1];
        const ids = getNationIds();
        const randomNation = ids[Math.floor(Math.random() * ids.length)];
        this.cpuPlayers.push({ difficulty: 'normal', color: avail.hex, colorName: avail.name, nation: randomNation });
        this.buildSettingsPanel(cx);
      });
      y += 34;
    }

    y += 6;

    // ── Section: MAP & RULES ──
    y = this.addSectionHeader('MAP & RULES', cx, y);

    // Map size
    y = this.addSettingRow('Map Size', col1, col2, y, MAP_SIZE_LABELS[this.mapSize], () => {
      const sizes: MapSize[] = ['small', 'medium', 'large'];
      this.mapSize = sizes[(sizes.indexOf(this.mapSize) + 1) % sizes.length];
      this.buildSettingsPanel(cx);
    });

    // Starting resources
    y = this.addSettingRow('Resources', col1, col2, y, STARTING_RES_LABELS[this.startingRes], () => {
      const opts: StartingRes[] = ['lean', 'standard', 'rich'];
      this.startingRes = opts[(opts.indexOf(this.startingRes) + 1) % opts.length];
      this.buildSettingsPanel(cx);
    });

    // Reveal map toggle
    y = this.addSettingRow('Fog of War', col1, col2, y, this.revealMap ? 'OFF' : 'ON', () => {
      this.revealMap = !this.revealMap;
      this.buildSettingsPanel(cx);
    });

    // Victory mode
    const victoryLabels: Record<string, string> = {
      any: 'Any', domination: 'Domination', wonder: 'Wonder', timed: 'Timed',
    };
    y = this.addSettingRow('Victory', col1, col2, y, victoryLabels[this.victoryMode], () => {
      const modes: typeof this.victoryMode[] = ['any', 'domination', 'wonder', 'timed'];
      this.victoryMode = modes[(modes.indexOf(this.victoryMode) + 1) % modes.length];
      this.buildSettingsPanel(cx);
    });

    // Time limit (only relevant for timed mode)
    if (this.victoryMode === 'timed') {
      const minutes = Math.floor(this.timeLimit / 60);
      y = this.addSettingRow('Time Limit', col1, col2, y, `${minutes} min`, () => {
        const options = [10, 15, 20, 30, 45, 60];
        const idx = options.indexOf(minutes);
        this.timeLimit = options[(idx + 1) % options.length] * 60;
        this.buildSettingsPanel(cx);
      });
    }

    y += 8;

    // Panel background (draw it behind everything)
    const panelH = y - panelY;
    const panelBg = this.add.rectangle(cx, panelY, panelW, panelH, 0x111122, 0.9)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x333344);
    this.settingsContainer.addAt(panelBg, 0);
  }

  // ─── UI Helpers ─────────────────────────────────────────────

  private addSectionHeader(text: string, cx: number, y: number): number {
    const line = this.add.graphics();
    line.lineStyle(1, 0x444455, 0.5);
    line.lineBetween(cx - 200, y + 2, cx + 200, y + 2);
    this.settingsContainer.add(line);

    const label = this.add.text(cx, y + 10, text, {
      fontSize: '11px', color: '#ccaa44', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.settingsContainer.add(label);
    return y + 28;
  }

  private addSettingRow(label: string, lx: number, vx: number, y: number, value: string, onClick: () => void): number {
    const lbl = this.add.text(lx, y + 3, label, {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    });
    this.settingsContainer.add(lbl);

    this.addCycleBtn(vx + 50, y, 100, value, '#cccccc', onClick);
    return y + 30;
  }

  private addColorRow(label: string, lx: number, vx: number, y: number, color: number, colorName: string,
    onChange: (next: { name: string; hex: number }) => void): number {
    const lbl = this.add.text(lx, y + 3, label, {
      fontSize: '12px', color: '#aaaaaa', fontFamily: 'monospace',
    });
    this.settingsContainer.add(lbl);

    this.addColorSwatch(vx, y, color, colorName, onChange);
    return y + 30;
  }

  private addCycleBtn(cx: number, y: number, w: number, text: string, color: string, onClick: () => void) {
    const bg = this.add.rectangle(cx, y + 10, w, 22, 0x222233, 1)
      .setStrokeStyle(1, 0x444455)
      .setInteractive({ useHandCursor: true });
    const lbl = this.add.text(cx, y + 10, text, {
      fontSize: '11px', color, fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setStrokeStyle(1, 0x88cc44));
    bg.on('pointerout', () => bg.setStrokeStyle(1, 0x444455));
    bg.on('pointerdown', onClick);

    this.settingsContainer.add([bg, lbl]);
  }

  private addColorSwatch(x: number, y: number, color: number, colorName: string,
    onChange: (next: { name: string; hex: number }) => void) {
    const swatch = this.add.rectangle(x + 14, y + 10, 18, 18, color, 1)
      .setStrokeStyle(1, 0x888888);
    const lbl = this.add.text(x + 30, y + 4, colorName, {
      fontSize: '11px', color: '#cccccc', fontFamily: 'monospace',
    });
    const hit = this.add.rectangle(x + 35, y + 10, 80, 22, 0x000000, 0)
      .setInteractive({ useHandCursor: true });

    hit.on('pointerdown', () => {
      const idx = PLAYER_COLORS.findIndex((c) => c.hex === color);
      const next = PLAYER_COLORS[(idx + 1) % PLAYER_COLORS.length];
      onChange(next);
    });

    this.settingsContainer.add([swatch, lbl, hit]);
  }

  // ─── Bottom Buttons ─────────────────────────────────────────

  private buildMenuButtons(cx: number, h: number) {
    const btnY = h - 70;

    const buttons = [
      { label: 'START GAME', x: cx - 150, w: 150, action: () => this.startGame() },
      { label: 'MULTIPLAYER', x: cx, w: 150, action: () => this.scene.start('MultiplayerScene') },
      { label: 'HOW TO PLAY', x: cx + 150, w: 150, action: () => this.showHelp() },
    ];

    for (const btn of buttons) {
      const bg = this.add.rectangle(btn.x, btnY, btn.w, 36, 0x222233, 0.9)
        .setStrokeStyle(1, 0x555566)
        .setInteractive({ useHandCursor: true })
        .setDepth(10);
      const label = this.add.text(btn.x, btnY, btn.label, {
        fontSize: '15px', color: '#88cc44', fontFamily: 'monospace',
      }).setOrigin(0.5).setDepth(11);

      bg.on('pointerover', () => { bg.setFillStyle(0x333344, 1); bg.setStrokeStyle(2, 0x88cc44); label.setColor('#aaffaa'); });
      bg.on('pointerout', () => { bg.setFillStyle(0x222233, 0.9); bg.setStrokeStyle(1, 0x555566); label.setColor('#88cc44'); });
      bg.on('pointerdown', btn.action);
    }
  }

  // ─── Actions ────────────────────────────────────────────────

  private startGame() {
    const settings: GameSettings = {
      playerName: this.playerName,
      playerColor: this.playerColor,
      playerColorName: this.playerColorName,
      playerNation: this.playerNation,
      cpuPlayers: this.cpuPlayers.map((c) => ({ ...c })),
      mapSize: this.mapSize,
      startingResources: this.startingRes,
      revealMap: this.revealMap,
      victoryMode: this.victoryMode,
      timeLimit: this.timeLimit,
    };
    this.scene.start('GameScene', { settings });
  }

  private getDiffColor(diff: Difficulty): string {
    switch (diff) {
      case 'easy': return '#44cc44';
      case 'normal': return '#cccc44';
      case 'hard': return '#cc4444';
    }
  }

  private showNationTooltip(nationId: string, anchorX: number, anchorY: number) {
    this.hideNationTooltip();

    const nation = NATIONS[nationId];
    if (!nation) return;

    this.nationTooltip = this.add.container(0, 0).setDepth(500);

    const lines: string[] = [
      nation.name,
      nation.description,
      '',
      'Bonuses:',
      ...nation.bonuses.map((b) => `  • ${b}`),
      '',
      `Unique Unit: ${nation.uniqueUnit.config.name}`,
      `  HP:${nation.uniqueUnit.config.hp}  ATK:${nation.uniqueUnit.config.attack}  SPD:${nation.uniqueUnit.config.speed}  RNG:${nation.uniqueUnit.config.range}`,
      `Unique Building: ${nation.uniqueBuilding.config.name}`,
    ];

    const text = this.add.text(0, 0, lines.join('\n'), {
      fontSize: '10px',
      color: '#cccccc',
      fontFamily: 'monospace',
      lineSpacing: 2,
      wordWrap: { width: 260 },
    });

    const tw = text.width + 16;
    const th = text.height + 12;

    // Position tooltip below anchor, clamped to screen
    let tx = anchorX - tw / 2;
    let ty = anchorY + 6;
    const sw = this.scale.width;
    const sh = this.scale.height;
    if (tx < 4) tx = 4;
    if (tx + tw > sw - 4) tx = sw - tw - 4;
    if (ty + th > sh - 4) ty = anchorY - th - 6;

    const bg = this.add.rectangle(tx, ty, tw, th, 0x0a0a18, 0.95)
      .setOrigin(0, 0)
      .setStrokeStyle(1, 0x88cc44);

    // Title highlight
    const titleText = this.add.text(tx + 8, ty + 6, nation.name, {
      fontSize: '11px', color: '#ccaa44', fontFamily: 'monospace', fontStyle: 'bold',
    });

    text.setPosition(tx + 8, ty + 20);

    // Rebuild text without the first line (name already shown as title)
    const bodyLines = lines.slice(1);
    text.setText(bodyLines.join('\n'));

    this.nationTooltip.add([bg, titleText, text]);
  }

  private hideNationTooltip() {
    if (this.nationTooltip) {
      this.nationTooltip.destroy();
      this.nationTooltip = null!;
    }
  }

  // ─── Update ─────────────────────────────────────────────────

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    const w = this.scale.width;
    const h = this.scale.height;

    this.particleGraphics.clear();
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;
      this.particleGraphics.fillStyle(p.color, p.alpha);
      this.particleGraphics.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  // ─── Help Overlay ───────────────────────────────────────────

  private showHelp() {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    const overlay = this.add.rectangle(cx, cy, w, h, 0x000000, 0.85)
      .setInteractive().setDepth(50);

    const lines = [
      'HOW TO PLAY',
      '',
      'Left-click         Select unit / building',
      'Left-drag          Box select units',
      'Right-click        Move / Attack / Gather',
      '',
      'WASD / Arrows      Scroll camera',
      'Mouse edge         Scroll camera',
      '',
      'Select Town Center:',
      '  V  Train Villager',
      '',
      'Select Barracks:',
      '  M  Train Militia    K  Train Knight',
      '',
      'Select Archery Range:',
      '  R  Train Archer',
      '',
      'Select Villager:',
      '  Q  Build House    B  Build Barracks',
      '  E  Build Archery Range',
      '',
      'A  Attack nearest enemy',
      'S  Stop current action',
      '',
      'Click anywhere to close',
    ];

    const text = this.add.text(cx, cy, lines.join('\n'), {
      fontSize: '13px', color: '#cccccc', fontFamily: 'monospace',
      lineSpacing: 4, align: 'left',
    }).setOrigin(0.5).setDepth(51);

    const panel = this.add.rectangle(cx, cy, text.width + 40, text.height + 40, 0x1a1a2e, 0.95)
      .setStrokeStyle(1, 0x555566).setDepth(50);
    text.setDepth(51);

    overlay.on('pointerdown', () => { overlay.destroy(); text.destroy(); panel.destroy(); });
  }
}
