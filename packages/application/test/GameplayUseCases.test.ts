import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  AdvanceMarketCycleUseCase,
  CityEvolutionService,
  EDUCATIONAL_REWARDS,
  EvaluateProgressionUseCase,
  FORBIDDEN_GAME_DESIGN_MECHANICS,
  GameEventService,
  GameLoopService,
  GetPlayerProgressUseCase,
  MentorFeedbackService,
  ProgressionService,
  RegisterGameEventUseCase,
  UnlockDistrictUseCase,
  UnlockService,
  createInitialPlayerProgress,
  type Clock,
  type GameEventRepository,
  type MarketDataProvider,
  type PlayerProgress,
  type PlayerProgressRepository,
} from "../src/index.js";
import { AssetType, MoneyCents, type GameEvent } from "@fortuna/domain";
import {
  AssetClass,
  EDUCATIONAL_MARKET_DATA_DISCLAIMER,
  LiquidityLevel,
  MarketDataProviderType,
  MarketDataSource,
  MarketRiskLevel,
  MarketSessionStatus,
  PriceStatus,
  YieldPeriodicity,
  YieldType,
  type Asset,
} from "../src/ports/MarketDataProvider.js";

class InMemoryGameEventRepository implements GameEventRepository {
  public readonly events: GameEvent[] = [];

  async append(event: GameEvent): Promise<void> {
    this.events.push(event);
  }

  async appendMany(events: GameEvent[]): Promise<void> {
    this.events.push(...events);
  }

  async listByPlayerId(playerId: string): Promise<GameEvent[]> {
    return this.events.filter((event) => event.playerId === playerId);
  }
}

class InMemoryPlayerProgressRepository implements PlayerProgressRepository {
  constructor(public progress?: PlayerProgress) {}

  async findByPlayerId(playerId: string): Promise<PlayerProgress | undefined> {
    return this.progress?.playerId === playerId ? this.progress : undefined;
  }

  async save(progress: PlayerProgress): Promise<void> {
    this.progress = progress;
  }
}

class StubMarketDataProvider implements MarketDataProvider {
  public refreshCalls = 0;
  private readonly asset: Asset = {
    id: "asset-tes1",
    symbol: "TES1",
    name: "Tesouro Fortuna",
    assetClass: AssetClass.FIXED_INCOME,
    currentPriceCents: 10_000,
    previousPriceCents: 9_900,
    variationBps: 101,
    riskLevel: MarketRiskLevel.LOW,
    liquidity: LiquidityLevel.DAILY,
    expectedYield: {
      yieldType: YieldType.FIXED_RATE,
      periodicity: YieldPeriodicity.MONTHLY,
      rateBps: 100,
      description: "Rendimento educativo simulado.",
    },
    educationalDescription: "Ativo educativo de renda fixa.",
    yieldRules: "Sem promessa de rentabilidade.",
    isMocked: true,
    priceStatus: PriceStatus.SIMULATED,
    dataSource: MarketDataSource.MOCK,
    updatedAt: now,
  };

  getProviderName(): string {
    return "StubMarketDataProvider";
  }

  getProviderType(): MarketDataProviderType {
    return MarketDataProviderType.MOCK;
  }

  async getQuotes() {
    return {
      quotes: [
        {
          symbol: this.asset.symbol,
          name: this.asset.name,
          priceCents: this.asset.currentPriceCents,
          previousPriceCents: this.asset.previousPriceCents,
          variationBps: this.asset.variationBps,
          currency: "BRL",
          marketTimestamp: now,
          updatedAt: now,
          priceStatus: this.asset.priceStatus,
          dataSource: this.asset.dataSource,
          trace: {
            source: "mock" as const,
            providerName: this.getProviderName(),
            isRealData: false,
            isCached: false,
            isFallback: false,
            fetchedAt: now,
            disclaimer: EDUCATIONAL_MARKET_DATA_DISCLAIMER,
          },
        },
      ],
      errors: [],
      trace: {
        source: "mock" as const,
        providerName: this.getProviderName(),
        isRealData: false,
        isCached: false,
        isFallback: false,
        fetchedAt: now,
        disclaimer: EDUCATIONAL_MARKET_DATA_DISCLAIMER,
      },
    };
  }

  async getHistoricalPrices() {
    return {
      symbol: this.asset.symbol,
      prices: [],
      errors: [],
      trace: {
        source: "mock" as const,
        providerName: this.getProviderName(),
        isRealData: false,
        isCached: false,
        isFallback: false,
        fetchedAt: now,
        disclaimer: EDUCATIONAL_MARKET_DATA_DISCLAIMER,
      },
    };
  }

  async listAssets(): Promise<Asset[]> {
    return [this.asset];
  }

  async getAssetById(): Promise<Asset | null> {
    return this.asset;
  }

  async getAsset(): Promise<Asset | undefined> {
    return this.asset;
  }

