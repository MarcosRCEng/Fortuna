import { InvalidQuantityError } from "../errors/FinancialErrors.js";

export class Quantity {
  private constructor(public readonly units: number) {}

  static fromUnits(units: number): Quantity {
    if (!Number.isSafeInteger(units)) {
      throw new InvalidQuantityError("Quantity must be a safe integer.");
    }

    if (units <= 0) {
      throw new InvalidQuantityError("Quantity must be positive.");
    }

    return new Quantity(units);
  }

  add(other: Quantity): Quantity {
    return Quantity.fromUnits(this.units + other.units);
  }

  subtract(other: Quantity): Quantity {
    if (other.units > this.units) {
      throw new InvalidQuantityError(
        "Quantity subtraction cannot produce a negative position.",
      );
    }

    return Quantity.fromUnits(this.units - other.units);
  }

  isGreaterThanOrEqual(other: Quantity): boolean {
    return this.units >= other.units;
  }
}
