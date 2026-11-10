import { useEffect, useReducer } from "react";
import {
  initialItineraryState,
  itineraryReducer,
} from "../itineraryReducer.js";

export function useItinerary(generatedPlan) {
  const [state, dispatch] = useReducer(itineraryReducer, initialItineraryState);

  useEffect(() => {
    if (generatedPlan) {
      dispatch({ type: "LOAD", plan: generatedPlan });
    }
  }, [generatedPlan]);

  return {
    plan: state.present,
    dispatch,
    canUndo: state.past.length > 0,
  };
}
