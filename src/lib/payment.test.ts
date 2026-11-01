import { describe, expect, it } from "vitest";
import { bookingTotal, isAcceptedCard, isValidExpiry, MAX_SEATS_PER_RIDE } from "./payment";

describe("payment rules", () => {
  it("a driver can take at most 4 passengers per ride", () => {
    expect(MAX_SEATS_PER_RIDE).toBe(4);
  });

  it("accepts the three test card numbers, with or without spaces", () => {
    expect(isAcceptedCard("4580 0000 0000 0000")).toBe(true);
    expect(isAcceptedCard("5326100000000000")).toBe(true);
    expect(isAcceptedCard("4111-1111-1111-1111")).toBe(true);
  });

  it("declines any other card number", () => {
    expect(isAcceptedCard("4242424242424242")).toBe(false);
    expect(isAcceptedCard("")).toBe(false);
  });

  it("rejects expired cards", () => {
    const now = new Date(2026, 10, 2);
    expect(isValidExpiry("10/26", now)).toBe(false);
    expect(isValidExpiry("11/26", now)).toBe(true);
    expect(isValidExpiry("13/28", now)).toBe(false);
  });

  it("charges price per seat times seats", () => {
    expect(bookingTotal(45, 3)).toBe(135);
  });
});
