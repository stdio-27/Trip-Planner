export const MAX_UNDO_HISTORY = 20;

export const initialItineraryState = {
  present: null,
  past: [],
};

export function removeStop(plan, stopId) {
  if (!plan || !Array.isArray(plan.days)) {
    return plan;
  }

  let found = false;
  const days = plan.days.map((day) => {
    if (!Array.isArray(day.stops) || !day.stops.some((stop) => stop.id === stopId)) {
      return day;
    }

    found = true;
    return {
      ...day,
      stops: day.stops.filter((stop) => stop.id !== stopId),
    };
  });

  return found ? { ...plan, days } : plan;
}

export function moveStop(plan, stopId, toDayId, toIndex) {
  if (!plan || !Array.isArray(plan.days) || !Number.isInteger(toIndex)) {
    return plan;
  }

  const sourceDayIndex = plan.days.findIndex(
    (day) => Array.isArray(day.stops) && day.stops.some((stop) => stop.id === stopId),
  );
  const targetDayIndex = plan.days.findIndex((day) => day.id === toDayId);

  if (sourceDayIndex === -1 || targetDayIndex === -1) {
    return plan;
  }

  const sourceDay = plan.days[sourceDayIndex];
  const stopIndex = sourceDay.stops.findIndex((stop) => stop.id === stopId);
  const stop = sourceDay.stops[stopIndex];
  const days = plan.days.map((day, index) => {
    if (index === sourceDayIndex || index === targetDayIndex) {
      return { ...day, stops: [...day.stops] };
    }
    return day;
  });

  days[sourceDayIndex].stops.splice(stopIndex, 1);
  const targetStops = days[targetDayIndex].stops;
  const insertionIndex = Math.max(0, Math.min(toIndex, targetStops.length));
  targetStops.splice(insertionIndex, 0, stop);

  if (
    sourceDayIndex === targetDayIndex &&
    targetStops.length === sourceDay.stops.length &&
    targetStops.every((item, index) => item === sourceDay.stops[index])
  ) {
    return plan;
  }

  return { ...plan, days };
}

export function itineraryReducer(state = initialItineraryState, action) {
  switch (action.type) {
    case "LOAD":
      return {
        present: action.plan ?? null,
        past: [],
      };

    case "REMOVE_STOP": {
      const present = removeStop(state.present, action.stopId);
      if (present === state.present) {
        return state;
      }

      return {
        present,
        past: [...state.past, state.present].slice(-MAX_UNDO_HISTORY),
      };
    }

    case "MOVE_STOP": {
      const present = moveStop(
        state.present,
        action.stopId,
        action.toDayId,
        action.toIndex,
      );
      if (present === state.present) {
        return state;
      }

      return {
        present,
        past: [...state.past, state.present].slice(-MAX_UNDO_HISTORY),
      };
    }

    case "UNDO": {
      if (state.past.length === 0) {
        return state;
      }

      return {
        present: state.past[state.past.length - 1],
        past: state.past.slice(0, -1),
      };
    }

    default:
      return state;
  }
}
