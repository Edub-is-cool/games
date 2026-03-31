import { GameWorld, EntityData, PlayerState } from './GameWorld';

// ── Random Event definitions ──────────────────────────────────────────

export interface RandomEventDef {
  id: string;
  name: string;
  message: string;
  color: string;
  duration: number; // seconds the event lasts (0 = instant)
}

const RANDOM_EVENT_DEFS: RandomEventDef[] = [
  { id: 'earthquake', name: 'Earthquake', message: 'An earthquake shakes the land! Buildings take damage.', color: '#cc4400', duration: 0 },
  { id: 'gold_rush', name: 'Gold Rush', message: 'A vein of gold has been discovered!', color: '#ffd700', duration: 0 },
  { id: 'plague', name: 'Plague', message: 'A terrible plague sweeps through the villages!', color: '#8b008b', duration: 0 },
  { id: 'bountiful_harvest', name: 'Bountiful Harvest', message: 'The harvest is plentiful! All players gain food.', color: '#228b22', duration: 0 },
  { id: 'bandit_raid', name: 'Bandit Raid', message: 'Bandits are attacking!', color: '#b22222', duration: 0 },
  { id: 'trade_boom', name: 'Trade Boom', message: 'A trade boom has begun! Markets are flourishing.', color: '#4169e1', duration: 30 },
  { id: 'refugee_arrival', name: 'Refugee Arrival', message: 'Refugees have arrived bearing gifts.', color: '#daa520', duration: 0 },
];

// ── Quest definitions ─────────────────────────────────────────────────

export type QuestType = 'military_buildup' | 'explorer' | 'defender' | 'economist';

export interface ActiveQuest {
  type: QuestType;
  progress: number;
  target: number;
  timeLimit: number; // seconds remaining, -1 = no limit
  reward: { type: 'gold' | 'all_resources'; amount: number };
}

interface QuestTemplate {
  type: QuestType;
  target: number;
  timeLimit: number;
  reward: { type: 'gold' | 'all_resources'; amount: number };
}

const QUEST_TEMPLATES: QuestTemplate[] = [
  { type: 'military_buildup', target: 5, timeLimit: 180, reward: { type: 'gold', amount: 300 } },
  { type: 'explorer', target: 3, timeLimit: 120, reward: { type: 'gold', amount: 200 } },
  { type: 'defender', target: 10, timeLimit: 300, reward: { type: 'gold', amount: 500 } },
  { type: 'economist', target: 500, timeLimit: 240, reward: { type: 'all_resources', amount: 100 } },
];

// ── Season definitions ────────────────────────────────────────────────

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonMultipliers {
  foodGatherMult: number;
  speedMult: number;
}

// ── Age World Event definitions ───────────────────────────────────────

interface AgeEventDef {
  age: number;
  name: string;
  message: string;
}

const AGE_EVENTS: AgeEventDef[] = [
  { age: 2, name: 'Age of Discovery', message: 'A civilization has advanced to the Age of Discovery! New dangers emerge.' },
  { age: 3, name: 'Age of Commerce', message: 'A civilization has reached the Age of Commerce! Trade routes open.' },
  { age: 4, name: 'Age of Empires', message: 'A civilization has entered the Age of Empires! Great armies march.' },
  { age: 5, name: 'Age of Wonders', message: 'A civilization has achieved the Age of Wonders! Legends are forged.' },
];

// ── Callback type for event notifications ─────────────────────────────

export type EventCallback = (event: { id: string; name: string; message: string; color: string; playerId?: number }) => void;

// ══════════════════════════════════════════════════════════════════════
//  EventSystem
// ══════════════════════════════════════════════════════════════════════

export class EventSystem {
  private world: GameWorld;

  // ── Random events ───────────────────────────────────────────────────
  private nextRandomEventTime: number = 0;
  private activeEventFlags: Map<string, number> = new Map(); // eventId → remaining seconds
  private eventLog: { id: string; name: string; message: string; color: string; time: number }[] = [];
  private elapsedTime: number = 0;

