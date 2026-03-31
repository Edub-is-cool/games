import { STARTING_POP_CAP, POP_PER_HOUSE } from '../config/buildings';

export interface Resources {
  food: number;
  wood: number;
  gold: number;
  stone: number;
}

export interface PlayerState {
  id: number;
  resources: Resources;
  popCap: number;
  popUsed: number;
  age: number; // 1-5
  ageProgress: number; // 0 to advanceTime (seconds), -1 = not advancing
}

export interface EntityData {
  id: number;
  type: 'unit' | 'building' | 'resource';
  key: string; // e.g. 'villager', 'barracks', 'tree'
  owner: number; // player id, -1 for neutral
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  state: string; // 'idle' | 'moving' | 'attacking' | 'gathering' | 'building' | 'dead'
  target: number | null; // entity id
  destX: number | null;
  destY: number | null;
  commandQueue: Command[];
  gatherType?: string; // 'food' | 'wood' | 'gold' | 'stone'
  carryAmount?: number;
  buildProgress?: number; // 0-1 for buildings under construction
  trainQueue?: TrainOrder[];
}

export interface Command {
  type: 'move' | 'attack' | 'gather' | 'build' | 'train';
  targetId?: number;
  x?: number;
  y?: number;
  unitKey?: string;
  buildingKey?: string;
}

export interface TrainOrder {
  unitKey: string;
  progress: number; // 0 to trainTime
  trainTime: number;
}

let nextEntityId = 1;

export class GameWorld {
  entities: Map<number, EntityData> = new Map();
  players: Map<number, PlayerState> = new Map();
  mapWidth = 2048;
  mapHeight = 2048;

  addPlayer(id: number): PlayerState {
    const player: PlayerState = {
      id,
      resources: { food: 200, wood: 200, gold: 100, stone: 50 },
      popCap: STARTING_POP_CAP,
      popUsed: 0,
      age: 1,
      ageProgress: -1,
    };
    this.players.set(id, player);
    return player;
  }

  spawnEntity(
    type: EntityData['type'],
    key: string,
    owner: number,
    x: number,
    y: number,
    maxHp: number
  ): EntityData {
    const entity: EntityData = {
      id: nextEntityId++,
      type,
      key,
      owner,
      x,
      y,
      hp: maxHp,
      maxHp,
      state: 'idle',
      target: null,
      destX: null,
      destY: null,
      commandQueue: [],
    };
    this.entities.set(entity.id, entity);
    return entity;
  }

  removeEntity(id: number) {
    this.entities.delete(id);
  }

  getEntitiesByOwner(owner: number): EntityData[] {
    return [...this.entities.values()].filter((e) => e.owner === owner);
  }

  getEntitiesInRadius(x: number, y: number, radius: number): EntityData[] {
    const r2 = radius * radius;
    return [...this.entities.values()].filter((e) => {
      const dx = e.x - x;
      const dy = e.y - y;
      return dx * dx + dy * dy <= r2;
    });
  }

  recalcPopCap(playerId: number) {
    const player = this.players.get(playerId);
    if (!player) return;
    let houses = 0;
    for (const e of this.entities.values()) {
      if (e.owner === playerId && e.key === 'house' && e.state !== 'dead' && (e.buildProgress === undefined || e.buildProgress >= 1)) {
        houses++;
      }
      if (e.owner === playerId && e.key === 'townCenter' && e.state !== 'dead') {
        houses++; // town center provides pop too
      }
    }
    player.popCap = STARTING_POP_CAP + houses * POP_PER_HOUSE;
  }

  recalcPopUsed(playerId: number) {
    const player = this.players.get(playerId);
    if (!player) return;
    let pop = 0;
    for (const e of this.entities.values()) {
      if (e.owner === playerId && e.type === 'unit' && e.state !== 'dead') {
        pop++;
      }
    }
    player.popUsed = pop;
  }
}
