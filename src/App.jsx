import { useEffect, useState } from "react";
import { BuzzIntro, BuzzOutro } from "./components/BuzzLanding.jsx";
import { BudgetSummary } from "./components/BudgetSummary.jsx";
import { EmptyHint, EmptyState } from "./components/EmptyStates.jsx";
import { ErrorState } from "./components/ErrorState.jsx";
import { ItineraryView } from "./components/ItineraryView.jsx";
import { PackingList } from "./components/PackingList.jsx";
import { Skeleton } from "./components/Skeleton.jsx";
import { TripForm } from "./components/TripForm.jsx";
import { parseOptions, groups } from "../shared/optionsSchema.js";
import { presetSelections } from "./costs.js";
import { OptionsPicker, CostPanel } from "./components/OptionsPicker.jsx";
import { useGenerate, useApiCall } from "./hooks/useGenerate.js";
import { useItinerary } from "./hooks/useItinerary.js";

const initialForm = {
  description: "",
  destination: "",
  days: 3,
  budget: "",
  currency: "INR",
  interests: "", originCity: "", nearestAirport: "", nearestStation: "", adults: 1, children: 0, rooms: "", startDate: "", pace: "balanced", foodPreference: "no preference", foodOther: "", anythingElse: "",
};

export default function App() {
  const [formValues, setFormValues] = useState(initialForm);
  const { status, plan: generatedPlan, error, generate, cancel } = useGenerate();
  const { plan, dispatch, canUndo, packing, setPacking } = useItinerary(generatedPlan);

  const optionsCall = useApiCall("/api/options", parseOptions);
  const [step,setStep] = useState(1);
  const [options,setOptions] = useState(null);
  const [selected,setSelected] = useState({});
  const [trip,setTrip] = useState(null);
  const [contingencyOn,setContingencyOn] = useState(false);
  const [planTrip,setPlanTrip] = useState(null);
  useEffect(()=>{
    if (optionsCall.status === "success" && optionsCall.plan) {
      setOptions(optionsCall.plan); setSelected(presetSelections(optionsCall.plan)); setStep(2);
    }
  },[optionsCall.status,optionsCall.plan]);
  function handleSubmit(submission) {
    setTrip(submission); optionsCall.generate(submission);
  }
  const stale = trip && ["destination","originCity","days","adults","children","currency","nearestAirport","nearestStation","startDate","rooms","pace","foodPreference","foodOther","interests","anythingElse","budget"].some(k=>String(formValues[k] ?? "") !== String(trip[k] ?? "") && !(k==="rooms" && !formValues.rooms) && !(k==="budget" && formValues.budget==="" && trip.budget==null));
  function buildPlan() {
    setPlanTrip(trip); setStep(3);
    generate({...trip,selections:Object.fromEntries(groups.map(key=>[key,options[key].find(x=>x.id===selected[key])]))});
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Trip Planner home">
          <span className="brand-mark" aria-hidden="true">✳</span>
          <span>Trip Planner</span>
        </a>
        <a className="header-link" href="#planner">Find your buzz <span aria-hidden="true">↗</span></a>
      </header>

      <BuzzIntro />
      <section id="planner" className="planner-layout options-flow" aria-label="Trip planner">
        <nav className="flow-progress" aria-label="Planning progress">{["Trip details","Choose options","Your itinerary"].map((label,i)=><span key={label} aria-current={step===i+1?"step":undefined}>{i+1}. {label}</span>)}</nav>
        {step === 1 && <aside className="form-panel">
          <div className="section-eyebrow">YOUR NEXT ADVENTURE</div>
          <h2>Plan a trip</h2>
          <p className="muted-copy">Tell us a little about where you want to go.</p>
          <TripForm
            values={formValues}
            onChange={setFormValues}
            onSubmit={handleSubmit}
            loading={optionsCall.status === "loading"}
            submitLabel="Explore options"
          />
        </aside>}
        {optionsCall.status === "loading" && <div><button className="button" onClick={optionsCall.cancel}>Cancel</button><Skeleton /></div>}
        {optionsCall.status === "error" && <ErrorState message={optionsCall.error} onRetry={()=>optionsCall.generate(trip)} />}
        {optionsCall.status === "empty" && <EmptyState />}
        {step > 1 && options && <>
          <button className="button" onClick={()=>{cancel();setStep(1);}}>Back to trip details</button>
          {stale && <p role="alert">Trip details changed. Regenerate options</p>}
          <OptionsPicker options={options} setOptions={setOptions} selected={selected} setSelected={setSelected}/>
          <CostPanel options={options} selected={selected} trip={trip} activitiesTotal={planTrip===trip && plan ? plan.days.flatMap(d=>d.stops).reduce((sum,s)=>sum+s.estCost,0) : 0} contingencyOn={contingencyOn} setContingencyOn={setContingencyOn}/>
          <button className="button button-primary" disabled={stale || status==="loading"} onClick={buildPlan}>Build my itinerary</button>
        </>}

        <section className="results-panel" aria-live="polite">
          {status === "loading" && (
            <div className="loading-view">
              <div className="loading-actions">
                <button
                  type="button"
                  className="button button-secondary cancel-button"
                  onClick={cancel}
                >
                  Cancel
                </button>
              </div>
              <Skeleton />
            </div>
          )}
          {status === "error" && (
            <ErrorState
              message={error}
              onRetry={buildPlan}
              loading={status === "loading"}
            />
          )}
          {status === "empty" && <EmptyState />}
          {status === "idle" && !plan && <EmptyHint />}
          {step === 3 && planTrip===trip && plan && (
            <>
              <div className="results-heading">
                <div>
                  <div className="section-eyebrow">YOUR ITINERARY</div>
                  <h2>{plan.title}</h2>
                </div>
                <button
                  type="button"
                  className="button button-secondary undo-button"
                  onClick={() => dispatch({ type: "UNDO" })}
                  disabled={!canUndo}
                  aria-label="Undo the last itinerary change"
                >
                  Undo
                </button>
              </div>

              <ItineraryView plan={plan} dispatch={dispatch} />
              <PackingList items={plan.packingList} packing={packing} onChange={setPacking} />
              {plan.droppedItems > 0 && (
                <p className="dropped-note" role="status">
                  {plan.droppedItems} invalid {plan.droppedItems === 1 ? "stop was" : "stops were"} skipped.
                </p>
              )}
            </>
          )}
        </section>
      </section>
      <BuzzOutro />
    </main>
  );
}
