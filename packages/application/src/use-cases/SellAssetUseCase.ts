import {
  AssetNotFoundError,
  AssetSymbol,
  FinancialEvent,
  InsufficientPositionError,
  PositionNotFoundError,
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

export interface SellAssetCommand {
  playerId: string;
  symbol: string;
  quantity: number;
  correlationId?: string;
}

export class SellAssetUseCase {
  constructor(
    private readonly assets: AssetRepository,
    private readonly wallets: WalletRepository,
    private readonly prices: MarketPriceProvider,
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
    private readonly idGenerator: () => string,
    private readonly logger?: LoggerPort,
  ) {}

  async execute(
    command: SellAssetCommand,
  ): Promise<UseCaseResult<Transaction>> {
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

    const position = wallet.getPosition(asset.symbol.value);
    if (!position || !position.totalQuantity.isGreaterThanOrEqual(quantity)) {
      this.logger?.warn("Asset sale blocked due to insufficient position", {
        module: "financial_operation",
        action: "asset_sale_blocked_insufficient_position",
        correlationId: command.correlationId,
        context: {
          playerId: command.playerId,
          assetId: asset.id,
          assetSymbol: asset.symbol.value,
          requestedQuantity: quantity.units,
          availableQuantity: position?.totalQuantity.units ?? 0,
        },
      });
      const rejected: FinancialEvent = {
        type: "SellRejectedInsufficientPosition",
        playerId: command.playerId,
        occurredAt: this.clock.now(),
        asset,
        quantity,
        availableQuantity: position?.totalQuantity.units ?? 0,
      };
      throw new InsufficientPositionError([rejected]);
    }

    const price = await this.prices.getCurrentPrice(asset);
    const total = price.unitPrice.multiplyByQuantity(quantity);

    wallet.sell(asset, quantity);
    wallet.account.credit(total);

    const occurredAt = this.clock.now();
    const transaction: Transaction = {
      id: this.idGenerator(),
      type: TransactionType.SELL,
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
      this.logger?.error("Failed to persist asset sale", {
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

    this.logger?.info("Asset sale completed successfully", {
      module: "financial_operation",
      action: "asset_sale_completed",
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
        positionAfter: wallet.getPosition(asset.symbol.value)?.totalQuantity.units ?? 0,
      },
    });

    return {
      data: transaction,
      events: [
        {
          type: "AssetSold",
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
