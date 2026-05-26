import type { PlayerProgress } from "../../gameplay/PlayerProgress.js";

export interface PlayerProgressRepository {
  findByPlayerId(playerId: string): Promise<PlayerProgress | undefined>;
  save(progress: PlayerProgress): Promise<void>;
}
