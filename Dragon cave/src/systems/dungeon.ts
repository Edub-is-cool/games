import { Tile, Rect, Point, MAP_WIDTH, MAP_HEIGHT } from '../utils/constants';
import { RNG } from '../utils/rng';

export interface DungeonData {
  tiles: Tile[][];
  rooms: Rect[];
  secretRooms: Rect[];
  playerStart: Point;
  stairsPos: Point;
  enemySpawns: Point[];
  itemSpawns: Point[];
  keySpawns: Point[];
  trapPositions: Point[];
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

  // --- Secret rooms (cracked wall entrance) ---
  const secretRooms: Rect[] = [];
  const secretCount = Math.min(2, Math.floor(floor / 2) + 1);
  for (let attempt = 0; attempt < 100 && secretRooms.length < secretCount; attempt++) {
    const sw = rng.int(3, 5);
    const sh = rng.int(3, 5);
    const sx = rng.int(2, MAP_WIDTH - sw - 2);
    const sy = rng.int(2, MAP_HEIGHT - sh - 2);
    const sRoom: Rect = { x: sx, y: sy, w: sw, h: sh };

    // Must not overlap any existing room or secret room (with padding)
    let overlaps = false;
    for (const other of [...rooms, ...secretRooms]) {
      if (
        sRoom.x - 2 < other.x + other.w &&
        sRoom.x + sRoom.w + 2 > other.x &&
        sRoom.y - 2 < other.y + other.h &&
        sRoom.y + sRoom.h + 2 > other.y
      ) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    // Must be adjacent to an existing room's wall (find a connection point)
    const connectionPoint = findSecretConnection(tiles, sRoom, rng);
    if (!connectionPoint) continue;

    // Carve secret room
    for (let ry = sy; ry < sy + sh; ry++) {
      for (let rx = sx; rx < sx + sw; rx++) {
        tiles[ry][rx] = Tile.FLOOR;
      }
    }

    // Place cracked wall at connection
    tiles[connectionPoint.y][connectionPoint.x] = Tile.CRACKED_WALL;
    secretRooms.push(sRoom);
  }

  // --- Place locked doors on some corridors ---
  const keySpawns: Point[] = [];
  const doorCount = Math.min(floor, 3);
  let doorsPlaced = 0;
  for (let attempt = 0; attempt < 200 && doorsPlaced < doorCount; attempt++) {
    const dx = rng.int(1, MAP_WIDTH - 2);
    const dy = rng.int(1, MAP_HEIGHT - 2);

    // A good door position is a floor tile with walls on two opposite sides (corridor chokepoint)
    if (tiles[dy][dx] !== Tile.FLOOR) continue;
    const hDoor = tiles[dy][dx - 1] === Tile.WALL && tiles[dy][dx + 1] === Tile.WALL &&
                  tiles[dy - 1][dx] === Tile.FLOOR && tiles[dy + 1][dx] === Tile.FLOOR;
    const vDoor = tiles[dy - 1][dx] === Tile.WALL && tiles[dy + 1][dx] === Tile.WALL &&
                  tiles[dy][dx - 1] === Tile.FLOOR && tiles[dy][dx + 1] === Tile.FLOOR;
    if (!hDoor && !vDoor) continue;

    tiles[dy][dx] = Tile.DOOR_LOCKED;
    doorsPlaced++;

    // Place a key in a room before this door (earlier rooms)
    const keyRoom = rooms[rng.int(0, Math.min(rooms.length - 1, Math.floor(rooms.length / 2)))];
    keySpawns.push(randomFloorInRoom(keyRoom, rng));
  }

  // --- Place traps ---
  const trapPositions: Point[] = [];
  const trapCount = 2 + floor * 2;
  for (let i = 0; i < trapCount; i++) {
    const room = rooms[rng.int(1, rooms.length - 1)];
    const pos = randomFloorInRoom(room, rng);
    if (tiles[pos.y][pos.x] !== Tile.FLOOR) continue;
    tiles[pos.y][pos.x] = rng.next() > 0.4 ? Tile.TRAP_SPIKE : Tile.TRAP_POISON;
    trapPositions.push(pos);
  }

  // Place player in first room, stairs in last room
  const playerStart = roomCenter(rooms[0]);
  const stairsPos = roomCenter(rooms[rooms.length - 1]);
  tiles[stairsPos.y][stairsPos.x] = Tile.STAIRS_DOWN;
  // Ensure player start is clean
  tiles[playerStart.y][playerStart.x] = Tile.FLOOR;

  // Spawn points for enemies (not first room)
  const enemySpawns: Point[] = [];
  const enemyCount = 3 + floor * 2;
  for (let i = 0; i < enemyCount; i++) {
    const room = rooms[rng.int(1, rooms.length - 1)];
    const pos = randomFloorInRoom(room, rng);
    if (pos.x !== playerStart.x || pos.y !== playerStart.y) {
      enemySpawns.push(pos);
    }
  }

  // Spawn points for items (including secret rooms — better loot there)
  const itemSpawns: Point[] = [];
  const itemCount = 2 + Math.floor(floor * 1.5);
  for (let i = 0; i < itemCount; i++) {
    const allRooms = [...rooms, ...secretRooms];
    const room = allRooms[rng.int(0, allRooms.length - 1)];
    const pos = randomFloorInRoom(room, rng);
    if (pos.x !== playerStart.x || pos.y !== playerStart.y) {
      itemSpawns.push(pos);
    }
  }
  // Guaranteed good item in each secret room
  for (const sRoom of secretRooms) {
    itemSpawns.push(roomCenter(sRoom));
  }

  return { tiles, rooms, secretRooms, playerStart, stairsPos, enemySpawns, itemSpawns, keySpawns, trapPositions };
}

function findSecretConnection(tiles: Tile[][], room: Rect, rng: RNG): Point | null {
  // Try each edge of the secret room to see if it's adjacent to a carved area
  const candidates: Point[] = [];

  // Top edge
  for (let x = room.x; x < room.x + room.w; x++) {
    if (room.y - 2 >= 0 && tiles[room.y - 2][x] === Tile.FLOOR) {
      candidates.push({ x, y: room.y - 1 });
    }
  }
  // Bottom edge
  for (let x = room.x; x < room.x + room.w; x++) {
    if (room.y + room.h + 1 < MAP_HEIGHT && tiles[room.y + room.h + 1][x] === Tile.FLOOR) {
      candidates.push({ x, y: room.y + room.h });
    }
  }
  // Left edge
  for (let y = room.y; y < room.y + room.h; y++) {
    if (room.x - 2 >= 0 && tiles[y][room.x - 2] === Tile.FLOOR) {
      candidates.push({ x: room.x - 1, y });
    }
  }
  // Right edge
  for (let y = room.y; y < room.y + room.h; y++) {
    if (room.x + room.w + 1 < MAP_WIDTH && tiles[y][room.x + room.w + 1] === Tile.FLOOR) {
      candidates.push({ x: room.x + room.w, y });
    }
  }

  if (candidates.length === 0) return null;
  return rng.pick(candidates);
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
