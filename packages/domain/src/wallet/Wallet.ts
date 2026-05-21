import { Money } from "../money/Money.js";

export type WalletId = string;

export interface WalletSnapshot {
  id: WalletId;
  cash: Money;
}

export class Wallet {
  constructor(
    public readonly id: WalletId,
    public readonly cash: Money
  ) {}
}
