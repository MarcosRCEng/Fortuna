import type {
  CityBuildingStatus,
  CityBuildingViewModel,
  DeriveCityInput,
} from "./city.types.js";
import { cityBuildingsCatalog } from "./data/cityBuildingsCatalog.js";
import { getCityBuildingCatalogItem } from "./data/cityLayout.selectors.js";

const MAX_LEVEL = 3;
const LOW_RESERVE_CENTS = 20_000;

export function calculateLevelByProgress(progressPercent: number): number {
  const progress = clampPercent(progressPercent);

  if (progress <= 0) {
    return 0;
  }

  if (progress < 34) {
    return 1;
  }

  if (progress < 67) {
    return 2;
  }

  return 3;
}

export function deriveCityBuildings(input: DeriveCityInput): CityBuildingViewModel[] {
  const safeInput = normalizeInput(input);
  const allocation = createAllocationLookup(safeInput);
  const hasFixedIncome = allocation.fixedIncomePercent > 0;
  const hasStocks = allocation.stocksPercent > 0;
  const hasRealEstate = allocation.realEstatePercent > 0;
  const assetClassCount = [
    safeInput.availableBalanceCents > 0,
    hasFixedIncome,
    hasStocks,
    hasRealEstate,
  ].filter(Boolean).length;
  const missionProgress = percentageFromCounts(
    safeInput.completedMissionsCount,
    safeInput.totalMissionsCount,
  );

  const buildingDetails: Record<
    CityBuildingViewModel["id"],
    Pick<
      CityBuildingViewModel,
      | "description"
      | "educationalMessage"
      | "icon"
      | "progressPercent"
      | "reason"
      | "nextLevelHint"
      | "nextAction"
      | "hasAction"
      | "actionLabel"
      | "alertLabel"
    >
  > = {
    financial_hall: {
      description: "Representa sua evolucao geral como investidor em aprendizado.",
      educationalMessage:
        "Sua cidade cresce conforme voce aprende, diversifica e mantem boas praticas financeiras.",
      icon: "PF",
      progressPercent: clampPercent(
        (safeInput.totalEquityCents > 0 ? 25 : 0) +
          Math.min(20, missionProgress / 3) +
          assetClassCount * 14 +
          (safeInput.positionsCount >= 3 ? 18 : 0) +
          (safeInput.completedMissionsCount >= 3 ? 12 : 0) -
          (safeInput.hasConcentrationWarning ? 18 : 0),
      ),
      reason:
        safeInput.totalEquityCents <= 0
          ? "A cidade ainda aguarda os primeiros dados de patrimonio, missoes e carteira."
          : safeInput.hasConcentrationWarning
            ? "Ha progresso financeiro e educativo, mas a concentracao elevada reduz o equilibrio da cidade."
            : "Patrimonio simulado, missoes e diversificacao contribuem para a maturidade geral.",
      nextLevelHint:
        "Continue aprendendo, registrando missoes e evitando concentrar demais em um unico ativo.",
      nextAction: "Revisar o painel inicial para observar patrimonio, missoes e equilibrio.",
      hasAction: safeInput.hasConcentrationWarning,
      actionLabel: safeInput.hasConcentrationWarning ? "Revisar concentracao" : undefined,
      alertLabel: safeInput.hasConcentrationWarning ? "Diversificar" : undefined,
    },
    reserve_bank: {
      description: "Mostra sua preparacao para imprevistos e sua organizacao de liquidez.",
      educationalMessage:
        "Liquidez e reserva simulada ajudam a pensar em estabilidade antes de ampliar riscos.",
      icon: "BR",
      progressPercent: clampPercent(
        Math.min(45, allocation.fixedIncomePercent) +
          (safeInput.availableBalanceCents > 0 ? 25 : 0) +
          (safeInput.availableBalanceCents >= LOW_RESERVE_CENTS ? 20 : 0) +
          (safeInput.completedMissionsCount > 0 ? 5 : 0),
      ),
      reason: hasFixedIncome
        ? "A carteira possui exposicao a renda fixa ou ativos de menor oscilacao, alem de liquidez disponivel."
        : safeInput.availableBalanceCents > 0
          ? "Existe saldo disponivel, mas a reserva ainda pode ser representada por ativos de menor risco."
          : "Ainda nao ha sinais de reserva ou liquidez na cidade.",
      nextLevelHint:
        "Estude reserva de emergencia, liquidez e o papel de ativos de menor risco na carteira.",
      nextAction: "Abrir carteira e avaliar saldo disponivel, liquidez e ativos conservadores.",
      hasAction: safeInput.availableBalanceCents > 0 && safeInput.availableBalanceCents < LOW_RESERVE_CENTS,
      actionLabel: "Reserva baixa",
      alertLabel:
        safeInput.availableBalanceCents > 0 && safeInput.availableBalanceCents < LOW_RESERVE_CENTS
          ? "Reserva baixa"
          : undefined,
    },
    city_exchange: {
      description:
        "Mostra seu contato com ativos de maior oscilacao e aprendizado sobre risco.",
      educationalMessage:
        "Renda variavel exige decisao consciente, diversificacao e respeito ao seu perfil de risco.",
      icon: "BC",
      progressPercent: clampPercent(
        (hasStocks ? 35 : 0) +
          Math.min(30, allocation.stocksPercent) +
          (safeInput.positionsCount >= 2 ? 20 : 0) -
          (safeInput.largestPositionPercentage >= 70 ? 15 : 0),
      ),
      reason: hasStocks
        ? "Voce ja teve contato com acoes simuladas e pode observar os efeitos de oscilacao e concentracao."
          : "A bolsa ainda nao aparece porque nao ha acoes na carteira simulada.",
      nextLevelHint:
        "Antes de ampliar renda variavel, revise risco, diversificacao e explicacoes educativas dos ativos.",
      nextAction: "Ir ao mercado para estudar ativos de renda variavel e concentracao.",
      hasAction: safeInput.hasConcentrationWarning,
      actionLabel: "Alerta de risco",
      alertLabel: safeInput.hasConcentrationWarning ? "Risco elevado" : undefined,
    },
    real_estate_center: {
      description:
        "Representa sua exposicao ao setor imobiliario simulado e ao conceito de renda recorrente.",
      educationalMessage:
        "FIIs simulados ajudam a estudar renda recorrente, vacancia, liquidez e diversificacao.",
      icon: "CI",
      progressPercent: clampPercent(
        (hasRealEstate ? 40 : 0) +
          Math.min(30, allocation.realEstatePercent) +
          (safeInput.collectedIncomeCents > 0 ? 20 : 0) +
          (assetClassCount >= 3 ? 10 : 0),
      ),
      reason: hasRealEstate
        ? "A carteira possui FIIs simulados e permite estudar exposicao imobiliaria e renda recorrente."
          : "O centro imobiliario ainda aguarda FIIs ou ativos imobiliarios simulados na carteira.",
      nextLevelHint:
        "Explore FIIs com foco educativo em liquidez, diversificacao e renda recorrente simulada.",
      nextAction: "Estudar FIIs e comparar renda recorrente, liquidez e diversificacao.",
      hasAction: false,
      actionLabel: undefined,
      alertLabel: undefined,
    },
    financial_school: {
      description: "A escola evolui conforme voce conclui missoes e aprende conceitos financeiros.",
      educationalMessage:
        "Conhecimento, leitura e missoes educativas sustentam escolhas mais conscientes.",
      icon: "EF",
      progressPercent: missionProgress,
      reason:
        safeInput.completedMissionsCount > 0
          ? `Voce concluiu ${safeInput.completedMissionsCount} de ${safeInput.totalMissionsCount || safeInput.completedMissionsCount} missoes educativas.`
          : "A escola ainda esta no comeco porque nenhuma missao educativa foi concluida.",
      nextLevelHint:
        "Conclua missoes e leia explicacoes educativas para fortalecer a base de conhecimento.",
      nextAction: "Abrir missoes educativas pendentes e concluir o proximo objetivo.",
      hasAction: safeInput.totalMissionsCount === 0 || safeInput.completedMissionsCount < safeInput.totalMissionsCount,
      actionLabel: "Missao disponivel",
      alertLabel:
        safeInput.totalMissionsCount === 0 || safeInput.completedMissionsCount < safeInput.totalMissionsCount
          ? "Acao disponivel"
          : undefined,
    },
    income_park: {
      description:
        "Mostra seu aprendizado sobre renda passiva simulada e acompanhamento de rendimentos.",
      educationalMessage:
        "Rendimentos simulados ensinam acompanhamento de fluxo, sem prometer resultado financeiro.",
      icon: "PR",
      progressPercent: clampPercent(
        (safeInput.collectibleIncomeCents > 0 ? 35 : 0) +
          (safeInput.collectedIncomeCents > 0 ? 45 : 0) +
          (safeInput.collectedIncomeCents >= 10_000 ? 20 : 0),
      ),
      reason:
        safeInput.collectedIncomeCents > 0
          ? "Rendimentos simulados ja foram coletados, reforcando o acompanhamento do fluxo de caixa."
          : safeInput.collectibleIncomeCents > 0
            ? "Ha rendimento simulavel disponivel para acompanhar e coletar."
            : "Ainda nao ha rendimentos coletados ou disponiveis para acompanhamento.",
      nextLevelHint:
        "Acompanhe rendimentos simulados como aprendizado sobre fluxo, prazos e recorrencia.",
      nextAction: "Revisar rendimentos disponiveis e aprender sobre recorrencia simulada.",
      hasAction: safeInput.collectibleIncomeCents > 0,
      actionLabel: "Rendimento disponivel",
      alertLabel: safeInput.collectibleIncomeCents > 0 ? "Acao disponivel" : undefined,
    },
    mentor_tower: {
      description:
        "A torre acompanha suas decisoes e oferece orientacao educativa durante a jornada.",
      educationalMessage:
        "Alertas e dicas do Mentor ajudam a refletir sobre risco, liquidez e diversificacao.",
      icon: "TM",
      progressPercent: clampPercent(
        safeInput.mentorMessagesCount * 25 +
          (safeInput.hasConcentrationWarning ? 25 : 0) +
          (safeInput.completedMissionsCount > 0 ? 15 : 0),
      ),
      reason:
        safeInput.mentorMessagesCount > 0
          ? "O Mentor ja trouxe mensagens educativas a partir de eventos da jornada."
          : "A torre ainda aguarda mensagens ou alertas educativos do Mentor Fortuna.",
      nextLevelHint:
        "Interaja com mercado, carteira e missoes para receber reflexoes educativas do Mentor.",
      nextAction: "Ler a mensagem mais recente do Mentor e registrar a reflexao educativa.",
      hasAction: safeInput.mentorMessagesCount > 0,
      actionLabel: "Mensagem nova",
      alertLabel: safeInput.mentorMessagesCount > 0 ? "Acao disponivel" : undefined,
    },
  };

  return cityBuildingsCatalog
    .map((catalogItem) => createBuilding(catalogItem.id, buildingDetails[catalogItem.id]))
    .sort((left, right) => left.visualPriority - right.visualPriority);
}

