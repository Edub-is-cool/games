import Phaser from 'phaser';
import { TILE_SIZE, Tile, MAP_WIDTH, MAP_HEIGHT, COLORS, CAMERA_WIDTH, CAMERA_HEIGHT } from '../utils/constants';
import { generateDungeon, DungeonData } from '../systems/dungeon';
import { VisibilityMap, VisState } from '../systems/visibility';
import { getEnemyTypes, getDragonBoss, xpToNextLevel, getRandomPerks, PerkId, EnemyBehavior } from '../systems/combat';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { ItemPickup } from '../entities/ItemPickup';
import { ItemType } from '../systems/inventory';

const BOSS_FLOOR = 5;

export class GameScene extends Phaser.Scene {
  private floor!: number;
  private seed!: number;
  private dungeon!: DungeonData;
  private visibility!: VisibilityMap;
  private player!: Player;
  private enemies: Enemy[] = [];
  private items: ItemPickup[] = [];
  private floorTiles: Phaser.GameObjects.Rectangle[][] = [];
  private fogOverlay: Phaser.GameObjects.Rectangle[][] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<string, Phaser.Input.Keyboard.Key>;
  private itemKeys!: Phaser.Input.Keyboard.Key[];
  private turnInProgress = false;
  private turnCount = 0;
  private sceneEnding = false;
  private messageText!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;
  private perkSelectionActive = false;

  // HUD
  private hudBg!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private xpBarBg!: Phaser.GameObjects.Rectangle;
  private floorText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private inventoryText!: Phaser.GameObjects.Text;

  // Minimap
  private minimapGfx!: Phaser.GameObjects.Graphics;
  private minimapBorder!: Phaser.GameObjects.Rectangle;

