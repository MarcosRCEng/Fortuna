import { describe, expect, it } from "vitest";
import {
  InvalidWatchlistOrderError,
  InvalidWatchlistPreferencesError,
  PlayerWatchlist,
} from "../src/index.js";

const now = new Date("2026-06-13T12:00:00.000Z");

describe("PlayerWatchlist", () => {
  it("normalizes symbols and keeps duplicate additions idempotent", () => {
    const watchlist = PlayerWatchlist.create(
      { id: "watchlist-1", playerId: "player-1" },
      now,
    );

    watchlist.addItem({
      id: "item-1",
      symbol: " itub4 ",
      assetType: "STOCK",
      now,
    });
    watchlist.addItem({
      id: "item-2",
      symbol: "ITUB4",
      assetType: "STOCK",
      now,
    });

    expect(watchlist.items).toHaveLength(1);
    expect(watchlist.items[0]).toMatchObject({
      id: "item-1",
      symbol: "ITUB4",
      position: 0,
    });
  });

  it("removes missing items as a consistent no-op", () => {
    const watchlist = PlayerWatchlist.create(
      { id: "watchlist-1", playerId: "player-1" },
      now,
    );

    expect(watchlist.removeItem("ITUB4", now)).toBe(false);
    expect(watchlist.items).toEqual([]);
  });

  it("reorders current symbols and rejects incomplete orders", () => {
    const watchlist = PlayerWatchlist.create(
      { id: "watchlist-1", playerId: "player-1" },
      now,
    );
    watchlist.addItem({
      id: "item-1",
      symbol: "ITUB4",
      assetType: "STOCK",
      now,
    });
    watchlist.addItem({
      id: "item-2",
      symbol: "FIISF001",
      assetType: "FII",
      now,
    });

    watchlist.reorder(["FIISF001", "ITUB4"], now);

    expect(watchlist.items.map((item) => item.symbol)).toEqual([
      "FIISF001",
      "ITUB4",
    ]);
    expect(() => watchlist.reorder(["ITUB4"], now)).toThrow(
      InvalidWatchlistOrderError,
    );
  });

  it("validates preferences", () => {
    const watchlist = PlayerWatchlist.create(
      { id: "watchlist-1", playerId: "player-1" },
      now,
    );

    watchlist.updatePreferences(
      {
        visibleGroups: ["EQUITIES", "REAL_ESTATE_FUNDS"],
        portfolioOnly: true,
        sortBy: "symbol",
        sortOrder: "desc",
        maxItemsPerGroup: 20,
      },
      now,
    );

    expect(watchlist.currentPreferences).toMatchObject({
      visibleGroups: ["EQUITIES", "REAL_ESTATE_FUNDS"],
      portfolioOnly: true,
      sortBy: "symbol",
      sortOrder: "desc",
      maxItemsPerGroup: 20,
    });
    expect(() =>
      watchlist.updatePreferences(
        { visibleGroups: ["NOT_A_GROUP" as never] },
        now,
      ),
    ).toThrow(InvalidWatchlistPreferencesError);
  });

  it("isolates watchlists by player id", () => {
    const first = PlayerWatchlist.create(
      { id: "watchlist-1", playerId: "player-1" },
      now,
    );
    const second = PlayerWatchlist.create(
      { id: "watchlist-2", playerId: "player-2" },
      now,
    );

    first.addItem({
      id: "item-1",
      symbol: "ITUB4",
      assetType: "STOCK",
      now,
    });

    expect(first.items).toHaveLength(1);
    expect(second.items).toHaveLength(0);
  });
});
