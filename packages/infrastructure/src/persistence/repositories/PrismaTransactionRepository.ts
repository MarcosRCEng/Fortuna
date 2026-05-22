import { TransactionType as PrismaTransactionType } from "@prisma/client";
import type {
  TransactionHistoryFilter,
  TransactionRepository,
} from "@fortuna/application";
import type { Transaction } from "@fortuna/domain";
import { TransactionType } from "@fortuna/domain";
import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";
import {
  toTransaction,
  transactionTypeToDatabase,
} from "../prisma/mappers.js";

export class PrismaTransactionRepository implements TransactionRepository {
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async append(transaction: Transaction): Promise<void> {
    const wallet = await this.prisma.wallet.findUniqueOrThrow({
      where: { playerId: transaction.playerId },
    });
    const type = transactionTypeToDatabase(
      transaction.type,
    ) as PrismaTransactionType;
    const total = transaction.total.cents;
    const balanceAfter = transaction.balanceAfter.cents;
    const balanceBefore =
      transaction.type === TransactionType.BUY
        ? balanceAfter + total
        : Math.max(0, balanceAfter - total);

    await this.prisma.transaction.create({
      data: {
        id: transaction.id,
        playerId: transaction.playerId,
        walletId: wallet.id,
        assetId: transaction.asset?.id,
        transactionType: type,
        quantity: transaction.quantity?.units,
        unitPriceCents: transaction.unitPrice?.cents,
        grossAmountCents: total,
        feesCents: 0,
        netAmountCents: total,
        balanceBeforeCents: balanceBefore,
        balanceAfterCents: balanceAfter,
        occurredAt: transaction.occurredAt,
        metadata: transaction.metadata,
      },
    });
  }

  async listByPlayerId(
    playerId: string,
    filter?: TransactionHistoryFilter,
  ): Promise<Transaction[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        playerId,
        ...(filter?.type
          ? {
              transactionType: transactionTypeToDatabase(
                filter.type,
              ) as PrismaTransactionType,
            }
          : {}),
        ...(filter?.assetSymbol
          ? { asset: { symbol: filter.assetSymbol.toUpperCase() } }
          : {}),
      },
      include: { asset: true },
      orderBy: [{ occurredAt: "asc" }, { createdAt: "asc" }],
    });

    return transactions.map(toTransaction);
  }

  async findById(id: string): Promise<Transaction | undefined> {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { asset: true },
    });

    return transaction ? toTransaction(transaction) : undefined;
  }
}
