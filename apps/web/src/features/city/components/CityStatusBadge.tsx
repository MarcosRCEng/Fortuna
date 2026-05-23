import type { CityVisualState } from "../domain/cityTypes.js";

const labels: Record<CityVisualState, string> = {
  locked: "Bloqueado",
  available: "Disponivel",
  upgrading: "Em evolucao",
  upgraded: "Melhorado",
  educational_alert: "Alerta educativo",
  yield_available: "Rendimento",
  mission_available: "Missao",
  mission_completed: "Missao concluida",
};

export function CityStatusBadge({ state }: { state: CityVisualState }) {
  return <span className={`city-status city-status-${state}`}>{labels[state]}</span>;
}
