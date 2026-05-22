import { describe, expect, it } from "vitest";
import {
  EvaluateMentorTipsUseCase,
  FORBIDDEN_MENTOR_MESSAGE_PATTERNS,
  INITIAL_MENTOR_RULES,
  RuleBasedMentorService,
  type Clock,
} from "../src/index.js";
import {
  Asset,
  AssetSymbol,
  AssetType,
  MentorGameLoopMoment,
  MoneyCents,
  Quantity,
  RiskLevel,
  type FinancialEvent,
  type GameEvent,
  type MentorContext,
  type MentorShownTip,
} from "@fortuna/domain";

const now = new Date("2026-05-22T12:00:00.000Z");
const clock: Clock = { now: () => now };
const playerId = "player-mentor";

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
const treasury = new Asset(
  "asset-treasury",
  AssetSymbol.create("TES1"),
  "Tesouro Fortuna",
  AssetType.TREASURY,
  RiskLevel.LOW,
);

function bought(asset: Asset): FinancialEvent {
  return {
    type: "AssetBought",
    playerId,
    occurredAt: now,
    asset,
    quantity: Quantity.fromUnits(1),
    total: MoneyCents.fromCents(10_000),
  };
}

function context(
  overrides: Partial<MentorContext> = {},
  shown: MentorShownTip[] = [],
): MentorContext {
  return {
    playerId,
    currentCashInCents: MoneyCents.fromCents(10_000),
    totalEquityInCents: MoneyCents.fromCents(100_000),
    portfolioPositions: [],
    assetAllocation: [],
    recentEvents: [],
    completedMissions: [],
    activeMissions: [],
    alreadyShownTips: shown,
    currentGameLoopMoment: MentorGameLoopMoment.PORTFOLIO,
    emergencyReserveTargetCents: 20_000,
    ...overrides,
  };
}

function service(maxTipsPerEvaluation = 10): RuleBasedMentorService {
  return new RuleBasedMentorService(clock, undefined, INITIAL_MENTOR_RULES, {
    maxTipsPerEvaluation,
  });
}

