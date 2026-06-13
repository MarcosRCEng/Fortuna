import { BadRequestException, Inject, Injectable, Optional } from "@nestjs/common";
import {
  AddWatchlistItemUseCase,
  GetPlayerWatchlistUseCase,
  InMemoryPlayerWatchlistRepository,
  RemoveWatchlistItemUseCase,
  ReorderWatchlistItemsUseCase,
  UpdateWatchlistPreferencesUseCase,
  type AssetRepository,
  type MarketDataProvider,
  type MarketPriceProvider,
  type PlayerWatchlistRepository,
  type PlayerWatchlistView,
  type WalletRepository,
} from "@fortuna/application";
import {
  Asset,
  AssetSymbol,
  AssetType,
  WATCHLIST_SORT_FIELDS,
  WATCHLIST_VISIBLE_GROUPS,
  type MarketAssetGroup,
  type MarketAssetType,
  type PlayerWatchlistPreferences,
  type WatchlistSortBy,
  type WatchlistSortOrder,
  type Wallet,
  RiskLevel,
} from "@fortuna/domain";
import {
  createMarketDataProvider,
  MvpMarketDataService,
  PinoLogger,
  PrismaAssetRepository,
  PrismaMarketPriceProvider,
  PrismaPlayerWatchlistRepository,
  PrismaWalletRepository,
  toDomainAsset,
} from "@fortuna/infrastructure";
import type { PrismaService } from "../../infra/database/prisma.service.js";
import type {
  AddWatchlistItemRequestDto,
  ParsedWatchlistPreferences,
  ReorderWatchlistItemsRequestDto,
  UpdateWatchlistPreferencesRequestDto,
} from "./watchlist.dto.js";

interface WatchlistApiDependencies {
  watchlists: PlayerWatchlistRepository;
  assets: AssetRepository;
  wallets: WalletRepository;
  prices: MarketPriceProvider;
}

class MarketDataAssetRepository implements AssetRepository {
  constructor(private readonly marketData: MarketDataProvider) {}

  async findBySymbol(symbol: AssetSymbol): Promise<Asset | undefined> {
    const asset = await this.marketData.getAsset(symbol.value);
    return asset ? toDomainAsset(asset) : undefined;
  }
}

class MarketCatalogAssetRepository implements AssetRepository {
  constructor(private readonly catalog: MvpMarketDataService) {}

  async findBySymbol(symbol: AssetSymbol): Promise<Asset | undefined> {
    const page = await this.catalog.getCatalog({
      search: symbol.value,
      page: 1,
      pageSize: 10,
    });
    const item = page.items.find((candidate) => candidate.symbol === symbol.value);
    if (!item || item.type === "UNKNOWN" || item.type === "TREASURY") {
      return undefined;
    }
    return new Asset(
      item.symbol,
      symbol,
      item.name,
      toDomainAssetType(item.type),
      RiskLevel.MEDIUM,
      true,
      item.sector,
    );
  }
}

class FallbackAssetRepository implements AssetRepository {
  constructor(
    private readonly primary: AssetRepository,
    private readonly fallback: AssetRepository,
  ) {}

  async findBySymbol(symbol: AssetSymbol): Promise<Asset | undefined> {
    return (
      (await this.primary.findBySymbol(symbol)) ??
      (await this.fallback.findBySymbol(symbol))
    );
  }
}

class EmptyWalletRepository implements WalletRepository {
  async findByPlayerId(_playerId: string): Promise<Wallet | undefined> {
    return undefined;
  }

  async save(_wallet: Wallet): Promise<void> {}
}

@Injectable()
export class WatchlistApiService {
  static withPrisma(prisma: PrismaService): WatchlistApiService {
    return new WatchlistApiService({
      watchlists: new PrismaPlayerWatchlistRepository(prisma),
      assets: new FallbackAssetRepository(
        new PrismaAssetRepository(prisma),
        new MarketCatalogAssetRepository(
          new MvpMarketDataService({ logger: new PinoLogger() }),
        ),
      ),
      wallets: new PrismaWalletRepository(prisma),
      prices: new PrismaMarketPriceProvider(prisma),
    });
  }

  private readonly clock = { now: () => new Date() };
  private nextId = 0;
  private readonly dependencies: WatchlistApiDependencies;

  constructor(
    @Optional()
    @Inject("WATCHLIST_API_DEPENDENCIES")
    dependencies?: WatchlistApiDependencies,
  ) {
    const marketData = createMarketDataProvider(
      undefined,
      new PinoLogger(),
    ) as MarketDataProvider & MarketPriceProvider;
    this.dependencies =
      dependencies ?? {
        watchlists: new InMemoryPlayerWatchlistRepository(),
        assets: new FallbackAssetRepository(
          new MarketDataAssetRepository(marketData),
          new MarketCatalogAssetRepository(
            new MvpMarketDataService({ logger: new PinoLogger() }),
          ),
        ),
        wallets: new EmptyWalletRepository(),
        prices: marketData,
      };
  }

