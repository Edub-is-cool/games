import Phaser from 'phaser';
import { GameWorld, EntityData, Command } from '../systems/GameWorld';
import { SelectionSystem } from '../systems/SelectionSystem';
import { CommandSystem } from '../systems/CommandSystem';
import { CombatSystem } from '../systems/CombatSystem';
import { EconomySystem } from '../systems/EconomySystem';
import { AISystem } from '../systems/AISystem';
import { DiplomacySystem } from '../systems/DiplomacySystem';
import { VictorySystem } from '../systems/VictorySystem';
import { UNITS } from '../config/units';
import { BUILDINGS } from '../config/buildings';
import { ALL_UNITS, ALL_BUILDINGS } from '../config/ages';
import { MapGenerator, MapData } from '../systems/MapGenerator';
import { TerrainRenderer } from '../systems/TerrainRenderer';
import {
  GameSettings, PLAYER_COLORS, DEFAULT_SETTINGS,
  MAP_SIZE_VALUES, STARTING_RES_VALUES,
} from '../config/gameSettings';

const MAP_W = 2048;
const MAP_H = 2048;
const CAMERA_SPEED = 500;
const CAMERA_EDGE_ZONE = 20;

export class GameScene extends Phaser.Scene {
  world!: GameWorld;
  selection!: SelectionSystem;
  commands!: CommandSystem;
  combat!: CombatSystem;
  economy!: EconomySystem;
  diplomacy!: DiplomacySystem;
  victory!: VictorySystem;
  aiSystems: AISystem[] = [];
  settings!: GameSettings;
  playerColors: Map<number, number> = new Map();
  private victoryShown = false;

