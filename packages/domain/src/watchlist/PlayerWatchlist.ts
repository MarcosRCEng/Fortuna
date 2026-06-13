import type { MarketAssetGroup, MarketAssetType } from "../market/MarketData.js";
import { AssetSymbol } from "../value-objects/AssetSymbol.js";

export type WatchlistSortBy = "position" | "symbol" | "name" | "price" | "changePercent";
export type WatchlistSortOrder = "asc" | "desc";

export const WATCHLIST_VISIBLE_GROUPS: readonly MarketAssetGroup[] = [
  "EQUITIES",
  "REAL_ESTATE_FUNDS",
  "EXCHANGE_TRADED_FUNDS",
  "OTHER_LISTED_FUNDS",
  "FIXED_INCOME",
  "UNKNOWN",
];

export const WATCHLIST_SORT_FIELDS: readonly WatchlistSortBy[] = [
  "position",
  "symbol",
  "name",
  "price",
  "changePercent",
];

export interface PlayerWatchlistPreferences {
  visibleGroups: MarketAssetGroup[];
  portfolioOnly: boolean;
  sortBy: WatchlistSortBy;
  sortOrder: WatchlistSortOrder;
  maxItemsPerGroup?: number;
}

export interface PlayerWatchlistItem {
  id: string;
  symbol: string;
  assetType: MarketAssetType;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_WATCHLIST_PREFERENCES: PlayerWatchlistPreferences = {
  visibleGroups: [
    "EQUITIES",
    "REAL_ESTATE_FUNDS",
    "EXCHANGE_TRADED_FUNDS",
    "FIXED_INCOME",
  ],
  portfolioOnly: false,
  sortBy: "position",
  sortOrder: "asc",
};

export class InvalidWatchlistPreferencesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWatchlistPreferencesError";
  }
}

export class InvalidWatchlistOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidWatchlistOrderError";
  }
}

export class PlayerWatchlist {
  private readonly itemsBySymbol = new Map<string, PlayerWatchlistItem>();

