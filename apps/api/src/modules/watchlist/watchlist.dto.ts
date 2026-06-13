import type {
  MarketAssetGroup,
  PlayerWatchlistPreferences,
  WatchlistSortBy,
  WatchlistSortOrder,
} from "@fortuna/domain";

export interface AddWatchlistItemRequestDto {
  symbol?: unknown;
}

export interface ReorderWatchlistItemsRequestDto {
  symbols?: unknown;
}

export interface UpdateWatchlistPreferencesRequestDto {
  visibleGroups?: unknown;
  portfolioOnly?: unknown;
  sortBy?: unknown;
  sortOrder?: unknown;
  maxItemsPerGroup?: unknown;
}

export type ParsedWatchlistPreferences = Partial<PlayerWatchlistPreferences> & {
  visibleGroups?: MarketAssetGroup[];
  sortBy?: WatchlistSortBy;
  sortOrder?: WatchlistSortOrder;
};
