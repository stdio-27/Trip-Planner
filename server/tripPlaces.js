import { loadData } from "./data/index.js";

export function resolveTripPlaces(trip) {
  if (!trip.origin) return { data: trip };
  const data = loadData();
  if (!data.districts[trip.origin.stateCode]?.includes(trip.origin.district)) {
    return { errors: { origin: "Choose a district in the selected state." } };
  }
  for (const key of ["origin", "destination"]) {
    const place = trip[key];
    if (!data.statesByCode.has(place.stateCode))
      return { errors: { [key]: "Choose a place in a known state." } };
    if (
      (place.airportId && !data.airportsById.has(place.airportId)) ||
      (place.stationCode && !data.junctionsByCode.has(place.stationCode))
    )
      return { errors: { [key]: "Choose a listed airport or major station." } };
  }
  const airport = data.airportsById.get(trip.origin.airportId);
  const station = data.junctionsByCode.get(trip.origin.stationCode);
  const arrivalAirport = data.airportsById.get(trip.destination.airportId);
  const arrivalStation = data.junctionsByCode.get(trip.destination.stationCode);
  return {
    data: {
      ...trip,
      originCity: trip.origin.district,
      destination: trip.destination.placeName,
      destinationPlace: trip.destination,
      nearestAirport: airport ? `${airport.name} (${airport.id})` : "",
      nearestStation: station ? `${station.name} (${station.code})` : "",
      arrivalAirport: arrivalAirport
        ? `${arrivalAirport.name} (${arrivalAirport.id})`
        : "",
      arrivalStation: arrivalStation
        ? `${arrivalStation.name} (${arrivalStation.code})`
        : "",
    },
  };
}
