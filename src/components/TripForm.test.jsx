import { clearSearchCache } from "../hooks/useDebouncedSearch.js";
import React from "react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { TripForm } from "../features/setup/TripForm.jsx";
import {
  CURRENCIES,
  PACES,
  FOOD_PREFERENCES,
  INTERESTS,
  tripSetupSchema,
} from "../../shared/schemas.js";
afterEach(cleanup);
function Form() {
  const [values, setValues] = useState({
    ...tripSetupSchema.parse({
      destination: "Delhi",
      originCity: "Guwahati",
      days: 3,
    }),
    rooms: "",
    budget: "",
  });
  return <TripForm values={values} onChange={setValues} onSubmit={() => {}} />;
}
it("renders selects and interests directly from shared enum lists", () => {
  render(<Form />);
  for (const [label, list] of [
    ["Currency", CURRENCIES],
    ["Travel pace", PACES],
    ["Food preference", FOOD_PREFERENCES],
  ])
    expect(
      [...screen.getByLabelText(label).options].map((o) => o.value),
    ).toEqual([...list]);
  for (const interest of INTERESTS)
    expect(
      screen.getByRole("button", { name: interest, exact: true }),
    ).toBeTruthy();
});
it("keeps cleared numbers empty and clamps canonical digits on blur", () => {
  render(<Form />);
  const adults = screen.getByLabelText("Adults (1–9)");
  fireEvent.change(adults, { target: { value: "" } });
  expect(adults.value).toBe("");
  expect(
    screen.getByRole("button", { name: "Generate itinerary" }).disabled,
  ).toBe(true);
  fireEvent.change(adults, { target: { value: "99" } });
  fireEvent.blur(adults);
  expect(adults.value).toBe("9");
});
it("blocks exponent/sign keys and non-digit paste", () => {
  render(<Form />);
  const input = screen.getByLabelText("Adults (1–9)");
  for (const key of ["e", "+", "-", "."])
    expect(fireEvent.keyDown(input, { key })).toBe(false);
  expect(
    fireEvent.paste(input, { clipboardData: { getData: () => "1e3" } }),
  ).toBe(false);
});
it("focuses the first invalid field and associates its inline error", () => {
  render(<Form />);
  const input = screen.getByLabelText("Destination");
  fireEvent.change(input, { target: { value: " " } });
  fireEvent.submit(input.closest("form"));
  expect(document.activeElement).toBe(input);
  expect(input.getAttribute("aria-invalid")).toBe("true");
  expect(input.getAttribute("aria-describedby")).toBe("destination-error");
});
