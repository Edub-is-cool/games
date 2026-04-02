import { GameWorld, EntityData, Command } from './GameWorld';
import { UNITS } from '../config/units';
import { ALL_UNITS } from '../config/ages';
import type { TerrainTile } from './MapGenerator';

const TILE_SIZE = 32;

// Terrain types units cannot walk through
const BLOCKED_TERRAIN = new Set(['water']);
// Terrain that slows movement
const SLOW_TERRAIN = new Set(['forest']);
const SLOW_FACTOR = 0.5;

export class CommandSystem {
  terrain: TerrainTile[][] | null = null;
  // Blocked positions from decorations (trees forming forests)
  private blockedTiles: Set<string> = new Set();

  constructor(private world: GameWorld) {}

  /** Register decoration trees as blocked tiles to form impassable forests */
  registerDecorations(decorations: { type: string; x: number; y: number }[]) {
    this.blockedTiles.clear();
    // Count trees per tile — if 2+ trees in one tile, it's a dense forest (blocked)
    const treeCounts = new Map<string, number>();
    for (const dec of decorations) {
      if (dec.type === 'tree') {
        const key = `${Math.floor(dec.x / TILE_SIZE)},${Math.floor(dec.y / TILE_SIZE)}`;
        treeCounts.set(key, (treeCounts.get(key) ?? 0) + 1);
      }
    }
    for (const [key, count] of treeCounts) {
      if (count >= 2) {
        this.blockedTiles.add(key);
      }
    }
  }

  /** Check if a world position is walkable */
  isWalkable(x: number, y: number): boolean {
    // Terrain check
    if (this.terrain) {
      const row = Math.floor(y / TILE_SIZE);
      const col = Math.floor(x / TILE_SIZE);
      if (row >= 0 && row < this.terrain.length && col >= 0 && col < this.terrain[0].length) {
        if (BLOCKED_TERRAIN.has(this.terrain[row][col].type)) return false;
      }
    }

    // Dense forest check
    const tileKey = `${Math.floor(x / TILE_SIZE)},${Math.floor(y / TILE_SIZE)}`;
    if (this.blockedTiles.has(tileKey)) return false;

    // Resource/building entity collision (don't walk through them)
    for (const entity of this.world.entities.values()) {
      if (entity.state === 'dead') continue;
      if (entity.type === 'resource' || entity.type === 'building') {
        const size = entity.type === 'building' ? 20 : 10;
        const dx = x - entity.x;
        const dy = y - entity.y;
        if (dx * dx + dy * dy < size * size) return false;
      }
    }

    return true;
  }

  /** Check only terrain walkability (for building placement — ignores entity collision) */
  isTerrainWalkable(x: number, y: number): boolean {
    if (this.terrain) {
      const row = Math.floor(y / TILE_SIZE);
      const col = Math.floor(x / TILE_SIZE);
      if (row >= 0 && row < this.terrain.length && col >= 0 && col < this.terrain[0].length) {
        if (BLOCKED_TERRAIN.has(this.terrain[row][col].type)) return false;
      }
    }
    const tileKey = `${Math.floor(x / TILE_SIZE)},${Math.floor(y / TILE_SIZE)}`;
    if (this.blockedTiles.has(tileKey)) return false;
    if (x < 0 || y < 0 || x > this.world.mapWidth || y > this.world.mapHeight) return false;
    return true;
  }

