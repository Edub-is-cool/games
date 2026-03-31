import { BuildingConfig } from './buildings';

export interface DefenseConfig extends BuildingConfig {
  isDefense: true;
  attackDamage: number;    // 0 for walls
  attackRange: number;     // 0 for walls
  attackSpeed: number;     // 0 for walls
  isWall: boolean;         // for wall placement logic
  isGate: boolean;         // for gate logic
  ageRequired: number;     // 1-5
}

export const DEFENSES: Record<string, DefenseConfig> = {
  palisade_wall: {
    name: 'Palisade Wall',
    hp: 100,
    armor: 1,
    cost: { food: 0, wood: 15, gold: 0, stone: 0 },
    buildTime: 8,
    size: 1,
    produces: [],
    color: 0x8b6b3d,
    isDefense: true,
    attackDamage: 0,
    attackRange: 0,
    attackSpeed: 0,
    isWall: true,
    isGate: false,
    ageRequired: 1,
  },
  stone_wall: {
    name: 'Stone Wall',
    hp: 500,
    armor: 8,
    cost: { food: 0, wood: 0, gold: 0, stone: 5 },
    buildTime: 12,
    size: 1,
    produces: [],
    color: 0x888888,
    isDefense: true,
    attackDamage: 0,
    attackRange: 0,
    attackSpeed: 0,
    isWall: true,
    isGate: false,
    ageRequired: 2,
  },
  gate: {
    name: 'Gate',
    hp: 500,
    armor: 8,
    cost: { food: 0, wood: 0, gold: 0, stone: 5 },
    buildTime: 20,
    size: 1,
    produces: [],
    color: 0x8888aa,
    isDefense: true,
    attackDamage: 0,
    attackRange: 0,
    attackSpeed: 0,
    isWall: true,
    isGate: true,
    ageRequired: 2,
  },
  outpost: {
    name: 'Outpost',
    hp: 150,
    armor: 2,
    cost: { food: 0, wood: 25, gold: 0, stone: 5 },
    buildTime: 15,
    size: 1,
    produces: [],
    color: 0x99886e,
    isDefense: true,
    attackDamage: 0,
    attackRange: 0,
    attackSpeed: 0,
    isWall: false,
    isGate: false,
    ageRequired: 1,
  },
  guard_tower: {
    name: 'Guard Tower',
    hp: 400,
    armor: 5,
    cost: { food: 0, wood: 50, gold: 25, stone: 75 },
    buildTime: 40,
    size: 1,
    produces: [],
    color: 0x7788aa,
    isDefense: true,
    attackDamage: 10,
    attackRange: 120,
    attackSpeed: 1.2,
    isWall: false,
    isGate: false,
    ageRequired: 2,
  },
  keep: {
    name: 'Keep',
    hp: 700,
    armor: 8,
    cost: { food: 0, wood: 100, gold: 75, stone: 200 },
    buildTime: 60,
    size: 2,
    produces: [],
    color: 0x667799,
    isDefense: true,
    attackDamage: 18,
    attackRange: 150,
    attackSpeed: 1.0,
    isWall: false,
    isGate: false,
    ageRequired: 3,
  },
  bombard_tower: {
    name: 'Bombard Tower',
    hp: 600,
    armor: 6,
    cost: { food: 0, wood: 75, gold: 150, stone: 250 },
    buildTime: 70,
    size: 2,
    produces: [],
    color: 0x556677,
    isDefense: true,
    attackDamage: 35,
    attackRange: 180,
    attackSpeed: 0.4,
    isWall: false,
    isGate: false,
    ageRequired: 4,
  },
  fortress_wall: {
    name: 'Fortress Wall',
    hp: 1200,
    armor: 14,
    cost: { food: 0, wood: 0, gold: 0, stone: 15 },
    buildTime: 18,
    size: 1,
    produces: [],
    color: 0x666677,
    isDefense: true,
    attackDamage: 0,
    attackRange: 0,
    attackSpeed: 0,
    isWall: true,
    isGate: false,
    ageRequired: 4,
  },
  spike_trap: {
    name: 'Spike Trap',
    hp: 25,
    armor: 0,
    cost: { food: 0, wood: 20, gold: 0, stone: 0 },
    buildTime: 10,
    size: 1,
    produces: [],
    color: 0x554433,
    isDefense: true,
    attackDamage: 30,
    attackRange: 0,
    attackSpeed: 0,
    isWall: false,
    isGate: false,
    ageRequired: 1,
  },
};

