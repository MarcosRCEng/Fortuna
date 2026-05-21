import { beforeEach, describe, expect, it } from "vitest";
import {
  Asset,
  AssetSymbol,
  AssetType,
  IncomeAlreadyCollectedError,
  IncomeEvent,
  InsufficientBalanceError,
  InsufficientPositionError,
  MarketPrice,
  MoneyCents,
  PlayerAccount,
  RiskLevel,
  Transaction,
  TransactionType,
  Wallet,
} from "@fortuna/domain";
import {
  BuyAssetUseCase,
  CollectIncomeUseCase,
  GetPortfolioAllocationUseCase,
  GetTransactionHistoryUseCase,
  GetWalletSummaryUseCase,
  SellAssetUseCase,
  type AssetRepository,
  type Clock,
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
  public readonly transactions: Transaction[] = [];

  async append(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);
  }

  async listByPlayerId(
    playerId: string,
    filter?: TransactionHistoryFilter,
  ): Promise<Transaction[]> {
    return this.transactions.filter((transaction) => {
      if (transaction.playerId !== playerId) {
        return false;
      }

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
    });
  }
}

class InMemoryIncomeEventRepository implements IncomeEventRepository {
  constructor(public incomeEvent: IncomeEvent) {}

  async findById(id: string): Promise<IncomeEvent | undefined> {
    return this.incomeEvent.id === id ? this.incomeEvent : undefined;
  }

  async save(incomeEvent: IncomeEvent): Promise<void> {
    this.incomeEvent = incomeEvent;
  }
}

class StaticMarketPriceProvider implements MarketPriceProvider {
  constructor(private readonly prices: Record<string, number>) {}

  async getCurrentPrice(asset: Asset): Promise<MarketPrice> {
    return new MarketPrice(
      asset,
      MoneyCents.fromCents(this.prices[asset.symbol.value]),
      now,
    );
  }

  async getCurrentPrices(assets: Asset[]): Promise<MarketPrice[]> {
    return assets.map(
      (asset) =>
        new MarketPrice(
          asset,
          MoneyCents.fromCents(this.prices[asset.symbol.value]),
          now,
        ),
    );
  }
}

class FailingTransactionRepository implements TransactionRepository {
  async append(_transaction: Transaction): Promise<void> {
    throw new Error("database down");
  }

  async listByPlayerId(): Promise<Transaction[]> {
    return [];
  }
}

class TestLogger implements LoggerPort {
  public readonly entries: Array<{
    level: "debug" | "info" | "warn" | "error";
    message: string;
    payload: LogPayload;
  }> = [];

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

  find(level: "info" | "warn" | "error", action: string) {
    return this.entries.find(
      (entry) => entry.level === level && entry.payload.action === action,
    );
  }
}

const now = new Date("2026-05-21T12:00:00.000Z");
const clock: Clock = { now: () => now };
let nextId = 0;
const idGenerator = () => `tx-${++nextId}`;
const playerId = "player-1";
const asset = new Asset(
  "asset-fort3",
  AssetSymbol.create("fort3"),
  "Fortuna Educacao ON",
  AssetType.STOCK,
  RiskLevel.HIGH,
);

function makeWallet(balanceCents: number): Wallet {
  return new Wallet(
    "wallet-1",
    new PlayerAccount(playerId, MoneyCents.fromCents(balanceCents)),
  );
}

function makeUseCases(wallet: Wallet, priceCents = 1000, logger?: LoggerPort) {
  const assets = new InMemoryAssetRepository([asset]);
  const wallets = new InMemoryWalletRepository(wallet);
  const transactions = new InMemoryTransactionRepository();
  const prices = new StaticMarketPriceProvider({ FORT3: priceCents });

  return {
    buy: new BuyAssetUseCase(
      assets,
      wallets,
      prices,
      transactions,
      clock,
      idGenerator,
      logger,
    ),
    sell: new SellAssetUseCase(
      assets,
      wallets,
      prices,
      transactions,
      clock,
      idGenerator,
      logger,
    ),
    summary: new GetWalletSummaryUseCase(wallets, prices),
    allocation: new GetPortfolioAllocationUseCase(wallets, prices),
    history: new GetTransactionHistoryUseCase(transactions),
    logger,
    wallets,
    transactions,
  };
}

