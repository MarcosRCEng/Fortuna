import { describe, expect, it } from "vitest";
import {
  getMarketAssetEducationContent,
  supportedEducationAssetTypes,
} from "./marketEducationContent.js";

describe("marketEducationContent", () => {
  it("covers every required listed class with structured neutral sections", () => {
    expect(supportedEducationAssetTypes).toEqual([
      "STOCK",
      "UNIT",
      "FII",
      "ETF",
      "BDR",
      "FI_INFRA",
      "FI_AGRO",
      "FIP",
      "FIDC",
    ]);

    for (const type of supportedEducationAssetTypes) {
      const content = getMarketAssetEducationContent(type);
      expect(content?.sections.map((section) => section.key)).toEqual([
        "whatItIs",
        "howItWorks",
        "commonReturns",
        "typicalRisks",
        "liquidity",
        "watchPoints",
      ]);
    }
  });

  it("does not include recommendation wording", () => {
    const text = supportedEducationAssetTypes
      .map((type) => {
        const content = getMarketAssetEducationContent(type);
        return [content?.summary, ...(content?.sections.map((section) => section.body) ?? [])].join(" ");
      })
      .join(" ")
      .toLowerCase();

    const forbidden = [
      ["bom", " investimento"].join(""),
      ["hora", " de comprar"].join(""),
      "oportunidade",
      ["vai", " subir"].join(""),
      "recomendado",
      ["melhor", " ativo"].join(""),
    ];
    for (const phrase of forbidden) {
      expect(text).not.toContain(phrase);
    }
  });
});