describe("RuleBasedMentorService", () => {
  it("dispara dicas de primeira compra e do tipo do ativo", () => {
    const tips = service().evaluate(context({ recentEvents: [bought(stock)] }));

    expect(tips.map((tip) => tip.ruleId)).toEqual(
      expect.arrayContaining([
        "mentor-rule-first-buy",
        "mentor-rule-first-stock",
      ]),
    );
    expect(tips[0].ruleId).toBe("mentor-rule-first-buy");
  });

  it("explica renda fixa e FII nas primeiras compras desses tipos", () => {
    const fixedIncomeTips = service().evaluate(
      context({ recentEvents: [bought(treasury)] }),
    );
    const fiiTips = service().evaluate(context({ recentEvents: [bought(fii)] }));

    expect(fixedIncomeTips.map((tip) => tip.ruleId)).toContain(
      "mentor-rule-first-fixed-income",
    );
    expect(fiiTips.map((tip) => tip.ruleId)).toContain(
      "mentor-rule-first-fii",
    );
  });

  it("explica o primeiro rendimento simulado", () => {
    const tips = service().evaluate(
      context({
        recentEvents: [
          {
            type: "IncomeCollected",
            playerId,
            occurredAt: now,
            incomeEventId: "income-1",
            asset: treasury,
            total: MoneyCents.fromCents(250),
          },
        ],
      }),
    );

    expect(tips.map((tip) => tip.ruleId)).toContain(
      "mentor-rule-first-income",
    );
  });

  it("alerta sobre venda com prejuizo simulado quando o evento traz preco medio", () => {
    const saleEvent: GameEvent = {
      id: "event-sale",
      playerId,
      type: "ASSET_SOLD",
      occurredAt: now,
      source: "FINANCIAL_EVENT",
      metadata: {
        assetSymbol: "FORT3",
        unitPriceCents: 900,
        averagePriceCents: 1_000,
      },
    };

    const tips = service().evaluate(context({ recentEvents: [saleEvent] }));

    expect(tips.map((tip) => tip.ruleId)).toContain(
      "mentor-rule-sale-at-loss",
    );
  });

  it("detecta ausencia de reserva, concentracao, excesso de caixa e diversificacao", () => {
    const noReserveTips = service().evaluate(
      context({ currentCashInCents: MoneyCents.fromCents(1_000) }),
    );
    const concentratedTips = service().evaluate(
      context({
        assetAllocation: [
          {
            assetType: AssetType.STOCK,
            value: MoneyCents.fromCents(80_000),
            percentageBasisPoints: 8_000,
          },
        ],
      }),
    );
    const cashTips = service().evaluate(
      context({
        currentCashInCents: MoneyCents.fromCents(90_000),
        totalEquityInCents: MoneyCents.fromCents(100_000),
      }),
    );
    const diversifiedTips = service().evaluate(
      context({
        portfolioPositions: [
          {
            assetId: stock.id,
            symbol: stock.symbol.value,
            name: stock.name,
            assetType: stock.type,
            quantity: Quantity.fromUnits(1),
            averagePrice: MoneyCents.fromCents(10_000),
            marketValue: MoneyCents.fromCents(30_000),
          },
          {
            assetId: fii.id,
            symbol: fii.symbol.value,
            name: fii.name,
            assetType: fii.type,
            quantity: Quantity.fromUnits(1),
            averagePrice: MoneyCents.fromCents(10_000),
            marketValue: MoneyCents.fromCents(30_000),
          },
          {
            assetId: treasury.id,
            symbol: treasury.symbol.value,
            name: treasury.name,
            assetType: treasury.type,
            quantity: Quantity.fromUnits(1),
            averagePrice: MoneyCents.fromCents(10_000),
            marketValue: MoneyCents.fromCents(30_000),
          },
        ],
        assetAllocation: [
          {
            assetType: AssetType.STOCK,
            value: MoneyCents.fromCents(30_000),
            percentageBasisPoints: 3_333,
          },
          {
            assetType: AssetType.FII,
            value: MoneyCents.fromCents(30_000),
            percentageBasisPoints: 3_333,
          },
          {
            assetType: AssetType.TREASURY,
            value: MoneyCents.fromCents(30_000),
            percentageBasisPoints: 3_333,
          },
        ],
      }),
    );

    expect(noReserveTips.map((tip) => tip.ruleId)).toContain(
      "mentor-rule-no-reserve",
    );
    expect(concentratedTips.map((tip) => tip.ruleId)).toContain(
      "mentor-rule-concentrated-portfolio",
    );
    expect(cashTips.map((tip) => tip.ruleId)).toContain(
      "mentor-rule-excess-cash",
    );
    expect(diversifiedTips.map((tip) => tip.ruleId)).toContain(
      "mentor-rule-diversification-achieved",
    );
  });

  it("respeita maximo de repeticoes e cooldown", () => {
    const firstBuyShown: MentorShownTip = {
      ruleId: "mentor-rule-first-buy",
      shownAt: now,
      occurrences: 1,
    };
    const noReserveShown: MentorShownTip = {
      ruleId: "mentor-rule-no-reserve",
      shownAt: new Date(now.getTime() - 10 * 60_000),
      occurrences: 1,
    };

    const tips = service().evaluate(
      context(
        {
          currentCashInCents: MoneyCents.fromCents(1_000),
          recentEvents: [bought(stock)],
        },
        [firstBuyShown, noReserveShown],
      ),
    );

    expect(tips.map((tip) => tip.ruleId)).not.toContain(
      "mentor-rule-first-buy",
    );
    expect(tips.map((tip) => tip.ruleId)).not.toContain(
      "mentor-rule-no-reserve",
    );
  });

  it("limita quantidade de dicas por avaliacao", () => {
    const tips = service(2).evaluate(context({ recentEvents: [bought(stock)] }));

    expect(tips).toHaveLength(2);
  });

  it("permite avaliar por use case", () => {
    const useCase = new EvaluateMentorTipsUseCase(service());

    const tips = useCase.execute(context({ recentEvents: [bought(stock)] }));

    expect(tips.length).toBeGreaterThan(0);
  });

  it("nao usa padroes proibidos de promessa, aposta ou recomendacao real", () => {
    const sampleContext = context({ recentEvents: [bought(stock)] });
    const messages = INITIAL_MENTOR_RULES.map(
      (rule) => rule.createTip(sampleContext, now).message,
    );

    for (const message of messages) {
      for (const pattern of FORBIDDEN_MENTOR_MESSAGE_PATTERNS) {
        expect(message).not.toMatch(pattern);
      }
    }
  });
});
