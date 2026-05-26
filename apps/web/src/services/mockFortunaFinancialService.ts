import {
  calculateBalanceAfterBuy,
  calculateBalanceAfterSell,
  calculateTradeTotalCents,
  type Cents,
} from "../financial/money.js";
import {
  validateBuyOperation,
  validateSellOperation,
} from "../financial/operationValidation.js";
import type {
  Asset,
  CitySummary,
  FortunaFinancialPort,
  IncomeEvent,
  MentorTip,
  Mission,
  PlayerOverview,
  Position,
  TradeRequest,
  TradeResult,
  Transaction,
  WalletSummary,
} from "./types.js";

const today = "2026-05-23T12:00:00.000Z";

const assets: Asset[] = [
  {
    id: "asset-tsf001",
    symbol: "TSF001",
    name: "Tesouro Selic Fortuna",
    assetClass: "FIXED_INCOME",
    currentPriceCents: 10_012,
    previousPriceCents: 10_006,
    variationBps: 6,
    riskLevel: "LOW",
    liquidity: "DAILY",
    priceStatus: "SIMULATED",
    dataSource: "MOCK",
    isMocked: true,
    isActive: true,
    educationalDescription:
      "Renda fixa ficticia para aprender previsibilidade, liquidez e acumulacao gradual.",
    yieldRules:
      "Rendimento diario simulado em basis points; credito final pertence ao dominio financeiro.",
    updatedAt: today,
    detail: {
      longDescription:
        "Ativo de baixo risco usado para objetivos proximos e reserva de seguranca dentro do jogo.",
      riskExplanation:
        "Baixo risco significa menor oscilacao simulada, nao ausencia de risco em investimentos reais.",
      liquidityExplanation:
        "Liquidez diaria simulada: o resgate e simples no MVP, mas a decisao ainda deve considerar objetivos.",
      beginnerTip:
        "Comece comparando liquidez, risco e prazo antes de olhar somente rendimento.",
      mentorHint:
        "Consistencia tambem constroi a Cidade Fortuna; nem toda evolucao precisa ser rapida.",
    },
  },
  {
    id: "asset-cdblf001",
    symbol: "CDBLF001",
    name: "CDB Liquidez Fortuna",
    assetClass: "FIXED_INCOME",
    currentPriceCents: 5_018,
    previousPriceCents: 5_014,
    variationBps: 7,
    riskLevel: "MEDIUM",
    liquidity: "DAILY",
    priceStatus: "SIMULATED",
    dataSource: "MOCK",
    isMocked: true,
    isActive: true,
    educationalDescription:
      "Renda fixa bancaria simulada para comparar risco, liquidez e retorno esperado.",
    yieldRules:
      "Rendimento diario simulado ligeiramente superior; regras finais ficam no backend.",
    updatedAt: today,
    detail: {
      longDescription:
        "Ativo ficticio para ensinar que retorno esperado maior pode vir com risco educativo maior.",
      riskExplanation:
        "Risco medio indica mais incerteza que o caixa ou a renda fixa mais conservadora.",
      liquidityExplanation:
        "Liquidez diaria, mas nao imediata como o saldo disponivel.",
      beginnerTip:
        "Compare ativos parecidos para entender por que rendimento, risco e liquidez caminham juntos.",
      mentorHint:
        "Rendimento maior pode cobrar preco em risco, prazo ou previsibilidade.",
    },
  },
  {
    id: "asset-fiisf001",
    symbol: "FIISF001",
    name: "FII Shopping Fortuna",
    assetClass: "FII",
    currentPriceCents: 10_180,
    previousPriceCents: 10_090,
    variationBps: 89,
    riskLevel: "MEDIUM",
    liquidity: "MEDIUM",
    priceStatus: "SIMULATED",
    dataSource: "MOCK",
    isMocked: true,
    isActive: true,
    educationalDescription:
      "Fundo imobiliario ficticio para aprender renda recorrente, vacancia e oscilacao de cotas.",
    yieldRules:
      "Distribuicao mensal simulada por cota; valores nao representam promessa de rendimento.",
    updatedAt: today,
    detail: {
      longDescription:
        "Ensina renda passiva simulada e variacao de preco em fundos imobiliarios.",
      riskExplanation:
        "Risco medio: o preco pode variar e o rendimento nao deve ser tratado como garantido.",
      liquidityExplanation:
        "Liquidez media representa venda possivel, mas menos imediata que caixa.",
      beginnerTip:
        "Observe renda e risco juntos; concentrar tudo em um FII aumenta dependencia de um ciclo.",
      mentorHint:
        "Aluguel ajuda a cidade, mas vacancia tambem faz parte da aula.",
    },
  },
  {
    id: "asset-aef001",
    symbol: "AEF001",
    name: "Acao Energia Fortuna",
    assetClass: "STOCK",
    currentPriceCents: 2_540,
    previousPriceCents: 2_505,
    variationBps: 139,
    riskLevel: "MEDIUM_HIGH",
    liquidity: "HIGH",
    priceStatus: "SIMULATED",
    dataSource: "MOCK",
    isMocked: true,
    isActive: true,
    educationalDescription:
      "Acao ficticia para ensinar oscilacao de preco, risco setorial e liquidez.",
    yieldRules: "Dividendos eventuais podem ser modelados em epicos futuros.",
    updatedAt: today,
    detail: {
      longDescription:
        "Ativo de renda variavel que mostra como preco pode subir ou cair em ciclos simulados.",
      riskExplanation:
        "Risco medio/alto significa variacao maior. Isso pede tamanho de posicao consciente.",
      liquidityExplanation:
        "Liquidez alta simulada para compra e venda simples no MVP.",
      beginnerTip:
        "Acoes pedem plano; evite decidir apenas pela variacao do dia.",
      mentorHint:
        "Energia move a cidade, mas a carteira precisa de equilibrio.",
    },
  },
  {
    id: "asset-atf001",
    symbol: "ATF001",
    name: "Acao Tecnologia Fortuna",
    assetClass: "STOCK",
    currentPriceCents: 3_180,
    previousPriceCents: 3_250,
    variationBps: -215,
    riskLevel: "HIGH",
    liquidity: "HIGH",
    priceStatus: "SIMULATED",
    dataSource: "MOCK",
    isMocked: true,
    isActive: true,
    educationalDescription:
      "Acao ficticia de maior volatilidade para aprender sobre crescimento e risco elevado.",
    yieldRules: "Sem rendimento automatico no MVP.",
    updatedAt: today,
    detail: {
      longDescription:
        "Mostra que ativos com maior oscilacao exigem cuidado com concentracao e horizonte.",
      riskExplanation:
        "Risco alto nao significa melhor oportunidade; significa maior incerteza.",
      liquidityExplanation:
        "Liquidez alta simulada, mas liquidez nao elimina risco de preco.",
      beginnerTip:
        "Antes de comprar, confira se a carteira suporta essa variacao.",
      mentorHint:
        "Inovacao acelera, mas planejamento segura as curvas.",
    },
  },
];

