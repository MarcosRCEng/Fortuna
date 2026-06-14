import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "../components/EmptyState.js";
import { ErrorState } from "../components/ErrorState.js";
import { LoadingState } from "../components/LoadingState.js";
import type { MarketCatalogItem } from "../types/market.js";
import { MarketAssetCard } from "./MarketPage.js";

function renderCard(item: MarketCatalogItem, favorite = false) {
  return renderToStaticMarkup(
    <MarketAssetCard
      item={item}
      favorite={favorite}
      disabled={false}
      onFavorite={vi.fn()}
      onBuy={vi.fn()}
    />,
  );
}

describe("MarketAssetCard", () => {
  it("renders type badge and favorite state", () => {
    const html = renderCard(
      {
        symbol: "ITUB4",
        name: "Itau Unibanco PN",
        type: "STOCK",
        group: "EQUITIES",
        sector: "Financeiro",
        priceCents: 3425,
        changePercent: 1.24,
        currency: "BRL",
        tradableInFortuna: true,
      },
      true,
    );

    expect(html).toContain("Acao");
    expect(html).toContain("aria-pressed=\"true\"");
    expect(html).toContain("Alta de 1,24%");
    expect(html).toContain("R$");
  });

  it("renders unavailable price and disables buy when quote is missing", () => {
    const html = renderCard({
      symbol: "HGLG11",
      name: "CSHG Logistica FII",
      type: "FII",
      group: "REAL_ESTATE_FUNDS",
      sector: "Logistica",
      changePercent: -0.5,
      currency: "BRL",
      tradableInFortuna: false,
    });

    expect(html).toContain("Indisponivel");
    expect(html).toContain("Cotacao indisponivel");
    expect(html).toContain("Queda de 0,50%");
    expect(html).toContain("disabled=\"\"");
  });

  it("does not render Pro FII indicators in the basic market card", () => {
    const html = renderCard({
      symbol: "HGLG11",
      name: "CSHG Logistica FII",
      type: "FII",
      group: "REAL_ESTATE_FUNDS",
      sector: "Logistica",
      priceCents: 16250,
      changePercent: 0.08,
      currency: "BRL",
      tradableInFortuna: false,
    });

    expect(html).not.toContain("P/VP");
    expect(html).not.toContain("Dividend yield");
    expect(html).toContain("R$");
  });

  it("renders neutral variation with text, not only color", () => {
    const html = renderCard({
      symbol: "BOVA11",
      name: "iShares Ibovespa ETF",
      type: "ETF",
      group: "EXCHANGE_TRADED_FUNDS",
      priceCents: 12840,
      changePercent: 0,
      currency: "BRL",
      tradableInFortuna: false,
    });

    expect(html).toContain("Estavel em 0,00%");
  });
});

describe("market feedback states", () => {
  it("renders loading, empty and error states accessibly", () => {
    expect(renderToStaticMarkup(<LoadingState />)).toContain("role=\"status\"");
    expect(
      renderToStaticMarkup(
        <EmptyState title="Nenhum ativo" description="Ajuste os filtros." />,
      ),
    ).toContain("Nenhum ativo");
    expect(renderToStaticMarkup(<ErrorState message="Falha controlada." />)).toContain(
      "role=\"alert\"",
    );
  });
});
