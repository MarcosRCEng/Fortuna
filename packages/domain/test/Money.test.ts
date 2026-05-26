import { describe, expect, it } from "vitest";
import { Money } from "../src/index.js";

describe("Money", () => {
  it("creates money from integer cents", () => {
    const money = Money.fromCents(100);

    expect(money.cents).toBe(100);
  });

  it("adds and subtracts money without using decimal values", () => {
    const balance = Money.fromCents(250).add(Money.fromCents(50));

    expect(balance.subtract(Money.fromCents(100)).cents).toBe(200);
  });

  it("multiplies by integer quantity and compares values", () => {
    const unitPrice = Money.fromCents(125);
    const total = unitPrice.multiplyByQuantity({ units: 4 });

    expect(total.cents).toBe(500);
    expect(total.compareTo(Money.fromCents(499))).toBeGreaterThan(0);
    expect(total.isGreaterThanOrEqual(Money.fromCents(500))).toBe(true);
  });

  it("formats BRL only as an auxiliary representation", () => {
    expect(Money.fromCents(1234).formatBRL()).toBe("R$ 12.34");
  });

  it("rejects decimal, unsafe, and negative cents", () => {
    expect(() => Money.fromCents(1.5)).toThrow("safe integer");
    expect(() => Money.fromCents(Number.MAX_SAFE_INTEGER + 1)).toThrow(
      "safe integer",
    );
    expect(() => Money.fromCents(-1)).toThrow("negative");
  });

  it("does not allow subtraction below zero", () => {
    expect(() => Money.fromCents(100).subtract(Money.fromCents(101))).toThrow(
      "negative",
    );
  });
});
