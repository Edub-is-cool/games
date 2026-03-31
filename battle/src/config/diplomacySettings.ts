export enum DiplomaticStatus {
  War = 'war',
  Neutral = 'neutral',
  Peace = 'peace',
  Alliance = 'alliance',
}

// Minimum time (seconds) a treaty must last before it can be broken
export const TREATY_DURATIONS: Record<string, number> = {
  peace: 90,
  alliance: 120,
};

// Relation score changes for various events
export const RELATION_DELTAS = {
  declared_war: -30,
  offered_peace: 5,
  peace_accepted: 15,
  peace_rejected: -5,
  proposed_alliance: 5,
  alliance_accepted: 20,
  alliance_rejected: -5,
  broke_alliance: -40,
  broke_peace_early: -25,
  sent_tribute: 8,        // per 50 resource value
  tribute_rejected: -3,
  killed_unit: -2,
  killed_building: -5,
  embargo_set: -15,
  embargo_lifted: 5,
  passive_decay_rate: 0.3, // per second, decays toward 0
};

// Trade trickle rates (resources per second)
export const TRADE_RATES: Record<string, { food: number; wood: number; gold: number; stone: number }> = {
  peace: { food: 0.05, wood: 0.05, gold: 0.02, stone: 0.01 },
  alliance: { food: 0.12, wood: 0.12, gold: 0.06, stone: 0.03 },
};

// AI thresholds for accepting proposals (minimum relation score needed)
export const AI_ACCEPT_THRESHOLDS = {
  easy: { peace: -30, alliance: 10, tribute: -10 },
  normal: { peace: -10, alliance: 25, tribute: 5 },
  hard: { peace: 10, alliance: 40, tribute: 20 },
};

// Status display colors
export const STATUS_COLORS: Record<DiplomaticStatus, string> = {
  [DiplomaticStatus.War]: '#cc3333',
  [DiplomaticStatus.Neutral]: '#888888',
  [DiplomaticStatus.Peace]: '#44aacc',
  [DiplomaticStatus.Alliance]: '#44cc44',
};

export const STATUS_LABELS: Record<DiplomaticStatus, string> = {
  [DiplomaticStatus.War]: 'WAR',
  [DiplomaticStatus.Neutral]: 'NEUTRAL',
  [DiplomaticStatus.Peace]: 'PEACE',
  [DiplomaticStatus.Alliance]: 'ALLIANCE',
};