  // Perk selection UI
  private perkOverlay!: Phaser.GameObjects.Rectangle;
  private perkTexts: Phaser.GameObjects.Text[] = [];
  private perkBgs: Phaser.GameObjects.Rectangle[] = [];
  private perkTitleText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { floor: number; seed: number }) {
    this.floor = data.floor;
    this.seed = data.seed;
  }

  create(data: { floor: number; seed: number; playerStats?: any; inventory?: any; perks?: PerkId[] }) {
    this.turnInProgress = false;
    this.turnCount = 0;
    this.sceneEnding = false;
    this.perkSelectionActive = false;

    this.dungeon = generateDungeon(this.floor, this.seed);
    this.visibility = new VisibilityMap();
    this.enemies = [];
    this.items = [];
    this.floorTiles = [];
    this.fogOverlay = [];

    // Draw dungeon tiles
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.floorTiles[y] = [];
      this.fogOverlay[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = this.dungeon.tiles[y][x];
        const color = this.tileColor(tile);

        const rect = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE, TILE_SIZE, color
        );
        rect.setDepth(0);
        this.floorTiles[y][x] = rect;

        if (tile === Tile.WALL && y + 1 < MAP_HEIGHT && this.dungeon.tiles[y + 1][x] !== Tile.WALL) {
          this.add.rectangle(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE - 2,
            TILE_SIZE, 4, COLORS.WALL_TOP
          ).setDepth(1);
        }

        // Trap visual hint (subtle marks on floor)
        if (tile === Tile.TRAP_SPIKE || tile === Tile.TRAP_POISON) {
          const mark = this.add.rectangle(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            8, 8, tile === Tile.TRAP_SPIKE ? 0x553333 : 0x335533
          );
          mark.setDepth(1).setAlpha(0.5);
        }

        // Door visual
        if (tile === Tile.DOOR_LOCKED) {
          this.add.rectangle(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE - 4, TILE_SIZE - 4, COLORS.DOOR_LOCKED
          ).setDepth(2);
        }

        // Cracked wall visual
        if (tile === Tile.CRACKED_WALL) {
          const cw = this.add.rectangle(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE / 2,
            TILE_SIZE, TILE_SIZE, COLORS.CRACKED_WALL
          );
          cw.setDepth(1);
          // Add crack lines
          const crack = this.add.rectangle(
            x * TILE_SIZE + TILE_SIZE / 2 + 3,
            y * TILE_SIZE + TILE_SIZE / 2,
            2, TILE_SIZE - 8, 0x443333
          );
          crack.setDepth(2);
        }

        // Fog overlay
        const fog = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE, TILE_SIZE, COLORS.FOG_HIDDEN
        );
        fog.setDepth(20).setAlpha(1);
        this.fogOverlay[y][x] = fog;
      }
    }

    // Create player
    this.player = new Player(this, this.dungeon.playerStart.x, this.dungeon.playerStart.y);

    if (data.playerStats) {
      this.player.stats = { ...data.playerStats };
    }
    if (data.inventory) {
      this.player.inventory = data.inventory;
    }
    if (data.perks) {
      this.player.perks = [...data.perks];
    }

    // Spawn enemies
    const enemyTypes = this.floor === BOSS_FLOOR
      ? [getDragonBoss(this.floor)]
      : getEnemyTypes(this.floor);

    for (const spawn of this.dungeon.enemySpawns) {
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      this.enemies.push(new Enemy(this, spawn.x, spawn.y, type));
    }

    if (this.floor === BOSS_FLOOR) {
      const dragonPos = this.dungeon.stairsPos;
      this.dungeon.tiles[dragonPos.y][dragonPos.x] = Tile.FLOOR;
      this.floorTiles[dragonPos.y][dragonPos.x].setFillStyle(COLORS.FLOOR);
      this.enemies.push(new Enemy(this, dragonPos.x, dragonPos.y, getDragonBoss(this.floor)));
    }

    // Spawn items
    for (const spawn of this.dungeon.itemSpawns) {
      // Check if spawn is in a secret room
      const inSecret = this.dungeon.secretRooms.some(r =>
        spawn.x >= r.x && spawn.x < r.x + r.w && spawn.y >= r.y && spawn.y < r.y + r.h
      );
      this.items.push(new ItemPickup(this, spawn.x, spawn.y, this.floor, undefined, inSecret));
    }

    // Spawn keys
    for (const spawn of this.dungeon.keySpawns) {
      this.items.push(new ItemPickup(this, spawn.x, spawn.y, this.floor, ItemType.KEY));
    }

    // Camera
    this.cameras.main.setBackgroundColor('#000000');
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, MAP_WIDTH * TILE_SIZE, MAP_HEIGHT * TILE_SIZE);

    // Input
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      w: Phaser.Input.Keyboard.KeyCodes.W,
      a: Phaser.Input.Keyboard.KeyCodes.A,
      s: Phaser.Input.Keyboard.KeyCodes.S,
      d: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<string, Phaser.Input.Keyboard.Key>;

    this.itemKeys = [
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
    ];

    this.createHUD();
    this.createPerkUI();

    this.visibility.update(this.player.tileX, this.player.tileY, this.dungeon.tiles, this.player.visibilityRadius);
    this.updateFog();
    this.updateHUD();

    if (this.floor === BOSS_FLOOR) {
      this.showMessage('The Dragon awaits...', 3000);
    } else {
      this.showMessage(`Floor ${this.floor} — Find the stairs down`, 2000);
    }
  }

  private tileColor(tile: Tile): number {
    switch (tile) {
      case Tile.FLOOR: return COLORS.FLOOR;
      case Tile.WALL: return COLORS.WALL;
      case Tile.STAIRS_DOWN: return COLORS.STAIRS;
      case Tile.TRAP_SPIKE: return COLORS.TRAP_SPIKE;
      case Tile.TRAP_POISON: return COLORS.TRAP_POISON;
      case Tile.DOOR_LOCKED: return COLORS.WALL;
      case Tile.CRACKED_WALL: return COLORS.WALL;
      default: return 0x000000;
    }
  }

  createHUD() {
    const hudH = 50;
    this.hudBg = this.add.rectangle(CAMERA_WIDTH / 2, hudH / 2, CAMERA_WIDTH, hudH, COLORS.HUD_BG);
    this.hudBg.setAlpha(0.85).setScrollFactor(0).setDepth(100);

    this.hpBarBg = this.add.rectangle(80, 15, 120, 10, COLORS.HEALTH_BAR_BG).setScrollFactor(0).setDepth(101);
    this.hpBar = this.add.rectangle(80, 15, 120, 10, COLORS.HEALTH_BAR).setScrollFactor(0).setDepth(102);
    this.hpText = this.add.text(10, 8, 'HP', {
      fontSize: '12px', fontFamily: 'monospace', color: COLORS.HUD_TEXT,
    }).setScrollFactor(0).setDepth(102);

    this.xpBarBg = this.add.rectangle(80, 30, 120, 6, COLORS.HEALTH_BAR_BG).setScrollFactor(0).setDepth(101);
    this.xpBar = this.add.rectangle(80, 30, 120, 6, COLORS.XP_BAR).setScrollFactor(0).setDepth(102);

    this.floorText = this.add.text(160, 5, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffcc00',
    }).setScrollFactor(0).setDepth(102);

    this.levelText = this.add.text(160, 22, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#88aaff',
    }).setScrollFactor(0).setDepth(102);

    this.inventoryText = this.add.text(300, 5, '', {
      fontSize: '11px', fontFamily: 'monospace', color: COLORS.HUD_TEXT,
      wordWrap: { width: CAMERA_WIDTH - 420 },
    }).setScrollFactor(0).setDepth(102);

    this.messageText = this.add.text(CAMERA_WIDTH / 2, CAMERA_HEIGHT - 30, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(102).setAlpha(0);

    // Minimap
    const mmScale = 2;
    const mmW = MAP_WIDTH * mmScale;
    const mmH = MAP_HEIGHT * mmScale;
    const mmX = CAMERA_WIDTH - mmW - 8;
    const mmY = 8;

    this.minimapBorder = this.add.rectangle(
      mmX + mmW / 2, mmY + mmH / 2, mmW + 4, mmH + 4, 0x444444
    ).setScrollFactor(0).setDepth(103).setAlpha(0.8);

    this.minimapGfx = this.add.graphics();
    this.minimapGfx.setScrollFactor(0).setDepth(104).setAlpha(0.85);
    this.minimapGfx.setPosition(mmX, mmY);
  }

  createPerkUI() {
    const cx = CAMERA_WIDTH / 2;
    const cy = CAMERA_HEIGHT / 2;

    this.perkOverlay = this.add.rectangle(cx, cy, CAMERA_WIDTH, CAMERA_HEIGHT, 0x000000);
    this.perkOverlay.setAlpha(0).setScrollFactor(0).setDepth(200);

    this.perkTitleText = this.add.text(cx, cy - 120, 'LEVEL UP! Choose a Perk:', {
      fontSize: '22px', fontFamily: 'monospace', color: '#ffcc00',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setVisible(false);

    for (let i = 0; i < 3; i++) {
      const y = cy - 40 + i * 70;
      const bg = this.add.rectangle(cx, y, 500, 55, 0x222222);
      bg.setScrollFactor(0).setDepth(201).setVisible(false);
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => { if (this.perkSelectionActive) bg.setFillStyle(0x333355); });
      bg.on('pointerout', () => { if (this.perkSelectionActive) bg.setFillStyle(0x222222); });
      this.perkBgs.push(bg);

      const text = this.add.text(cx, y, '', {
        fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
        align: 'center',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202).setVisible(false);
      this.perkTexts.push(text);
    }
  }

  showPerkSelection() {
    const perks = getRandomPerks(this.player.perks);
    if (perks.length === 0) return; // All perks owned

    this.perkSelectionActive = true;
    this.perkOverlay.setAlpha(0.7);
    this.perkTitleText.setVisible(true);

    for (let i = 0; i < 3; i++) {
      if (i < perks.length) {
        this.perkBgs[i].setVisible(true).setFillStyle(0x222222);
        this.perkTexts[i].setVisible(true);
        this.perkTexts[i].setText(`[${i + 1}] ${perks[i].name} — ${perks[i].description}`);
        this.perkTexts[i].setColor(perks[i].color);

        // Remove old listeners and add new
        this.perkBgs[i].removeAllListeners('pointerdown');
        const perk = perks[i];
        this.perkBgs[i].on('pointerdown', () => this.selectPerk(perk.id));
        this.perkBgs[i].on('pointerover', () => { if (this.perkSelectionActive) this.perkBgs[i].setFillStyle(0x333355); });
        this.perkBgs[i].on('pointerout', () => { if (this.perkSelectionActive) this.perkBgs[i].setFillStyle(0x222222); });
      } else {
        this.perkBgs[i].setVisible(false);
        this.perkTexts[i].setVisible(false);
      }
    }

    // Also allow keyboard selection
    const keys = [
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
    ];
    for (let i = 0; i < perks.length; i++) {
      const perk = perks[i];
      keys[i].once('down', () => {
        if (this.perkSelectionActive) this.selectPerk(perk.id);
      });
    }
  }

  selectPerk(perkId: PerkId) {
    if (!this.perkSelectionActive) return;
    this.perkSelectionActive = false;
    this.player.applyPerk(perkId);

    this.perkOverlay.setAlpha(0);
    this.perkTitleText.setVisible(false);
    for (let i = 0; i < 3; i++) {
      this.perkBgs[i].setVisible(false);
      this.perkTexts[i].setVisible(false);
    }

    const perkName = this.player.perks.length > 0
      ? perkId.charAt(0).toUpperCase() + perkId.slice(1).replace('_', ' ')
      : '';
    this.showMessage(`Perk acquired: ${perkName}!`, 2000);
    this.updateHUD();
  }

  updateHUD() {
    const stats = this.player.stats;
    const hpRatio = stats.hp / stats.maxHp;
    this.hpBar.setScale(hpRatio, 1);

    // Color HP bar based on health
    if (hpRatio < 0.25) this.hpBar.setFillStyle(0xff4444);
    else if (hpRatio < 0.5) this.hpBar.setFillStyle(0xffaa44);
    else this.hpBar.setFillStyle(COLORS.HEALTH_BAR);

    this.hpText.setText(`HP ${stats.hp}/${stats.maxHp}`);

    const xpNeeded = xpToNextLevel(stats.level);
    const xpRatio = stats.xp / xpNeeded;
    this.xpBar.setScale(xpRatio, 1);

    this.floorText.setText(`Floor ${this.floor}${this.floor === BOSS_FLOOR ? ' (BOSS)' : ''}`);
    this.levelText.setText(`Lv.${stats.level} ATK:${stats.attack + this.player.inventory.attackBonus} DEF:${stats.defense + this.player.inventory.defenseBonus}`);

    const inv = this.player.inventory;
    const parts: string[] = [];

    if (inv.items.length > 0) {
      const itemList = inv.items.map((item, i) => `[${i + 1}]${item.name}`).join(' ');
      parts.push(itemList);
    }
    if (inv.keys > 0) parts.push(`Keys:${inv.keys}`);
    if (inv.equippedSwords.length > 0) {
      parts.push(`Swords:${inv.equippedSwords.length}(+${inv.equippedSwords.reduce((s, i) => s + i.value, 0)}ATK)`);
    }
    if (inv.equippedShields.length > 0) {
      parts.push(`Shields:${inv.equippedShields.length}(+${inv.equippedShields.reduce((s, i) => s + i.value, 0)}DEF)`);
    }
    if (inv.regenRings > 0) parts.push(`Regen:${inv.regenRings}`);
    if (inv.torchBonus > 0) parts.push(`Torch:+${inv.torchBonus}`);
    if (this.player.perks.length > 0) {
      parts.push(`Perks:${this.player.perks.length}`);
    }
    this.inventoryText.setText(parts.length > 0 ? parts.join(' | ') : 'No items');
  }

  showMessage(msg: string, duration = 1500) {
    this.messageText.setText(msg);
    this.messageText.setAlpha(1);
    if (this.messageTimer) this.messageTimer.destroy();
    this.messageTimer = this.time.delayedCall(duration, () => {
      this.tweens.add({ targets: this.messageText, alpha: 0, duration: 300 });
    });
  }

  /** Floating damage number */
  showDamageNumber(x: number, y: number, amount: number | string, color = '#ffffff') {
    const worldX = x * TILE_SIZE + TILE_SIZE / 2;
    const worldY = y * TILE_SIZE;
    const text = this.add.text(worldX, worldY, String(amount), {
      fontSize: '16px', fontFamily: 'monospace', color, fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(50);

    this.tweens.add({
      targets: text,
      y: worldY - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  /** Camera shake for impact */
  screenShake(intensity = 0.005, duration = 100) {
    this.cameras.main.shake(duration, intensity);
  }

  updateFog() {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const vis = this.visibility.state[y][x];
        if (vis === VisState.VISIBLE) {
          this.fogOverlay[y][x].setAlpha(0);
        } else if (vis === VisState.EXPLORED) {
          this.fogOverlay[y][x].setAlpha(0.6);
        } else {
          this.fogOverlay[y][x].setAlpha(1);
        }
      }
    }

    for (const enemy of this.enemies) {
      const vis = this.visibility.state[enemy.tileY]?.[enemy.tileX];
      enemy.setVisible(vis === VisState.VISIBLE);
    }

    for (const item of this.items) {
      const vis = this.visibility.state[item.tileY]?.[item.tileX];
      if (vis === VisState.VISIBLE) {
        item.setVisible(true);
      } else if (this.player.hasPerk(PerkId.TREASURE_SENSE) && vis === VisState.EXPLORED) {
        item.setGlowing(true);
      } else {
        item.setVisible(false);
      }
    }

    this.updateMinimap();
  }

  updateMinimap() {
    const mmScale = 2;
    const gfx = this.minimapGfx;
    gfx.clear();

    gfx.fillStyle(0x000000);
    gfx.fillRect(0, 0, MAP_WIDTH * mmScale, MAP_HEIGHT * mmScale);

    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const vis = this.visibility.state[y][x];
        if (vis === VisState.HIDDEN) continue;

        const tile = this.dungeon.tiles[y][x];
        let color: number;

        if (tile === Tile.WALL || tile === Tile.CRACKED_WALL) {
          color = vis === VisState.VISIBLE ? 0x555555 : 0x333333;
        } else if (tile === Tile.STAIRS_DOWN) {
          color = 0xffcc00;
        } else if (tile === Tile.DOOR_LOCKED) {
          color = 0x886622;
        } else if (tile === Tile.TRAP_SPIKE || tile === Tile.TRAP_POISON) {
          color = vis === VisState.VISIBLE ? 0x884444 : 0x554444;
        } else {
          color = vis === VisState.VISIBLE ? 0x888888 : 0x555555;
        }

        gfx.fillStyle(color);
        gfx.fillRect(x * mmScale, y * mmScale, mmScale, mmScale);
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;
      const vis = this.visibility.state[enemy.tileY]?.[enemy.tileX];
      if (vis === VisState.VISIBLE) {
        gfx.fillStyle(0xff4444);
        gfx.fillRect(enemy.tileX * mmScale, enemy.tileY * mmScale, mmScale, mmScale);
      }
    }

    gfx.fillStyle(0x44ff44);
    gfx.fillRect(
      this.player.tileX * mmScale - 1,
      this.player.tileY * mmScale - 1,
      mmScale + 2, mmScale + 2
    );
  }

  handleInput(): { dx: number; dy: number } | null {
    if (this.turnInProgress || this.player.isMoving || this.perkSelectionActive || this.sceneEnding) return null;

    for (let i = 0; i < this.itemKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.itemKeys[i])) {
        const inv = this.player.inventory.items;
        if (i < inv.length) {
          const msg = this.player.useItem(inv[i].type);
          if (msg === 'MAP_REVEAL') {
            this.visibility.revealAll(this.dungeon.tiles);
            this.updateFog();
            this.showMessage('The map is revealed!', 2000);
          } else if (msg) {
            this.showMessage(msg);
          }
          this.updateHUD();
        }
        return null;
      }
    }

    let dx = 0, dy = 0;
    if (Phaser.Input.Keyboard.JustDown(this.cursors.left) || Phaser.Input.Keyboard.JustDown(this.wasd.a)) dx = -1;
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.right) || Phaser.Input.Keyboard.JustDown(this.wasd.d)) dx = 1;
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.up) || Phaser.Input.Keyboard.JustDown(this.wasd.w)) dy = -1;
    else if (Phaser.Input.Keyboard.JustDown(this.cursors.down) || Phaser.Input.Keyboard.JustDown(this.wasd.s)) dy = 1;

    if (dx === 0 && dy === 0) return null;
    return { dx, dy };
  }

  update() {
    const input = this.handleInput();
    if (!input) return;

    const targetX = this.player.tileX + input.dx;
    const targetY = this.player.tileY + input.dy;

    if (targetX < 0 || targetX >= MAP_WIDTH || targetY < 0 || targetY >= MAP_HEIGHT) return;

    const targetTile = this.dungeon.tiles[targetY][targetX];

    // Bump attack
    const enemy = this.enemies.find(e => !e.isDead && !e.isHidden && e.tileX === targetX && e.tileY === targetY);
    if (enemy) {
      this.handleCombat(enemy);
      return;
    }

    // Locked door — try to open with key
    if (targetTile === Tile.DOOR_LOCKED) {
      if (this.player.inventory.keys > 0) {
        this.player.inventory.keys--;
        this.dungeon.tiles[targetY][targetX] = Tile.FLOOR;
        this.floorTiles[targetY][targetX].setFillStyle(COLORS.FLOOR);
        this.showMessage('Door unlocked!');
        this.screenShake(0.003, 80);
        this.updateHUD();
      } else {
        this.showMessage('Locked! Need a key.');
      }
      return;
    }

    // Cracked wall — bump to break
    if (targetTile === Tile.CRACKED_WALL) {
      this.dungeon.tiles[targetY][targetX] = Tile.FLOOR;
      this.floorTiles[targetY][targetX].setFillStyle(COLORS.FLOOR);
      this.showMessage('The wall crumbles! Secret passage!', 2000);
      this.screenShake(0.008, 150);
      // Spawn dust particles
      for (let i = 0; i < 6; i++) {
        const px = targetX * TILE_SIZE + TILE_SIZE / 2 + (Math.random() - 0.5) * TILE_SIZE;
        const py = targetY * TILE_SIZE + TILE_SIZE / 2 + (Math.random() - 0.5) * TILE_SIZE;
        const dust = this.add.rectangle(px, py, 4, 4, 0x665544).setDepth(25);
        this.tweens.add({
          targets: dust,
          x: px + (Math.random() - 0.5) * 40,
          y: py - Math.random() * 30,
          alpha: 0,
          duration: 500,
          onComplete: () => dust.destroy(),
        });
      }
      this.visibility.update(this.player.tileX, this.player.tileY, this.dungeon.tiles, this.player.visibilityRadius);
      this.updateFog();
      return;
    }

    // Can't walk into walls
    if (targetTile === Tile.WALL || targetTile === Tile.VOID) return;

    this.turnInProgress = true;
    this.player.moveTo(targetX, targetY, this.dungeon.tiles, () => {
      this.afterPlayerMove();
    });
  }

  handleCombat(enemy: Enemy) {
    this.turnInProgress = true;
    this.turnCount++;

    const damage = enemy.takeDamage(this.player.attack());
    this.showDamageNumber(enemy.tileX, enemy.tileY, damage, '#ffcc00');
    this.screenShake(0.004, 80);
    this.showMessage(`Hit ${enemy.name} for ${damage}!`);

    if (enemy.isDead) {
      this.player.onKill();
      const leveled = this.player.gainXp(enemy.xpReward);

      // Death particles
      for (let i = 0; i < 8; i++) {
        const px = enemy.tileX * TILE_SIZE + TILE_SIZE / 2;
        const py = enemy.tileY * TILE_SIZE + TILE_SIZE / 2;
        const particle = this.add.rectangle(
          px, py, 5, 5, enemy.sprite.fillColor
        ).setDepth(25);
        this.tweens.add({
          targets: particle,
          x: px + (Math.random() - 0.5) * 60,
          y: py + (Math.random() - 0.5) * 60,
          alpha: 0,
          duration: 400 + Math.random() * 200,
          onComplete: () => particle.destroy(),
        });
      }

      if (enemy.name === 'Dragon') {
        this.sceneEnding = true;
        this.screenShake(0.02, 500);
        this.time.delayedCall(600, () => {
          this.scene.start('GameOverScene', {
            victory: true, floor: this.floor, level: this.player.stats.level,
          });
        });
        return;
      }

      if (leveled) {
        this.showMessage(`Level up! Lv.${this.player.stats.level}`, 2000);
        // Run enemy turn first, THEN show perk selection
        this.enemyTurn();
        this.showPerkSelection();
        return;
      }
    }

    this.enemyTurn();
  }

  afterPlayerMove() {
    this.turnCount++;

    // Check stairs
    if (this.dungeon.tiles[this.player.tileY][this.player.tileX] === Tile.STAIRS_DOWN) {
      this.descendFloor();
      return;
    }

    // Check traps
    const tile = this.dungeon.tiles[this.player.tileY][this.player.tileX];
    if (tile === Tile.TRAP_SPIKE) {
      const dmg = 3 + this.floor;
      this.player.stats.hp -= dmg;
      this.showDamageNumber(this.player.tileX, this.player.tileY, dmg, '#ff4444');
      this.screenShake(0.008, 120);
      this.showMessage(`Spike trap! -${dmg} HP`);
      // Disarm after triggering
      this.dungeon.tiles[this.player.tileY][this.player.tileX] = Tile.FLOOR;
      this.floorTiles[this.player.tileY][this.player.tileX].setFillStyle(COLORS.FLOOR);
      if (this.player.stats.hp <= 0) {
        this.playerDeath();
        return;
      }
    } else if (tile === Tile.TRAP_POISON) {
      this.player.poisonTurns = 4 + this.floor;
      this.showMessage('Poison trap! You feel sick...', 2000);
      this.showDamageNumber(this.player.tileX, this.player.tileY, 'POISON', '#44ff00');
      this.dungeon.tiles[this.player.tileY][this.player.tileX] = Tile.FLOOR;
      this.floorTiles[this.player.tileY][this.player.tileX].setFillStyle(COLORS.FLOOR);
    }

    // Check item pickup
    const item = this.items.find(i => !i.picked && i.tileX === this.player.tileX && i.tileY === this.player.tileY);
    if (item) {
      const picked = item.pickup();
      const msg = this.player.pickupItem(picked);
      this.showMessage(msg);
    }

    // Player turn-end effects
    const turnMsgs = this.player.onTurnEnd();
    for (const msg of turnMsgs) {
      this.showMessage(msg);
      if (this.player.stats.hp <= 0) {
        this.playerDeath();
        return;
      }
    }

    this.visibility.update(this.player.tileX, this.player.tileY, this.dungeon.tiles, this.player.visibilityRadius);
    this.updateFog();
    this.updateHUD();

    this.enemyTurn();
  }

  enemyTurn() {
    if (this.sceneEnding) return;

    const playerPos = this.player.getPos();
    const swiftPerk = this.player.hasPerk(PerkId.SWIFT);

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      // Swift perk: enemies only act every other turn
      if (swiftPerk && this.turnCount % 2 === 0) continue;

      const dist = Math.abs(enemy.tileX - playerPos.x) + Math.abs(enemy.tileY - playerPos.y);

      // Ranged attack check
      if (enemy.behavior === EnemyBehavior.RANGED && dist > 1 && !enemy.isHidden) {
        if (enemy.hasLineOfSight(playerPos, this.dungeon.tiles)) {
          const dead = this.handleEnemyRangedAttack(enemy);
          if (dead) {
            this.playerDeath();
            return;
          }
          continue;
        }
      }

      // Melee attack if adjacent
      if (dist === 1 && !enemy.isHidden) {
        const result = this.player.takeDamage(enemy.attackStat);

        if (result.dodged) {
          this.showDamageNumber(this.player.tileX, this.player.tileY, 'DODGE', '#44aaff');
          this.showMessage(`Dodged ${enemy.name}'s attack!`);
        } else {
          this.screenShake(0.006, 100);
          this.showDamageNumber(this.player.tileX, this.player.tileY,
            Math.max(1, enemy.attackStat - this.player.stats.defense - this.player.inventory.defenseBonus),
            '#ff4444');
          this.showMessage(`${enemy.name} hits you!`);

          // Thorns damage
          if (result.reflected > 0) {
            enemy.takeDamage(result.reflected + this.player.stats.defense); // Override calc, just apply raw
            this.showDamageNumber(enemy.tileX, enemy.tileY, result.reflected, '#aa44aa');
          }
        }

        this.updateHUD();
        if (result.dead) {
          this.playerDeath();
          return;
        }
      } else {
        enemy.aiMove(playerPos, this.dungeon.tiles, this.enemies);
      }
    }

    this.visibility.update(this.player.tileX, this.player.tileY, this.dungeon.tiles, this.player.visibilityRadius);
    this.updateFog();
    this.turnInProgress = false;
  }

  /** Ranged attack: damage applied synchronously, projectile is just visual */
  handleEnemyRangedAttack(enemy: Enemy): boolean {
    const playerPos = this.player.getPos();

    // Apply damage immediately (synchronous)
    const result = this.player.takeDamage(enemy.attackStat);

    // Visual projectile (cosmetic only, no game logic in callback)
    const sx = enemy.tileX * TILE_SIZE + TILE_SIZE / 2;
    const sy = enemy.tileY * TILE_SIZE + TILE_SIZE / 2;
    const ex = playerPos.x * TILE_SIZE + TILE_SIZE / 2;
    const ey = playerPos.y * TILE_SIZE + TILE_SIZE / 2;
    const arrow = this.add.rectangle(sx, sy, 6, 6, 0xffaa44).setDepth(25);
    this.tweens.add({
      targets: arrow,
      x: ex, y: ey,
      duration: 150,
      onComplete: () => arrow.destroy(),
    });

    if (result.dodged) {
      this.showDamageNumber(this.player.tileX, this.player.tileY, 'DODGE', '#44aaff');
      this.showMessage(`Dodged ${enemy.name}'s arrow!`);
    } else {
      this.screenShake(0.004, 80);
      this.showDamageNumber(this.player.tileX, this.player.tileY,
        Math.max(1, enemy.attackStat - this.player.stats.defense - this.player.inventory.defenseBonus),
        '#ff8844');
      this.showMessage(`${enemy.name} shoots you!`);
    }
    this.updateHUD();

    return result.dead;
  }

  playerDeath() {
    if (this.sceneEnding) return; // Prevent double death
    this.sceneEnding = true;
    this.turnInProgress = true;
    this.screenShake(0.015, 300);
    this.time.delayedCall(500, () => {
      this.scene.start('GameOverScene', {
        victory: false, floor: this.floor, level: this.player.stats.level,
      });
    });
  }

  descendFloor() {
    if (this.floor >= BOSS_FLOOR) return;

    this.enemies.forEach(e => e.destroy());
    this.items.forEach(i => i.destroy());

    this.scene.restart({
      floor: this.floor + 1,
      seed: this.seed,
      playerStats: { ...this.player.stats },
      inventory: this.player.inventory,
      perks: [...this.player.perks],
    });
  }
}