let wallet: WalletSummary = {
  availableBalanceCents: 35_000,
  investedValueCents: 45_640,
  totalEquityCents: 80_640,
  positionCount: 3,
  positions: [
    {
      symbol: "TSF001",
      name: "Tesouro Selic Fortuna",
      quantity: 2,
      averagePriceCents: 10_000,
      marketValueCents: 20_024,
      assetClass: "FIXED_INCOME",
      accumulatedIncomeCents: 80,
    },
    {
      symbol: "FIISF001",
      name: "FII Shopping Fortuna",
      quantity: 2,
      averagePriceCents: 10_000,
      marketValueCents: 20_360,
      assetClass: "FII",
      accumulatedIncomeCents: 140,
    },
    {
      symbol: "AEF001",
      name: "Acao Energia Fortuna",
      quantity: 2,
      averagePriceCents: 2_500,
      marketValueCents: 5_080,
      assetClass: "STOCK",
      accumulatedIncomeCents: 0,
    },
  ],
};

let incomes: IncomeEvent[] = [
  {
    id: "income-fiisf001-2026-05",
    symbol: "FIISF001",
    assetName: "FII Shopping Fortuna",
    amountCents: 140,
    status: "AVAILABLE",
    source: "Distribuicao mensal simulada",
    explanation:
      "Rendimentos representam renda passiva simulada no jogo; nao sao garantia de retorno real.",
  },
  {
    id: "income-tsf001-2026-05",
    symbol: "TSF001",
    assetName: "Tesouro Selic Fortuna",
    amountCents: 80,
    status: "COLLECTED",
    source: "Juros diarios simulados",
    explanation:
      "Juros compostos sao melhor entendidos com tempo e recorrencia, nao com pressa.",
  },
];

