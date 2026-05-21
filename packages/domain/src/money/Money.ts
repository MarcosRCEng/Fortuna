export class Money {
  private constructor(public readonly cents: number) {}

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents)) {
      throw new Error("Money cents must be a safe integer.");
    }

    if (cents < 0) {
      throw new Error("Money cannot be negative.");
    }

    return new Money(cents);
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    if (other.cents > this.cents) {
      throw new Error("Money subtraction cannot produce a negative value.");
    }

    return Money.fromCents(this.cents - other.cents);
  }
}
