import { WalletNotFoundError, type AllocationValue } from "@fortuna/domain";
import type { MarketPriceProvider } from "../ports/MarketPriceProvider.js";
import type { WalletRepository } from "../ports/WalletRepository.js";

export class GetPortfolioAllocationUseCase {
  constructor(
    private readonly wallets: WalletRepository,
    private readonly prices: MarketPriceProvider,
  ) {}

  async execute(playerId: string): Promise<AllocationValue[]> {
    const wallet = await this.wallets.findByPlayerId(playerId);
    if (!wallet) {
      throw new WalletNotFoundError(playerId);
    }

    const marketPrices = await this.prices.getCurrentPrices(
      wallet.positions.map((position) => position.asset),
    );
    return wallet.allocationByAssetType(marketPrices);
  }
}
