import type { Cents } from "../financial/money.js";

export type AssetClass = "CASH" | "FIXED_INCOME" | "FII" | "STOCK";
export type RiskLevel = "NONE" | "LOW" | "MEDIUM" | "MEDIUM_HIGH" | "HIGH";
export type LiquidityLevel = "IMMEDIATE" | "DAILY" | "MEDIUM" | "HIGH" | "LOW";
export type MissionStatus = "AVAILABLE" | "IN_PROGRESS" | "COMPLETED";
export type TransactionType = "BUY" | "SELL" | "INCOME" | "MISSION";

export interface Asset {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  currentPriceCents: Cents;
  previousPriceCents?: Cents;
  variationBps: number;
  riskLevel: RiskLevel;
  liquidity: LiquidityLevel;
  priceStatus: "SIMULATED" | "UPDATING";
  dataSource: "MOCK";
  isMocked: boolean;
  isActive: boolean;
  educationalDescription: string;
  yieldRules: string;
  updatedAt: string;
  detail: {
    longDescription: string;
    riskExplanation: string;
    liquidityExplanation: string;
    beginnerTip: string;
    mentorHint: string;
  };
}

export interface Position {
  symbol: string;
  name: string;
  quantity: number;
  averagePriceCents: Cents;
  marketValueCents: Cents;
  assetClass: AssetClass;
  accumulatedIncomeCents: Cents;
}

export interface WalletSummary {
  availableBalanceCents: Cents;
  investedValueCents: Cents;
  totalEquityCents: Cents;
  positionCount: number;
  positions: Position[];
}

export interface IncomeEvent {
  id: string;
  symbol: string;
  assetName: string;
  amountCents: Cents;
  status: "AVAILABLE" | "COLLECTED";
  source: string;
  explanation: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  symbol?: string;
  description: string;
  quantity?: number;
  unitPriceCents?: Cents;
  totalCents: Cents;
  balanceAfterCents: Cents;
  occurredAt: string;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  objective: string;
  educationalExplanation: string;
  rewardLabel: string;
  status: MissionStatus;
  progressCurrent: number;
  progressTarget: number;
}

export interface MentorTip {
  id: string;
  title: string;
  message: string;
  concept: string;
  severity: "INFO" | "WARNING" | "SUCCESS";
}

export interface CitySummary {
  level: number;
  title: string;
  unlockedAreas: string[];
  nextUnlocks: string[];
  relationText: string;
  progressPercent: number;
}

export interface PlayerOverview {
  playerName: string;
  nickname: string;
  wallet: WalletSummary;
  assets: Asset[];
  incomes: IncomeEvent[];
  transactions: Transaction[];
  missions: Mission[];
  mentorTips: MentorTip[];
  city: CitySummary;
  marketUpdating: boolean;
}

export interface TradeRequest {
  symbol: string;
  quantity: number;
}

export interface TradeResult {
  transaction: Transaction;
  wallet: WalletSummary;
  message: string;
}

export interface FortunaFinancialPort {
  getOverview(): Promise<PlayerOverview>;
  buyAsset(request: TradeRequest): Promise<TradeResult>;
  sellAsset(request: TradeRequest): Promise<TradeResult>;
  collectIncome(incomeEventId: string): Promise<TradeResult>;
}
