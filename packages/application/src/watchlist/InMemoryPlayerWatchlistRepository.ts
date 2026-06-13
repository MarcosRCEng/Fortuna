import type { PlayerWatchlistRepository } from "../ports/PlayerWatchlistRepository.js";
import type { PlayerWatchlist } from "@fortuna/domain";

export class InMemoryPlayerWatchlistRepository
  implements PlayerWatchlistRepository
{
  private readonly watchlistsByPlayerId = new Map<string, PlayerWatchlist>();

  async findByPlayerId(
    playerId: string,
  ): Promise<PlayerWatchlist | undefined> {
    return this.watchlistsByPlayerId.get(playerId);
  }

  async save(watchlist: PlayerWatchlist): Promise<void> {
    this.watchlistsByPlayerId.set(watchlist.playerId, watchlist);
  }
}
