export interface SellAssetCommand {
  walletId: string;
  symbol: string;
  quantity: number;
  correlationId?: string;
}

export class SellAssetUseCase {
  async execute(_command: SellAssetCommand): Promise<void> {
    throw new Error(
      "SellAssetUseCase is a bootstrap skeleton. Domain rules will validate positions and money invariants; this use case will orchestrate ports and repositories only."
    );
  }
}
