// ---------------------------------------------------------------------------
// GraphicsEnhancer.ts – Visual polish layer for the RTS game
// ---------------------------------------------------------------------------

import Phaser from 'phaser';
import { GameWorld, EntityData } from './GameWorld';
import { UNITS, UnitConfig } from '../config/units';
import { BUILDINGS, BuildingConfig } from '../config/buildings';
import { ALL_UNITS, ALL_BUILDINGS } from '../config/ages';
import { TerrainTile } from './MapGenerator';

// ---------------------------------------------------------------------------
// Dust / smoke / sparkle particle
// ---------------------------------------------------------------------------
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;   // remaining seconds
  maxLife: number;
  color: number;
  size: number;
  kind: 'dust' | 'smoke' | 'sparkle' | 'glint';
}

const MAX_PARTICLES = 200;
const RANGED_THRESHOLD = 30; // range > this counts as ranged

// Military building keys that emit smoke
const SMOKE_BUILDINGS = new Set([
  'barracks', 'stable', 'castle', 'factory',
  'archeryRange', 'siegeWorkshop', 'fortress',
]);

// ---------------------------------------------------------------------------
// GraphicsEnhancer
// ---------------------------------------------------------------------------
export class GraphicsEnhancer {
  graphics: Phaser.GameObjects.Graphics;

  private scene: Phaser.Scene;
  private world: GameWorld;
  private sprites: Map<number, Phaser.GameObjects.Sprite>;
  private selection: { selected: Set<number> };
  private playerColors: Map<number, number>;
  private terrain: TerrainTile[][] | null;

  // Particle pool
  private particles: Particle[] = [];

  // Track previous attacking state per entity to detect attack starts
  private prevAttacking: Set<number> = new Set();

  // Attack flash timers (entity id -> remaining seconds)
  private attackFlashTimers: Map<number, number> = new Map();

  // Selection ring rotation angle
  private ringAngle = 0;

  // Water shimmer phase
  private waterPhase = 0;

  // Smoke cooldowns per building (entity id -> seconds until next puff)
  private smokeCooldowns: Map<number, number> = new Map();

  // Sparkle cooldowns per resource (entity id -> seconds until next sparkle)
  private sparkleCooldowns: Map<number, number> = new Map();

  constructor(
    scene: Phaser.Scene,
    world: GameWorld,
    sprites: Map<number, Phaser.GameObjects.Sprite>,
    selection: { selected: Set<number> },
    playerColors: Map<number, number>,
    terrain: TerrainTile[][] | null = null,
  ) {
    this.scene = scene;
    this.world = world;
    this.sprites = sprites;
    this.selection = selection;
    this.playerColors = playerColors;
    this.terrain = terrain;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(98);
  }

