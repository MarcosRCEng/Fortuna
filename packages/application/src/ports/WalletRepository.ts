import type { Wallet } from "@fortuna/domain";

export interface WalletRepository {
  findByPlayerId(playerId: string): Promise<Wallet | undefined>;
  save(wallet: Wallet): Promise<void>;
}
