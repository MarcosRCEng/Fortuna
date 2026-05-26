import {
  AssetNotFoundError,
  AssetSymbol,
  IncomeAlreadyCollectedError,
  IncomeEventNotFoundError,
  InsufficientBalanceError,
  InsufficientPositionError,
  InvalidMarketPriceError,
  MoneyCents,
  Quantity,
  Transaction,
  TransactionType,
  WalletNotFoundError,
} from "@fortuna/domain";
import type { Clock } from "@fortuna/application";
import type {
  FortunaPrismaClient,
  FortunaPrismaTransaction,
} from "../prisma/PrismaClientFactory.js";
import { centsToNumber, toTransaction } from "../prisma/mappers.js";

export interface CreatePersistentPlayerCommand {
  id: string;
  name: string;
  nickname?: string;
  initialBalanceCents: number;
}

export interface TradeCommand {
  playerId: string;
  symbol: string;
  quantity: number;
  correlationId?: string;
}

export interface CollectPersistentIncomeCommand {
  playerId: string;
  incomeEventId: string;
  correlationId?: string;
}

export class PrismaFinancialOperationsService {
  constructor(
    private readonly prisma: FortunaPrismaClient,
    private readonly clock: Clock,
    private readonly idGenerator: () => string,
  ) {}

  async createPlayer(command: CreatePersistentPlayerCommand): Promise<void> {
    const initialBalance = MoneyCents.fromCents(command.initialBalanceCents);
    const occurredAt = this.clock.now();

    await this.prisma.$transaction(async (tx) => {
      await tx.player.create({
        data: {
          id: command.id,
          name: command.name.trim(),
          nickname: command.nickname?.trim(),
        },
      });

      const walletId = `wallet-${command.id}`;
      await tx.wallet.create({
        data: {
          id: walletId,
          playerId: command.id,
          availableBalanceCents: initialBalance.cents,
        },
      });

      await tx.cityState.create({
        data: {
          id: `city-${command.id}`,
          playerId: command.id,
          unlockedBuildings: {
            version: 1,
            playerProgress: {
              playerId: command.id,
              level: 1,
              experiencePoints: 0,
              completedMissionIds: [],
              rewardedMissionIds: [],
              grantedBadges: [],
              unlockedDistricts: ["CENTRO_FINANCEIRO"],
              unlockedAssetClasses: ["CASH"],
              unlockedTools: ["WALLET_SUMMARY"],
              unlockedReports: [],
              seenEventTypes: [],
              netWorthMilestonesReachedCents: [],
              marketCyclesAdvanced: 0,
              updatedAt: occurredAt.toISOString(),
            },
          },
        },
      });

      if (initialBalance.cents > 0) {
        await tx.transaction.create({
          data: {
            id: this.idGenerator(),
            playerId: command.id,
            walletId,
            transactionType: "INITIAL_DEPOSIT",
            status: "CONFIRMED",
            grossAmountCents: initialBalance.cents,
            feesCents: 0,
            netAmountCents: initialBalance.cents,
            balanceBeforeCents: 0,
            balanceAfterCents: initialBalance.cents,
            occurredAt,
          },
        });
      }

      await tx.gameEvent.create({
        data: {
          id: this.idGenerator(),
          playerId: command.id,
          eventType: "PLAYER_CREATED",
          eventPayload: { source: "GAMEPLAY" },
          occurredAt,
        },
      });
    });
  }