  get(playerId: string): Promise<PlayerWatchlistView> {
    return new GetPlayerWatchlistUseCase(
      this.dependencies.watchlists,
      this.dependencies.assets,
      this.dependencies.wallets,
      this.dependencies.prices,
      this.clock,
      () => this.newId("watchlist"),
    ).execute(playerId);
  }

  async addItem(
    playerId: string,
    request: AddWatchlistItemRequestDto,
  ): Promise<PlayerWatchlistView> {
    const symbol = this.parseSymbol(request.symbol);
    await new AddWatchlistItemUseCase(
      this.dependencies.watchlists,
      this.dependencies.assets,
      this.clock,
      () => this.newId("watchlist-item"),
    ).execute({ playerId, symbol });
    return this.get(playerId);
  }

  async removeItem(
    playerId: string,
    symbol: string,
  ): Promise<PlayerWatchlistView> {
    await new RemoveWatchlistItemUseCase(
      this.dependencies.watchlists,
      this.clock,
      () => this.newId("watchlist"),
    ).execute({ playerId, symbol });
    return this.get(playerId);
  }

  async reorderItems(
    playerId: string,
    request: ReorderWatchlistItemsRequestDto,
  ): Promise<PlayerWatchlistView> {
    const symbols = this.parseSymbols(request.symbols);
    await new ReorderWatchlistItemsUseCase(
      this.dependencies.watchlists,
      this.clock,
      () => this.newId("watchlist"),
    ).execute({ playerId, symbols });
    return this.get(playerId);
  }

  async updatePreferences(
    playerId: string,
    request: UpdateWatchlistPreferencesRequestDto,
  ): Promise<PlayerWatchlistView> {
    const preferences = this.parsePreferences(request);
    await new UpdateWatchlistPreferencesUseCase(
      this.dependencies.watchlists,
      this.clock,
      () => this.newId("watchlist"),
    ).execute({ playerId, preferences });
    return this.get(playerId);
  }

  private parseSymbol(value: unknown): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException("symbol must be a non-empty string.");
    }
    return AssetSymbol.create(value).value;
  }

  private parseSymbols(value: unknown): string[] {
    if (!Array.isArray(value) || value.length === 0) {
      throw new BadRequestException("symbols must be a non-empty array.");
    }
    return value.map((item) => this.parseSymbol(item));
  }

  private parsePreferences(
    request: UpdateWatchlistPreferencesRequestDto,
  ): ParsedWatchlistPreferences {
    const preferences: ParsedWatchlistPreferences = {};
    if (request.visibleGroups !== undefined) {
      if (
        !Array.isArray(request.visibleGroups) ||
        request.visibleGroups.some(
          (group) =>
            typeof group !== "string" ||
            !WATCHLIST_VISIBLE_GROUPS.includes(group as MarketAssetGroup),
        )
      ) {
        throw new BadRequestException("visibleGroups contains invalid categories.");
      }
      preferences.visibleGroups = request.visibleGroups as MarketAssetGroup[];
    }

    if (request.portfolioOnly !== undefined) {
      if (typeof request.portfolioOnly !== "boolean") {
        throw new BadRequestException("portfolioOnly must be a boolean.");
      }
      preferences.portfolioOnly = request.portfolioOnly;
    }

    if (request.sortBy !== undefined) {
      if (
        typeof request.sortBy !== "string" ||
        !WATCHLIST_SORT_FIELDS.includes(request.sortBy as WatchlistSortBy)
      ) {
        throw new BadRequestException("sortBy is invalid.");
      }
      preferences.sortBy = request.sortBy as WatchlistSortBy;
    }

    if (request.sortOrder !== undefined) {
      if (request.sortOrder !== "asc" && request.sortOrder !== "desc") {
        throw new BadRequestException("sortOrder must be asc or desc.");
      }
      preferences.sortOrder = request.sortOrder as WatchlistSortOrder;
    }

    if (request.maxItemsPerGroup !== undefined) {
      if (
        request.maxItemsPerGroup !== null &&
        (typeof request.maxItemsPerGroup !== "number" ||
          !Number.isSafeInteger(request.maxItemsPerGroup) ||
          request.maxItemsPerGroup < 1 ||
          request.maxItemsPerGroup > 100)
      ) {
        throw new BadRequestException(
          "maxItemsPerGroup must be null or an integer between 1 and 100.",
        );
      }
      preferences.maxItemsPerGroup =
        request.maxItemsPerGroup === null
          ? undefined
          : request.maxItemsPerGroup;
    }

    return preferences;
  }

  private newId(prefix: string): string {
    this.nextId += 1;
    return `${prefix}-${this.nextId}`;
  }
}

function toDomainAssetType(type: MarketAssetType): AssetType {
  if (type === "FII") {
    return AssetType.FII;
  }
  if (type === "TREASURY") {
    return AssetType.TREASURY;
  }
  return AssetType.STOCK;
}
