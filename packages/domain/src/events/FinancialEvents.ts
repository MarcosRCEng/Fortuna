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
  asset: Asset;
  quantity: Quantity;
  total: MoneyCents;
}

export interface AssetSold extends FinancialEventBase {
  type: "AssetSold";
  asset: Asset;
  quantity: Quantity;
  total: MoneyCents;
}

export interface IncomeCollected extends FinancialEventBase {
  type: "IncomeCollected";
  incomeEventId: string;
  asset: Asset;
  total: MoneyCents;
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
  | BuyRejectedInsufficientBalance
  | SellRejectedInsufficientPosition;
