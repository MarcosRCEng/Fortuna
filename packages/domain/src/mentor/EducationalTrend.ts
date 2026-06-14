import { AssetType } from "../value-objects/AssetType.js";

export const EDUCATIONAL_TREND_METHODOLOGY_VERSION = "educational-trend-v1";

export const EDUCATIONAL_TREND_DISCLAIMER =
  "Conteudo educacional. Nao e recomendacao financeira, nao preve desempenho futuro, dados podem estar atrasados e decisoes reais exigem avaliacao propria.";

export enum EducationalTrendClassification {
  MOMENTO_MUITO_POSITIVO = "MOMENTO_MUITO_POSITIVO",
  MOMENTO_POSITIVO = "MOMENTO_POSITIVO",
  MOMENTO_NEUTRO = "MOMENTO_NEUTRO",
  MOMENTO_NEGATIVO = "MOMENTO_NEGATIVO",
  MOMENTO_MUITO_NEGATIVO = "MOMENTO_MUITO_NEGATIVO",
  DADOS_INSUFICIENTES = "DADOS_INSUFICIENTES",
}

export type EducationalTrendConfidence = "LOW" | "MEDIUM" | "HIGH";
export type EducationalTrendImpact = "POSITIVE" | "NEUTRAL" | "NEGATIVE";

export interface EducationalTrendInput {
  symbol: string;
  assetType: AssetType;
  currentPriceCents?: number;
  historicalClosesCents: Array<{
    date: string;
    closeCents: number;
    volume?: number;
  }>;
  changePercent1d?: number;
  volume?: number;
  averageVolume20d?: number;
  portfolioContext?: {
    inPortfolio: boolean;
    allocationPercent?: number;
    sectorAllocationPercent?: number;
  };
  dataAsOf: string;
  delayed: boolean;
}

export interface EducationalTrendFactor {
  code: string;
  label: string;
  impact: EducationalTrendImpact;
  explanation: string;
}

export interface EducationalTrendResult {
  symbol: string;
  classification: EducationalTrendClassification;
  score: number;
  confidence: EducationalTrendConfidence;
  factors: EducationalTrendFactor[];
  warnings: string[];
  dataAsOf: string;
  methodologyVersion: string;
  disclaimer: string;
}

interface UsablePoint {
  date: string;
  closeCents: number;
  volume?: number;
}

const MIN_POINTS = 5;
const SHORT_WINDOW = 5;
const LONG_WINDOW = 20;

