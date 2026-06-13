import type { PlayerWatchlist } from "@fortuna/domain";

export interface PlayerWatchlistRepository {
  findByPlayerId(playerId: string): Promise<PlayerWatchlist | undefined>;
  save(watchlist: PlayerWatchlist): Promise<void>;
}
