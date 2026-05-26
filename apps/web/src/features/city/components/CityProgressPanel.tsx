import { formatMoney } from "../../../financial/money.js";
import type { CityDistrict, CityViewModel } from "../domain/cityTypes.js";
import { CityStatusBadge } from "./CityStatusBadge.js";

export function CityProgressPanel({
  city,
  selectedDistrict,
}: {
  city: CityViewModel;
  selectedDistrict: CityDistrict;
}) {
  return (
    <aside className="city-detail-panel">
      <div className="section-heading">
        <div>
          <span className="section-kicker">Mapa financeiro</span>
          <h2>Nivel {city.cityLevel}</h2>
        </div>
        <CityStatusBadge state={selectedDistrict.state} />
      </div>
      <dl className="data-grid city-data-grid">
        <div>
          <dt>Patrimonio visualizado</dt>
          <dd>{formatMoney(city.totalNetWorthCents)}</dd>
        </div>
        <div>
          <dt>Maturidade</dt>
          <dd>{city.maturityLabel}</dd>
        </div>
        <div>
          <dt>Distritos ativos</dt>
          <dd>{city.unlockedDistrictCount}</dd>
        </div>
        <div>
          <dt>Rendimentos</dt>
          <dd>{city.hasYieldToCollect ? "Para revisar" : "Sem pendencias"}</dd>
        </div>
      </dl>
      <div className="city-selected-district">
        <span className="section-kicker">Distrito selecionado</span>
        <h3>{selectedDistrict.name}</h3>
        <p>{selectedDistrict.description}</p>
        {selectedDistrict.mentorHint ? (
          <p className="educational-note">{selectedDistrict.mentorHint}</p>
        ) : null}
      </div>
      <div className="city-message-list">
        <strong>Alertas educativos</strong>
        {city.alerts.length === 0 ? (
          <span>Nenhum alerta prioritario neste momento.</span>
        ) : (
          city.alerts.map((alert) => <span key={alert}>{alert}</span>)
        )}
      </div>
      <div className="city-message-list">
        <strong>Destaques</strong>
        {city.highlights.length === 0 ? (
          <span>A cidade esta pronta para os proximos passos.</span>
        ) : (
          city.highlights.map((highlight) => <span key={highlight}>{highlight}</span>)
        )}
      </div>
    </aside>
  );
}
