import Phaser from 'phaser';
import { TILE_SIZE, Tile, MAP_WIDTH, MAP_HEIGHT, COLORS, CAMERA_WIDTH, CAMERA_HEIGHT } from '../utils/constants';
import { generateDungeon, DungeonData } from '../systems/dungeon';
import { VisibilityMap, VisState } from '../systems/visibility';
import { getEnemyTypes, getDragonBoss, calcDamage, xpToNextLevel } from '../systems/combat';
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
  private messageText!: Phaser.GameObjects.Text;
  private messageTimer?: Phaser.Time.TimerEvent;

  // HUD elements
  private hudBg!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private hpBar!: Phaser.GameObjects.Rectangle;
  private hpBarBg!: Phaser.GameObjects.Rectangle;
  private xpBar!: Phaser.GameObjects.Rectangle;
  private xpBarBg!: Phaser.GameObjects.Rectangle;
  private floorText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private inventoryText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { floor: number; seed: number; playerStats?: any; inventory?: any }) {
    this.floor = data.floor;
    this.seed = data.seed;
  }

  create(data: { floor: number; seed: number; playerStats?: any; inventory?: any }) {
    // Generate dungeon
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
        let color = COLORS.FLOOR;

        if (tile === Tile.WALL) color = COLORS.WALL;
        else if (tile === Tile.STAIRS_DOWN) color = COLORS.STAIRS;

        const rect = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
          color
        );
        rect.setDepth(0);
        this.floorTiles[y][x] = rect;

        // Add subtle wall top edge
        if (tile === Tile.WALL && y + 1 < MAP_HEIGHT && this.dungeon.tiles[y + 1][x] !== Tile.WALL) {
          const wallTop = this.add.rectangle(
            x * TILE_SIZE + TILE_SIZE / 2,
            y * TILE_SIZE + TILE_SIZE - 2,
            TILE_SIZE,
            4,
            COLORS.WALL_TOP
          );
          wallTop.setDepth(1);
        }

        // Fog overlay
        const fog = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE,
          TILE_SIZE,
          COLORS.FOG_HIDDEN
        );
        fog.setDepth(20);
        fog.setAlpha(1);
        this.fogOverlay[y][x] = fog;
      }
    }

    // Create player
    this.player = new Player(this, this.dungeon.playerStart.x, this.dungeon.playerStart.y);

    // Restore player stats if coming from a previous floor
    if (data.playerStats) {
      this.player.stats = { ...data.playerStats };
    }
    if (data.inventory) {
      this.player.inventory = data.inventory;
    }

    // Spawn enemies
    const enemyTypes = this.floor === BOSS_FLOOR
      ? [getDragonBoss(this.floor)]
      : getEnemyTypes(this.floor);

    for (const spawn of this.dungeon.enemySpawns) {
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      this.enemies.push(new Enemy(this, spawn.x, spawn.y, type));
    }

    // On boss floor, also spawn the dragon in the last room
    if (this.floor === BOSS_FLOOR) {
      const dragonPos = this.dungeon.stairsPos;
      // Remove stairs on boss floor
      this.dungeon.tiles[dragonPos.y][dragonPos.x] = Tile.FLOOR;
      this.floorTiles[dragonPos.y][dragonPos.x].setFillStyle(COLORS.FLOOR);
      this.enemies.push(new Enemy(this, dragonPos.x, dragonPos.y, getDragonBoss(this.floor)));
    }

    // Spawn items
    for (const spawn of this.dungeon.itemSpawns) {
      this.items.push(new ItemPickup(this, spawn.x, spawn.y, this.floor));
    }

    // Set up camera
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

    // Create HUD (fixed to camera)
    this.createHUD();

    // Initial visibility update
    this.visibility.update(this.player.tileX, this.player.tileY, this.dungeon.tiles);
    this.updateFog();
    this.updateHUD();

    // Show floor message
    if (this.floor === BOSS_FLOOR) {
      this.showMessage('The Dragon awaits...', 3000);
    } else {
      this.showMessage(`Floor ${this.floor} — Find the stairs down`, 2000);
    }
  }

  createHUD() {
    const hudY = 0;
    const hudH = 50;

    this.hudBg = this.add.rectangle(CAMERA_WIDTH / 2, hudY + hudH / 2, CAMERA_WIDTH, hudH, COLORS.HUD_BG);
    this.hudBg.setAlpha(0.85);
    this.hudBg.setScrollFactor(0);
    this.hudBg.setDepth(100);

    // HP bar
    this.hpBarBg = this.add.rectangle(80, 15, 120, 10, COLORS.HEALTH_BAR_BG);
    this.hpBarBg.setScrollFactor(0).setDepth(101);
    this.hpBar = this.add.rectangle(80, 15, 120, 10, COLORS.HEALTH_BAR);
    this.hpBar.setScrollFactor(0).setDepth(102);

    this.hpText = this.add.text(10, 8, 'HP', {
      fontSize: '12px', fontFamily: 'monospace', color: COLORS.HUD_TEXT,
    }).setScrollFactor(0).setDepth(102);

    // XP bar
    this.xpBarBg = this.add.rectangle(80, 30, 120, 6, COLORS.HEALTH_BAR_BG);
    this.xpBarBg.setScrollFactor(0).setDepth(101);
    this.xpBar = this.add.rectangle(80, 30, 120, 6, COLORS.XP_BAR);
    this.xpBar.setScrollFactor(0).setDepth(102);

    // Floor & Level
    this.floorText = this.add.text(160, 5, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#ffcc00',
    }).setScrollFactor(0).setDepth(102);

    this.levelText = this.add.text(160, 22, '', {
      fontSize: '12px', fontFamily: 'monospace', color: '#88aaff',
    }).setScrollFactor(0).setDepth(102);

    // Inventory display
    this.inventoryText = this.add.text(300, 5, '', {
      fontSize: '11px', fontFamily: 'monospace', color: COLORS.HUD_TEXT,
      wordWrap: { width: CAMERA_WIDTH - 310 },
    }).setScrollFactor(0).setDepth(102);

    // Message text (bottom)
    this.messageText = this.add.text(CAMERA_WIDTH / 2, CAMERA_HEIGHT - 30, '', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 8, y: 4 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(102).setAlpha(0);
  }

  updateHUD() {
    const stats = this.player.stats;
    const hpRatio = stats.hp / stats.maxHp;
    this.hpBar.setScale(hpRatio, 1);
    this.hpText.setText(`HP ${stats.hp}/${stats.maxHp}`);

    const xpNeeded = xpToNextLevel(stats.level);
    const xpRatio = stats.xp / xpNeeded;
    this.xpBar.setScale(xpRatio, 1);

    this.floorText.setText(`Floor ${this.floor}${this.floor === BOSS_FLOOR ? ' (BOSS)' : ''}`);
    this.levelText.setText(`Lv.${stats.level} ATK:${stats.attack + this.player.inventory.equippedAttackBonus} DEF:${stats.defense + this.player.inventory.equippedDefenseBonus}`);

    // Inventory
    const inv = this.player.inventory.items;
    if (inv.length > 0) {
      const itemList = inv.map((item, i) => `[${i + 1}]${item.name}`).join(' ');
      this.inventoryText.setText(`Items: ${itemList}`);
    } else {
      this.inventoryText.setText('No items');
    }
  }

  showMessage(msg: string, duration = 1500) {
    this.messageText.setText(msg);
    this.messageText.setAlpha(1);
    if (this.messageTimer) this.messageTimer.destroy();
    this.messageTimer = this.time.delayedCall(duration, () => {
      this.tweens.add({
        targets: this.messageText,
        alpha: 0,
        duration: 300,
      });
    });
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

    // Update enemy visibility
    for (const enemy of this.enemies) {
      const vis = this.visibility.state[enemy.tileY]?.[enemy.tileX];
      enemy.setVisible(vis === VisState.VISIBLE);
    }

    // Update item visibility
    for (const item of this.items) {
      const vis = this.visibility.state[item.tileY]?.[item.tileX];
      item.setVisible(vis === VisState.VISIBLE);
    }
  }

  handleInput(): { dx: number; dy: number } | null {
    if (this.turnInProgress || this.player.isMoving) return null;

    // Check item use
    for (let i = 0; i < this.itemKeys.length; i++) {
      if (Phaser.Input.Keyboard.JustDown(this.itemKeys[i])) {
        const inv = this.player.inventory.items;
        if (i < inv.length) {
          const msg = this.player.useItem(inv[i].type);
          if (msg) {
            this.showMessage(msg);
            this.updateHUD();
          }
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

    // Check for enemy at target position (bump attack)
    const enemy = this.enemies.find(e => !e.isDead && e.tileX === targetX && e.tileY === targetY);
    if (enemy) {
      this.handleCombat(enemy);
      return;
    }

    // Try to move
    if (targetX < 0 || targetX >= MAP_WIDTH || targetY < 0 || targetY >= MAP_HEIGHT) return;
    if (this.dungeon.tiles[targetY][targetX] === Tile.WALL || this.dungeon.tiles[targetY][targetX] === Tile.VOID) return;

    this.turnInProgress = true;
    this.player.moveTo(targetX, targetY, this.dungeon.tiles, () => {
      this.afterPlayerMove();
    });
  }

  handleCombat(enemy: Enemy) {
    this.turnInProgress = true;

    // Player attacks enemy
    const damage = enemy.takeDamage(this.player.attack());
    this.showMessage(`Hit ${enemy.name} for ${damage} damage!`);

    if (enemy.isDead) {
      const leveled = this.player.gainXp(enemy.xpReward);
      if (enemy.name === 'Dragon') {
        // Victory!
        this.time.delayedCall(500, () => {
          this.scene.start('GameOverScene', {
            victory: true,
            floor: this.floor,
            level: this.player.stats.level,
          });
        });
        return;
      }
      if (leveled) {
        this.showMessage(`Level up! Now Lv.${this.player.stats.level}`, 2000);
      }
    }

    // Enemy turn
    this.time.delayedCall(150, () => {
      this.enemyTurn();
    });
  }

  afterPlayerMove() {
    // Check stairs
    if (this.dungeon.tiles[this.player.tileY][this.player.tileX] === Tile.STAIRS_DOWN) {
      this.descendFloor();
      return;
    }

    // Check item pickup
    const item = this.items.find(i => !i.picked && i.tileX === this.player.tileX && i.tileY === this.player.tileY);
    if (item) {
      const picked = item.pickup();
      this.player.inventory.add(picked);
      this.showMessage(`Picked up ${picked.name}`);
    }

    // Update visibility
    this.visibility.update(this.player.tileX, this.player.tileY, this.dungeon.tiles);
    this.updateFog();
    this.updateHUD();

    // Enemy turn
    this.enemyTurn();
  }

  enemyTurn() {
    const playerPos = this.player.getPos();

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      const dist = Math.abs(enemy.tileX - playerPos.x) + Math.abs(enemy.tileY - playerPos.y);

      // If adjacent, attack
      if (dist === 1) {
        const dead = this.player.takeDamage(enemy.attackStat);
        this.showMessage(`${enemy.name} hits you for damage!`);
        this.updateHUD();
        if (dead) {
          this.time.delayedCall(500, () => {
            this.scene.start('GameOverScene', {
              victory: false,
              floor: this.floor,
              level: this.player.stats.level,
            });
          });
          return;
        }
      } else {
        // Move
        enemy.aiMove(playerPos, this.dungeon.tiles, this.enemies);
      }
    }

    // Update visibility after enemy movement
    this.visibility.update(this.player.tileX, this.player.tileY, this.dungeon.tiles);
    this.updateFog();

    this.turnInProgress = false;
  }

  descendFloor() {
    if (this.floor >= BOSS_FLOOR) return; // Shouldn't happen, boss floor has no stairs

    // Clean up
    this.enemies.forEach(e => e.destroy());
    this.items.forEach(i => i.destroy());

    this.scene.restart({
      floor: this.floor + 1,
      seed: this.seed,
      playerStats: { ...this.player.stats },
      inventory: this.player.inventory,
    });
  }
}
