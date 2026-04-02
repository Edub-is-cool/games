import { Tile, MAP_WIDTH, MAP_HEIGHT, VISIBILITY_RADIUS } from '../utils/constants';

export enum VisState {
  HIDDEN = 0,
  EXPLORED = 1,
  VISIBLE = 2,
}

export class VisibilityMap {
  state: VisState[][];

  constructor() {
    this.state = [];
    for (let y = 0; y < MAP_HEIGHT; y++) {
      this.state[y] = [];
      for (let x = 0; x < MAP_WIDTH; x++) {
        this.state[y][x] = VisState.HIDDEN;
      }
    }
  }

  /** Recompute visibility from player position using raycasting */
  update(px: number, py: number, tiles: Tile[][]) {
    // Mark all visible tiles as explored (no longer actively visible)
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        if (this.state[y][x] === VisState.VISIBLE) {
          this.state[y][x] = VisState.EXPLORED;
        }
      }
    }

    // Cast rays in all directions
    const steps = 120;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);

      let rx = px + 0.5;
      let ry = py + 0.5;

      for (let d = 0; d < VISIBILITY_RADIUS; d++) {
        const tx = Math.floor(rx);
        const ty = Math.floor(ry);

        if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) break;

        this.state[ty][tx] = VisState.VISIBLE;

        // Stop at walls (but reveal the wall itself)
        if (tiles[ty][tx] === Tile.WALL) break;

        rx += dx;
        ry += dy;
      }
    }
  }
}