  // -------------------------------------------------------------------
  // Main update — called every frame
  // -------------------------------------------------------------------
  update(delta: number, time: number): void {
    this.graphics.clear();

    const dt = delta / 1000; // seconds
    this.ringAngle += dt * 0.8;               // radians/sec for selection ring
    this.waterPhase += dt;

    const cam = this.scene.cameras.main;
    const vx = cam.worldView.x;
    const vy = cam.worldView.y;
    const vw = cam.worldView.width;
    const vh = cam.worldView.height;
    const margin = 64; // include entities slightly off-screen

    // Viewport bounds with margin
    const left = vx - margin;
    const right = vx + vw + margin;
    const top = vy - margin;
    const bottom = vy + vh + margin;

    // Tick down attack flash timers
    for (const [id, t] of this.attackFlashTimers) {
      const next = t - dt;
      if (next <= 0) {
        this.attackFlashTimers.delete(id);
      } else {
        this.attackFlashTimers.set(id, next);
      }
    }

    // Current attackers set (for detecting new attacks)
    const currentAttacking = new Set<number>();

    // Process entities
    for (const entity of this.world.entities.values()) {
      if (entity.state === 'dead') continue;

      // Viewport culling
      if (entity.x < left || entity.x > right || entity.y < top || entity.y > bottom) continue;

      const sprite = this.sprites.get(entity.id);

      // --- Shadows under units ---
      if (entity.type === 'unit') {
        this.drawShadow(entity);
      }

      // --- Idle breathing ---
      if (entity.type === 'unit' && entity.state === 'idle' && sprite) {
        const breathOffset = Math.sin(time * 0.002 + entity.id * 1.7) * 1.5;
        sprite.y = entity.y + breathOffset;
      }

      // --- Movement dust ---
      if (entity.type === 'unit' && entity.state === 'moving') {
        this.spawnDust(entity, dt);
      }

      // --- Attack flash, projectile & swing animation ---
      if (entity.state === 'attacking' && entity.type === 'unit') {
        currentAttacking.add(entity.id);
        if (!this.prevAttacking.has(entity.id)) {
          this.attackFlashTimers.set(entity.id, 0.12);
          this.drawProjectile(entity);
        }

        // Melee swing animation
        const aCfg = (ALL_UNITS[entity.key] ?? UNITS[entity.key]) as UnitConfig | undefined;
        if (aCfg && aCfg.range < RANGED_THRESHOLD && entity.target !== null) {
          const target = this.world.entities.get(entity.target);
          if (target) {
            const angle = Math.atan2(target.y - entity.y, target.x - entity.x);
            const swingPhase = Math.sin(time * 0.012 + entity.id) * 0.8;
            const swordLen = 10;
            const sx = entity.x + Math.cos(angle + swingPhase) * swordLen;
            const sy = entity.y - 4 + Math.sin(angle + swingPhase) * swordLen;
            // Sword/weapon line
            this.graphics.lineStyle(2, 0xcccccc, 0.9);
            this.graphics.lineBetween(entity.x, entity.y - 4, sx, sy);
            // Impact spark at tip
            if (Math.abs(swingPhase) < 0.2) {
              this.graphics.fillStyle(0xffcc44, 0.8);
              this.graphics.fillCircle(sx, sy, 2);
            }
          }
        }

        // Ranged: draw arrow flying toward target
        if (aCfg && aCfg.range >= RANGED_THRESHOLD && entity.target !== null) {
          const target = this.world.entities.get(entity.target);
          if (target) {
            // Arrow as a small line with a moving position
            const progress = (Math.sin(time * 0.008 + entity.id * 2) + 1) / 2;
            const ax = entity.x + (target.x - entity.x) * progress;
            const ay = (entity.y - 4) + (target.y - 4 - entity.y + 4) * progress - Math.sin(progress * Math.PI) * 15;
            const angle = Math.atan2(target.y - entity.y, target.x - entity.x);
            // Arrow shaft
            this.graphics.lineStyle(2, 0x886644, 0.9);
            this.graphics.lineBetween(
              ax - Math.cos(angle) * 5, ay - Math.sin(angle) * 5,
              ax + Math.cos(angle) * 5, ay + Math.sin(angle) * 5
            );
            // Arrow tip
            this.graphics.fillStyle(0xaaaaaa, 1);
            this.graphics.fillCircle(ax + Math.cos(angle) * 5, ay + Math.sin(angle) * 5, 1.5);
          }
        }
      }

      // --- Gathering animation ---
      if (entity.state === 'gathering' && entity.key === 'villager') {
        const gatherSwing = Math.sin(time * 0.01 + entity.id * 1.3);
        const toolAngle = -1.2 + gatherSwing * 0.6;
        const pivotX = entity.x + 6;
        const pivotY = entity.y - 4;
        const toolLen = 9;
        const endX = pivotX + Math.cos(toolAngle) * toolLen;
        const endY = pivotY + Math.sin(toolAngle) * toolLen;

        if (entity.gatherType === 'wood') {
          // Axe
          this.graphics.lineStyle(2, 0x886644, 0.9);
          this.graphics.lineBetween(pivotX, pivotY, endX, endY);
          this.graphics.fillStyle(0xaaaaaa, 1);
          this.graphics.fillRect(endX - 2, endY - 1, 5, 3);
        } else if (entity.gatherType === 'stone' || entity.gatherType === 'gold') {
          // Pickaxe
          this.graphics.lineStyle(2, 0x886644, 0.9);
          this.graphics.lineBetween(pivotX, pivotY, endX, endY);
          this.graphics.lineStyle(2, 0x888888, 1);
          this.graphics.lineBetween(endX - 3, endY - 2, endX + 3, endY + 2);
        } else {
          // Food — hands gathering (bobbing motion)
          if (sprite) {
            sprite.y = entity.y + Math.abs(gatherSwing) * 2;
          }
        }

        // Gathering particles — small bits flying off
        if (Math.abs(gatherSwing) > 0.7) {
          const pColor = entity.gatherType === 'wood' ? 0x886644
            : entity.gatherType === 'gold' ? 0xffcc00
            : entity.gatherType === 'stone' ? 0x888888
            : 0x44aa44;
          this.graphics.fillStyle(pColor, 0.6);
          const px = entity.x + 8 + Math.random() * 6;
          const py = entity.y - 2 - Math.random() * 6;
          this.graphics.fillRect(px, py, 2, 2);
        }
      }

      // Apply white flash to sprite
      if (this.attackFlashTimers.has(entity.id) && sprite) {
        sprite.setTintFill(0xffffff);
        // The normal tint will be restored by GameScene.syncSprites next frame
      }

      // --- Health bars ---
      this.drawHealthBar(entity);

      // --- Building smoke ---
      if (entity.type === 'building') {
        this.updateBuildingSmoke(entity, dt);
      }

      // --- Resource sparkle ---
      if (entity.type === 'resource') {
        this.updateResourceSparkle(entity, dt);
      }
    }

    this.prevAttacking = currentAttacking;

    // --- Water shimmer ---
    if (this.terrain) {
      this.drawWaterShimmer(left, top, right, bottom);
    }

    // --- Selection rings ---
    this.drawSelectionRings();

    // --- Update & draw particles ---
    this.updateParticles(dt);
    this.drawParticles();
  }

