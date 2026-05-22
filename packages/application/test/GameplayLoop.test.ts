import { describe, expect, it } from "vitest";
import {
  CityEvolutionService,
  GameEventService,
  GameLoopService,
  MentorFeedbackService,
  ProgressionService,
  UnlockService,
  createInitialPlayerProgress,
  type Clock,
  type GameEventRepository,
  type GameLoopCommand,
  type PlayerProgress,
  type PlayerProgressRepository,
} from "../src/index.js";
import {
  Asset,
  AssetSymbol,
  AssetType,
  MoneyCents,
  Quantity,
  RiskLevel,
  type FinancialEvent,
  type GameEvent,
} from "@fortuna/domain";

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

const now = new Date("2026-05-22T12:00:00.000Z");
const clock: Clock = { now: () => now };
let nextId = 0;
const idGenerator = () => `game-event-${++nextId}`;
const playerId = "player-1";
const stock = new Asset(
  "asset-fort3",
  AssetSymbol.create("fort3"),
  "Fortuna Educacao ON",
  AssetType.STOCK,
  RiskLevel.HIGH,
);
const treasury = new Asset(
  "asset-tesouro",
  AssetSymbol.create("tes1"),
  "Tesouro Fortuna",
  AssetType.TREASURY,
  RiskLevel.LOW,
);

function makeLoop(progress?: PlayerProgress) {
  const events = new InMemoryGameEventRepository();
  const playerProgress = new InMemoryPlayerProgressRepository(progress);
  const eventService = new GameEventService(clock, idGenerator);
  return {
    events,
    playerProgress,
    loop: new GameLoopService(
      events,
      playerProgress,
      eventService,
      new ProgressionService(clock),
      new UnlockService(),
      new CityEvolutionService(),
      new MentorFeedbackService(),
      clock,
    ),
  };
}

function portfolio(
  totalEquityCents: number,
  positionCount: number,
): GameLoopCommand["portfolio"] {
  return {
    wallet: {
      availableBalance: MoneyCents.fromCents(20_000),
      investedValue: MoneyCents.fromCents(totalEquityCents - 20_000),
      totalEquity: MoneyCents.fromCents(totalEquityCents),
      positionCount,
      positions: [],
    },
    allocation: [
      {
        assetType: AssetType.STOCK,
        value: MoneyCents.fromCents(totalEquityCents - 20_000),
        percentageBasisPoints: 8_000,
      },
      {
        assetType: AssetType.TREASURY,
        value: MoneyCents.fromCents(20_000),
        percentageBasisPoints: 2_000,
      },
    ],
    emergencyReserveTargetCents: 20_000,
  };
}

function boughtEvent(): FinancialEvent {
  return {
    type: "AssetBought",
    playerId,
    occurredAt: now,
    asset: stock,
    quantity: Quantity.fromUnits(2),
    total: MoneyCents.fromCents(10_000),
  };
}

describe("Gameplay loop", () => {
  it("turns financial events into gameplay progression without financial validation", async () => {
    nextId = 0;
    const { loop, events, playerProgress } = makeLoop();

    const result = await loop.handle({
      playerId,
      financialEvents: [boughtEvent()],
      portfolio: portfolio(100_000, 2),
    });

    expect(result.events.map((event) => event.type)).toContain("FIRST_BUY");
    expect(result.events.map((event) => event.type)).toContain(
      "FIRST_DIVERSIFICATION",
    );
    expect(result.events.map((event) => event.type)).toContain(
      "NET_WORTH_REACHED",
    );
    expect(result.events.map((event) => event.type)).toContain(
      "NEW_DISTRICT_UNLOCKED",
    );
    expect(result.events.map((event) => event.type)).toContain(
      "NEW_TOOL_UNLOCKED",
    );
    expect(result.events.map((event) => event.type)).toContain(
      "NEW_ASSET_CLASS_UNLOCKED",
    );
    expect(result.city.skylineTier).toBe("DIVERSIFIED");
    expect(result.mentorFeedback.map((item) => item.code)).toContain(
      "MENTOR_FIRST_BUY",
    );
    expect(events.events).toHaveLength(result.events.length);
    expect(playerProgress.progress?.unlockedTools).toContain(
      "ALLOCATION_REPORT",
    );
  });

  it("creates first sell, first income and market cycle events", async () => {
    nextId = 0;
    const { loop } = makeLoop(
      createInitialPlayerProgress(playerId, new Date("2026-05-22T11:00:00Z")),
    );

    const result = await loop.handle({
      playerId,
      financialEvents: [
        {
          type: "AssetSold",
          playerId,
          occurredAt: now,
          asset: stock,
          quantity: Quantity.fromUnits(1),
          total: MoneyCents.fromCents(5_000),
        },
        {
          type: "IncomeCollected",
          playerId,
          occurredAt: now,
          incomeEventId: "income-1",
          asset: treasury,
          total: MoneyCents.fromCents(120),
        },
      ],
      advanceMarketCycle: true,
    });

    expect(result.events.map((event) => event.type)).toEqual([
      "FIRST_SELL",
      "FIRST_INCOME_RECEIVED",
      "MARKET_CYCLE_ADVANCED",
    ]);
    expect(result.progress.marketCyclesAdvanced).toBe(1);
    expect(result.city.visualSignals).toContain("INCOME_PARK_FLOWING");
  });

  it("does not repeat once-per-player gameplay milestones", async () => {
    nextId = 0;
    const progress = createInitialPlayerProgress(playerId, now);
    progress.seenEventTypes.push("FIRST_BUY", "FIRST_DIVERSIFICATION");
    progress.netWorthMilestonesReachedCents.push(10_000, 100_000);
    const { loop } = makeLoop(progress);

    const result = await loop.handle({
      playerId,
      financialEvents: [boughtEvent()],
      portfolio: portfolio(100_000, 2),
    });

    expect(result.events.map((event) => event.type)).not.toContain("FIRST_BUY");
    expect(result.events.map((event) => event.type)).not.toContain(
      "FIRST_DIVERSIFICATION",
    );
    expect(
      result.events.filter((event) => event.type === "NET_WORTH_REACHED"),
    ).toHaveLength(0);
    expect(result.events.map((event) => event.type)).toContain(
      "EXCESSIVE_CONCENTRATION_DETECTED",
    );
  });
});
