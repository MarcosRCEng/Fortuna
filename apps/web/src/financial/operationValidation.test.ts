import { describe, expect, it } from "vitest";
import {
  validateBuyOperation,
  validateSellOperation,
} from "./operationValidation.js";
import type { Asset, Position } from "../services/types.js";

const asset: Asset = {
  id: "asset-test",
  symbol: "TST001",
  name: "Ativo Teste",
  assetClass: "FIXED_INCOME",
  currentPriceCents: 1000,
  previousPriceCents: 990,
  variationBps: 10,
  riskLevel: "LOW",
  liquidity: "DAILY",
  priceStatus: "SIMULATED",
  dataSource: "MOCK",
  isMocked: true,
  isActive: true,
  educationalDescription: "Ativo simulado.",
  yieldRules: "Sem regra real.",
  updatedAt: "2026-05-23T12:00:00.000Z",
  detail: {
    longDescription: "Teste",
    riskExplanation: "Teste",
    liquidityExplanation: "Teste",
    beginnerTip: "Teste",
    mentorHint: "Teste",
  },
};

const position: Position = {
  symbol: "TST001",
  name: "Ativo Teste",
  quantity: 3,
  averagePriceCents: 1000,
  marketValueCents: 3000,
  assetClass: "FIXED_INCOME",
  accumulatedIncomeCents: 0,
};

describe("operation validation", () => {
  it("blocks buy without sufficient balance", () => {
    const result = validateBuyOperation({
      asset,
      availableBalanceCents: 999,
      quantity: 1,
      marketUpdating: false,
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("saldo suficiente");
  });

  it("blocks buy while market is updating", () => {
    const result = validateBuyOperation({
      asset,
      availableBalanceCents: 10000,
      quantity: 1,
      marketUpdating: true,
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("precos estao sendo atualizados");
  });

  it("allows valid buy", () => {
    expect(
      validateBuyOperation({
        asset,
        availableBalanceCents: 10000,
        quantity: 2,
        marketUpdating: false,
      }).blocked,
    ).toBe(false);
  });

  it("blocks sell above position", () => {
    const result = validateSellOperation({
      asset,
      position,
      quantity: 4,
      marketUpdating: false,
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("maior que sua posicao atual");
  });

  it("blocks sell without position", () => {
    const result = validateSellOperation({
      asset,
      quantity: 1,
      marketUpdating: false,
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toContain("nao possui posicao");
  });

  it("allows valid sell", () => {
    expect(
      validateSellOperation({
        asset,
        position,
        quantity: 2,
        marketUpdating: false,
      }).blocked,
    ).toBe(false);
  });
});