  private sprites: Map<number, Phaser.GameObjects.Sprite> = new Map();
  private dayNightOverlay!: Phaser.GameObjects.Rectangle;
  private dayNightTime = 0; // 0-240 seconds full cycle
  private dayNightStars: { x: number; y: number; alpha: number }[] = [];
  private hpBars: Map<number, Phaser.GameObjects.Rectangle> = new Map();
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private effectsGraphics!: Phaser.GameObjects.Graphics;
  private isDragging = false;
  private dragStartWorld = { x: 0, y: 0 };
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private isLongPress = false;
  private isTouchDevice = false;
  private pinchStartDist = 0;
  private lastTapTime = 0;
  private hitFlashTimers: Map<number, number> = new Map();
  private buildAnimTimers: Map<number, number> = new Map();
  private lastHp: Map<number, number> = new Map();

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { settings?: GameSettings }) {
    this.settings = data.settings ?? { ...DEFAULT_SETTINGS };
  }

  create() {
    // Map size from settings, scaled up for more players
    const baseMap = MAP_SIZE_VALUES[this.settings.mapSize];
    const totalPlayers = 1 + this.settings.cpuPlayers.length;
    const mapScale = Math.max(1, Math.sqrt(totalPlayers / 2));
    const mapW = Math.floor(baseMap.w * mapScale);
    const mapH = Math.floor(baseMap.h * mapScale);

    const startRes = STARTING_RES_VALUES[this.settings.startingResources];

    // Init world
    this.world = new GameWorld();
    this.world.mapWidth = mapW;
    this.world.mapHeight = mapH;

    // Player 0 = human
    const humanPlayer = this.world.addPlayer(0);
    humanPlayer.resources = { ...startRes };
    this.playerColors.set(0, this.settings.playerColor);

    // CPU players
    this.aiSystems = [];
    for (let i = 0; i < this.settings.cpuPlayers.length; i++) {
      const cpu = this.settings.cpuPlayers[i];
      const pid = i + 1;
      const player = this.world.addPlayer(pid);
      player.resources = { ...startRes };

      // Hard difficulty gets a resource bonus
      if (cpu.difficulty === 'hard') {
        const bonus = 1.5;
        player.resources.food = Math.floor(player.resources.food * bonus);
        player.resources.wood = Math.floor(player.resources.wood * bonus);
        player.resources.gold = Math.floor(player.resources.gold * bonus);
        player.resources.stone = Math.floor(player.resources.stone * bonus);
      }

      this.playerColors.set(pid, cpu.color);
    }

    // Init systems
    this.selection = new SelectionSystem(this.world, 0);
    this.commands = new CommandSystem(this.world);
    this.combat = new CombatSystem(this.world);
    this.economy = new EconomySystem(this.world);
    this.diplomacy = new DiplomacySystem(this.world, this.economy);
    this.victory = new VictorySystem(this.world, this.diplomacy, null, this.settings.victoryMode, this.settings.timeLimit);

    // Link diplomacy to combat
    this.combat.diplomacy = this.diplomacy;

    for (let i = 0; i < this.settings.cpuPlayers.length; i++) {
      const cpu = this.settings.cpuPlayers[i];
      const pid = i + 1;
      const ai = new AISystem(this.world, this.commands, this.economy, pid, cpu.difficulty);
      ai.diplomacy = this.diplomacy;
      this.aiSystems.push(ai);
    }

    // Generate procedural map
    const seed = Math.floor(Math.random() * 999999);
    const mapGen = new MapGenerator(mapW, mapH, seed);
    const mapData = mapGen.generate(totalPlayers);

    // Draw terrain
    const terrainRenderer = new TerrainRenderer(this);
    terrainRenderer.renderTerrain(mapData.terrain);
    terrainRenderer.renderDecorations(mapData.decorations);

    // Pass terrain to combat for elevation bonuses
    this.combat.terrain = mapData.terrain;

    // Fallback ground behind terrain
    const bg = this.add.rectangle(mapW / 2, mapH / 2, mapW, mapH, 0x2d5a1e);
    bg.setDepth(-11);

    // Camera
    this.cameras.main.setBounds(0, 0, mapW, mapH);
    this.cameras.main.setScroll(mapW / 2 - this.scale.width / 2, mapH / 2 - this.scale.height / 2);

    // Graphics layers
    this.selectionGraphics = this.add.graphics();
    this.selectionGraphics.setDepth(100);
    this.effectsGraphics = this.add.graphics();
    this.effectsGraphics.setDepth(99);

    // Day/night overlay — covers entire map, tinted by time of day
    this.dayNightOverlay = this.add.rectangle(mapW / 2, mapH / 2, mapW, mapH, 0x000022, 0);
    this.dayNightOverlay.setDepth(95); // above terrain, below selection/effects
    this.dayNightOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

    // Spawn starting entities using map data
    this.spawnFromMapData(mapData, totalPlayers);

    // Input
    this.setupInput();

    // Start HUD & diplomacy panel
    this.scene.launch('HUDScene', { gameScene: this, diplomacy: this.diplomacy });
    this.scene.launch('DiplomacyPanelScene', { gameScene: this, diplomacy: this.diplomacy });
  }

  private spawnFromMapData(mapData: MapData, totalPlayers: number) {
    // Spawn each player's base at map-generated positions
    for (let pid = 0; pid < totalPlayers; pid++) {
      if (pid < mapData.spawnPositions.length) {
        const pos = mapData.spawnPositions[pid];
        this.spawnBuilding('townCenter', pid, pos.x, pos.y);
        for (let i = 0; i < 3; i++) {
          this.spawnUnit('villager', pid, pos.x + 40 + i * 20, pos.y + 50);
        }
      }
    }

    // Spawn all map-generated resources
    for (const res of mapData.resources) {
      const entity = this.world.spawnEntity('resource', res.type, -1, res.x, res.y, 100);
      this.createSprite(entity, `resource_${res.type}`);
    }

    // Center camera on human player
    if (mapData.spawnPositions.length > 0) {
      const p0 = mapData.spawnPositions[0];
      this.cameras.main.setScroll(p0.x - this.scale.width / 2, p0.y - this.scale.height / 2);
    }
  }

  private spawnUnit(key: string, owner: number, x: number, y: number) {
    const config = ALL_UNITS[key] ?? UNITS[key];
    if (!config) return;
    const entity = this.world.spawnEntity('unit', key, owner, x, y, config.hp);
    entity.carryAmount = 0;
    this.createSprite(entity, `unit_${key}`);
  }

  private spawnBuilding(key: string, owner: number, x: number, y: number) {
    const config = ALL_BUILDINGS[key] ?? BUILDINGS[key];
    if (!config) return;
    const entity = this.world.spawnEntity('building', key, owner, x, y, config.hp);
    entity.trainQueue = [];
    entity.buildProgress = 1; // starting buildings are complete
    this.createSprite(entity, `building_${key}`);
  }

  private createSprite(entity: EntityData, texture: string): Phaser.GameObjects.Sprite {
    const sprite = this.add.sprite(entity.x, entity.y, texture);
    sprite.setDepth(entity.type === 'building' ? 1 : 2);

    // Tint owned entities with player color
    if (entity.owner >= 0) {
      const color = this.playerColors.get(entity.owner);
      if (color !== undefined) {
        sprite.setTint(color);
      }
    }

    this.sprites.set(entity.id, sprite);
    return sprite;
  }

  private setupInput() {
    // Detect touch device
    this.isTouchDevice = this.sys.game.device.input.touch;

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.isDragging = true;
      this.isLongPress = false;
      this.dragStartWorld = { x: worldPoint.x, y: worldPoint.y };
      this.selection.startBox(worldPoint.x, worldPoint.y);

      // Long-press timer for touch devices (acts like right-click)
      if (this.isTouchDevice) {
        this.longPressTimer = setTimeout(() => {
          this.isLongPress = true;
          this.issueCommand(pointer);
        }, 400);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging) {
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
        this.selection.updateBox(worldPoint.x, worldPoint.y);

        // Cancel long press if dragging
        const dx = worldPoint.x - this.dragStartWorld.x;
        const dy = worldPoint.y - this.dragStartWorld.y;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
          }
        }
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // Clear long press timer
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      if (this.isLongPress) {
        // Already handled by long press
        this.isDragging = false;
        return;
      }

      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      const dx = worldPoint.x - this.dragStartWorld.x;
      const dy = worldPoint.y - this.dragStartWorld.y;

      if (pointer.rightButtonReleased()) {
        // Right-click: always issue command
        this.issueCommand(pointer);
      } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
        // Single click/tap — smart context action
        this.handleSmartClick(pointer);
      } else {
        // Drag — box select
        this.selection.endBox();
      }

      this.isDragging = false;
    });

    // Prevent context menu
    this.input.mouse?.disableContextMenu();

    // Control groups: Ctrl+1-9 to assign, 1-9 to select, double-tap to center camera
    const lastGroupTap: Map<number, number> = new Map();
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      const num = parseInt(event.key);
      if (num >= 1 && num <= 9) {
        if (event.ctrlKey || event.metaKey) {
          // Assign control group
          this.selection.assignControlGroup(num);
        } else {
          const now = Date.now();
          const lastTap = lastGroupTap.get(num) ?? 0;
          if (now - lastTap < 300) {
            // Double-tap: center camera on group
            const center = this.selection.getControlGroupCenter(num);
            if (center) {
              this.cameras.main.setScroll(
                center.x - this.scale.width / 2,
                center.y - this.scale.height / 2
              );
            }
          }
          lastGroupTap.set(num, now);
          this.selection.selectControlGroup(num);
        }
      }
    });

    // Pinch zoom for touch
    if (this.isTouchDevice) {
      this.input.on('pointerdown', (_pointer: Phaser.Input.Pointer) => {
        if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
          const dx = this.input.pointer1.x - this.input.pointer2.x;
          const dy = this.input.pointer1.y - this.input.pointer2.y;
          this.pinchStartDist = Math.sqrt(dx * dx + dy * dy);
        }
      });
    }
  }

  /**
   * Smart single-click: if units selected and you click a resource/enemy, issue command.
   * If nothing selected or clicking own entity, select it.
   */
  private handleSmartClick(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const clickedEntity = this.selection.entityAtPoint(worldPoint.x, worldPoint.y);
    const selectedIds = [...this.selection.selected];
    const hasUnitsSelected = selectedIds.some((id) => {
      const e = this.world.entities.get(id);
      return e && e.type === 'unit' && e.owner === 0;
    });

    if (hasUnitsSelected && clickedEntity) {
      // If clicking a resource with villagers selected → gather
      if (clickedEntity.type === 'resource') {
        const villagerIds = selectedIds.filter((id) => {
          const e = this.world.entities.get(id);
          return e && e.key === 'villager' && e.owner === 0;
        });
        if (villagerIds.length > 0) {
          this.commands.issueCommand(villagerIds, { type: 'gather', targetId: clickedEntity.id });
          return;
        }
      }

      // If clicking an enemy → attack
      if (clickedEntity.owner !== 0 && clickedEntity.owner !== -1 && clickedEntity.type !== 'resource') {
        if (!this.diplomacy.areAllied(0, clickedEntity.owner)) {
          this.commands.issueCommand(selectedIds, { type: 'attack', targetId: clickedEntity.id });
          return;
        }
      }
    }

    // Default: select clicked entity or clear selection
    if (clickedEntity) {
      this.selection.selectSingle(clickedEntity.id);
    } else if (hasUnitsSelected) {
      // Clicking empty ground with units selected → move
      this.commands.issueCommand(selectedIds, { type: 'move', x: worldPoint.x, y: worldPoint.y });
    } else {
      this.selection.clearSelection();
    }
  }

  /**
   * Issue command (right-click or long-press): move/attack/gather based on target.
   */
  private issueCommand(pointer: Phaser.Input.Pointer) {
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const selectedIds = [...this.selection.selected];
    if (selectedIds.length === 0) return;

    const targetEntity = this.selection.entityAtPoint(worldPoint.x, worldPoint.y);

    if (targetEntity) {
      if (targetEntity.type === 'resource') {
        // Gather
        const villagerIds = selectedIds.filter((id) => {
          const e = this.world.entities.get(id);
          return e && e.key === 'villager';
        });
        if (villagerIds.length > 0) {
          this.commands.issueCommand(villagerIds, { type: 'gather', targetId: targetEntity.id });
        }
      } else if (targetEntity.owner !== 0 && targetEntity.owner !== -1) {
        // Attack enemy
        if (!this.diplomacy.areAllied(0, targetEntity.owner)) {
          this.commands.issueCommand(selectedIds, { type: 'attack', targetId: targetEntity.id });
        }
      }
    } else {
      // Move
      this.commands.issueCommand(selectedIds, { type: 'move', x: worldPoint.x, y: worldPoint.y });
    }
  }

  update(_time: number, delta: number) {
    // Update systems
    this.commands.update(delta);
    this.economy.update(delta);
    this.combat.update(delta);
    this.diplomacy.update(delta, _time / 1000);
    this.victory.update(delta);
    for (const ai of this.aiSystems) {
      ai.update(delta);
    }

    // Check victory
    if (!this.victoryShown) {
      const winner = this.victory.getWinner();
      if (winner) {
        this.victoryShown = true;
        this.showVictoryScreen(winner.playerId, winner.type);
      }
    }

    // Day/night cycle
    this.updateDayNight(delta);

    // Tick down effect timers
    this.tickTimers(delta);

    // Camera edge scrolling
    this.updateCamera(delta);

    // Sync sprites
    this.syncSprites();

    // Draw effects (building anim, hit flash)
    this.drawEffects();

    // Draw selection box
    this.drawSelectionBox();

    // Recalc pop
    this.world.recalcPopUsed(0);
    this.world.recalcPopCap(0);
  }

  private updateCamera(delta: number) {
    const pointer = this.input.activePointer;
    const cam = this.cameras.main;
    const speed = CAMERA_SPEED * (delta / 1000);

    if (pointer.x < CAMERA_EDGE_ZONE) cam.scrollX -= speed;
    if (pointer.x > this.scale.width - CAMERA_EDGE_ZONE) cam.scrollX += speed;
    if (pointer.y < CAMERA_EDGE_ZONE) cam.scrollY -= speed;
    if (pointer.y > this.scale.height - CAMERA_EDGE_ZONE) cam.scrollY += speed;

    // Keyboard scrolling
    const keys = this.input.keyboard;
    if (keys) {
      if (keys.addKey('W').isDown || keys.addKey('UP').isDown) cam.scrollY -= speed;
      if (keys.addKey('S').isDown || keys.addKey('DOWN').isDown) cam.scrollY += speed;
      if (keys.addKey('A').isDown || keys.addKey('LEFT').isDown) cam.scrollX -= speed;
      if (keys.addKey('D').isDown || keys.addKey('RIGHT').isDown) cam.scrollX += speed;
    }
  }

  private syncSprites() {
    for (const entity of this.world.entities.values()) {
      let sprite = this.sprites.get(entity.id);

      if (entity.state === 'dead') {
        if (sprite) {
          sprite.destroy();
          this.sprites.delete(entity.id);
        }
        const hpBar = this.hpBars.get(entity.id);
        if (hpBar) {
          hpBar.destroy();
          this.hpBars.delete(entity.id);
        }
        this.lastHp.delete(entity.id);
        this.hitFlashTimers.delete(entity.id);
        this.buildAnimTimers.delete(entity.id);
        this.world.removeEntity(entity.id);
        continue;
      }

      if (!sprite) {
        // New entity spawned by a system - create sprite
        const texture = `${entity.type}_${entity.key}`;
        sprite = this.createSprite(entity, texture);
      }

      sprite.setPosition(entity.x, entity.y);

      // Detect damage — trigger hit flash
      const prevHp = this.lastHp.get(entity.id) ?? entity.hp;
      if (entity.hp < prevHp) {
        this.hitFlashTimers.set(entity.id, 0.3);
      }
      this.lastHp.set(entity.id, entity.hp);

      // Track villagers in building state
      if (entity.state === 'building' && entity.type === 'unit') {
        if (!this.buildAnimTimers.has(entity.id)) {
          this.buildAnimTimers.set(entity.id, 0);
        }
      } else {
        this.buildAnimTimers.delete(entity.id);
      }

      // Hit flash tint vs player color
      const isFlashing = (this.hitFlashTimers.get(entity.id) ?? 0) > 0;
      if (isFlashing) {
        sprite.setTint(0xff4444);
      } else if (entity.owner >= 0) {
        const pColor = this.playerColors.get(entity.owner);
        if (pColor !== undefined) {
          sprite.setTint(pColor);
        } else {
          sprite.clearTint();
        }
      } else {
        sprite.clearTint();
      }

      // Building under construction — transparency based on progress
      if (entity.type === 'building' && entity.buildProgress !== undefined && entity.buildProgress < 1) {
        sprite.setAlpha(0.3 + entity.buildProgress * 0.7);
      } else if (this.selection.selected.has(entity.id)) {
        sprite.setAlpha(1);
      } else {
        sprite.setAlpha(0.85);
      }
    }
  }

  /**
   * Day/night cycle: 240 seconds per full day.
   * Dawn (0-30s), Day (30-150s), Dusk (150-180s), Night (180-240s)
   */
  private updateDayNight(delta: number) {
    const CYCLE = 240; // seconds per full day
    this.dayNightTime = (this.dayNightTime + delta / 1000) % CYCLE;
    const t = this.dayNightTime;

    let alpha: number;
    let tint: number;

    if (t < 20) {
      // Pre-dawn: dark blue fading out
      const p = t / 20;
      alpha = 0.35 * (1 - p);
      tint = this.lerpColor(0x0a0a30, 0xff8844, p);
    } else if (t < 40) {
      // Dawn: warm orange glow fading to clear
      const p = (t - 20) / 20;
      alpha = 0.15 * (1 - p);
      tint = this.lerpColor(0xff8844, 0xffffff, p);
    } else if (t < 140) {
      // Day: clear, slight warm tint
      alpha = 0;
      tint = 0xffffff;
    } else if (t < 160) {
      // Late afternoon: warm golden
      const p = (t - 140) / 20;
      alpha = p * 0.1;
      tint = this.lerpColor(0xffffff, 0xffaa44, p);
    } else if (t < 180) {
      // Dusk: deepening orange to purple
      const p = (t - 160) / 20;
      alpha = 0.1 + p * 0.15;
      tint = this.lerpColor(0xffaa44, 0x6633aa, p);
    } else if (t < 200) {
      // Twilight: purple to dark blue
      const p = (t - 180) / 20;
      alpha = 0.25 + p * 0.1;
      tint = this.lerpColor(0x6633aa, 0x0a0a30, p);
    } else {
      // Night: dark blue
      alpha = 0.35;
      tint = 0x0a0a30;
    }

    this.dayNightOverlay.setFillStyle(tint, alpha);
  }

  private lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (g << 8) | bl;
  }

  private tickTimers(delta: number) {
    const dt = delta / 1000;
    for (const [id, t] of this.hitFlashTimers) {
      const next = t - dt;
      if (next <= 0) {
        this.hitFlashTimers.delete(id);
      } else {
        this.hitFlashTimers.set(id, next);
      }
    }
    for (const [id, t] of this.buildAnimTimers) {
      this.buildAnimTimers.set(id, t + dt);
    }
  }

  private drawEffects() {
    this.effectsGraphics.clear();

    // Building animation — hammer sparks around villagers that are building
    for (const [id, timer] of this.buildAnimTimers) {
      const entity = this.world.entities.get(id);
      if (!entity) continue;

      const target = entity.target !== null ? this.world.entities.get(entity.target) : null;
      const bx = target ? target.x : entity.x + 20;
      const by = target ? target.y : entity.y;

      // Animated hammer swing (arc back and forth)
      const swingAngle = Math.sin(timer * 8) * 0.6;
      const hammerLen = 12;
      const pivotX = entity.x + 6;
      const pivotY = entity.y - 6;
      const endX = pivotX + Math.cos(-0.8 + swingAngle) * hammerLen;
      const endY = pivotY + Math.sin(-0.8 + swingAngle) * hammerLen;

      // Handle
      this.effectsGraphics.lineStyle(2, 0x886644);
      this.effectsGraphics.lineBetween(pivotX, pivotY, endX, endY);
      // Hammer head
      this.effectsGraphics.fillStyle(0xaaaaaa, 1);
      this.effectsGraphics.fillRect(endX - 3, endY - 2, 6, 4);

      // Sparks at build site
      const sparkPhase = timer * 6;
      for (let i = 0; i < 3; i++) {
        const angle = sparkPhase + i * 2.1;
        const dist = 8 + Math.sin(angle * 3) * 6;
        const sx = bx + Math.cos(angle) * dist;
        const sy = by + Math.sin(angle) * dist - 4;
        const alpha = 0.5 + Math.sin(angle * 5) * 0.5;
        this.effectsGraphics.fillStyle(0xffcc00, alpha);
        this.effectsGraphics.fillRect(sx, sy, 2, 2);
      }

      // Progress bar above building site
      if (target && target.buildProgress !== undefined && target.buildProgress < 1) {
        const barW = 30;
        const barH = 4;
        const barX = bx - barW / 2;
        const barY = by - 28;
        this.effectsGraphics.fillStyle(0x000000, 0.6);
        this.effectsGraphics.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
        this.effectsGraphics.fillStyle(0xffaa00, 1);
        this.effectsGraphics.fillRect(barX, barY, barW * target.buildProgress, barH);
      }
    }

    // Under-attack flash rings
    for (const [id, timer] of this.hitFlashTimers) {
      const entity = this.world.entities.get(id);
      if (!entity) continue;

      const progress = 1 - timer / 0.3; // 0 to 1
      const radius = 10 + progress * 14;
      const alpha = (1 - progress) * 0.7;

      // Expanding red ring
      this.effectsGraphics.lineStyle(2, 0xff3333, alpha);
      this.effectsGraphics.strokeCircle(entity.x, entity.y, radius);

      // Inner flash
      if (timer > 0.2) {
        this.effectsGraphics.fillStyle(0xff0000, 0.15);
        this.effectsGraphics.fillCircle(entity.x, entity.y, 10);
      }
    }
  }

  private drawSelectionBox() {
    this.selectionGraphics.clear();

    // Draw selection circles under selected units
    for (const id of this.selection.selected) {
      const entity = this.world.entities.get(id);
      if (!entity) continue;
      this.selectionGraphics.lineStyle(1, 0x00ff00, 0.8);
      this.selectionGraphics.strokeCircle(entity.x, entity.y, 12);
    }

    // Draw drag box
    if (this.isDragging && this.selection.boxStart && this.selection.boxEnd) {
      const x = Math.min(this.selection.boxStart.x, this.selection.boxEnd.x);
      const y = Math.min(this.selection.boxStart.y, this.selection.boxEnd.y);
      const w = Math.abs(this.selection.boxEnd.x - this.selection.boxStart.x);
      const h = Math.abs(this.selection.boxEnd.y - this.selection.boxStart.y);

      this.selectionGraphics.lineStyle(1, 0x00ff00, 1);
      this.selectionGraphics.strokeRect(x, y, w, h);
      this.selectionGraphics.fillStyle(0x00ff00, 0.1);
      this.selectionGraphics.fillRect(x, y, w, h);
    }
  }

  private showVictoryScreen(winnerId: number, type: string) {
    const w = this.scale.width;
    const h = this.scale.height;
    const cx = w / 2;
    const cy = h / 2;

    const isHuman = winnerId === 0;
    const title = isHuman ? 'VICTORY!' : 'DEFEAT';
    const titleColor = isHuman ? '#ffcc44' : '#cc4444';
    const subtitles: Record<string, string> = {
      domination: isHuman ? 'You conquered all enemies!' : `CPU ${winnerId} has dominated the map.`,
      wonder: isHuman ? 'Your Wonder stands eternal!' : `CPU ${winnerId} completed a Wonder.`,
      timed: isHuman ? 'You achieved the highest score!' : `CPU ${winnerId} scored the most points.`,
    };
    const subtitle = subtitles[type] ?? (isHuman ? 'Victory is yours!' : `CPU ${winnerId} wins.`);

    // Overlay
    const overlay = this.add.rectangle(cx, cy, w, h, 0x000000, 0.7).setDepth(500).setScrollFactor(0);

    this.add.text(cx, cy - 50, title, {
      fontSize: '64px', color: titleColor, fontFamily: 'monospace', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(501).setScrollFactor(0);

    this.add.text(cx, cy + 20, subtitle, {
      fontSize: '18px', color: '#cccccc', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(501).setScrollFactor(0);

    const menuBtn = this.add.text(cx, cy + 80, '[ MAIN MENU ]', {
      fontSize: '20px', color: '#88cc44', fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(501).setScrollFactor(0).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => menuBtn.setColor('#aaffaa'));
    menuBtn.on('pointerout', () => menuBtn.setColor('#88cc44'));
    menuBtn.on('pointerdown', () => {
      this.scene.stop('HUDScene');
      this.scene.stop('DiplomacyPanelScene');
      this.scene.start('MenuScene');
    });
  }
}
