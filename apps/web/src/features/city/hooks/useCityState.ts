import { useMemo } from "react";
import { cityMockState } from "../data/cityMockState.js";
import { createCityViewModel } from "../domain/cityViewModel.js";
import type { CityFinancialSnapshot } from "../domain/cityTypes.js";

export function useCityState(snapshot: CityFinancialSnapshot = cityMockState) {
  return useMemo(() => createCityViewModel(snapshot), [snapshot]);
}
