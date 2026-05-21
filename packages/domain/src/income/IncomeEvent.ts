import type { Asset } from "../assets/Asset.js";
import { IncomeAlreadyCollectedError } from "../errors/FinancialErrors.js";
import type { MoneyCents } from "../money/Money.js";

export class IncomeEvent {
  constructor(
    public readonly id: string,
    public readonly asset: Asset,
    public readonly amount: MoneyCents,
    public readonly occurredAt: Date,
    private collected = false,
  ) {}

  get isCollected(): boolean {
    return this.collected;
  }

  markCollected(): void {
    if (this.collected) {
      throw new IncomeAlreadyCollectedError();
    }

    this.collected = true;
  }
}
