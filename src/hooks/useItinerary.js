import { useEffect, useReducer, useState } from "react";
import {
  initialItineraryState,
  itineraryReducer,
} from "../itineraryReducer.js";

export function useItinerary(generatedPlan) {
  const [state, dispatch] = useReducer(itineraryReducer, initialItineraryState);

  const [packing, setPacking] = useState({ checked: [], customItems: [] });

  useEffect(() => {
    if (generatedPlan?.days.some((day) => day.stops.length > 0)) {
      dispatch({ type: "LOAD", plan: generatedPlan });
      setPacking({ checked: [], customItems: [] });
    }
  }, [generatedPlan]);

  return {
    plan: state.present,
    dispatch,
    packing,
    setPacking,
    canUndo: state.past.length > 0,
  };
}