  async getCurrentPrice() {
    return {
      assetId: this.asset.id,
      symbol: this.asset.symbol,
      priceCents: this.asset.currentPriceCents,
      previousPriceCents: this.asset.previousPriceCents,
      variationBps: this.asset.variationBps,
      priceStatus: this.asset.priceStatus,
      dataSource: this.asset.dataSource,
      marketTimestamp: now,
      updatedAt: now,
    };
  }

  async getQuote() {
    return {
      symbol: this.asset.symbol,
      price: MoneyCents.fromCents(this.asset.currentPriceCents),
      asOf: now,
      provider: MarketDataSource.MOCK,
      priceStatus: PriceStatus.SIMULATED,
    };
  }

  async getPriceHistory() {
    return [];
  }

  async getExpectedYield() {
    return this.asset.expectedYield;
  }

  async getYieldInfo() {
    return this.asset.expectedYield;
  }

  async getEducationalInfo() {
    return undefined;
  }

  async refreshPrices(): Promise<Asset[]> {
    this.refreshCalls += 1;
    return [this.asset];
  }

  async getProviderStatus() {
    return {
      sessionStatus: MarketSessionStatus.SIMULATED,
      dataSource: MarketDataSource.MOCK,
      priceStatus: PriceStatus.SIMULATED,
      checkedAt: now,
    };
  }
}

const now = new Date("2026-05-22T12:00:00.000Z");
const clock: Clock = { now: () => now };
const playerId = "player-use-cases";
let nextId = 0;
const idGenerator = () => `game-event-${++nextId}`;

function makeServices(progress?: PlayerProgress) {
  const events = new InMemoryGameEventRepository();
  const playerProgress = new InMemoryPlayerProgressRepository(progress);
  const eventService = new GameEventService(clock, idGenerator);
  const progressionService = new ProgressionService(clock);
  const unlockService = new UnlockService();
  const cityEvolutionService = new CityEvolutionService();
  const mentorFeedbackService = new MentorFeedbackService();

  return {
    events,
    playerProgress,
    eventService,
    progressionService,
    unlockService,
    cityEvolutionService,
    mentorFeedbackService,
    loop: new GameLoopService(
      events,
      playerProgress,
      eventService,
      progressionService,
      unlockService,
      cityEvolutionService,
      mentorFeedbackService,
      clock,
    ),
  };
}

function portfolio(
  totalEquityCents: number,
  stockBasisPoints: number,
  positionCount = 1,
) {
  return {
    wallet: {
      availableBalance: MoneyCents.fromCents(totalEquityCents),
      investedValue: MoneyCents.zero(),
      totalEquity: MoneyCents.fromCents(totalEquityCents),
      positionCount,
      positions: [],
    },
    allocation: [
      {
        assetType: AssetType.STOCK,
        value: MoneyCents.fromCents(totalEquityCents),
        percentageBasisPoints: stockBasisPoints,
      },
    ],
    emergencyReserveTargetCents: 20_000,
  };
}

