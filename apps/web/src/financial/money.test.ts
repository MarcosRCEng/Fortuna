import { describe, expect, it } from "vitest";
import {
  calculateBalanceAfterBuy,
  calculateBalanceAfterSell,
  calculateTradeTotalCents,
  formatFortuna,
  formatMoney,
  parseWholeQuantity,
} from "./money.js";

describe("money helpers", () => {
  it("formats integer cents as Brazilian currency", () => {
    expect(formatMoney(123456).replace(/\s/u, " ")).toBe("R$ 1.234,56");
  });

  it("formats Fortuna coins using the cents contract", () => {
    expect(formatFortuna(10001)).toBe("10.001 moedas Fortuna");
  });

  it("parses only whole quantities", () => {
    expect(parseWholeQuantity("12")).toBe(12);
    expect(parseWholeQuantity("1.5")).toBe(0);
    expect(parseWholeQuantity("abc")).toBe(0);
  });

  it("calculates trade totals with integer cents", () => {
    expect(calculateTradeTotalCents(10012, 3)).toBe(30036);
  });

  it("calculates balances after buy and sell without floats", () => {
    expect(calculateBalanceAfterBuy(50000, 30036)).toBe(19964);
    expect(calculateBalanceAfterSell(50000, 30036)).toBe(80036);
  });
});
