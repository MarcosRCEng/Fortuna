import { BadRequestException, Injectable } from "@nestjs/common";
import {
  BuyAssetUseCase,
  CollectIncomeUseCase,
  CreatePlayerUseCase,
  GetTransactionHistoryUseCase,
  GetWalletSummaryUseCase,
  SellAssetUseCase,
  type AssetRepository,
  type IncomeEventRepository,
  type MarketPriceProvider,
  type PlayerProfile,
  type PlayerRepository,
  type TransactionHistoryFilter,
  type TransactionRepository,
  type WalletRepository,
} from "@fortuna/application";
import {
  Asset,
  AssetSymbol,
  AssetType,
  IncomeEvent,
  MarketPrice,
  MoneyCents,
  RiskLevel,
  Transaction,
  TransactionType,
  Wallet,
} from "@fortuna/domain";
import {
  AssetResponseDto,
  CreatePlayerRequestDto,
  MarketQuoteResponseDto,
  PlayerResponseDto,
  TradeAssetRequestDto,
  TransactionResponseDto,
  WalletSummaryResponseDto,
} from "./player.dto.js";

class InMemoryPlayerRepository implements PlayerRepository {
  private readonly players = new Map<string, PlayerProfile>();

  async findById(playerId: string): Promise<PlayerProfile | undefined> {
    return this.players.get(playerId);
  }

  async save(player: PlayerProfile): Promise<void> {
    this.players.set(player.id, player);
  }
}

class InMemoryWalletRepository implements WalletRepository {
  private readonly walletsByPlayerId = new Map<string, Wallet>();

  async findByPlayerId(playerId: string): Promise<Wallet | undefined> {
    return this.walletsByPlayerId.get(playerId);
  }

  async save(wallet: Wallet): Promise<void> {
    this.walletsByPlayerId.set(wallet.account.playerId, wallet);
  }
}

class InMemoryAssetRepository implements AssetRepository {
  constructor(private readonly assets: Asset[]) {}

  async findBySymbol(symbol: AssetSymbol): Promise<Asset | undefined> {
    return this.assets.find((asset) => asset.symbol.equals(symbol));
  }

  list(): Asset[] {
    return [...this.assets];
  }
}

class InMemoryTransactionRepository implements TransactionRepository {
  private readonly transactionsByPlayerId = new Map<string, Transaction[]>();

  async append(transaction: Transaction): Promise<void> {
    const current = this.transactionsByPlayerId.get(transaction.playerId) ?? [];
    current.push(transaction);
    this.transactionsByPlayerId.set(transaction.playerId, current);
  }

  async listByPlayerId(
    playerId: string,
    filter?: TransactionHistoryFilter,
  ): Promise<Transaction[]> {
    return (this.transactionsByPlayerId.get(playerId) ?? []).filter(
      (transaction) => {
        if (filter?.type && transaction.type !== filter.type) {
          return false;
        }

        if (
          filter?.assetSymbol &&
          transaction.asset?.symbol.value !== filter.assetSymbol
        ) {
          return false;
        }

        return true;
      },
    );
  }
}

class InMemoryIncomeEventRepository implements IncomeEventRepository {
  private readonly incomeEvents = new Map<string, IncomeEvent>();

  constructor(incomeEvents: IncomeEvent[]) {
    for (const incomeEvent of incomeEvents) {
      this.incomeEvents.set(incomeEvent.id, incomeEvent);
    }
  }

  async findById(id: string): Promise<IncomeEvent | undefined> {
    return this.incomeEvents.get(id);
  }

  async save(incomeEvent: IncomeEvent): Promise<void> {
    this.incomeEvents.set(incomeEvent.id, incomeEvent);
  }
}

class StaticMarketPriceProvider implements MarketPriceProvider {
  constructor(private readonly pricesBySymbol: Record<string, number>) {}

  async getCurrentPrice(asset: Asset): Promise<MarketPrice> {
    return new MarketPrice(
      asset,
      MoneyCents.fromCents(this.pricesBySymbol[asset.symbol.value] ?? 1000),
      new Date(),
    );
  }

  async getCurrentPrices(assets: Asset[]): Promise<MarketPrice[]> {
    return Promise.all(assets.map((asset) => this.getCurrentPrice(asset)));
  }
}

@Injectable()
export class PlayerApiService {
  private readonly assets = new InMemoryAssetRepository([
    new Asset(
      "asset-fort3",
      AssetSymbol.create("FORT3"),
      "Fortuna Educacao ON",
      AssetType.STOCK,
      RiskLevel.HIGH,
    ),
    new Asset(
      "asset-tesouro",
      AssetSymbol.create("TESOURO"),
      "Tesouro Fortuna Selic",
      AssetType.TREASURY,
      RiskLevel.LOW,
    ),
  ]);
  private readonly wallets = new InMemoryWalletRepository();
  private readonly players = new InMemoryPlayerRepository();
  private readonly prices = new StaticMarketPriceProvider({
    FORT3: 1234,
    TESOURO: 10000,
  });
  private readonly transactions = new InMemoryTransactionRepository();
  private readonly incomeEvents = new InMemoryIncomeEventRepository([
    new IncomeEvent(
      "income-001",
      this.assets.list()[0],
      MoneyCents.fromCents(250),
      new Date("2026-05-21T12:00:00.000Z"),
    ),
  ]);
  private nextId = 0;

