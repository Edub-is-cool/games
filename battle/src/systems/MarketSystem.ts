import { GameWorld } from './GameWorld';

type TradeableResource = 'food' | 'wood' | 'stone';

const BASE_RATES: Record<TradeableResource, number> = {
  food: 100,
  wood: 100,
  stone: 150,
};

const PRICE_CHANGE_PER_TRADE = 0.05; // 5% per buy/sell
const SPREAD = 0.20; // buy price is 20% higher than sell price
const DRIFT_RATE = 0.01; // 1% drift back toward base per second
const TRADE_ROUTE_GOLD_PER_SEC = 0.1; // per 100 distance
const TRADE_ROUTE_CAP = 1.0; // max gold/sec per route

interface TradeRoute {
  marketA: number; // entity id
  marketB: number; // entity id
  goldPerSec: number;
}

export class MarketSystem {
  /** Current mid-price for each tradeable resource (in gold). */
  private prices: Record<TradeableResource, number> = {
    food: BASE_RATES.food,
    wood: BASE_RATES.wood,
    stone: BASE_RATES.stone,
  };

  /** Active trade routes, recomputed periodically. */
  private tradeRoutes: TradeRoute[] = [];

  /** Seconds since last trade-route recalc. */
  private routeRecalcTimer = 0;
  private readonly ROUTE_RECALC_INTERVAL = 5; // recalc every 5 seconds

  /** Alliance lookup — callers can set this to enable allied trade routes. */
  allies: Map<number, Set<number>> = new Map();

  constructor(private world: GameWorld) {}

  // ---------------------------------------------------------------------------
  // Public queries
  // ---------------------------------------------------------------------------

  /**
   * Returns the buy and sell price for a tradeable resource.
   * Buy price = mid * (1 + spread/2), sell price = mid * (1 - spread/2).
   */
  getExchangeRate(resource: TradeableResource): { buy: number; sell: number } {
    const mid = this.prices[resource];
    return {
      buy: Math.round(mid * (1 + SPREAD / 2)),
      sell: Math.round(mid * (1 - SPREAD / 2)),
    };
  }

