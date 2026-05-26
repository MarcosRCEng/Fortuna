import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??=
  "postgresql://fortuna:fortuna_dev@localhost:5432/fortuna";

const prisma = new PrismaClient();
const referenceDatetime = new Date("2026-05-22T12:00:00.000Z");

async function main() {
  const demoPlayerId = "player-demo";
  const demoWalletId = "wallet-player-demo";
  const catalog = [
    {
      id: "asset-tsf001",
      symbol: "TSF001",
      name: "Tesouro Liquidez Fortuna",
      assetType: "FIXED_INCOME",
      description:
        "Renda fixa inspirada em titulo publico de liquidez diaria.",
      riskLevel: "LOW",
      liquidityType: "DAILY",
      educationalText:
        "Renda fixa de liquidez diaria costuma ser usada para objetivos de curto prazo e reserva de emergencia.",
      priceCents: 10_000,
    },
    {
      id: "asset-cdblf001",
      symbol: "CDBLF001",
      name: "Banco Reserva FIC",
      assetType: "FIXED_INCOME",
      description: "Renda fixa bancaria com liquidez diaria simulada.",
      riskLevel: "MEDIUM",
      liquidityType: "DAILY",
      educationalText:
        "Compare retorno, risco e liquidez antes de escolher um CDB.",
      priceCents: 5_000,
    },
    {
      id: "asset-fiisf001",
      symbol: "FIISF001",
      name: "FII Praca Central",
      assetType: "FII",
      description: "Fundo imobiliario ficticio focado em shoppings.",
      riskLevel: "MEDIUM",
      liquidityType: "D_PLUS_1",
      educationalText:
        "FIIs podem distribuir rendimentos, mas tambem sofrem variacao de preco e risco de vacancia.",
      priceCents: 10_000,
    },
    {
      id: "asset-fiilf001",
      symbol: "FIILF001",
      name: "FII Logistica Fortuna",
      assetType: "FII",
      description: "Fundo imobiliario ficticio focado em galpoes logisticos.",
      riskLevel: "MEDIUM",
      liquidityType: "D_PLUS_1",
      educationalText:
        "Setores diferentes de FIIs ajudam a estudar diversificacao.",
      priceCents: 11_000,
    },
    {
      id: "asset-aef001",
      symbol: "AEF001",
      name: "Acao Energia Solar",
      assetType: "STOCK",
      description: "Acao ficticia do setor de energia.",
      riskLevel: "HIGH",
      liquidityType: "D_PLUS_1",
      educationalText:
        "Acoes podem oscilar bastante; tamanho de posicao importa.",
      priceCents: 2_500,
    },
    {
      id: "asset-atf001",
      symbol: "ATF001",
      name: "Acao Tecnologia Fortuna",
      assetType: "STOCK",
      description: "Acao ficticia de tecnologia.",
      riskLevel: "HIGH",
      liquidityType: "D_PLUS_1",
      educationalText:
        "Ativos de maior volatilidade pedem cuidado com concentracao.",
      priceCents: 3_000,
    },
  ] as const;

  for (const asset of catalog) {
    await prisma.asset.upsert({
      where: { symbol: asset.symbol },
      update: {
        id: asset.id,
        name: asset.name,
        assetType: asset.assetType,
        description: asset.description,
        riskLevel: asset.riskLevel,
        liquidityType: asset.liquidityType,
        educationalText: asset.educationalText,
      },
      create: {
        id: asset.id,
        symbol: asset.symbol,
        name: asset.name,
        assetType: asset.assetType,
        description: asset.description,
        riskLevel: asset.riskLevel,
        liquidityType: asset.liquidityType,
        educationalText: asset.educationalText,
      },
    });
    await prisma.marketPrice.upsert({
      where: {
        assetId_referenceDatetime_source: {
          assetId: asset.id,
          referenceDatetime,
          source: "fortuna-seed",
        },
      },
      update: { priceCents: asset.priceCents },
      create: {
        id: `price-${asset.symbol.toLowerCase()}-20260522`,
        assetId: asset.id,
        priceCents: asset.priceCents,
        referenceDatetime,
        source: "fortuna-seed",
      },
    });
  }

  await prisma.asset.upsert({
    where: { symbol: "FORT3" },
    update: {},
    create: {
      id: "asset-fort3",
      symbol: "FORT3",
      name: "Fortuna Educacao ON",
      assetType: "STOCK",
      description: "Acao mockada para aprender sobre renda variavel.",
      riskLevel: "HIGH",
      liquidityType: "D_PLUS_1",
      educationalText:
        "Acoes podem oscilar bastante. No Fortuna, elas ajudam a praticar compra, venda e risco de mercado sem dinheiro real.",
      marketPrices: {
        create: {
          id: "price-fort3-20260522",
          priceCents: 1_000,
          referenceDatetime,
          source: "fortuna-seed",
        },
      },
    },
  });

  await prisma.asset.upsert({
    where: { symbol: "MALL11" },
    update: {},
    create: {
      id: "asset-mall11",
      symbol: "MALL11",
      name: "Fortuna Shoppings FII",
      assetType: "FII",
      description: "FII mockado para introduzir rendimentos periodicos.",
      riskLevel: "MEDIUM",
      liquidityType: "D_PLUS_1",
      educationalText:
        "FIIs costumam distribuir rendimentos, mas tambem sofrem variacao de preco e risco de vacancia.",
      marketPrices: {
        create: {
          id: "price-mall11-20260522",
          priceCents: 9_750,
          referenceDatetime,
          source: "fortuna-seed",
        },
      },
    },
  });

  await prisma.asset.upsert({
    where: { symbol: "TESOURO-SELIC" },
    update: {},
    create: {
      id: "asset-tesouro-selic",
      symbol: "TESOURO-SELIC",
      name: "Tesouro Selic Simulado",
      assetType: "FIXED_INCOME",
      description: "Renda fixa mockada para praticar reserva de liquidez.",
      riskLevel: "LOW",
      liquidityType: "DAILY",
      educationalText:
        "Renda fixa de liquidez diaria costuma ser usada para objetivos de curto prazo e reserva de emergencia.",
      marketPrices: {
        create: {
          id: "price-tesouro-selic-20260522",
          priceCents: 10_000,
          referenceDatetime,
          source: "fortuna-seed",
        },
      },
    },
  });

  const missions = [
    {
      id: "mission-first-buy",
      code: "FIRST_BUY",
      title: "Primeira compra",
      description: "Compre seu primeiro ativo.",
      objective: "Executar uma operacao BUY valida.",
      completionCriteria: { eventType: "AssetBought", count: 1 },
      rewardType: "COINS",
      rewardAmountCents: 500,
      educationalExplanation:
        "A primeira compra mostra como preco, quantidade e saldo se conectam.",
    },
    {
      id: "mission-basic-diversification",
      code: "BASIC_DIVERSIFICATION",
      title: "Diversificacao basica",
      description: "Tenha posicao em dois tipos de ativo.",
      objective: "Montar uma carteira com pelo menos dois asset_types.",
      completionCriteria: { distinctAssetTypes: 2 },
      rewardType: "EXPERIENCE",
      rewardAmountCents: 0,
      educationalExplanation:
        "Diversificar reduz a dependencia de um unico tipo de investimento.",
    },
    {
      id: "mission-collect-income",
      code: "COLLECT_INCOME",
      title: "Colha um rendimento",
      description: "Colete um rendimento disponivel.",
      objective: "Executar uma coleta INCOME_COLLECTED valida.",
      completionCriteria: { eventType: "IncomeCollected", count: 1 },
      rewardType: "COINS",
      rewardAmountCents: 300,
      educationalExplanation:
        "Rendimentos aumentam o saldo disponivel e devem aparecer no historico financeiro.",
    },
    {
      id: "mission-liquidity-reserve",
      code: "LIQUIDITY_RESERVE",
      title: "Reserva e liquidez",
      description: "Mantenha parte da carteira em liquidez diaria.",
      objective: "Comprar um ativo com liquidity_type DAILY.",
      completionCriteria: { liquidityType: "DAILY", count: 1 },
      rewardType: "EXPERIENCE",
      rewardAmountCents: 0,
      educationalExplanation:
        "Liquidez ajuda a lidar com imprevistos sem vender ativos inadequados.",
    },
    {
      id: "mission-read-mentor-tip",
      code: "READ_MENTOR_TIP",
      title: "Ouvir o Mentor Fortuna",
      description: "Leia uma dica educativa do Mentor Fortuna.",
      objective: "Registrar reconhecimento de uma dica do mentor.",
      completionCriteria: { eventType: "MentorTipAcknowledged", count: 1 },
      rewardType: "EXPERIENCE",
      rewardAmountCents: 0,
      educationalExplanation:
        "Dicas contextualizadas ajudam a entender o motivo por tras de cada decisao.",
    },
  ] as const;

  for (const mission of missions) {
    await prisma.mission.upsert({
      where: { code: mission.code },
      update: {},
      create: mission,
    });
  }

  await prisma.player.upsert({
    where: { id: demoPlayerId },
    update: {
      name: "Jogador Demo",
      nickname: "Investidor Iniciante",
      status: "ACTIVE",
    },
    create: {
      id: demoPlayerId,
      name: "Jogador Demo",
      nickname: "Investidor Iniciante",
      status: "ACTIVE",
    },
  });

  await prisma.wallet.upsert({
    where: { playerId: demoPlayerId },
    update: {
      availableBalanceCents: 200_000,
      metadata: { seed: "demo", rule: "1 moeda Fortuna = R$ 0,01" },
    },
    create: {
      id: demoWalletId,
      playerId: demoPlayerId,
      availableBalanceCents: 200_000,
      metadata: { seed: "demo", rule: "1 moeda Fortuna = R$ 0,01" },
    },
  });

  await prisma.incomeEvent.upsert({
    where: { id: "income-demo-fiisf001" },
    update: {
      status: "AVAILABLE",
      collectedAt: null,
      transactionId: null,
      amountCents: 250,
      dueDate: new Date("2026-05-22T00:00:00.000Z"),
    },
    create: {
      id: "income-demo-fiisf001",
      playerId: demoPlayerId,
      assetId: "asset-fiisf001",
      incomeType: "RENT",
      amountCents: 250,
      dueDate: new Date("2026-05-22T00:00:00.000Z"),
      status: "AVAILABLE",
    },
  });

  await prisma.cityState.upsert({
    where: { playerId: demoPlayerId },
    update: {
      level: 1,
      experiencePoints: 0,
      unlockedBuildings: ["central_plaza"],
      cityScore: 0,
    },
    create: {
      id: "city-player-demo",
      playerId: demoPlayerId,
      level: 1,
      experiencePoints: 0,
      unlockedBuildings: ["central_plaza"],
      cityScore: 0,
    },
  });

  await prisma.mentorMessage.upsert({
    where: { id: "mentor-message-demo-welcome" },
    update: {
      message:
        "Bem-vindo ao ambiente demo. Use os ativos simulados para aprender sem promessa de ganho real.",
      readAt: null,
    },
    create: {
      id: "mentor-message-demo-welcome",
      playerId: demoPlayerId,
      type: "educational_tip",
      trigger: "demo_seed",
      title: "Comece com calma",
      message:
        "Bem-vindo ao ambiente demo. Use os ativos simulados para aprender sem promessa de ganho real.",
      educationalConcept: "simulacao",
      severity: "info",
      metadata: { seed: "demo" },
    },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
