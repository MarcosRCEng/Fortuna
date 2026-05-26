import { describe, expect, it } from "vitest";
import { AssetType, MoneyCents, RiskLevel, type GameEvent } from "@fortuna/domain";
import {
  MissionEvaluator,
  MVP_MISSIONS,
  createInitialPlayerProgress,
  type GameLoopCommand,
} from "../src/index.js";

const now = new Date("2026-05-22T12:00:00.000Z");
const playerId = "player-1";
const evaluator = new MissionEvaluator();

function event(type: GameEvent["type"], metadata?: GameEvent["metadata"]): GameEvent {
  return { id: `${type}-1`, playerId, type, occurredAt: now, source: "GAMEPLAY", metadata };
}

function mission(id: string) {
  const found = MVP_MISSIONS.find((item) => item.id === id);
  if (!found) throw new Error(`Missing mission ${id}`);
  return found;
}

function portfolio(
  availableBalanceCents: number,
  totalEquityCents: number,
  allocations: Array<{ assetType: AssetType; valueCents: number; bps: number }>,
): GameLoopCommand["portfolio"] {
  return {
    wallet: {
      availableBalance: MoneyCents.fromCents(availableBalanceCents),
      investedValue: MoneyCents.fromCents(totalEquityCents - availableBalanceCents),
      totalEquity: MoneyCents.fromCents(totalEquityCents),
      positionCount: allocations.length,
      positions: [],
    },
    allocation: allocations.map((item) => ({
      assetType: item.assetType,
      value: MoneyCents.fromCents(item.valueCents),
      percentageBasisPoints: item.bps,
    })),
  };
}

describe("MissionEvaluator", () => {
  it("completes first investment after any purchase", () => {
    const result = evaluator.evaluate(mission("mission-first-investment"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [event("ASSET_PURCHASED", { assetType: AssetType.STOCK })],
    });

    expect(result.completedNow).toBe(true);
    expect(result.mission.status).toBe("COMPLETED");
  });

  it("completes liquidity reserve only for daily liquidity fixed income", () => {
    const progress = createInitialPlayerProgress(playerId, now);
    const fixedIncome = evaluator.evaluate(mission("mission-liquidity-reserve"), {
      playerId,
      progress,
      events: [
        event("ASSET_PURCHASED", {
          assetType: AssetType.FIXED_INCOME,
          liquidity: "DAILY",
        }),
      ],
    });
    const stock = evaluator.evaluate(mission("mission-liquidity-reserve"), {
      playerId,
      progress,
      events: [event("ASSET_PURCHASED", { assetType: AssetType.STOCK })],
    });
    const fii = evaluator.evaluate(mission("mission-liquidity-reserve"), {
      playerId,
      progress,
      events: [event("ASSET_PURCHASED", { assetType: AssetType.FII })],
    });

    expect(fixedIncome.completedNow).toBe(true);
    expect(stock.completedNow).toBe(false);
    expect(fii.completedNow).toBe(false);
  });

  it("completes diversification with two positive asset types and keeps completed missions done", () => {
    const oneType = evaluator.evaluate(mission("mission-initial-diversification"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [],
      portfolio: portfolio(10_000, 50_000, [
        { assetType: AssetType.FIXED_INCOME, valueCents: 40_000, bps: 8_000 },
      ]),
    });
    const twoTypes = evaluator.evaluate(mission("mission-initial-diversification"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [],
      portfolio: portfolio(10_000, 50_000, [
        { assetType: AssetType.FIXED_INCOME, valueCents: 20_000, bps: 4_000 },
        { assetType: AssetType.FII, valueCents: 20_000, bps: 4_000 },
      ]),
    });
    const completedProgress = createInitialPlayerProgress(playerId, now);
    completedProgress.completedMissionIds.push("mission-initial-diversification");
    const afterSell = evaluator.evaluate(mission("mission-initial-diversification"), {
      playerId,
      progress: completedProgress,
      events: [],
      portfolio: portfolio(10_000, 50_000, [
        { assetType: AssetType.FII, valueCents: 40_000, bps: 8_000 },
      ]),
    });

    expect(oneType.completedNow).toBe(false);
    expect(twoTypes.completedNow).toBe(true);
    expect(afterSell.mission.status).toBe("COMPLETED");
    expect(afterSell.completedNow).toBe(false);
  });

  it("completes first income only when collected income is positive", () => {
    const positive = evaluator.evaluate(mission("mission-first-income-collected"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [event("INCOME_COLLECTED", { amountCents: 1 })],
    });
    const zero = evaluator.evaluate(mission("mission-first-income-collected"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [event("INCOME_COLLECTED", { amountCents: 0 })],
    });

    expect(positive.completedNow).toBe(true);
    expect(zero.completedNow).toBe(false);
  });

  it("completes risk education only when high risk education is viewed", () => {
    const high = evaluator.evaluate(mission("mission-high-risk-viewed"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [event("RISK_EDUCATION_VIEWED", { riskLevel: RiskLevel.HIGH })],
    });
    const low = evaluator.evaluate(mission("mission-high-risk-viewed"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [event("ASSET_DETAILS_VIEWED", { riskLevel: RiskLevel.LOW })],
    });

    expect(high.completedNow).toBe(true);
    expect(low.completedNow).toBe(false);
  });

  it("completes concentration alert when an asset is above the configured limit", () => {
    const concentrated = evaluator.evaluate(mission("mission-concentration-alert"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [],
      portfolio: portfolio(0, 100_000, [
        { assetType: AssetType.STOCK, valueCents: 60_000, bps: 6_000 },
        { assetType: AssetType.FII, valueCents: 40_000, bps: 4_000 },
      ]),
    });
    const balanced = evaluator.evaluate(mission("mission-concentration-alert"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [],
      portfolio: portfolio(0, 100_000, [
        { assetType: AssetType.STOCK, valueCents: 50_000, bps: 5_000 },
        { assetType: AssetType.FII, valueCents: 50_000, bps: 5_000 },
      ]),
    });

    expect(concentrated.completedNow).toBe(true);
    expect(balanced.completedNow).toBe(false);
  });
});