  // -------------------------------------------------------------------
  // 1. Health bars
  // -------------------------------------------------------------------
  private drawHealthBar(entity: EntityData): void {
    const isDamaged = entity.hp < entity.maxHp;
    const isSelected = this.selection.selected.has(entity.id);
    if (!isDamaged && !isSelected) return;

    const ratio = Math.max(0, entity.hp / entity.maxHp);

    // Bar dimensions scale with entity type
    let barW: number;
    let yOffset: number;
    if (entity.type === 'building') {
      const cfg = (ALL_BUILDINGS[entity.key] ?? BUILDINGS[entity.key]) as BuildingConfig | undefined;
      const sz = cfg ? cfg.size * 32 : 48;
      barW = Math.min(sz, 60);
      yOffset = -(sz / 2 + 6);
    } else {
      const cfg = (ALL_UNITS[entity.key] ?? UNITS[entity.key]) as UnitConfig | undefined;
      barW = cfg ? Math.max(16, cfg.size * 3) : 20;
      yOffset = -14;
    }
    const barH = 3;
    const bx = entity.x - barW / 2;
    const by = entity.y + yOffset;

    // Background
    this.graphics.fillStyle(0x111111, 0.7);
    this.graphics.fillRect(bx - 1, by - 1, barW + 2, barH + 2);

    // Foreground color: green > yellow > red
    let color: number;
    if (ratio > 0.6) {
      color = 0x44cc44;
    } else if (ratio > 0.3) {
      color = 0xcccc22;
    } else {
      color = 0xcc2222;
    }

    this.graphics.fillStyle(color, 0.9);
    this.graphics.fillRect(bx, by, barW * ratio, barH);
  }

  // -------------------------------------------------------------------
  // 2. Shadows
  // -------------------------------------------------------------------
  private drawShadow(entity: EntityData): void {
    this.graphics.fillStyle(0x000000, 0.3);
    this.graphics.fillEllipse(entity.x + 2, entity.y + 6, 14, 6);
  }

  // -------------------------------------------------------------------
  // 4. Movement dust particles
  // -------------------------------------------------------------------
  private spawnDust(entity: EntityData, dt: number): void {
    if (this.particles.length >= MAX_PARTICLES) return;

    // Spawn roughly 8 particles per second per moving unit
    if (Math.random() > dt * 8) return;

    const colors = [0xaa8855, 0xccaa77, 0x998866];
    this.particles.push({
      x: entity.x + (Math.random() - 0.5) * 8,
      y: entity.y + 4 + Math.random() * 4,
      vx: (Math.random() - 0.5) * 10,
      vy: -Math.random() * 8 - 4,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 1 + Math.random(),
      kind: 'dust',
    });
  }

