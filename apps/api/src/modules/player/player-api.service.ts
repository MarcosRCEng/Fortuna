import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from "@nestjs/common";
import {
  BuyAssetUseCase,
  CollectIncomeUseCase,
  CreatePlayerUseCase,
  DomainEventPublisher,
  EventDispatcher,
  GetAssetDetailsUseCase,
  GetAssetHistoryUseCase,
  GetCurrentAssetPriceUseCase,
  GetExpectedYieldUseCase,
  GetMarketProviderStatusUseCase,
  RuleBasedMentorService,
  ListAvailableAssetsUseCase,
  LogEventHandler,
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
import {
  MockMarketDataProvider,
  PinoLogger,
  PrismaFinancialOperationsService,
  PrismaIncomeEventRepository,
  PrismaMarketPriceProvider,
  PrismaPlayerRepository,
  PrismaTransactionRepository,
  PrismaWalletRepository,
  toDomainAsset,
} from "@fortuna/infrastructure";
import {
  AssetNotFoundError,
  Asset,
  AssetSymbol,
  AssetType,
  IncomeEvent,
  MentorGameLoopMoment,
  MoneyCents,
  OperationRejectedError,
  RiskLevel,
  Transaction,
  TransactionType,
  Wallet,
  WalletNotFoundError,
} from "@fortuna/domain";
import {
  AssetResponseDto,
  AssetHistoryResponseDto,
  AssetPriceResponseDto,
  AssetYieldResponseDto,
  AssetDetailsResponseDto,
  AssetHistoryPointResponseDto,
  CollectIncomeRequestDto,
  CollectIncomeResponseDto,
  CreatePlayerRequestDto,
  ExpectedYieldResponseDto,
  MarketQuoteResponseDto,
  MarketProviderStatusResponseDto,
  OrderExecutionResponseDto,
  PlayerSummaryResponseDto,
  PortfolioAllocationResponseDto,
  PortfolioResponseDto,
  RefreshMarketPricesResponseDto,
  MentorTipResponseDto,
  PlayerResponseDto,
  RefreshMarketPricesRequestDto,
  TradeAssetRequestDto,
  TransactionResponseDto,
  TransactionsListResponseDto,
  WalletResponseDto,
  WalletSummaryResponseDto,
} from "./player.dto.js";
import {
  formatBasisPoints,
  formatFortuna,
  toMoneyResponse,
} from "./money-response.js";
import type { PrismaService } from "../../infra/database/prisma.service.js";

interface PersistentPlayerApiDependencies {
  operations: PrismaFinancialOperationsService;
  players: PrismaPlayerRepository;
  wallets: PrismaWalletRepository;
  prices: PrismaMarketPriceProvider;
  transactions: PrismaTransactionRepository;
  incomeEvents: PrismaIncomeEventRepository;
}

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

  async listAvailableByPlayerId(_playerId: string): Promise<IncomeEvent[]> {
    return [...this.incomeEvents.values()].filter(
      (incomeEvent) => !incomeEvent.isCollected,
    );
  }
}

@Injectable()
export class PlayerApiService {
  static withPrisma(prisma: PrismaService): PlayerApiService {
    let nextPersistentId = 0;
    const clock = { now: () => new Date() };
    return new PlayerApiService({
      operations: new PrismaFinancialOperationsService(
        prisma,
        clock,
        () => `tx-${++nextPersistentId}`,
      ),
      wallets: new PrismaWalletRepository(prisma),
      players: new PrismaPlayerRepository(prisma),
      prices: new PrismaMarketPriceProvider(prisma),
      transactions: new PrismaTransactionRepository(prisma),
      incomeEvents: new PrismaIncomeEventRepository(prisma),
    });
  }

  private readonly marketData: MarketDataProvider & MarketPriceProvider =
    new MockMarketDataProvider();
  private readonly assets = new InMemoryAssetRepository(this.marketData);
  private readonly wallets = new InMemoryWalletRepository();
  private readonly players = new InMemoryPlayerRepository();
  private readonly prices = this.marketData;
  private readonly transactions = new InMemoryTransactionRepository();
  private readonly logger = new PinoLogger();
  private nextId = 0;
  private readonly dispatcher = this.createEventDispatcher();
  private readonly eventPublisher = new DomainEventPublisher(
    this.dispatcher,
    () => `event-${++this.nextId}`,
    this.logger,
  );
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

