import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import {
  IncomeAlreadyCollectedError,
  InsufficientBalanceError,
  InsufficientPositionError,
} from "@fortuna/domain";
import { PrismaFinancialOperationsService } from "../../src/persistence/services/PrismaFinancialOperationsService.js";

const databaseUrl = process.env.FORTUNA_TEST_DATABASE_URL;
const describeIntegration = databaseUrl ? describe : describe.skip;
const prismaUrl =
  databaseUrl ?? "postgresql://fortuna:fortuna@localhost:5432/fortuna_skip";

describeIntegration("PrismaFinancialOperationsService integration", () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: prismaUrl } },
  });
  const now = new Date("2026-05-22T12:00:00.000Z");
  let nextId = 0;
  const service = new PrismaFinancialOperationsService(
    prisma,
    { now: () => now },
    () => `integration-id-${++nextId}`,
  );

  beforeAll(async () => {
    await resetDatabase(prisma);
    await seedCatalog(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("creates a player atomically with wallet, city state and initial deposit history", async () => {
    await service.createPlayer({
      id: "player-1",
      name: "Jogador Fortuna",
      initialBalanceCents: 20_000,
    });

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { playerId: "player-1" },
    });
    const cityState = await prisma.cityState.findUniqueOrThrow({
      where: { playerId: "player-1" },
    });
    const transactions = await prisma.transaction.findMany({
      where: { playerId: "player-1" },
    });

    expect(wallet.availableBalanceCents).toBe(20_000);
    expect(cityState.level).toBe(1);
    expect(transactions[0].transactionType).toBe("INITIAL_DEPOSIT");
    expect(transactions[0].balanceAfterCents).toBe(20_000);
  });

  it("buys with sufficient balance and writes balance, position and transaction in one database transaction", async () => {
    const transaction = await service.buy({
      playerId: "player-1",
      symbol: "FORT3",
      quantity: 3,
    });

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { playerId: "player-1" },
    });
    const position = await prisma.position.findUniqueOrThrow({
      where: {
        playerId_assetId: { playerId: "player-1", assetId: "asset-fort3" },
      },
    });

    expect(transaction.type).toBe("BUY");
    expect(wallet.availableBalanceCents).toBe(17_000);
    expect(position.quantity).toBe(3);
    expect(position.averagePriceCents).toBe(1_000);
  });

  it("rejects buy without balance and rolls back all financial state", async () => {
    const beforeWallet = await prisma.wallet.findUniqueOrThrow({
      where: { playerId: "player-1" },
    });
    const beforeTransactions = await prisma.transaction.count({
      where: { playerId: "player-1" },
    });

    await expect(
      service.buy({ playerId: "player-1", symbol: "FORT3", quantity: 100 }),
    ).rejects.toBeInstanceOf(InsufficientBalanceError);

    const afterWallet = await prisma.wallet.findUniqueOrThrow({
      where: { playerId: "player-1" },
    });
    const afterTransactions = await prisma.transaction.count({
      where: { playerId: "player-1" },
    });

    expect(afterWallet.availableBalanceCents).toBe(
      beforeWallet.availableBalanceCents,
    );
    expect(afterTransactions).toBe(beforeTransactions);
  });

  it("sells with sufficient position and rejects selling above position", async () => {
    await service.sell({ playerId: "player-1", symbol: "FORT3", quantity: 2 });

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { playerId: "player-1" },
    });
    const position = await prisma.position.findUniqueOrThrow({
      where: {
        playerId_assetId: { playerId: "player-1", assetId: "asset-fort3" },
      },
    });
    const transactionCount = await prisma.transaction.count({
      where: { playerId: "player-1" },
    });

    expect(wallet.availableBalanceCents).toBe(19_000);
    expect(position.quantity).toBe(1);

    await expect(
      service.sell({ playerId: "player-1", symbol: "FORT3", quantity: 2 }),
    ).rejects.toBeInstanceOf(InsufficientPositionError);

    expect(
      await prisma.transaction.count({ where: { playerId: "player-1" } }),
    ).toBe(transactionCount);
  });

  it("collects income once and prevents duplicate collection", async () => {
    await prisma.incomeEvent.create({
      data: {
        id: "income-1",
        playerId: "player-1",
        assetId: "asset-fort3",
        incomeType: "DIVIDEND",
        amountCents: 250,
        dueDate: new Date("2026-05-22T00:00:00.000Z"),
      },
    });

    await service.collectIncome({
      playerId: "player-1",
      incomeEventId: "income-1",
    });

    const income = await prisma.incomeEvent.findUniqueOrThrow({
      where: { id: "income-1" },
    });
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { playerId: "player-1" },
    });
    const transactionCount = await prisma.transaction.count({
      where: { playerId: "player-1" },
    });

    expect(income.status).toBe("COLLECTED");
    expect(income.transactionId).toBeTruthy();
    expect(wallet.availableBalanceCents).toBe(19_250);

    await expect(
      service.collectIncome({
        playerId: "player-1",
        incomeEventId: "income-1",
      }),
    ).rejects.toBeInstanceOf(IncomeAlreadyCollectedError);

    expect(
      await prisma.transaction.count({ where: { playerId: "player-1" } }),
    ).toBe(transactionCount);
  });
});

async function resetDatabase(prisma: PrismaClient): Promise<void> {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS public CASCADE`);
  await prisma.$executeRawUnsafe(`CREATE SCHEMA public`);
  const migrationPath = resolve(
    "packages/infrastructure/prisma/migrations/202605220001_init_fortuna_persistence/migration.sql",
  );
  const statements = readFileSync(migrationPath, "utf8")
    .split(";")
    .map((statement) => statement.trim())
    .filter(Boolean);

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

async function seedCatalog(prisma: PrismaClient): Promise<void> {
  await prisma.asset.create({
    data: {
      id: "asset-fort3",
      symbol: "FORT3",
      name: "Fortuna Educacao ON",
      assetType: "STOCK",
      riskLevel: "HIGH",
      liquidityType: "D_PLUS_1",
    },
  });
  await prisma.marketPrice.create({
    data: {
      id: "price-fort3",
      assetId: "asset-fort3",
      priceCents: 1_000,
      referenceDatetime: new Date("2026-05-22T11:00:00.000Z"),
      source: "integration-test",
    },
  });
}
