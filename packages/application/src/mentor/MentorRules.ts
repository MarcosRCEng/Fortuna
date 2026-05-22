import {
  AssetType,
  MentorEducationalConcept,
  MentorGameLoopMoment,
  MentorTipSeverity,
  MentorTipType,
  MentorTriggerType,
  type MentorContext,
  type MentorTip,
} from "@fortuna/domain";
import type { MentorRuleWithTip } from "./MentorTipProvider.js";

const ONCE_PER_PLAYER = 1;
const DAILY_COOLDOWN = { minutes: 24 * 60 };
const CONCENTRATION_BASIS_POINTS = 7_000;
const DIVERSIFIED_MAX_BASIS_POINTS = 6_000;
const DEFAULT_RESERVE_TARGET_CENTS = 20_000;
const EXCESS_CASH_BASIS_POINTS = 8_000;

function tipId(ruleId: string, context: MentorContext): string {
  return `${context.playerId}:${ruleId}`;
}

function hasEvent(context: MentorContext, type: string): boolean {
  return context.recentEvents.some((event) => event.type === type);
}

function boughtAssetType(context: MentorContext, assetTypes: AssetType[]) {
  return context.recentEvents.find(
    (event) =>
      event.type === "AssetBought" &&
      "asset" in event &&
      assetTypes.includes(event.asset.type),
  );
}

function maxAllocationBasisPoints(context: MentorContext): number {
  const allocationMax = context.assetAllocation.reduce(
    (max, item) => Math.max(max, item.percentageBasisPoints),
    0,
  );
  const positionMax =
    context.totalEquityInCents.cents === 0
      ? 0
      : context.portfolioPositions.reduce(
          (max, position) =>
            Math.max(
              max,
              Math.floor(
                (position.marketValue.cents * 10_000) /
                  context.totalEquityInCents.cents,
              ),
            ),
          0,
        );

  return Math.max(allocationMax, positionMax);
}

function liquidReserveCents(context: MentorContext): number {
  const liquidAssetCents = context.portfolioPositions
    .filter((position) =>
      [AssetType.CASH, AssetType.FIXED_INCOME, AssetType.TREASURY].includes(
        position.assetType,
      ),
    )
    .reduce((total, position) => total + position.marketValue.cents, 0);

  return context.currentCashInCents.cents + liquidAssetCents;
}

