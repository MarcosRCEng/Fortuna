import type { AllocationValue } from "../wallet/Wallet.js";
import type { MoneyCents } from "../money/Money.js";
import type { Asset } from "../assets/Asset.js";
import type { Quantity } from "../value-objects/Quantity.js";

export interface PositionSnapshot {
  asset: Asset;
  quantity: Quantity;
  averagePrice: MoneyCents;
  marketValue: MoneyCents;
}

export interface PortfolioSnapshot {
  totalEquity: MoneyCents;
  cash: MoneyCents;
  investedValue: MoneyCents;
  positions: PositionSnapshot[];
  allocation: AllocationValue[];
  capturedAt: Date;
}
