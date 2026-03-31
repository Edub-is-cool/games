import { GameWorld, EntityData, Command } from './GameWorld';
import { CommandSystem } from './CommandSystem';
import { EconomySystem } from './EconomySystem';
import { DiplomacySystem } from './DiplomacySystem';
import { UNITS } from '../config/units';
import { BUILDINGS } from '../config/buildings';
import { Difficulty, DIFFICULTY_CONFIG } from '../config/gameSettings';
import { DiplomaticStatus, AI_ACCEPT_THRESHOLDS } from '../config/diplomacySettings';
import { AGES } from '../config/ages';

type AIPhase = 'economy' | 'military' | 'attack';

export class AISystem {
  private playerId: number;
  private timer = 0;
  private diplomacyTimer = 0;
  private phase: AIPhase = 'economy';
  private attackWaveSize: number;
  private hasAttacked = false;
  private difficulty: Difficulty;
  private cfg: typeof DIFFICULTY_CONFIG['normal'];
  diplomacy: DiplomacySystem | null = null;

  constructor(
    private world: GameWorld,
    private commands: CommandSystem,
    private economy: EconomySystem,
    playerId: number,
    difficulty: Difficulty = 'normal'
  ) {
    this.playerId = playerId;
    this.difficulty = difficulty;
    this.cfg = DIFFICULTY_CONFIG[difficulty];
    this.attackWaveSize = this.cfg.attackWaveSize;
  }

  update(delta: number) {
    this.timer += delta / 1000;
    if (this.timer < this.cfg.tickRate) return;
    this.timer = 0;

    this.world.recalcPopUsed(this.playerId);
    this.world.recalcPopCap(this.playerId);

    this.decidePhase();

    switch (this.phase) {
      case 'economy': this.doEconomy(); break;
      case 'military': this.doMilitary(); break;
      case 'attack': this.doAttack(); break;
    }

    this.assignIdleVillagers();
    this.defendBase();

    // Diplomacy on a slower cadence
    this.diplomacyTimer += this.cfg.tickRate;
    if (this.diplomacy && this.diplomacyTimer >= 10) {
      this.diplomacyTimer = 0;
      this.doDiplomacy();
    }
  }

  // ─── Diplomacy AI ────────────────────────────────────────

  private doDiplomacy() {
    if (!this.diplomacy) return;

    // Process incoming proposals
    const proposals = this.diplomacy.getPendingProposalsFor(this.playerId);
    for (const proposal of proposals) {
      const accept = this.shouldAcceptProposal(proposal);
      if (accept) {
        this.diplomacy.acceptProposal(proposal.id);
      } else {
        this.diplomacy.rejectProposal(proposal.id);
      }
    }

    // Evaluate diplomatic actions toward each other player
    const surviving = this.diplomacy.getSurvivingPlayers().filter((p) => p !== this.playerId);
    const myStrength = this.getMilitaryStrength(this.playerId);

    for (const otherId of surviving) {
      const status = this.diplomacy.getStatus(this.playerId, otherId);
      const score = this.diplomacy.getScore(this.playerId, otherId);
      const theirStrength = this.getMilitaryStrength(otherId);

      switch (status) {
        case DiplomaticStatus.Neutral:
          // Consider declaring war if we're strong and relations are bad
          if (score < -30 && myStrength > theirStrength * 1.3) {
            this.diplomacy.declareWar(this.playerId, otherId);
          }
          // Consider offering peace if relations are okay
          else if (score > 0) {
            this.diplomacy.offerPeace(this.playerId, otherId);
          }
          break;

        case DiplomaticStatus.War:
          // Consider offering peace if losing badly
          if (myStrength < theirStrength * 0.6 || myStrength < 3) {
            this.diplomacy.offerPeace(this.playerId, otherId);
          }
          break;

        case DiplomaticStatus.Peace:
          // Consider alliance if high relations and both strong
          if (score > 30 && myStrength > 4 && theirStrength > 3) {
            this.diplomacy.proposeAlliance(this.playerId, otherId);
          }
          // Consider war if very negative relations and we're stronger
          if (score < -40 && myStrength > theirStrength * 1.5) {
            if (this.diplomacy.canBreakTreaty(this.playerId, otherId)) {
              this.diplomacy.declareWar(this.playerId, otherId);
            }
          }
          // Hard AI: send tribute to improve relations toward alliance
          if (this.difficulty === 'hard' && score > 10 && score < 40) {
            const player = this.world.players.get(this.playerId);
            if (player && player.resources.gold > 150) {
              this.diplomacy.sendTribute(this.playerId, otherId, { gold: 30 });
            }
          }
          break;

        case DiplomaticStatus.Alliance:
          // Hard AI: break alliance if ally is weak and we're dominant
          if (this.difficulty === 'hard' && theirStrength < 2 && myStrength > 10) {
            if (this.diplomacy.canBreakTreaty(this.playerId, otherId)) {
              this.diplomacy.breakAlliance(this.playerId, otherId);
            }
          }
          break;
      }
    }
  }

