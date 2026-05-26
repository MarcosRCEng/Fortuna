import type {
  PlayerProfile,
  PlayerRepository,
} from "@fortuna/application";
import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";

export class PrismaPlayerRepository implements PlayerRepository {
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async findById(playerId: string): Promise<PlayerProfile | undefined> {
    const player = await this.prisma.player.findUnique({
      where: { id: playerId },
    });

    return player
      ? {
          id: player.id,
          name: player.name,
          ...(player.nickname ? { nickname: player.nickname } : {}),
          createdAt: player.createdAt,
        }
      : undefined;
  }

  async list(): Promise<PlayerProfile[]> {
    const players = await this.prisma.player.findMany({
      orderBy: { createdAt: "asc" },
    });

    return players.map((player) => ({
      id: player.id,
      name: player.name,
      ...(player.nickname ? { nickname: player.nickname } : {}),
      createdAt: player.createdAt,
    }));
  }

  async save(player: PlayerProfile): Promise<void> {
    await this.prisma.player.upsert({
      where: { id: player.id },
      update: {
        name: player.name,
        nickname: player.nickname,
      },
      create: {
        id: player.id,
        name: player.name,
        nickname: player.nickname,
        createdAt: player.createdAt,
      },
    });
  }
}
