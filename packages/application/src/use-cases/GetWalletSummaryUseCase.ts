import { MoneyCents, type Quantity } from "@fortuna/domain";
import type { MarketPriceProvider } from "../ports/MarketPriceProvider.js";
import type { WalletRepository } from "../ports/WalletRepository.js";

export interface WalletPositionSummary {
  symbol: string;
  name: string;
  quantity: Quantity;
  averagePrice: MoneyCents;
  marketValue: MoneyCents;
}

export interface WalletSummary {
  availableBalance: MoneyCents;
  investedValue: MoneyCents;
  totalEquity: MoneyCents;
  positionCount: number;
  positions: WalletPositionSummary[];
}

export class GetWalletSummaryUseCase {
  constructor(
    private readonly wallets: WalletRepository,
    private readonly prices: MarketPriceProvider,
  ) {}

  async execute(playerId: string): Promise<WalletSummary> {
    const wallet = await this.wallets.findByPlayerId(playerId);
    if (!wallet) {
      throw new Error("Wallet not found.");
    }

    const marketPrices = await this.prices.getCurrentPrices(
      wallet.positions.map((position) => position.asset),
    );
    const investedValue = wallet.investedValue(marketPrices);

    return {
      availableBalance: wallet.account.availableBalance,
      investedValue,
      totalEquity: wallet.account.availableBalance.add(investedValue),
      positionCount: wallet.positions.length,
      positions: wallet.positions.map((position) => {
        const price = marketPrices.find((item) =>
          item.asset.symbol.equals(position.asset.symbol),
        );
        return {
          symbol: position.asset.symbol.value,
          name: position.asset.name,
          quantity: position.totalQuantity,
          averagePrice: position.averagePriceCents,
          marketValue: price
            ? position.marketValue(price.unitPrice)
            : MoneyCents.zero(),
        };
      }),
    };
  }
}
