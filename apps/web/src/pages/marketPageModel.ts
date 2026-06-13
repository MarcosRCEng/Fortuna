import type {
  MarketAssetGroup,
  MarketAssetType,
  MarketCatalogItem,
  MarketCatalogSortBy,
  MarketCatalogSortOrder,
  WatchlistItem,
} from "../types/market.js";
import type { Asset } from "../types/asset.js";
import type { Position } from "../types/wallet.js";

export type MarketViewKey =
  | "all"
  | "equities"
  | "fiis"
  | "etfs"
  | "listed-funds"
  | "bdrs"
  | "watchlist"
  | "portfolio";

export const listedMarketGroups: MarketAssetGroup[] = [
  "EQUITIES",
  "REAL_ESTATE_FUNDS",
  "EXCHANGE_TRADED_FUNDS",
  "OTHER_LISTED_FUNDS",
];

export const groupTypeFilters: Record<MarketViewKey, MarketAssetType[]> = {
  all: ["STOCK", "UNIT", "FII", "ETF", "FI_INFRA", "FI_AGRO", "FIP", "FIDC", "BDR"],
  equities: ["STOCK", "UNIT"],
  fiis: ["FII"],
  etfs: ["ETF"],
  "listed-funds": ["FI_INFRA", "FI_AGRO", "FIP", "FIDC"],
  bdrs: ["BDR"],
  watchlist: [],
  portfolio: [],
};

export function visibleGroupsForView(view: MarketViewKey): MarketAssetGroup[] {
  switch (view) {
    case "equities":
      return ["EQUITIES"];
    case "fiis":
      return ["REAL_ESTATE_FUNDS"];
    case "etfs":
      return ["EXCHANGE_TRADED_FUNDS"];
    case "listed-funds":
      return ["OTHER_LISTED_FUNDS"];
    case "bdrs":
      return ["EQUITIES"];
    case "all":
    case "watchlist":
    case "portfolio":
      return listedMarketGroups;
  }
}

export function isCatalogView(view: MarketViewKey): boolean {
  return view !== "watchlist" && view !== "portfolio";
}

export function formatOptionalMoney(valueCents?: number): string {
  if (!Number.isInteger(valueCents)) {
    return "Indisponivel";
  }
  const cents = valueCents as number;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatChangePercent(value?: number): {
  label: string;
  tone: "positive" | "negative" | "neutral" | "unavailable";
} {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { label: "Variacao indisponivel", tone: "unavailable" };
  }
  if (value > 0) {
    return {
      label: `Alta de ${value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`,
      tone: "positive",
    };
  }
  if (value < 0) {
    return {
      label: `Queda de ${Math.abs(value).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`,
      tone: "negative",
    };
  }
  return { label: "Estavel em 0,00%", tone: "neutral" };
}

export function marketTypeLabel(value: string): string {
  const labels: Record<string, string> = {
    STOCK: "Acao",
    UNIT: "Unit",
    FII: "FII",
    ETF: "ETF",
    FI_INFRA: "FI-Infra",
    FI_AGRO: "Fiagro",
    FIP: "FIP",
    FIDC: "FIDC",
    BDR: "BDR",
    TREASURY: "Tesouro",
    UNKNOWN: "Ativo",
  };
  return labels[value] ?? value;
}

export function mapCatalogItemToAsset(item: MarketCatalogItem): Asset {
  return {
    id: item.symbol,
    symbol: item.symbol,
    name: item.name,
    type: item.type,
    currentPriceCents: item.priceCents ?? 0,
    variationBps:
      typeof item.changePercent === "number"
        ? Math.round(item.changePercent * 100)
        : 0,
    riskLevel: "NONE",
    liquidity: "SIMULATED",
    description: item.sector
      ? `Catalogo de mercado - setor ${item.sector}.`
      : "Catalogo de mercado.",
    isActive: item.tradableInFortuna && item.priceCents !== undefined,
    isMocked: true,
    updatedAt: new Date().toISOString(),
  };
}

export function watchlistItemToCatalogItem(item: WatchlistItem): MarketCatalogItem {
  return {
    symbol: item.symbol,
    name: item.name ?? item.symbol,
    type: item.type,
    group: item.group,
    priceCents: item.priceCents,
    changePercent: item.changePercent,
    currency: "BRL",
    tradableInFortuna: item.type === "STOCK" && item.priceCents !== undefined,
  };
}

export function positionToCatalogItem(position: Position): MarketCatalogItem {
  return {
    symbol: position.symbol,
    name: position.name,
    type: position.assetType as MarketAssetType,
    group: groupForType(position.assetType as MarketAssetType),
    priceCents: position.currentPriceCents,
    changePercent: undefined,
    currency: "BRL",
    tradableInFortuna: true,
  };
}

export function filterPersonalItems(
  items: MarketCatalogItem[],
  search: string,
  type: MarketAssetType | "",
  sector: string,
): MarketCatalogItem[] {
  const normalizedSearch = search.trim().toUpperCase();
  const normalizedSector = sector.trim().toUpperCase();
  return items.filter((item) => {
    const matchesSearch =
      !normalizedSearch ||
      item.symbol.includes(normalizedSearch) ||
      item.name.toUpperCase().includes(normalizedSearch);
    const matchesType = !type || item.type === type;
    const matchesSector =
      !normalizedSector ||
      item.sector?.toUpperCase().includes(normalizedSector);
    return matchesSearch && matchesType && matchesSector;
  });
}

export function sortPersonalItems(
  items: MarketCatalogItem[],
  sortBy: MarketCatalogSortBy,
  sortOrder: MarketCatalogSortOrder,
): MarketCatalogItem[] {
  const direction = sortOrder === "asc" ? 1 : -1;
  return [...items].sort((left, right) => {
    const leftValue = sortValue(left, sortBy);
    const rightValue = sortValue(right, sortBy);
    if (leftValue === undefined && rightValue === undefined) {
      return left.symbol.localeCompare(right.symbol);
    }
    if (leftValue === undefined) {
      return 1;
    }
    if (rightValue === undefined) {
      return -1;
    }
    const comparison =
      typeof leftValue === "string" && typeof rightValue === "string"
        ? leftValue.localeCompare(rightValue)
        : Number(leftValue) - Number(rightValue);
    return comparison * direction;
  });
}

function sortValue(
  item: MarketCatalogItem,
  sortBy: MarketCatalogSortBy,
): string | number | undefined {
  switch (sortBy) {
    case "name":
      return item.name;
    case "price":
      return item.priceCents;
    case "changePercent":
      return item.changePercent;
    case "volume":
      return item.volume;
    case "marketCap":
      return item.marketCapCents;
  }
}

function groupForType(type: MarketAssetType): MarketAssetGroup {
  if (type === "STOCK" || type === "UNIT" || type === "BDR") {
    return "EQUITIES";
  }
  if (type === "FII") {
    return "REAL_ESTATE_FUNDS";
  }
  if (type === "ETF") {
    return "EXCHANGE_TRADED_FUNDS";
  }
  if (type === "FI_INFRA" || type === "FI_AGRO" || type === "FIP" || type === "FIDC") {
    return "OTHER_LISTED_FUNDS";
  }
  if (type === "TREASURY") {
    return "FIXED_INCOME";
  }
  return "UNKNOWN";
}
