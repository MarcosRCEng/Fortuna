import type { WalletRepository } from "@fortuna/application";
import type { Wallet } from "@fortuna/domain";
import type { FortunaPrismaClient } from "../prisma/PrismaClientFactory.js";
import { toWallet } from "../prisma/mappers.js";

export class PrismaWalletRepository implements WalletRepository {
  constructor(private readonly prisma: FortunaPrismaClient) {}

  async findByPlayerId(playerId: string): Promise<Wallet | undefined> {
    const wallet = await this.prisma.wallet.findUnique({
      where: { playerId },
      include: {
        positions: {
          include: { asset: true },
          orderBy: { asset: { symbol: "asc" } },
        },
      },
    });

    return wallet ? toWallet(wallet) : undefined;
  }

  async save(wallet: Wallet): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalanceCents: wallet.account.availableBalance.cents,
        },
      });

      const activeAssetIds = wallet.positions.map(
        (position) => position.asset.id,
      );

      await tx.position.deleteMany({
        where: {
          walletId: wallet.id,
          assetId: { notIn: activeAssetIds },
        },
      });

      for (const position of wallet.positions) {
        const quantity = position.totalQuantity.units;
        await tx.position.upsert({
          where: {
            playerId_assetId: {
              playerId: wallet.account.playerId,
              assetId: position.asset.id,
            },
          },
          update: {
            quantity,
            averagePriceCents: position.averagePriceCents.cents,
            totalInvestedCents: position.averagePriceCents.cents * quantity,
          },
          create: {
            id: `position-${wallet.account.playerId}-${position.asset.id}`,
            playerId: wallet.account.playerId,
            walletId: wallet.id,
            assetId: position.asset.id,
            quantity,
            averagePriceCents: position.averagePriceCents.cents,
            totalInvestedCents: position.averagePriceCents.cents * quantity,
          },
        });
      }
    });
  }
}
