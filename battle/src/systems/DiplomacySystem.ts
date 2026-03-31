import { GameWorld, Resources } from './GameWorld';
import { EconomySystem } from './EconomySystem';
import {
  DiplomaticStatus,
  TREATY_DURATIONS,
  RELATION_DELTAS,
  TRADE_RATES,
} from '../config/diplomacySettings';

export interface RelationshipPair {
  status: DiplomaticStatus;
  score: number; // -100 to +100
  treatyStartTime: number;
  treatyMinDuration: number;
  embargoActive: boolean;
}

export type ProposalType = 'peace' | 'alliance' | 'tribute_offer' | 'tribute_request';

export interface DiplomacyProposal {
  id: number;
  from: number;
  to: number;
  type: ProposalType;
  resources?: Partial<Resources>;
  timestamp: number;
}

export interface DiplomacyEvent {
  message: string;
  color: string;
  time: number;
}

let nextProposalId = 1;

export class DiplomacySystem {
  private relationships: Map<string, RelationshipPair> = new Map();
  pendingProposals: DiplomacyProposal[] = [];
  events: DiplomacyEvent[] = []; // notifications
  private gameTime = 0;

  constructor(
    private world: GameWorld,
    private economy: EconomySystem
  ) {
    // Initialize all player pairs to neutral
    const playerIds = [...this.world.players.keys()];
    for (let i = 0; i < playerIds.length; i++) {
      for (let j = i + 1; j < playerIds.length; j++) {
        this.setRelation(playerIds[i], playerIds[j], {
          status: DiplomaticStatus.Neutral,
          score: 0,
          treatyStartTime: 0,
          treatyMinDuration: 0,
          embargoActive: false,
        });
      }
    }
  }

  private pairKey(a: number, b: number): string {
    return `${Math.min(a, b)}-${Math.max(a, b)}`;
  }

  private setRelation(a: number, b: number, rel: RelationshipPair) {
    this.relationships.set(this.pairKey(a, b), rel);
  }

  getRelation(a: number, b: number): RelationshipPair {
    return this.relationships.get(this.pairKey(a, b)) ?? {
      status: DiplomaticStatus.Neutral,
      score: 0,
      treatyStartTime: 0,
      treatyMinDuration: 0,
      embargoActive: false,
    };
  }

  getStatus(a: number, b: number): DiplomaticStatus {
    return this.getRelation(a, b).status;
  }

  getScore(a: number, b: number): number {
    return this.getRelation(a, b).score;
  }

  modifyScore(a: number, b: number, delta: number) {
    const rel = this.getRelation(a, b);
    rel.score = Math.max(-100, Math.min(100, rel.score + delta));
    this.setRelation(a, b, rel);
  }

  areAllied(a: number, b: number): boolean {
    return this.getStatus(a, b) === DiplomaticStatus.Alliance;
  }

  areAtWar(a: number, b: number): boolean {
    return this.getStatus(a, b) === DiplomaticStatus.War;
  }

  arePeaceful(a: number, b: number): boolean {
    const s = this.getStatus(a, b);
    return s === DiplomaticStatus.Peace || s === DiplomaticStatus.Alliance;
  }

  canBreakTreaty(a: number, b: number): boolean {
    const rel = this.getRelation(a, b);
    if (rel.treatyMinDuration <= 0) return true;
    return (this.gameTime - rel.treatyStartTime) >= rel.treatyMinDuration;
  }

  // ─── Actions ─────────────────────────────────────────────

  declareWar(attacker: number, target: number) {
    const rel = this.getRelation(attacker, target);
    if (rel.status === DiplomaticStatus.War) return;

    const wasAllied = rel.status === DiplomaticStatus.Alliance;
    const wasPeace = rel.status === DiplomaticStatus.Peace;
    const brokeEarly = !this.canBreakTreaty(attacker, target);

    rel.status = DiplomaticStatus.War;
    rel.treatyStartTime = 0;
    rel.treatyMinDuration = 0;
    rel.embargoActive = false;
    this.setRelation(attacker, target, rel);

    this.modifyScore(attacker, target, RELATION_DELTAS.declared_war);
    if (wasAllied) this.modifyScore(attacker, target, RELATION_DELTAS.broke_alliance);
    if (brokeEarly && (wasAllied || wasPeace)) {
      this.modifyScore(attacker, target, RELATION_DELTAS.broke_peace_early);
    }

    this.addEvent(`Player ${attacker} declared WAR on Player ${target}!`, '#cc3333');
  }

  offerPeace(from: number, to: number) {
    const rel = this.getRelation(from, to);
    if (rel.status !== DiplomaticStatus.War && rel.status !== DiplomaticStatus.Neutral) return;

    // Don't duplicate proposals
    if (this.pendingProposals.some((p) => p.from === from && p.to === to && p.type === 'peace')) return;

    this.pendingProposals.push({
      id: nextProposalId++, from, to, type: 'peace', timestamp: this.gameTime,
    });
    this.modifyScore(from, to, RELATION_DELTAS.offered_peace);
    this.addEvent(`Player ${from} offers peace to Player ${to}`, '#44aacc');
  }