export class EducationalTrendEngine {
  evaluate(input: EducationalTrendInput): EducationalTrendResult {
    const symbol = input.symbol.trim().toUpperCase();
    const dataAsOf = normalizeDateTime(input.dataAsOf);
    const warnings: string[] = [];
    const factors: EducationalTrendFactor[] = [];
    const usableHistory = this.usableHistory(input, dataAsOf);
    const ignoredFuturePoints =
      input.historicalClosesCents.length - usableHistory.length;

    if (ignoredFuturePoints > 0) {
      warnings.push("Pontos com data posterior ao dado de referencia foram ignorados.");
    }

    const currentPriceCents = input.currentPriceCents;
    if (
      typeof currentPriceCents !== "number" ||
      !Number.isSafeInteger(currentPriceCents) ||
      currentPriceCents <= 0
    ) {
      return this.insufficient(symbol, dataAsOf, [
        {
          code: "CURRENT_PRICE_UNAVAILABLE",
          label: "Preco atual indisponivel",
          impact: "NEGATIVE",
          explanation:
            "Sem preco atual em centavos, o indicador nao calcula os sinais.",
        },
      ], warnings);
    }

    if (usableHistory.length < MIN_POINTS) {
      return this.insufficient(symbol, dataAsOf, [
        {
          code: "HISTORY_TOO_SHORT",
          label: "Historico curto",
          impact: "NEGATIVE",
          explanation:
            "Ha poucos fechamentos para comparar janelas de curto prazo.",
        },
      ], warnings);
    }

    const scoreParts: number[] = [];
    const latestClose = usableHistory.at(-1)!.closeCents;
    const shortBase = usableHistory.at(-Math.min(SHORT_WINDOW, usableHistory.length))!;
    const shortReturnBps = basisPointChange(latestClose, shortBase.closeCents);
    const shortScore = scaleToScore(shortReturnBps, 2_000, 30);
    scoreParts.push(shortScore);
    factors.push({
      code: "SHORT_TREND",
      label: "Comportamento recente do preco",
      impact: impactFromSignedScore(shortScore, 4),
      explanation: `A janela curta variou ${formatBps(shortReturnBps)} ate ${usableHistory.at(-1)!.date}.`,
    });

    if (usableHistory.length >= 10) {
      const shortAverage = average(
        usableHistory.slice(-SHORT_WINDOW).map((point) => point.closeCents),
      );
      const longAverage = average(
        usableHistory.slice(-Math.min(LONG_WINDOW, usableHistory.length)).map(
          (point) => point.closeCents,
        ),
      );
      const averageDistanceBps = basisPointChange(shortAverage, longAverage);
      const averageScore = scaleToScore(averageDistanceBps, 1_500, 25);
      scoreParts.push(averageScore);
      factors.push({
        code: "MOVING_AVERAGES",
        label: "Distancia entre medias",
        impact: impactFromSignedScore(averageScore, 4),
        explanation: `A media curta esta ${formatBps(averageDistanceBps)} em relacao a media longa disponivel.`,
      });
    } else {
      factors.push({
        code: "MOVING_AVERAGES",
        label: "Distancia entre medias",
        impact: "NEUTRAL",
        explanation:
          "Ainda nao ha pontos suficientes para uma media longa robusta.",
      });
    }

    if (input.changePercent1d !== undefined && Number.isFinite(input.changePercent1d)) {
      const oneDayBps = Math.trunc(input.changePercent1d * 100);
      const oneDayScore = scaleToScore(oneDayBps, 700, 10);
      scoreParts.push(oneDayScore);
      factors.push({
        code: "ONE_DAY_CHANGE",
        label: "Variacao de um dia",
        impact: impactFromSignedScore(oneDayScore, 2),
        explanation: `O ultimo movimento diario informado foi ${formatBps(oneDayBps)}.`,
      });
    }

    const volatilityBps = this.volatilityBps(usableHistory);
    const volatilityScore = volatilityScoreFor(volatilityBps);
    scoreParts.push(volatilityScore);
    factors.push({
      code: "VOLATILITY",
      label: "Volatilidade recente",
      impact:
        volatilityScore < 0
          ? "NEGATIVE"
          : volatilityScore > 0
            ? "POSITIVE"
            : "NEUTRAL",
      explanation: `A oscilacao media estimada foi ${formatBps(volatilityBps)} por dia na janela observada.`,
    });

    const volumeFactor = this.volumeFactor(input, usableHistory);
    if (volumeFactor.score !== undefined) {
      scoreParts.push(volumeFactor.score);
    }
    factors.push(volumeFactor.factor);

    this.appendPortfolioFactors(input, factors, warnings);

    if (input.delayed) {
      warnings.push("Os dados podem estar atrasados, em cache ou em fallback controlado.");
    }

    const score = clampScore(scoreParts.reduce((total, part) => total + part, 0));
    return {
      symbol,
      classification: classifyScore(score),
      score,
      confidence: confidenceFor(usableHistory.length, input, warnings),
      factors,
      warnings,
      dataAsOf,
      methodologyVersion: EDUCATIONAL_TREND_METHODOLOGY_VERSION,
      disclaimer: EDUCATIONAL_TREND_DISCLAIMER,
    };
  }

