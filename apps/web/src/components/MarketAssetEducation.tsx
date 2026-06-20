import type { MarketAssetType } from "../types/market.js";
import { getMarketAssetEducationContent } from "../pages/marketEducationContent.js";

export function MarketAssetEducation({ type }: { type: MarketAssetType }) {
  const content = getMarketAssetEducationContent(type);
  if (!content) {
    return null;
  }

  return (
    <section className="asset-class-education" aria-labelledby="asset-class-title">
      <div>
        <span className="section-kicker">Classe do ativo</span>
        <h2 id="asset-class-title">Entender {content.label}</h2>
        <p>{content.summary}</p>
      </div>
      <dl>
        {content.sections.map((section) => (
          <div key={section.key}>
            <dt>{section.title}</dt>
            <dd>{section.body}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
