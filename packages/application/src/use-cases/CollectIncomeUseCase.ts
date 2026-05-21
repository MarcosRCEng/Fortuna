import {
  IncomeAlreadyCollectedError,
  IncomeEventNotFoundError,
  Transaction,
  TransactionType,
  WalletNotFoundError,
} from "@fortuna/domain";
import type { Clock } from "../ports/Clock.js";
import type { IncomeEventRepository } from "../ports/IncomeEventRepository.js";
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
      throw new IncomeAlreadyCollectedError();
    }

    wallet.account.credit(incomeEvent.amount);
    incomeEvent.markCollected();

    const occurredAt = this.clock.now();
    const transaction: Transaction = {
      id: this.idGenerator(),
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

    await this.transactions.append(transaction);
    await this.incomeEvents.save(incomeEvent);
    await this.wallets.save(wallet);

    return {
      data: transaction,
      events: [
        {
          type: "IncomeCollected",
          playerId: command.playerId,
          occurredAt,
          incomeEventId: incomeEvent.id,
          asset: incomeEvent.asset,
          total: incomeEvent.amount,
        },
      ],
    };
  }
}
