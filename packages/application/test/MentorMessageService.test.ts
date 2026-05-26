import { describe, expect, it } from "vitest";
import {
  InMemoryMentorMessageRepository,
  MentorMessageService,
  mentorTemplates,
  FORBIDDEN_MENTOR_TEMPLATE_PATTERNS,
  severityPriority,
  type Clock,
} from "../src/index.js";
import {
  Asset,
  AssetSymbol,
  AssetType,
  MentorGameLoopMoment,
  MentorMessageTrigger,
  MoneyCents,
  Quantity,
  RiskLevel,
  type FinancialEvent,
  type GameEvent,
  type MentorContext,
} from "@fortuna/domain";

const now = new Date("2026-05-24T12:00:00.000Z");
const clock: Clock = { now: () => now };
const playerId = "player-mentor-message";
let nextId = 0;

const stock = new Asset(
  "asset-stock",
  AssetSymbol.create("FORT3"),
  "Fortuna ON",
  AssetType.STOCK,
  RiskLevel.HIGH,
);
const fii = new Asset(
  "asset-fii",
  AssetSymbol.create("FIIF11"),
  "FII Fortuna",
  AssetType.FII,
  RiskLevel.MEDIUM,
);

function service(repository = new InMemoryMentorMessageRepository()) {
  return {
    repository,
    mentor: new MentorMessageService(
      repository,
      clock,
      () => `mentor-message-${++nextId}`,
    ),
  };
}

function bought(totalCents = 70_000): FinancialEvent {
  return {
    type: "AssetBought",
    playerId,
    occurredAt: now,
    asset: stock,
    quantity: Quantity.fromUnits(1),
    unitPrice: MoneyCents.fromCents(totalCents),
    total: MoneyCents.fromCents(totalCents),
  };
}

function sold(unitPriceCents: number, averagePriceCents: number): FinancialEvent {
  return {
    type: "AssetSold",
    playerId,
    occurredAt: now,
    asset: stock,
    quantity: Quantity.fromUnits(1),
    unitPrice: MoneyCents.fromCents(unitPriceCents),
    averagePrice: MoneyCents.fromCents(averagePriceCents),
    total: MoneyCents.fromCents(unitPriceCents),
  };
}

function context(overrides: Partial<MentorContext> = {}): MentorContext {
  return {
    playerId,
    currentCashInCents: MoneyCents.fromCents(30_000),
    totalEquityInCents: MoneyCents.fromCents(100_000),
    portfolioPositions: [
      {
        assetId: stock.id,
        symbol: stock.symbol.value,
        name: stock.name,
        assetType: stock.type,
        quantity: Quantity.fromUnits(1),
        averagePrice: MoneyCents.fromCents(50_000),
        marketValue: MoneyCents.fromCents(70_000),
      },
    ],
    assetAllocation: [],
    recentEvents: [],
    completedMissions: [],
    activeMissions: ["mission-diversification"],
    alreadyShownTips: [],
    currentGameLoopMoment: MentorGameLoopMoment.PORTFOLIO,
    ...overrides,
  };
}

describe("MentorMessageService", () => {
  it("gera mensagem de primeira compra", async () => {
    const { mentor } = service();
    const messages = await mentor.evaluateForEvent(bought(), context());

    expect(messages.map((message) => message.trigger)).toContain(
      MentorMessageTrigger.FIRST_PURCHASE,
    );
  });

  it("alerta compra concentrada e carteira sem diversificacao", async () => {
    const { mentor } = service();
    const messages = await mentor.evaluateForEvent(bought(), context());

    expect(messages.map((message) => message.trigger)).toEqual(
      expect.arrayContaining([
        MentorMessageTrigger.CONCENTRATED_PURCHASE,
        MentorMessageTrigger.PORTFOLIO_WITHOUT_DIVERSIFICATION,
      ]),
    );
  });

  it("gera reflexao para venda com perda e parabens cauteloso para ganho", async () => {
    const loss = service();
    const gain = service();

    const lossMessages = await loss.mentor.evaluateForEvent(
      sold(900, 1_000),
      context(),
    );
    const gainMessages = await gain.mentor.evaluateForEvent(
      sold(1_100, 1_000),
      context(),
    );

    expect(lossMessages.map((message) => message.trigger)).toContain(
      MentorMessageTrigger.SALE_WITH_LOSS,
    );
    expect(gainMessages.map((message) => message.trigger)).toContain(
      MentorMessageTrigger.SALE_WITH_GAIN,
    );
  });

  it("gera orientacoes de caixa parado e rendimento disponivel", async () => {
    const { mentor } = service();
    const messages = await mentor.evaluateForEvent(
      "GameLoopEvaluated",
      context({
        currentCashInCents: MoneyCents.fromCents(80_000),
        recentEvents: [
          {
            type: "YieldGenerated",
            playerId,
            occurredAt: now,
            incomeEventId: "income-1",
            asset: fii,
            total: MoneyCents.fromCents(100),
            yieldType: "AVAILABLE",
          },
        ],
      }),
    );

    expect(messages.map((message) => message.trigger)).toEqual(
      expect.arrayContaining([
        MentorMessageTrigger.IDLE_CASH_EXCESS,
        MentorMessageTrigger.AVAILABLE_INCOME,
      ]),
    );
  });

  it("gera mensagem para missao concluida e ativo de risco visualizado", async () => {
    const mission = service();
    const risk = service();
    const missionEvent: GameEvent = {
      id: "event-mission",
      playerId,
      type: "MISSION_COMPLETED",
      occurredAt: now,
      source: "MISSION",
      metadata: { missionId: "mission-diversification" },
    };
    const riskEvent: GameEvent = {
      id: "event-risk",
      playerId,
      type: "ASSET_DETAILS_VIEWED",
      occurredAt: now,
      source: "MENTOR",
      metadata: { assetId: stock.id, riskLevel: RiskLevel.HIGH },
    };

    expect(
      (await mission.mentor.evaluateForEvent(missionEvent, context())).map(
        (message) => message.trigger,
      ),
    ).toContain(MentorMessageTrigger.MISSION_COMPLETED);
    expect(
      (await risk.mentor.evaluateForEvent(riskEvent, context())).map(
        (message) => message.trigger,
      ),
    ).toContain(MentorMessageTrigger.RISKY_ASSET_VIEWED);
  });

  it("deduplica mensagens recentes e prioriza dashboard", async () => {
    const { mentor, repository } = service();
    await mentor.evaluateForEvent(bought(), context());
    await mentor.evaluateForEvent(bought(), context());

    const messages = await repository.findByPlayer(playerId, 20);
    const firstPurchaseCount = messages.filter(
      (message) => message.trigger === MentorMessageTrigger.FIRST_PURCHASE,
    ).length;
    const latest = await mentor.findLatest(playerId);

    expect(firstPurchaseCount).toBe(1);
    expect(latest).not.toBeNull();
    expect(severityPriority(latest!.severity)).toBeGreaterThanOrEqual(2);
  });

  it("templates nao contem promessa de ganho ou recomendacao direta", () => {
    for (const template of Object.values(mentorTemplates)) {
      for (const pattern of FORBIDDEN_MENTOR_TEMPLATE_PATTERNS) {
        expect(template.title).not.toMatch(pattern);
        expect(template.message).not.toMatch(pattern);
      }
    }
  });
});
