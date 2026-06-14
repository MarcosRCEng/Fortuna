import type {
  FiiDetails,
  FiiDividend,
  TreasuryCatalogPage,
  TreasuryCatalogQuery,
  TreasuryHistory,
  TreasuryHistoryQuery,
  TreasuryIndicator,
} from "@fortuna/domain";

export interface FiiDetailsProvider {
  getFiiDetails(symbol: string): Promise<FiiDetails>;
  getFiiDividends(symbol: string): Promise<FiiDividend[]>;
}

export interface TreasuryMarketProvider {
  listTreasuryBonds(
    query: TreasuryCatalogQuery,
  ): Promise<TreasuryCatalogPage>;
  getTreasuryIndicators(symbols: string[]): Promise<TreasuryIndicator[]>;
  getTreasuryHistory(query: TreasuryHistoryQuery): Promise<TreasuryHistory>;
}
