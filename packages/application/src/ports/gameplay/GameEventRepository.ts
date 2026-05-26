import type { GameEvent } from "@fortuna/domain";

export interface GameEventRepository {
  append(event: GameEvent): Promise<void>;
  appendMany(events: GameEvent[]): Promise<void>;
  listByPlayerId(playerId: string): Promise<GameEvent[]>;
}
