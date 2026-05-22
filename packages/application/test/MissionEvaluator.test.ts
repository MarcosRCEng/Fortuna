import { describe, expect, it } from "vitest";
import { AssetType, MoneyCents, type GameEvent } from "@fortuna/domain";
import {
  MissionEvaluator,
  MVP_MISSIONS,
  createInitialPlayerProgress,
  type GameLoopCommand,
} from "../src/index.js";

const now = new Date("2026-05-22T12:00:00.000Z");
const playerId = "player-1";
const evaluator = new MissionEvaluator();

function event(
  type: GameEvent["type"],
  metadata?: GameEvent["metadata"],
): GameEvent {
  return {
    id: `${type}-1`,
    playerId,
    type,
    occurredAt: now,
    source: "GAMEPLAY",
    metadata,
  };
}

function mission(id: string) {
  const found = MVP_MISSIONS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Missing mission ${id}`);
  }

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
      investedValue: MoneyCents.fromCents(
        totalEquityCents - availableBalanceCents,
      ),
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
  it("completes fixed income mission when a fixed income purchase event arrives", () => {
    const result = evaluator.evaluate(mission("first-fixed-income"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [
        event("ASSET_PURCHASED", {
          assetType: AssetType.FIXED_INCOME,
          amountCents: 1_000,
        }),
      ],
    });

    expect(result.completedNow).toBe(true);
    expect(result.mission.status).toBe("COMPLETED");
  });

  it("does not complete fixed income mission when the purchase is a FII", () => {
    const result = evaluator.evaluate(mission("first-fixed-income"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [
        event("ASSET_PURCHASED", {
          assetType: AssetType.FII,
          amountCents: 1_000,
        }),
      ],
    });

    expect(result.completedNow).toBe(false);
    expect(result.mission.status).toBe("AVAILABLE");
  });

  it("completes first income only when collected income is positive", () => {
    const positive = evaluator.evaluate(mission("first-income"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [event("INCOME_COLLECTED", { amountCents: 1 })],
    });
    const zero = evaluator.evaluate(mission("first-income"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [event("INCOME_COLLECTED", { amountCents: 0 })],
    });

    expect(positive.completedNow).toBe(true);
    expect(zero.completedNow).toBe(false);
  });

  it("completes diversification when portfolio has three positive classes", () => {
    const result = evaluator.evaluate(mission("diversify-three-classes"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [],
      portfolio: portfolio(10_000, 50_000, [
        { assetType: AssetType.FIXED_INCOME, valueCents: 20_000, bps: 4_000 },
        { assetType: AssetType.FII, valueCents: 20_000, bps: 4_000 },
      ]),
    });

    expect(result.completedNow).toBe(true);
    expect(result.mission.progress.current).toBe(3);
  });

  it("does not complete diversification with only two positive classes", () => {
    const result = evaluator.evaluate(mission("diversify-three-classes"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [],
      portfolio: portfolio(0, 40_000, [
        { assetType: AssetType.FIXED_INCOME, valueCents: 20_000, bps: 5_000 },
        { assetType: AssetType.FII, valueCents: 20_000, bps: 5_000 },
      ]),
    });

    expect(result.completedNow).toBe(false);
    expect(result.mission.progress.current).toBe(2);
  });

  it("completes concentration mission when largest allocation is below the limit", () => {
    const result = evaluator.evaluate(mission("reduce-concentration"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [],
      portfolio: portfolio(10_000, 100_000, [
        { assetType: AssetType.FIXED_INCOME, valueCents: 45_000, bps: 4_500 },
        { assetType: AssetType.FII, valueCents: 45_000, bps: 4_500 },
      ]),
    });

    expect(result.completedNow).toBe(true);
  });

  it("does not complete concentration mission when portfolio is concentrated", () => {
    const result = evaluator.evaluate(mission("reduce-concentration"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [],
      portfolio: portfolio(0, 100_000, [
        { assetType: AssetType.STOCK, valueCents: 100_000, bps: 10_000 },
      ]),
    });

    expect(result.completedNow).toBe(false);
  });

  it("completes educational missions from mentor and history events", () => {
    const mentor = evaluator.evaluate(mission("read-mentor-tip"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [event("MENTOR_TIP_READ")],
    });
    const history = evaluator.evaluate(mission("view-transaction-history"), {
      playerId,
      progress: createInitialPlayerProgress(playerId, now),
      events: [event("TRANSACTION_HISTORY_VIEWED")],
    });

    expect(mentor.completedNow).toBe(true);
    expect(history.completedNow).toBe(true);
  });
});