  private usableHistory(
    input: EducationalTrendInput,
    dataAsOf: string,
  ): UsablePoint[] {
    const limit = new Date(dataAsOf).getTime();
    return input.historicalClosesCents
      .filter((point) => {
        const timestamp = new Date(point.date).getTime();
        return (
          Number.isFinite(timestamp) &&
          timestamp <= limit &&
          Number.isSafeInteger(point.closeCents) &&
          point.closeCents > 0
        );
      })
      .map((point) => ({
        date: point.date.slice(0, 10),
        closeCents: point.closeCents,
        volume: point.volume,
      }))
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  private volatilityBps(history: UsablePoint[]): number {
    const returns = history
      .slice(1)
      .map((point, index) => basisPointChange(point.closeCents, history[index]!.closeCents));
    if (returns.length === 0) {
      return 0;
    }
    const mean = average(returns);
    const variance = average(returns.map((value) => (value - mean) ** 2));
    return Math.trunc(Math.sqrt(variance));
  }

  private volumeFactor(
    input: EducationalTrendInput,
    history: UsablePoint[],
  ): { factor: EducationalTrendFactor; score?: number } {
    const volume =
      input.volume ??
      [...history].reverse().find((point) => point.volume !== undefined)?.volume;
    const averageVolume =
      input.averageVolume20d ??
      averageOptional(
        history
          .slice(-LONG_WINDOW)
          .map((point) => point.volume)
          .filter((value): value is number => value !== undefined && value > 0),
      );

    if (!volume || !averageVolume) {
      return {
        factor: {
          code: "VOLUME_UNAVAILABLE",
          label: "Volume indisponivel",
          impact: "NEUTRAL",
          explanation:
            "Sem volume confiavel, esse componente fica neutro e nao penaliza o indicador.",
        },
      };
    }

    const ratioBps = Math.trunc((volume * 10_000) / averageVolume);
    const score = ratioBps >= 12_000 ? 5 : ratioBps < 8_000 ? -3 : 0;
    return {
      score,
      factor: {
        code: "VOLUME",
        label: "Volume relativo",
        impact: impactFromSignedScore(score, 1),
        explanation: `O volume observado ficou em ${formatBps(ratioBps - 10_000)} frente a media recente.`,
      },
    };
  }

  private appendPortfolioFactors(
    input: EducationalTrendInput,
    factors: EducationalTrendFactor[],
    warnings: string[],
  ): void {
    const context = input.portfolioContext;
    if (!context) {
      factors.push({
        code: "PORTFOLIO_CONTEXT_UNAVAILABLE",
        label: "Contexto da carteira",
        impact: "NEUTRAL",
        explanation:
          "Sem contexto da carteira, o indicador avalia apenas sinais do ativo.",
      });
      return;
    }

    factors.push({
      code: "PORTFOLIO_PRESENCE",
      label: "Presenca na carteira",
      impact: "NEUTRAL",
      explanation: context.inPortfolio
        ? "O ativo ja faz parte da carteira simulada, entao a concentracao merece leitura separada."
        : "O ativo nao faz parte da carteira simulada; o indicador mostra apenas sinais observaveis.",
    });

    if ((context.allocationPercent ?? 0) >= 40) {
      warnings.push(
        "Concentracao elevada no ativo; isso e um alerta educativo de diversificacao, nao previsao de preco.",
      );
      factors.push({
        code: "ASSET_CONCENTRATION",
        label: "Concentracao no ativo",
        impact: "NEUTRAL",
        explanation:
          "Concentracao aumenta dependencia de um unico ativo e deve ser analisada separadamente do score.",
      });
    }

    if ((context.sectorAllocationPercent ?? 0) >= 60) {
      warnings.push(
        "Concentracao elevada no tipo do ativo; avalie diversificacao de forma educativa.",
      );
    }
  }

  private insufficient(
    symbol: string,
    dataAsOf: string,
    factors: EducationalTrendFactor[],
    warnings: string[],
  ): EducationalTrendResult {
    return {
      symbol,
      classification: EducationalTrendClassification.DADOS_INSUFICIENTES,
      score: 0,
      confidence: "LOW",
      factors,
      warnings,
      dataAsOf,
      methodologyVersion: EDUCATIONAL_TREND_METHODOLOGY_VERSION,
      disclaimer: EDUCATIONAL_TREND_DISCLAIMER,
    };
  }
}

function basisPointChange(current: number, previous: number): number {
  if (previous <= 0) {
    return 0;
  }
  return Math.trunc(((current - previous) * 10_000) / previous);
}

function scaleToScore(valueBps: number, fullScaleBps: number, maxScore: number): number {
  const clamped = Math.max(-fullScaleBps, Math.min(fullScaleBps, valueBps));
  return Math.trunc((clamped * maxScore) / fullScaleBps);
}

function volatilityScoreFor(volatilityBps: number): number {
  if (volatilityBps > 350) {
    return -15;
  }
  if (volatilityBps > 200) {
    return -8;
  }
  if (volatilityBps <= 80) {
    return 5;
  }
  return 0;
}

function classifyScore(score: number): EducationalTrendClassification {
  if (score >= 50) {
    return EducationalTrendClassification.MOMENTO_MUITO_POSITIVO;
  }
  if (score >= 25) {
    return EducationalTrendClassification.MOMENTO_POSITIVO;
  }
  if (score <= -50) {
    return EducationalTrendClassification.MOMENTO_MUITO_NEGATIVO;
  }
  if (score <= -25) {
    return EducationalTrendClassification.MOMENTO_NEGATIVO;
  }
  return EducationalTrendClassification.MOMENTO_NEUTRO;
}

function confidenceFor(
  points: number,
  input: EducationalTrendInput,
  warnings: string[],
): EducationalTrendConfidence {
  if (points >= LONG_WINDOW && !input.delayed && warnings.length === 0) {
    return "HIGH";
  }
  if (points >= 10 && !input.delayed) {
    return "MEDIUM";
  }
  return "LOW";
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Math.trunc(values.reduce((total, value) => total + value, 0) / values.length);
}

function averageOptional(values: number[]): number | undefined {
  return values.length === 0 ? undefined : average(values);
}

function clampScore(score: number): number {
  return Math.max(-100, Math.min(100, score));
}

function impactFromSignedScore(
  score: number,
  neutralThreshold: number,
): EducationalTrendImpact {
  if (score >= neutralThreshold) {
    return "POSITIVE";
  }
  if (score <= -neutralThreshold) {
    return "NEGATIVE";
  }
  return "NEUTRAL";
}

function normalizeDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString();
  }
  return parsed.toISOString();
}

function formatBps(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value / 100).toFixed(2)}%`;
}
