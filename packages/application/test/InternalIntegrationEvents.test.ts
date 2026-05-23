import { beforeEach, describe, expect, it } from "vitest";
import {
  Asset,
  AssetSymbol,
  AssetType,
  InsufficientBalanceError,
  MarketPrice,
  MoneyCents,
  PlayerAccount,
  Quantity,
  RiskLevel,
  Transaction,
  Wallet,
  type FinancialEvent,
} from "@fortuna/domain";
import {
  BuyAssetUseCase,
  DomainEventPublisher,
  EventDispatcher,
  GenerateYieldUseCase,
  SellAssetUseCase,
  type AssetRepository,
  type Clock,
  type EventHandler,
  type IncomeEventRepository,
  type LoggerPort,
  type LogPayload,
  type MarketPriceProvider,
  type TransactionHistoryFilter,
  type TransactionRepository,
  type WalletRepository,
} from "../src/index.js";

class InMemoryAssetRepository implements AssetRepository {
  constructor(private readonly assets: Asset[]) {}

  async findBySymbol(symbol: AssetSymbol): Promise<Asset | undefined> {
    return this.assets.find((asset) => asset.symbol.equals(symbol));
  }
}

class InMemoryWalletRepository implements WalletRepository {
  constructor(public wallet: Wallet) {}

  async findByPlayerId(playerId: string): Promise<Wallet | undefined> {
    return this.wallet.account.playerId === playerId ? this.wallet : undefined;
  }

  async save(wallet: Wallet): Promise<void> {
    this.wallet = wallet;
  }
}

class InMemoryTransactionRepository implements TransactionRepository {
  readonly transactions: Transaction[] = [];

  async append(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);
  }

  async listByPlayerId(
    playerId: string,
    _filter?: TransactionHistoryFilter,
  ): Promise<Transaction[]> {
    return this.transactions.filter(
      (transaction) => transaction.playerId === playerId,
    );
  }
}

class InMemoryIncomeEventRepository implements IncomeEventRepository {
  readonly savedIds: string[] = [];

  async findById(): Promise<undefined> {
    return undefined;
  }

  async save(incomeEvent: { id: string }): Promise<void> {
    this.savedIds.push(incomeEvent.id);
  }
}

class StaticMarketPriceProvider implements MarketPriceProvider {
  constructor(private readonly priceCents: number) {}

  async getCurrentPrice(asset: Asset): Promise<MarketPrice> {
    return new MarketPrice(asset, MoneyCents.fromCents(this.priceCents), now);
  }

  async getCurrentPrices(assets: Asset[]): Promise<MarketPrice[]> {
    return assets.map(
      (asset) =>
        new MarketPrice(asset, MoneyCents.fromCents(this.priceCents), now),
    );
  }
}

class TestLogger implements LoggerPort {
  readonly entries: Array<{ level: string; message: string; payload: LogPayload }> =
    [];

  debug(message: string, payload: LogPayload): void {
    this.entries.push({ level: "debug", message, payload });
  }

  info(message: string, payload: LogPayload): void {
    this.entries.push({ level: "info", message, payload });
  }

  warn(message: string, payload: LogPayload): void {
    this.entries.push({ level: "warn", message, payload });
  }

  error(message: string, payload: LogPayload & { error?: unknown }): void {
    this.entries.push({ level: "error", message, payload });
  }
}

class RecordingHandler implements EventHandler {
  readonly name: string;
  readonly critical: boolean;
  readonly calls: string[] = [];

  constructor(
    name: string,
    private readonly fail = false,
    critical = false,
  ) {
    this.name = name;
    this.critical = critical;
  }

  async handle(event: { type: string }): Promise<void> {
    this.calls.push(event.type);
    if (this.fail) {
      throw new Error(`${this.name} failed`);
    }
  }
}

const now = new Date("2026-05-23T12:00:00.000Z");
const clock: Clock = { now: () => now };
const playerId = "player-integration";
let nextId = 0;
const idGenerator = () => `id-${++nextId}`;
const asset = new Asset(
  "asset-fort11",
  AssetSymbol.create("FORT11"),
  "FII Fortuna",
  AssetType.FII,
  RiskLevel.MEDIUM,
);

function makeWallet(balanceCents: number): Wallet {
  return new Wallet(
    "wallet-integration",
    new PlayerAccount(playerId, MoneyCents.fromCents(balanceCents)),
  );
}

function registerCoreHandlers(
  dispatcher: EventDispatcher,
  handlers: RecordingHandler[],
): void {
  for (const eventType of [
    "AssetBought",
    "AssetSold",
    "YieldGenerated",
    "YieldCollected",
    "TransactionCreated",
  ]) {
    for (const handler of handlers) {
      dispatcher.register(eventType, handler);
    }
  }
}

