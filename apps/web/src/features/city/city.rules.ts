import type {
  CityBuildingStatus,
  CityBuildingViewModel,
  DeriveCityInput,
} from "./city.types.js";

const MAX_LEVEL = 5;

type BuildingTemplate = Omit<
  CityBuildingViewModel,
  "level" | "progressPercent" | "reason" | "status" | "nextLevelHint"
>;

const buildingTemplates: Record<CityBuildingViewModel["id"], BuildingTemplate> = {
  financial_hall: {
    id: "financial_hall",
    name: "Prefeitura Financeira",
    description: "Representa sua evolucao geral como investidor em aprendizado.",
    educationalMessage:
      "Sua cidade cresce conforme voce aprende, diversifica e mantem boas praticas financeiras.",
    icon: "PF",
    maxLevel: MAX_LEVEL,
  },
  reserve_bank: {
    id: "reserve_bank",
    name: "Banco da Reserva",
    description: "Mostra sua preparacao para imprevistos e sua organizacao de liquidez.",
    educationalMessage:
      "Liquidez e reserva simulada ajudam a pensar em estabilidade antes de ampliar riscos.",
    icon: "BR",
    maxLevel: MAX_LEVEL,
  },
  city_exchange: {
    id: "city_exchange",
    name: "Bolsa da Cidade",
    description:
      "Mostra seu contato com ativos de maior oscilacao e aprendizado sobre risco.",
    educationalMessage:
      "Renda variavel exige decisao consciente, diversificacao e respeito ao seu perfil de risco.",
    icon: "BC",
    maxLevel: MAX_LEVEL,
  },
  real_estate_center: {
    id: "real_estate_center",
    name: "Centro Imobiliario",
    description:
      "Representa sua exposicao ao setor imobiliario simulado e ao conceito de renda recorrente.",
    educationalMessage:
      "FIIs simulados ajudam a estudar renda recorrente, vacancia, liquidez e diversificacao.",
    icon: "CI",
    maxLevel: MAX_LEVEL,
  },
  financial_school: {
    id: "financial_school",
    name: "Escola Financeira",
    description: "A escola evolui conforme voce conclui missoes e aprende conceitos financeiros.",
    educationalMessage:
      "Conhecimento, leitura e missoes educativas sustentam escolhas mais conscientes.",
    icon: "EF",
    maxLevel: MAX_LEVEL,
  },
  income_park: {
    id: "income_park",
    name: "Parque dos Rendimentos",
    description:
      "Mostra seu aprendizado sobre renda passiva simulada e acompanhamento de rendimentos.",
    educationalMessage:
      "Rendimentos simulados ensinam acompanhamento de fluxo, sem prometer resultado financeiro.",
    icon: "PR",
    maxLevel: MAX_LEVEL,
  },
  mentor_tower: {
    id: "mentor_tower",
    name: "Torre do Mentor",
    description:
      "A torre acompanha suas decisoes e oferece orientacao educativa durante a jornada.",
    educationalMessage:
      "Alertas e dicas do Mentor ajudam a refletir sobre risco, liquidez e diversificacao.",
    icon: "TM",
    maxLevel: MAX_LEVEL,
  },
};

export function calculateLevelByProgress(progressPercent: number): number {
  const progress = clampPercent(progressPercent);

  if (progress <= 0) {
    return 0;
  }

  if (progress < 20) {
    return 1;
  }

  if (progress < 40) {
    return 2;
  }

  if (progress < 60) {
    return 3;
  }

  if (progress < 80) {
    return 4;
  }

  return 5;
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

  return [
    createBuilding("financial_hall", {
      progressPercent: clampPercent(
        (safeInput.totalEquityCents > 0 ? 25 : 0) +
          Math.min(25, missionProgress / 4) +
          assetClassCount * 12 +
          (safeInput.positionsCount >= 3 ? 14 : 0) -
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
    }),
    createBuilding("reserve_bank", {
      progressPercent: clampPercent(
        Math.min(55, allocation.fixedIncomePercent) +
          (safeInput.availableBalanceCents > 0 ? 20 : 0) +
          (hasFixedIncome ? 20 : 0) +
          (safeInput.completedMissionsCount > 0 ? 5 : 0),
      ),
      reason: hasFixedIncome
        ? "A carteira possui exposicao a renda fixa ou ativos de menor oscilacao, alem de liquidez disponivel."
        : safeInput.availableBalanceCents > 0
          ? "Existe saldo disponivel, mas a reserva ainda pode ser representada por ativos de menor risco."
          : "Ainda nao ha sinais de reserva ou liquidez na cidade.",
      nextLevelHint:
        "Estude reserva de emergencia, liquidez e o papel de ativos de menor risco na carteira.",
    }),
    createBuilding("city_exchange", {
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
    }),
    createBuilding("real_estate_center", {
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
    }),
    createBuilding("financial_school", {
      progressPercent: missionProgress,
      reason:
        safeInput.completedMissionsCount > 0
          ? `Voce concluiu ${safeInput.completedMissionsCount} de ${safeInput.totalMissionsCount || safeInput.completedMissionsCount} missoes educativas.`
          : "A escola ainda esta no comeco porque nenhuma missao educativa foi concluida.",
      nextLevelHint:
        "Conclua missoes e leia explicacoes educativas para fortalecer a base de conhecimento.",
    }),
    createBuilding("income_park", {
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
    }),
    createBuilding("mentor_tower", {
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
    }),
  ];
}

function createBuilding(
  id: CityBuildingViewModel["id"],
  details: Pick<
    CityBuildingViewModel,
    "progressPercent" | "reason" | "nextLevelHint"
  >,
): CityBuildingViewModel {
  const progressPercent = clampPercent(details.progressPercent);
  const level = calculateLevelByProgress(progressPercent);

  return {
    ...buildingTemplates[id],
    level,
    progressPercent,
    status: resolveStatus(level),
    reason: details.reason,
    nextLevelHint: details.nextLevelHint,
  };
}

function resolveStatus(level: number): CityBuildingStatus {
  if (level <= 0) {
    return "locked";
  }

  if (level <= 2) {
    return "started";
  }

  if (level <= 4) {
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
