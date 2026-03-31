import Phaser from 'phaser';
import {
  MapSize,
  StartingRes,
  MAP_SIZE_LABELS,
  STARTING_RES_LABELS,
  DEFAULT_SETTINGS,
  PLAYER_COLORS,
} from '../config/gameSettings';
import { MultiplayerSystem, PlayerInfo } from '../systems/MultiplayerSystem';

type SubScreen = 'menu' | 'host' | 'joinPrivate' | 'joinPublic';
type VictoryCondition = 'domination' | 'wonder' | 'regicide';

const VICTORY_LABELS: Record<VictoryCondition, string> = {
  domination: 'Domination',
  wonder: 'Wonder',
  regicide: 'Regicide',
};

interface FakeLobby {
  id: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  mapSize: string;
}

interface LobbyPlayer {
  info: PlayerInfo;
  ready: boolean;
}

const PARTICLE_COUNT = 40;

interface MenuParticle {
  x: number; y: number; vx: number; vy: number;
  size: number; color: number; alpha: number;
}

export class MultiplayerScene extends Phaser.Scene {
  private mp!: MultiplayerSystem;
  private currentScreen: SubScreen = 'menu';
  private screenContainer!: Phaser.GameObjects.Container;
  private particles: MenuParticle[] = [];
  private particleGraphics!: Phaser.GameObjects.Graphics;

  // Host game state
  private lobbyCode = '';
  private lobbyMapSize: MapSize = 'medium';
  private lobbyStartingRes: StartingRes = 'standard';
  private lobbyVictory: VictoryCondition = 'domination';
  private lobbyPlayers: LobbyPlayer[] = [];

  // Join private state
  private codeDigits: string[] = [];
  private joinedPrivate = false;

  // Join public state
  private fakeLobbies: FakeLobby[] = [];
  private selectedLobbyIndex = -1;

  // Keyboard listener reference for cleanup
  private keyboardListener: ((e: KeyboardEvent) => void) | null = null;

  constructor() {
    super({ key: 'MultiplayerScene' });
  }

