import type { IncomeEvent } from "@fortuna/domain";

export interface IncomeEventRepository {
  findById(id: string): Promise<IncomeEvent | undefined>;
  save(incomeEvent: IncomeEvent): Promise<void>;
}
