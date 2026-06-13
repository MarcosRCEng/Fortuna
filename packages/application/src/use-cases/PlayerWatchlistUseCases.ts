import {
  AssetNotFoundError,
  AssetSymbol,
  AssetType,
  InvalidWatchlistOrderError,
  InvalidWatchlistPreferencesError,
  OperationRejectedError,
  PlayerWatchlist,
  type MarketAssetGroup,
  type MarketAssetType,
  type PlayerWatchlistPreferences,
} from "@fortuna/domain";
import type { AssetRepository } from "../ports/AssetRepository.js";
import type { Clock } from "../ports/Clock.js";
import type { MarketPriceProvider } from "../ports/MarketPriceProvider.js";
import type { PlayerWatchlistRepository } from "../ports/PlayerWatchlistRepository.js";
import type { WalletRepository } from "../ports/WalletRepository.js";

export type WatchlistQuoteStatus = "AVAILABLE" | "STALE" | "UNAVAILABLE";

export interface WatchlistItemView {
  symbol: string;
  name?: string;
  type: MarketAssetType;
  group: MarketAssetGroup;
  position: number;
  inPortfolio: boolean;
  quantity?: number;
  priceCents?: number;
  changePercent?: number;
  quoteStatus: WatchlistQuoteStatus;
}

export interface PlayerWatchlistView {
  playerId: string;
  preferences: PlayerWatchlistPreferences;
  items: WatchlistItemView[];
  createdAt: string;
  updatedAt: string;
}

export interface AddWatchlistItemCommand {
  playerId: string;
  symbol: string;
}

export interface ReorderWatchlistItemsCommand {
  playerId: string;
  symbols: string[];
}

export interface UpdateWatchlistPreferencesCommand {
  playerId: string;
  preferences: Partial<PlayerWatchlistPreferences>;
}

type IdGenerator = () => string;

export class GetPlayerWatchlistUseCase {
  constructor(
    private readonly watchlists: PlayerWatchlistRepository,
    private readonly assets: AssetRepository,
    private readonly wallets: WalletRepository,
    private readonly prices: MarketPriceProvider,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(playerId: string): Promise<PlayerWatchlistView> {
    const watchlist = await getOrCreateWatchlist(
      this.watchlists,
      playerId,
      this.clock,
      this.idGenerator,
    );
    return enrichWatchlist(
      watchlist,
      this.assets,
      this.wallets,
      this.prices,
    );
  }
}

export class AddWatchlistItemUseCase {
  constructor(
    private readonly watchlists: PlayerWatchlistRepository,
    private readonly assets: AssetRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: AddWatchlistItemCommand): Promise<PlayerWatchlist> {
    const symbol = AssetSymbol.create(command.symbol);
    const asset = await this.assets.findBySymbol(symbol);
    if (!asset || !asset.isActive) {
      throw new AssetNotFoundError(symbol.value);
    }

    const watchlist = await getOrCreateWatchlist(
      this.watchlists,
      command.playerId,
      this.clock,
      this.idGenerator,
    );
    watchlist.addItem({
      id: this.idGenerator(),
      symbol: symbol.value,
      assetType: toMarketAssetType(asset.type),
      now: this.clock.now(),
    });
    await this.watchlists.save(watchlist);
    return watchlist;
  }
}

export class RemoveWatchlistItemUseCase {
  constructor(
    private readonly watchlists: PlayerWatchlistRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: AddWatchlistItemCommand): Promise<PlayerWatchlist> {
    const symbol = AssetSymbol.create(command.symbol);
    const watchlist = await getOrCreateWatchlist(
      this.watchlists,
      command.playerId,
      this.clock,
      this.idGenerator,
    );
    const removed = watchlist.removeItem(symbol.value, this.clock.now());
    if (removed) {
      await this.watchlists.save(watchlist);
    }
    return watchlist;
  }
}

export class ReorderWatchlistItemsUseCase {
  constructor(
    private readonly watchlists: PlayerWatchlistRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(command: ReorderWatchlistItemsCommand): Promise<PlayerWatchlist> {
    const watchlist = await getOrCreateWatchlist(
      this.watchlists,
      command.playerId,
      this.clock,
      this.idGenerator,
    );
    try {
      watchlist.reorder(command.symbols, this.clock.now());
    } catch (error) {
      if (error instanceof InvalidWatchlistOrderError) {
        throw new OperationRejectedError(
          error.message,
          "INVALID_WATCHLIST_ORDER",
        );
      }
      throw error;
    }
    await this.watchlists.save(watchlist);
    return watchlist;
  }
}

export class UpdateWatchlistPreferencesUseCase {
  constructor(
    private readonly watchlists: PlayerWatchlistRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
  ) {}