  /** Returns true if the player owns at least one completed market building. */
  hasMarket(playerId: number): boolean {
    for (const entity of this.world.entities.values()) {
      if (
        entity.owner === playerId &&
        entity.key === 'market' &&
        entity.type === 'building' &&
        entity.state !== 'dead' &&
        (entity.buildProgress === undefined || entity.buildProgress >= 1)
      ) {
        return true;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Buy / Sell
  // ---------------------------------------------------------------------------

  /**
   * Buy `amount` of a resource using gold.
   * Returns the gold cost actually spent, or 0 if the transaction failed.
   */
  buyResource(
    playerId: number,
    resource: TradeableResource,
    amount: number,
  ): number {
    if (amount <= 0) return 0;
    if (!this.hasMarket(playerId)) return 0;

    const player = this.world.players.get(playerId);
    if (!player) return 0;

    const { buy: pricePerUnit } = this.getExchangeRate(resource);
    const totalGoldCost = pricePerUnit * amount;

    if (player.resources.gold < totalGoldCost) return 0;

    player.resources.gold -= totalGoldCost;
    player.resources[resource] += amount;

    // Buying drives the price up
    this.prices[resource] *= 1 + PRICE_CHANGE_PER_TRADE * amount;

    return totalGoldCost;
  }

  /**
   * Sell `amount` of a resource in exchange for gold.
   * Returns the gold received, or 0 if the transaction failed.
   */
  sellResource(
    playerId: number,
    resource: TradeableResource,
    amount: number,
  ): number {
    if (amount <= 0) return 0;
    if (!this.hasMarket(playerId)) return 0;

    const player = this.world.players.get(playerId);
    if (!player) return 0;

    if (player.resources[resource] < amount) return 0;

    const { sell: pricePerUnit } = this.getExchangeRate(resource);
    const totalGoldReceived = pricePerUnit * amount;

    player.resources[resource] -= amount;
    player.resources.gold += totalGoldReceived;

    // Selling drives the price down
    this.prices[resource] *= 1 - PRICE_CHANGE_PER_TRADE * amount;
    // Clamp to a minimum so prices never go negative
    if (this.prices[resource] < 1) this.prices[resource] = 1;

    return totalGoldReceived;
  }

  // ---------------------------------------------------------------------------
  // Update (called every frame)
  // ---------------------------------------------------------------------------

  update(delta: number): void {
    const dt = delta / 1000; // convert ms to seconds

    // --- Price drift back toward base rates ---
    for (const res of Object.keys(BASE_RATES) as TradeableResource[]) {
      const base = BASE_RATES[res];
      const current = this.prices[res];
      if (current !== base) {
        const diff = base - current;
        // Move toward base by DRIFT_RATE * current per second
        const step = current * DRIFT_RATE * dt;
        if (Math.abs(diff) <= step) {
          this.prices[res] = base;
        } else {
          this.prices[res] += Math.sign(diff) * step;
        }
      }
    }

    // --- Recalculate trade routes periodically ---
    this.routeRecalcTimer += dt;
    if (this.routeRecalcTimer >= this.ROUTE_RECALC_INTERVAL) {
      this.routeRecalcTimer = 0;
      this.recalcTradeRoutes();
    }

    // --- Distribute trade-route gold ---
    for (const route of this.tradeRoutes) {
      const marketA = this.world.entities.get(route.marketA);
      const marketB = this.world.entities.get(route.marketB);
      if (!marketA || !marketB) continue;
      if (marketA.state === 'dead' || marketB.state === 'dead') continue;

      const goldEarned = route.goldPerSec * dt;

      // Both market owners benefit
      const ownerA = this.world.players.get(marketA.owner);
      const ownerB = this.world.players.get(marketB.owner);
      if (ownerA) ownerA.resources.gold += goldEarned;
      if (ownerB && marketB.owner !== marketA.owner) {
        ownerB.resources.gold += goldEarned;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private recalcTradeRoutes(): void {
    this.tradeRoutes = [];

    // Gather all completed markets
    const markets: { id: number; owner: number; x: number; y: number }[] = [];
    for (const entity of this.world.entities.values()) {
      if (
        entity.key === 'market' &&
        entity.type === 'building' &&
        entity.state !== 'dead' &&
        (entity.buildProgress === undefined || entity.buildProgress >= 1)
      ) {
        markets.push({ id: entity.id, owner: entity.owner, x: entity.x, y: entity.y });
      }
    }

    // Build routes: pairs of markets owned by the same player,
    // or by allied players.
    const seen = new Set<string>();
    for (let i = 0; i < markets.length; i++) {
      for (let j = i + 1; j < markets.length; j++) {
        const a = markets[i];
        const b = markets[j];

        // Must be same owner or allies
        if (a.owner !== b.owner && !this.areAllied(a.owner, b.owner)) continue;

        const key = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        const goldPerSec = Math.min(
          TRADE_ROUTE_GOLD_PER_SEC * (distance / 100),
          TRADE_ROUTE_CAP,
        );

        this.tradeRoutes.push({
          marketA: a.id,
          marketB: b.id,
          goldPerSec,
        });
      }
    }
  }

  private areAllied(playerA: number, playerB: number): boolean {
    const alliesA = this.allies.get(playerA);
    return alliesA !== undefined && alliesA.has(playerB);
  }

  // ---------------------------------------------------------------------------
  // Debug / introspection
  // ---------------------------------------------------------------------------

  /** Returns a snapshot of current prices (mid-prices). */
  getPrices(): Record<TradeableResource, number> {
    return { ...this.prices };
  }

  /** Returns active trade routes. */
  getTradeRoutes(): readonly TradeRoute[] {
    return this.tradeRoutes;
  }
}
