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
