import type { AssetRepository } from "@fortuna/application";
import type { Asset, AssetSymbol } from "@fortuna/domain";
import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";
import { toAsset } from "../prisma/mappers.js";

export class PrismaAssetRepository implements AssetRepository {
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async findBySymbol(symbol: AssetSymbol): Promise<Asset | undefined> {
    const asset = await this.prisma.asset.findUnique({
      where: { symbol: symbol.value },
    });

    return asset ? toAsset(asset) : undefined;
  }

  async listActive(): Promise<Asset[]> {
    const assets = await this.prisma.asset.findMany({
      where: { isActive: true },
      orderBy: { symbol: "asc" },
    });

    return assets.map(toAsset);
  }
}
