import { describe, expect, it } from "vitest";
import { validateTripInput } from "./validator.js";

describe("validateTripInput", () => {
  it("accepts valid trip parameters and sanitizes values", () => {
    const result = validateTripInput({
      destination: "   Kyoto, Japan   ",
      days: 5,
      budget: "1500",
      currency: "jpy",
      interests: "  temples, tea, food  ",
    });

    expect(result.valid).toBe(true);
    expect(result.data).toEqual({
      destination: "Kyoto, Japan",
      days: 5,
      budget: 1500,
      currency: "JPY",
      interests: "temples, tea, food",
    });
  });

  it("rejects non-object bodies, arrays, and null", () => {
    expect(validateTripInput(null).valid).toBe(false);
    expect(validateTripInput([]).valid).toBe(false);
    expect(validateTripInput("string").valid).toBe(false);
    expect(validateTripInput(123).valid).toBe(false);
  });

  it("rejects missing, empty, or whitespace-only destination", () => {
    expect(validateTripInput({}).valid).toBe(false);
    expect(validateTripInput({ destination: "" }).valid).toBe(false);
    expect(validateTripInput({ destination: "    " }).valid).toBe(false);
  });

  it("rejects destination longer than 1000 characters", () => {
    const longDestination = "A".repeat(1001);
    const result = validateTripInput({ destination: longDestination });
    expect(result.valid).toBe(false);
    expect(result.error).toContain("1000 characters");
  });

  it("rejects interests longer than 500 characters or non-string", () => {
    const longInterests = "B".repeat(501);
    expect(validateTripInput({ destination: "Paris", interests: longInterests }).valid).toBe(false);
    expect(validateTripInput({ destination: "Paris", interests: 123 }).valid).toBe(false);
  });

  it("validates trip days bounds (1 to 14) and rejects non-integers", () => {
    expect(validateTripInput({ destination: "Rome", days: 0 }).valid).toBe(false);
    expect(validateTripInput({ destination: "Rome", days: 31 }).valid).toBe(false);
    expect(validateTripInput({ destination: "Rome", days: 3.5 }).valid).toBe(false);
    expect(validateTripInput({ destination: "Rome", days: "five" }).valid).toBe(false);
    expect(validateTripInput({ destination: "Rome", days: 1 }).valid).toBe(true);
    expect(validateTripInput({ destination: "Rome", days: 14 }).valid).toBe(true);
  });

  it("validates currency codes and rejects invalid formats", () => {
    expect(validateTripInput({ destination: "Berlin", currency: "EUR" }).valid).toBe(true);
    expect(validateTripInput({ destination: "Berlin", currency: "US" }).valid).toBe(false);
    expect(validateTripInput({ destination: "Berlin", currency: "USDD" }).valid).toBe(false);
    expect(validateTripInput({ destination: "Berlin", currency: "123" }).valid).toBe(false);
  });

  it("validates budget numbers and rejects negative values", () => {
    expect(validateTripInput({ destination: "Oslo", budget: -10 }).valid).toBe(false);
    expect(validateTripInput({ destination: "Oslo", budget: "abc" }).valid).toBe(false);
    expect(validateTripInput({ destination: "Oslo", budget: 2000000000 }).valid).toBe(false);
    expect(validateTripInput({ destination: "Oslo", budget: 0 }).valid).toBe(true);
  });
});
