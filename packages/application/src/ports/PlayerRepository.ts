export interface PlayerProfile {
  id: string;
  name: string;
  nickname?: string;
  createdAt: Date;
}

export interface PlayerRepository {
  findById(playerId: string): Promise<PlayerProfile | undefined>;
  save(player: PlayerProfile): Promise<void>;
}
