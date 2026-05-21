import { Money } from "../money/Money.js";

export type TransactionType = "buy" | "sell" | "yield" | "deposit" | "withdrawal";

export interface Transaction {
  id: string;
  type: TransactionType;
  assetId?: string;
  quantity?: number;
  amount: Money;
  occurredAt: Date;
}