  // ── Quests ──────────────────────────────────────────────────────────
  private playerQuests: Map<number, ActiveQuest[]> = new Map(); // playerId → quests
  private playerKills: Map<number, number> = new Map(); // playerId → kill count (for defender quest)

  // ── Golden Ages ─────────────────────────────────────────────────────
  private goldenAgeTimers: Map<number, number> = new Map(); // playerId → remaining seconds

  // ── Seasonal weather ────────────────────────────────────────────────
  private seasonClock: number = 0; // cycles 0-120

  // ── Age world events ────────────────────────────────────────────────
  ageEventTriggered: Set<number> = new Set();

  // ── Listeners ───────────────────────────────────────────────────────
  private listeners: EventCallback[] = [];

  constructor(world: GameWorld) {
    this.world = world;
    this.scheduleNextRandomEvent();
  }

  // ── Public listener API ─────────────────────────────────────────────

  onEvent(cb: EventCallback): void {
    this.listeners.push(cb);
  }

  private emit(event: { id: string; name: string; message: string; color: string; playerId?: number }): void {
    for (const cb of this.listeners) {
      cb(event);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Main update  (call once per frame / tick with delta in seconds)
  // ══════════════════════════════════════════════════════════════════════

  update(dt: number): void {
    this.elapsedTime += dt;
    this.seasonClock = (this.seasonClock + dt) % 120;

    // Tick active event flags
    for (const [eventId, remaining] of this.activeEventFlags) {
      const next = remaining - dt;
      if (next <= 0) {
        this.activeEventFlags.delete(eventId);
      } else {
        this.activeEventFlags.set(eventId, next);
      }
    }

    // Tick golden ages
    for (const [playerId, remaining] of this.goldenAgeTimers) {
      const next = remaining - dt;
      if (next <= 0) {
        this.goldenAgeTimers.delete(playerId);
      } else {
        this.goldenAgeTimers.set(playerId, next);
      }
    }

    // Random events
    if (this.elapsedTime >= this.nextRandomEventTime) {
      this.fireRandomEvent();
      this.scheduleNextRandomEvent();
    }

    // Quests
    this.updateQuests(dt);

    // Age world events
    this.checkAgeEvents();
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Random Events
  // ══════════════════════════════════════════════════════════════════════

  private scheduleNextRandomEvent(): void {
    // 60-120 seconds from now
    this.nextRandomEventTime = this.elapsedTime + 60 + Math.random() * 60;
  }

  private fireRandomEvent(): void {
    const def = RANDOM_EVENT_DEFS[Math.floor(Math.random() * RANDOM_EVENT_DEFS.length)];
    this.applyRandomEvent(def);
  }

  private applyRandomEvent(def: RandomEventDef): void {
    const playerIds = [...this.world.players.keys()];
    if (playerIds.length === 0) return;

    const randomPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];

    switch (def.id) {
      case 'earthquake': {
        // Random player's buildings lose 20% HP
        for (const e of this.world.entities.values()) {
          if (e.owner === randomPlayerId && e.type === 'building' && e.state !== 'dead') {
            e.hp = Math.max(1, Math.floor(e.hp * 0.8));
          }
        }
        this.emit({ id: def.id, name: def.name, message: def.message, color: def.color, playerId: randomPlayerId });
        break;
      }

      case 'gold_rush': {
        // Random player gets 200 gold
        const player = this.world.players.get(randomPlayerId);
        if (player) {
          player.resources.gold += 200;
        }
        this.emit({ id: def.id, name: def.name, message: def.message, color: def.color, playerId: randomPlayerId });
        break;
      }

      case 'plague': {
        // All players' villagers lose 10% HP
        for (const e of this.world.entities.values()) {
          if (e.type === 'unit' && e.key === 'villager' && e.state !== 'dead') {
            e.hp = Math.max(1, Math.floor(e.hp * 0.9));
          }
        }
        this.emit({ id: def.id, name: def.name, message: def.message, color: def.color });
        break;
      }

      case 'bountiful_harvest': {
        // All players +100 food
        for (const player of this.world.players.values()) {
          player.resources.food += 100;
        }
        this.emit({ id: def.id, name: def.name, message: def.message, color: def.color });
        break;
      }

      case 'bandit_raid': {
        // 3 enemy militia spawn near random player's first building
        const buildings = this.world.getEntitiesByOwner(randomPlayerId).filter(
          (e) => e.type === 'building' && e.state !== 'dead'
        );
        const anchor = buildings.length > 0 ? buildings[0] : null;
        const spawnX = anchor ? anchor.x + 100 : Math.random() * this.world.mapWidth;
        const spawnY = anchor ? anchor.y + 100 : Math.random() * this.world.mapHeight;
        for (let i = 0; i < 3; i++) {
          this.world.spawnEntity(
            'unit',
            'militia',
            -1, // neutral / bandit
            spawnX + (i - 1) * 30,
            spawnY,
            60
          );
        }
        this.emit({ id: def.id, name: def.name, message: def.message, color: def.color, playerId: randomPlayerId });
        break;
      }

      case 'trade_boom': {
        // Flag that lasts 30 seconds
        this.activeEventFlags.set('trade_boom', def.duration);
        this.emit({ id: def.id, name: def.name, message: def.message, color: def.color });
        break;
      }

      case 'refugee_arrival': {
        // Add resources to random player (can't spawn units without scene)
        const player = this.world.players.get(randomPlayerId);
        if (player) {
          player.resources.food += 50;
          player.resources.wood += 50;
          player.resources.gold += 25;
        }
        this.emit({ id: def.id, name: def.name, message: def.message, color: def.color, playerId: randomPlayerId });
        break;
      }
    }

    this.eventLog.push({
      id: def.id,
      name: def.name,
      message: def.message,
      color: def.color,
      time: this.elapsedTime,
    });
  }

  /** Check whether a timed event flag is currently active. */
  isEventActive(eventId: string): boolean {
    return this.activeEventFlags.has(eventId);
  }

  getEventLog() {
    return [...this.eventLog];
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Quests
  // ══════════════════════════════════════════════════════════════════════

  private ensureQuests(playerId: number): ActiveQuest[] {
    let quests = this.playerQuests.get(playerId);
    if (!quests) {
      quests = [];
      this.playerQuests.set(playerId, quests);
    }
    return quests;
  }

  private updateQuests(dt: number): void {
    for (const [playerId, player] of this.world.players) {
      const quests = this.ensureQuests(playerId);

      // Assign quests if fewer than 1
      while (quests.length < 1) {
        this.assignRandomQuest(playerId, quests);
      }
      // Occasionally add a second quest (cap at 2)
      if (quests.length < 2 && Math.random() < 0.001 * dt) {
        this.assignRandomQuest(playerId, quests);
      }

      // Evaluate each quest
      for (let i = quests.length - 1; i >= 0; i--) {
        const q = quests[i];

        // Tick time limit
        if (q.timeLimit > 0) {
          q.timeLimit -= dt;
          if (q.timeLimit <= 0) {
            // Quest expired
            quests.splice(i, 1);
            continue;
          }
        }

        // Update progress
        this.evaluateQuestProgress(playerId, q);

        // Check completion
        if (q.progress >= q.target) {
          this.grantQuestReward(playerId, q);
          quests.splice(i, 1);
        }
      }
    }
  }

  private assignRandomQuest(playerId: number, quests: ActiveQuest[]): void {
    // Avoid duplicate quest types
    const activeTypes = new Set(quests.map((q) => q.type));
    const available = QUEST_TEMPLATES.filter((t) => !activeTypes.has(t.type));
    if (available.length === 0) return;

    const template = available[Math.floor(Math.random() * available.length)];
    quests.push({
      type: template.type,
      progress: 0,
      target: template.target,
      timeLimit: template.timeLimit,
      reward: { ...template.reward },
    });
  }

  private evaluateQuestProgress(playerId: number, quest: ActiveQuest): void {
    const owned = this.world.getEntitiesByOwner(playerId);

    switch (quest.type) {
      case 'military_buildup': {
        // Count military (non-villager) units that are alive
        const militaryUnits = owned.filter(
          (e) => e.type === 'unit' && e.key !== 'villager' && e.state !== 'dead'
        );
        quest.progress = militaryUnits.length;
        break;
      }

      case 'explorer': {
        // Count scouts alive
        const scouts = owned.filter(
          (e) => e.type === 'unit' && e.key === 'scout' && e.state !== 'dead'
        );
        quest.progress = scouts.length;
        break;
      }

      case 'defender': {
        // Kill count tracked externally via recordKill
        quest.progress = this.playerKills.get(playerId) ?? 0;
        break;
      }

      case 'economist': {
        const player = this.world.players.get(playerId);
        if (player) {
          const r = player.resources;
          quest.progress = r.food + r.wood + r.gold + r.stone;
        }
        break;
      }
    }
  }

  private grantQuestReward(playerId: number, quest: ActiveQuest): void {
    const player = this.world.players.get(playerId);
    if (!player) return;

    if (quest.reward.type === 'gold') {
      player.resources.gold += quest.reward.amount;
    } else if (quest.reward.type === 'all_resources') {
      player.resources.food += quest.reward.amount;
      player.resources.wood += quest.reward.amount;
      player.resources.gold += quest.reward.amount;
      player.resources.stone += quest.reward.amount;
    }

    this.emit({
      id: 'quest_complete',
      name: 'Quest Complete',
      message: `Quest "${quest.type}" completed! Reward granted.`,
      color: '#00ff00',
      playerId,
    });
  }

  /** Call when a player kills an enemy unit (for defender quest tracking). */
  recordKill(playerId: number): void {
    this.playerKills.set(playerId, (this.playerKills.get(playerId) ?? 0) + 1);
  }

  getActiveQuests(playerId: number): ReadonlyArray<ActiveQuest> {
    return this.ensureQuests(playerId);
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Golden Ages
  // ══════════════════════════════════════════════════════════════════════

  triggerGoldenAge(playerId: number): void {
    this.goldenAgeTimers.set(playerId, 60);
    this.emit({
      id: 'golden_age',
      name: 'Golden Age',
      message: 'A Golden Age has begun!',
      color: '#ffd700',
      playerId,
    });
  }

  isGoldenAge(playerId: number): boolean {
    return this.goldenAgeTimers.has(playerId);
  }

  getGoldenAgeTimer(playerId: number): number {
    return this.goldenAgeTimers.get(playerId) ?? 0;
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Seasonal Weather (120-second cycle)
  // ══════════════════════════════════════════════════════════════════════

  getCurrentSeason(): Season {
    if (this.seasonClock < 30) return 'spring';
    if (this.seasonClock < 60) return 'summer';
    if (this.seasonClock < 90) return 'autumn';
    return 'winter';
  }

  getSeasonMultipliers(): SeasonMultipliers {
    switch (this.getCurrentSeason()) {
      case 'spring':
        return { foodGatherMult: 1.1, speedMult: 1.0 };
      case 'summer':
        return { foodGatherMult: 1.2, speedMult: 1.05 };
      case 'autumn':
        return { foodGatherMult: 1.0, speedMult: 1.0 };
      case 'winter':
        return { foodGatherMult: 0.8, speedMult: 0.9 };
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  //  Age World Events
  // ══════════════════════════════════════════════════════════════════════

  checkAgeEvents(): void {
    for (const [_playerId, player] of this.world.players) {
      if (player.age > 1 && !this.ageEventTriggered.has(player.age)) {
        this.ageEventTriggered.add(player.age);

        const def = AGE_EVENTS.find((e) => e.age === player.age);
        if (def) {
          this.emit({
            id: `age_event_${def.age}`,
            name: def.name,
            message: def.message,
            color: '#ffffff',
          });
        }
      }
    }
  }
}
