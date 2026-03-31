import { GameWorld } from './GameWorld';

export interface PolicyEffect {
  type:
    | 'gather_mult'
    | 'train_speed'
    | 'build_speed'
    | 'combat_mult'
    | 'income_mult'
    | 'cost_mult'
    | 'pop_bonus';
  resource?: string;
  value: number;
}

export interface Policy {
  id: string;
  name: string;
  category: string;
  description: string;
  effects: PolicyEffect[];
}

export const POLICIES: Record<string, Policy> = {
  // Economy
  free_market: {
    id: 'free_market',
    name: 'Free Market',
    category: 'economy',
    description: '+20% gold gathering, -10% food gathering',
    effects: [
      { type: 'gather_mult', resource: 'gold', value: 0.2 },
      { type: 'gather_mult', resource: 'food', value: -0.1 },
    ],
  },
  collectivism: {
    id: 'collectivism',
    name: 'Collectivism',
    category: 'economy',
    description: '+15% all resource gathering',
    effects: [
      { type: 'gather_mult', resource: 'food', value: 0.15 },
      { type: 'gather_mult', resource: 'wood', value: 0.15 },
      { type: 'gather_mult', resource: 'gold', value: 0.15 },
      { type: 'gather_mult', resource: 'stone', value: 0.15 },
    ],
  },
  mercantilism: {
    id: 'mercantilism',
    name: 'Mercantilism',
    category: 'economy',
    description: '+30% trade income',
    effects: [
      { type: 'income_mult', resource: 'trade', value: 0.3 },
    ],
  },

  // Military
  conscription_policy: {
    id: 'conscription_policy',
    name: 'Conscription',
    category: 'military',
    description: 'Train units 25% faster, -10% unit HP',
    effects: [
      { type: 'train_speed', value: 0.25 },
      { type: 'combat_mult', resource: 'hp', value: -0.1 },
    ],
  },
  professional_army: {
    id: 'professional_army',
    name: 'Professional Army',
    category: 'military',
    description: '+15% unit HP, train 25% slower',
    effects: [
      { type: 'combat_mult', resource: 'hp', value: 0.15 },
      { type: 'train_speed', value: -0.25 },
    ],
  },
  militia_levy: {
    id: 'militia_levy',
    name: 'Militia Levy',
    category: 'military',
    description: 'Free militia spawned on a timer',
    effects: [
      { type: 'train_speed', resource: 'militia', value: 1.0 },
    ],
  },

  // Labor
  slavery: {
    id: 'slavery',
    name: 'Slavery',
    category: 'labor',
    description: 'Build 40% faster',
    effects: [
      { type: 'build_speed', value: 0.4 },
    ],
  },
  free_labor: {
    id: 'free_labor',
    name: 'Free Labor',
    category: 'labor',
    description: 'Building costs reduced by 20%',
    effects: [
      { type: 'cost_mult', resource: 'building', value: -0.2 },
    ],
  },
  serfdom: {
    id: 'serfdom',
    name: 'Serfdom',
    category: 'labor',
    description: '+25% gathering, -30% movement speed',
    effects: [
      { type: 'gather_mult', resource: 'food', value: 0.25 },
      { type: 'gather_mult', resource: 'wood', value: 0.25 },
      { type: 'gather_mult', resource: 'gold', value: 0.25 },
      { type: 'gather_mult', resource: 'stone', value: 0.25 },
      { type: 'combat_mult', resource: 'move_speed', value: -0.3 },
    ],
  },

  // Governance
  monarchy: {
    id: 'monarchy',
    name: 'Monarchy',
    category: 'governance',
    description: 'Great people generation +30%',
    effects: [
      { type: 'income_mult', resource: 'great_people', value: 0.3 },
    ],
  },
  republic: {
    id: 'republic',
    name: 'Republic',
    category: 'governance',
    description: '+10% all income',
    effects: [
      { type: 'income_mult', value: 0.1 },
    ],
  },
  theocracy: {
    id: 'theocracy',
    name: 'Theocracy',
    category: 'governance',
    description: '+20% combat near cities',
    effects: [
      { type: 'combat_mult', resource: 'near_city', value: 0.2 },
    ],
  },

  // Culture
  tradition: {
    id: 'tradition',
    name: 'Tradition',
    category: 'culture',
    description: '+1 population per age advance',
    effects: [
      { type: 'pop_bonus', value: 1 },
    ],
  },
  liberty: {
    id: 'liberty',
    name: 'Liberty',
    category: 'culture',
    description: 'Settlers cost 50% less',
    effects: [
      { type: 'cost_mult', resource: 'settler', value: -0.5 },
    ],
  },
  honor: {
    id: 'honor',
    name: 'Honor',
    category: 'culture',
    description: '+50% XP gain, +100% gold from kills',
    effects: [
      { type: 'combat_mult', resource: 'xp', value: 0.5 },
      { type: 'income_mult', resource: 'kill_gold', value: 1.0 },
    ],
  },
};

const CATEGORIES = ['economy', 'military', 'labor', 'governance', 'culture'] as const;

export class PolicySystem {
  private world: GameWorld;

  // playerId -> category -> policyId
  private selectedPolicies: Map<number, Map<string, string>> = new Map();

  // playerId -> category -> last age when changed
  private lastChangeAge: Map<number, Map<string, number>> = new Map();

  constructor(world: GameWorld) {
    this.world = world;
  }

  setPolicy(playerId: number, category: string, policyId: string): boolean {
    // Validate category
    if (!(CATEGORIES as readonly string[]).includes(category)) return false;

    // Validate policy exists and matches category
    const policy = POLICIES[policyId];
    if (!policy || policy.category !== category) return false;

    // Check age restriction: can only change once per age
    const player = this.world.players.get(playerId);
    if (!player) return false;

    if (!this.lastChangeAge.has(playerId)) {
      this.lastChangeAge.set(playerId, new Map());
    }
    const playerAges = this.lastChangeAge.get(playerId)!;
    const lastAge = playerAges.get(category);
    if (lastAge !== undefined && lastAge >= player.age) {
      return false; // Already changed this category in the current age
    }

    // Set the policy
    if (!this.selectedPolicies.has(playerId)) {
      this.selectedPolicies.set(playerId, new Map());
    }
    this.selectedPolicies.get(playerId)!.set(category, policyId);
    playerAges.set(category, player.age);

    return true;
  }

  getPolicy(playerId: number, category: string): string | null {
    return this.selectedPolicies.get(playerId)?.get(category) ?? null;
  }

  getPolicies(playerId: number): Map<string, string> {
    return this.selectedPolicies.get(playerId) ?? new Map();
  }

  getAllEffects(playerId: number): PolicyEffect[] {
    const effects: PolicyEffect[] = [];
    const policies = this.selectedPolicies.get(playerId);
    if (!policies) return effects;

    for (const policyId of policies.values()) {
      const policy = POLICIES[policyId];
      if (policy) {
        effects.push(...policy.effects);
      }
    }

    return effects;
  }

  getEffectValue(playerId: number, effectType: PolicyEffect['type'], resource?: string): number {
    const effects = this.getAllEffects(playerId);
    let total = 0;
    for (const effect of effects) {
      if (effect.type === effectType) {
        if (resource === undefined || effect.resource === resource || effect.resource === undefined) {
          total += effect.value;
        }
      }
    }
    return total;
  }
}
