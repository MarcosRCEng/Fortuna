import type { FinancialEvent } from "../events/FinancialEvents.js";

export class OperationRejectedError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly events: FinancialEvent[] = [],
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class InsufficientBalanceError extends OperationRejectedError {
  constructor(events: FinancialEvent[] = []) {
    super(
      "Insufficient balance to complete the operation.",
      "INSUFFICIENT_BALANCE",
      events,
    );
  }
}

export class InsufficientPositionError extends OperationRejectedError {
  constructor(events: FinancialEvent[] = []) {
    super(
      "Insufficient position to complete the operation.",
      "INSUFFICIENT_POSITION",
      events,
    );
  }
}

export class InvalidMoneyAmountError extends OperationRejectedError {
  constructor(message = "Invalid money amount.") {
    super(message, "INVALID_MONEY_AMOUNT");
  }
}

export class InvalidQuantityError extends OperationRejectedError {
  constructor(message = "Invalid quantity.") {
    super(message, "INVALID_QUANTITY");
  }
}

export class InvalidAssetSymbolError extends OperationRejectedError {
  constructor(message = "Invalid asset symbol.") {
    super(message, "INVALID_ASSET_SYMBOL");
  }
}

export class AssetNotFoundError extends OperationRejectedError {
  constructor(symbol: string) {
    super(`Asset not found: ${symbol}.`, "ASSET_NOT_FOUND");
  }
}

export class WalletNotFoundError extends OperationRejectedError {
  constructor(playerId: string) {
    super(`Wallet not found for player: ${playerId}.`, "WALLET_NOT_FOUND");
  }
}

export class PositionNotFoundError extends OperationRejectedError {
  constructor(symbol: string) {
    super(`Position not found: ${symbol}.`, "POSITION_NOT_FOUND");
  }
}

export class IncomeEventNotFoundError extends OperationRejectedError {
  constructor(incomeEventId: string) {
    super(
      `Income event not found: ${incomeEventId}.`,
      "INCOME_EVENT_NOT_FOUND",
    );
  }
}

export class IncomeAlreadyCollectedError extends OperationRejectedError {
  constructor(events: FinancialEvent[] = []) {
    super(
      "Income event has already been collected.",
      "INCOME_ALREADY_COLLECTED",
      events,
    );
  }
}

export class InvalidMarketPriceError extends OperationRejectedError {
  constructor(message = "Invalid market price.") {
    super(message, "INVALID_MARKET_PRICE");
  }
}
