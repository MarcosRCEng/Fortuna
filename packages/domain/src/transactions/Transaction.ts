import type { Asset } from "../assets/Asset.js";
import type { MoneyCents } from "../money/Money.js";
import type { Quantity } from "../value-objects/Quantity.js";

export enum TransactionType {
  BUY = "BUY",
  SELL = "SELL",
  INCOME = "INCOME",
}

export interface Transaction {
  id: string;
  type: TransactionType;
  asset?: Asset;
  quantity?: Quantity;
  unitPrice?: MoneyCents;
  total: MoneyCents;
  occurredAt: Date;
  balanceAfter: MoneyCents;
  metadata?: Record<string, string>;
}
