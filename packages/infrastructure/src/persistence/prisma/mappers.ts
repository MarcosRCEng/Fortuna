import {
  Asset,
  AssetSymbol,
  AssetType,
  IncomeEvent,
  MarketPrice,
  MoneyCents,
  PlayerAccount,
  Position,
  Quantity,
  RiskLevel,
  Transaction,
  TransactionType,
  Wallet,
} from "@fortuna/domain";

export interface AssetRecord {
  id: string;
  symbol: string;
  name: string;
  assetType: string;
  riskLevel: string;
  isActive: boolean;
}

export interface PositionRecord {
  asset: AssetRecord;
  quantity: number;
  averagePriceCents: bigint | number;
}

export interface WalletRecord {
  id: string;
  playerId: string;
  availableBalanceCents: bigint | number;
  positions?: PositionRecord[];
}

export interface TransactionRecord {
  id: string;
  playerId: string;
  transactionType: string;
  asset?: AssetRecord | null;
  quantity?: number | null;
  unitPriceCents?: bigint | number | null;
  netAmountCents: bigint | number;
  occurredAt: Date;
  balanceAfterCents: bigint | number;
  metadata?: unknown;
}

export interface MarketPriceRecord {
  asset: AssetRecord;
  priceCents: bigint | number;
  referenceDatetime: Date;
}

export interface IncomeEventRecord {
  id: string;
  asset: AssetRecord;
  amountCents: bigint | number;
  dueDate: Date;
  status: string;
}

export function centsToNumber(value: bigint | number): number {
  const numberValue = typeof value === "bigint" ? Number(value) : value;
  if (!Number.isSafeInteger(numberValue)) {
    throw new Error("Database money value exceeds JavaScript safe integer.");
  }
  return numberValue;
}

export function toAsset(record: AssetRecord): Asset {
  return new Asset(
    record.id,
    AssetSymbol.create(record.symbol),
    record.name,
    record.assetType as AssetType,
    record.riskLevel as RiskLevel,
    record.isActive,
  );
}

export function toWallet(record: WalletRecord): Wallet {
  return new Wallet(
    record.id,
    new PlayerAccount(
      record.playerId,
      MoneyCents.fromCents(centsToNumber(record.availableBalanceCents)),
    ),
    (record.positions ?? [])
      .filter((position) => position.quantity > 0)
      .map(
        (position) =>
          new Position(
            toAsset(position.asset),
            Quantity.fromUnits(position.quantity),
            MoneyCents.fromCents(centsToNumber(position.averagePriceCents)),
          ),
      ),
  );
}

export function toTransaction(record: TransactionRecord): Transaction {
  const type =
    record.transactionType === "INCOME_COLLECTED"
      ? TransactionType.INCOME
      : (record.transactionType as TransactionType);

  return {
    id: record.id,
    playerId: record.playerId,
    type,
    ...(record.asset ? { asset: toAsset(record.asset) } : {}),
    ...(record.quantity ? { quantity: Quantity.fromUnits(record.quantity) } : {}),
    ...(record.unitPriceCents !== null && record.unitPriceCents !== undefined
      ? {
          unitPrice: MoneyCents.fromCents(centsToNumber(record.unitPriceCents)),
        }
      : {}),
    total: MoneyCents.fromCents(centsToNumber(record.netAmountCents)),
    occurredAt: record.occurredAt,
    balanceAfter: MoneyCents.fromCents(
      centsToNumber(record.balanceAfterCents),
    ),
    ...(isStringRecord(record.metadata) ? { metadata: record.metadata } : {}),
  };
}

export function toMarketPrice(record: MarketPriceRecord): MarketPrice {
  return new MarketPrice(
    toAsset(record.asset),
    MoneyCents.fromCents(centsToNumber(record.priceCents)),
    record.referenceDatetime,
  );
}

export function toIncomeEvent(record: IncomeEventRecord): IncomeEvent {
  return new IncomeEvent(
    record.id,
    toAsset(record.asset),
    MoneyCents.fromCents(centsToNumber(record.amountCents)),
    record.dueDate,
    record.status === "COLLECTED",
  );
}

export function transactionTypeToDatabase(type: TransactionType): string {
  return type === TransactionType.INCOME ? "INCOME_COLLECTED" : type;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((item) => typeof item === "string");
}
