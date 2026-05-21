import type { Transaction } from "@fortuna/domain";
import type {
  TransactionHistoryFilter,
  TransactionRepository,
} from "../ports/TransactionRepository.js";

export class GetTransactionHistoryUseCase {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(
    playerId: string,
    filter?: TransactionHistoryFilter,
  ): Promise<Transaction[]> {
    const history = await this.transactions.listByPlayerId(playerId, filter);
    return [...history].sort(
      (left, right) => left.occurredAt.getTime() - right.occurredAt.getTime(),
    );
  }
}
