import type { CitySummary } from "../../services/types.js";

export function CitySummaryPanel({ city }: { city: CitySummary }) {
  return (
    <section className="panel city-panel">
      <div className="city-visual" aria-hidden="true">
        <span className="tower tower-bank" />
        <span className="tower tower-reserve" />
        <span className="tower tower-market" />
      </div>
      <div className="section-heading">
        <div>
          <span className="section-kicker">Cidade Fortuna</span>
          <h2>Nivel {city.level}: {city.title}</h2>
        </div>
      </div>
      <p>{city.relationText}</p>
      <div className="progress-track">
        <span style={{ width: `${city.progressPercent}%` }} />
      </div>
      <div className="city-columns">
        <div>
          <strong>Areas desbloqueadas</strong>
          {city.unlockedAreas.map((area) => (
            <span key={area}>{area}</span>
          ))}
        </div>
        <div>
          <strong>Proximos desbloqueios</strong>
          {city.nextUnlocks.map((area) => (
            <span key={area}>{area}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