  private shouldAcceptProposal(proposal: { from: number; type: string }): boolean {
    if (!this.diplomacy) return false;

    const score = this.diplomacy.getScore(this.playerId, proposal.from);
    const thresholds = AI_ACCEPT_THRESHOLDS[this.difficulty];
    const myStrength = this.getMilitaryStrength(this.playerId);
    const theirStrength = this.getMilitaryStrength(proposal.from);

    switch (proposal.type) {
      case 'peace':
        // More likely to accept if we're weaker
        const peaceBonus = myStrength < theirStrength ? 20 : 0;
        return score + peaceBonus >= thresholds.peace;
      case 'alliance':
        return score >= thresholds.alliance;
      case 'tribute_offer':
        return true; // always accept free stuff
      case 'tribute_request':
        return score >= thresholds.tribute;
      default:
        return false;
    }
  }

  private getMilitaryStrength(playerId: number): number {
    let strength = 0;
    for (const e of this.world.entities.values()) {
      if (e.owner !== playerId || e.type !== 'unit' || e.state === 'dead') continue;
      const cfg = UNITS[e.key];
      if (!cfg) continue;
      // Weight by combat value
      if (e.key === 'villager') strength += 0.3;
      else if (e.key === 'militia') strength += 1;
      else if (e.key === 'archer') strength += 1.2;
      else if (e.key === 'knight') strength += 2;
      else strength += 1;
    }
    return strength;
  }

  // ─── Phases ──────────────────────────────────────────────

  private decidePhase() {
    const units = this.getMyUnits();
    const villagers = units.filter((e) => e.key === 'villager');
    const military = units.filter((e) => e.key !== 'villager');
    const buildings = this.getMyBuildings();
    const hasBarracks = buildings.some((b) => b.key === 'barracks' && (b.buildProgress ?? 1) >= 1);

    if (villagers.length < 4 || !hasBarracks) {
      this.phase = 'economy';
    } else if (military.length < this.attackWaveSize) {
      this.phase = 'military';
    } else {
      this.phase = 'attack';
    }
  }

  private doEconomy() {
    const buildings = this.getMyBuildings();
    const units = this.getMyUnits();
    const villagers = units.filter((e) => e.key === 'villager');
    const player = this.world.players.get(this.playerId);
    if (!player) return;

    // Try to advance age if affordable and not already advancing
    if (player.age < AGES.length && player.ageProgress < 0) {
      const nextAge = AGES[player.age];
      if (this.economy.canAfford(this.playerId, nextAge.cost) && villagers.length >= 4) {
        this.economy.startAgeAdvance(this.playerId);
      }
    }

    const tc = buildings.find((b) => b.key === 'townCenter' && (b.buildProgress ?? 1) >= 1);
    if (tc && villagers.length < this.cfg.vilTarget && player.popUsed < player.popCap) {
      this.tryTrain(tc, 'villager');
    }

    if (player.popCap - player.popUsed <= 2) {
      this.tryBuild('house', villagers);
    }

    const hasBarracks = buildings.some((b) => b.key === 'barracks' && (b.buildProgress ?? 1) >= 1);
    if (!hasBarracks && villagers.length >= 3) {
      if (!buildings.some((b) => b.key === 'barracks')) {
        this.tryBuild('barracks', villagers);
      }
    }

    const hasArchery = buildings.some((b) => b.key === 'archeryRange');
    if (!hasArchery && hasBarracks && player.resources.wood >= 200) {
      this.tryBuild('archeryRange', villagers);
    }
  }

