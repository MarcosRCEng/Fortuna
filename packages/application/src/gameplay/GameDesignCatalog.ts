import type { GameEventType } from "@fortuna/domain";
import type { PlayerProgress } from "./PlayerProgress.js";

export interface FinancialMaturityLevelDefinition {
  level: number;
  name: string;
  criteria: string[];
  isReached(progress: PlayerProgress): boolean;
}

export interface UnlockDefinition {
  id: string;
  type: "ASSET_CLASS" | "DISTRICT" | "TOOL" | "REPORT";
  name: string;
  description: string;
  criteria: string;
  initialState: "LOCKED" | "UNLOCKED";
}

export interface EducationalRewardDefinition {
  id: string;
  name: string;
  type:
    | "CITY_VISUAL"
    | "BUILDING"
    | "BADGE"
    | "ACHIEVEMENT"
    | "MISSION"
    | "REPORT"
    | "TOOL";
  description: string;
  forbiddenRandomness: false;
}

export const UNIQUE_GAME_EVENT_TYPES: readonly GameEventType[] = [
  "FIRST_BUY",
  "FIRST_SELL",
  "FIRST_INCOME_RECEIVED",
  "FIRST_DIVERSIFICATION",
  "EMERGENCY_RESERVE_STARTED",
  "EMERGENCY_RESERVE_COMPLETED",
  "NEW_DISTRICT_UNLOCKED",
  "NEW_ASSET_CLASS_UNLOCKED",
  "NEW_TOOL_UNLOCKED",
  "PLAYER_LEVEL_UP",
  "EDUCATIONAL_BADGE_GRANTED",
] as const;

export const FINANCIAL_MATURITY_LEVELS: readonly FinancialMaturityLevelDefinition[] =
  [
    {
      level: 1,
      name: "Iniciante Financeiro",
      criteria: ["Jogador criado"],
      isReached: () => true,
    },
    {
      level: 2,
      name: "Guardiao da Reserva",
      criteria: [
        "Primeira compra realizada",
        "Primeira missao educativa concluida",
      ],
      isReached: (progress) =>
        progress.seenEventTypes.includes("FIRST_BUY") &&
        progress.completedMissionIds.length >= 1,
    },
    {
      level: 3,
      name: "Investidor em Formacao",
      criteria: [
        "Reserva iniciada",
        "Pelo menos dois ciclos acompanhados",
        "Primeiro marco de patrimonio acompanhado",
      ],
      isReached: (progress) =>
        progress.seenEventTypes.includes("EMERGENCY_RESERVE_STARTED") &&
        progress.marketCyclesAdvanced >= 2 &&
        progress.netWorthMilestonesReachedCents.length >= 1,
    },
    {
      level: 4,
      name: "Investidor Diversificado",
      criteria: ["Primeira diversificacao", "Primeiro rendimento recebido"],
      isReached: (progress) =>
        progress.seenEventTypes.includes("FIRST_DIVERSIFICATION") &&
        progress.seenEventTypes.includes("FIRST_INCOME_RECEIVED"),
    },
    {
      level: 5,
      name: "Estrategista de Longo Prazo",
      criteria: [
        "Reserva formada",
        "Relatorio de diversificacao desbloqueado",
        "Tres missoes educativas concluidas",
      ],
      isReached: (progress) =>
        progress.seenEventTypes.includes("EMERGENCY_RESERVE_COMPLETED") &&
        progress.unlockedTools.includes("ALLOCATION_REPORT") &&
        progress.completedMissionIds.length >= 3,
    },
    {
      level: 6,
      name: "Cidadao Fortuna Avancado",
      criteria: [
        "Cinco ciclos acompanhados",
        "Historico de eventos educativos desbloqueado",
        "Carteira diversificada mantida",
      ],
      isReached: (progress) =>
        progress.marketCyclesAdvanced >= 5 &&
        progress.unlockedReports.includes("EDUCATIONAL_EVENTS_HISTORY") &&
        progress.seenEventTypes.includes("FIRST_DIVERSIFICATION"),
    },
  ];

