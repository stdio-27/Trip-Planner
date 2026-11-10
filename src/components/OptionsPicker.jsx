import { PRESETS } from "../../shared/schemas.js";
import { groups, priceFields } from "../../shared/optionsSchema.js";
import {
  formatMoney,
  computeCostBreakdown,
  presetSelections,
} from "../costs.js";
export function OptionsPicker({
  options,
  setOptions,
  selected,
  setSelected,
  trip,
}) {
  const priceLabels = {
    farePerPersonRoundTrip: "Round-trip fare per traveler",
    originTransferPerPersonRoundTrip:
      "Origin transfers per traveler (round trip)",
    destinationTransferPerPersonRoundTrip:
      "Arrival transfers per traveler (round trip)",
    pricePerRoomPerNight: "Per room per night",
    pricePerDay: "Daily local transport",
    dailyPerPerson: "Daily meals per traveler",
  };
  const labels = [
    "Getting there",
    "Where to stay",
    "Getting around",
    "Food style",
  ];
  function edit(key, id, field, value) {
    if (
      value === "" ||
      !Number.isFinite(Number(value)) ||
      Number(value) < 0 ||
      Number(value) > 1e9
    )
      return;
    setOptions((current) => ({
      ...current,
      [key]: current[key].map((item) =>
        item.id === id ? { ...item, [field]: Number(value) } : item,
      ),
    }));
  }
  return (
    <section className="options-picker" aria-label="Trip options">
      <h2>Make it your kind of trip</h2>
      <p>Mix it yourself: premium stays and cheap travel work together.</p>
      <section className="sketch-box hubs">
        <h3>Hubs & assumptions</h3>
        <p>
          From {options.origin.city}: {options.origin.nearestAirport.name} /{" "}
          {options.origin.nearestStation.name}
        </p>
        <p>
          To {options.destination.city}:{" "}
          {options.destination.arrivalAirport.name} (
          {options.destination.arrivalAirport.distanceKmToCity ?? "unknown"} km
          to city) / {options.destination.arrivalStation.name}
        </p>
        <ul>
          {options.assumptions.map((a, i) => (
            <li key={i}>{a}</li>
          ))}
        </ul>
      </section>
      <div className="prompt-chips">
        {PRESETS.map((p) => (
          <button
            type="button"
            className="button"
            key={p}
            onClick={() =>
              setSelected(
                presetSelections(options, p, {
                  travelers: trip,
                  days: trip.days,
                  rooms: trip.rooms,
                }),
              )
            }
          >
            {p}
          </button>
        ))}
      </div>
      {groups.map((key, index) => (
        <fieldset key={key} role="radiogroup" aria-label={labels[index]}>
          <legend>{labels[index]}</legend>
          <div className="option-grid">
            {options[key].map((item) => (
              <div
                className={`sketch-box option-card ${selected[key] === item.id ? "chosen" : ""}`}
                key={item.id}
              >
                <label>
                  <input
                    type="radio"
                    name={key}
                    checked={selected[key] === item.id}
                    onChange={() =>
                      setSelected((current) => ({ ...current, [key]: item.id }))
                    }
                  />
                  {item.label}
                </label>
                <p>{item.notes}</p>
                {item.pricing && (
                  <p>
                    Charged{" "}
                    {item.pricing === "perGroup" ? "per group" : "per traveler"}{" "}
                    per day
                  </p>
                )}
                {item.area && <p>Area: {item.area}</p>}
                {item.durationHours > 0 && <p>{item.durationHours} hours</p>}
                {priceFields[key].map((field) => (
                  <label className="estimate-field" key={field}>
                    {priceLabels[field]}
                    <strong>
                      {formatMoney(item[field], options.currency)}
                    </strong>
                    <span>Edit estimate</span>
                    <input
                      aria-label={`Edit ${item.label} ${field}`}
                      type="number"
                      min="0"
                      max="1000000000"
                      step="any"
                      value={item[field]}
                      onChange={(e) => {
                        const valid =
                          e.target.value !== "" &&
                          Number(e.target.value) >= 0 &&
                          Number(e.target.value) <= 1e9;
                        e.target.setCustomValidity(
                          valid
                            ? ""
                            : "Enter a non-negative estimate up to 1,000,000,000.",
                        );
                        e.target.setAttribute("aria-invalid", String(!valid));
                        edit(key, item.id, field, e.target.value);
                      }}
                    />
                  </label>
                ))}
              </div>
            ))}
          </div>
        </fieldset>
      ))}
    </section>
  );
}
export function CostPanel({
  options,
  selected,
  trip,
  activitiesTotal,
  contingencyOn,
  setContingencyOn,
}) {
  const selections = Object.fromEntries(
    groups.map((key) => [
      key,
      options[key].find((x) => x.id === selected[key]) || options[key][0],
    ]),
  );
  const args = {
    travelers: { adults: trip.adults, children: trip.children },
    days: trip.days,
    rooms: trip.rooms,
    activitiesTotal,
    contingencyOn,
  };
  const cost = computeCostBreakdown({ ...args, selections });
  // Costs are additive across independent groups; each group can be minimized separately.
  const range = ["Cheapest combo", "Comfort"].map((p) => {
    const ids = presetSelections(options, p, args);
    return computeCostBreakdown({
      ...args,
      selections: Object.fromEntries(
        groups.map((k) => [k, options[k].find((x) => x.id === ids[k])]),
      ),
    }).total;
  });
  return (
    <section
      className="cost-panel sketch-box"
      aria-label="Trip cost summary"
      aria-live="polite"
    >
      <h3>Your combination</h3>
      <dl>
        {[
          "travel",
          "stay",
          "local",
          "food",
          "activities",
          "contingency",
          "total",
          "perPerson",
          "perDay",
        ].map((k) => (
          <div key={k}>
            <dt>{k.replace(/([A-Z])/g, " $1")}</dt>
            <dd>{formatMoney(cost[k], trip.currency)}</dd>
          </div>
        ))}
      </dl>
      <label>
        <input
          type="checkbox"
          checked={contingencyOn}
          onChange={(e) => setContingencyOn(e.target.checked)}
        />{" "}
        Add 10% contingency
      </label>
      {trip.budget != null && (
        <>
          <p>
            {cost.total > trip.budget ? "Over" : "Under"} budget by{" "}
            {formatMoney(Math.abs(trip.budget - cost.total), trip.currency)}
          </p>
          <meter
            aria-label="Budget usage"
            min="0"
            max={Math.max(trip.budget, cost.total, 1)}
            value={cost.total}
          />
        </>
      )}
      <p>
        Range across all combinations:{" "}
        {range.map((v) => formatMoney(v, trip.currency)).join(" – ")}
      </p>
      <small>AI estimates, not live prices. Verify before booking.</small>
    </section>
  );
}