function createBuilding(
  id: CityBuildingViewModel["id"],
  details: Pick<
    CityBuildingViewModel,
    | "description"
    | "educationalMessage"
    | "icon"
    | "progressPercent"
    | "reason"
    | "nextLevelHint"
    | "nextAction"
    | "hasAction"
    | "actionLabel"
    | "alertLabel"
  >,
): CityBuildingViewModel {
  const progressPercent = clampPercent(details.progressPercent);
  const level = calculateLevelByProgress(progressPercent);
  const catalogItem = getCityBuildingCatalogItem(id);

  return {
    id,
    name: catalogItem.title,
    shortLabel: catalogItem.shortLabel,
    district: catalogItem.district,
    purpose: catalogItem.purpose,
    route: catalogItem.route,
    assetPrefix: catalogItem.assetPrefix,
    position: catalogItem.position,
    visualPriority: catalogItem.visualPriority,
    maxLevel: MAX_LEVEL,
    description: details.description,
    educationalMessage: details.educationalMessage,
    icon: details.icon,
    level,
    progressPercent,
    status: resolveStatus(level),
    reason: details.reason,
    nextLevelHint: details.nextLevelHint,
    nextAction: details.nextAction,
    hasAction: details.hasAction,
    actionLabel: details.actionLabel,
    alertLabel: details.alertLabel,
  };
}

