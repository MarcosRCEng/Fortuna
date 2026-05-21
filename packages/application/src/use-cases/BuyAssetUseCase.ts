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
    await this.transactions.append(transaction);
    await this.wallets.save(wallet);

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
