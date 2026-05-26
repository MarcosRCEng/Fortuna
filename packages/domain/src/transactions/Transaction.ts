import type { Asset } from "../assets/Asset.js";
import type { MoneyCents } from "../money/Money.js";
import type { Quantity } from "../value-objects/Quantity.js";

export enum TransactionType {
  BUY = "BUY",
  SELL = "SELL",
  INCOME_COLLECTED = "INCOME_COLLECTED",
  INCOME = "INCOME_COLLECTED",
  INITIAL_DEPOSIT = "INITIAL_DEPOSIT",
  ADJUSTMENT = "ADJUSTMENT",
}

export interface Transaction {
  id: string;
  playerId: string;
  type: TransactionType;
  asset?: Asset;
  quantity?: Quantity;
  unitPrice?: MoneyCents;
  total: MoneyCents;
  occurredAt: Date;
  balanceAfter: MoneyCents;
  metadata?: Record<string, string>;
}