  async buy(command: TradeCommand): Promise<Transaction> {
    const symbol = AssetSymbol.create(command.symbol);
    const quantity = Quantity.fromUnits(command.quantity);
    const occurredAt = this.clock.now();

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({ where: { symbol: symbol.value } });
      if (!asset) {
        throw new AssetNotFoundError(symbol.value);
      }

      const price = await tx.marketPrice.findFirst({
        where: { assetId: asset.id },
        orderBy: { referenceDatetime: "desc" },
      });
      if (!price || centsToNumber(price.priceCents) < 1) {
        throw new InvalidMarketPriceError();
      }

      const walletRows = await tx.$queryRaw<
        Array<{ id: string; available_balance_cents: number }>
      >`SELECT id, available_balance_cents FROM wallets WHERE player_id = ${command.playerId} FOR UPDATE`;
      const wallet = walletRows[0];
      if (!wallet) {
        throw new WalletNotFoundError(command.playerId);
      }

      const unitPriceCents = centsToNumber(price.priceCents);
      const totalCents = unitPriceCents * quantity.units;
      const balanceBefore = centsToNumber(wallet.available_balance_cents);
      if (balanceBefore < totalCents) {
        throw new InsufficientBalanceError();
      }

      const positionRows = await tx.$queryRaw<
        Array<{
          id: string;
          quantity: number;
          average_price_cents: number;
        }>
      >`SELECT id, quantity, average_price_cents FROM positions WHERE player_id = ${command.playerId} AND asset_id = ${asset.id} FOR UPDATE`;
      const position = positionRows[0];
      const positionBefore = position?.quantity ?? 0;
      const positionAfter = positionBefore + quantity.units;
      const previousCost =
        (position ? centsToNumber(position.average_price_cents) : 0) *
        positionBefore;
      const newAveragePrice = Math.floor(
        (previousCost + totalCents + positionAfter / 2) / positionAfter,
      );
      const balanceAfter = balanceBefore - totalCents;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { availableBalanceCents: balanceAfter },
      });

      if (position) {
        await tx.position.update({
          where: { id: position.id },
          data: {
            quantity: positionAfter,
            averagePriceCents: newAveragePrice,
            totalInvestedCents: newAveragePrice * positionAfter,
          },
        });
      } else {
        await tx.position.create({
          data: {
            id: `position-${command.playerId}-${asset.id}`,
            playerId: command.playerId,
            walletId: wallet.id,
            assetId: asset.id,
            quantity: positionAfter,
            averagePriceCents: unitPriceCents,
            totalInvestedCents: totalCents,
          },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          id: this.idGenerator(),
          playerId: command.playerId,
          walletId: wallet.id,
          assetId: asset.id,
          transactionType: "BUY",
          status: "CONFIRMED",
          quantity: quantity.units,
          unitPriceCents,
          grossAmountCents: totalCents,
          feesCents: 0,
          netAmountCents: totalCents,
          balanceBeforeCents: balanceBefore,
          balanceAfterCents: balanceAfter,
          positionBeforeQuantity: positionBefore,
          positionAfterQuantity: positionAfter,
          occurredAt,
          metadata: {
            averagePriceCents: position
              ? centsToNumber(position.average_price_cents)
              : unitPriceCents,
            ...(command.correlationId
              ? { correlationId: command.correlationId }
              : {}),
          },
        },
        include: { asset: true },
      });

      await this.appendGameEvent(tx, command.playerId, "ASSET_PURCHASED", {
        assetSymbol: asset.symbol,
        quantity: quantity.units,
        totalCents,
        correlationId: command.correlationId,
      });

      if (["FII", "FIXED_INCOME", "TREASURY"].includes(asset.assetType)) {
        const incomeAmountCents = Math.max(1, Math.floor(totalCents * 0.005));
        await tx.incomeEvent.create({
          data: {
            id: this.idGenerator(),
            playerId: command.playerId,
            assetId: asset.id,
            positionId: `position-${command.playerId}-${asset.id}`,
            incomeType: asset.assetType === "FII" ? "RENT" : "INTEREST",
            amountCents: incomeAmountCents,
            dueDate: occurredAt,
            status: "AVAILABLE",
          },
        });
        await this.appendGameEvent(tx, command.playerId, "YIELD_AVAILABLE", {
          assetSymbol: asset.symbol,
          amountCents: incomeAmountCents,
          correlationId: command.correlationId,
        });
      }

      return toTransaction(transaction);
    });
  }

  async sell(command: TradeCommand): Promise<Transaction> {
    const symbol = AssetSymbol.create(command.symbol);
    const quantity = Quantity.fromUnits(command.quantity);
    const occurredAt = this.clock.now();

    return this.prisma.$transaction(async (tx) => {
      const asset = await tx.asset.findUnique({ where: { symbol: symbol.value } });
      if (!asset) {
        throw new AssetNotFoundError(symbol.value);
      }

      const walletRows = await tx.$queryRaw<
        Array<{ id: string; available_balance_cents: number }>
      >`SELECT id, available_balance_cents FROM wallets WHERE player_id = ${command.playerId} FOR UPDATE`;
      const wallet = walletRows[0];
      if (!wallet) {
        throw new WalletNotFoundError(command.playerId);
      }

      const positionRows = await tx.$queryRaw<
        Array<{ id: string; quantity: number; average_price_cents: number }>
      >`SELECT id, quantity, average_price_cents FROM positions WHERE player_id = ${command.playerId} AND asset_id = ${asset.id} FOR UPDATE`;
      const position = positionRows[0];
      if (!position || position.quantity < quantity.units) {
        throw new InsufficientPositionError();
      }

      const price = await tx.marketPrice.findFirst({
        where: { assetId: asset.id },
        orderBy: { referenceDatetime: "desc" },
      });
      if (!price || centsToNumber(price.priceCents) < 1) {
        throw new InvalidMarketPriceError();
      }

      const unitPriceCents = centsToNumber(price.priceCents);
      const totalCents = unitPriceCents * quantity.units;
      const balanceBefore = centsToNumber(wallet.available_balance_cents);
      const balanceAfter = balanceBefore + totalCents;
      const positionBefore = position.quantity;
      const positionAfter = positionBefore - quantity.units;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { availableBalanceCents: balanceAfter },
      });

      if (positionAfter === 0) {
        await tx.position.delete({ where: { id: position.id } });
      } else {
        const averagePrice = centsToNumber(position.average_price_cents);
        await tx.position.update({
          where: { id: position.id },
          data: {
            quantity: positionAfter,
            totalInvestedCents: averagePrice * positionAfter,
          },
        });
      }

      const transaction = await tx.transaction.create({
        data: {
          id: this.idGenerator(),
          playerId: command.playerId,
          walletId: wallet.id,
          assetId: asset.id,
          transactionType: "SELL",
          status: "CONFIRMED",
          quantity: quantity.units,
          unitPriceCents,
          grossAmountCents: totalCents,
          feesCents: 0,
          netAmountCents: totalCents,
          balanceBeforeCents: balanceBefore,
          balanceAfterCents: balanceAfter,
          positionBeforeQuantity: positionBefore,
          positionAfterQuantity: positionAfter,
          occurredAt,
          metadata: command.correlationId
            ? { correlationId: command.correlationId }
            : undefined,
        },
        include: { asset: true },
      });

      await this.appendGameEvent(tx, command.playerId, "ASSET_SOLD", {
        assetSymbol: asset.symbol,
        quantity: quantity.units,
        totalCents,
        correlationId: command.correlationId,
      });

      return toTransaction(transaction);
    });
  }

  async collectIncome(
    command: CollectPersistentIncomeCommand,
  ): Promise<Transaction> {
    const occurredAt = this.clock.now();

    return this.prisma.$transaction(async (tx) => {
      const walletRows = await tx.$queryRaw<
        Array<{ id: string; available_balance_cents: number }>
      >`SELECT id, available_balance_cents FROM wallets WHERE player_id = ${command.playerId} FOR UPDATE`;
      const wallet = walletRows[0];
      if (!wallet) {
        throw new WalletNotFoundError(command.playerId);
      }

      const incomeRows = await tx.$queryRaw<
        Array<{
          id: string;
          asset_id: string;
          amount_cents: number;
          status: string;
        }>
      >`SELECT id, asset_id, amount_cents, status FROM income_events WHERE id = ${command.incomeEventId} AND player_id = ${command.playerId} FOR UPDATE`;
      const income = incomeRows[0];
      if (!income) {
        throw new IncomeEventNotFoundError(command.incomeEventId);
      }
      if (income.status === "COLLECTED") {
        throw new IncomeAlreadyCollectedError();
      }

      const asset = await tx.asset.findUniqueOrThrow({
        where: { id: income.asset_id },
      });
      const amountCents = centsToNumber(income.amount_cents);
      const balanceBefore = centsToNumber(wallet.available_balance_cents);
      const balanceAfter = balanceBefore + amountCents;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { availableBalanceCents: balanceAfter },
      });

      const transaction = await tx.transaction.create({
        data: {
          id: this.idGenerator(),
          playerId: command.playerId,
          walletId: wallet.id,
          assetId: asset.id,
          transactionType: "INCOME_COLLECTED",
          status: "CONFIRMED",
          grossAmountCents: amountCents,
          feesCents: 0,
          netAmountCents: amountCents,
          balanceBeforeCents: balanceBefore,
          balanceAfterCents: balanceAfter,
          occurredAt,
          metadata: {
            incomeEventId: income.id,
            ...(command.correlationId
              ? { correlationId: command.correlationId }
              : {}),
          },
        },
        include: { asset: true },
      });

      await tx.incomeEvent.update({
        where: { id: income.id },
        data: {
          status: "COLLECTED",
          collectedAt: occurredAt,
          transactionId: transaction.id,
        },
      });

      await this.appendGameEvent(tx, command.playerId, "INCOME_COLLECTED", {
        assetSymbol: asset.symbol,
        amountCents,
        incomeEventId: income.id,
        correlationId: command.correlationId,
      });

      return toTransaction(transaction);
    });
  }

  private async appendGameEvent(
    tx: FortunaPrismaTransaction,
    playerId: string,
    eventType: string,
    metadata: Record<string, string | number | undefined>,
  ): Promise<void> {
    await tx.gameEvent.create({
      data: {
        id: this.idGenerator(),
        playerId,
        eventType,
        eventPayload: {
          source: "FINANCIAL_EVENT",
          metadata: Object.fromEntries(
            Object.entries(metadata).filter(([, value]) => value !== undefined),
          ),
        },
        occurredAt: this.clock.now(),
      },
    });
  }
}
