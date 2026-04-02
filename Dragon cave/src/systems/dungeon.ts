import { Tile, Rect, Point, MAP_WIDTH, MAP_HEIGHT } from '../utils/constants';
import { RNG } from '../utils/rng';

export interface DungeonData {
  tiles: Tile[][];
  rooms: Rect[];
  playerStart: Point;
  stairsPos: Point;
  enemySpawns: Point[];
  itemSpawns: Point[];
}

export function generateDungeon(floor: number, seed: number): DungeonData {
  const rng = new RNG(seed + floor * 1000);

  // Initialize all walls
  const tiles: Tile[][] = [];
  for (let y = 0; y < MAP_HEIGHT; y++) {
    tiles[y] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      tiles[y][x] = Tile.WALL;
    }
  }

  // Generate rooms
  const rooms: Rect[] = [];
  const maxRooms = 8 + floor * 2;
  const minSize = 4;
  const maxSize = 9;

  for (let attempt = 0; attempt < 200 && rooms.length < maxRooms; attempt++) {
    const w = rng.int(minSize, maxSize);
    const h = rng.int(minSize, maxSize);
    const x = rng.int(1, MAP_WIDTH - w - 2);
    const y = rng.int(1, MAP_HEIGHT - h - 2);
    const room: Rect = { x, y, w, h };

    // Check overlap (with 1-tile padding)
    let overlaps = false;
    for (const other of rooms) {
      if (
        room.x - 1 < other.x + other.w &&
        room.x + room.w + 1 > other.x &&
        room.y - 1 < other.y + other.h &&
        room.y + room.h + 1 > other.y
      ) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    // Carve room
    for (let ry = y; ry < y + h; ry++) {
      for (let rx = x; rx < x + w; rx++) {
        tiles[ry][rx] = Tile.FLOOR;
      }
    }
    rooms.push(room);
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    const a = roomCenter(rooms[i - 1]);
    const b = roomCenter(rooms[i]);

    if (rng.next() > 0.5) {
      carveHCorridor(tiles, a.x, b.x, a.y);
      carveVCorridor(tiles, a.y, b.y, b.x);
    } else {
      carveVCorridor(tiles, a.y, b.y, a.x);
      carveHCorridor(tiles, a.x, b.x, b.y);
    }
  }

  // Place player in first room, stairs in last room
  const playerStart = roomCenter(rooms[0]);
  const stairsPos = roomCenter(rooms[rooms.length - 1]);
  tiles[stairsPos.y][stairsPos.x] = Tile.STAIRS_DOWN;

  // Spawn points for enemies (in rooms, not the first room)
  const enemySpawns: Point[] = [];
  const enemyCount = 3 + floor * 2;
  for (let i = 0; i < enemyCount; i++) {
    const room = rooms[rng.int(1, rooms.length - 1)];
    const pos = randomFloorInRoom(room, rng);
    if (pos.x !== playerStart.x || pos.y !== playerStart.y) {
      enemySpawns.push(pos);
    }
  }

  // Spawn points for items
  const itemSpawns: Point[] = [];
  const itemCount = 2 + Math.floor(floor * 1.5);
  for (let i = 0; i < itemCount; i++) {
    const room = rooms[rng.int(0, rooms.length - 1)];
    const pos = randomFloorInRoom(room, rng);
    if (pos.x !== playerStart.x || pos.y !== playerStart.y) {
      itemSpawns.push(pos);
    }
  }

  return { tiles, rooms, playerStart, stairsPos, enemySpawns, itemSpawns };
}

function roomCenter(room: Rect): Point {
  return {
    x: Math.floor(room.x + room.w / 2),
    y: Math.floor(room.y + room.h / 2),
  };
}

function randomFloorInRoom(room: Rect, rng: RNG): Point {
  return {
    x: rng.int(room.x + 1, room.x + room.w - 2),
    y: rng.int(room.y + 1, room.y + room.h - 2),
  };
}

function carveHCorridor(tiles: Tile[][], x1: number, x2: number, y: number) {
  const start = Math.min(x1, x2);
  const end = Math.max(x1, x2);
  for (let x = start; x <= end; x++) {
    if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
      tiles[y][x] = Tile.FLOOR;
    }
  }
}

function carveVCorridor(tiles: Tile[][], y1: number, y2: number, x: number) {
  const start = Math.min(y1, y2);
  const end = Math.max(y1, y2);
  for (let y = start; y <= end; y++) {
    if (y >= 0 && y < MAP_HEIGHT && x >= 0 && x < MAP_WIDTH) {
      tiles[y][x] = Tile.FLOOR;
    }
  }
}
