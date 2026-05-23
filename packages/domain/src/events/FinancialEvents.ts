import type { Asset } from "../assets/Asset.js";
import type { MoneyCents } from "../money/Money.js";
import type { Quantity } from "../value-objects/Quantity.js";

export interface FinancialEventBase {
  type: string;
  playerId: string;
  occurredAt: Date;
}

export interface AssetBought extends FinancialEventBase {
  type: "AssetBought";
  walletId?: string;
  asset: Asset;
  quantity: Quantity;
  unitPrice: MoneyCents;
  total: MoneyCents;
  transactionId?: string;
}

export interface AssetSold extends FinancialEventBase {
  type: "AssetSold";
  walletId?: string;
  asset: Asset;
  quantity: Quantity;
  unitPrice: MoneyCents;
  total: MoneyCents;
  transactionId?: string;
}

export interface IncomeCollected extends FinancialEventBase {
  type: "IncomeCollected" | "YieldCollected";
  incomeEventId: string;
  asset: Asset;
  total: MoneyCents;
  transactionId?: string;
}

export interface YieldGenerated extends FinancialEventBase {
  type: "YieldGenerated";
  incomeEventId: string;
  asset: Asset;
  total: MoneyCents;
  yieldType: string;
  dueCycle?: number | string;
}

export interface BuyRejectedInsufficientBalance extends FinancialEventBase {
  type: "BuyRejectedInsufficientBalance";
  asset: Asset;
  quantity: Quantity;
  required: MoneyCents;
  available: MoneyCents;
}

export interface SellRejectedInsufficientPosition extends FinancialEventBase {
  type: "SellRejectedInsufficientPosition";
  asset: Asset;
  quantity: Quantity;
  availableQuantity: number;
}

export type FinancialEvent =
  | AssetBought
  | AssetSold
  | IncomeCollected
  | YieldGenerated
  | BuyRejectedInsufficientBalance
  | SellRejectedInsufficientPosition;
