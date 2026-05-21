import type { FinancialEvent } from "@fortuna/domain";

export interface UseCaseResult<T> {
  data: T;
  events: FinancialEvent[];
}