let transactions: Transaction[] = [
  {
    id: "tx-1",
    type: "BUY",
    symbol: "TSF001",
    description: "Compra de renda fixa simulada",
    quantity: 2,
    unitPriceCents: 10_000,
    totalCents: 20_000,
    balanceAfterCents: 60_000,
    occurredAt: "2026-05-21T12:00:00.000Z",
  },
  {
    id: "tx-2",
    type: "BUY",
    symbol: "FIISF001",
    description: "Compra de FII simulado",
    quantity: 2,
    unitPriceCents: 10_000,
    totalCents: 20_000,
    balanceAfterCents: 40_000,
    occurredAt: "2026-05-22T12:00:00.000Z",
  },
  {
    id: "tx-3",
    type: "INCOME",
    symbol: "TSF001",
    description: "Rendimento colhido",
    totalCents: 80,
    balanceAfterCents: 40_080,
    occurredAt: "2026-05-23T09:00:00.000Z",
  },
];

const missions: Mission[] = [
  {
    id: "initial-reserve",
    title: "Criar reserva inicial",
    description: "Mantenha uma parte do saldo disponivel como reserva.",
    objective: "Manter pelo menos 10.000 moedas Fortuna em caixa.",
    educationalExplanation:
      "Reserva ajuda a lidar com imprevistos sem vender ativos em momentos ruins.",
    rewardLabel: "Praca-cofre da Cidade Fortuna",
    status: "COMPLETED",
    progressCurrent: 10_000,
    progressTarget: 10_000,
  },
  {
    id: "diversify-three-classes",
    title: "Diversificar em 3 classes",
    description: "Distribua a carteira entre diferentes classes de ativos.",
    objective: "Ter posicao positiva em pelo menos 3 classes.",
    educationalExplanation:
      "Diversificar reduz dependencia de um unico ativo ou classe.",
    rewardLabel: "Distrito da Diversificacao",
    status: "IN_PROGRESS",
    progressCurrent: 3,
    progressTarget: 3,
  },
  {
    id: "read-mentor-tip",
    title: "Ler uma dica do Mentor",
    description: "Use o Mentor Fortuna como apoio educativo.",
    objective: "Ler pelo menos uma dica contextual.",
    educationalExplanation:
      "Aprender antes de agir e parte importante da educacao financeira.",
    rewardLabel: "Nova dica educativa",
    status: "AVAILABLE",
    progressCurrent: 0,
    progressTarget: 1,
  },
];

const mentorTips: MentorTip[] = [
  {
    id: "mentor-diversification",
    title: "Diversificacao em foco",
    message:
      "Sua carteira ja passa por tres classes. Continue observando se uma delas nao fica grande demais em relacao ao patrimonio.",
    concept: "DIVERSIFICATION",
    severity: "INFO",
  },
  {
    id: "mentor-mock-data",
    title: "Valores simulados",
    message:
      "Os precos deste MVP sao mockados para aprendizado. Eles nao representam cotacoes reais nem recomendacao de investimento.",
    concept: "MOCK_MARKET",
    severity: "WARNING",
  },
];

const city: CitySummary = {
  level: 2,
  title: "Cidade em Formacao",
  unlockedAreas: ["Distrito Inicial", "Praca-cofre", "Banco Comunitario"],
  nextUnlocks: ["Centro Comercial", "Relatorio de diversificacao"],
  relationText:
    "A cidade evolui com habitos financeiros: reserva, diversificacao, historico e missoes educativas.",
  progressPercent: 42,
};

function recalculateWallet(nextPositions: Position[], balanceCents: Cents) {
  const investedValueCents = nextPositions.reduce(
    (sum, position) => sum + position.marketValueCents,
    0,
  );

  wallet = {
    availableBalanceCents: balanceCents,
    investedValueCents,
    totalEquityCents: balanceCents + investedValueCents,
    positionCount: nextPositions.length,
    positions: nextPositions,
  };
}

function findAsset(symbol: string): Asset {
  const asset = assets.find((candidate) => candidate.symbol === symbol);
  if (!asset) {
    throw new Error("Ativo nao encontrado no catalogo simulado.");
  }

  return asset;
}

function prependTransaction(transaction: Transaction) {
  transactions = [transaction, ...transactions];
}

export class MockFortunaFinancialService implements FortunaFinancialPort {
  async getOverview(): Promise<PlayerOverview> {
    return {
      playerName: "Marcos",
      nickname: "Investidor em Formacao",
      wallet,
      assets,
      incomes,
      transactions,
      missions,
      mentorTips,
      city,
      marketUpdating: false,
    };
  }

