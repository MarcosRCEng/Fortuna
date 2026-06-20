import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { EmptyState } from "../components/EmptyState.js";
import { ErrorState } from "../components/ErrorState.js";
import { LoadingState } from "../components/LoadingState.js";
import type { MarketCatalogItem } from "../types/market.js";
import { EducationalTrendPanel, MarketAssetCard } from "./MarketPage.js";

function renderCard(item: MarketCatalogItem, favorite = false) {
  return renderToStaticMarkup(
    <MarketAssetCard
      item={item}
      favorite={favorite}
      disabled={false}
      onFavorite={vi.fn()}
      onBuy={vi.fn()}
      onOpenDetails={vi.fn()}
      onLoadTrend={vi.fn()}
    />,
  );
}

const baseTrend = {
  symbol: "ITUB4",
  classification: "MOMENTO_POSITIVO" as const,
  score: 34,
  confidence: "MEDIUM" as const,
  factors: [
    {
      code: "SHORT_TREND",
      label: "Comportamento recente do preco",
      impact: "POSITIVE" as const,
      explanation: "A janela curta variou +3.20%.",
    },
    {
      code: "PORTFOLIO_PRESENCE",
      label: "Presenca na carteira",
      impact: "NEUTRAL" as const,
      explanation: "O ativo ja faz parte da carteira simulada.",
    },
    {
      code: "VOLATILITY",
      label: "Volatilidade recente",
      impact: "NEGATIVE" as const,
      explanation: "A oscilacao media estimada foi 3.70%.",
    },
  ],
  warnings: ["Concentracao elevada no ativo; alerta educativo."],
  dataAsOf: "2026-06-14T12:00:00.000Z",
  methodologyVersion: "educational-trend-v1",
  disclaimer:
    "Conteudo educacional. Nao e recomendacao financeira, nao preve desempenho futuro.",
};

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
    expect(html).toContain('aria-pressed="true"');
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
    expect(html).toContain('disabled=""');
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

describe("EducationalTrendPanel", () => {
  it("renders positive classification with confidence, disclaimer and methodology", () => {
    const html = renderToStaticMarkup(
      <EducationalTrendPanel
        symbol="ITUB4"
        trend={baseTrend}
        loading={false}
        onLoad={vi.fn()}
      />,
    );

    expect(html).toContain("Tendencia educacional");
    expect(html).toContain("Positivo");
    expect(html).toContain("Confianca");
    expect(html).toContain("Media");
    expect(html).toContain("Como foi calculado?");
    expect(html).toContain("educational-trend-v1");
    expect(html).toContain("Conteudo educacional");
  });

  it("keeps negative, neutral and attention factors legible", () => {
    const html = renderToStaticMarkup(
      <EducationalTrendPanel
        symbol="ITUB4"
        trend={baseTrend}
        loading={false}
        onLoad={vi.fn()}
      />,
    );

    expect(html).toContain("Fatores positivos");
    expect(html).toContain("Fatores neutros");
    expect(html).toContain("Fatores de atencao");
    expect(html).toContain("Alertas de concentracao e dados");
  });

  it("renders insufficient data as an explanatory card", () => {
    const html = renderToStaticMarkup(
      <EducationalTrendPanel
        symbol="XPTO11"
        trend={{
          ...baseTrend,
          symbol: "XPTO11",
          classification: "DADOS_INSUFICIENTES",
          score: 0,
          confidence: "LOW",
          factors: [
            {
              code: "HISTORY_TOO_SHORT",
              label: "Historico curto",
              impact: "NEGATIVE",
              explanation: "Ha poucos fechamentos para comparar janelas.",
            },
          ],
          warnings: [],
        }}
        loading={false}
        onLoad={vi.fn()}
      />,
    );

    expect(html).toContain("Dados insuficientes");
    expect(html).toContain("sem inventar score");
    expect(html).toContain("Baixa");
  });

  it("does not expose forbidden recommendation labels in the scale", () => {
    const html = renderToStaticMarkup(
      <EducationalTrendPanel
        symbol="ITUB4"
        trend={baseTrend}
        loading={false}
        onLoad={vi.fn()}
      />,
    );

    expect(html).not.toMatch(
      /compra forte|venda forte|compre|venda|manutencao/i,
    );
    expect(html).toContain("Muito negativo");
    expect(html).toContain("Muito positivo");
  });
});

describe("market feedback states", () => {
  it("renders loading, empty and error states accessibly", () => {
    expect(renderToStaticMarkup(<LoadingState />)).toContain('role="status"');
    expect(
      renderToStaticMarkup(
        <EmptyState title="Nenhum ativo" description="Ajuste os filtros." />,
      ),
    ).toContain("Nenhum ativo");
    expect(
      renderToStaticMarkup(<ErrorState message="Falha controlada." />),
    ).toContain('role="alert"');
  });
});
