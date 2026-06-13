import {
  PlayerWatchlist,
  type MarketAssetGroup,
  type MarketAssetType,
  type PlayerWatchlistItem,
  type PlayerWatchlistPreferences,
} from "@fortuna/domain";
import type { PlayerWatchlistRepository } from "@fortuna/application";
import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";

type WatchlistRecord = {
  id: string;
  playerId: string;
  visibleGroups: string[];
  portfolioOnly: boolean;
  sortBy: string;
  sortOrder: string;
  maxItemsPerGroup: number | null;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: string;
    symbol: string;
    assetType: string;
    position: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
};

export class PrismaPlayerWatchlistRepository
  implements PlayerWatchlistRepository
{
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async findByPlayerId(
    playerId: string,
  ): Promise<PlayerWatchlist | undefined> {
    const watchlist = await this.prisma.playerWatchlist.findUnique({
      where: { playerId },
      include: { items: { orderBy: { position: "asc" } } },
    });

    return watchlist ? toWatchlist(watchlist) : undefined;
  }

  async save(watchlist: PlayerWatchlist): Promise<void> {
    const preferences = watchlist.currentPreferences;
    const items = watchlist.items;

    await this.prisma.$transaction(async (tx) => {
      await tx.playerWatchlist.upsert({
        where: { playerId: watchlist.playerId },
        update: {
          visibleGroups: preferences.visibleGroups,
          portfolioOnly: preferences.portfolioOnly,
          sortBy: preferences.sortBy,
          sortOrder: preferences.sortOrder,
          maxItemsPerGroup: preferences.maxItemsPerGroup ?? null,
        },
        create: {
          id: watchlist.id,
          playerId: watchlist.playerId,
          visibleGroups: preferences.visibleGroups,
          portfolioOnly: preferences.portfolioOnly,
          sortBy: preferences.sortBy,
          sortOrder: preferences.sortOrder,
          maxItemsPerGroup: preferences.maxItemsPerGroup ?? null,
        },
      });

      await tx.playerWatchlistItem.deleteMany({
        where: {
          watchlistId: watchlist.id,
          symbol: { notIn: items.map((item) => item.symbol) },
        },
      });

      for (const item of items) {
        await tx.playerWatchlistItem.upsert({
          where: {
            watchlistId_symbol: {
              watchlistId: watchlist.id,
              symbol: item.symbol,
            },
          },
          update: {
            assetType: item.assetType,
            position: item.position,
          },
          create: {
            id: item.id,
            watchlistId: watchlist.id,
            symbol: item.symbol,
            assetType: item.assetType,
            position: item.position,
          },
        });
      }
    });
  }
}

function toWatchlist(record: WatchlistRecord): PlayerWatchlist {
  return new PlayerWatchlist(
    record.id,
    record.playerId,
    record.items.map(
      (item): PlayerWatchlistItem => ({
        id: item.id,
        symbol: item.symbol,
        assetType: item.assetType as MarketAssetType,
        position: item.position,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }),
    ),
    {
      visibleGroups: record.visibleGroups as MarketAssetGroup[],
      portfolioOnly: record.portfolioOnly,
      sortBy: record.sortBy as PlayerWatchlistPreferences["sortBy"],
      sortOrder: record.sortOrder as PlayerWatchlistPreferences["sortOrder"],
      ...(record.maxItemsPerGroup !== null
        ? { maxItemsPerGroup: record.maxItemsPerGroup }
        : {}),
    },
    record.createdAt,
    record.updatedAt,
  );
}