export const INITIAL_MENTOR_RULES: MentorRuleWithTip[] = [
  {
    id: "mentor-rule-first-buy",
    code: "FIRST_BUY_EDUCATION",
    name: "Primeira compra",
    description:
      "Explica a primeira compra valida como alocacao educativa, nao aposta.",
    priority: 100,
    enabled: true,
    triggerType: MentorTriggerType.FINANCIAL_EVENT,
    conditions: { eventType: "AssetBought" },
    maxOccurrences: ONCE_PER_PLAYER,
    educationalConcepts: [MentorEducationalConcept.RISK],
    evaluate: (context) => hasEvent(context, "AssetBought"),
    createTip: (context, createdAt): MentorTip => ({
      id: tipId("mentor-rule-first-buy", context),
      ruleId: "mentor-rule-first-buy",
      type: MentorTipType.EVENT,
      title: "Primeira compra registrada",
      message:
        "Voce fez sua primeira compra simulada. Investir e alocar recursos com objetivo e risco; no Fortuna, a ideia e aprender o processo, nao apostar em ganho rapido.",
      concept: MentorEducationalConcept.RISK,
      severity: MentorTipSeverity.POSITIVE,
      createdAt,
      metadata: { source: "financial_event" },
    }),
  },
  {
    id: "mentor-rule-first-fixed-income",
    code: "FIRST_FIXED_INCOME_EDUCATION",
    name: "Primeira renda fixa",
    description: "Explica renda fixa, juros, liquidez e vencimento.",
    priority: 90,
    enabled: true,
    triggerType: MentorTriggerType.FINANCIAL_EVENT,
    conditions: { assetTypes: "FIXED_INCOME,TREASURY" },
    maxOccurrences: ONCE_PER_PLAYER,
    educationalConcepts: [
      MentorEducationalConcept.FIXED_INCOME,
      MentorEducationalConcept.INTEREST,
      MentorEducationalConcept.LIQUIDITY,
    ],
    evaluate: (context) =>
      Boolean(
        boughtAssetType(context, [AssetType.FIXED_INCOME, AssetType.TREASURY]),
      ),
    createTip: (context, createdAt): MentorTip => ({
      id: tipId("mentor-rule-first-fixed-income", context),
      ruleId: "mentor-rule-first-fixed-income",
      type: MentorTipType.ASSET,
      title: "Renda fixa na carteira",
      message:
        "Renda fixa costuma ter regras mais previsiveis no simulador, como juros, liquidez e vencimento. Ainda assim, vale observar prazos e riscos antes de comparar ativos.",
      concept: MentorEducationalConcept.FIXED_INCOME,
      severity: MentorTipSeverity.INFO,
      createdAt,
      metadata: { assetType: "FIXED_INCOME" },
    }),
  },
  {
    id: "mentor-rule-first-fii",
    code: "FIRST_FII_EDUCATION",
    name: "Primeiro FII",
    description: "Explica FIIs, rendimentos e oscilacao de preco.",
    priority: 90,
    enabled: true,
    triggerType: MentorTriggerType.FINANCIAL_EVENT,
    conditions: { assetType: AssetType.FII },
    maxOccurrences: ONCE_PER_PLAYER,
    educationalConcepts: [
      MentorEducationalConcept.FII,
      MentorEducationalConcept.DIVIDENDS,
      MentorEducationalConcept.VOLATILITY,
    ],
    evaluate: (context) => Boolean(boughtAssetType(context, [AssetType.FII])),
    createTip: (context, createdAt): MentorTip => ({
      id: tipId("mentor-rule-first-fii", context),
      ruleId: "mentor-rule-first-fii",
      type: MentorTipType.ASSET,
      title: "FII adicionado",
      message:
        "FIIs representam fundos imobiliarios simulados. Eles podem gerar proventos, mas seus precos oscilam e os rendimentos nao sao garantidos.",
      concept: MentorEducationalConcept.FII,
      severity: MentorTipSeverity.INFO,
      createdAt,
      metadata: { assetType: AssetType.FII },
    }),
  },
  {
    id: "mentor-rule-first-stock",
    code: "FIRST_STOCK_EDUCATION",
    name: "Primeira acao",
    description: "Explica acoes, participacao em empresas e volatilidade.",
    priority: 90,
    enabled: true,
    triggerType: MentorTriggerType.FINANCIAL_EVENT,
    conditions: { assetType: AssetType.STOCK },
    maxOccurrences: ONCE_PER_PLAYER,
    educationalConcepts: [
      MentorEducationalConcept.STOCKS,
      MentorEducationalConcept.VOLATILITY,
      MentorEducationalConcept.RISK,
    ],
    evaluate: (context) => Boolean(boughtAssetType(context, [AssetType.STOCK])),
    createTip: (context, createdAt): MentorTip => ({
      id: tipId("mentor-rule-first-stock", context),
      ruleId: "mentor-rule-first-stock",
      type: MentorTipType.ASSET,
      title: "Acao adicionada",
      message:
        "Acoes simulam participacao em empresas. O preco pode oscilar bastante, entao este e um bom momento para estudar volatilidade e risco de mercado.",
      concept: MentorEducationalConcept.STOCKS,
      severity: MentorTipSeverity.INFO,
      createdAt,
      metadata: { assetType: AssetType.STOCK },
    }),
  },
  {
    id: "mentor-rule-first-income",
    code: "FIRST_INCOME_EDUCATION",
    name: "Primeiro rendimento",
    description: "Explica rendimentos, dividendos, juros e proventos.",
    priority: 95,
    enabled: true,
    triggerType: MentorTriggerType.FINANCIAL_EVENT,
    conditions: { eventType: "IncomeCollected" },
    maxOccurrences: ONCE_PER_PLAYER,
    educationalConcepts: [
      MentorEducationalConcept.DIVIDENDS,
      MentorEducationalConcept.INTEREST,
    ],
    evaluate: (context) =>
      hasEvent(context, "IncomeCollected") ||
      hasEvent(context, "FIRST_INCOME_RECEIVED"),
    createTip: (context, createdAt): MentorTip => ({
      id: tipId("mentor-rule-first-income", context),
      ruleId: "mentor-rule-first-income",
      type: MentorTipType.EVENT,
      title: "Primeiro rendimento simulado",
      message:
        "Voce recebeu seu primeiro rendimento simulado. Rendimentos podem vir de juros, dividendos ou proventos, mas eles nao sao garantidos em todos os tipos de investimento.",
      concept: MentorEducationalConcept.DIVIDENDS,
      severity: MentorTipSeverity.POSITIVE,
      createdAt,
      metadata: { source: "financial_event" },
    }),
  },
  {
    id: "mentor-rule-sale-at-loss",
    code: "SALE_AT_LOSS_EDUCATION",
    name: "Venda com prejuizo simulado",
    description:
      "Explica prejuizo realizado quando a venda ocorre abaixo do preco medio informado no evento.",
    priority: 85,
    enabled: true,
    triggerType: MentorTriggerType.FINANCIAL_EVENT,
    conditions: { eventType: "AssetSold", requiresMetadata: true },
    cooldown: DAILY_COOLDOWN,
    educationalConcepts: [
      MentorEducationalConcept.AVERAGE_PRICE,
      MentorEducationalConcept.VOLATILITY,
    ],
    evaluate: (context) =>
      context.recentEvents.some((event) => {
        const metadata =
          "metadata" in event && event.metadata ? event.metadata : undefined;
        return (
          event.type === "ASSET_SOLD" &&
          typeof metadata?.unitPriceCents === "number" &&
          typeof metadata.averagePriceCents === "number" &&
          metadata.unitPriceCents < metadata.averagePriceCents
        );
      }),
    createTip: (context, createdAt): MentorTip => ({
      id: tipId("mentor-rule-sale-at-loss", context),
      ruleId: "mentor-rule-sale-at-loss",
      type: MentorTipType.EDUCATIONAL_ALERT,
      title: "Venda abaixo do preco medio",
      message:
        "Esta venda simulada ocorreu abaixo do preco medio informado. Oscilacoes fazem parte do aprendizado; prejuizo realizado e diferente de uma variacao temporaria na carteira.",
      concept: MentorEducationalConcept.AVERAGE_PRICE,
      severity: MentorTipSeverity.WARNING,
      createdAt,
      metadata: { source: "financial_event" },
    }),
  },
  {
    id: "mentor-rule-no-reserve",
    code: "NO_RESERVE_EDUCATION",
    name: "Jogador sem reserva",
    description: "Explica reserva de emergencia quando caixa liquido e baixo.",
    priority: 80,
    enabled: true,
    triggerType: MentorTriggerType.PORTFOLIO_VIEW,
    conditions: { reserveTargetCents: DEFAULT_RESERVE_TARGET_CENTS },
    cooldown: DAILY_COOLDOWN,
    educationalConcepts: [
      MentorEducationalConcept.EMERGENCY_RESERVE,
      MentorEducationalConcept.LIQUIDITY,
    ],
    evaluate: (context) => {
      const target =
        context.emergencyReserveTargetCents ?? DEFAULT_RESERVE_TARGET_CENTS;
      return (
        context.totalEquityInCents.cents > 0 &&
        liquidReserveCents(context) < target
      );
    },
    createTip: (context, createdAt): MentorTip => ({
      id: tipId("mentor-rule-no-reserve", context),
      ruleId: "mentor-rule-no-reserve",
      type: MentorTipType.EDUCATIONAL_ALERT,
      title: "Reserva ainda em formacao",
      message:
        "Sua reserva simulada ainda esta baixa. Em educacao financeira, reserva de emergencia e dinheiro com liquidez para reduzir a necessidade de vender ativos em momentos ruins.",
      concept: MentorEducationalConcept.EMERGENCY_RESERVE,
      severity: MentorTipSeverity.WARNING,
      actionLabel: "Ver missao de reserva",
      relatedMissionId: "mission-emergency-reserve",
      createdAt,
      metadata: {
        liquidReserveCents: liquidReserveCents(context),
        targetCents:
          context.emergencyReserveTargetCents ?? DEFAULT_RESERVE_TARGET_CENTS,
      },
    }),
  },
  {
    id: "mentor-rule-concentrated-portfolio",
    code: "CONCENTRATED_PORTFOLIO_EDUCATION",
    name: "Carteira muito concentrada",
    description: "Explica concentracao por ativo ou por tipo de ativo.",
    priority: 75,
    enabled: true,
    triggerType: MentorTriggerType.PORTFOLIO_VIEW,
    conditions: { concentrationBasisPoints: CONCENTRATION_BASIS_POINTS },
    cooldown: DAILY_COOLDOWN,
    educationalConcepts: [MentorEducationalConcept.DIVERSIFICATION],
    evaluate: (context) =>
      maxAllocationBasisPoints(context) >= CONCENTRATION_BASIS_POINTS,
    createTip: (context, createdAt): MentorTip => ({
      id: tipId("mentor-rule-concentrated-portfolio", context),
      ruleId: "mentor-rule-concentrated-portfolio",
      type: MentorTipType.PORTFOLIO_COMPOSITION,
      title: "Carteira concentrada",
      message:
        "Sua carteira esta bem concentrada em poucos ativos ou tipos. Em educacao financeira, diversificacao ajuda a reduzir a dependencia de um unico resultado.",
      concept: MentorEducationalConcept.DIVERSIFICATION,
      severity: MentorTipSeverity.WARNING,
      createdAt,
      metadata: { maxAllocationBasisPoints: maxAllocationBasisPoints(context) },
    }),
  },
  {
    id: "mentor-rule-excess-cash",
    code: "EXCESS_CASH_EDUCATION",
    name: "Excesso de caixa",
    description:
      "Explica que caixa oferece liquidez, mas pode ter custo de oportunidade no simulador.",
    priority: 55,
    enabled: true,
    triggerType: MentorTriggerType.PORTFOLIO_VIEW,
    conditions: { cashBasisPoints: EXCESS_CASH_BASIS_POINTS },
    cooldown: DAILY_COOLDOWN,
    educationalConcepts: [
      MentorEducationalConcept.LIQUIDITY,
      MentorEducationalConcept.INTEREST,
    ],
    evaluate: (context) => {
      if (
        context.currentGameLoopMoment !== MentorGameLoopMoment.PORTFOLIO ||
        context.totalEquityInCents.cents === 0
      ) {
        return false;
      }

      const cashBps = Math.floor(
        (context.currentCashInCents.cents * 10_000) /
          context.totalEquityInCents.cents,
      );
      return cashBps >= EXCESS_CASH_BASIS_POINTS;
    },
    createTip: (context, createdAt): MentorTip => ({
      id: tipId("mentor-rule-excess-cash", context),
      ruleId: "mentor-rule-excess-cash",
      type: MentorTipType.PORTFOLIO_COMPOSITION,
      title: "Caixa alto",
      message:
        "Manter caixa aumenta a liquidez e pode fazer sentido na simulacao. Ao mesmo tempo, estudar juros e prazos ajuda a entender o custo de deixar muitos recursos parados.",
      concept: MentorEducationalConcept.LIQUIDITY,
      severity: MentorTipSeverity.INFO,
      createdAt,
      metadata: { cashCents: context.currentCashInCents.cents },
    }),
  },
  {
    id: "mentor-rule-diversification-achieved",
    code: "DIVERSIFICATION_ACHIEVED_EDUCATION",
    name: "Diversificacao alcancada",
    description: "Parabeniza distribuicao minima entre tipos de ativos.",
    priority: 70,
    enabled: true,
    triggerType: MentorTriggerType.GAME_LOOP,
    conditions: {
      minimumPositions: 3,
      minimumAssetTypes: 2,
      maxAllocationBasisPoints: DIVERSIFIED_MAX_BASIS_POINTS,
    },
    maxOccurrences: ONCE_PER_PLAYER,
    educationalConcepts: [MentorEducationalConcept.DIVERSIFICATION],
    evaluate: (context) => {
      const assetTypes = new Set(
        context.portfolioPositions.map((position) => position.assetType),
      );
      return (
        context.portfolioPositions.length >= 3 &&
        assetTypes.size >= 2 &&
        maxAllocationBasisPoints(context) <= DIVERSIFIED_MAX_BASIS_POINTS
      );
    },
    createTip: (context, createdAt): MentorTip => ({
      id: tipId("mentor-rule-diversification-achieved", context),
      ruleId: "mentor-rule-diversification-achieved",
      type: MentorTipType.HEALTHY_BEHAVIOR,
      title: "Diversificacao iniciada",
      message:
        "Boa evolucao: sua carteira simulada ja combina ativos ou tipos diferentes. Diversificar nao remove riscos, mas reduz a dependencia de um unico resultado.",
      concept: MentorEducationalConcept.DIVERSIFICATION,
      severity: MentorTipSeverity.POSITIVE,
      relatedMissionId: "mission-diversification",
      createdAt,
      metadata: { positionCount: context.portfolioPositions.length },
    }),
  },
];
