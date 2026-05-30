import { apiClient } from "./apiClient.js";
import { getAssets } from "./assetApi.js";
import type { Portfolio, PortfolioAllocation, Position, Wallet } from "../types/wallet.js";

type PortfolioPositionResponse = {
  assetId: string;
  symbol: string;
  name: string;
  quantity: string;
  averagePriceCents: number;
  currentPriceCents: number;
  investedValueCents: number;
  marketValueCents: number;
  unrealizedResultCents: number;
};

type PortfolioResponse = {
  playerId: string;
  positions: PortfolioPositionResponse[];
  totalInvestedCents: number;
  totalMarketValueCents: number;
};

type AllocationResponse = {
  playerId: string;
  byAssetType: Array<{
    assetType?: string;
    valueCents: number;
    basisPoints: number;
  }>;
  byAsset: Array<{
    assetId?: string;
    symbol?: string;
    valueCents: number;
    basisPoints: number;
  }>;
};

export function getWallet(playerId: string): Promise<Wallet> {
  return apiClient<Wallet>(playerId === "me" ? "/me/wallet" : `/players/${playerId}/wallet`);
}

export async function getPortfolio(playerId: string): Promise<Portfolio> {
  const [portfolio, assets] = await Promise.all([
    apiClient<PortfolioResponse>(
      playerId === "me" ? "/me/portfolio" : `/players/${playerId}/portfolio`,
    ),
    getAssets(),
  ]);
  const typeByAsset = new Map(assets.map((asset) => [asset.id, asset.type]));
  const positions: Position[] = portfolio.positions.map((position) => ({
    assetId: position.assetId,
    symbol: position.symbol,
    name: position.name,
    assetType: typeByAsset.get(position.assetId) ?? "UNKNOWN",
    quantity: Number.parseInt(position.quantity, 10),
    averagePriceCents: position.averagePriceCents,
    currentPriceCents: position.currentPriceCents,
    investedValueCents: position.investedValueCents,
    currentValueCents: position.marketValueCents,
    unrealizedResultCents: position.unrealizedResultCents,
    incomeCents: 0,
  }));
  return {
    playerId: portfolio.playerId,
    positions,
    totalInvestedCents: portfolio.totalInvestedCents,
    totalMarketValueCents: portfolio.totalMarketValueCents,
  };
}

export async function getPortfolioAllocation(
  playerId: string,
): Promise<PortfolioAllocation> {
  const response = await apiClient<AllocationResponse>(
    playerId === "me"
      ? "/me/portfolio/allocation"
      : `/players/${playerId}/portfolio/allocation`,
  );
  return {
    playerId: response.playerId,
    byAssetType: response.byAssetType.map((item) => ({
      assetType: item.assetType,
      valueCents: item.valueCents,
      basisPoints: item.basisPoints,
      percentage: item.basisPoints / 100,
    })),
    byAsset: response.byAsset.map((item) => ({
      assetId: item.assetId,
      symbol: item.symbol,
      valueCents: item.valueCents,
      basisPoints: item.basisPoints,
      percentage: item.basisPoints / 100,
    })),
  };
}