  async createPlayer(
    request: CreatePlayerRequestDto,
  ): Promise<PlayerResponseDto> {
    this.assertString(request.name, "name");
    if (request.nickname !== undefined) {
      this.assertString(request.nickname, "nickname");
    }
    if (request.initialBalanceCents !== undefined) {
      this.assertSafeInteger(
        request.initialBalanceCents,
        "initialBalanceCents",
      );
    }

    const useCase = new CreatePlayerUseCase(
      this.players,
      this.wallets,
      { now: () => new Date() },
      () => `player-${++this.nextId}`,
    );
    const result = await useCase.execute(request);

    return {
      id: result.player.id,
      name: result.player.name,
      nickname: result.player.nickname,
      initialBalanceCents: result.initialBalance.cents,
      createdAt: result.player.createdAt.toISOString(),
    };
  }

  async buyAsset(
    playerId: string,
    request: TradeAssetRequestDto,
  ): Promise<TransactionResponseDto> {
    this.assertTradeRequest(request);
    const useCase = new BuyAssetUseCase(
      this.assets,
      this.wallets,
      this.prices,
      this.transactions,
      { now: () => new Date() },
      () => `tx-${++this.nextId}`,
    );
    const result = await useCase.execute({
      playerId,
      symbol: request.symbol,
      quantity: request.quantity,
      correlationId: `api-${this.nextId}`,
    });

    return this.toTransactionResponse(result.data);
  }

  async sellAsset(
    playerId: string,
    request: TradeAssetRequestDto,
  ): Promise<TransactionResponseDto> {
    this.assertTradeRequest(request);
    const useCase = new SellAssetUseCase(
      this.assets,
      this.wallets,
      this.prices,
      this.transactions,
      { now: () => new Date() },
      () => `tx-${++this.nextId}`,
    );
    const result = await useCase.execute({
      playerId,
      symbol: request.symbol,
      quantity: request.quantity,
      correlationId: `api-${this.nextId}`,
    });

    return this.toTransactionResponse(result.data);
  }

  async collectIncome(
    playerId: string,
    incomeEventId: string,
  ): Promise<TransactionResponseDto> {
    const useCase = new CollectIncomeUseCase(
      this.wallets,
      this.incomeEvents,
      this.transactions,
      { now: () => new Date() },
      () => `tx-${++this.nextId}`,
    );
    const result = await useCase.execute({
      playerId,
      incomeEventId,
      correlationId: `api-${this.nextId}`,
    });

    return this.toTransactionResponse(result.data);
  }

  async getWallet(playerId: string): Promise<WalletSummaryResponseDto> {
    const summary = await new GetWalletSummaryUseCase(
      this.wallets,
      this.prices,
    ).execute(playerId);

    return {
      availableBalanceCents: summary.availableBalance.cents,
      investedValueCents: summary.investedValue.cents,
      totalEquityCents: summary.totalEquity.cents,
      positionCount: summary.positionCount,
      positions: summary.positions.map((position) => ({
        symbol: position.symbol,
        name: position.name,
        quantity: position.quantity.units,
        averagePriceCents: position.averagePrice.cents,
        marketValueCents: position.marketValue.cents,
      })),
    };
  }

  async getTransactions(playerId: string): Promise<TransactionResponseDto[]> {
    const transactions = await new GetTransactionHistoryUseCase(
      this.transactions,
    ).execute(playerId);
    return transactions.map((transaction) =>
      this.toTransactionResponse(transaction),
    );
  }

  listAssets(): AssetResponseDto[] {
    return this.assets.list().map((asset) => ({
      id: asset.id,
      symbol: asset.symbol.value,
      name: asset.name,
      type: asset.type,
      riskLevel: asset.riskLevel,
      isActive: asset.isActive,
    }));
  }

  async getQuote(symbol: string): Promise<MarketQuoteResponseDto> {
    const asset = await this.assets.findBySymbol(AssetSymbol.create(symbol));
    if (!asset) {
      throw new BadRequestException("Asset symbol is not available.");
    }

    const price = await this.prices.getCurrentPrice(asset);
    return {
      symbol: asset.symbol.value,
      priceCents: price.unitPrice.cents,
      asOf: price.asOf.toISOString(),
      provider: "mock",
    };
  }

  private toTransactionResponse(
    transaction: Transaction,
  ): TransactionResponseDto {
    return {
      id: transaction.id,
      type: transaction.type,
      symbol: transaction.asset?.symbol.value,
      quantity: transaction.quantity?.units,
      unitPriceCents: transaction.unitPrice?.cents,
      totalCents: transaction.total.cents,
      balanceAfterCents: transaction.balanceAfter.cents,
      occurredAt: transaction.occurredAt.toISOString(),
    };
  }

  private assertTradeRequest(request: TradeAssetRequestDto): void {
    this.assertString(request.symbol, "symbol");
    this.assertSafeInteger(request.quantity, "quantity");
    if (request.quantity <= 0) {
      throw new BadRequestException("quantity must be positive.");
    }
  }

  private assertString(
    value: unknown,
    fieldName: string,
  ): asserts value is string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new BadRequestException(`${fieldName} must be a non-empty string.`);
    }
  }

  private assertSafeInteger(
    value: unknown,
    fieldName: string,
  ): asserts value is number {
    if (!Number.isSafeInteger(value)) {
      throw new BadRequestException(`${fieldName} must be an integer.`);
    }
  }
}
