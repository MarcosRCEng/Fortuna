import { describe, expect, it } from "vitest";
import {
  AssetType,
  EducationalTrendClassification,
  EducationalTrendEngine,
  type EducationalTrendInput,
} from "../src/index.js";

const engine = new EducationalTrendEngine();
const dataAsOf = "2026-06-14T12:00:00.000Z";

function history(
  closes: number[],
  options: { start?: string; volume?: number; volumeStep?: number } = {},
) {
  const start = new Date(`${options.start ?? "2026-05-16"}T00:00:00.000Z`);
  return closes.map((closeCents, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return {
      date: date.toISOString(),
      closeCents,
      volume:
        options.volume === undefined
          ? undefined
          : options.volume + (options.volumeStep ?? 0) * index,
    };
  });
}

function linear(start: number, step: number, count = 30): number[] {
  return Array.from({ length: count }, (_item, index) =>
    Math.max(100, start + step * index),
  );
}

function input(overrides: Partial<EducationalTrendInput>): EducationalTrendInput {
  return {
    symbol: "ITUB4",
    assetType: AssetType.STOCK,
    currentPriceCents: 2_000,
    historicalClosesCents: history(linear(1_000, 20), {
      volume: 10_000,
      volumeStep: 100,
    }),
    changePercent1d: 1,
    portfolioContext: {
      inPortfolio: true,
      allocationPercent: 20,
      sectorAllocationPercent: 35,
    },
    dataAsOf,
    delayed: false,
    ...overrides,
  };
}

describe("EducationalTrendEngine", () => {
  it.each([
    [
      "forte tendencia positiva",
      input({
        currentPriceCents: 5_350,
        historicalClosesCents: history(linear(1_000, 150), {
          volume: 20_000,
          volumeStep: 1_500,
        }),
        changePercent1d: 8,
      }),
      EducationalTrendClassification.MOMENTO_MUITO_POSITIVO,
    ],
    [
      "tendencia positiva moderada",
      input({
        currentPriceCents: 2_015,
        historicalClosesCents: history(linear(1_000, 35), {
          volume: 12_000,
          volumeStep: 350,
        }),
        changePercent1d: 2.5,
      }),
      EducationalTrendClassification.MOMENTO_POSITIVO,
    ],
    [
      "lateralizacao",
      input({
        currentPriceCents: 1_000,
        historicalClosesCents: history([
          1_000, 1_002, 998, 1_001, 999, 1_000, 1_003, 997, 1_001, 1_000,
          1_002, 999, 1_000, 1_001, 998, 1_000, 1_002, 999, 1_000, 1_001,
        ]),
        changePercent1d: 0,
      }),
      EducationalTrendClassification.MOMENTO_NEUTRO,
    ],
    [
      "tendencia negativa",
      input({
        currentPriceCents: 1_340,
        historicalClosesCents: history(linear(2_500, -40), { volume: 10_000 }),
        changePercent1d: -2.5,
      }),
      EducationalTrendClassification.MOMENTO_NEGATIVO,
    ],
    [
      "forte tendencia negativa",
      input({
        currentPriceCents: 500,
        historicalClosesCents: history(linear(2_000, -45), { volume: 8_000 }),
        changePercent1d: -5,
      }),
      EducationalTrendClassification.MOMENTO_MUITO_NEGATIVO,
    ],
  ])("classifica %s", (_caseName, trendInput, expected) => {
    const result = engine.evaluate(trendInput);
    expect(result.classification).toBe(expected);
  });

  it("penaliza alta volatilidade de forma informativa", () => {
    const result = engine.evaluate(
      input({
        historicalClosesCents: history([
          1_000, 1_220, 920, 1_260, 900, 1_280, 880, 1_300, 870, 1_310,
          860, 1_300, 880, 1_260, 930, 1_220, 980, 1_180, 1_000, 1_150,
        ]),
      }),
    );

    expect(result.factors).toContainEqual(
      expect.objectContaining({ code: "VOLATILITY", impact: "NEGATIVE" }),
    );
  });

  it.each([
    ["poucos pontos", input({ historicalClosesCents: history([1_000, 1_010]) })],
    ["preco ausente", input({ currentPriceCents: undefined })],
    ["ausencia completa de historico", input({ historicalClosesCents: [] })],
  ])("retorna dados insuficientes para %s", (_caseName, trendInput) => {
    const result = engine.evaluate(trendInput);

    expect(result.classification).toBe(
      EducationalTrendClassification.DADOS_INSUFICIENTES,
    );
    expect(result.confidence).toBe("LOW");
  });

  it("reduz confianca com dado atrasado", () => {
    const fresh = engine.evaluate(input({ delayed: false }));
    const delayed = engine.evaluate(input({ delayed: true }));

    expect(fresh.confidence).toBe("HIGH");
    expect(delayed.confidence).toBe("LOW");
    expect(delayed.warnings.join(" ")).toContain("atrasados");
  });

  it("volume ausente fica neutro", () => {
    const result = engine.evaluate(
      input({
        historicalClosesCents: history(linear(1_000, 10)),
        volume: undefined,
        averageVolume20d: undefined,
      }),
    );

    expect(result.factors).toContainEqual(
      expect.objectContaining({
        code: "VOLUME_UNAVAILABLE",
        impact: "NEUTRAL",
      }),
    );
  });

  it("diferencia ativo fora da carteira e concentracao elevada sem previsao", () => {
    const outside = engine.evaluate(
      input({ portfolioContext: { inPortfolio: false } }),
    );
    const concentrated = engine.evaluate(
      input({
        portfolioContext: {
          inPortfolio: true,
          allocationPercent: 55,
          sectorAllocationPercent: 70,
        },
      }),
    );

    expect(outside.factors).toContainEqual(
      expect.objectContaining({ code: "PORTFOLIO_PRESENCE" }),
    );
    expect(concentrated.factors).toContainEqual(
      expect.objectContaining({
        code: "ASSET_CONCENTRATION",
        impact: "NEUTRAL",
      }),
    );
    expect(concentrated.warnings.join(" ")).not.toMatch(/previsao positiva/i);
  });

  it("mantem score entre -100 e 100, e deterministico", () => {
    const trendInput = input({
      historicalClosesCents: history(linear(1_000, 200)),
      changePercent1d: 50,
    });
    const first = engine.evaluate(trendInput);
    const second = engine.evaluate(trendInput);

    expect(first.score).toBeGreaterThanOrEqual(-100);
    expect(first.score).toBeLessThanOrEqual(100);
    expect(second).toEqual(first);
  });

  it("ignora dados futuros", () => {
    const withoutFuture = engine.evaluate(input({}));
    const withFuture = engine.evaluate(
      input({
        historicalClosesCents: [
          ...input({}).historicalClosesCents,
          { date: "2026-06-20T00:00:00.000Z", closeCents: 10_000 },
        ],
      }),
    );

    expect(withFuture.score).toBe(withoutFuture.score);
    expect(withFuture.warnings.join(" ")).toContain("posterior");
  });

  it("resultado nao contem termos proibidos do recurso", () => {
    const resultText = JSON.stringify(engine.evaluate(input({}))).toLowerCase();

    for (const forbidden of [
      "recomendacao de analistas",
      "consenso de analistas",
      "compre",
      "venda",
      "preco-alvo",
      "garantia",
      "lucro garantido",
    ]) {
      expect(resultText).not.toContain(forbidden);
    }
  });
});