describe("internal event integration", () => {
  beforeEach(() => {
    nextId = 0;
  });

  it("publishes AssetBought and non-critical side effects after a valid buy", async () => {
    const logger = new TestLogger();
    const dispatcher = new EventDispatcher(logger);
    const gameLoop = new RecordingHandler("GameLoopEventHandler");
    const mission = new RecordingHandler("MissionEventHandler");
    const mentor = new RecordingHandler("MentorEventHandler", true);
    const city = new RecordingHandler("CityEventHandler");
    registerCoreHandlers(dispatcher, [gameLoop, mission, mentor, city]);
    const publisher = new DomainEventPublisher(
      dispatcher,
      idGenerator,
      logger,
    );
    const transactions = new InMemoryTransactionRepository();
    const wallets = new InMemoryWalletRepository(makeWallet(10_000));
    const buy = new BuyAssetUseCase(
      new InMemoryAssetRepository([asset]),
      wallets,
      new StaticMarketPriceProvider(1_000),
      transactions,
      clock,
      idGenerator,
      logger,
      publisher,
    );

    const result = await buy.execute({
      playerId,
      symbol: "FORT11",
      quantity: 2,
      correlationId: "corr-buy-1",
    });

    expect(result.events[0].type).toBe("AssetBought");
    expect(result.events[0]).toMatchObject({
      walletId: "wallet-integration",
      transactionId: "id-1",
    });
    expect(wallets.wallet.account.availableBalance.cents).toBe(8_000);
    expect(transactions.transactions).toHaveLength(1);
    expect(gameLoop.calls).toContain("AssetBought");
    expect(mission.calls).toContain("AssetBought");
    expect(mentor.calls).toContain("AssetBought");
    expect(city.calls).toContain("AssetBought");
    expect(
      logger.entries.some(
        (entry) => entry.payload.action === "event_handler_failed",
      ),
    ).toBe(true);
  });

  it("does not publish success events for invalid financial operations", async () => {
    const dispatcher = new EventDispatcher();
    const sideEffect = new RecordingHandler("SideEffect");
    registerCoreHandlers(dispatcher, [sideEffect]);
    const buy = new BuyAssetUseCase(
      new InMemoryAssetRepository([asset]),
      new InMemoryWalletRepository(makeWallet(100)),
      new StaticMarketPriceProvider(1_000),
      new InMemoryTransactionRepository(),
      clock,
      idGenerator,
      undefined,
      new DomainEventPublisher(dispatcher, idGenerator),
    );

    await expect(
      buy.execute({ playerId, symbol: "FORT11", quantity: 1 }),
    ).rejects.toBeInstanceOf(InsufficientBalanceError);

    expect(sideEffect.calls).toEqual([]);
  });

  it("publishes AssetSold and YieldGenerated with correlation metadata", async () => {
    const logger = new TestLogger();
    const dispatcher = new EventDispatcher(logger);
    const sideEffect = new RecordingHandler("SideEffect");
    registerCoreHandlers(dispatcher, [sideEffect]);
    const publisher = new DomainEventPublisher(
      dispatcher,
      idGenerator,
      logger,
    );
    const wallet = makeWallet(10_000);
    wallet.buy(asset, Quantity.fromUnits(3), MoneyCents.fromCents(1_000));
    const wallets = new InMemoryWalletRepository(wallet);
    const transactions = new InMemoryTransactionRepository();
    const sell = new SellAssetUseCase(
      new InMemoryAssetRepository([asset]),
      wallets,
      new StaticMarketPriceProvider(1_000),
      transactions,
      clock,
      idGenerator,
      logger,
      publisher,
    );
    const yieldUseCase = new GenerateYieldUseCase(
      new InMemoryAssetRepository([asset]),
      wallets,
      new InMemoryIncomeEventRepository(),
      clock,
      idGenerator,
      logger,
      publisher,
    );

    const sale = await sell.execute({
      playerId,
      symbol: "FORT11",
      quantity: 1,
      correlationId: "corr-sell-1",
    });
    const generatedYield = await yieldUseCase.execute({
      playerId,
      symbol: "FORT11",
      amountCents: 250,
      yieldType: "SIMULATED_DIVIDEND",
      dueCycle: 4,
      correlationId: "corr-yield-1",
    });

    expect(sale.events[0].type).toBe("AssetSold");
    expect(generatedYield.events[0].type).toBe("YieldGenerated");
    expect(sideEffect.calls).toEqual([
      "AssetSold",
      "TransactionCreated",
      "YieldGenerated",
    ]);
    expect(
      logger.entries.some(
        (entry) =>
          entry.payload.action === "financial_events_published" &&
          entry.payload.correlationId === "corr-yield-1",
      ),
    ).toBe(true);
  });
});
