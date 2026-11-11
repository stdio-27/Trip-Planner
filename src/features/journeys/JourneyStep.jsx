import { fareTiers } from "../../../shared/journeys.js";
import { formatMoney, journeyLegCosts } from "../../lib/costs.js";

const labels = {
  scheduled: "Timetable match",
  "route-hint": "Route hint",
  unverified: "Unverified",
};
const modes = { train: "Train", flight: "Flight", bus: "Bus", cab: "Cab" };
const duration = (minutes) =>
  [
    Math.floor(minutes / 60) ? Math.floor(minutes / 60) + "h" : "",
    minutes % 60 ? (minutes % 60) + "m" : "",
  ]
    .filter(Boolean)
    .join(" ") || "0m";
const evidence = ({ level, dataYear }) =>
  labels[level] + (dataYear ? " · " + dataYear : "");

export function JourneyStep({
  trip,
  journeys,
  fares,
  choice,
  setChoice,
  notice,
  onChangeHubs,
  retryRoutes,
  retryFares,
  renderTiming,
}) {
  const { id, tier, roundTrip, edits } = choice;
  const fareFailed =
    ["error", "empty"].includes(fares.status) || fares.plan?.faresError;
  const money = (amount) => formatMoney(amount, trip.currency);
  const people = trip.adults + trip.children;
  const years = [
    ...new Set(
      journeys.plan?.journeys.flatMap((route) =>
        route.legs
          .filter((leg) => leg.availability.level === "scheduled")
          .map((leg) => leg.availability.dataYear),
      ) ?? [],
    ),
  ];
  function editFare(leg, value) {
    setChoice((current) => ({
      ...current,
      edits: { ...current.edits, [leg.id + ":" + tier]: value },
    }));
  }
  return (
    <section className="journey-picker" aria-label="Journey options">
      <h2>Getting there</h2>
      <p>
        Timetable data is from {years.length ? years.join(", ") : "2016"}; fares
        are AI estimates; verify on the official site.
      </p>
      {notice && <p role="status">{notice}</p>}
      {journeys.status === "loading" && <p role="status">Finding journeys…</p>}
      {["error", "empty"].includes(journeys.status) && (
        <p role="alert">
          Journey options could not load.{" "}
          {journeys.retryAfter > 0 && journeys.error}{" "}
          <button
            className="button"
            onClick={retryRoutes}
            disabled={journeys.retryAfter > 0}
          >
            Retry journeys
          </button>
        </p>
      )}
      {journeys.status === "success" && !journeys.plan.journeys.length && (
        <p role="status">
          {journeys.plan.emptyReason}{" "}
          <button className="button" onClick={onChangeHubs}>
            Change hubs
          </button>
        </p>
      )}
      {!!journeys.plan?.journeys.length && (
        <>
          <div className="journey-controls">
            <label>
              Fare tier{" "}
              <select
                value={tier}
                onChange={(event) =>
                  setChoice({ ...choice, tier: event.target.value })
                }
              >
                {Object.entries(fareTiers).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={roundTrip}
                onChange={(event) =>
                  setChoice({ ...choice, roundTrip: event.target.checked })
                }
              />{" "}
              Return the same way
            </label>
          </div>
          {fareFailed && (
            <p role="alert">
              Fare estimates are unavailable.{" "}
              {fares.retryAfter > 0 && fares.error} Enter your own estimates or{" "}
              <button
                className="button"
                onClick={retryFares}
                disabled={fares.retryAfter > 0}
              >
                Estimate prices again
              </button>
              .
            </p>
          )}
          <fieldset>
            <legend>Choose a journey</legend>
            <div className="journey-grid">
              {journeys.plan.journeys.map((route) => {
                const legCosts = journeyLegCosts(
                  { route, fares: fares.plan?.fares, tier, roundTrip, edits },
                  people,
                );
                const price = legCosts.reduce(
                  (sum, leg) => sum + leg.amount,
                  0,
                );
                const missing = legCosts.some((leg) => leg.missing);
                return (
                  <article
                    key={route.id}
                    className={
                      "sketch-box option-card" +
                      (route.id === id ? " chosen" : "")
                    }
                  >
                    <label className="journey-choice">
                      <input
                        type="radio"
                        name="journey"
                        aria-label={
                          route.label +
                          " " +
                          [
                            route.legs[0].from.name,
                            ...route.legs.map((leg) => leg.to.name),
                          ].join(" → ")
                        }
                        checked={route.id === id}
                        onChange={() =>
                          setChoice((current) => ({ ...current, id: route.id }))
                        }
                      />
                      <strong>{route.label}</strong>
                      <span>
                        {[
                          route.legs[0].from.name,
                          ...route.legs.map((leg) => leg.to.name),
                        ].join(" → ")}
                      </span>
                    </label>
                    <p>
                      {duration(route.totalDurationMin)} · {route.changes}{" "}
                      {route.changes === 1 ? "change" : "changes"}
                    </p>
                    <p className="journey-badges">
                      {[
                        ...new Set(
                          route.legs.map((leg) => evidence(leg.availability)),
                        ),
                      ].map((badge) => (
                        <span key={badge}>{badge}</span>
                      ))}
                    </p>
                    {["idle", "loading"].includes(fares.status) && missing ? (
                      <p role="status" className="fare-loading">
                        Estimating fares…
                      </p>
                    ) : (
                      <p>
                        {missing
                          ? "Fare incomplete"
                          : money(price / people) + " per traveler"}{" "}
                        · {roundTrip ? "Return" : "One way"}
                      </p>
                    )}
                    <details>
                      <summary>Leg details</summary>
                      <ol className="journey-legs">
                        {route.legs.map((leg, index) => {
                          const fare = fares.plan?.fares?.[leg.id];
                          const edited = edits[leg.id + ":" + tier];
                          const pricing =
                            fare?.pricing ??
                            (leg.mode === "cab" ? "perVehicle" : "perPerson");
                          return (
                            <li key={leg.id}>
                              <strong>
                                {modes[leg.mode]} · {leg.from.name} →{" "}
                                {leg.to.name}
                              </strong>
                              <p>
                                {leg.distanceKm} km ·{" "}
                                {duration(leg.durationMin)} including{" "}
                                {duration(leg.bufferMin)} buffer
                              </p>
                              <p>
                                {evidence(leg.availability)}. {leg.note}
                              </p>
                              {fare?.flags?.length > 0 && (
                                <p role="status" className="fare-warning">
                                  Check this estimate
                                </p>
                              )}
                              {leg.availability.checkUrl && (
                                <a
                                  href={leg.availability.checkUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  Check live availability
                                </a>
                              )}
                              <label className="estimate-field">
                                Edit leg {index + 1} fare ({trip.currency} per{" "}
                                {pricing === "perVehicle"
                                  ? "vehicle"
                                  : "traveler"}
                                , one way)
                                <input
                                  type="number"
                                  min="0"
                                  max="1000000000"
                                  step="any"
                                  value={edited ?? fare?.[tier] ?? ""}
                                  onChange={(event) => {
                                    const value = event.target.value;
                                    if (
                                      !value ||
                                      (Number.isFinite(Number(value)) &&
                                        Number(value) >= 0 &&
                                        Number(value) <= 1e9)
                                    )
                                      editFare(leg, value);
                                  }}
                                  onBlur={() => {
                                    if (edited === "") editFare(leg, undefined);
                                  }}
                                />
                              </label>
                            </li>
                          );
                        })}
                      </ol>
                    </details>
                  </article>
                );
              })}
            </div>
          </fieldset>
          {renderTiming?.()}
        </>
      )}
    </section>
  );
}
