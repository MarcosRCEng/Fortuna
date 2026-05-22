import type {
  AssetHistoryPoint,
  MarketDataProvider,
} from "../ports/MarketDataProvider.js";

export interface GetAssetHistoryQuery {
  symbol: string;
  from: Date;
  to: Date;
}

export class GetAssetHistoryUseCase {
  constructor(private readonly marketData: MarketDataProvider) {}

  execute(query: GetAssetHistoryQuery): Promise<AssetHistoryPoint[]> {
    return this.marketData.getPriceHistory(query);
  }
}