describe("Gameplay use cases", () => {
  it("registers gameplay events and skips duplicate unique events", async () => {
    nextId = 0;
    const services = makeServices();
    const useCase = new RegisterGameEventUseCase(
      services.events,
      services.playerProgress,
      services.eventService,
      services.progressionService,
      clock,
    );

    const first = await useCase.execute({
      playerId,
      eventType: "FIRST_BUY",
      metadata: { amountCents: 10_000 },
      source: "FINANCIAL_EVENT",
      correlationId: "finance-1",
    });
    const duplicate = await useCase.execute({
      playerId,
      eventType: "FIRST_BUY",
      metadata: { amountCents: 10_000 },
      source: "FINANCIAL_EVENT",
      correlationId: "finance-1",
    });

    expect(first.registered).toBe(true);
    expect(first.gameEvent?.source).toBe("FINANCIAL_EVENT");
    expect(first.gameEvent?.correlationId).toBe("finance-1");
    expect(duplicate).toEqual({
      registered: false,
      skippedReason: "DUPLICATE_UNIQUE_EVENT",
    });
    expect(services.events.events).toHaveLength(1);
  });

  it("progresses only through educational criteria and does not skip stages", async () => {
    nextId = 0;
    const progress = createInitialPlayerProgress(playerId, now);
    progress.netWorthMilestonesReachedCents.push(10_000, 100_000, 500_000);
    const services = makeServices(progress);
    const useCase = new EvaluateProgressionUseCase(
      services.events,
      services.playerProgress,
      services.eventService,
      services.progressionService,
      services.unlockService,
      services.cityEvolutionService,
      clock,
    );

    const result = await useCase.execute(playerId);

    expect(result.currentLevel).toBe(1);
    expect(result.currentLevelName).toBe("Iniciante Financeiro");
    expect(result.city.cityLevel).toBe(1);
  });

  it("unlocks districts once and persists a traceable event", async () => {
    nextId = 0;
    const services = makeServices();
    const useCase = new UnlockDistrictUseCase(
      services.events,
      services.playerProgress,
      services.eventService,
      services.progressionService,
      clock,
    );

    const first = await useCase.execute({
      playerId,
      districtId: "DISTRITO_RESERVA",
      reason: "EMERGENCY_RESERVE_STARTED",
    });
    const duplicate = await useCase.execute({
      playerId,
      districtId: "DISTRITO_RESERVA",
      reason: "EMERGENCY_RESERVE_STARTED",
    });

    expect(first.districtUnlocked).toBe(true);
    expect(first.eventGenerated?.type).toBe("NEW_DISTRICT_UNLOCKED");
    expect(duplicate.districtUnlocked).toBe(false);
    expect(services.playerProgress.progress?.unlockedDistricts).toContain(
      "DISTRITO_RESERVA",
    );
  });

  it("unlocks tools and mentor warning when concentration is excessive", async () => {
    nextId = 0;
    const services = makeServices();

    const result = await services.loop.handle({
      playerId,
      portfolio: portfolio(100_000, 8_000, 1),
    });

    expect(result.events.map((event) => event.type)).toContain(
      "EXCESSIVE_CONCENTRATION_DETECTED",
    );
    expect(result.progress.unlockedTools).toContain("CONCENTRATION_ALERT");
    expect(result.mentorFeedback.map((feedback) => feedback.code)).toContain(
      "MENTOR_CONCENTRATION",
    );
  });

  it("does not evolve the city only because net worth increased", async () => {
    nextId = 0;
    const services = makeServices();

    const result = await services.loop.handle({
      playerId,
      portfolio: portfolio(1_000_000, 5_000, 1),
    });

    expect(result.events.map((event) => event.type)).toContain(
      "NET_WORTH_REACHED",
    );
    expect(result.city.cityLevel).toBe(1);
    expect(result.city.skylineTier).toBe("FOUNDATION");
  });

  it("first income and market cycle update consolidated progress", async () => {
    nextId = 0;
    const progress = createInitialPlayerProgress(playerId, now);
    progress.seenEventTypes.push("FIRST_INCOME_RECEIVED");
    const services = makeServices(progress);
    services.events.events.push(
      services.eventService.create(playerId, "FIRST_INCOME_RECEIVED", {
        amountCents: 120,
      }),
    );
    const useCase = new GetPlayerProgressUseCase(
      services.events,
      services.playerProgress,
      services.cityEvolutionService,
      services.mentorFeedbackService,
      clock,
    );

    const result = await useCase.execute(playerId);

    expect(result.recentGameEvents).toHaveLength(1);
    expect(result.mentorFeedback.map((feedback) => feedback.code)).toContain(
      "MENTOR_INCOME",
    );
  });

  it("advances market cycle through market data and gameplay orchestration", async () => {
    nextId = 0;
    const services = makeServices();
    const marketData = new StubMarketDataProvider();
    const useCase = new AdvanceMarketCycleUseCase(marketData, services.loop);

    const result = await useCase.execute({
      playerId,
      cycleDate: now,
      cycleIndex: 3,
    });

    expect(marketData.refreshCalls).toBe(1);
    expect(result.impactSummary.refreshedAssetCount).toBe(1);
    expect(result.gameLoop.events.map((event) => event.type)).toContain(
      "MARKET_CYCLE_ADVANCED",
    );
    expect(result.gameLoop.events[0].source).toBe("MARKET_CYCLE");
  });

  it("keeps game design rewards deterministic and non-casino-like", () => {
    expect(
      EDUCATIONAL_REWARDS.every((reward) => !reward.forbiddenRandomness),
    ).toBe(true);
    expect(FORBIDDEN_GAME_DESIGN_MECHANICS).toEqual([
      "random_reward",
      "loot_box",
      "roulette",
      "profit_multiplier",
      "net_worth_ranking",
      "luck_based_progression",
    ]);
  });

  it("keeps gameplay use cases away from monetary floats and financial validation", () => {
    const root = join(process.cwd(), "src", "use-cases");
    const gameplaySources = [
      "AdvanceMarketCycleUseCase.ts",
      "EvaluateProgressionUseCase.ts",
      "GetPlayerProgressUseCase.ts",
      "RegisterGameEventUseCase.ts",
      "UnlockDistrictUseCase.ts",
    ].map((fileName) => readFileSync(join(root, fileName), "utf8"));

    for (const source of gameplaySources) {
      expect(source).not.toMatch(/\d+\.\d+/);
      expect(source).not.toMatch(/availableBalance\.subtract|sell\(|buy\(/);
      expect(source).not.toMatch(/averagePrice|saldo|posicao|position\.sell/);
    }
  });
});
