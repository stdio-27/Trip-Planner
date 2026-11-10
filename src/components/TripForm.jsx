import { TripPlaceFields } from "./TripPlaceFields.jsx";
import { useState, useRef, useEffect } from "react";
import {
  tripSetupSchema,
  pickedTripSchema,
  formPayload,
  dateBounds,
  CURRENCIES,
  PACES,
  FOOD_PREFERENCES,
  INTERESTS,
} from "../../shared/schemas.js";
import { validateTripInput } from "../../shared/tripInput.js";
const numeric = {
  adults: [1, 9],
  children: [0, 9],
  rooms: [1, 9],
  budget: [0, 10000000],
};
export function TripForm({
  values,
  onChange,
  onSubmit,
  loading,
  serverErrors,
  submitLabel = "Generate itinerary",
}) {
  const [errors, setErrors] = useState({});
  useEffect(() => {
    setErrors(serverErrors || {});
  }, [serverErrors]);
  const form = useRef(null);
  const bounds = dateBounds();
  const update = (key, value) =>
    onChange((current) => ({ ...current, [key]: value }));
  const picked = "origin" in values;
  const valid = (picked ? pickedTripSchema : tripSetupSchema).safeParse(
    formPayload(values),
  ).success;
  function validate(next = values) {
    const r = validateTripInput(formPayload(next));
    setErrors(r.valid ? {} : r.errors);
    return r;
  }
  function submit(e) {
    e.preventDefault();
    const r = validate();
    if (!r.valid) {
      form.current?.querySelector(`[id="${r.field}"]`)?.focus();
      return;
    }
    onChange((current) => ({ ...current, ...r.data }));
    onSubmit(r.data);
  }
  function error(key) {
    return (
      errors[key] && (
        <p id={`${key}-error`} role="alert" className="form-inline-error">
          {errors[key]}
        </p>
      )
    );
  }
  function input(key, label, type = "text", max = 100) {
    return (
      <div className="setup-field" key={key}>
        <label htmlFor={key}>{label}</label>
        <input
          id={key}
          type={type}
          maxLength={max}
          value={values[key] ?? ""}
          min={type === "date" ? bounds.min : numeric[key]?.[0]}
          max={type === "date" ? bounds.max : numeric[key]?.[1]}
          step={type === "number" ? 1 : undefined}
          inputMode={type === "number" ? "numeric" : undefined}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${key}-error` : undefined}
          onKeyDown={(e) => {
            if (
              type === "number" &&
              ["e", "E", "+", "-", ".", ","].includes(e.key)
            )
              e.preventDefault();
          }}
          onPaste={(e) => {
            if (
              type === "number" &&
              !/^\d+$/.test(e.clipboardData.getData("text"))
            )
              e.preventDefault();
          }}
          onChange={(e) => update(key, e.target.value)}
          onBlur={(e) => {
            let next = values;
            if (type === "number" && /^\d+$/.test(e.target.value)) {
              const [min, max] = numeric[key];
              const value = Math.min(
                max,
                Math.max(min, Number(e.target.value)),
              );
              next = { ...values, [key]: value };
              onChange(next);
            }
            validate(next);
          }}
        />
        {error(key)}
      </div>
    );
  }
  function select(key, label, choices) {
    return (
      <div className="setup-field">
        <label htmlFor={key}>{label}</label>
        <select
          id={key}
          value={values[key]}
          aria-invalid={!!errors[key]}
          aria-describedby={errors[key] ? `${key}-error` : undefined}
          onChange={(e) =>
            update(
              key,
              key === "days" ? Number(e.target.value) : e.target.value,
            )
          }
          onBlur={() => validate()}
        >
          {choices.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        {error(key)}
      </div>
    );
  }
  return (
    <form className="trip-form" ref={form} onSubmit={submit} noValidate>
      {picked ? (
        <TripPlaceFields
          origin={values.origin}
          destination={values.destination}
          onChange={update}
          errors={errors}
        />
      ) : (
        <>
          {input("destination", "Destination")}
          {input("originCity", "Origin city")}
          {input("nearestAirport", "Nearest airport (optional)")}
          {input("nearestStation", "Nearest railway station (optional)")}
        </>
      )}
      {select(
        "days",
        "Trip length",
        Array.from({ length: 14 }, (_, i) => i + 1),
      )}
      <small>{Math.max(Number(values.days) - 1, 0)} nights</small>
      {input("startDate", "Start date (optional)", "date")}
      {input("adults", "Adults (1–9)", "number")}
      {input("children", "Children (0–9)", "number")}
      {input("rooms", "Rooms (optional)", "number")}
      <small>
        Default: {Math.ceil(Number(values.adults || 1) / 2)} room(s).
      </small>
      {select("currency", "Currency", CURRENCIES)}
      {input("budget", "Approximate budget (optional)", "number")}
      {select("pace", "Travel pace", PACES)}
      <fieldset>
        <legend>Interests</legend>
        <div className="prompt-chips">
          {INTERESTS.map((item) => (
            <button
              className="chip-button"
              type="button"
              key={item}
              aria-pressed={values.interests.includes(item)}
              onClick={() =>
                update(
                  "interests",
                  values.interests.includes(item)
                    ? values.interests.filter((x) => x !== item)
                    : [...values.interests, item],
                )
              }
            >
              {item}
            </button>
          ))}
        </div>
        {error("interests")}
      </fieldset>
      <label htmlFor="anythingElse">Anything else about your trip?</label>
      <textarea
        id="anythingElse"
        maxLength={300}
        value={values.anythingElse}
        aria-invalid={!!errors.anythingElse}
        aria-describedby={
          errors.anythingElse ? "anythingElse-error" : undefined
        }
        onChange={(e) => update("anythingElse", e.target.value)}
        onBlur={() => validate()}
      />
      {error("anythingElse")}
      {select("foodPreference", "Food preference", FOOD_PREFERENCES)}
      {values.foodPreference === "other" &&
        input("foodOther", "Other food preference", "text", 50)}
      <button className="button button-primary" disabled={loading || !valid}>
        {loading ? "Planning your trip…" : submitLabel}
      </button>
    </form>
  );
}
