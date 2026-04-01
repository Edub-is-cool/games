import { GameWorld, EntityData, Command } from './GameWorld';
import { UNITS } from '../config/units';
import { ALL_UNITS } from '../config/ages';

export class CommandSystem {
  constructor(private world: GameWorld) {}

  issueCommand(entityIds: number[], command: Command) {
    for (const id of entityIds) {
      const entity = this.world.entities.get(id);
      if (!entity || entity.state === 'dead') continue;

      // Replace command queue (shift-queue could append later)
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

    if (dist < 2) {
      entity.x = entity.destX;
      entity.y = entity.destY;
      entity.commandQueue.shift();
      this.executeNextCommand(entity);
      return;
    }

    const step = config.speed * (delta / 1000);
    const ratio = Math.min(step / dist, 1);
    entity.x += dx * ratio;
    entity.y += dy * ratio;
  }
}
