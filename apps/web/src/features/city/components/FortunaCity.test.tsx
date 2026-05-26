import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FortunaCity } from "./FortunaCity.js";

describe("FortunaCity", () => {
  it("renders the city without crashing", () => {
    const html = renderToStaticMarkup(<FortunaCity />);

    expect(html).toContain("Cidade Fortuna");
    expect(html).toContain("Mapa isometrico");
  });

  it("renders the main MVP districts and visual states", () => {
    const html = renderToStaticMarkup(<FortunaCity />);

    expect(html).toContain("Distrito Seguro");
    expect(html).toContain("Renda Fixa");
    expect(html).toContain("Distrito Empresarial");
    expect(html).toContain("Academia Fortuna");
    expect(html).toContain("Torre do Mentor");
    expect(html).toContain("Rendimento");
  });

  it("renders educational alerts and yield indicators when applicable", () => {
    const html = renderToStaticMarkup(
      <FortunaCity
        snapshot={{
          cashBalanceCents: 5_000,
          totalNetWorthCents: 100_000,
          assetCount: 1,
          assetClassDistribution: {
            cashPercent: 5,
            fixedIncomePercent: 0,
            realEstatePercent: 0,
            stocksPercent: 95,
          },
          accumulatedYieldCents: 100,
          completedMissions: 0,
          financialMaturityLevel: 1,
          riskLevel: "high",
          hasYieldToCollect: true,
          availableMissions: 1,
        }}
      />,
    );

    expect(html).toContain("Alerta educativo");
    expect(html).toContain("risco elevado");
    expect(html).toContain("rendimentos disponiveis para revisar");
  });
});
