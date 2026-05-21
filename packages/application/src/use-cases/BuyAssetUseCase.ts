import {
  AssetNotFoundError,
  AssetSymbol,
  FinancialEvent,
  InsufficientBalanceError,
  InvalidMarketPriceError,
  MoneyCents,
  Quantity,
  Transaction,
  TransactionType,
  WalletNotFoundError,
} from "@fortuna/domain";
import type { AssetRepository } from "../ports/AssetRepository.js";
import type { Clock } from "../ports/Clock.js";
import type { LoggerPort } from "../ports/LoggerPort.js";
import type { MarketPriceProvider } from "../ports/MarketPriceProvider.js";
import type { TransactionRepository } from "../ports/TransactionRepository.js";
import type { WalletRepository } from "../ports/WalletRepository.js";
import type { UseCaseResult } from "./UseCaseResult.js";

export interface BuyAssetCommand {
  playerId: string;
  symbol: string;
  quantity: number;
  correlationId?: string;
}

export class BuyAssetUseCase {
  constructor(
    private readonly assets: AssetRepository,
    private readonly wallets: WalletRepository,
    private readonly prices: MarketPriceProvider,
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
    private readonly idGenerator: () => string,
    private readonly logger?: LoggerPort,
  ) {}

  async execute(command: BuyAssetCommand): Promise<UseCaseResult<Transaction>> {
    const symbol = AssetSymbol.create(command.symbol);
    const quantity = Quantity.fromUnits(command.quantity);
    const asset = await this.assets.findBySymbol(symbol);
    if (!asset) {
      throw new AssetNotFoundError(symbol.value);
    }

    const wallet = await this.wallets.findByPlayerId(command.playerId);
    if (!wallet) {
      throw new WalletNotFoundError(command.playerId);
    }

    const price = await this.prices.getCurrentPrice(asset);
    if (!price.unitPrice.isGreaterThanOrEqual(MoneyCents.fromCents(1))) {
      throw new InvalidMarketPriceError();
    }

    const total = price.unitPrice.multiplyByQuantity(quantity);
    if (!wallet.account.availableBalance.isGreaterThanOrEqual(total)) {
      this.logger?.warn("Asset purchase blocked due to insufficient balance", {
        module: "financial_operation",
        action: "asset_purchase_blocked_insufficient_balance",
        correlationId: command.correlationId,
        context: {
          playerId: command.playerId,
          assetId: asset.id,
          assetSymbol: asset.symbol.value,
          requestedAmountCents: total.cents,
          availableBalanceCents: wallet.account.availableBalance.cents,
        },
      });
      const rejected: FinancialEvent = {
        type: "BuyRejectedInsufficientBalance",
        playerId: command.playerId,
        occurredAt: this.clock.now(),
        asset,
        quantity,
        required: total,
        available: wallet.account.availableBalance,
      };
      throw new InsufficientBalanceError([rejected]);
    }

    wallet.account.debit(total);
    wallet.buy(asset, quantity, price.unitPrice);

    const occurredAt = this.clock.now();
    const transaction: Transaction = {
      id: this.idGenerator(),
      playerId: command.playerId,
      type: TransactionType.BUY,
      asset,
      quantity,
      unitPrice: price.unitPrice,
      total,
      occurredAt,
      balanceAfter: wallet.account.availableBalance,
      metadata: command.correlationId
        ? { correlationId: command.correlationId }
        : undefined,
    };
    try {
      await this.transactions.append(transaction);
      await this.wallets.save(wallet);
    } catch (error) {
      this.logger?.error("Failed to persist asset purchase", {
        module: "repository",
        action: "player_repository_save_failed",
        correlationId: command.correlationId,
        context: {
          playerId: command.playerId,
          assetId: asset.id,
          assetSymbol: asset.symbol.value,
          operationId: transaction.id,
        },
        error,
      });
      throw error;
    }

    this.logger?.info("Asset purchase completed successfully", {
      module: "financial_operation",
      action: "asset_purchase_completed",
      correlationId: command.correlationId,
      context: {
        playerId: command.playerId,
        assetId: asset.id,
        assetSymbol: asset.symbol.value,
        operationId: transaction.id,
        quantity: quantity.units,
        unitPriceCents: price.unitPrice.cents,
        totalAmountCents: total.cents,
        balanceAfterCents: wallet.account.availableBalance.cents,
      },
    });

    return {
      data: transaction,
      events: [
        {
          type: "AssetBought",
          playerId: command.playerId,
          occurredAt,
          asset,
          quantity,
          total,
        },
      ],
    };
  }
}
