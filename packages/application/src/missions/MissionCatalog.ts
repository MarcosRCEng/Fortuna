import { AssetType, RiskLevel, type Mission } from "@fortuna/domain";

export const MAX_RECOMMENDED_ASSET_CONCENTRATION_PERCENT = 50;
export const MAX_RECOMMENDED_ASSET_CONCENTRATION_BASIS_POINTS =
  MAX_RECOMMENDED_ASSET_CONCENTRATION_PERCENT * 100;

export const MVP_MISSIONS: readonly Mission[] = [
  {
    id: "mission-first-investment",
    code: "FIRST_INVESTMENT",
    title: "Primeiro investimento",
    description: "Compre seu primeiro ativo.",
    objective: "Comprar qualquer ativo pela primeira vez.",
    educationalExplanation:
      "Investir começa com uma decisao consciente: entender o ativo comprado, o risco assumido e o objetivo daquela escolha.",
    cityRelation: "Marca o primeiro passo educativo do jogador na Cidade Fortuna.",
    type: "ACTION",
    status: "AVAILABLE",
    criteria: { kind: "FIRST_ASSET_BOUGHT", targetValue: 1 },
    completionRule: {
      ruleType: "EVENT_BASED",
      requiredEvent: "ASSET_PURCHASED",
      requiredCount: 1,
    },
    reward: { type: "XP", label: "50 XP", amount: 50 },
    progress: { current: 0, target: 1, unit: "COUNT" },
    relatedEvents: ["ASSET_PURCHASED", "FIRST_BUY"],
  },
  {
    id: "mission-liquidity-reserve",
    code: "LIQUIDITY_RESERVE",
    title: "Reserva de liquidez",
    description: "Compre renda fixa com liquidez diaria.",
    objective: "Comprar pelo menos um ativo de renda fixa com liquidez diaria.",
    educationalExplanation:
      "Reserva de liquidez ajuda a lidar com imprevistos antes de assumir riscos maiores. No jogo, ela representa uma base de seguranca.",
    cityRelation: "Desbloqueia uma leitura educativa sobre liquidez.",
    type: "EDUCATIONAL",
    status: "AVAILABLE",
    criteria: {
      kind: "BUY_DAILY_LIQUIDITY_FIXED_INCOME",
      targetValue: 1,
      assetType: AssetType.FIXED_INCOME,
      liquidity: "DAILY",
    },
    completionRule: {
      ruleType: "EVENT_BASED",
      requiredEvent: "ASSET_PURCHASED",
      targetAssetClass: AssetType.FIXED_INCOME,
      requiredCount: 1,
    },
    reward: { type: "XP", label: "75 XP", amount: 75 },
    progress: { current: 0, target: 1, unit: "COUNT" },
    relatedEvents: ["ASSET_PURCHASED"],
  },
  {
    id: "mission-initial-diversification",
    code: "INITIAL_DIVERSIFICATION",
    title: "Diversificacao inicial",
    description: "Tenha pelo menos dois tipos de ativos na carteira.",
    objective: "Manter posicao positiva em dois tipos diferentes de ativos.",
    educationalExplanation:
      "Diversificar ajuda a reduzir concentracao e exposicao excessiva a uma unica classe de ativo. Isso nao elimina riscos, mas melhora a leitura da carteira.",
    cityRelation: "Sinaliza uma carteira com primeiras bases de diversificacao.",
    type: "PORTFOLIO",
    status: "AVAILABLE",
    criteria: { kind: "HOLD_AT_LEAST_TWO_ASSET_TYPES", targetValue: 2 },
    completionRule: {
      ruleType: "PORTFOLIO_STATE_BASED",
      requiredCount: 2,
    },
    reward: { type: "XP", label: "100 XP", amount: 100 },
    progress: { current: 0, target: 2, unit: "COUNT" },
    relatedEvents: ["ASSET_PURCHASED", "ASSET_SOLD", "PORTFOLIO_UPDATED"],
  },
  {
    id: "mission-first-income-collected",
    code: "FIRST_INCOME_COLLECTED",
    title: "Colher rendimento",
    description: "Colete rendimento pela primeira vez.",
    objective: "Coletar o primeiro rendimento simulado disponivel.",
    educationalExplanation:
      "Alguns ativos geram renda recorrente, como juros, dividendos ou rendimentos simulados. Isso nao e garantia de ganho real.",
    cityRelation: "Registra o primeiro fluxo de renda da carteira.",
    type: "INCOME",
    status: "AVAILABLE",
    criteria: { kind: "FIRST_INCOME_COLLECTED", targetValue: 1 },
    completionRule: {
      ruleType: "EVENT_BASED",
      requiredEvent: "INCOME_COLLECTED",
      requiredCount: 1,
    },
    reward: { type: "XP", label: "50 XP", amount: 50 },
    progress: { current: 0, target: 1, unit: "COUNT" },
    relatedEvents: ["INCOME_COLLECTED", "FIRST_INCOME_RECEIVED"],
  },
  {
    id: "mission-high-risk-viewed",
    code: "HIGH_RISK_VIEWED",
    title: "Conhecer risco",
    description: "Visualize detalhes educativos de um ativo de maior risco.",
    objective: "Estudar um ativo classificado como alto risco.",
    educationalExplanation:
      "Risco significa possibilidade de variacao, perdas simuladas e incerteza. Maior retorno esperado geralmente vem acompanhado de maior risco.",
    cityRelation: "Adiciona contexto educativo ao Mentor Fortuna.",
    type: "EDUCATIONAL",
    status: "AVAILABLE",
    criteria: {
      kind: "VIEW_HIGH_RISK_ASSET_DETAILS",
      targetValue: 1,
      riskLevel: RiskLevel.HIGH,
    },
    completionRule: {
      ruleType: "EDUCATIONAL_INTERACTION_BASED",
      requiredEvent: "RISK_EDUCATION_VIEWED",
      requiredCount: 1,
    },
    reward: { type: "XP", label: "50 XP", amount: 50 },
    progress: { current: 0, target: 1, unit: "COUNT" },
    relatedEvents: ["ASSET_DETAILS_VIEWED", "RISK_EDUCATION_VIEWED"],
  },
  {
    id: "mission-concentration-alert",
    code: "CONCENTRATION_ALERT",
    title: "Evitar concentracao",
    description: "Receba um alerta quando um ativo passar de 50% da carteira.",
    objective: "Perceber concentracao excessiva sem bloquear a operacao.",
    educationalExplanation:
      "Concentrar muito patrimonio em um unico ativo aumenta a exposicao a riscos especificos. O alerta e orientativo, nao punitivo.",
    cityRelation: "Libera o primeiro alerta educativo de concentracao.",
    type: "RISK_ALERT",
    status: "AVAILABLE",
    criteria: {
      kind: "ASSET_CONCENTRATION_ALERT_TRIGGERED",
      targetValue: MAX_RECOMMENDED_ASSET_CONCENTRATION_BASIS_POINTS,
    },
    completionRule: {
      ruleType: "EVENT_BASED",
      requiredEvent: "CONCENTRATION_ALERT_TRIGGERED",
      requiredCount: 1,
    },
    reward: { type: "XP", label: "75 XP", amount: 75 },
    progress: { current: 0, target: 1, unit: "COUNT" },
    relatedEvents: [
      "ASSET_PURCHASED",
      "ASSET_SOLD",
      "MARKET_PRICES_REFRESHED",
      "CONCENTRATION_ALERT_TRIGGERED",
    ],
  },
];
