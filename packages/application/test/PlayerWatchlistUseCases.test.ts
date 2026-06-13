import { describe, expect, it } from "vitest";
import {
  AddWatchlistItemUseCase,
  GetPlayerWatchlistUseCase,
  InMemoryPlayerWatchlistRepository,
  ReorderWatchlistItemsUseCase,
  UpdateWatchlistPreferencesUseCase,
  type AssetRepository,
  type MarketPriceProvider,
  type WalletRepository,
} from "../src/index.js";
import {
  Asset,
  AssetSymbol,
  AssetType,
  MarketPrice,
  MoneyCents,
  RiskLevel,
  type Wallet,
} from "@fortuna/domain";

const now = new Date("2026-06-13T12:00:00.000Z");
const clock = { now: () => now };

class FakeAssets implements AssetRepository {
  private readonly assets = new Map<string, Asset>([
    [
      "ITUB4",
      new Asset(
        "asset-itub4",
        AssetSymbol.create("ITUB4"),
        "Itau Unibanco PN",
        AssetType.STOCK,
        RiskLevel.HIGH,
      ),
    ],
    [
      "FIISF001",
      new Asset(
        "asset-fiisf001",
        AssetSymbol.create("FIISF001"),
        "FII Shopping Fortuna",
        AssetType.FII,
        RiskLevel.MEDIUM,
      ),
    ],
  ]);

  async findBySymbol(symbol: AssetSymbol): Promise<Asset | undefined> {
    return this.assets.get(symbol.value);
  }
}

class FakePrices implements MarketPriceProvider {
  async getCurrentPrice(asset: Asset): Promise<MarketPrice> {
    return new MarketPrice(asset, MoneyCents.fromCents(1234), now);
  }

  async getCurrentPrices(assets: Asset[]): Promise<MarketPrice[]> {
    return Promise.all(assets.map((asset) => this.getCurrentPrice(asset)));
  }
}

class FakeWallets implements WalletRepository {
  async findByPlayerId(_playerId: string): Promise<Wallet | undefined> {
    return undefined;
  }

  async save(_wallet: Wallet): Promise<void> {}
}

describe("PlayerWatchlist use cases", () => {
  it("adds items idempotently and reads enriched persisted data", async () => {
    const repository = new InMemoryPlayerWatchlistRepository();
    let nextId = 0;
    const ids = () => `id-${++nextId}`;

    const add = new AddWatchlistItemUseCase(
      repository,
      new FakeAssets(),
      clock,
      ids,
    );
    await add.execute({ playerId: "player-1", symbol: "itub4" });
    await add.execute({ playerId: "player-1", symbol: "ITUB4" });

    const view = await new GetPlayerWatchlistUseCase(
      repository,
      new FakeAssets(),
      new FakeWallets(),
      new FakePrices(),
      clock,
      ids,
    ).execute("player-1");

    expect(view.items).toHaveLength(1);
    expect(view.items[0]).toMatchObject({
      symbol: "ITUB4",
      name: "Itau Unibanco PN",
      type: "STOCK",
      group: "EQUITIES",
      priceCents: 1234,
      quoteStatus: "AVAILABLE",
    });
  });

  it("reorders and updates preferences", async () => {
    const repository = new InMemoryPlayerWatchlistRepository();
    let nextId = 0;
    const ids = () => `id-${++nextId}`;
    const add = new AddWatchlistItemUseCase(
      repository,
      new FakeAssets(),
      clock,
      ids,
    );
    await add.execute({ playerId: "player-1", symbol: "ITUB4" });
    await add.execute({ playerId: "player-1", symbol: "FIISF001" });

    await new ReorderWatchlistItemsUseCase(repository, clock, ids).execute({
      playerId: "player-1",
      symbols: ["FIISF001", "ITUB4"],
    });
    await new UpdateWatchlistPreferencesUseCase(
      repository,
      clock,
      ids,
    ).execute({
      playerId: "player-1",
      preferences: {
        visibleGroups: ["REAL_ESTATE_FUNDS"],
        sortBy: "position",
        sortOrder: "asc",
      },
    });

    const view = await new GetPlayerWatchlistUseCase(
      repository,
      new FakeAssets(),
      new FakeWallets(),
      new FakePrices(),
      clock,
      ids,
    ).execute("player-1");

    expect(view.items.map((item) => item.symbol)).toEqual(["FIISF001"]);
    expect(view.preferences.visibleGroups).toEqual(["REAL_ESTATE_FUNDS"]);
  });

  it("keeps the item when an individual quote is unavailable", async () => {
    const repository = new InMemoryPlayerWatchlistRepository();
    let nextId = 0;
    const ids = () => `id-${++nextId}`;
    await new AddWatchlistItemUseCase(
      repository,
      new FakeAssets(),
      clock,
      ids,
    ).execute({ playerId: "player-1", symbol: "ITUB4" });

    const failingPrices: MarketPriceProvider = {
      async getCurrentPrice() {
        throw new Error("provider unavailable");
      },
      async getCurrentPrices() {
        throw new Error("provider unavailable");
      },
    };

    const view = await new GetPlayerWatchlistUseCase(
      repository,
      new FakeAssets(),
      new FakeWallets(),
      failingPrices,
      clock,
      ids,
    ).execute("player-1");

    expect(view.items[0]).toMatchObject({
      symbol: "ITUB4",
      quoteStatus: "UNAVAILABLE",
    });
  });
});