  async execute(
    command: UpdateWatchlistPreferencesCommand,
  ): Promise<PlayerWatchlist> {
    const watchlist = await getOrCreateWatchlist(
      this.watchlists,
      command.playerId,
      this.clock,
      this.idGenerator,
    );
    try {
      watchlist.updatePreferences(command.preferences, this.clock.now());
    } catch (error) {
      if (error instanceof InvalidWatchlistPreferencesError) {
        throw new OperationRejectedError(
          error.message,
          "INVALID_WATCHLIST_PREFERENCES",
        );
      }
      throw error;
    }
    await this.watchlists.save(watchlist);
    return watchlist;
  }
}

async function getOrCreateWatchlist(
  watchlists: PlayerWatchlistRepository,
  playerId: string,
  clock: Clock,
  idGenerator: IdGenerator,
): Promise<PlayerWatchlist> {
  const existing = await watchlists.findByPlayerId(playerId);
  if (existing) {
    return existing;
  }

  const now = clock.now();
  const created = PlayerWatchlist.create(
    {
      id: idGenerator(),
      playerId,
    },
    now,
  );
  await watchlists.save(created);
  return created;
}

async function enrichWatchlist(
  watchlist: PlayerWatchlist,
  assets: AssetRepository,
  wallets: WalletRepository,
  prices: MarketPriceProvider,
): Promise<PlayerWatchlistView> {
  const wallet = await wallets.findByPlayerId(watchlist.playerId);
  const items = await Promise.all(
    watchlist.items.map(async (item): Promise<WatchlistItemView> => {
      const asset = await assets.findBySymbol(AssetSymbol.create(item.symbol));
      const position = wallet?.getPosition(item.symbol);
      let priceCents: number | undefined;
      let quoteStatus: WatchlistQuoteStatus = "UNAVAILABLE";

      if (asset) {
        try {
          const price = await prices.getCurrentPrice(asset);
          priceCents = price.unitPrice.cents;
          quoteStatus = price.metadata.marketPriceIsDelayed
            ? "STALE"
            : "AVAILABLE";
        } catch {
          quoteStatus = "UNAVAILABLE";
        }
      }

      const type = asset ? toMarketAssetType(asset.type) : item.assetType;
      return {
        symbol: item.symbol,
        ...(asset ? { name: asset.name } : {}),
        type,
        group: toMarketAssetGroup(type),
        position: item.position,
        inPortfolio: Boolean(position),
        ...(position ? { quantity: position.totalQuantity.units } : {}),
        ...(priceCents !== undefined ? { priceCents } : {}),
        quoteStatus,
      };
    }),
  );

  return {
    playerId: watchlist.playerId,
    preferences: watchlist.currentPreferences,
    items: applyViewPreferences(items, watchlist.currentPreferences),
    createdAt: watchlist.createdAt.toISOString(),
    updatedAt: watchlist.updatedAt.toISOString(),
  };
}

function applyViewPreferences(
  items: WatchlistItemView[],
  preferences: PlayerWatchlistPreferences,
): WatchlistItemView[] {
  const filtered = items.filter(
    (item) =>
      preferences.visibleGroups.includes(item.group) &&
      (!preferences.portfolioOnly || item.inPortfolio),
  );
  const sorted = [...filtered].sort((left, right) => {
    const direction = preferences.sortOrder === "asc" ? 1 : -1;
    if (preferences.sortBy === "position") {
      return (left.position - right.position) * direction;
    }
    const leftValue = sortableValue(left, preferences.sortBy);
    const rightValue = sortableValue(right, preferences.sortBy);
    if (leftValue < rightValue) {
      return -1 * direction;
    }
    if (leftValue > rightValue) {
      return 1 * direction;
    }
    return left.position - right.position;
  });

  if (!preferences.maxItemsPerGroup) {
    return sorted;
  }

  const countByGroup = new Map<MarketAssetGroup, number>();
  return sorted.filter((item) => {
    const current = countByGroup.get(item.group) ?? 0;
    if (current >= preferences.maxItemsPerGroup!) {
      return false;
    }
    countByGroup.set(item.group, current + 1);
    return true;
  });
}

function sortableValue(
  item: WatchlistItemView,
  sortBy: PlayerWatchlistPreferences["sortBy"],
): string | number {
  if (sortBy === "symbol") {
    return item.symbol;
  }
  if (sortBy === "name") {
    return item.name ?? item.symbol;
  }
  if (sortBy === "price") {
    return item.priceCents ?? -1;
  }
  if (sortBy === "changePercent") {
    return item.changePercent ?? -Infinity;
  }
  return item.position;
}

export function toMarketAssetType(assetType: AssetType | string): MarketAssetType {
  if (assetType === AssetType.STOCK || assetType === "STOCK") {
    return "STOCK";
  }
  if (assetType === AssetType.FII || assetType === "FII") {
    return "FII";
  }
  if (assetType === AssetType.TREASURY || assetType === "TREASURY") {
    return "TREASURY";
  }
  if (assetType === AssetType.FIXED_INCOME || assetType === "FIXED_INCOME") {
    return "TREASURY";
  }
  if (assetType === "ETF") {
    return "ETF";
  }
  return "UNKNOWN";
}

export function toMarketAssetGroup(type: MarketAssetType): MarketAssetGroup {
  if (type === "STOCK" || type === "UNIT" || type === "BDR") {
    return "EQUITIES";
  }
  if (type === "FII") {
    return "REAL_ESTATE_FUNDS";
  }
  if (type === "ETF") {
    return "EXCHANGE_TRADED_FUNDS";
  }
  if (type === "FI_INFRA" || type === "FI_AGRO" || type === "FIP" || type === "FIDC") {
    return "OTHER_LISTED_FUNDS";
  }
  if (type === "TREASURY") {
    return "FIXED_INCOME";
  }
  return "UNKNOWN";
}
