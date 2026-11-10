import { expect, it } from "vitest";
import {
  createTripSetupSchema,
  formPayload,
  dateBounds,
  cleanText,
  CURRENCIES,
} from "./schemas.js";
const schema = createTripSetupSchema("2026-11-11");
const valid = { destination: "Delhi", originCity: "Guwahati", days: 3 };
it.each([
  ["days", 1, 14],
  ["adults", 1, 9],
  ["children", 0, 9],
  ["rooms", 1, 9],
  ["budget", 0, 10000000],
])("enforces all %s numeric boundaries", (field, min, max) => {
  for (const value of [min, max])
    expect(schema.safeParse({ ...valid, [field]: value }).success).toBe(true);
  for (const value of [
    min - 1,
    max + 1,
    1.5,
    null,
    [],
    {},
    NaN,
    Infinity,
    "1e3",
    " 5 ",
    "٥",
    "5",
  ])
    expect(schema.safeParse({ ...valid, [field]: value }).success).toBe(false);
});
it.each([
  ["destination", 100],
  ["originCity", 100],
  ["nearestAirport", 100],
  ["nearestStation", 100],
  ["anythingElse", 300],
  ["foodOther", 50],
])("enforces %s text limits", (field, max) => {
  expect(schema.safeParse({ ...valid, [field]: "a".repeat(max) }).success).toBe(
    true,
  );
  expect(
    schema.safeParse({ ...valid, [field]: "a".repeat(max + 1) }).success,
  ).toBe(false);
  for (const value of [null, [], {}, 42])
    expect(schema.safeParse({ ...valid, [field]: value }).success).toBe(false);
});
it("normalizes notes and required text without allowing whitespace-only places", () => {
  expect(cleanText("  a\u0000\t b\n c  ")).toBe("a b c");
  expect(
    schema.parse({ ...valid, anythingElse: " a\n\t b " }).anythingElse,
  ).toBe("a b");
  expect(schema.safeParse({ ...valid, originCity: " \t\n " }).success).toBe(
    false,
  );
});
it.each(["2026-02-30", "2026-11-10", "2027-11-12", "not-a-date", null, [], {}])(
  "rejects invalid/out-of-range date %j",
  (value) =>
    expect(schema.safeParse({ ...valid, startDate: value }).success).toBe(
      false,
    ),
);
it.each(["2026-11-11", "2027-11-11", ""])(
  "accepts date boundary %s",
  (startDate) =>
    expect(schema.safeParse({ ...valid, startDate }).success).toBe(true),
);
it("rejects unknown keys and enum values", () => {
  for (const extra of [
    { description: "legacy" },
    { unexpected: true },
    { pace: "fast" },
    { foodPreference: "anything" },
    { interests: ["temples"] },
    { currency: "ZZZ" },
  ])
    expect(schema.safeParse({ ...valid, ...extra }).success).toBe(false);
  expect(
    CURRENCIES.every((c) => Intl.supportedValuesOf("currency").includes(c)),
  ).toBe(true);
});
it("adapts only canonical UI digit strings, not invalid API types", () => {
  expect(formPayload({ ...valid, adults: "5", rooms: "", budget: "" })).toEqual(
    { ...valid, adults: 5 },
  );
  expect(
    schema.safeParse(formPayload({ ...valid, adults: "1e3" })).success,
  ).toBe(false);
  expect(dateBounds("2026-11-11")).toEqual({
    min: "2026-11-11",
    max: "2027-11-11",
  });
});
