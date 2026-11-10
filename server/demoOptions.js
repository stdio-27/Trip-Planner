export function demoOptions(trip) {
  const hub = (name) => ({ name, code: "", distanceKmToCity: 20 });
  return {
    currency: trip.currency,
    assumptions: [
      "Demo estimates only; these are illustrative amounts, not quotes.",
      ...(!trip.nearestAirport
        ? [
            "Origin airport inferred from the origin city; verify the actual hub.",
          ]
        : []),
      ...(!trip.nearestStation
        ? [
            "Origin railway station inferred from the origin city; verify the actual station.",
          ]
        : []),
    ],
    origin: {
      city: trip.originCity,
      nearestAirport: hub(
        trip.nearestAirport || `${trip.originCity} airport (assumed)`,
      ),
      nearestStation: hub(
        trip.nearestStation || `${trip.originCity} station (assumed)`,
      ),
    },
    destination: {
      city: trip.destination,
      arrivalAirport: hub(trip.arrivalAirport || `${trip.destination} airport (assumed)`),
      arrivalStation: hub(trip.arrivalStation || `${trip.destination} station (assumed)`),
    },
    stayOptions: ["budget", "mid", "premium"].map((tier, i) => ({
      label: `${tier} stay`,
      tier,
      type: "hotel",
      area: "City center",
      pricePerRoomPerNight: [1000, 3000, 8000][i],
      notes: "Illustrative price per room per night.",
    })),
    localTransportOptions: [
      "Public transport",
      "Shared cab",
      "Private driver",
    ].map((label, i) => ({
      label,
      pricing: i ? "perGroup" : "perPerson",
      pricePerDay: [100, 600, 1500][i],
      notes: "Illustrative daily local transport.",
    })),
    foodOptions: ["budget", "mid", "premium"].map((tier, i) => ({
      label: `${tier} food`,
      tier,
      dailyPerPerson: [300, 700, 1800][i],
      notes: "Illustrative daily meals per traveler.",
    })),
  };
}