  proposeAlliance(from: number, to: number) {
    const rel = this.getRelation(from, to);
    if (rel.status !== DiplomaticStatus.Peace) return;

    if (this.pendingProposals.some((p) => p.from === from && p.to === to && p.type === 'alliance')) return;

    this.pendingProposals.push({
      id: nextProposalId++, from, to, type: 'alliance', timestamp: this.gameTime,
    });
    this.modifyScore(from, to, RELATION_DELTAS.proposed_alliance);
    this.addEvent(`Player ${from} proposes alliance to Player ${to}`, '#44cc44');
  }

  breakAlliance(player: number, ally: number) {
    const rel = this.getRelation(player, ally);
    if (rel.status !== DiplomaticStatus.Alliance) return;

    rel.status = DiplomaticStatus.Neutral;
    rel.treatyStartTime = 0;
    rel.treatyMinDuration = 0;
    this.setRelation(player, ally, rel);
    this.modifyScore(player, ally, RELATION_DELTAS.broke_alliance);
    this.addEvent(`Player ${player} broke alliance with Player ${ally}`, '#cc8833');
  }

  sendTribute(from: number, to: number, resources: Partial<Resources>) {
    const fromPlayer = this.world.players.get(from);
    if (!fromPlayer) return false;

    // Check can afford
    for (const [key, amount] of Object.entries(resources)) {
      if ((amount ?? 0) > fromPlayer.resources[key as keyof Resources]) return false;
    }

    // Transfer
    for (const [key, amount] of Object.entries(resources)) {
      if (!amount) continue;
      fromPlayer.resources[key as keyof Resources] -= amount;
      const toPlayer = this.world.players.get(to);
      if (toPlayer) {
        toPlayer.resources[key as keyof Resources] += amount;
      }
    }

    // Relation boost proportional to value
    const totalValue = Object.values(resources).reduce((s, v) => s + (v ?? 0), 0);
    const boosts = Math.floor(totalValue / 50);
    this.modifyScore(from, to, RELATION_DELTAS.sent_tribute * Math.max(1, boosts));
    this.addEvent(`Player ${from} sent tribute to Player ${to}`, '#cccc44');
    return true;
  }

  requestTribute(from: number, to: number, resources: Partial<Resources>) {
    if (this.pendingProposals.some((p) => p.from === from && p.to === to && p.type === 'tribute_request')) return;

    this.pendingProposals.push({
      id: nextProposalId++, from, to, type: 'tribute_request', resources, timestamp: this.gameTime,
    });
  }

  setEmbargo(player: number, target: number) {
    const rel = this.getRelation(player, target);
    rel.embargoActive = true;
    this.setRelation(player, target, rel);
    this.modifyScore(player, target, RELATION_DELTAS.embargo_set);
    this.addEvent(`Player ${player} set embargo on Player ${target}`, '#cc8833');
  }

  liftEmbargo(player: number, target: number) {
    const rel = this.getRelation(player, target);
    rel.embargoActive = false;
    this.setRelation(player, target, rel);
    this.modifyScore(player, target, RELATION_DELTAS.embargo_lifted);
  }

  // ─── Proposal handling ───────────────────────────────────

  acceptProposal(proposalId: number) {
    const idx = this.pendingProposals.findIndex((p) => p.id === proposalId);
    if (idx === -1) return;
    const proposal = this.pendingProposals[idx];
    this.pendingProposals.splice(idx, 1);

    switch (proposal.type) {
      case 'peace': {
        const rel = this.getRelation(proposal.from, proposal.to);
        rel.status = DiplomaticStatus.Peace;
        rel.treatyStartTime = this.gameTime;
        rel.treatyMinDuration = TREATY_DURATIONS.peace;
        this.setRelation(proposal.from, proposal.to, rel);
        this.modifyScore(proposal.from, proposal.to, RELATION_DELTAS.peace_accepted);
        this.addEvent(`Peace between Player ${proposal.from} and Player ${proposal.to}!`, '#44aacc');
        break;
      }
      case 'alliance': {
        const rel = this.getRelation(proposal.from, proposal.to);
        rel.status = DiplomaticStatus.Alliance;
        rel.treatyStartTime = this.gameTime;
        rel.treatyMinDuration = TREATY_DURATIONS.alliance;
        this.setRelation(proposal.from, proposal.to, rel);
        this.modifyScore(proposal.from, proposal.to, RELATION_DELTAS.alliance_accepted);
        this.addEvent(`Alliance between Player ${proposal.from} and Player ${proposal.to}!`, '#44cc44');
        break;
      }
      case 'tribute_request': {
        if (proposal.resources) {
          this.sendTribute(proposal.to, proposal.from, proposal.resources);
        }
        break;
      }
      case 'tribute_offer': {
        if (proposal.resources) {
          this.sendTribute(proposal.from, proposal.to, proposal.resources);
        }
        break;
      }
    }
  }