  private doMilitary() {
    const buildings = this.getMyBuildings();
    const units = this.getMyUnits();
    const player = this.world.players.get(this.playerId);
    if (!player) return;

    const militia = units.filter((e) => e.key === 'militia');
    const archers = units.filter((e) => e.key === 'archer');
    const knights = units.filter((e) => e.key === 'knight');

    const barracks = buildings.find((b) => b.key === 'barracks' && (b.buildProgress ?? 1) >= 1);
    if (barracks && player.popUsed < player.popCap) {
      if (militia.length < this.cfg.milTarget) this.tryTrain(barracks, 'militia');
      else if (knights.length < this.cfg.knightTarget && player.resources.gold >= 75) this.tryTrain(barracks, 'knight');
    }

    const archery = buildings.find((b) => b.key === 'archeryRange' && (b.buildProgress ?? 1) >= 1);
    if (archery && archers.length < this.cfg.archTarget && player.popUsed < player.popCap) {
      this.tryTrain(archery, 'archer');
    }

    const tc = buildings.find((b) => b.key === 'townCenter' && (b.buildProgress ?? 1) >= 1);
    const villagers = units.filter((e) => e.key === 'villager');
    if (tc && villagers.length < this.cfg.vilTarget && player.popUsed < player.popCap) {
      this.tryTrain(tc, 'villager');
    }

    if (player.popCap - player.popUsed <= 3) {
      this.tryBuild('house', villagers);
    }
  }

  private doAttack() {
    const units = this.getMyUnits();
    const military = units.filter((e) => e.key !== 'villager' && e.state === 'idle');

    if (military.length < 3) return;

    const enemyTarget = this.findEnemyTarget();
    if (!enemyTarget) return;

    for (const unit of military) {
      this.commands.issueCommand([unit.id], { type: 'attack', targetId: enemyTarget.id });
    }

    this.hasAttacked = true;
    this.attackWaveSize += 2;
  }

  private assignIdleVillagers() {
    const units = this.getMyUnits();
    const idleVillagers = units.filter((e) => e.key === 'villager' && e.state === 'idle');

    for (const villager of idleVillagers) {
      const resource = this.findNearestResource(villager);
      if (resource) {
        this.commands.issueCommand([villager.id], { type: 'gather', targetId: resource.id });
      }
    }
  }

  private defendBase() {
    const buildings = this.getMyBuildings();
    const tc = buildings.find((b) => b.key === 'townCenter');
    if (!tc) return;

    // Only count players at war as threats
    const nearbyEnemies = this.world.getEntitiesInRadius(tc.x, tc.y, 200)
      .filter((e) => {
        if (e.owner === this.playerId || e.owner === -1 || e.type !== 'unit' || e.state === 'dead') return false;
        if (this.diplomacy && !this.diplomacy.areAtWar(this.playerId, e.owner)) return false;
        return true;
      });

    if (nearbyEnemies.length === 0) return;

    const units = this.getMyUnits();
    const defenders = units.filter((e) => e.key !== 'villager' && (e.state === 'idle' || e.state === 'moving'));

    if (defenders.length > 0) {
      const target = nearbyEnemies[0];
      for (const unit of defenders) {
        this.commands.issueCommand([unit.id], { type: 'attack', targetId: target.id });
      }
    }

    if (defenders.length === 0 && nearbyEnemies.length >= 3) {
      const villagers = units.filter((e) => e.key === 'villager' && e.state !== 'dead');
      const target = nearbyEnemies[0];
      for (const v of villagers) {
        this.commands.issueCommand([v.id], { type: 'attack', targetId: target.id });
      }
    }
  }

