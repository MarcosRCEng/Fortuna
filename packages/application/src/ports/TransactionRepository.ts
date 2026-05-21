import type { Transaction, TransactionType } from "@fortuna/domain";

export interface TransactionHistoryFilter {
  type?: TransactionType;
  assetSymbol?: string;
}

export interface TransactionRepository {
  append(transaction: Transaction): Promise<void>;
  listByPlayerId(
    playerId: string,
    filter?: TransactionHistoryFilter,
  ): Promise<Transaction[]>;
}
