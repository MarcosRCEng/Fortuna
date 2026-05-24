import { apiClient } from "./apiClient.js";
import type { Asset, AssetPrice, AssetYield } from "../types/asset.js";

type AssetResponse = {
  id: string;
  symbol: string;
  name: string;
  assetClass: string;
  currentPriceCents: number;
  previousPriceCents?: number;
  variationBps: number;
  riskLevel: string;
  liquidity: string;
  isActive: boolean;
  isMocked: boolean;
  educationalDescription: string;
  updatedAt: string;
};

type AssetDetailsResponse = {
  asset: AssetResponse;
  educationalInfo: {
    longDescription: string;
    riskExplanation: string;
    liquidityExplanation: string;
    mentorHint: string;
  };
};

type ExpectedYieldResponse = {
  description: string;
  amountPerUnitCents?: number;
  rateBps?: number;
};

function mapAsset(response: AssetResponse): Asset {
  return {
    id: response.id,
    symbol: response.symbol,
    name: response.name,
    type: response.assetClass,
    currentPriceCents: response.currentPriceCents,
    previousPriceCents: response.previousPriceCents,
    variationBps: response.variationBps,
    riskLevel: response.riskLevel,
    liquidity: response.liquidity,
    description: response.educationalDescription,
    isActive: response.isActive,
    isMocked: response.isMocked,
    updatedAt: response.updatedAt,
  };
}

export async function getAssets(): Promise<Asset[]> {
  const assets = await apiClient<AssetResponse[]>("/assets");
  return Promise.all(
    assets.filter((asset) => asset.assetClass !== "CASH").map(async (asset) => {
      const mapped = mapAsset(asset);
      try {
        const expectedYield = await getAssetExpectedYield(asset.symbol);
        return {
          ...mapped,
          expectedYieldDescription: expectedYield.description,
          expectedYieldCents: expectedYield.amountPerUnitCents,
          expectedYieldRateBps: expectedYield.rateBps,
        };
      } catch {
        return mapped;
      }
    }),
  );
}

export async function getAsset(assetId: string): Promise<Asset> {
  const details = await apiClient<AssetDetailsResponse>(`/assets/${assetId}`);
  return {
    ...mapAsset(details.asset),
    longDescription: details.educationalInfo.longDescription,
    riskExplanation: details.educationalInfo.riskExplanation,
    liquidityExplanation: details.educationalInfo.liquidityExplanation,
    mentorHint: details.educationalInfo.mentorHint,
  };
}

export function getAssetPrice(assetId: string): Promise<AssetPrice> {
  return apiClient<AssetPrice>(`/assets/${assetId}/price`);
}

export function getAssetYield(assetId: string): Promise<AssetYield> {
  return apiClient<AssetYield>(`/assets/${assetId}/yield`);
}

export function getAssetHistory(assetId: string) {
  return apiClient(`/assets/${assetId}/history`);
}

export function getAssetExpectedYield(
  symbol: string,
): Promise<ExpectedYieldResponse> {
  return apiClient<ExpectedYieldResponse>(`/market/yields/${symbol}`);
}