export const UNLOCK_DEFINITIONS: readonly UnlockDefinition[] = [
  {
    id: "CENTRO_FINANCEIRO",
    type: "DISTRICT",
    name: "Distrito Inicial",
    description: "Base da Cidade Fortuna e ponto de partida do jogador.",
    criteria: "Disponivel ao criar o jogador.",
    initialState: "UNLOCKED",
  },
  {
    id: "DISTRITO_RESERVA",
    type: "DISTRICT",
    name: "Distrito da Reserva",
    description: "Representa seguranca e planejamento antes de assumir riscos.",
    criteria: "Iniciar a reserva de emergencia.",
    initialState: "LOCKED",
  },
  {
    id: "DISTRITO_INVESTIMENTOS",
    type: "DISTRICT",
    name: "Distrito da Renda Fixa",
    description: "Apresenta investimentos simples e previsiveis.",
    criteria: "Realizar a primeira compra consciente.",
    initialState: "LOCKED",
  },
  {
    id: "DISTRITO_FIIS",
    type: "DISTRICT",
    name: "Distrito dos Fundos Imobiliarios",
    description: "Introduz renda recorrente simulada e diversificacao.",
    criteria: "Atingir maturidade inicial e desbloquear FIIs.",
    initialState: "LOCKED",
  },
  {
    id: "ALLOCATION_REPORT",
    type: "TOOL",
    name: "Relatorio de diversificacao",
    description: "Mostra composicao da carteira sem ranking competitivo.",
    criteria: "Ter pelo menos duas posicoes acompanhadas.",
    initialState: "LOCKED",
  },
  {
    id: "CONCENTRATION_ALERT",
    type: "TOOL",
    name: "Alerta de concentracao",
    description: "Ajuda o jogador a perceber exposicao excessiva.",
    criteria: "Detectar concentracao alta na carteira.",
    initialState: "LOCKED",
  },
  {
    id: "EDUCATIONAL_EVENTS_HISTORY",
    type: "REPORT",
    name: "Historico de eventos educativos",
    description: "Lista marcos de aprendizado e progresso.",
    criteria: "Concluir missoes educativas e acompanhar ciclos.",
    initialState: "LOCKED",
  },
  {
    id: "FII",
    type: "ASSET_CLASS",
    name: "Fundos imobiliarios simulados",
    description: "Classe liberada depois de marcos educativos iniciais.",
    criteria: "Atingir patrimonio acompanhado e progresso educativo.",
    initialState: "LOCKED",
  },
];

export const EDUCATIONAL_REWARDS: readonly EducationalRewardDefinition[] = [
  {
    id: "PRIMEIRA_COMPRA_CONSCIENTE",
    name: "Primeira Compra Consciente",
    type: "BADGE",
    description: "Reconhece a primeira compra como marco educativo.",
    forbiddenRandomness: false,
  },
  {
    id: "PRIMEIRA_RESERVA",
    name: "Primeira Reserva",
    type: "BADGE",
    description: "Valoriza o inicio da reserva de emergencia.",
    forbiddenRandomness: false,
  },
  {
    id: "CARTEIRA_DIVERSIFICADA",
    name: "Carteira Diversificada",
    type: "BADGE",
    description: "Reconhece diversificacao sem prometer retorno.",
    forbiddenRandomness: false,
  },
  {
    id: "COLHEDOR_RENDIMENTOS",
    name: "Colhedor de Rendimentos",
    type: "BADGE",
    description: "Ensina o papel de renda no longo prazo.",
    forbiddenRandomness: false,
  },
  {
    id: "PENSAMENTO_LONGO_PRAZO",
    name: "Pensamento de Longo Prazo",
    type: "ACHIEVEMENT",
    description: "Premia acompanhamento consistente de ciclos.",
    forbiddenRandomness: false,
  },
];

export const FORBIDDEN_GAME_DESIGN_MECHANICS = [
  "random_reward",
  "loot_box",
  "roulette",
  "profit_multiplier",
  "net_worth_ranking",
  "luck_based_progression",
] as const;
