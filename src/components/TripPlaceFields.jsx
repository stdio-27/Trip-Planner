import { useEffect, useState } from "react";
import { Combobox } from "./Combobox.jsx";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch.js";

const districtKey = (name) =>
  name?.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

function HubChoices({ label, type, rows, selected, onSelect }) {
  const [search, setSearch] = useState(false);
  const key = type === "airport" ? "id" : "code";
  const listed = rows.some((row) => row[key] === selected);
  return (
    <fieldset className="hub-choices">
      <legend>{label}</legend>
      {rows.map((row) => (
        <label key={row[key]}>
          <input
            type="radio"
            name={label}
            checked={selected === row[key]}
            onChange={() => onSelect(row)}
          />
          <span>
            {row.name} ({row[key]})
            {row.distanceKm != null ? " · " + row.distanceKm + " km" : ""}
          </span>
        </label>
      ))}
      {selected && !listed && <p>Selected {selected}</p>}
      <label>
        <input
          type="radio"
          name={label}
          checked={!selected}
          onChange={() => onSelect(null)}
        />
        <span>Not using this mode</span>
      </label>
      <button
        type="button"
        onClick={() => setSearch((value) => !value)}
        aria-expanded={search}
      >
        Not listed? Search all
      </button>
      {search && (
        <Combobox
          label={"Search " + label.toLowerCase()}
          endpoint={"/api/hubs/search?type=" + type + "&q="}
          onSelect={onSelect}
          getLabel={(row) => row.name + " (" + row[key] + ")"}
        />
      )}
    </fieldset>
  );
}

function Hubs({
  kind,
  place,
  onChange,
  onFallback,
  fallbackState = undefined,
  autoSelect = false,
  onAutoSelect = undefined,
}) {
  const url = place
    ? "/api/hubs/nearby?lat=" + place.lat + "&lon=" + place.lon
    : null;
  const nearby = useDebouncedSearch(url, 0);
  const data = nearby.data;
  useEffect(() => {
    if (!autoSelect || !data || !place) return;
    onAutoSelect();
    onChange({
      ...place,
      airportId: data.airports[0]?.id ?? null,
      stationCode: data.stations[0]?.code ?? null,
    });
  }, [data, autoSelect]);
  function choose(field, row) {
    const id = field === "airportId" ? row?.id : row?.code;
    if (place) {
      onAutoSelect?.();
      onChange({ ...place, [field]: id ?? null });
    } else if (row)
      onFallback(
        { ...row, stateCode: fallbackState || row.stateCode },
        field,
        id,
      );
  }
  return (
    <>
      {nearby.loading && <p role="status">Finding nearby hubs…</p>}
      {nearby.error && (
        <p role="alert">
          Nearby hubs are unavailable. {nearby.retryAfter > 0 && nearby.errorMessage}{" "}
          <button type="button" onClick={nearby.retry} disabled={nearby.retryAfter > 0}>
            Retry
          </button>
        </p>
      )}
      {data?.notes?.map((note) => (
        <p key={note}>{note}</p>
      ))}
      <HubChoices
        label={kind + " airport"}
        type="airport"
        rows={data?.airports ?? []}
        selected={place?.airportId}
        onSelect={(row) => choose("airportId", row)}
      />
      <HubChoices
        label={kind + " railway station"}
        type="station"
        rows={data?.stations ?? []}
        selected={place?.stationCode}
        onSelect={(row) => choose("stationCode", row)}
      />
    </>
  );
}