  create() {
    this.mp = new MultiplayerSystem();
    this.currentScreen = 'menu';
    this.codeDigits = [];
    this.joinedPrivate = false;
    this.selectedLobbyIndex = -1;

    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;

    // Background gradient
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

    // Title
    this.add.text(cx, 40, 'MULTIPLAYER', {
      fontSize: '36px', color: '#ffcc44', fontFamily: 'monospace',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10);

    const div = this.add.graphics().setDepth(10);
    div.lineStyle(1, 0xccaa44, 0.3);
    div.lineBetween(cx - 200, 65, cx + 200, 65);

    // Screen container
    this.screenContainer = this.add.container(0, 0).setDepth(10);

    this.showScreen('menu');

    this.scale.on('resize', () => this.scene.restart());
  }

  shutdown() {
    this.removeKeyboardListener();
  }

  // ─── Screen Router ────────────────────────────────────────

  private showScreen(screen: SubScreen) {
    this.removeKeyboardListener();
    this.currentScreen = screen;
    this.screenContainer.removeAll(true);

    switch (screen) {
      case 'menu': this.buildMenuScreen(); break;
      case 'host': this.buildHostScreen(); break;
      case 'joinPrivate': this.buildJoinPrivateScreen(); break;
      case 'joinPublic': this.buildJoinPublicScreen(); break;
    }
  }

  // ─── Sub-menu Screen ──────────────────────────────────────

  private buildMenuScreen() {
    const cx = this.scale.width / 2;
    const startY = 120;

    const buttons = [
      { label: 'HOST GAME', y: startY, action: () => this.initHostGame() },
      { label: 'JOIN PRIVATE GAME', y: startY + 60, action: () => this.initJoinPrivate() },
      { label: 'JOIN PUBLIC GAME', y: startY + 120, action: () => this.initJoinPublic() },
      { label: 'BACK', y: startY + 200, action: () => this.scene.start('MenuScene') },
    ];

    for (const btn of buttons) {
      this.addButton(cx, btn.y, 260, 40, btn.label,
        btn.label === 'BACK' ? '#cc6644' : '#88cc44', btn.action);
    }
  }

  // ─── Host Game Screen ─────────────────────────────────────

  private initHostGame() {
    this.lobbyCode = this.generateCode();
    this.lobbyMapSize = DEFAULT_SETTINGS.mapSize;
    this.lobbyStartingRes = DEFAULT_SETTINGS.startingResources;
    this.lobbyVictory = 'domination';

    const settings = { ...DEFAULT_SETTINGS };
    this.mp.createLobby(settings);

    // Only the host is in the lobby initially — others join via code
    this.lobbyPlayers = [
      { info: { id: 'host-1', name: DEFAULT_SETTINGS.playerName, color: DEFAULT_SETTINGS.playerColor, colorName: DEFAULT_SETTINGS.playerColorName, isHost: true }, ready: true },
    ];

    this.showScreen('host');
  }

  private buildHostScreen() {
    const w = this.scale.width;
    const cx = w / 2;
    const panelW = 480;
    const panelX = cx - panelW / 2;
    let y = 85;

    // Panel background
    const panelH = this.scale.height - 140;
    this.addPanel(cx, y, panelW, panelH);

    y += 16;

    // Lobby Code
    this.addLabel(cx, y, 'LOBBY CODE', '#ccaa44', '12px', true);
    y += 22;

    this.addLabel(cx, y, this.lobbyCode, '#ffffff', '32px', true);
    y += 55;

    // Copy Code button
    this.addButton(cx, y, 140, 28, 'COPY CODE', '#88cc44', () => {
      console.log('[MP] Copy code to clipboard:', this.lobbyCode);
    });
    y += 42;

    // Divider
    this.addDivider(cx, y, panelW - 40);
    y += 12;

    // Game Settings header
    this.addLabel(cx, y, 'GAME SETTINGS', '#ccaa44', '11px', true);
    y += 22;

    const col1 = panelX + 30;
    const col2 = panelX + 200;

    // Map Size
    this.addLabel(col1, y + 3, 'Map Size', '#aaaaaa', '12px');
    this.addCycleButton(col2 + 60, y, 120, MAP_SIZE_LABELS[this.lobbyMapSize], '#cccccc', () => {
      const sizes: MapSize[] = ['small', 'medium', 'large'];
      this.lobbyMapSize = sizes[(sizes.indexOf(this.lobbyMapSize) + 1) % sizes.length];
      this.showScreen('host');
    });
    y += 32;

    // Starting Resources
    this.addLabel(col1, y + 3, 'Resources', '#aaaaaa', '12px');
    this.addCycleButton(col2 + 60, y, 120, STARTING_RES_LABELS[this.lobbyStartingRes], '#cccccc', () => {
      const opts: StartingRes[] = ['lean', 'standard', 'rich'];
      this.lobbyStartingRes = opts[(opts.indexOf(this.lobbyStartingRes) + 1) % opts.length];
      this.showScreen('host');
    });
    y += 32;

    // Victory Condition
    this.addLabel(col1, y + 3, 'Victory', '#aaaaaa', '12px');
    this.addCycleButton(col2 + 60, y, 120, VICTORY_LABELS[this.lobbyVictory], '#cccccc', () => {
      const opts: VictoryCondition[] = ['domination', 'wonder', 'regicide'];
      this.lobbyVictory = opts[(opts.indexOf(this.lobbyVictory) + 1) % opts.length];
      this.showScreen('host');
    });
    y += 36;

    // Divider
    this.addDivider(cx, y, panelW - 40);
    y += 12;

    // Players header
    this.addLabel(cx, y, 'PLAYERS', '#ccaa44', '11px', true);
    y += 22;

    // Column headers
    const nameCol = panelX + 30;
    const colorCol = panelX + 200;
    const readyCol = panelX + 310;
    const hostCol = panelX + 400;

    this.addLabel(nameCol, y, 'NAME', '#555566', '10px');
    this.addLabel(colorCol, y, 'COLOR', '#555566', '10px');
    this.addLabel(readyCol, y, 'READY', '#555566', '10px');
    this.addLabel(hostCol, y, 'ROLE', '#555566', '10px');
    y += 18;

    for (const lp of this.lobbyPlayers) {
      // Name
      this.addLabel(nameCol, y + 2, lp.info.name, '#cccccc', '12px');

      // Color swatch
      const swatch = this.add.rectangle(colorCol + 8, y + 8, 14, 14, lp.info.color)
        .setStrokeStyle(1, 0x888888);
      this.screenContainer.add(swatch);
      this.addLabel(colorCol + 22, y + 2, lp.info.colorName, '#aaaaaa', '11px');

      // Ready status
      const readyText = lp.ready ? 'YES' : 'NO';
      const readyColor = lp.ready ? '#44cc44' : '#cc4444';
      this.addLabel(readyCol, y + 2, readyText, readyColor, '12px');

      // Host badge
      if (lp.info.isHost) {
        this.addLabel(hostCol, y + 2, 'HOST', '#ccaa44', '11px');
      }

      y += 26;
    }

    y += 10;

    // Bottom buttons
    const allReady = this.lobbyPlayers.every(p => p.ready);
    const bottomY = this.scale.height - 60;

    // Start Game button
    const startColor = allReady ? '#88cc44' : '#555566';
    this.addButton(cx + 80, bottomY, 150, 36, 'START GAME', startColor, () => {
      if (allReady) {
        this.mp.startGame();
        console.log('[MP] Starting game from lobby');
      }
    });

    // Back button
    this.addButton(cx - 80, bottomY, 120, 36, 'BACK', '#cc6644', () => {
      this.mp.disconnect();
      this.showScreen('menu');
    });
  }

  // ─── Join Private Game Screen ─────────────────────────────

  private initJoinPrivate() {
    this.codeDigits = [];
    this.joinedPrivate = false;
    this.lobbyPlayers = [];
    this.showScreen('joinPrivate');
  }

  private buildJoinPrivateScreen() {
    const w = this.scale.width;
    const cx = w / 2;
    const panelW = 480;
    let y = 85;

    const panelH = this.scale.height - 140;
    this.addPanel(cx, y, panelW, panelH);

    y += 20;

    if (!this.joinedPrivate) {
      // Code entry screen
      this.addLabel(cx, y, 'ENTER LOBBY CODE', '#ccaa44', '14px', true);
      y += 36;

      // 6 digit boxes
      const boxW = 44;
      const gap = 10;
      const totalW = boxW * 6 + gap * 5;
      const startX = cx - totalW / 2;

      for (let i = 0; i < 6; i++) {
        const bx = startX + i * (boxW + gap) + boxW / 2;
        const box = this.add.rectangle(bx, y + 25, boxW, 52, 0x1a1a2e, 1)
          .setStrokeStyle(2, i === this.codeDigits.length ? 0x88cc44 : 0x444455);
        this.screenContainer.add(box);

        if (i < this.codeDigits.length) {
          const digit = this.add.text(bx, y + 25, this.codeDigits[i], {
            fontSize: '28px', color: '#ffffff', fontFamily: 'monospace',
          }).setOrigin(0.5);
          this.screenContainer.add(digit);
        }
      }

      y += 70;

      // Instruction
      this.addLabel(cx, y, 'Type digits 0-9 or letters A-Z', '#666677', '10px', true);
      y += 30;

      // Join button
      const canJoin = this.codeDigits.length === 6;
      const joinColor = canJoin ? '#88cc44' : '#555566';
      this.addButton(cx, y, 120, 36, 'JOIN', joinColor, () => {
        if (canJoin) {
          this.doJoinPrivate();
        }
      });
      y += 50;

      // Back button
      this.addButton(cx, y, 120, 36, 'BACK', '#cc6644', () => {
        this.showScreen('menu');
      });

      // Keyboard input
      this.setupCodeInput();
    } else {
      // Connected - show player list
      this.addLabel(cx, y, 'CONNECTED', '#44cc44', '14px', true);
      y += 24;
      this.addLabel(cx, y, `LOBBY: ${this.codeDigits.join('')}`, '#ccaa44', '12px', true);
      y += 30;

      this.addLabel(cx, y, 'PLAYERS', '#ccaa44', '11px', true);
      y += 22;

      const panelX = cx - panelW / 2;
      const nameCol = panelX + 30;
      const colorCol = panelX + 200;
      const readyCol = panelX + 340;

      this.addLabel(nameCol, y, 'NAME', '#555566', '10px');
      this.addLabel(colorCol, y, 'COLOR', '#555566', '10px');
      this.addLabel(readyCol, y, 'READY', '#555566', '10px');
      y += 18;

      for (const lp of this.lobbyPlayers) {
        this.addLabel(nameCol, y + 2, lp.info.name, '#cccccc', '12px');

        const swatch = this.add.rectangle(colorCol + 8, y + 8, 14, 14, lp.info.color)
          .setStrokeStyle(1, 0x888888);
        this.screenContainer.add(swatch);
        this.addLabel(colorCol + 22, y + 2, lp.info.colorName, '#aaaaaa', '11px');

        const readyText = lp.ready ? 'YES' : 'NO';
        const readyColor = lp.ready ? '#44cc44' : '#cc4444';
        this.addLabel(readyCol, y + 2, readyText, readyColor, '12px');

        y += 26;
      }

      y += 20;

      // Waiting message
      this.addLabel(cx, y, 'Waiting for host to start...', '#777788', '11px', true);
      y += 40;

      // Back button
      this.addButton(cx, y, 120, 36, 'LEAVE', '#cc6644', () => {
        this.mp.disconnect();
        this.showScreen('menu');
      });
    }
  }

  private setupCodeInput() {
    this.keyboardListener = (e: KeyboardEvent) => {
      if (this.currentScreen !== 'joinPrivate' || this.joinedPrivate) return;

      if (e.key === 'Backspace') {
        if (this.codeDigits.length > 0) {
          this.codeDigits.pop();
          this.showScreen('joinPrivate');
        }
        return;
      }

      if (this.codeDigits.length >= 6) return;

      const ch = e.key.toUpperCase();
      if (/^[0-9A-Z]$/.test(ch)) {
        this.codeDigits.push(ch);
        this.showScreen('joinPrivate');
      }
    };

    this.input.keyboard!.on('keydown', this.keyboardListener);
  }

  private removeKeyboardListener() {
    if (this.keyboardListener && this.input.keyboard) {
      this.input.keyboard.off('keydown', this.keyboardListener);
      this.keyboardListener = null;
    }
  }

  private doJoinPrivate() {
    const code = this.codeDigits.join('');
    console.log('[MP] Joining private lobby:', code);

    const playerInfo: PlayerInfo = {
      id: 'local-' + Date.now(),
      name: DEFAULT_SETTINGS.playerName,
      color: DEFAULT_SETTINGS.playerColor,
      colorName: DEFAULT_SETTINGS.playerColorName,
      isHost: false,
    };

    this.mp.joinLobby(code, playerInfo);

    // Show self in lobby — real player list will come from server
    this.lobbyPlayers = [
      { info: playerInfo, ready: false },
    ];

    this.joinedPrivate = true;
    this.showScreen('joinPrivate');
  }

  // ─── Join Public Game Screen ──────────────────────────────

  private initJoinPublic() {
    this.selectedLobbyIndex = -1;
    this.refreshLobbies();
    this.showScreen('joinPublic');
  }

  private refreshLobbies() {
    // Real lobbies will come from MultiplayerSystem when server is connected
    // For now, show empty list — no fake data
    this.fakeLobbies = [];
    if (this.mp.connected) {
      // TODO: fetch real lobbies from server
      // this.fakeLobbies = await this.mp.getPublicLobbies();
    }
    console.log('[MP] Refreshed public lobby list');
  }

  private buildJoinPublicScreen() {
    const w = this.scale.width;
    const cx = w / 2;
    const panelW = 500;
    const panelX = cx - panelW / 2;
    let y = 85;

    const panelH = this.scale.height - 140;
    this.addPanel(cx, y, panelW, panelH);

    y += 16;
    this.addLabel(cx, y, 'PUBLIC LOBBIES', '#ccaa44', '14px', true);
    y += 28;

    // Column headers
    const hostCol = panelX + 24;
    const playersCol = panelX + 200;
    const mapCol = panelX + 320;

    this.addLabel(hostCol, y, 'HOST', '#555566', '10px');
    this.addLabel(playersCol, y, 'PLAYERS', '#555566', '10px');
    this.addLabel(mapCol, y, 'MAP SIZE', '#555566', '10px');
    y += 20;

    // Lobby rows
    for (let i = 0; i < this.fakeLobbies.length; i++) {
      const lobby = this.fakeLobbies[i];
      const rowY = y;
      const isSelected = i === this.selectedLobbyIndex;

      // Row background (clickable)
      const rowBg = this.add.rectangle(cx, rowY + 10, panelW - 20, 24,
        isSelected ? 0x334433 : 0x1a1a2e, 1)
        .setStrokeStyle(1, isSelected ? 0x88cc44 : 0x333344)
        .setInteractive({ useHandCursor: true });
      this.screenContainer.add(rowBg);

      rowBg.on('pointerover', () => {
        if (i !== this.selectedLobbyIndex) rowBg.setFillStyle(0x222233);
      });
      rowBg.on('pointerout', () => {
        if (i !== this.selectedLobbyIndex) rowBg.setFillStyle(0x1a1a2e);
      });
      rowBg.on('pointerdown', () => {
        this.selectedLobbyIndex = i;
        this.showScreen('joinPublic');
      });

      this.addLabel(hostCol, rowY + 3, lobby.hostName, isSelected ? '#ffffff' : '#cccccc', '12px');
      this.addLabel(playersCol, rowY + 3, `${lobby.playerCount}/${lobby.maxPlayers}`, isSelected ? '#ffffff' : '#aaaaaa', '12px');
      this.addLabel(mapCol, rowY + 3, lobby.mapSize, isSelected ? '#ffffff' : '#aaaaaa', '12px');

      y += 28;
    }

    if (this.fakeLobbies.length === 0) {
      this.addLabel(cx, y + 20, 'No public lobbies found', '#666677', '12px', true);
      y += 50;
    }

    y += 20;

    // Bottom buttons
    const bottomY = this.scale.height - 60;

    // Refresh
    this.addButton(cx - 130, bottomY, 120, 36, 'REFRESH', '#88cc44', () => {
      this.refreshLobbies();
      this.showScreen('joinPublic');
    });

    // Join
    const canJoin = this.selectedLobbyIndex >= 0;
    this.addButton(cx, bottomY, 120, 36, 'JOIN', canJoin ? '#88cc44' : '#555566', () => {
      if (canJoin) {
        const lobby = this.fakeLobbies[this.selectedLobbyIndex];
        console.log('[MP] Joining public lobby:', lobby.id, lobby.hostName);
        const playerInfo: PlayerInfo = {
          id: 'local-' + Date.now(),
          name: DEFAULT_SETTINGS.playerName,
          color: DEFAULT_SETTINGS.playerColor,
          colorName: DEFAULT_SETTINGS.playerColorName,
          isHost: false,
        };
        this.mp.joinLobby(lobby.id, playerInfo);
      }
    });

    // Back
    this.addButton(cx + 130, bottomY, 120, 36, 'BACK', '#cc6644', () => {
      this.showScreen('menu');
    });
  }

  // ─── UI Helpers ───────────────────────────────────────────

  private addPanel(cx: number, y: number, w: number, h: number) {
    const panel = this.add.rectangle(cx, y, w, h, 0x111122, 0.92)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0x333344);
    this.screenContainer.add(panel);
  }