  // -------------------------------------------------------------------
  // 5. Attack flash & ranged projectile
  // -------------------------------------------------------------------
  private drawProjectile(entity: EntityData): void {
    if (entity.target === null) return;

    const cfg = (ALL_UNITS[entity.key] ?? UNITS[entity.key]) as UnitConfig | undefined;
    if (!cfg || cfg.range < RANGED_THRESHOLD) return;

    const target = this.world.entities.get(entity.target);
    if (!target) return;

    // Draw projectile line from attacker to target
    this.graphics.lineStyle(1, 0xffff88, 0.8);
    this.graphics.lineBetween(entity.x, entity.y - 4, target.x, target.y - 4);

    // Small arrowhead dot at target
    this.graphics.fillStyle(0xffffaa, 1);
    this.graphics.fillCircle(target.x, target.y - 4, 2);
  }

  // -------------------------------------------------------------------
  // 6. Building smoke
  // -------------------------------------------------------------------
  private updateBuildingSmoke(entity: EntityData, dt: number): void {
    // Only completed military buildings
    if (!SMOKE_BUILDINGS.has(entity.key)) return;
    if (entity.buildProgress !== undefined && entity.buildProgress < 1) return;

    let cd = this.smokeCooldowns.get(entity.id) ?? 0;
    cd -= dt;
    if (cd <= 0) {
      // Spawn a smoke puff
      if (this.particles.length < MAX_PARTICLES) {
        this.particles.push({
          x: entity.x + (Math.random() - 0.5) * 12,
          y: entity.y - 12 - Math.random() * 6,
          vx: (Math.random() - 0.5) * 4,
          vy: -10 - Math.random() * 8,
          life: 1.2 + Math.random() * 0.8,
          maxLife: 2.0,
          color: 0x888888,
          size: 2 + Math.random() * 2,
          kind: 'smoke',
        });
      }
      cd = 0.6 + Math.random() * 1.2; // next puff in 0.6-1.8s
    }
    this.smokeCooldowns.set(entity.id, cd);
  }

  // -------------------------------------------------------------------
  // 7. Water shimmer
  // -------------------------------------------------------------------
  private drawWaterShimmer(
    left: number, top: number, right: number, bottom: number,
  ): void {
    const tileSize = 32;
    const terrain = this.terrain!;
    const rows = terrain.length;
    const cols = rows > 0 ? terrain[0].length : 0;

    const txStart = Math.max(0, Math.floor(left / tileSize));
    const tyStart = Math.max(0, Math.floor(top / tileSize));
    const txEnd = Math.min(cols - 1, Math.ceil(right / tileSize));
    const tyEnd = Math.min(rows - 1, Math.ceil(bottom / tileSize));

    for (let ty = tyStart; ty <= tyEnd; ty++) {
      for (let tx = txStart; tx <= txEnd; tx++) {
        if (terrain[ty][tx].type !== 'water') continue;

        // Two shimmering highlights per tile, offset by tile position
        const cx = tx * tileSize + tileSize / 2;
        const cy = ty * tileSize + tileSize / 2;

        const phase1 = this.waterPhase * 1.5 + tx * 0.7 + ty * 1.3;
        const phase2 = this.waterPhase * 2.0 + tx * 1.1 + ty * 0.5;

        const alpha1 = 0.05 + Math.sin(phase1) * 0.05;
        const alpha2 = 0.04 + Math.sin(phase2) * 0.04;

        if (alpha1 > 0.02) {
          const ox = Math.sin(phase1 * 0.7) * 6;
          const oy = Math.cos(phase1 * 0.9) * 4;
          this.graphics.fillStyle(0x88ddff, alpha1);
          this.graphics.fillRect(cx + ox - 3, cy + oy - 1, 6, 2);
        }
        if (alpha2 > 0.02) {
          const ox = Math.cos(phase2 * 0.6) * 8;
          const oy = Math.sin(phase2 * 1.1) * 5;
          this.graphics.fillStyle(0xaaeeff, alpha2);
          this.graphics.fillRect(cx + ox - 2, cy + oy - 1, 4, 2);
        }
      }
    }
  }

  // -------------------------------------------------------------------
  // 8. Resource sparkle
  // -------------------------------------------------------------------
  private updateResourceSparkle(entity: EntityData, dt: number): void {
    const isGold = entity.key === 'gold' || entity.key === 'goldMine';
    const isStone = entity.key === 'stone' || entity.key === 'stoneMine';
    if (!isGold && !isStone) return;

    let cd = this.sparkleCooldowns.get(entity.id) ?? 0;
    cd -= dt;
    if (cd <= 0) {
      if (this.particles.length < MAX_PARTICLES) {
        const color = isGold ? 0xffdd44 : 0xcccccc;
        const kind = isGold ? 'sparkle' as const : 'glint' as const;
        this.particles.push({
          x: entity.x + (Math.random() - 0.5) * 16,
          y: entity.y + (Math.random() - 0.5) * 12,
          vx: 0,
          vy: -6 - Math.random() * 4,
          life: 0.3 + Math.random() * 0.3,
          maxLife: 0.6,
          color,
          size: 1.5 + Math.random(),
          kind,
        });
      }
      cd = 1.0 + Math.random() * 2.0;
    }
    this.sparkleCooldowns.set(entity.id, cd);
  }