  constructor(
    public readonly id: string,
    public readonly playerId: string,
    items: PlayerWatchlistItem[],
    private preferences: PlayerWatchlistPreferences = DEFAULT_WATCHLIST_PREFERENCES,
    public readonly createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {
    this.preferences = validateWatchlistPreferences(preferences);
    for (const item of items) {
      const normalized = normalizeWatchlistSymbol(item.symbol);
      this.itemsBySymbol.set(normalized, {
        ...item,
        symbol: normalized,
      });
    }
    this.normalizePositions();
  }

  static create(
    input: {
      id: string;
      playerId: string;
      preferences?: Partial<PlayerWatchlistPreferences>;
    },
    now = new Date(),
  ): PlayerWatchlist {
    return new PlayerWatchlist(
      input.id,
      input.playerId,
      [],
      validateWatchlistPreferences(input.preferences),
      now,
      now,
    );
  }

  get items(): PlayerWatchlistItem[] {
    return [...this.itemsBySymbol.values()].sort(
      (left, right) => left.position - right.position,
    );
  }

  get currentPreferences(): PlayerWatchlistPreferences {
    return {
      visibleGroups: [...this.preferences.visibleGroups],
      portfolioOnly: this.preferences.portfolioOnly,
      sortBy: this.preferences.sortBy,
      sortOrder: this.preferences.sortOrder,
      ...(this.preferences.maxItemsPerGroup !== undefined
        ? { maxItemsPerGroup: this.preferences.maxItemsPerGroup }
        : {}),
    };
  }

  addItem(input: {
    id: string;
    symbol: string;
    assetType: MarketAssetType;
    now: Date;
  }): PlayerWatchlistItem {
    const symbol = normalizeWatchlistSymbol(input.symbol);
    const existing = this.itemsBySymbol.get(symbol);
    if (existing) {
      return existing;
    }

    const item: PlayerWatchlistItem = {
      id: input.id,
      symbol,
      assetType: input.assetType,
      position: this.itemsBySymbol.size,
      createdAt: input.now,
      updatedAt: input.now,
    };
    this.itemsBySymbol.set(symbol, item);
    this.updatedAt = input.now;
    return item;
  }

  removeItem(symbol: string, now: Date): boolean {
    const normalized = normalizeWatchlistSymbol(symbol);
    const removed = this.itemsBySymbol.delete(normalized);
    if (removed) {
      this.normalizePositions(now);
      this.updatedAt = now;
    }
    return removed;
  }

  reorder(symbols: string[], now: Date): void {
    const normalizedSymbols = symbols.map(normalizeWatchlistSymbol);
    const uniqueSymbols = new Set(normalizedSymbols);
    const currentSymbols = new Set(this.itemsBySymbol.keys());

    if (
      uniqueSymbols.size !== normalizedSymbols.length ||
      uniqueSymbols.size !== currentSymbols.size ||
      normalizedSymbols.some((symbol) => !currentSymbols.has(symbol))
    ) {
      throw new InvalidWatchlistOrderError(
        "Watchlist order must contain every current symbol exactly once.",
      );
    }

    normalizedSymbols.forEach((symbol, position) => {
      const item = this.itemsBySymbol.get(symbol);
      if (item) {
        item.position = position;
        item.updatedAt = now;
      }
    });
    this.updatedAt = now;
  }

  updatePreferences(
    preferences: Partial<PlayerWatchlistPreferences>,
    now: Date,
  ): void {
    this.preferences = validateWatchlistPreferences({
      ...this.preferences,
      ...preferences,
    });
    this.updatedAt = now;
  }

  private normalizePositions(now?: Date): void {
    this.items.forEach((item, position) => {
      item.position = position;
      if (now) {
        item.updatedAt = now;
      }
    });
  }
}

export function normalizeWatchlistSymbol(symbol: string): string {
  return AssetSymbol.create(symbol).value;
}

export function validateWatchlistPreferences(
  preferences: Partial<PlayerWatchlistPreferences> = {},
): PlayerWatchlistPreferences {
  const visibleGroups =
    preferences.visibleGroups ?? DEFAULT_WATCHLIST_PREFERENCES.visibleGroups;
  if (
    !Array.isArray(visibleGroups) ||
    visibleGroups.length === 0 ||
    visibleGroups.some((group) => !WATCHLIST_VISIBLE_GROUPS.includes(group))
  ) {
    throw new InvalidWatchlistPreferencesError(
      "Watchlist visible groups contain an invalid category.",
    );
  }

  const sortBy = preferences.sortBy ?? DEFAULT_WATCHLIST_PREFERENCES.sortBy;
  if (!WATCHLIST_SORT_FIELDS.includes(sortBy)) {
    throw new InvalidWatchlistPreferencesError(
      "Watchlist sort field is invalid.",
    );
  }

  const sortOrder =
    preferences.sortOrder ?? DEFAULT_WATCHLIST_PREFERENCES.sortOrder;
  if (sortOrder !== "asc" && sortOrder !== "desc") {
    throw new InvalidWatchlistPreferencesError(
      "Watchlist sort order is invalid.",
    );
  }

  if (
    preferences.maxItemsPerGroup !== undefined &&
    (!Number.isSafeInteger(preferences.maxItemsPerGroup) ||
      preferences.maxItemsPerGroup < 1 ||
      preferences.maxItemsPerGroup > 100)
  ) {
    throw new InvalidWatchlistPreferencesError(
      "Watchlist maxItemsPerGroup must be between 1 and 100.",
    );
  }

  return {
    visibleGroups: [...new Set(visibleGroups)],
    portfolioOnly: preferences.portfolioOnly ?? false,
    sortBy,
    sortOrder,
    ...(preferences.maxItemsPerGroup !== undefined
      ? { maxItemsPerGroup: preferences.maxItemsPerGroup }
      : {}),
  };
}