  // ─── Helpers ─────────────────────────────────────────────

  private tryTrain(building: EntityData, unitKey: string) {
    const config = UNITS[unitKey];
    if (!config) return;
    if (!this.economy.canAfford(this.playerId, config.cost)) return;
    if ((building.trainQueue?.length ?? 0) >= 3) return;

    this.economy.spend(this.playerId, config.cost);
    if (!building.trainQueue) building.trainQueue = [];
    building.trainQueue.push({ unitKey, progress: 0, trainTime: config.trainTime });
  }

  private tryBuild(buildingKey: string, villagers: EntityData[]) {
    const config = BUILDINGS[buildingKey];
    if (!config) return;
    if (!this.economy.canAfford(this.playerId, config.cost)) return;

    const builder = villagers.find((v) => v.state === 'idle' || v.state === 'gathering');
    if (!builder) return;

    this.economy.spend(this.playerId, config.cost);

    const buildings = this.getMyBuildings();
    const tc = buildings.find((b) => b.key === 'townCenter');
    const baseX = tc ? tc.x : builder.x;
    const baseY = tc ? tc.y : builder.y;

    const bEntity = this.world.spawnEntity(
      'building', buildingKey, this.playerId,
      baseX + (Math.random() - 0.5) * 120,
      baseY + (Math.random() - 0.5) * 120 + 60,
      config.hp
    );
    bEntity.trainQueue = [];
    bEntity.buildProgress = 0;
    bEntity.hp = 1;
    bEntity.maxHp = config.hp;

    builder.commandQueue = [{ type: 'build', targetId: bEntity.id }];
    builder.state = 'building';
    builder.target = bEntity.id;
  }

  private findNearestResource(entity: EntityData): EntityData | null {
    const player = this.world.players.get(this.playerId);
    if (!player) return null;

    let preferredTypes: string[];
    if (player.resources.food < 100) preferredTypes = ['food', 'wood', 'gold', 'stone'];
    else if (player.resources.wood < 80) preferredTypes = ['wood', 'food', 'gold', 'stone'];
    else if (player.resources.gold < 50) preferredTypes = ['gold', 'food', 'wood', 'stone'];
    else preferredTypes = ['food', 'wood', 'gold', 'stone'];

    for (const resType of preferredTypes) {
      let closest: EntityData | null = null;
      let closestDist = Infinity;
      for (const e of this.world.entities.values()) {
        if (e.type !== 'resource' || e.state === 'dead' || e.key !== resType) continue;
        const dx = e.x - entity.x;
        const dy = e.y - entity.y;
        const dist = dx * dx + dy * dy;
        if (dist < closestDist) { closestDist = dist; closest = e; }
      }
      if (closest) return closest;
    }
    return null;
  }

  private findEnemyTarget(): EntityData | null {
    const myBuildings = this.getMyBuildings();
    const tc = myBuildings.find((b) => b.key === 'townCenter');
    const baseX = tc?.x ?? this.world.mapWidth / 2;
    const baseY = tc?.y ?? this.world.mapHeight / 2;

    let closest: EntityData | null = null;
    let closestDist = Infinity;

    // Only target players at war
    for (const e of this.world.entities.values()) {
      if (e.owner === this.playerId || e.owner === -1 || e.state === 'dead') continue;
      if (this.diplomacy && !this.diplomacy.areAtWar(this.playerId, e.owner)) continue;

      const dx = e.x - baseX;
      const dy = e.y - baseY;
      const dist = dx * dx + dy * dy;
      // Prefer buildings
      const priority = e.type === 'building' ? dist * 0.5 : dist;
      if (priority < closestDist) { closestDist = priority; closest = e; }
    }

    return closest;
  }

  private getMyUnits(): EntityData[] {
    return [...this.world.entities.values()].filter(
      (e) => e.owner === this.playerId && e.type === 'unit' && e.state !== 'dead'
    );
  }

  private getMyBuildings(): EntityData[] {
    return [...this.world.entities.values()].filter(
      (e) => e.owner === this.playerId && e.type === 'building' && e.state !== 'dead'
    );
  }
}
