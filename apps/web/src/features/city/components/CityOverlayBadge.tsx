import type { CityGridBuilding } from "../data/cityGridLayout.js";

export function CityOverlayBadge({ building }: { building: CityGridBuilding }) {
  const label = building.viewModel.hasAction
    ? building.viewModel.actionLabel ?? "Acao"
    : building.viewModel.alertLabel;

  if (!label) {
    return null;
  }

  return (
    <span
      className={`city-overlay-badge ${
        building.viewModel.hasAction ? "city-overlay-badge-action" : "city-overlay-badge-alert"
      }`}
      style={{
        left: building.screenX,
        top: building.screenY + building.badgeOffsetY,
        zIndex: 200 + building.gridX + building.gridY,
      }}
      data-building-id={building.id}
    >
      {label}
    </span>
  );
}