  constructor(
    @Optional()
    @Inject("PLAYER_API_PERSISTENCE")
    private readonly persistence?: PersistentPlayerApiDependencies,
  ) {}

  async createPlayer(
    request: CreatePlayerRequestDto,
  ): Promise<PlayerResponseDto> {
    this.assertString(request.name, "name");
    this.assertMaxLength(request.name, "name", 80);
    if (request.nickname !== undefined) {
      this.assertString(request.nickname, "nickname");
      this.assertMaxLength(request.nickname, "nickname", 80);
    }
    if (request.id !== undefined) {
      this.assertString(request.id, "id");
      this.assertMaxLength(request.id, "id", 80);
    }
    if (request.initialBalanceCents !== undefined) {
      this.assertSafeInteger(
        request.initialBalanceCents,
        "initialBalanceCents",
      );
    }

    if (this.persistence) {
      const createdAt = new Date();
      const playerId = request.id?.trim() || `player-${++this.nextId}`;
      const initialBalanceCents = request.initialBalanceCents ?? 20_000;
      await this.persistence.operations.createPlayer({
        id: playerId,
        name: request.name,
        nickname: request.nickname,
        initialBalanceCents,
      });

      return {
        id: playerId,
        name: request.name.trim(),
        nickname: request.nickname?.trim(),
        wallet: toMoneyResponse(initialBalanceCents),
        createdAt: createdAt.toISOString(),
      };
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
      wallet: toMoneyResponse(result.initialBalance.cents),
      createdAt: result.player.createdAt.toISOString(),
    };
  }

  async getPlayer(playerId: string): Promise<PlayerResponseDto> {
    this.assertString(playerId, "playerId");
    const player = this.persistence
      ? await this.persistence.players.findById(playerId)
      : await this.players.findById(playerId);
    if (!player) {
      throw new OperationRejectedError(
        "Jogador nao encontrado.",
        "PLAYER_NOT_FOUND",
      );
    }

    const wallet = this.persistence
      ? await this.persistence.wallets.findByPlayerId(playerId)
      : await this.wallets.findByPlayerId(playerId);

    return {
      id: player.id,
      name: player.name,
      nickname: player.nickname,
      wallet: toMoneyResponse(wallet?.account.availableBalance.cents ?? 0),
      createdAt: player.createdAt.toISOString(),
    };
  }

  async getPlayerSummary(playerId: string): Promise<PlayerSummaryResponseDto> {
    await this.getPlayer(playerId);
    const wallet = await this.getWallet(playerId);
    const transactions = await this.getTransactionItems(playerId);
    const allocation = await this.getPortfolioAllocation(playerId);
    const totalIncomeCollected = transactions
      .filter((transaction) => transaction.type === "INCOME_COLLECTED")
      .reduce((total, transaction) => total + transaction.totalCents, 0);

    return {
      playerId,
      walletBalance: toMoneyResponse(wallet.availableBalanceCents),
      totalInvested: toMoneyResponse(wallet.investedValueCents),
      portfolioMarketValue: toMoneyResponse(wallet.investedValueCents),
      totalEquity: toMoneyResponse(wallet.totalEquityCents),
      totalIncomeCollected: toMoneyResponse(totalIncomeCollected),
      totalTransactions: transactions.length,
      allocation,
    };
  }

  async buyAsset(
    playerId: string,
    request: TradeAssetRequestDto,
  ): Promise<OrderExecutionResponseDto> {
    const trade = await this.parseTradeRequest(request);
    if (this.persistence) {
      const transaction = await this.persistence.operations.buy({
        playerId,
        symbol: trade.symbol,
        quantity: trade.quantity,
        correlationId: `api-${this.nextId}`,
      });
      return this.toOrderResponse(transaction);
    }

    const useCase = new BuyAssetUseCase(
      this.assets,
      this.wallets,
      this.prices,
      this.transactions,
      { now: () => new Date() },
      () => `tx-${++this.nextId}`,
      this.logger,
      this.eventPublisher,
    );
    const result = await useCase.execute({
      playerId,
      symbol: trade.symbol,
      quantity: trade.quantity,
      correlationId: `api-${this.nextId}`,
    });

    return this.toOrderResponse(result.data);
  }

