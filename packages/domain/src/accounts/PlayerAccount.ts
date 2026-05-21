import { InsufficientBalanceError } from "../errors/FinancialErrors.js";
import { MoneyCents } from "../money/Money.js";

export class PlayerAccount {
  constructor(
    public readonly playerId: string,
    private balance: MoneyCents,
  ) {}

  get availableBalance(): MoneyCents {
    return this.balance;
  }

  credit(amount: MoneyCents): void {
    this.balance = this.balance.add(amount);
  }

  debit(amount: MoneyCents): void {
    if (!this.balance.isGreaterThanOrEqual(amount)) {
      throw new InsufficientBalanceError();
    }

    this.balance = this.balance.subtract(amount);
  }
}
