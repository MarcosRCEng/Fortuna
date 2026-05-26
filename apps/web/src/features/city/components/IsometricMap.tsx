import type { CityDistrict as CityDistrictModel } from "../domain/cityTypes.js";
import { CityDistrict } from "./CityDistrict.js";
import { MentorTower } from "./MentorTower.js";

export function IsometricMap({
  districts,
  selectedDistrictId,
  onSelectDistrict,
}: {
  districts: CityDistrictModel[];
  selectedDistrictId: string;
  onSelectDistrict(id: string): void;
}) {
  return (
    <section className="fortuna-city-map" aria-label="Mapa isometrico da Cidade Fortuna">
      <svg className="city-map-grid" viewBox="0 0 760 500" aria-hidden="true">
        <polygon points="380,40 720,210 380,390 40,210" />
        <polyline points="170,145 510,315 590,270 250,100" />
        <polyline points="120,240 450,405 640,305 310,135" />
        <polyline points="270,95 610,265" />
        <polyline points="145,275 485,105" />
      </svg>
      {districts.map((district) =>
        district.type === "mentor" ? (
          <MentorTower
            key={district.id}
            district={district}
            selected={district.id === selectedDistrictId}
            onSelect={() => onSelectDistrict(district.id)}
          />
        ) : (
          <CityDistrict
            key={district.id}
            district={district}
            selected={district.id === selectedDistrictId}
            onSelect={() => onSelectDistrict(district.id)}
          />
        ),
      )}
    </section>
  );
}
