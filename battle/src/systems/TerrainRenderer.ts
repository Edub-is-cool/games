import Phaser from 'phaser';
import type { TerrainTile, TerrainType } from './MapGenerator';

export const TILE_SIZE = 32;

const TERRAIN_COLORS: Record<TerrainType, number[]> = {
  grass: [0x2d5a1e, 0x2e5c1f, 0x2c5820, 0x305e22],
  forest: [0x1a4a12, 0x1c4c14, 0x184810, 0x1e4e16],
  hill: [0x5a5a3e, 0x585840, 0x5c5c42, 0x56563c],
  water: [0x1a3a6e, 0x1c3c70, 0x183868, 0x1e3e72],
  desert: [0x8a7a3e, 0x8c7c40, 0x887838, 0x8e7e42],
  sand: [0x9a8a4e, 0x988848, 0x9c8c50, 0x968646],
};

export class TerrainRenderer {
  private graphics: Phaser.GameObjects.Graphics;

  constructor(private scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(-9);
  }

  renderTerrain(terrain: TerrainTile[][]) {
    this.graphics.clear();

    for (let row = 0; row < terrain.length; row++) {
      for (let col = 0; col < terrain[row].length; col++) {
        const type = terrain[row][col].type;
        const colors = TERRAIN_COLORS[type];
        // Slight variation per tile
        const colorIdx = (row * 7 + col * 13) % colors.length;
        const color = colors[colorIdx];

        const x = col * TILE_SIZE;
        const y = row * TILE_SIZE;

        this.graphics.fillStyle(color, 1);
        this.graphics.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Add small detail based on terrain type
        this.addTerrainDetail(x, y, type, row, col);
      }
    }
  }

  private addTerrainDetail(x: number, y: number, type: TerrainType, row: number, col: number) {
    const hash = (row * 31 + col * 17) % 100;

    switch (type) {
      case 'forest':
        // Small ground vegetation dots
        if (hash < 40) {
          this.graphics.fillStyle(0x224411, 0.6);
          this.graphics.fillCircle(x + 8 + (hash % 16), y + 8 + ((hash * 3) % 16), 2);
        }
        break;

      case 'hill':
        // Subtle rock specks
        if (hash < 30) {
          this.graphics.fillStyle(0x666650, 0.4);
          this.graphics.fillRect(x + (hash % 24), y + ((hash * 2) % 24), 3, 2);
        }
        break;

      case 'water':
        // Wave highlights
        if (hash < 25) {
          this.graphics.fillStyle(0x3366aa, 0.3);
          this.graphics.fillRect(x + (hash % 20) + 4, y + ((hash * 3) % 24), 6, 1);
        }
        break;

      case 'desert':
        // Sand ripples
        if (hash < 20) {
          this.graphics.lineStyle(1, 0x998844, 0.2);
          this.graphics.lineBetween(x + 2, y + (hash % 28), x + 28, y + (hash % 28) + 4);
        }
        break;

      case 'grass':
        // Tiny grass tufts
        if (hash < 15) {
          this.graphics.fillStyle(0x3a6a28, 0.3);
          this.graphics.fillRect(x + (hash % 26), y + ((hash * 5) % 26), 2, 3);
        }
        break;
    }
  }

  renderDecorations(decorations: { type: string; x: number; y: number }[]) {
    for (const dec of decorations) {
      switch (dec.type) {
        case 'tree':
          // Small tree
          this.graphics.fillStyle(0x4a3010, 1);
          this.graphics.fillRect(dec.x - 1, dec.y + 2, 3, 6);
          this.graphics.fillStyle(0x1a6a1a, 0.8);
          this.graphics.fillCircle(dec.x, dec.y - 2, 5);
          break;

        case 'rock':
          this.graphics.fillStyle(0x777766, 0.7);
          this.graphics.fillRect(dec.x - 3, dec.y - 2, 6, 4);
          break;

        case 'bush':
          this.graphics.fillStyle(0x2a7a1e, 0.6);
          this.graphics.fillCircle(dec.x, dec.y, 3);
          break;

        case 'cactus':
          this.graphics.fillStyle(0x3a8a2a, 0.7);
          this.graphics.fillRect(dec.x - 1, dec.y - 6, 3, 10);
          this.graphics.fillRect(dec.x - 4, dec.y - 3, 3, 5);
          this.graphics.fillRect(dec.x + 2, dec.y - 4, 3, 4);
          break;

        case 'flower':
          this.graphics.fillStyle(0xcc4466, 0.6);
          this.graphics.fillCircle(dec.x, dec.y, 2);
          this.graphics.fillStyle(0x3a7a2a, 0.5);
          this.graphics.fillRect(dec.x - 1, dec.y + 1, 2, 4);
          break;
      }
    }
  }

  isWalkable(terrain: TerrainType): boolean {
    return terrain !== 'water';
  }
}
