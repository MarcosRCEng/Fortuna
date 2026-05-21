export interface BuyAssetCommand {
  walletId: string;
  symbol: string;
  quantity: number;
  correlationId?: string;
}

export class BuyAssetUseCase {
  async execute(_command: BuyAssetCommand): Promise<void> {
    throw new Error(
      "BuyAssetUseCase is a bootstrap skeleton. Domain rules will validate balance, positions, and money invariants; this use case will orchestrate ports and repositories only."
    );
  }
}