  rejectProposal(proposalId: number) {
    const idx = this.pendingProposals.findIndex((p) => p.id === proposalId);
    if (idx === -1) return;
    const proposal = this.pendingProposals[idx];
    this.pendingProposals.splice(idx, 1);

    const deltas: Record<ProposalType, number> = {
      peace: RELATION_DELTAS.peace_rejected,
      alliance: RELATION_DELTAS.alliance_rejected,
      tribute_offer: 0,
      tribute_request: RELATION_DELTAS.tribute_rejected,
    };
    this.modifyScore(proposal.from, proposal.to, deltas[proposal.type]);
  }

  getPendingProposalsFor(playerId: number): DiplomacyProposal[] {
    return this.pendingProposals.filter((p) => p.to === playerId);
  }

  // ─── Combat callbacks ────────────────────────────────────

  onUnitKilled(killerOwner: number, victimOwner: number) {
    if (killerOwner < 0 || victimOwner < 0 || killerOwner === victimOwner) return;
    this.modifyScore(killerOwner, victimOwner, RELATION_DELTAS.killed_unit);
  }

  onBuildingDestroyed(destroyerOwner: number, victimOwner: number) {
    if (destroyerOwner < 0 || victimOwner < 0 || destroyerOwner === victimOwner) return;
    this.modifyScore(destroyerOwner, victimOwner, RELATION_DELTAS.killed_building);
  }

  // ─── Available actions ───────────────────────────────────

  getAvailableActions(from: number, to: number): string[] {
    const rel = this.getRelation(from, to);
    const actions: string[] = [];

    switch (rel.status) {
      case DiplomaticStatus.War:
        actions.push('offer_peace');
        break;
      case DiplomaticStatus.Neutral:
        actions.push('declare_war', 'offer_peace');
        break;
      case DiplomaticStatus.Peace:
        actions.push('declare_war', 'propose_alliance', 'send_tribute');
        if (!rel.embargoActive) actions.push('set_embargo');
        else actions.push('lift_embargo');
        break;
      case DiplomaticStatus.Alliance:
        actions.push('break_alliance', 'send_tribute');
        break;
    }

    return actions;
  }

  // ─── Update ──────────────────────────────────────────────

  update(delta: number, gameTime: number) {
    this.gameTime = gameTime;
    const dt = delta / 1000;

    // Trade trickle for peaceful/allied pairs
    for (const [key, rel] of this.relationships) {
      if (rel.embargoActive) continue;
      const rates = rel.status === DiplomaticStatus.Alliance
        ? TRADE_RATES.alliance
        : rel.status === DiplomaticStatus.Peace
          ? TRADE_RATES.peace
          : null;

      if (!rates) continue;

      const [aStr, bStr] = key.split('-');
      const a = parseInt(aStr);
      const b = parseInt(bStr);
      const playerA = this.world.players.get(a);
      const playerB = this.world.players.get(b);
      if (!playerA || !playerB) continue;

      // Both players get bonus resources (not transferred)
      for (const res of ['food', 'wood', 'gold', 'stone'] as const) {
        const amount = rates[res] * dt;
        playerA.resources[res] += amount;
        playerB.resources[res] += amount;
      }
    }

    // Passive relation decay toward 0
    for (const [, rel] of this.relationships) {
      if (Math.abs(rel.score) > 1) {
        const decay = RELATION_DELTAS.passive_decay_rate * dt;
        if (rel.score > 0) rel.score = Math.max(0, rel.score - decay);
        else rel.score = Math.min(0, rel.score + decay);
      }
    }

    // Expire old proposals (30 seconds)
    this.pendingProposals = this.pendingProposals.filter((p) => gameTime - p.timestamp < 30);

    // Trim old events (keep last 10 seconds)
    this.events = this.events.filter((e) => gameTime - e.time < 10);
  }

  // ─── Helpers ─────────────────────────────────────────────

  private addEvent(message: string, color: string) {
    this.events.push({ message, color, time: this.gameTime });
  }

  getAllRelationships(): { playerA: number; playerB: number; rel: RelationshipPair }[] {
    const result: { playerA: number; playerB: number; rel: RelationshipPair }[] = [];
    for (const [key, rel] of this.relationships) {
      const [a, b] = key.split('-').map(Number);
      result.push({ playerA: a, playerB: b, rel });
    }
    return result;
  }

  getSurvivingPlayers(): number[] {
    const alive: number[] = [];
    for (const [pid] of this.world.players) {
      const hasEntities = [...this.world.entities.values()].some(
        (e) => e.owner === pid && e.state !== 'dead'
      );
      if (hasEntities) alive.push(pid);
    }
    return alive;
  }
}
