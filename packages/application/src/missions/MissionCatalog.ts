import { AssetType, type Mission } from "@fortuna/domain";

export const EMERGENCY_RESERVE_MINIMUM_CENTS = 10_000;
export const SAFETY_CASH_MINIMUM_BASIS_POINTS = 1_000;
export const CONCENTRATION_MAXIMUM_BASIS_POINTS = 6_000;

export const MVP_MISSIONS: readonly Mission[] = [
  {
    id: "initial-reserve",
    title: "Criar reserva inicial",
    description: "Mantenha uma parte do saldo disponivel como reserva.",
    objective: "Manter pelo menos 10.000 moedas Fortuna em caixa.",
    educationalExplanation:
      "Uma reserva ajuda a lidar com imprevistos sem precisar vender investimentos em um momento ruim. Antes de buscar rentabilidade, e importante construir seguranca.",
    cityRelation:
      "Desbloqueia uma pequena praca-cofre que representa seguranca na Cidade Fortuna.",
    type: "FIRST_RESERVE",
    status: "AVAILABLE",
    completionRule: {
      ruleType: "PORTFOLIO_STATE_BASED",
      targetValue: EMERGENCY_RESERVE_MINIMUM_CENTS,
    },
    reward: {
      type: "EDUCATIONAL_BADGE",
      targetId: "PRIMEIRA_RESERVA",
      label: "Primeira Reserva",
    },
    progress: {
      current: 0,
      target: EMERGENCY_RESERVE_MINIMUM_CENTS,
      unit: "CENTS",
    },
    relatedEvents: ["PORTFOLIO_UPDATED", "EMERGENCY_RESERVE_COMPLETED"],
  },
  {
    id: "first-fixed-income",
    title: "Primeiro passo na renda fixa",
    description: "Compre seu primeiro ativo de renda fixa.",
    objective: "Comprar pelo menos um ativo de renda fixa.",
    educationalExplanation:
      "Renda fixa representa investimentos com regras de remuneracao mais previsiveis. Ela costuma ser usada para objetivos de menor risco e maior planejamento.",
    cityRelation:
      "Desbloqueia o Banco Comunitario na Cidade Fortuna e uma dica basica sobre renda fixa.",
    type: "UNDERSTAND_FIXED_INCOME",
    status: "AVAILABLE",
    completionRule: {
      ruleType: "EVENT_BASED",
      requiredEvent: "ASSET_PURCHASED",
      targetAssetClass: AssetType.FIXED_INCOME,
      requiredCount: 1,
    },
    reward: {
      type: "UNLOCK_BUILDING",
      targetId: "community-bank",
      label: "Banco Comunitario",
    },
    progress: { current: 0, target: 1, unit: "COUNT" },
    relatedEvents: ["ASSET_PURCHASED"],
  },
  {
    id: "first-income",
    title: "Colher primeiro rendimento",
    description: "Receba o primeiro rendimento positivo de um investimento.",
    objective: "Colher um rendimento maior que zero.",
    educationalExplanation:
      "Rendimentos sao valores gerados por alguns investimentos ao longo do tempo. Eles mostram a importancia da paciencia e da constancia.",
    cityRelation:
      "Ativa uma animacao simples de crescimento e concede o selo Primeiro Rendimento.",
    type: "FIRST_INCOME",
    status: "AVAILABLE",
    completionRule: {
      ruleType: "EVENT_BASED",
      requiredEvent: "INCOME_COLLECTED",
      targetValue: 1,
      requiredCount: 1,
    },
    reward: {
      type: "EDUCATIONAL_BADGE",
      targetId: "PRIMEIRO_RENDIMENTO",
      label: "Primeiro Rendimento",
    },
    progress: { current: 0, target: 1, unit: "COUNT" },
    relatedEvents: ["INCOME_COLLECTED", "FIRST_INCOME_RECEIVED"],
  },
  {
    id: "first-reit",
    title: "Conhecer fundos imobiliarios",
    description: "Compre seu primeiro FII simulado.",
    objective: "Comprar pelo menos um ativo da classe FII.",
    educationalExplanation:
      "FIIs permitem exposicao ao mercado imobiliario de forma fracionada. Eles podem gerar rendimentos, mas tambem possuem riscos e variacao de preco.",
    cityRelation:
      "Desbloqueia o Centro Comercial e uma dica basica sobre FIIs.",
    type: "UNDERSTAND_REITS",
    status: "AVAILABLE",
    completionRule: {
      ruleType: "EVENT_BASED",
      requiredEvent: "ASSET_PURCHASED",
      targetAssetClass: AssetType.FII,
      requiredCount: 1,
    },
    reward: {
      type: "UNLOCK_BUILDING",
      targetId: "commercial-center",
      label: "Centro Comercial",
    },
    progress: { current: 0, target: 1, unit: "COUNT" },
    relatedEvents: ["ASSET_PURCHASED"],
  },
  {
    id: "diversify-three-classes",
    title: "Diversificar em 3 classes",
    description: "Distribua a carteira entre diferentes classes de ativos.",
    objective: "Ter posicao positiva em pelo menos 3 classes de ativos.",
    educationalExplanation:
      "Diversificar significa distribuir recursos entre diferentes tipos de ativos. Isso pode reduzir a dependencia de um unico investimento.",
    cityRelation:
      "Desbloqueia um novo distrito da Cidade Fortuna e o selo Carteira Diversificada.",
    type: "FIRST_DIVERSIFICATION",
    status: "AVAILABLE",
    completionRule: {
      ruleType: "PORTFOLIO_STATE_BASED",
      requiredCount: 3,
    },
    reward: {
      type: "UNLOCK_DISTRICT",
      targetId: "DISTRITO_DIVERSIFICACAO",
      label: "Distrito da Diversificacao",
    },
    progress: { current: 0, target: 3, unit: "COUNT" },
    relatedEvents: ["PORTFOLIO_UPDATED", "FIRST_DIVERSIFICATION"],
  },
  {
    id: "keep-safety-cash",
    title: "Manter saldo de seguranca",
    description: "Depois de investir, preserve liquidez para imprevistos.",
    objective:
      "Manter caixa de pelo menos 10% do patrimonio total ou 10.000 moedas Fortuna.",
    educationalExplanation:
      "Ter liquidez significa conseguir acessar recursos quando necessario. Nem todo investimento pode ser vendido rapidamente sem risco ou perda.",
    cityRelation:
      "Libera uma dica avancada sobre liquidez e melhora o distrito residencial.",
    type: "UNDERSTAND_LIQUIDITY",
    status: "AVAILABLE",
    completionRule: {
      ruleType: "BEHAVIOR_BASED",
      requiredEvent: "ASSET_PURCHASED",
      targetValue: SAFETY_CASH_MINIMUM_BASIS_POINTS,
    },
    reward: {
      type: "UNLOCK_ADVANCED_TIP",
      targetId: "advanced-liquidity-tip",
      label: "Dica avancada sobre liquidez",
    },
    progress: {
      current: 0,
      target: SAFETY_CASH_MINIMUM_BASIS_POINTS,
      unit: "BASIS_POINTS",
    },
    relatedEvents: ["ASSET_PURCHASED", "PORTFOLIO_UPDATED"],
  },
  {
    id: "view-transaction-history",
    title: "Consultar historico de transacoes",
    description: "Acompanhe as movimentacoes ja realizadas.",
    objective: "Abrir o historico de transacoes.",
    educationalExplanation:
      "Acompanhar o historico ajuda a entender decisoes passadas, custos, rendimentos e evolucao da carteira.",
    cityRelation:
      "Libera o relatorio basico da carteira e o selo Investidor Organizado.",
    type: "TRANSACTION_HISTORY",
    status: "AVAILABLE",
    completionRule: {
      ruleType: "EVENT_BASED",
      requiredEvent: "TRANSACTION_HISTORY_VIEWED",
      requiredCount: 1,
    },
    reward: {
      type: "UNLOCK_REPORT",
      targetId: "BASIC_PORTFOLIO_REPORT",
      label: "Relatorio basico da carteira",
    },
    progress: { current: 0, target: 1, unit: "COUNT" },
    relatedEvents: ["TRANSACTION_HISTORY_VIEWED"],
  },
  {
    id: "read-mentor-tip",
    title: "Ler uma dica do Mentor",
    description: "Use o Mentor Fortuna como apoio educativo.",
    objective: "Ler pelo menos uma dica do Mentor Fortuna.",
    educationalExplanation:
      "O Mentor Fortuna oferece explicacoes para apoiar decisoes conscientes. Aprender antes de agir e parte importante da educacao financeira.",
    cityRelation:
      "Desbloqueia uma nova dica e aumenta o progresso educativo do jogador.",
    type: "EDUCATIONAL_INTERACTION",
    status: "AVAILABLE",
    completionRule: {
      ruleType: "EDUCATIONAL_INTERACTION_BASED",
      requiredEvent: "MENTOR_TIP_READ",
      requiredCount: 1,
    },
    reward: {
      type: "UNLOCK_ADVANCED_TIP",
      targetId: "mentor-next-tip",
      label: "Nova dica do Mentor",
    },
    progress: { current: 0, target: 1, unit: "COUNT" },
    relatedEvents: ["MENTOR_TIP_READ"],
  },
  {
    id: "reduce-concentration",
    title: "Reduzir concentracao da carteira",
    description: "Evite depender demais de um unico ativo ou classe.",
    objective: "Manter a maior classe abaixo de 60% da carteira.",
    educationalExplanation:
      "Concentracao alta aumenta a dependencia de um unico resultado. Reduzir exposicao ajuda a pensar em risco de forma mais consciente.",
    cityRelation: "Libera uma ferramenta visual de alerta de concentracao.",
    type: "REDUCE_CONCENTRATION",
    status: "AVAILABLE",
    completionRule: {
      ruleType: "PORTFOLIO_STATE_BASED",
      targetValue: CONCENTRATION_MAXIMUM_BASIS_POINTS,
    },
    reward: {
      type: "UNLOCK_ADVANCED_TIP",
      targetId: "concentration-risk-tip",
      label: "Dica sobre concentracao",
    },
    progress: {
      current: 10_000,
      target: CONCENTRATION_MAXIMUM_BASIS_POINTS,
      unit: "BASIS_POINTS",
    },
    relatedEvents: ["PORTFOLIO_UPDATED", "EXCESSIVE_CONCENTRATION_DETECTED"],
  },
];
