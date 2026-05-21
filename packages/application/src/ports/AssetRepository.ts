import type { Asset, AssetSymbol } from "@fortuna/domain";

export interface AssetRepository {
  findBySymbol(symbol: AssetSymbol): Promise<Asset | undefined>;
}
