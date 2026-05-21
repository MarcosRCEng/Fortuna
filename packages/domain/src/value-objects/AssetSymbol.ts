import { InvalidAssetSymbolError } from "../errors/FinancialErrors.js";

export class AssetSymbol {
  private constructor(public readonly value: string) {}

  static create(symbol: string): AssetSymbol {
    const normalized = symbol.trim().toUpperCase();

    if (normalized.length < 1 || normalized.length > 12) {
      throw new InvalidAssetSymbolError(
        "Asset symbol must contain between 1 and 12 characters.",
      );
    }

    if (!/^[A-Z0-9.-]+$/.test(normalized)) {
      throw new InvalidAssetSymbolError(
        "Asset symbol contains invalid characters.",
      );
    }

    return new AssetSymbol(normalized);
  }

  equals(other: AssetSymbol): boolean {
    return this.value === other.value;
  }
}