  async buyAsset(request: TradeRequest): Promise<TradeResult> {
    const asset = findAsset(request.symbol);
    const validation = validateBuyOperation({
      asset,
      availableBalanceCents: wallet.availableBalanceCents,
      quantity: request.quantity,
      marketUpdating: false,
    });

    if (validation.blocked) {
      throw new Error(validation.reason);
    }

    const totalCents = calculateTradeTotalCents(
      asset.currentPriceCents,
      request.quantity,
    );
    const balanceAfterCents = calculateBalanceAfterBuy(
      wallet.availableBalanceCents,
      totalCents,
    );
    const existing = wallet.positions.find(
      (position) => position.symbol === asset.symbol,
    );
    const nextPositions = existing
      ? wallet.positions.map((position) =>
          position.symbol === asset.symbol
            ? {
                ...position,
                quantity: position.quantity + request.quantity,
                marketValueCents:
                  position.marketValueCents + totalCents,
                averagePriceCents: Math.trunc(
                  (position.averagePriceCents * position.quantity +
                    asset.currentPriceCents * request.quantity) /
                    (position.quantity + request.quantity),
                ),
              }
            : position,
        )
      : [
          ...wallet.positions,
          {
            symbol: asset.symbol,
            name: asset.name,
            quantity: request.quantity,
            averagePriceCents: asset.currentPriceCents,
            marketValueCents: totalCents,
            assetClass: asset.assetClass,
            accumulatedIncomeCents: 0,
          },
        ];

    recalculateWallet(nextPositions, balanceAfterCents);

    const transaction: Transaction = {
      id: `tx-buy-${Date.now()}`,
      type: "BUY",
      symbol: asset.symbol,
      description: "Compra realizada com validacao final simulada pelo dominio.",
      quantity: request.quantity,
      unitPriceCents: asset.currentPriceCents,
      totalCents,
      balanceAfterCents,
      occurredAt: new Date().toISOString(),
    };
    prependTransaction(transaction);

    return {
      transaction,
      wallet,
      message:
        "Compra registrada. Acompanhe como essa posicao altera risco, liquidez e diversificacao da carteira.",
    };
  }

  async sellAsset(request: TradeRequest): Promise<TradeResult> {
    const asset = findAsset(request.symbol);
    const position = wallet.positions.find(
      (candidate) => candidate.symbol === asset.symbol,
    );
    const validation = validateSellOperation({
      asset,
      position,
      quantity: request.quantity,
      marketUpdating: false,
    });

    if (validation.blocked) {
      throw new Error(validation.reason);
    }

    const totalCents = calculateTradeTotalCents(
      asset.currentPriceCents,
      request.quantity,
    );
    const balanceAfterCents = calculateBalanceAfterSell(
      wallet.availableBalanceCents,
      totalCents,
    );
    const nextPositions = wallet.positions
      .map((candidate) =>
        candidate.symbol === asset.symbol
          ? {
              ...candidate,
              quantity: candidate.quantity - request.quantity,
              marketValueCents:
                candidate.marketValueCents - totalCents,
            }
          : candidate,
      )
      .filter((candidate) => candidate.quantity > 0);

    recalculateWallet(nextPositions, balanceAfterCents);

    const transaction: Transaction = {
      id: `tx-sell-${Date.now()}`,
      type: "SELL",
      symbol: asset.symbol,
      description: "Venda registrada como ajuste de carteira.",
      quantity: request.quantity,
      unitPriceCents: asset.currentPriceCents,
      totalCents,
      balanceAfterCents,
      occurredAt: new Date().toISOString(),
    };
    prependTransaction(transaction);

    return {
      transaction,
      wallet,
      message:
        "Venda registrada. Revise se o saldo liberado apoia sua estrategia, reserva ou rebalanceamento.",
    };
  }

  async collectIncome(incomeEventId: string): Promise<TradeResult> {
    const income = incomes.find((candidate) => candidate.id === incomeEventId);
    if (!income || income.status !== "AVAILABLE") {
      throw new Error("Este rendimento nao esta disponivel para coleta.");
    }

    incomes = incomes.map((candidate) =>
      candidate.id === incomeEventId
        ? { ...candidate, status: "COLLECTED" }
        : candidate,
    );
    const balanceAfterCents = wallet.availableBalanceCents + income.amountCents;
    recalculateWallet(wallet.positions, balanceAfterCents);

    const transaction: Transaction = {
      id: `tx-income-${Date.now()}`,
      type: "INCOME",
      symbol: income.symbol,
      description: `Rendimento colhido de ${income.assetName}`,
      totalCents: income.amountCents,
      balanceAfterCents,
      occurredAt: new Date().toISOString(),
    };
    prependTransaction(transaction);

    return {
      transaction,
      wallet,
      message:
        "Rendimento colhido. Renda passiva simulada ajuda a entender recorrencia, mas nao representa garantia real.",
    };
  }
}

export const fortunaFinancialService = new MockFortunaFinancialService();
