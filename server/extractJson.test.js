import { describe, expect, it } from "vitest";
import { extractJson } from "./extractJson.js";

describe("extractJson balanced-brace scanner", () => {
  it("extracts clean JSON wrapped in markdown code fences", () => {
    const markdown = '```json\n{\n  "title": "Kyoto Trip",\n  "days": []\n}\n```';
    expect(extractJson(markdown)).toEqual({
      title: "Kyoto Trip",
      days: [],
    });
  });

  it("extracts JSON with prose commentary before and after", () => {
    const input =
      'Here is the requested itinerary:\n{"title": "Paris Getaway", "days": []}\nHope you enjoy your travel!';
    expect(extractJson(input)).toEqual({
      title: "Paris Getaway",
      days: [],
    });
  });

  it("skips non-JSON braces inside prose like {A} and finds the actual JSON object", () => {
    const input =
      'Consider option {A} or option {B}:\n{"title": "Tokyo Tour", "days": [{"label": "Day 1"}]}';
    expect(extractJson(input)).toEqual({
      title: "Tokyo Tour",
      days: [{ label: "Day 1" }],
    });
  });

  it("handles multiple JSON blocks by returning the first valid top-level object candidate", () => {
    const input =
      'First sample: {"valid": true, "id": 1}\nSecond sample: {"valid": true, "id": 2}';
    expect(extractJson(input)).toEqual({
      valid: true,
      id: 1,
    });
  });

  it("correctly handles curly braces inside string values without corrupting depth", () => {
    const input =
      '{"title": "Temples", "description": "Check the {ancient} gate and {sacred} hall."}';
    expect(extractJson(input)).toEqual({
      title: "Temples",
      description: "Check the {ancient} gate and {sacred} hall.",
    });
  });

  it("correctly handles escaped quotes inside string values", () => {
    const input =
      '{"title": "Art", "description": "A \\"must-see\\" museum."}';
    expect(extractJson(input)).toEqual({
      title: "Art",
      description: 'A "must-see" museum.',
    });
  });

  it("returns null for truncated JSON", () => {
    const input = '{"title": "Incomplete trip", "days": [{"stops": [';
    expect(extractJson(input)).toBeNull();
  });

  it("returns null for empty string, whitespace, non-strings, or non-JSON", () => {
    expect(extractJson("")).toBeNull();
    expect(extractJson("   \n\t  ")).toBeNull();
    expect(extractJson(null)).toBeNull();
    expect(extractJson(undefined)).toBeNull();
    expect(extractJson("No json anywhere here")).toBeNull();
  });
});