export function TripPlaceFields({ origin, destination, onChange, errors }) {
  const [state, setState] = useState(origin?.stateCode ?? "");
  const [district, setDistrict] = useState(origin?.district ?? "");
  const [hubFallback, setHubFallback] = useState(false);
  const [autoArrival, setAutoArrival] = useState(false);
  const [manualTown, setManualTown] = useState(false);
  const states = useDebouncedSearch("/api/geo/states", 0);
  const districts = useDebouncedSearch(
    state ? "/api/geo/districts?state=" + state : null,
    0,
  );
  const districtSearch = useDebouncedSearch(
    district && !origin && !manualTown
      ? "/api/geo/search?state=" + state + "&q=" + encodeURIComponent(district)
      : null,
  );
  const [townLabel, setTownLabel] = useState("");
  const matchingTown = districtSearch.data?.results.find(
    (row) =>
      row.stateCode === state &&
      districtKey(row.district) === districtKey(district),
  );
  const location = (row, ids = {}) => ({
    stateCode: row.stateCode,
    lat: row.lat,
    lon: row.lon,
    airportId: null,
    stationCode: null,
    ...ids,
  });
  useEffect(() => {
    if (matchingTown && !origin)
      onChange("origin", { ...location(matchingTown), district });
  }, [matchingTown, district, origin, onChange]);
  const needsTown =
    district &&
    !origin &&
    (districtSearch.error || (districtSearch.data && !matchingTown));
  return (
    <>
      <div className="place-field">
        <label htmlFor="origin">Origin state</label>
        <select
          id="origin"
          value={state}
          aria-invalid={Boolean(errors.origin)}
          aria-describedby={errors.origin ? "origin-error" : undefined}
          onChange={(event) => {
            setState(event.target.value);
            setDistrict("");
            setTownLabel("");
            setManualTown(false);
            onChange("origin", null);
          }}
        >
          <option value="">Choose a state</option>
          {states.data?.states.map((row) => (
            <option key={row.code} value={row.code}>
              {row.name}
            </option>
          ))}
        </select>
        {states.loading && <p role="status">Loading states…</p>}
        {states.error && (
          <button type="button" onClick={states.retry} disabled={states.retryAfter > 0}>
            Retry states {states.retryAfter > 0 && states.errorMessage}
          </button>
        )}
        {errors.origin && (
          <p id="origin-error" role="alert">
            {errors.origin}
          </p>
        )}
      </div>
      <div className="place-field">
        <label htmlFor="origin-district">Origin district</label>
        <select
          id="origin-district"
          disabled={!state || districts.loading}
          value={district}
          onChange={(event) => {
            setDistrict(event.target.value);
            setTownLabel("");
            setManualTown(false);
            onChange("origin", null);
          }}
        >
          <option value="">Choose a district</option>
          {districts.data?.districts.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
        {districts.error && (
          <button type="button" onClick={districts.retry} disabled={districts.retryAfter > 0}>
            Retry districts {districts.retryAfter > 0 && districts.errorMessage}
          </button>
        )}
      </div>
      {districtSearch.loading && <p role="status">Locating district…</p>}
      {(needsTown || manualTown || townLabel) && (
        <div>
          {districtSearch.error && (
            <p role="alert">
              Place search is unavailable. Search for an origin hub below. {districtSearch.retryAfter > 0 && districtSearch.errorMessage}{" "}
              <button type="button" onClick={districtSearch.retry} disabled={districtSearch.retryAfter > 0}>
                Retry district lookup
              </button>
            </p>
          )}
          <Combobox
            key={state + district}
            label="Nearest origin town"
            selectedLabel={townLabel}
            endpoint={"/api/geo/search?state=" + state + "&q="}
            onClear={() => {
              setManualTown(true);
              setTownLabel("");
              onChange("origin", null);
            }}
            onSelect={(row) => {
              setTownLabel(row.name);
              onChange("origin", { ...location(row), district });
            }}
          />
        </div>
      )}
      {(origin || needsTown || manualTown) && (
        <Hubs
          kind="Origin"
          place={origin}
          onChange={(place) => onChange("origin", place)}
          onFallback={(row, field, id) =>
            onChange("origin", { ...location(row, { [field]: id }), district })
          }
          fallbackState={state}
        />
      )}
      <Combobox
        id="destination"
        label="Destination"
        selectedLabel={destination?.placeName}
        endpoint="/api/geo/search?q="
        error={errors.destination}
        onClear={() => {
          setAutoArrival(false);
          onChange("destination", null);
        }}
        onSelect={(row) => {
          setAutoArrival(true);
          onChange("destination", { ...location(row), placeName: row.name });
        }}
      />
      {!destination && (
        <button
          type="button"
          onClick={() => setHubFallback((value) => !value)}
          aria-expanded={hubFallback}
        >
          Use an arrival hub as destination
        </button>
      )}
      {(destination || hubFallback) && (
        <Hubs
          kind="Arrival"
          place={destination}
          autoSelect={autoArrival}
          onAutoSelect={() => setAutoArrival(false)}
          onChange={(place) => onChange("destination", place)}
          onFallback={(row, field, id) => {
            if (row.stateCode)
              onChange("destination", {
                ...location(row, { [field]: id }),
                placeName: row.name,
              });
          }}
        />
      )}
    </>
  );
}
