import type {
  Asset,
  EducationalAssetInfo,
  MarketDataProvider,
} from "../ports/MarketDataProvider.js";

export interface AssetDetails {
  asset: Asset;
  educationalInfo: EducationalAssetInfo;
}

export class GetAssetDetailsUseCase {
  constructor(private readonly marketData: MarketDataProvider) {}

  async execute(symbol: string): Promise<AssetDetails | undefined> {
    const [asset, educationalInfo] = await Promise.all([
      this.marketData.getAsset(symbol),
      this.marketData.getEducationalInfo(symbol),
    ]);

    if (!asset || !educationalInfo) {
      return undefined;
    }

    return { asset, educationalInfo };
  }
}
