export function formatMoney(value, currency) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(value);
}
/** @typedef {{stayOptions?: {pricePerRoomPerNight?:number}, localTransportOptions?: {pricePerDay?:number,pricing?:string}, foodOptions?: {dailyPerPerson?:number}}} CostSelections */
/** @param {{selections?:CostSelections, travelers?:{adults:number,children:number},days?:number,rooms?:number,activitiesTotal?:number,contingencyOn?:boolean,journey?:Parameters<typeof journeyLegCosts>[0]}} args */
export function computeCostBreakdown({
  selections = {},
  travelers = { adults: 1, children: 0 },
  days = 0,
  rooms = 1,
  activitiesTotal = 0,
  contingencyOn = false,
  journey,
}) {
  const people = travelers.adults + travelers.children,
    nights = Math.max(days - 1, 0);
  const s = selections.stayOptions || {},
    l = selections.localTransportOptions || {},
    f = selections.foodOptions || {};
  const travelLegs = journeyLegCosts(journey, people);
  const travel = travelLegs.reduce((sum, leg) => sum + leg.amount, 0);
  const stay = (s.pricePerRoomPerNight || 0) * nights * rooms;
  const local =
    (l.pricePerDay || 0) * days * (l.pricing === "perGroup" ? 1 : people);
  const food = (f.dailyPerPerson || 0) * days * people;
  const activities = activitiesTotal * people,
    subtotal = travel + stay + local + food + activities;
  const contingency = contingencyOn ? subtotal * 0.1 : 0,
    total = subtotal + contingency;
  return {
    travel,
    travelLegs,
    stay,
    local,
    food,
    activities,
    contingency,
    total,
    perPerson: people ? total / people : 0,
    perDay: days ? total / days : 0,
  };
}
export function presetSelections(options, preset = "Balanced", context = {}) {
  return Object.fromEntries(
    Object.entries(options)
      .filter(([, v]) => Array.isArray(v) && v[0]?.id)
      .map(([key, list]) => {
        const value = (item) =>
          computeCostBreakdown({
            days: 2,
            ...context,
            selections: { [key]: item },
          }).total;
        const sorted = [...list].sort((a, b) => value(a) - value(b));
        const item =
          preset === "Cheapest combo"
            ? sorted[0]
            : preset === "Comfort"
              ? sorted.at(-1)
              : list.find(
                  (x) => x.tier === "mid",
                ) || sorted[Math.floor(sorted.length / 2)];
        return [key, item.id];
      }),
  );
}

export function journeyLegCosts(journey, people) {
  if (!journey?.route) return [];
  const { route, fares, tier, roundTrip, edits } = journey;
  return route.legs.map((leg) => {
    const fare = fares?.[leg.id];
    const edit = edits?.[leg.id + ":" + tier];
    const value = edit != null && edit !== "" ? Number(edit) : fare?.[tier];
    const pricing = fare?.pricing ?? (leg.mode === "cab" ? "perVehicle" : "perPerson");
    const units = pricing === "perVehicle" ? Math.ceil(people / 4) : people;
    const missing = !Number.isFinite(value) || value < 0;
    return {
      id: leg.id,
      label: leg.from.name + " → " + leg.to.name,
      missing,
      amount: missing ? 0 : value * units * (roundTrip ? 2 : 1),
    };
  });
}
