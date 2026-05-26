import {
  IncomeAlreadyCollectedError,
  IncomeEventNotFoundError,
  Transaction,
  TransactionType,
  WalletNotFoundError,
} from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { DomainEventPublisher } from "../events/DomainEventPublisher.js";
import type { IncomeEventRepository } from "../ports/IncomeEventRepository.js";
import type { LoggerPort } from "../ports/LoggerPort.js";
import type { TransactionRepository } from "../ports/TransactionRepository.js";
import type { WalletRepository } from "../ports/WalletRepository.js";
import type { UseCaseResult } from "./UseCaseResult.js";

export interface CollectIncomeCommand {
  playerId: string;
  incomeEventId: string;
  correlationId?: string;
}

export class CollectIncomeUseCase {
  constructor(
    private readonly wallets: WalletRepository,
    private readonly incomeEvents: IncomeEventRepository,
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
    private readonly idGenerator: () => string,
    private readonly logger?: LoggerPort,
    private readonly events?: DomainEventPublisher,
  ) {}

  async execute(
    command: CollectIncomeCommand,
  ): Promise<UseCaseResult<Transaction>> {
    const wallet = await this.wallets.findByPlayerId(command.playerId);
    const incomeEvent = await this.incomeEvents.findById(command.incomeEventId);

    if (!wallet) {
      throw new WalletNotFoundError(command.playerId);
    }

    if (!incomeEvent) {
      throw new IncomeEventNotFoundError(command.incomeEventId);
    }

    if (incomeEvent.isCollected) {
      this.logger?.warn(
        "Income collection blocked because income was already collected",
        {
          module: "income",
          action: "income_collection_blocked_already_collected",
          correlationId: command.correlationId,
          context: {
            playerId: command.playerId,
            incomeEventId: command.incomeEventId,
          },
        },
      );
      throw new IncomeAlreadyCollectedError();
    }

    const balanceBeforeCents = wallet.account.availableBalance.cents;

    wallet.account.credit(incomeEvent.amount);
    incomeEvent.markCollected();

    const occurredAt = this.clock.now();
    const transaction: Transaction = {
      id: this.idGenerator(),
      playerId: command.playerId,
      type: TransactionType.INCOME,
      asset: incomeEvent.asset,
      total: incomeEvent.amount,
      occurredAt,
      balanceAfter: wallet.account.availableBalance,
      metadata: command.correlationId
        ? {
            correlationId: command.correlationId,
            incomeEventId: incomeEvent.id,
          }
        : { incomeEventId: incomeEvent.id },
    };

    try {
      await this.transactions.append(transaction);
      await this.incomeEvents.save(incomeEvent);
      await this.wallets.save(wallet);
    } catch (error) {
      this.logger?.error("Failed to persist income collection", {
        module: "repository",
        action: "income_repository_save_failed",
        correlationId: command.correlationId,
        context: {
          playerId: command.playerId,
          incomeEventId: incomeEvent.id,
          operationId: transaction.id,
        },
        error,
      });
      throw error;
    }

    const events = [
      {
        type: "YieldCollected" as const,
        playerId: command.playerId,
        occurredAt,
        incomeEventId: incomeEvent.id,
        asset: incomeEvent.asset,
        total: incomeEvent.amount,
        transactionId: transaction.id,
      },
    ];

    await this.events?.publishFinancialEvents(events, {
      correlationId: command.correlationId,
      causationId: transaction.id,
    });

    this.logger?.info("Income collected successfully", {
      module: "income",
      action: "income_collected",
      correlationId: command.correlationId,
      context: {
        playerId: command.playerId,
        incomeEventId: incomeEvent.id,
        operationId: transaction.id,
        amountCents: incomeEvent.amount.cents,
        balanceBeforeCents,
        balanceAfterCents: wallet.account.availableBalance.cents,
      },
    });

    return {
      data: transaction,
      events,
    };
  }
}