  /** Check if destination is walkable; if not, find nearest walkable spot */
  findWalkableNear(x: number, y: number): { x: number; y: number } | null {
    if (this.isWalkable(x, y)) return { x, y };

    // Search in expanding rings
    for (let radius = TILE_SIZE; radius <= TILE_SIZE * 6; radius += TILE_SIZE) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const nx = x + Math.cos(angle) * radius;
        const ny = y + Math.sin(angle) * radius;
        if (this.isWalkable(nx, ny)) return { x: nx, y: ny };
      }
    }
    return null;
  }

  issueCommand(entityIds: number[], command: Command) {
    for (const id of entityIds) {
      const entity = this.world.entities.get(id);
      if (!entity || entity.state === 'dead') continue;

      // For move commands, validate destination is walkable
      if (command.type === 'move' && command.x !== undefined && command.y !== undefined) {
        const dest = this.findWalkableNear(command.x, command.y);
        if (!dest) continue; // nowhere to go
        command = { ...command, x: dest.x, y: dest.y };
      }

      entity.commandQueue = [command];
      this.executeNextCommand(entity);
    }
  }

  executeNextCommand(entity: EntityData) {
    if (entity.commandQueue.length === 0) {
      entity.state = 'idle';
      entity.target = null;
      entity.destX = null;
      entity.destY = null;
      return;
    }

    const cmd = entity.commandQueue[0];

    switch (cmd.type) {
      case 'move':
        entity.state = 'moving';
        entity.destX = cmd.x ?? entity.x;
        entity.destY = cmd.y ?? entity.y;
        entity.target = null;
        break;

      case 'attack':
        if (cmd.targetId !== undefined) {
          entity.state = 'attacking';
          entity.target = cmd.targetId;
        }
        break;

      case 'gather':
        if (cmd.targetId !== undefined) {
          entity.state = 'gathering';
          entity.target = cmd.targetId;
        }
        break;
    }
  }

  update(delta: number) {
    for (const entity of this.world.entities.values()) {
      if (entity.state === 'dead' || entity.type !== 'unit') continue;

      if (entity.state === 'moving') {
        this.processMovement(entity, delta);
      }
    }
  }

  private processMovement(entity: EntityData, delta: number) {
    if (entity.destX === null || entity.destY === null) return;

    const config = ALL_UNITS[entity.key] ?? UNITS[entity.key];
    if (!config) return;

    const dx = entity.destX - entity.x;
    const dy = entity.destY - entity.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 4) {
      entity.x = entity.destX;
      entity.y = entity.destY;
      entity.commandQueue.shift();
      this.executeNextCommand(entity);
      return;
    }

    let speed = config.speed;

    // Slow down in forest terrain
    if (this.terrain) {
      const row = Math.floor(entity.y / TILE_SIZE);
      const col = Math.floor(entity.x / TILE_SIZE);
      if (row >= 0 && row < this.terrain.length && col >= 0 && col < this.terrain[0].length) {
        if (SLOW_TERRAIN.has(this.terrain[row][col].type)) {
          speed *= SLOW_FACTOR;
        }
      }
    }

    const step = speed * (delta / 1000);
    const ratio = Math.min(step / dist, 1);
    const newX = entity.x + dx * ratio;
    const newY = entity.y + dy * ratio;

    // Check if next position is walkable
    if (this.isWalkableForUnit(newX, newY, entity.id)) {
      entity.x = newX;
      entity.y = newY;
    } else {
      // Try to steer around obstacle
      const angles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
      const moveAngle = Math.atan2(dy, dx);
      let moved = false;

      for (const offset of angles) {
        const altX = entity.x + Math.cos(moveAngle + offset) * step;
        const altY = entity.y + Math.sin(moveAngle + offset) * step;
        if (this.isWalkableForUnit(altX, altY, entity.id)) {
          entity.x = altX;
          entity.y = altY;
          moved = true;
          break;
        }
      }

      if (!moved) {
        // Stuck — cancel movement
        entity.commandQueue.shift();
        this.executeNextCommand(entity);
      }
    }
  }

  /** Walkability check for movement — ignores the unit's own entity */
  private isWalkableForUnit(x: number, y: number, unitId: number): boolean {
    // Terrain check
    if (this.terrain) {
      const row = Math.floor(y / TILE_SIZE);
      const col = Math.floor(x / TILE_SIZE);
      if (row >= 0 && row < this.terrain.length && col >= 0 && col < this.terrain[0].length) {
        if (BLOCKED_TERRAIN.has(this.terrain[row][col].type)) return false;
      }
    }

    // Dense forest check
    const tileKey = `${Math.floor(x / TILE_SIZE)},${Math.floor(y / TILE_SIZE)}`;
    if (this.blockedTiles.has(tileKey)) return false;

    // Map bounds
    if (x < 0 || y < 0 || x > this.world.mapWidth || y > this.world.mapHeight) return false;

    return true;
  }
}