function resolveStatus(level: number): CityBuildingStatus {
  if (level <= 0) {
    return "locked";
  }

  if (level === 1) {
    return "started";
  }

  if (level === 2) {
    return "growing";
  }

  return "strong";
}

function normalizeInput(input: DeriveCityInput): DeriveCityInput {
  return {
    ...input,
    totalEquityCents: safeCents(input.totalEquityCents),
    availableBalanceCents: safeCents(input.availableBalanceCents),
    positionsCount: safeWhole(input.positionsCount),
    completedMissionsCount: safeWhole(input.completedMissionsCount),
    totalMissionsCount: safeWhole(input.totalMissionsCount),
    collectedIncomeCents: safeCents(input.collectedIncomeCents),
    collectibleIncomeCents: safeCents(input.collectibleIncomeCents),
    mentorMessagesCount: safeWhole(input.mentorMessagesCount),
    largestPositionPercentage: clampPercent(input.largestPositionPercentage),
    allocationByClass: input.allocationByClass.map((item) => ({
      assetClass: item.assetClass,
      percentage: clampPercent(item.percentage),
      valueCents: safeCents(item.valueCents),
    })),
  };
}

function createAllocationLookup(input: DeriveCityInput) {
  return input.allocationByClass.reduce(
    (totals, item) => {
      const normalizedClass = item.assetClass.toUpperCase();
      if (normalizedClass === "FIXED_INCOME" || normalizedClass === "RENDA_FIXA") {
        totals.fixedIncomePercent += item.percentage;
      }
      if (normalizedClass === "FII" || normalizedClass === "REAL_ESTATE") {
        totals.realEstatePercent += item.percentage;
      }
      if (normalizedClass === "STOCK" || normalizedClass === "ACAO") {
        totals.stocksPercent += item.percentage;
      }
      return totals;
    },
    {
      fixedIncomePercent: 0,
      realEstatePercent: 0,
      stocksPercent: 0,
    },
  );
}

function percentageFromCounts(current: number, total: number): number {
  if (total <= 0) {
    return current > 0 ? 100 : 0;
  }

  return clampPercent(Math.round((current * 100) / total));
}

function safeCents(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function safeWhole(value: number): number {
  return Number.isInteger(value) && value > 0 ? value : 0;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}
