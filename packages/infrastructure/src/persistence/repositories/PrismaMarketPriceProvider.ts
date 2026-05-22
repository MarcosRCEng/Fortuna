import type { MarketPriceProvider } from "@fortuna/application";
import type { Asset, MarketPrice } from "@fortuna/domain";
import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";
import { toMarketPrice } from "../prisma/mappers.js";

export class PrismaMarketPriceProvider implements MarketPriceProvider {
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async getCurrentPrice(asset: Asset): Promise<MarketPrice> {
    const price = await this.prisma.marketPrice.findFirstOrThrow({
      where: { assetId: asset.id },
      include: { asset: true },
      orderBy: { referenceDatetime: "desc" },
    });

    return toMarketPrice(price);
  }

  async getCurrentPrices(assets: Asset[]): Promise<MarketPrice[]> {
    const prices = await Promise.all(
      assets.map((asset) => this.getCurrentPrice(asset)),
    );
    return prices;
  }
}