  // -------------------------------------------------------------------
  // 9. Selection ring (dashed, animated, colored)
  // -------------------------------------------------------------------
  private drawSelectionRings(): void {
    const dashLen = 4;
    const gapLen = 4;
    const segments = 32;

    for (const id of this.selection.selected) {
      const entity = this.world.entities.get(id);
      if (!entity || entity.state === 'dead') continue;

      // Determine ring color
      let color: number;
      if (entity.owner === 0) {
        color = 0x44ff44; // own: green
      } else if (entity.owner < 0) {
        color = 0xffff44; // neutral: yellow
      } else {
        color = 0xff4444; // enemy: red
      }

      // Determine radius based on entity type
      let radius: number;
      if (entity.type === 'building') {
        const cfg = (ALL_BUILDINGS[entity.key] ?? BUILDINGS[entity.key]) as BuildingConfig | undefined;
        radius = cfg ? cfg.size * 16 + 4 : 20;
      } else {
        radius = 14;
      }

      // Draw dashed ring with rotation
      this.graphics.lineStyle(1.5, color, 0.9);
      const totalAngle = Math.PI * 2;
      const segAngle = totalAngle / segments;

      for (let i = 0; i < segments; i++) {
        // Alternating dash/gap
        if (i % 2 !== 0) continue;

        const a1 = this.ringAngle + i * segAngle;
        const a2 = a1 + segAngle * 0.8; // slightly shorter than full segment

        const steps = 6;
        const pts: { x: number; y: number }[] = [];
        for (let s = 0; s <= steps; s++) {
          const a = a1 + (a2 - a1) * (s / steps);
          pts.push({
            x: entity.x + Math.cos(a) * radius,
            y: entity.y + Math.sin(a) * radius,
          });
        }

        for (let s = 0; s < pts.length - 1; s++) {
          this.graphics.lineBetween(pts[s].x, pts[s].y, pts[s + 1].x, pts[s + 1].y);
        }
      }
    }
  }

  // -------------------------------------------------------------------
  // Particle system
  // -------------------------------------------------------------------
  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;

      // Smoke drifts and grows
      if (p.kind === 'smoke') {
        p.size += dt * 1.5;
      }

      if (p.life <= 0) {
        // Swap-remove
        this.particles[i] = this.particles[this.particles.length - 1];
        this.particles.pop();
      }
    }
  }

  private drawParticles(): void {
    const cam = this.scene.cameras.main;
    const vx = cam.worldView.x - 32;
    const vy = cam.worldView.y - 32;
    const vr = vx + cam.worldView.width + 64;
    const vb = vy + cam.worldView.height + 64;

    for (const p of this.particles) {
      if (p.x < vx || p.x > vr || p.y < vy || p.y > vb) continue;

      const alpha = Math.max(0, p.life / p.maxLife);

      if (p.kind === 'sparkle' || p.kind === 'glint') {
        // Star-like: bright center, cross pattern
        this.graphics.fillStyle(p.color, alpha);
        const hs = p.size * 0.5;
        this.graphics.fillRect(p.x - hs, p.y - hs, p.size, p.size);
        // Cross arms
        this.graphics.fillStyle(p.color, alpha * 0.5);
        this.graphics.fillRect(p.x - p.size, p.y - 0.5, p.size * 2, 1);
        this.graphics.fillRect(p.x - 0.5, p.y - p.size, 1, p.size * 2);
      } else {
        this.graphics.fillStyle(p.color, alpha);
        if (p.size <= 2) {
          this.graphics.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        } else {
          this.graphics.fillCircle(p.x, p.y, p.size / 2);
        }
      }
    }
  }

  // -------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------
  destroy(): void {
    this.graphics.destroy();
    this.particles.length = 0;
    this.attackFlashTimers.clear();
    this.smokeCooldowns.clear();
    this.sparkleCooldowns.clear();
  }
}