  async sellAsset(
    playerId: string,
    request: TradeAssetRequestDto,
  ): Promise<OrderExecutionResponseDto> {
    const trade = await this.parseTradeRequest(request);
    if (this.persistence) {
      const transaction = await this.persistence.operations.sell({
        playerId,
        symbol: trade.symbol,
        quantity: trade.quantity,
        correlationId: `api-${this.nextId}`,
      });
      return this.toOrderResponse(transaction);
    }

    const useCase = new SellAssetUseCase(
      this.assets,
      this.wallets,
      this.prices,
      this.transactions,
      { now: () => new Date() },
      () => `tx-${++this.nextId}`,
      this.logger,
      this.eventPublisher,
    );
    const result = await useCase.execute({
      playerId,
      symbol: trade.symbol,
      quantity: trade.quantity,
      correlationId: `api-${this.nextId}`,
    });

    return this.toOrderResponse(result.data);
  }

  async collectIncome(
    playerId: string,
    request: CollectIncomeRequestDto = {},
  ): Promise<CollectIncomeResponseDto> {
    const incomeEventId = await this.resolveIncomeEventId(
      playerId,
      request.incomeEventId,
      request.assetId,
    );
    if (this.persistence) {
      const transaction = await this.persistence.operations.collectIncome({
        playerId,
        incomeEventId,
        correlationId: `api-${this.nextId}`,
      });
      return this.toCollectIncomeResponse(transaction);
    }

    const useCase = new CollectIncomeUseCase(
      this.wallets,
      this.incomeEvents,
      this.transactions,
      { now: () => new Date() },
      () => `tx-${++this.nextId}`,
      this.logger,
      this.eventPublisher,
    );
    const result = await useCase.execute({
      playerId,
      incomeEventId,
      correlationId: `api-${this.nextId}`,
    });

    return this.toCollectIncomeResponse(result.data);
  }

  async collectIncomeById(
    playerId: string,
    incomeEventId: string,
  ): Promise<TransactionResponseDto> {
    const result = await this.collectIncome(playerId, { incomeEventId });
    return {
      id: result.events[0]?.incomeEventId ?? result.createdAt,
      type: "INCOME_COLLECTED",
      symbol: result.events[0]?.symbol,
      totalCents: result.collectedIncomeCents,
      balanceAfterCents: result.walletBalanceAfterCents,
      occurredAt: result.createdAt,
    };
  }

