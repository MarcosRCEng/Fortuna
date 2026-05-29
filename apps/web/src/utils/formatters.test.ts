import { describe, expect, it } from "vitest";
import { transactionTypeLabel } from "./formatters.js";

describe("transactionTypeLabel", () => {
  it("uses friendly labels for financial transactions and game events", () => {
    expect(transactionTypeLabel("BUY")).toBe("Compra");
    expect(transactionTypeLabel("SELL_ORDER_EXECUTED")).toBe("Venda realizada");
    expect(transactionTypeLabel("FIRST_INCOME_COLLECTED")).toBe("Primeiro rendimento");
    expect(transactionTypeLabel("PORTFOLIO_UPDATED")).toBe("Carteira recalculada");
    expect(transactionTypeLabel("EXCESSIVE_CONCENTRATION_DETECTED")).toBe(
      "Concentracao elevada",
    );
    expect(transactionTypeLabel("CONCENTRATION_ALERT_TRIGGERED")).toBe(
      "Alerta de concentracao",
    );
    expect(transactionTypeLabel("MISSION_COMPLETED")).toBe("Missao concluida");
  });

  it("turns unknown technical codes into readable fallback text", () => {
    expect(transactionTypeLabel("CUSTOM_LONG_EVENT_NAME")).toBe(
      "Custom long event name",
    );
  });
});
