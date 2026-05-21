import { InvalidMoneyAmountError } from "../errors/FinancialErrors.js";

export class MoneyCents {
  private constructor(public readonly cents: number) {}

  static zero(): MoneyCents {
    return new MoneyCents(0);
  }

  static fromCents(cents: number): MoneyCents {
    if (!Number.isSafeInteger(cents)) {
      throw new InvalidMoneyAmountError("Money cents must be a safe integer.");
    }

    if (cents < 0) {
      throw new InvalidMoneyAmountError("Money cannot be negative.");
    }

    return new MoneyCents(cents);
  }

  add(other: MoneyCents): MoneyCents {
    return MoneyCents.fromCents(this.cents + other.cents);
  }

  subtract(other: MoneyCents): MoneyCents {
    if (other.cents > this.cents) {
      throw new InvalidMoneyAmountError(
        "Money subtraction cannot produce a negative value.",
      );
    }

    return MoneyCents.fromCents(this.cents - other.cents);
  }

  multiplyByQuantity(quantity: { units: number }): MoneyCents {
    return MoneyCents.fromCents(this.cents * quantity.units);
  }

  compareTo(other: MoneyCents): number {
    return this.cents - other.cents;
  }

  isGreaterThanOrEqual(other: MoneyCents): boolean {
    return this.cents >= other.cents;
  }

  formatBRL(): string {
    return `R$ ${(this.cents / 100).toFixed(2)}`;
  }
}

export { MoneyCents as Money };