describe("Financial core use cases", () => {
  beforeEach(() => {
    nextId = 0;
  });

  it("buys an asset with sufficient balance", async () => {
    const logger = new TestLogger();
    const { buy, wallets, transactions } = makeUseCases(
      makeWallet(10_000),
      1_000,
      logger,
    );

    const result = await buy.execute({
      playerId,
      symbol: "fort3",
      quantity: 3,
    });

    expect(wallets.wallet.account.availableBalance.cents).toBe(7_000);
    expect(wallets.wallet.getPosition("FORT3")?.totalQuantity.units).toBe(3);
    expect(transactions.transactions).toHaveLength(1);
    expect(transactions.transactions[0].type).toBe(TransactionType.BUY);
    expect(result.events[0].type).toBe("AssetBought");
    expect(logger.find("info", "asset_purchase_completed")).toBeDefined();
  });

  it("rejects buy without balance and keeps state unchanged", async () => {
    const logger = new TestLogger();
    const { buy, wallets, transactions } = makeUseCases(
      makeWallet(1_000),
      1_001,
      logger,
    );

    await expect(
      buy.execute({ playerId, symbol: "FORT3", quantity: 1 }),
    ).rejects.toBeInstanceOf(InsufficientBalanceError);

    try {
      await buy.execute({ playerId, symbol: "FORT3", quantity: 1 });
    } catch (error) {
      expect((error as InsufficientBalanceError).events[0].type).toBe(
        "BuyRejectedInsufficientBalance",
      );
    }

    expect(wallets.wallet.account.availableBalance.cents).toBe(1_000);
    expect(wallets.wallet.getPosition("FORT3")).toBeUndefined();
    expect(transactions.transactions).toHaveLength(0);
    expect(
      logger.find("warn", "asset_purchase_blocked_insufficient_balance"),
    ).toBeDefined();
  });

  it("sells an asset with sufficient position", async () => {
    const logger = new TestLogger();
    const { buy, sell, wallets, transactions } = makeUseCases(
      makeWallet(10_000),
      1_000,
      logger,
    );
    await buy.execute({ playerId, symbol: "FORT3", quantity: 5 });

    const result = await sell.execute({
      playerId,
      symbol: "FORT3",
      quantity: 2,
    });

    expect(wallets.wallet.account.availableBalance.cents).toBe(7_000);
    expect(wallets.wallet.getPosition("FORT3")?.totalQuantity.units).toBe(3);
    expect(transactions.transactions).toHaveLength(2);
    expect(transactions.transactions[1].type).toBe(TransactionType.SELL);
    expect(result.events[0].type).toBe("AssetSold");
    expect(logger.find("info", "asset_sale_completed")).toBeDefined();
  });

  it("rejects sell above position and keeps state unchanged", async () => {
    const logger = new TestLogger();
    const { buy, sell, wallets, transactions } = makeUseCases(
      makeWallet(10_000),
      1_000,
      logger,
    );
    await buy.execute({ playerId, symbol: "FORT3", quantity: 1 });

    await expect(
      sell.execute({ playerId, symbol: "FORT3", quantity: 2 }),
    ).rejects.toBeInstanceOf(InsufficientPositionError);

    try {
      await sell.execute({ playerId, symbol: "FORT3", quantity: 2 });
    } catch (error) {
      expect((error as InsufficientPositionError).events[0].type).toBe(
        "SellRejectedInsufficientPosition",
      );
    }

    expect(wallets.wallet.account.availableBalance.cents).toBe(9_000);
    expect(wallets.wallet.getPosition("FORT3")?.totalQuantity.units).toBe(1);
    expect(transactions.transactions).toHaveLength(1);
    expect(
      logger.find("warn", "asset_sale_blocked_insufficient_position"),
    ).toBeDefined();
  });

  it("collects income once", async () => {
    const logger = new TestLogger();
    const wallet = makeWallet(1_000);
    const incomeEvent = new IncomeEvent(
      "income-1",
      asset,
      MoneyCents.fromCents(250),
      now,
    );
    const wallets = new InMemoryWalletRepository(wallet);
    const incomeEvents = new InMemoryIncomeEventRepository(incomeEvent);
    const transactions = new InMemoryTransactionRepository();
    const collect = new CollectIncomeUseCase(
      wallets,
      incomeEvents,
      transactions,
      clock,
      idGenerator,
      logger,
    );

    const result = await collect.execute({
      playerId,
      incomeEventId: "income-1",
    });

    expect(wallet.account.availableBalance.cents).toBe(1_250);
    expect(incomeEvent.isCollected).toBe(true);
    expect(transactions.transactions[0].type).toBe(TransactionType.INCOME);
    expect(result.events[0].type).toBe("IncomeCollected");
    expect(logger.find("info", "income_collected")).toBeDefined();
  });

  it("rejects duplicated income collection without duplicating transaction", async () => {
    const logger = new TestLogger();
    const wallet = makeWallet(1_000);
    const incomeEvent = new IncomeEvent(
      "income-1",
      asset,
      MoneyCents.fromCents(250),
      now,
      true,
    );
    const collect = new CollectIncomeUseCase(
      new InMemoryWalletRepository(wallet),
      new InMemoryIncomeEventRepository(incomeEvent),
      new InMemoryTransactionRepository(),
      clock,
      idGenerator,
      logger,
    );

    await expect(
      collect.execute({ playerId, incomeEventId: "income-1" }),
    ).rejects.toBeInstanceOf(IncomeAlreadyCollectedError);

    expect(wallet.account.availableBalance.cents).toBe(1_000);
    expect(
      logger.find("warn", "income_collection_blocked_already_collected"),
    ).toBeDefined();
  });

  it("logs ERROR when repository persistence fails", async () => {
    const logger = new TestLogger();
    const buy = new BuyAssetUseCase(
      new InMemoryAssetRepository([asset]),
      new InMemoryWalletRepository(makeWallet(10_000)),
      new StaticMarketPriceProvider({ FORT3: 1_000 }),
      new FailingTransactionRepository(),
      clock,
      idGenerator,
      logger,
    );

    await expect(
      buy.execute({ playerId, symbol: "FORT3", quantity: 1 }),
    ).rejects.toThrow("database down");

    expect(logger.find("error", "player_repository_save_failed")).toBeDefined();
  });

  it("calculates total equity as cash plus market value of positions", async () => {
    const { buy, summary } = makeUseCases(makeWallet(10_000), 1_000);
    await buy.execute({ playerId, symbol: "FORT3", quantity: 2 });

    const result = await summary.execute(playerId);

    expect(result.availableBalance.cents).toBe(8_000);
    expect(result.investedValue.cents).toBe(2_000);
    expect(result.totalEquity.cents).toBe(10_000);
  });

  it("calculates weighted average price with deterministic half-up rounding", async () => {
    const setup = makeUseCases(makeWallet(10_000), 1_000);
    await setup.buy.execute({ playerId, symbol: "FORT3", quantity: 2 });
    const second = makeUseCases(setup.wallets.wallet, 1_003);
    await second.buy.execute({ playerId, symbol: "FORT3", quantity: 1 });

    expect(
      second.wallets.wallet.getPosition("FORT3")?.averagePriceCents.cents,
    ).toBe(1_001);
  });

  it("keeps money in integer cents and rejects floats as source values", () => {
    expect(() => MoneyCents.fromCents(1.5)).toThrow("safe integer");
    expect(MoneyCents.fromCents(199).add(MoneyCents.fromCents(1)).cents).toBe(
      200,
    );
  });

  it("returns deterministic allocation by asset type using basis points", async () => {
    const { buy, allocation } = makeUseCases(makeWallet(10_000), 1_000);
    await buy.execute({ playerId, symbol: "FORT3", quantity: 4 });

    const result = await allocation.execute(playerId);

    expect(result).toEqual([
      {
        assetType: AssetType.STOCK,
        value: MoneyCents.fromCents(4_000),
        percentageBasisPoints: 10000,
      },
    ]);
  });
});