/**
 * Returns all defense keys available at the given age (1-indexed).
 * Includes defenses from the specified age and all earlier ages.
 */
export function getDefensesForAge(age: number): string[] {
  const clamped = Math.max(1, Math.min(age, 5));
  return Object.keys(DEFENSES).filter(
    (key) => DEFENSES[key].ageRequired <= clamped,
  );
}

// ---------------------------------------------------------------------------
// Texture generation
// ---------------------------------------------------------------------------

/**
 * Generates placeholder textures for every defense structure.
 * Call this from BootScene (or any Phaser scene) during preload.
 *
 * Usage:
 *   import { generateDefenseTextures } from '../config/defenses';
 *   generateDefenseTextures(this);   // inside a Phaser.Scene
 */
export function generateDefenseTextures(scene: Phaser.Scene): void {
  const makeTexture = (
    key: string,
    w: number,
    h: number,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ) => {
    const g = scene.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  };

  // Palisade Wall — vertical wooden stakes
  makeTexture('building_palisade_wall', 20, 20, (g) => {
    g.fillStyle(0x8b6b3d, 1);
    g.fillRect(2, 2, 16, 16);
    // Vertical planks
    g.fillStyle(0x7a5c30, 1);
    for (let i = 0; i < 4; i++) {
      g.fillRect(3 + i * 4, 0, 3, 20);
    }
    // Pointed tops
    g.fillStyle(0x8b6b3d, 1);
    for (let i = 0; i < 4; i++) {
      g.fillTriangle(3 + i * 4, 2, 4 + i * 4, 0, 6 + i * 4, 2);
    }
  });

  // Stone Wall — grey stone blocks
  makeTexture('building_stone_wall', 20, 20, (g) => {
    g.fillStyle(0x888888, 1);
    g.fillRect(1, 2, 18, 16);
    // Mortar lines
    g.lineStyle(1, 0x666666);
    g.lineBetween(1, 8, 19, 8);
    g.lineBetween(1, 13, 19, 13);
    g.lineBetween(10, 2, 10, 8);
    g.lineBetween(6, 8, 6, 13);
    g.lineBetween(14, 8, 14, 13);
    g.lineBetween(10, 13, 10, 18);
    // Crenellations on top
    g.fillStyle(0x999999, 1);
    g.fillRect(1, 0, 5, 3);
    g.fillRect(8, 0, 5, 3);
    g.fillRect(15, 0, 5, 3);
  });

  // Gate — stone arch with wooden door
  makeTexture('building_gate', 24, 24, (g) => {
    // Stone frame
    g.fillStyle(0x8888aa, 1);
    g.fillRect(0, 0, 6, 24);
    g.fillRect(18, 0, 6, 24);
    g.fillRect(0, 0, 24, 6);
    // Arch top
    g.fillStyle(0x8888aa, 1);
    g.fillCircle(12, 8, 6);
    // Wooden door panels
    g.fillStyle(0x6b4226, 1);
    g.fillRect(6, 8, 12, 16);
    // Door line
    g.lineStyle(1, 0x553311);
    g.lineBetween(12, 8, 12, 24);
    // Door studs
    g.fillStyle(0xaaaaaa, 1);
    g.fillCircle(9, 16, 1);
    g.fillCircle(15, 16, 1);
  });

  // Outpost — small wooden lookout
  makeTexture('building_outpost', 18, 28, (g) => {
    // Support pole
    g.fillStyle(0x7a5c30, 1);
    g.fillRect(7, 8, 4, 20);
    // Platform
    g.fillStyle(0x99886e, 1);
    g.fillRect(2, 6, 14, 4);
    // Roof
    g.fillStyle(0x886644, 1);
    g.fillTriangle(0, 8, 9, 0, 18, 8);
    // Railing
    g.lineStyle(1, 0x7a5c30);
    g.lineBetween(2, 6, 2, 10);
    g.lineBetween(16, 6, 16, 10);
  });

  // Guard Tower — stone tower with arrow slit
  makeTexture('building_guard_tower', 22, 36, (g) => {
    // Tower body
    g.fillStyle(0x7788aa, 1);
    g.fillRect(3, 10, 16, 24);
    // Crenellations
    g.fillStyle(0x6677aa, 1);
    for (let i = 0; i < 3; i++) {
      g.fillRect(2 + i * 7, 5, 5, 6);
    }
    // Arrow slits
    g.fillStyle(0x222222, 1);
    g.fillRect(9, 16, 4, 8);
    g.fillRect(7, 19, 8, 2);
    // Base
    g.fillStyle(0x667799, 1);
    g.fillRect(1, 30, 20, 4);
  });

  // Keep — larger fortified tower
  makeTexture('building_keep', 36, 42, (g) => {
    // Main tower body
    g.fillStyle(0x667799, 1);
    g.fillRect(4, 12, 28, 28);
    // Crenellations
    g.fillStyle(0x556688, 1);
    for (let i = 0; i < 4; i++) {
      g.fillRect(3 + i * 8, 6, 6, 8);
    }
    // Arrow slits
    g.fillStyle(0x222222, 1);
    g.fillRect(10, 18, 3, 8);
    g.fillRect(23, 18, 3, 8);
    // Banner
    g.fillStyle(0x666666, 1);
    g.fillRect(17, 0, 2, 12);
    g.fillStyle(0xff4444, 1);
    g.fillTriangle(19, 2, 27, 5, 19, 8);
    // Door
    g.fillStyle(0x443322, 1);
    g.fillRect(13, 30, 10, 10);
    // Base
    g.fillStyle(0x556688, 1);
    g.fillRect(2, 36, 32, 4);
  });

  // Bombard Tower — thick tower with cannon port
  makeTexture('building_bombard_tower', 36, 40, (g) => {
    // Tower body
    g.fillStyle(0x556677, 1);
    g.fillRect(4, 10, 28, 28);
    // Reinforced top
    g.fillStyle(0x445566, 1);
    g.fillRect(2, 6, 32, 6);
    // Cannon ports
    g.fillStyle(0x222222, 1);
    g.fillCircle(12, 22, 4);
    g.fillCircle(24, 22, 4);
    // Cannon barrels poking out
    g.fillStyle(0x333333, 1);
    g.fillRect(8, 20, 4, 4);
    g.fillRect(20, 20, 4, 4);
    // Smoke wisps
    g.fillStyle(0xaaaaaa, 0.5);
    g.fillCircle(6, 20, 3);
    g.fillCircle(28, 20, 3);
    // Base
    g.fillStyle(0x445566, 1);
    g.fillRect(2, 34, 32, 4);
  });

  // Fortress Wall — very thick double-layered wall
  makeTexture('building_fortress_wall', 24, 24, (g) => {
    // Thick wall body
    g.fillStyle(0x666677, 1);
    g.fillRect(0, 4, 24, 18);
    // Stone block pattern
    g.lineStyle(1, 0x555566);
    g.lineBetween(0, 10, 24, 10);
    g.lineBetween(0, 16, 24, 16);
    g.lineBetween(8, 4, 8, 10);
    g.lineBetween(16, 4, 16, 10);
    g.lineBetween(4, 10, 4, 16);
    g.lineBetween(12, 10, 12, 16);
    g.lineBetween(20, 10, 20, 16);
    g.lineBetween(8, 16, 8, 22);
    g.lineBetween(16, 16, 16, 22);
    // Heavy crenellations
    g.fillStyle(0x777788, 1);
    g.fillRect(0, 0, 7, 5);
    g.fillRect(9, 0, 7, 5);
    g.fillRect(18, 0, 6, 5);
    // Metal reinforcement strip
    g.fillStyle(0x555555, 1);
    g.fillRect(0, 11, 24, 2);
  });

  // Spike Trap — hidden spikes on ground
  makeTexture('building_spike_trap', 20, 20, (g) => {
    // Ground patch
    g.fillStyle(0x554433, 1);
    g.fillRect(1, 1, 18, 18);
    // Dirt texture
    g.fillStyle(0x665544, 1);
    g.fillRect(3, 3, 14, 14);
    // Spike tips poking through
    g.fillStyle(0x888888, 1);
    g.fillTriangle(5, 10, 6, 5, 7, 10);
    g.fillTriangle(9, 10, 10, 4, 11, 10);
    g.fillTriangle(13, 10, 14, 5, 15, 10);
    g.fillTriangle(7, 16, 8, 11, 9, 16);
    g.fillTriangle(11, 16, 12, 11, 13, 16);
    // Metal glint
    g.fillStyle(0xaaaaaa, 1);
    g.fillRect(6, 5, 1, 1);
    g.fillRect(10, 4, 1, 1);
    g.fillRect(14, 5, 1, 1);
  });
}
