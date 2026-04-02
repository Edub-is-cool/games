import Phaser from 'phaser';
import { generateDefenseTextures } from '../config/defenses';
import { SoundManager } from '../systems/SoundManager';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    this.generateUnitTextures();
    this.generateAgeUnitTextures();
    this.generateBuildingTextures();
    this.generateAgeBuildingTextures();
    this.generateResourceTextures();

    generateDefenseTextures(this);

    // Procedural sound generation
    SoundManager.generateSounds(this);

    // Fallbacks
    this.makeRect('pixel', 1, 1, 0xffffff);
  }

  create() {
    this.scene.start('MenuScene');
  }

  private generateUnitTextures() {
    // Villager — small person shape
    this.makeTexture('unit_villager', 16, 20, (g) => {
      // Body
      g.fillStyle(0x88cc44, 1);
      g.fillRect(4, 8, 8, 10);
      // Head
      g.fillStyle(0xddbb88, 1);
      g.fillCircle(8, 5, 4);
      // Legs
      g.fillStyle(0x557733, 1);
      g.fillRect(4, 16, 3, 4);
      g.fillRect(9, 16, 3, 4);
    });

    // Settler — person with cart/pack
    this.makeTexture('unit_settler', 20, 22, (g) => {
      // Cart
      g.fillStyle(0x886644, 1);
      g.fillRect(2, 12, 12, 8);
      g.fillStyle(0x664422, 1);
      g.strokeCircle(5, 20, 3);
      g.strokeCircle(11, 20, 3);
      // Person
      g.fillStyle(0xdddd88, 1);
      g.fillRect(12, 6, 6, 8);
      g.fillStyle(0xddbb88, 1);
      g.fillCircle(15, 4, 3);
      // Flag
      g.fillStyle(0x666666, 1);
      g.fillRect(4, 4, 2, 10);
      g.fillStyle(0xffcc44, 1);
      g.fillTriangle(6, 4, 12, 7, 6, 10);
    });

    // Scout — fast runner
    this.makeTexture('unit_scout', 16, 20, (g) => {
      g.fillStyle(0xaacc88, 1);
      g.fillRect(4, 8, 8, 8);
      g.fillStyle(0xddbb88, 1);
      g.fillCircle(8, 5, 3);
      g.fillStyle(0x88aa66, 1);
      g.fillRect(3, 14, 4, 6);
      g.fillRect(9, 14, 4, 6);
      // Running pose offset
      g.fillStyle(0xaacc88, 1);
      g.fillRect(1, 10, 3, 4);
      g.fillRect(12, 8, 3, 4);
    });

    // Spy — cloaked figure
    this.makeTexture('unit_spy', 16, 20, (g) => {
      // Dark cloak
      g.fillStyle(0x666688, 1);
      g.fillTriangle(2, 18, 8, 4, 14, 18);
      // Face
      g.fillStyle(0xddbb88, 0.8);
      g.fillCircle(8, 6, 3);
      // Hood
      g.fillStyle(0x555577, 1);
      g.fillTriangle(4, 7, 8, 2, 12, 7);
      // Dagger
      g.fillStyle(0xcccccc, 1);
      g.fillRect(12, 10, 1, 6);
    });

    // Militia — person with sword
    this.makeTexture('unit_militia', 20, 20, (g) => {
      // Body (armored)
      g.fillStyle(0xcc4444, 1);
      g.fillRect(6, 8, 8, 10);
      // Head with helmet
      g.fillStyle(0x888888, 1);
      g.fillCircle(10, 5, 4);
      g.fillRect(7, 0, 6, 3); // helmet crest
      // Legs
      g.fillStyle(0x882222, 1);
      g.fillRect(6, 16, 3, 4);
      g.fillRect(11, 16, 3, 4);
      // Sword
      g.fillStyle(0xcccccc, 1);
      g.fillRect(16, 4, 2, 12);
      g.fillStyle(0x886644, 1);
      g.fillRect(15, 12, 4, 2); // hilt
    });

    // Archer — person with bow
    this.makeTexture('unit_archer', 20, 20, (g) => {
      // Body
      g.fillStyle(0x44aacc, 1);
      g.fillRect(6, 8, 8, 10);
      // Head
      g.fillStyle(0xddbb88, 1);
      g.fillCircle(10, 5, 4);
      // Hood
      g.fillStyle(0x338899, 1);
      g.fillTriangle(6, 4, 10, 0, 14, 4);
      // Legs
      g.fillStyle(0x337788, 1);
      g.fillRect(6, 16, 3, 4);
      g.fillRect(11, 16, 3, 4);
      // Bow
      g.lineStyle(2, 0x886644);
      g.beginPath();
      g.arc(18, 10, 7, -1.2, 1.2);
      g.strokePath();
      g.lineStyle(1, 0xcccccc);
      g.lineBetween(18, 3, 18, 17); // bowstring
    });

    // Knight — armored rider shape
    this.makeTexture('unit_knight', 22, 22, (g) => {
      // Horse body
      g.fillStyle(0x8B4513, 1);
      g.fillRect(2, 12, 18, 6);
      // Horse head
      g.fillStyle(0x6B3410, 1);
      g.fillRect(17, 8, 4, 6);
      // Horse legs
      g.fillStyle(0x5a2d0c, 1);
      g.fillRect(3, 18, 2, 4);
      g.fillRect(8, 18, 2, 4);
      g.fillRect(13, 18, 2, 4);
      g.fillRect(17, 18, 2, 4);
      // Rider body
      g.fillStyle(0xcccc44, 1);
      g.fillRect(7, 4, 8, 8);
      // Rider head (helmet)
      g.fillStyle(0xaaaaaa, 1);
      g.fillCircle(11, 3, 3);
      // Lance
      g.fillStyle(0xcccccc, 1);
      g.fillRect(18, 0, 2, 10);
    });
  }

  private generateBuildingTextures() {
    // Town Center — large building with flag
    this.makeTexture('building_townCenter', 48, 48, (g) => {
      // Base
      g.fillStyle(0xddaa44, 1);
      g.fillRect(4, 16, 40, 28);
      // Roof
      g.fillStyle(0xaa7722, 1);
      g.fillTriangle(0, 18, 24, 2, 48, 18);
      // Door
      g.fillStyle(0x553311, 1);
      g.fillRect(18, 30, 12, 14);
      // Windows
      g.fillStyle(0x88ccff, 1);
      g.fillRect(8, 24, 6, 6);
      g.fillRect(34, 24, 6, 6);
      // Flag pole
      g.fillStyle(0x666666, 1);
      g.fillRect(36, 0, 2, 18);
      g.fillStyle(0xff4444, 1);
      g.fillTriangle(38, 2, 46, 5, 38, 8);
    });

    // Barracks — military building
    this.makeTexture('building_barracks', 40, 36, (g) => {
      // Base
      g.fillStyle(0xaa4444, 1);
      g.fillRect(2, 12, 36, 22);
      // Roof
      g.fillStyle(0x882222, 1);
      g.fillRect(0, 8, 40, 6);
      // Crenellations
      for (let i = 0; i < 5; i++) {
        g.fillRect(i * 8 + 1, 4, 5, 5);
      }
      // Door
      g.fillStyle(0x553333, 1);
      g.fillRect(14, 22, 12, 12);
      // Swords crossed emblem
      g.lineStyle(2, 0xcccccc);
      g.lineBetween(16, 14, 24, 20);
      g.lineBetween(24, 14, 16, 20);
    });

    // Archery Range — open structure
    this.makeTexture('building_archeryRange', 40, 36, (g) => {
      // Base platform
      g.fillStyle(0x4488aa, 1);
      g.fillRect(2, 20, 36, 14);
      // Pillars
      g.fillStyle(0x337799, 1);
      g.fillRect(4, 8, 4, 14);
      g.fillRect(32, 8, 4, 14);
      // Roof beam
      g.fillStyle(0x2a6688, 1);
      g.fillRect(2, 6, 36, 4);
      // Target
      g.fillStyle(0xffffff, 1);
      g.fillCircle(20, 16, 5);
      g.fillStyle(0xff4444, 1);
      g.fillCircle(20, 16, 3);
      g.fillStyle(0xffff00, 1);
      g.fillCircle(20, 16, 1);
    });

    // House — small dwelling
    this.makeTexture('building_house', 24, 24, (g) => {
      // Walls
      g.fillStyle(0x886644, 1);
      g.fillRect(2, 10, 20, 12);
      // Roof
      g.fillStyle(0xaa5533, 1);
      g.fillTriangle(0, 12, 12, 2, 24, 12);
      // Door
      g.fillStyle(0x553311, 1);
      g.fillRect(8, 15, 8, 7);
      // Window
      g.fillStyle(0x88ccff, 1);
      g.fillRect(17, 13, 4, 4);
    });
  }

  private generateResourceTextures() {
    // Tree (wood)
    this.makeTexture('resource_wood', 20, 24, (g) => {
      // Trunk
      g.fillStyle(0x6B3410, 1);
      g.fillRect(8, 14, 4, 10);
      // Foliage layers
      g.fillStyle(0x1a7a1a, 1);
      g.fillCircle(10, 8, 8);
      g.fillStyle(0x228822, 1);
      g.fillCircle(10, 6, 6);
      g.fillStyle(0x2a9a2a, 1);
      g.fillCircle(10, 5, 4);
    });

    // Gold mine
    this.makeTexture('resource_gold', 20, 18, (g) => {
      // Rock base
      g.fillStyle(0x666666, 1);
      g.fillTriangle(2, 18, 10, 4, 18, 18);
      // Gold veins
      g.fillStyle(0xffd700, 1);
      g.fillRect(7, 10, 3, 3);
      g.fillRect(11, 13, 3, 2);
      g.fillRect(6, 14, 2, 2);
      // Sparkle
      g.fillStyle(0xffff88, 1);
      g.fillRect(9, 7, 2, 2);
    });

    // Stone quarry
    this.makeTexture('resource_stone', 20, 16, (g) => {
      // Rocks
      g.fillStyle(0x888888, 1);
      g.fillRect(2, 8, 8, 8);
      g.fillStyle(0x999999, 1);
      g.fillRect(8, 6, 10, 10);
      g.fillStyle(0x777777, 1);
      g.fillRect(4, 4, 6, 6);
      // Cracks
      g.lineStyle(1, 0x555555);
      g.lineBetween(6, 5, 8, 10);
      g.lineBetween(12, 7, 14, 14);
    });

    // Berry bush (food)
    this.makeTexture('resource_food', 20, 18, (g) => {
      // Bush
      g.fillStyle(0x2d7a1e, 1);
      g.fillCircle(10, 12, 8);
      g.fillStyle(0x3a8a2a, 1);
      g.fillCircle(10, 10, 6);
      // Berries
      g.fillStyle(0xff4444, 1);
      g.fillCircle(6, 10, 2);
      g.fillCircle(13, 9, 2);
      g.fillCircle(10, 13, 2);
      g.fillCircle(8, 7, 2);
      g.fillCircle(14, 12, 2);
    });
  }

  private generateAgeUnitTextures() {
    // Spearman — person with long spear
    // Crossbowman — person with crossbow
    this.makeTexture('unit_crossbowman', 20, 20, (g) => {
      g.fillStyle(0x5588aa, 1);
      g.fillRect(6, 8, 8, 10);
      g.fillStyle(0xddbb88, 1);
      g.fillCircle(10, 5, 4);
      g.fillStyle(0x447788, 1);
      g.fillRect(6, 16, 3, 4);
      g.fillRect(11, 16, 3, 4);
      // Crossbow
      g.fillStyle(0x886644, 1);
      g.fillRect(14, 8, 6, 3); // stock
      g.lineStyle(2, 0x886644);
      g.lineBetween(15, 6, 15, 12); // bow arms
      g.lineStyle(1, 0xcccccc);
      g.lineBetween(15, 6, 15, 12); // string
    });

    this.makeTexture('unit_spearman', 20, 22, (g) => {
      g.fillStyle(0x66aa66, 1); g.fillRect(6, 8, 8, 10);
      g.fillStyle(0xddbb88, 1); g.fillCircle(10, 5, 4);
      g.fillStyle(0x448844, 1); g.fillRect(6, 16, 3, 4); g.fillRect(11, 16, 3, 4);
      g.fillStyle(0x886644, 1); g.fillRect(17, 0, 2, 18);
      g.fillStyle(0xaaaaaa, 1); g.fillTriangle(17, 0, 19, 0, 18, -3);
    });

    // Chariot — wheeled vehicle
    this.makeTexture('unit_chariot', 26, 20, (g) => {
      g.fillStyle(0xddaa66, 1); g.fillRect(4, 6, 16, 8);
      g.fillStyle(0x886633, 1); g.strokeCircle(6, 16, 4); g.strokeCircle(18, 16, 4);
      g.fillStyle(0xddbb88, 1); g.fillCircle(12, 4, 3);
      g.fillStyle(0xcccccc, 1); g.fillRect(20, 4, 2, 8);
    });

    // Swordsman — heavy infantry
    this.makeTexture('unit_swordsman', 20, 20, (g) => {
      g.fillStyle(0xbb5555, 1); g.fillRect(6, 8, 8, 10);
      g.fillStyle(0x888888, 1); g.fillCircle(10, 5, 4);
      g.fillStyle(0x993333, 1); g.fillRect(6, 16, 3, 4); g.fillRect(11, 16, 3, 4);
      g.fillStyle(0xcccccc, 1); g.fillRect(16, 2, 2, 14);
      g.fillStyle(0xaaaaaa, 1); g.fillRect(2, 8, 4, 8); // shield
    });

    // Catapult — siege engine
    this.makeTexture('unit_catapult', 28, 22, (g) => {
      g.fillStyle(0x886633, 1); g.fillRect(4, 12, 20, 6);
      g.fillStyle(0x664422, 1); g.fillRect(6, 18, 3, 4); g.fillRect(19, 18, 3, 4);
      g.fillStyle(0x886633, 1); g.fillRect(12, 2, 3, 12);
      g.fillStyle(0x555544, 1); g.fillCircle(14, 2, 3);
    });

    // Musketeer — soldier with musket
    this.makeTexture('unit_musketeer', 20, 20, (g) => {
      g.fillStyle(0x3377bb, 1); g.fillRect(6, 8, 8, 10);
      g.fillStyle(0xddbb88, 1); g.fillCircle(10, 5, 4);
      g.fillStyle(0x225588, 1); g.fillRect(6, 16, 3, 4); g.fillRect(11, 16, 3, 4);
      g.fillStyle(0x555555, 1); g.fillRect(16, 2, 2, 16); // musket barrel
      g.fillStyle(0x886644, 1); g.fillRect(15, 10, 4, 4); // stock
    });

    // Cannon — wheeled cannon
    this.makeTexture('unit_cannon', 28, 18, (g) => {
      g.fillStyle(0x444444, 1); g.fillRect(4, 6, 18, 6);
      g.fillStyle(0x333333, 1); g.fillCircle(22, 8, 3);
      g.fillStyle(0x886644, 1); g.strokeCircle(8, 14, 3); g.strokeCircle(18, 14, 3);
    });

    // Lancer — fast cavalry
    this.makeTexture('unit_lancer', 22, 22, (g) => {
      g.fillStyle(0x8B4513, 1); g.fillRect(2, 12, 16, 6);
      g.fillStyle(0x6B3410, 1); g.fillRect(15, 8, 4, 6);
      g.fillStyle(0x5a2d0c, 1);
      g.fillRect(3, 18, 2, 4); g.fillRect(8, 18, 2, 4);
      g.fillRect(13, 18, 2, 4); g.fillRect(15, 18, 2, 4);
      g.fillStyle(0xee8833, 1); g.fillRect(6, 4, 8, 8);
      g.fillStyle(0xaaaaaa, 1); g.fillCircle(10, 3, 3);
      g.fillStyle(0xcccccc, 1); g.fillRect(18, 0, 2, 12);
    });

    // Rifleman — modern soldier
    this.makeTexture('unit_rifleman', 18, 20, (g) => {
      g.fillStyle(0x336644, 1); g.fillRect(5, 8, 8, 10);
      g.fillStyle(0x336644, 1); g.fillCircle(9, 5, 4); // helmet
      g.fillStyle(0x224433, 1); g.fillRect(5, 16, 3, 4); g.fillRect(10, 16, 3, 4);
      g.fillStyle(0x333333, 1); g.fillRect(14, 4, 2, 12);
    });

    // Tank — armored vehicle
    this.makeTexture('unit_tank', 28, 20, (g) => {
      g.fillStyle(0x556b2f, 1); g.fillRect(2, 10, 24, 8);
      g.fillStyle(0x4a5a28, 1); g.fillRect(8, 4, 12, 8); // turret
      g.fillStyle(0x444444, 1); g.fillRect(18, 6, 10, 3); // barrel
      g.fillStyle(0x3a4a1e, 1); g.fillRect(2, 16, 24, 4); // tracks
    });

    // Artillery — large gun
    this.makeTexture('unit_artillery', 28, 20, (g) => {
      g.fillStyle(0x8b7355, 1); g.fillRect(4, 10, 16, 6);
      g.fillStyle(0x555555, 1); g.fillRect(8, 4, 4, 10); // barrel mount
      g.fillStyle(0x444444, 1); g.fillRect(6, 2, 18, 3); // barrel
      g.fillStyle(0x776644, 1); g.strokeCircle(8, 16, 3); g.strokeCircle(16, 16, 3);
    });
  }

  private generateAgeBuildingTextures() {
    // Stable
    this.makeTexture('building_stable', 40, 32, (g) => {
      g.fillStyle(0x997744, 1); g.fillRect(2, 10, 36, 20);
      g.fillStyle(0x886633, 1); g.fillRect(0, 6, 40, 6);
      g.fillStyle(0x664422, 1); g.fillRect(14, 18, 12, 12);
      g.fillStyle(0xddbb88, 1); g.fillRect(6, 14, 6, 4);
    });

    // Watchtower
    this.makeTexture('building_watchtower', 20, 36, (g) => {
      g.fillStyle(0x888899, 1); g.fillRect(4, 8, 12, 26);
      g.fillStyle(0x666677, 1);
      for (let i = 0; i < 3; i++) g.fillRect(2 + i * 6, 4, 4, 5);
      g.fillStyle(0x88ccff, 1); g.fillRect(7, 14, 6, 4);
    });

    // Market
    this.makeTexture('building_market', 40, 32, (g) => {
      g.fillStyle(0xccaa55, 1); g.fillRect(2, 14, 36, 16);
      g.fillStyle(0xaa8833, 1); g.fillTriangle(0, 16, 20, 4, 40, 16);
      g.fillStyle(0xff4444, 1); g.fillRect(6, 18, 8, 6);
      g.fillStyle(0x4444ff, 1); g.fillRect(16, 18, 8, 6);
      g.fillStyle(0x44ff44, 1); g.fillRect(26, 18, 8, 6);
    });

    // Castle
    this.makeTexture('building_castle', 48, 48, (g) => {
      g.fillStyle(0x777799, 1); g.fillRect(4, 16, 40, 28);
      g.fillStyle(0x666688, 1);
      for (let i = 0; i < 6; i++) g.fillRect(3 + i * 8, 10, 5, 8);
      g.fillStyle(0x555577, 1);
      g.fillRect(2, 16, 8, 32); g.fillRect(38, 16, 8, 32);
      for (let i = 0; i < 3; i++) { g.fillRect(i * 3, 8, 2, 4); g.fillRect(40 + i * 3, 8, 2, 4); }
      g.fillStyle(0x443322, 1); g.fillRect(18, 28, 12, 16);
    });

    // Siege Workshop
    this.makeTexture('building_siege_workshop', 40, 32, (g) => {
      g.fillStyle(0x665544, 1); g.fillRect(2, 12, 36, 18);
      g.fillStyle(0x554433, 1); g.fillRect(0, 8, 40, 6);
      g.fillStyle(0x443322, 1); g.fillRect(10, 18, 20, 12);
      g.fillStyle(0x886644, 1); g.fillRect(16, 14, 8, 4);
    });

    // Blacksmith
    this.makeTexture('building_blacksmith', 36, 32, (g) => {
      g.fillStyle(0x555566, 1); g.fillRect(2, 12, 32, 18);
      g.fillStyle(0x444455, 1); g.fillRect(0, 8, 36, 6);
      g.fillStyle(0xff6622, 1); g.fillCircle(18, 20, 4); // forge glow
      g.fillStyle(0x443322, 1); g.fillRect(12, 22, 12, 8);
    });

    // Fort
    this.makeTexture('building_fort', 48, 44, (g) => {
      g.fillStyle(0x556655, 1); g.fillRect(4, 14, 40, 28);
      g.fillStyle(0x445544, 1);
      for (let i = 0; i < 6; i++) g.fillRect(3 + i * 8, 8, 5, 8);
      g.fillStyle(0x334433, 1); g.fillRect(2, 14, 6, 28); g.fillRect(40, 14, 6, 28);
      g.fillStyle(0x443322, 1); g.fillRect(18, 28, 12, 14);
      g.fillStyle(0x666666, 1); g.fillRect(30, 18, 8, 4);
    });

    // Gunsmith
    this.makeTexture('building_gunsmith', 36, 32, (g) => {
      g.fillStyle(0x664433, 1); g.fillRect(2, 12, 32, 18);
      g.fillStyle(0x553322, 1); g.fillRect(0, 8, 36, 6);
      g.fillStyle(0x888888, 1); g.fillRect(14, 16, 8, 12); // anvil area
      g.fillStyle(0xff4400, 1); g.fillCircle(18, 20, 3);
    });

    // University
    this.makeTexture('building_university', 40, 36, (g) => {
      g.fillStyle(0x4455aa, 1); g.fillRect(4, 14, 32, 20);
      g.fillStyle(0x3344aa, 1); g.fillTriangle(2, 16, 20, 4, 38, 16);
      g.fillStyle(0x88ccff, 1); g.fillCircle(20, 10, 3); // window
      g.fillStyle(0x333388, 1); g.fillRect(16, 22, 8, 12);
      g.fillStyle(0x333388, 1); g.fillRect(4, 18, 4, 16); g.fillRect(32, 18, 4, 16);
    });

    // Factory
    this.makeTexture('building_factory', 48, 40, (g) => {
      g.fillStyle(0x708090, 1); g.fillRect(2, 16, 44, 22);
      g.fillStyle(0x606878, 1); g.fillRect(0, 12, 48, 6);
      g.fillStyle(0x555555, 1); g.fillRect(38, 2, 6, 14); // chimney
      g.fillStyle(0x888888, 1); g.fillCircle(41, 2, 4); // smoke
      g.fillStyle(0x443322, 1); g.fillRect(18, 24, 12, 14);
      g.fillStyle(0x88ccff, 1);
      g.fillRect(6, 20, 6, 4); g.fillRect(36, 20, 6, 4);
    });

    // Bunker
    this.makeTexture('building_bunker', 36, 24, (g) => {
      g.fillStyle(0x4a5548, 1); g.fillRect(2, 8, 32, 14);
      g.fillStyle(0x3a4538, 1); g.fillRect(0, 6, 36, 4);
      g.fillStyle(0x222222, 1); g.fillRect(6, 12, 8, 4); // gun slit
      g.fillRect(22, 12, 8, 4);
      g.fillStyle(0x333333, 1); g.fillRect(14, 14, 8, 8); // door
    });

    // Command Center
    this.makeTexture('building_command_center', 48, 44, (g) => {
      g.fillStyle(0x2f4f6f, 1); g.fillRect(4, 16, 40, 26);
      g.fillStyle(0x1f3f5f, 1); g.fillRect(2, 12, 44, 6);
      g.fillStyle(0x555555, 1); g.fillRect(34, 4, 4, 12); // antenna
      g.fillStyle(0xff2222, 1); g.fillCircle(36, 4, 2); // light
      g.fillStyle(0x88ccff, 1);
      g.fillRect(8, 20, 8, 6); g.fillRect(32, 20, 8, 6);
      g.fillStyle(0x333344, 1); g.fillRect(18, 28, 12, 14);
    });
    // Wonder — grand monument
    this.makeTexture('building_wonder', 56, 56, (g) => {
      // Base platform
      g.fillStyle(0xccaa44, 1);
      g.fillRect(4, 40, 48, 12);
      // Pillars
      g.fillStyle(0xddcc66, 1);
      g.fillRect(8, 12, 6, 30);
      g.fillRect(22, 12, 6, 30);
      g.fillRect(36, 12, 6, 30);
      // Roof
      g.fillStyle(0xeedd77, 1);
      g.fillTriangle(2, 14, 28, 0, 54, 14);
      // Gold dome
      g.fillStyle(0xffd700, 1);
      g.fillCircle(28, 6, 6);
      // Sparkles
      g.fillStyle(0xffffff, 0.8);
      g.fillRect(28, 0, 2, 2);
      g.fillRect(20, 4, 2, 2);
      g.fillRect(36, 4, 2, 2);
    });
  }

  private makeTexture(key: string, w: number, h: number, draw: (g: Phaser.GameObjects.Graphics) => void) {
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeRect(key: string, w: number, h: number, color: number) {
    this.makeTexture(key, w, h, (g) => {
      g.fillStyle(color, 1);
      g.fillRect(0, 0, w, h);
    });
  }
}
