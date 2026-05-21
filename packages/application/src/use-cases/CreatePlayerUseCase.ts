import { MoneyCents, PlayerAccount, Wallet } from "@fortuna/domain";
import type {
  PlayerProfile,
  PlayerRepository,
} from "../ports/PlayerRepository.js";
import type { WalletRepository } from "../ports/WalletRepository.js";

export interface CreatePlayerCommand {
  id?: string;
  name: string;
  nickname?: string;
  initialBalanceCents?: number;
}

export interface CreatedPlayer {
  player: PlayerProfile;
  wallet: Wallet;
  initialBalance: MoneyCents;
}

export class CreatePlayerUseCase {
  private static readonly DEFAULT_INITIAL_BALANCE_CENTS = 20_000;

  constructor(
    private readonly players: PlayerRepository,
    private readonly wallets: WalletRepository,
    private readonly clock: { now(): Date },
    private readonly idGenerator: () => string,
  ) {}

  async execute(command: CreatePlayerCommand): Promise<CreatedPlayer> {
    const name = command.name.trim();
    const nickname = command.nickname?.trim();

    if (name.length < 1 || name.length > 80) {
      throw new Error("Player name must contain between 1 and 80 characters.");
    }

    if (nickname !== undefined && nickname.length > 80) {
      throw new Error("Player nickname must contain at most 80 characters.");
    }

    const playerId = command.id?.trim() || this.idGenerator();
    if (playerId.length < 1 || playerId.length > 80) {
      throw new Error("Player id must contain between 1 and 80 characters.");
    }

    const initialBalance = MoneyCents.fromCents(
      command.initialBalanceCents ??
        CreatePlayerUseCase.DEFAULT_INITIAL_BALANCE_CENTS,
    );

    const player: PlayerProfile = {
      id: playerId,
      name,
      ...(nickname ? { nickname } : {}),
      createdAt: this.clock.now(),
    };
    const wallet = new Wallet(
      `wallet-${playerId}`,
      new PlayerAccount(playerId, initialBalance),
    );

    await this.players.save(player);
    await this.wallets.save(wallet);

    return {
      player,
      wallet,
      initialBalance,
    };
  }
}