  private addLabel(x: number, y: number, text: string, color: string, size: string, centered = false) {
    const label = this.add.text(x, y, text, {
      fontSize: size, color, fontFamily: 'monospace', fontStyle: size === '11px' || size === '14px' || size === '12px' ? '' : 'bold',
    });
    if (centered) label.setOrigin(0.5, 0);
    this.screenContainer.add(label);
    return label;
  }

  private addDivider(cx: number, y: number, width: number) {
    const g = this.add.graphics();
    g.lineStyle(1, 0x444455, 0.5);
    g.lineBetween(cx - width / 2, y, cx + width / 2, y);
    this.screenContainer.add(g);
  }

  private addButton(cx: number, cy: number, w: number, h: number, text: string, color: string, onClick: () => void) {
    const bg = this.add.rectangle(cx, cy, w, h, 0x222233, 0.9)
      .setStrokeStyle(1, 0x555566)
      .setInteractive({ useHandCursor: true });
    const label = this.add.text(cx, cy, text, {
      fontSize: '13px', color, fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerover', () => {
      bg.setFillStyle(0x333344, 1);
      bg.setStrokeStyle(2, 0x88cc44);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x222233, 0.9);
      bg.setStrokeStyle(1, 0x555566);
    });
    bg.on('pointerdown', onClick);

    this.screenContainer.add([bg, label]);
    return { bg, label };
  }

  private addCycleButton(cx: number, y: number, w: number, text: string, color: string, onClick: () => void) {
    const bg = this.add.rectangle(cx, y + 10, w, 22, 0x222233, 1)
      .setStrokeStyle(1, 0x444455)
      .setInteractive({ useHandCursor: true });
    const lbl = this.add.text(cx, y + 10, text, {
      fontSize: '11px', color, fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerover', () => bg.setStrokeStyle(1, 0x88cc44));
    bg.on('pointerout', () => bg.setStrokeStyle(1, 0x444455));
    bg.on('pointerdown', onClick);

    this.screenContainer.add([bg, lbl]);
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // ─── Update ───────────────────────────────────────────────

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
}
