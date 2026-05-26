import { useState } from "react";
import "../styles/city.css";
import { cityMockState } from "../data/cityMockState.js";
import type { CityFinancialSnapshot } from "../domain/cityTypes.js";
import { useCityState } from "../hooks/useCityState.js";
import { CityProgressPanel } from "./CityProgressPanel.js";
import { IsometricMap } from "./IsometricMap.js";

export function FortunaCity({
  snapshot = cityMockState,
}: {
  snapshot?: CityFinancialSnapshot;
}) {
  const city = useCityState(snapshot);
  const firstUnlocked =
    city.districts.find((district) => district.unlocked) ?? city.districts[0];
  const [selectedDistrictId, setSelectedDistrictId] = useState(firstUnlocked.id);
  const selectedDistrict =
    city.districts.find((district) => district.id === selectedDistrictId) ??
    firstUnlocked;

  return (
    <section className="panel fortuna-city">
      <header className="fortuna-city-header">
        <div>
          <span className="section-kicker">Cidade Fortuna</span>
          <h2>Cidade que cresce com aprendizado</h2>
          <p>
            Um mapa visual da carteira, maturidade e missoes. A cidade apenas
            reage aos dados do jogo; validacoes financeiras continuam no dominio.
          </p>
        </div>
        <strong>{city.maturityLabel}</strong>
      </header>
      <div className="fortuna-city-layout">
        <IsometricMap
          districts={city.districts}
          selectedDistrictId={selectedDistrict.id}
          onSelectDistrict={setSelectedDistrictId}
        />
        <CityProgressPanel city={city} selectedDistrict={selectedDistrict} />
      </div>
      <footer className="mentor-city-footer">
        <strong>Mentor Fortuna</strong>
        <span>{city.mentorMessage}</span>
      </footer>
    </section>
  );
}
