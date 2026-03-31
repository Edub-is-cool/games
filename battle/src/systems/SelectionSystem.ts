import { GameWorld, EntityData } from './GameWorld';

export class SelectionSystem {
  selected: Set<number> = new Set();
  boxStart: { x: number; y: number } | null = null;
  boxEnd: { x: number; y: number } | null = null;
  playerId: number;

  // Control groups (Ctrl+1 through Ctrl+9)
  controlGroups: Map<number, Set<number>> = new Map();

  constructor(private world: GameWorld, playerId: number) {
    this.playerId = playerId;
    for (let i = 1; i <= 9; i++) {
      this.controlGroups.set(i, new Set());
    }
  }

  clearSelection() {
    this.selected.clear();
  }

  selectSingle(entityId: number) {
    this.clearSelection();
    this.selected.add(entityId);
  }

  addToSelection(entityId: number) {
    this.selected.add(entityId);
  }

  // Control groups
  assignControlGroup(groupNum: number) {
    if (groupNum < 1 || groupNum > 9) return;
    this.controlGroups.set(groupNum, new Set(this.selected));
  }

  selectControlGroup(groupNum: number) {
    if (groupNum < 1 || groupNum > 9) return;
    const group = this.controlGroups.get(groupNum);
    if (!group || group.size === 0) return;

    this.clearSelection();
    for (const id of group) {
      const e = this.world.entities.get(id);
      if (e && e.state !== 'dead') {
        this.selected.add(id);
      } else {
        group.delete(id);
      }
    }
  }

  getControlGroupCenter(groupNum: number): { x: number; y: number } | null {
    const group = this.controlGroups.get(groupNum);
    if (!group || group.size === 0) return null;
    let sx = 0, sy = 0, count = 0;
    for (const id of group) {
      const e = this.world.entities.get(id);
      if (e && e.state !== 'dead') {
        sx += e.x; sy += e.y; count++;
      }
    }
    if (count === 0) return null;
    return { x: sx / count, y: sy / count };
  }

  startBox(x: number, y: number) {
    this.boxStart = { x, y };
    this.boxEnd = { x, y };
  }

  updateBox(x: number, y: number) {
    if (this.boxStart) {
      this.boxEnd = { x, y };
    }
  }

  endBox() {
    if (!this.boxStart || !this.boxEnd) return;

    const left = Math.min(this.boxStart.x, this.boxEnd.x);
    const right = Math.max(this.boxStart.x, this.boxEnd.x);
    const top = Math.min(this.boxStart.y, this.boxEnd.y);
    const bottom = Math.max(this.boxStart.y, this.boxEnd.y);

    this.clearSelection();

    for (const entity of this.world.entities.values()) {
      if (
        entity.owner === this.playerId &&
        entity.type === 'unit' &&
        entity.state !== 'dead' &&
        entity.x >= left &&
        entity.x <= right &&
        entity.y >= top &&
        entity.y <= bottom
      ) {
        this.selected.add(entity.id);
      }
    }

    this.boxStart = null;
    this.boxEnd = null;
  }

  getSelectedEntities(): EntityData[] {
    const entities: EntityData[] = [];
    for (const id of this.selected) {
      const e = this.world.entities.get(id);
      if (e && e.state !== 'dead') {
        entities.push(e);
      } else {
        this.selected.delete(id);
      }
    }
    return entities;
  }

  entityAtPoint(x: number, y: number, radius = 16): EntityData | null {
    let closest: EntityData | null = null;
    let closestDist = radius * radius;

    for (const entity of this.world.entities.values()) {
      if (entity.state === 'dead') continue;
      const dx = entity.x - x;
      const dy = entity.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < closestDist) {
        closestDist = dist;
        closest = entity;
      }
    }

    return closest;
  }
}