  async getWallet(playerId: string): Promise<WalletSummaryResponseDto> {
    if (this.persistence) {
      const summary = await new GetWalletSummaryUseCase(
        this.persistence.wallets,
        this.persistence.prices,
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

  async getWalletResponse(playerId: string): Promise<WalletResponseDto> {
    const wallet = this.persistence
      ? await this.persistence.wallets.findByPlayerId(playerId)
      : await this.wallets.findByPlayerId(playerId);
    if (!wallet) {
      throw new WalletNotFoundError(playerId);
    }

    const balanceCents = wallet.account.availableBalance.cents;
    return {
      playerId,
      balanceCents,
      currency: "FORTUNA",
      formatted: formatFortuna(balanceCents),
      balance: toMoneyResponse(balanceCents),
      updatedAt: new Date().toISOString(),
    };
  }

  async getPortfolio(playerId: string): Promise<PortfolioResponseDto> {
    const wallet = this.persistence
      ? await this.persistence.wallets.findByPlayerId(playerId)
      : await this.wallets.findByPlayerId(playerId);
    if (!wallet) {
      throw new WalletNotFoundError(playerId);
    }

    const marketPrices = await (this.persistence?.prices ?? this.prices).getCurrentPrices(
      wallet.positions.map((position) => position.asset),
    );
    const positions = wallet.positions.map((position) => {
      const price = marketPrices.find((item) =>
        item.asset.symbol.equals(position.asset.symbol),
      );
      const currentPriceCents = price?.unitPrice.cents ?? 0;
      const marketValueCents = price
        ? position.marketValue(price.unitPrice).cents
        : 0;
      const investedValueCents =
        position.averagePriceCents.cents * position.totalQuantity.units;

      return {
        assetId: position.asset.id,
        symbol: position.asset.symbol.value,
        name: position.asset.name,
        quantity: String(position.totalQuantity.units),
        averagePriceCents: position.averagePriceCents.cents,
        currentPriceCents,
        investedValueCents,
        marketValueCents,
        unrealizedResultCents: marketValueCents - investedValueCents,
        formattedMarketValue: formatFortuna(marketValueCents),
      };
    });
    const totalInvestedCents = positions.reduce(
      (total, position) => total + position.investedValueCents,
      0,
    );
    const totalMarketValueCents = positions.reduce(
      (total, position) => total + position.marketValueCents,
      0,
    );

    return {
      playerId,
      positions,
      totalInvestedCents,
      totalMarketValueCents,
      formattedTotalMarketValue: formatFortuna(totalMarketValueCents),
    };
  }

  async getPortfolioAllocation(
    playerId: string,
  ): Promise<PortfolioAllocationResponseDto> {
    const portfolio = await this.getPortfolio(playerId);
    const total = portfolio.totalMarketValueCents;
    const byAssetTypeValues = new Map<string, number>();

    for (const position of portfolio.positions) {
      const asset = await this.resolveMarketAsset(position.assetId);
      const assetType = asset.assetClass;
      byAssetTypeValues.set(
        assetType,
        (byAssetTypeValues.get(assetType) ?? 0) + position.marketValueCents,
      );
    }

    const toBasisPoints = (value: number) =>
      total === 0 ? 0 : Math.floor((value * 10_000) / total);

    return {
      playerId,
      byAssetType: [...byAssetTypeValues.entries()].map(
        ([assetType, valueCents]) => {
          const basisPoints = toBasisPoints(valueCents);
          return {
            assetType,
            valueCents,
            basisPoints,
            percentageFormatted: formatBasisPoints(basisPoints),
          };
        },
      ),
      byAsset: portfolio.positions.map((position) => {
        const basisPoints = toBasisPoints(position.marketValueCents);
        return {
          assetId: position.assetId,
          symbol: position.symbol,
          valueCents: position.marketValueCents,
          basisPoints,
          percentageFormatted: formatBasisPoints(basisPoints),
        };
      }),
    };
  }

  async evaluateMentorTips(playerId: string): Promise<MentorTipResponseDto[]> {
    this.assertString(playerId, "playerId");
    const wallet = await this.wallets.findByPlayerId(playerId);
    if (!wallet) {
      throw new WalletNotFoundError(playerId);
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

  async getTransactions(
    playerId: string,
    filter: { type?: string; assetId?: string; limit?: string; offset?: string } = {},
  ): Promise<TransactionsListResponseDto> {
    let items = await this.getTransactionItems(playerId);
    if (filter.type) {
      items = items.filter((transaction) => transaction.type === filter.type);
    }
    if (filter.assetId) {
      const asset = await this.resolveMarketAsset(filter.assetId);
      items = items.filter((transaction) => transaction.symbol === asset.symbol);
    }
    const offset = filter.offset ? this.parseNonNegativeInteger(filter.offset, "offset") : 0;
    const limit = filter.limit ? this.parsePositiveInteger(filter.limit, "limit") : items.length;
    const paginated = items.slice(offset, offset + limit);
    return {
      playerId,
      items: paginated,
      total: items.length,
    };
  }

  private async getTransactionItems(
    playerId: string,
  ): Promise<TransactionResponseDto[]> {
    if (this.persistence) {
      const transactions = await new GetTransactionHistoryUseCase(
        this.persistence.transactions,
      ).execute(playerId);
      return transactions.map((transaction) =>
        this.toTransactionResponse(transaction),
      );
    }

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

  async getAssetDetails(assetId: string): Promise<AssetDetailsResponseDto> {
    const assetReference = await this.resolveMarketAsset(assetId);
    const details = await new GetAssetDetailsUseCase(this.marketData).execute(
      assetReference.symbol,
    );
    if (!details) {
      throw new AssetNotFoundError(assetId);
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

  async getAssetHistoryResponse(
    assetId: string,
    from?: string,
    to?: string,
  ): Promise<AssetHistoryResponseDto> {
    const asset = await this.resolveMarketAsset(assetId);
    const history = await this.getAssetHistory(asset.symbol, from, to);
    return {
      assetId: asset.id,
      symbol: asset.symbol,
      history: history.map((point) => ({
        date: point.date,
        priceCents: point.closePriceCents,
        formatted: formatFortuna(point.closePriceCents),
      })),
    };
  }

  async getAssetPrice(assetId: string): Promise<AssetPriceResponseDto> {
    const asset = await this.resolveMarketAsset(assetId);
    const quote = await this.getQuote(asset.symbol);
    return {
      assetId: asset.id,
      symbol: asset.symbol,
      priceCents: quote.priceCents,
      currency: "FORTUNA",
      formatted: formatFortuna(quote.priceCents),
      updatedAt: quote.asOf,
    };
  }

  async getExpectedYield(symbol: string): Promise<ExpectedYieldResponseDto> {
    this.assertString(symbol, "symbol");
    const expectedYield = await new GetExpectedYieldUseCase(
      this.marketData,
    ).execute(symbol);
    if (!expectedYield) {
      throw new AssetNotFoundError(symbol);
    }

    return {
      ...expectedYield,
      nextPaymentDate: expectedYield.nextPaymentDate?.toISOString(),
    };
  }

  async getAssetYield(assetId: string): Promise<AssetYieldResponseDto> {
    const asset = await this.resolveMarketAsset(assetId);
    const expectedYield = await this.getExpectedYield(asset.symbol);
    const lastYieldCents = expectedYield.amountPerUnitCents ?? 0;
    const hasYield =
      expectedYield.yieldType !== "NONE" &&
      (lastYieldCents > 0 || (expectedYield.rateBps ?? 0) > 0);

    return {
      assetId: asset.id,
      symbol: asset.symbol,
      hasYield,
      yieldType: hasYield ? expectedYield.yieldType : null,
      lastYieldCents,
      formattedLastYield: formatFortuna(lastYieldCents),
      nextPaymentDate: expectedYield.nextPaymentDate?.slice(0, 10) ?? null,
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

  async refreshMockPrices(
    request: RefreshMarketPricesRequestDto = {},
  ): Promise<RefreshMarketPricesResponseDto> {
    const assets = await this.refreshMarketPrices(request);
    return {
      updatedAssets: assets.map((asset) => ({
        assetId: asset.id,
        symbol: asset.symbol,
        previousPriceCents: asset.previousPriceCents ?? asset.currentPriceCents,
        currentPriceCents: asset.currentPriceCents,
        variationBasisPoints: asset.variationBps,
        updatedAt: asset.updatedAt,
      })),
      updatedAt: new Date().toISOString(),
    };
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
      throw new AssetNotFoundError(symbol);
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
      currentPrice: toMoneyResponse(asset.currentPriceCents),
      formattedCurrentPrice: formatFortuna(asset.currentPriceCents),
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

  private toOrderResponse(transaction: Transaction): OrderExecutionResponseDto {
    return {
      orderId: transaction.id,
      type: transaction.type,
      playerId: transaction.playerId,
      assetId: transaction.asset?.id ?? "",
      symbol: transaction.asset?.symbol.value ?? "",
      quantity: String(transaction.quantity?.units ?? 0),
      unitPriceCents: transaction.unitPrice?.cents ?? 0,
      totalCents: transaction.total.cents,
      walletBalanceAfterCents: transaction.balanceAfter.cents,
      createdAt: transaction.occurredAt.toISOString(),
    };
  }

  private toCollectIncomeResponse(
    transaction: Transaction,
  ): CollectIncomeResponseDto {
    const incomeEventId = transaction.metadata?.incomeEventId ?? "";
    return {
      playerId: transaction.playerId,
      collectedIncomeCents: transaction.total.cents,
      formattedCollectedIncome: formatFortuna(transaction.total.cents),
      events: [
        {
          incomeEventId,
          assetId: transaction.asset?.id ?? "",
          symbol: transaction.asset?.symbol.value ?? "",
          amountCents: transaction.total.cents,
        },
      ],
      walletBalanceAfterCents: transaction.balanceAfter.cents,
      createdAt: transaction.occurredAt.toISOString(),
    };
  }

  private async parseTradeRequest(
    request: TradeAssetRequestDto,
  ): Promise<{ symbol: string; quantity: number }> {
    const identifier = request.assetId ?? request.symbol;
    this.assertString(identifier, "assetId");
    const asset = await this.resolveMarketAsset(identifier);
    const quantity =
      typeof request.quantity === "number"
        ? request.quantity
        : this.parsePositiveInteger(request.quantity, "quantity");
    return { symbol: asset.symbol, quantity };
  }

  private async resolveMarketAsset(identifier: string): Promise<MarketAsset> {
    this.assertString(identifier, "assetId");
    const assets = await this.marketData.listAssets();
    const normalized = identifier.trim().toUpperCase();
    const found = assets.find(
      (asset) => asset.id === identifier || asset.symbol === normalized,
    );
    if (found) {
      return found;
    }

    throw new AssetNotFoundError(identifier);
  }

  private async resolveIncomeEventId(
    playerId: string,
    incomeEventId?: string,
    assetId?: string,
  ): Promise<string> {
    if (incomeEventId) {
      return incomeEventId;
    }

    const events = this.persistence
      ? await this.persistence.incomeEvents.listAvailableByPlayerId(playerId)
      : await this.incomeEvents.listAvailableByPlayerId(playerId);
    const filteredEvents = assetId
      ? events.filter((event) => event.asset.id === assetId)
      : events;
    const [event] = filteredEvents;
    if (!event) {
      throw new OperationRejectedError(
        "Nao ha rendimentos disponiveis para coleta.",
        "NO_INCOME_AVAILABLE",
      );
    }

    return event.id;
  }

  private parsePositiveInteger(value: unknown, fieldName: string): number {
    if (typeof value !== "string" && typeof value !== "number") {
      throw new BadRequestException(`${fieldName} must be a positive integer.`);
    }
    const parsed =
      typeof value === "number" ? value : Number.parseInt(value.trim(), 10);
    if (
      !Number.isSafeInteger(parsed) ||
      parsed <= 0 ||
      String(value).trim() !== String(parsed)
    ) {
      throw new BadRequestException(`${fieldName} must be a positive integer.`);
    }

    return parsed;
  }

  private parseNonNegativeInteger(value: unknown, fieldName: string): number {
    if (typeof value !== "string" && typeof value !== "number") {
      throw new BadRequestException(
        `${fieldName} must be a non-negative integer.`,
      );
    }
    const parsed =
      typeof value === "number" ? value : Number.parseInt(value.trim(), 10);
    if (
      !Number.isSafeInteger(parsed) ||
      parsed < 0 ||
      String(value).trim() !== String(parsed)
    ) {
      throw new BadRequestException(
        `${fieldName} must be a non-negative integer.`,
      );
    }
    return parsed;
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

  private assertMaxLength(
    value: string,
    fieldName: string,
    maxLength: number,
  ): void {
    if (value.trim().length > maxLength) {
      throw new BadRequestException(
        `${fieldName} must contain at most ${maxLength} characters.`,
      );
    }
  }

  private parseDate(value: string, fieldName: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} must be a valid date.`);
    }

    return date;
  }

  private createEventDispatcher(): EventDispatcher {
    const dispatcher = new EventDispatcher(this.logger);
    const logHandler = new LogEventHandler(this.logger);
    for (const eventType of [
      "AssetBought",
      "AssetSold",
      "YieldGenerated",
      "YieldCollected",
      "TransactionCreated",
      "MarketPricesUpdated",
      "PortfolioEvaluated",
      "CycleAdvanced",
      "MissionProgressUpdated",
      "MentorTipGenerated",
      "CityStateUpdated",
      "CityRefreshRequested",
    ]) {
      dispatcher.register(eventType, logHandler);
    }

    return dispatcher;
  }
}
