import { BadRequestException, Injectable } from "@nestjs/common";
import {
  BuyAssetUseCase,
  CollectIncomeUseCase,
  CreatePlayerUseCase,
  GetAssetDetailsUseCase,
  GetAssetHistoryUseCase,
  GetCurrentAssetPriceUseCase,
  GetExpectedYieldUseCase,
  GetMarketProviderStatusUseCase,
  RuleBasedMentorService,
  ListAvailableAssetsUseCase,
  RefreshMarketPricesUseCase,
  GetTransactionHistoryUseCase,
  GetWalletSummaryUseCase,
  SellAssetUseCase,
  type Asset as MarketAsset,
  type AssetRepository,
  type IncomeEventRepository,
  type MarketDataProvider,
  type MarketPriceProvider,
  type PlayerProfile,
  type PlayerRepository,
  type TransactionHistoryFilter,
  type TransactionRepository,
  type WalletRepository,
} from "@fortuna/application";
import { MockMarketDataProvider, toDomainAsset } from "@fortuna/infrastructure";
import {
  Asset,
  AssetSymbol,
  AssetType,
  IncomeEvent,
  MentorGameLoopMoment,
  MoneyCents,
  RiskLevel,
  Transaction,
  TransactionType,
  Wallet,
} from "@fortuna/domain";
import {
  AssetResponseDto,
  AssetDetailsResponseDto,
  AssetHistoryPointResponseDto,
  CreatePlayerRequestDto,
  ExpectedYieldResponseDto,
  MarketQuoteResponseDto,
  MarketProviderStatusResponseDto,
  MentorTipResponseDto,
  PlayerResponseDto,
  RefreshMarketPricesRequestDto,
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
  constructor(private readonly marketData: MarketDataProvider) {}

  async findBySymbol(symbol: AssetSymbol): Promise<Asset | undefined> {
    const asset = await this.marketData.getAsset(symbol.value);
    return asset ? toDomainAsset(asset) : undefined;
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

@Injectable()
export class PlayerApiService {
  private readonly marketData: MarketDataProvider & MarketPriceProvider =
    new MockMarketDataProvider();
  private readonly assets = new InMemoryAssetRepository(this.marketData);
  private readonly wallets = new InMemoryWalletRepository();
  private readonly players = new InMemoryPlayerRepository();
  private readonly prices = this.marketData;
  private readonly transactions = new InMemoryTransactionRepository();
  private readonly incomeEvents = new InMemoryIncomeEventRepository([
    new IncomeEvent(
      "income-001",
      new Asset(
        "asset-fiisf001",
        AssetSymbol.create("FIISF001"),
        "FII Shopping Fortuna",
        AssetType.FII,
        RiskLevel.MEDIUM,
      ),
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

  async evaluateMentorTips(playerId: string): Promise<MentorTipResponseDto[]> {
    this.assertString(playerId, "playerId");
    const wallet = await this.wallets.findByPlayerId(playerId);
    if (!wallet) {
      throw new BadRequestException("Wallet not found for player.");
    }

    const prices = await this.prices.getCurrentPrices(
      wallet.positions.map((position) => position.asset),
    );
    const investedValue = wallet.investedValue(prices);
    const totalEquity = wallet.account.availableBalance.add(investedValue);
    const mentor = new RuleBasedMentorService({ now: () => new Date() });
    const tips = mentor.evaluate({
      playerId,
      currentCashInCents: wallet.account.availableBalance,
      totalEquityInCents: totalEquity,
      portfolioPositions: wallet.positions.map((position) => {
        const price = prices.find((item) =>
          item.asset.symbol.equals(position.asset.symbol),
        );
        return {
          assetId: position.asset.id,
          symbol: position.asset.symbol.value,
          name: position.asset.name,
          assetType: position.asset.type,
          quantity: position.totalQuantity,
          averagePrice: position.averagePriceCents,
          marketValue: price
            ? position.marketValue(price.unitPrice)
            : MoneyCents.zero(),
        };
      }),
      assetAllocation: wallet.allocationByAssetType(prices),
      recentEvents: [],
      completedMissions: [],
      activeMissions: [],
      alreadyShownTips: [],
      currentGameLoopMoment: MentorGameLoopMoment.PORTFOLIO,
      emergencyReserveTargetCents: 20_000,
    });

    return tips.map((tip) => ({
      id: tip.id,
      ruleId: tip.ruleId,
      type: tip.type,
      title: tip.title,
      message: tip.message,
      concept: tip.concept,
      severity: tip.severity,
      createdAt: tip.createdAt.toISOString(),
      actionLabel: tip.actionLabel,
      relatedMissionId: tip.relatedMissionId,
      relatedAssetId: tip.relatedAssetId,
      metadata: tip.metadata,
    }));
  }

  async getTransactions(playerId: string): Promise<TransactionResponseDto[]> {
    const transactions = await new GetTransactionHistoryUseCase(
      this.transactions,
    ).execute(playerId);
    return transactions.map((transaction) =>
      this.toTransactionResponse(transaction),
    );
  }

  async listAssets(): Promise<AssetResponseDto[]> {
    const assets = await new ListAvailableAssetsUseCase(
      this.marketData,
    ).execute();

    return assets.map((asset) => this.toAssetResponse(asset));
  }

  async getAssetDetails(symbol: string): Promise<AssetDetailsResponseDto> {
    this.assertString(symbol, "symbol");
    const details = await new GetAssetDetailsUseCase(this.marketData).execute(
      symbol,
    );
    if (!details) {
      throw new BadRequestException("Asset symbol is not available.");
    }

    return {
      asset: this.toAssetResponse(details.asset),
      educationalInfo: details.educationalInfo,
    };
  }

  async getAssetHistory(
    symbol: string,
    from?: string,
    to?: string,
  ): Promise<AssetHistoryPointResponseDto[]> {
    this.assertString(symbol, "symbol");
    const toDate = to ? this.parseDate(to, "to") : new Date();
    const fromDate = from
      ? this.parseDate(from, "from")
      : new Date(toDate.getTime() - 30 * 86_400_000);

    const history = await new GetAssetHistoryUseCase(this.marketData).execute({
      symbol,
      from: fromDate,
      to: toDate,
    });

    return history.map((point) => ({
      symbol: point.symbol,
      date: point.date.toISOString().slice(0, 10),
      openPriceCents: point.openPriceCents,
      closePriceCents: point.closePriceCents,
      minPriceCents: point.minPriceCents,
      maxPriceCents: point.maxPriceCents,
      volume: point.volume,
    }));
  }

  async getExpectedYield(symbol: string): Promise<ExpectedYieldResponseDto> {
    this.assertString(symbol, "symbol");
    const expectedYield = await new GetExpectedYieldUseCase(
      this.marketData,
    ).execute(symbol);
    if (!expectedYield) {
      throw new BadRequestException("Asset symbol is not available.");
    }

    return {
      ...expectedYield,
      nextPaymentDate: expectedYield.nextPaymentDate?.toISOString(),
    };
  }

  async refreshMarketPrices(
    request: RefreshMarketPricesRequestDto = {},
  ): Promise<AssetResponseDto[]> {
    const asOf = request.asOf
      ? this.parseDate(request.asOf, "asOf")
      : undefined;
    const assets = await new RefreshMarketPricesUseCase(
      this.marketData,
    ).execute({ asOf });

    return assets.map((asset) => this.toAssetResponse(asset));
  }

  async getMarketProviderStatus(): Promise<MarketProviderStatusResponseDto> {
    const status = await new GetMarketProviderStatusUseCase(
      this.marketData,
    ).execute();

    return {
      ...status,
      checkedAt: status.checkedAt.toISOString(),
    };
  }

  async getQuote(symbol: string): Promise<MarketQuoteResponseDto> {
    const price = await new GetCurrentAssetPriceUseCase(
      this.marketData,
    ).execute(symbol);
    if (!price) {
      throw new BadRequestException("Asset symbol is not available.");
    }

    return {
      symbol: price.symbol,
      priceCents: price.priceCents,
      asOf: price.marketTimestamp.toISOString(),
      provider: price.dataSource,
      priceStatus: price.priceStatus,
    };
  }

  private toAssetResponse(asset: MarketAsset): AssetResponseDto {
    return {
      id: asset.id,
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.assetClass,
      currentPriceCents: asset.currentPriceCents,
      previousPriceCents: asset.previousPriceCents,
      variationBps: asset.variationBps,
      riskLevel: asset.riskLevel,
      liquidity: asset.liquidity,
      priceStatus: asset.priceStatus,
      dataSource: asset.dataSource,
      isMocked: asset.isMocked,
      isActive: true,
      educationalDescription: asset.educationalDescription,
      updatedAt: asset.updatedAt.toISOString(),
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

  private parseDate(value: string, fieldName: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date.`);
    }

    return date;
  }
}
