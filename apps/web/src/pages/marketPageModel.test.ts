import { describe, expect, it } from "vitest";
import type { MarketCatalogItem } from "../types/market.js";
import {
  filterPersonalItems,
  formatChangePercent,
  formatOptionalMoney,
  groupTypeFilters,
  sortPersonalItems,
  visibleGroupsForView,
} from "./marketPageModel.js";

const items: MarketCatalogItem[] = [
  {
    symbol: "ITUB4",
    name: "Itau Unibanco PN",
    type: "STOCK",
    group: "EQUITIES",
    sector: "Financeiro",
    priceCents: 3425,
    changePercent: 1.24,
    volume: 20,
    currency: "BRL",
    tradableInFortuna: true,
  },
  {
    symbol: "HGLG11",
    name: "CSHG Logistica FII",
    type: "FII",
    group: "REAL_ESTATE_FUNDS",
    sector: "Logistica",
    changePercent: -0.5,
    volume: 5,
    currency: "BRL",
    tradableInFortuna: false,
  },
  {
    symbol: "BOVA11",
    name: "iShares Ibovespa ETF",
    type: "ETF",
    group: "EXCHANGE_TRADED_FUNDS",
    sector: "Indice",
    priceCents: 12840,
    changePercent: 0,
    volume: 10,
    currency: "BRL",
    tradableInFortuna: false,
  },
];

describe("marketPageModel", () => {
  it("formats unavailable price without turning it into zero", () => {
    expect(formatOptionalMoney(undefined)).toBe("Indisponivel");
  });

  it("distinguishes positive, negative and neutral changes semantically", () => {
    expect(formatChangePercent(1.24)).toMatchObject({ tone: "positive" });
    expect(formatChangePercent(-0.5)).toMatchObject({ tone: "negative" });
    expect(formatChangePercent(0)).toMatchObject({ tone: "neutral" });
  });

  it("filters personal lists by search, type and sector", () => {
    expect(filterPersonalItems(items, "itub", "", "")).toHaveLength(1);
    expect(filterPersonalItems(items, "", "FII", "")[0]?.symbol).toBe("HGLG11");
    expect(filterPersonalItems(items, "", "", "Indice")[0]?.symbol).toBe("BOVA11");
  });

  it("sorts missing numeric indicators after available values", () => {
    expect(sortPersonalItems(items, "price", "asc").map((item) => item.symbol)).toEqual([
      "ITUB4",
      "BOVA11",
      "HGLG11",
    ]);
  });

  it("keeps treasury out of active catalog groups", () => {
    expect(groupTypeFilters.all).not.toContain("TREASURY");
    expect(visibleGroupsForView("all")).not.toContain("FIXED_INCOME");
  });
});
