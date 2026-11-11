import { useState } from "react";
import { BuzzIntro, BuzzOutro } from "./components/BuzzLanding.jsx";
import { useTripPlanner } from "./hooks/useTripPlanner.js";
import { SetupStep } from "./components/steps/SetupStep.jsx";
import { OptionsStep } from "./components/steps/OptionsStep.jsx";
import { ItineraryStep } from "./components/steps/ItineraryStep.jsx";
export default function App() {
  const [step, setStep] = useState(1);
  const model = useTripPlanner(step, setStep);
  const { mode } = model;
  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Trip Planner home">
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          <span>Trip Planner</span>
        </a>
        {mode === "demo" && (
          <span className="demo-badge" role="status">
            Demo data
          </span>
        )}
        <a className="header-link" href="#planner">
          Find your buzz <span aria-hidden="true">↗</span>
        </a>
      </header>

      <BuzzIntro />
      <section
        id="planner"
        className="planner-layout options-flow"
        aria-label="Trip planner"
      >
        <nav className="flow-progress" aria-label="Planning progress">
          {["Trip details", "Choose options", "Your itinerary"].map(
            (label, i) => (
              <span
                key={label}
                aria-current={step === i + 1 ? "step" : undefined}
              >
                {i + 1}. {label}
              </span>
            ),
          )}
        </nav>
        <SetupStep model={model} />
        <OptionsStep model={model} />
        <ItineraryStep model={model} />
      </section>
      <BuzzOutro />
    </main>
  );
}
