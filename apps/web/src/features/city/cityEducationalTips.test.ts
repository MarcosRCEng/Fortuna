import { describe, expect, it } from "vitest";
import type { PlayerMission } from "../../services/missionApi.js";
import type { Transaction } from "../../types/transaction.js";
import { createCityEducationalTips } from "./cityEducationalTips.js";
import type { DeriveCityInput } from "./city.types.js";

const baseInput: DeriveCityInput = {
  totalEquityCents: 0,
  availableBalanceCents: 0,
  allocationByClass: [],
  positionsCount: 0,
  completedMissionsCount: 0,
  totalMissionsCount: 0,
  collectedIncomeCents: 0,
  collectibleIncomeCents: 0,
  mentorMessagesCount: 0,
  hasConcentrationWarning: false,
  largestPositionPercentage: 0,
};

const availableMission: PlayerMission = {
  id: "mission-1",
  code: "LEARN_1",
  title: "Missao educativa",
  description: "Aprenda no simulador.",
  objective: "Concluir uma leitura educativa.",
  educationalExplanation: "Conteudo educativo.",
  type: "EDUCATIONAL",
  status: "AVAILABLE",
  currentValue: 0,
  targetValue: 1,
  reward: {
    type: "CITY_PROGRESS",
    label: "Progresso da cidade",
  },
};

const buyTransaction: Transaction = {
  id: "transaction-1",
  type: "BUY",
  assetId: "asset-1",
  assetSymbol: "SIM1",
  quantity: 1,
  unitPriceCents: 1000,
  amountCents: 1000,
  balanceAfterCents: 9000,
  description: "Compra simulada",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("createCityEducationalTips", () => {
  it("creates practical onboarding tips for a player without positions", () => {
    const tips = createCityEducationalTips({
      input: {
        ...baseInput,
        totalEquityCents: 10000,
        availableBalanceCents: 10000,
        totalMissionsCount: 1,
      },
      missions: [availableMission],
      transactions: [],
    });

    expect(tips.map((tip) => tip.id)).toEqual([
      "mission-mission-1",
      "start-with-simulated-reserve",
      "buy-first-simulated-asset",
    ]);
    expect(tips.every((tip) => !tip.description.includes("ganho"))).toBe(true);
  });

  it("prioritizes simulated income and concentration warnings when they are contextual", () => {
    const tips = createCityEducationalTips({
      input: {
        ...baseInput,
        totalEquityCents: 100000,
        positionsCount: 2,
        collectibleIncomeCents: 750,
        hasConcentrationWarning: true,
        largestPositionPercentage: 82,
      },
      missions: [],
      transactions: [],
    });

    expect(tips[0]?.id).toBe("collect-simulated-income");
    expect(tips[1]).toMatchObject({
      id: "review-concentration-risk",
      severity: "warning",
    });
  });

  it("suggests reviewing history after portfolio movements", () => {
    const tips = createCityEducationalTips({
      input: {
        ...baseInput,
        totalEquityCents: 10000,
        positionsCount: 1,
      },
      missions: [],
      transactions: [buyTransaction],
    });

    expect(tips.map((tip) => tip.id)).toContain("review-transaction-history");
  });
});
