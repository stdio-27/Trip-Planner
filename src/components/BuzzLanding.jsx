const steps = [
  ["01", "THE LITTLE ITCH", "A place gets stuck in your head. What if you actually went?"],
  ["02", "MAKE IT REAL", "Pick your place. Tell us your kind of adventure."],
  ["03", "THE COUNTDOWN", "A little planning. A lot of imagining. Bags almost packed."],
  ["04", "YOU’RE OFF!", "New streets, wrong turns, and all the good surprises."],
  ["05", "SLOW IT DOWN", "Find your favorite corner. Stay for one more coffee."],
  ["06", "TAKE IT WITH YOU", "Come home with stories. Start dreaming about the next one."],
];
const curve = "M 12 390 C 95 390, 120 535, 230 485 S 330 290, 425 300 S 515 70, 610 120 S 710 470, 810 420 S 990 230, 1130 280";

export function BuzzIntro() {
  return (
    <>
      <section className="buzz-hero" aria-labelledby="buzz-title">
        <span className="hero-kicker">LESS OVERTHINKING. MORE GOING.</span>
        <h1 id="buzz-title">GOOD TRIPS.<br /><span>GREAT BUZZ.</span></h1>
        <p>That can’t-sit-still feeling? Follow it.</p>
        <a className="button button-primary hero-cta" href="#planner">Plan my adventure <span aria-hidden="true">↗</span></a>
        <span className="hero-note">a little spark goes a long way ↴</span>
      </section>
      <section className="buzz-section" aria-labelledby="curve-title">
        <div className="curve-heading"><span className="handwritten">It’s more than getting there.</span><h2 id="curve-title">THE BUZZ CURVE</h2><p>Every adventure has a feeling. Here’s how yours might unfold.</p></div>
        <div className="buzz-graph">
          <span className="axis-label axis-buzz">Buzz ↑</span><span className="axis-label axis-time">Time →</span>
          <div className="graph-phases" aria-hidden="true"><span>PRE-JOY</span><span>JOURNEY</span><span>AFTER-GLOW</span></div>
          <svg className="buzz-svg" viewBox="0 0 1150 600" preserveAspectRatio="none" aria-hidden="true"><path d={curve} fill="none" stroke="#F5A623" strokeWidth="12" strokeLinecap="round" /><path className="buzz-line" d={curve} fill="none" stroke="#1A1A1A" strokeWidth="12" strokeDasharray="2 15" /></svg>
          <ol className="curve-steps">{steps.map(([number, title, text], index) => <li className={`sketch-box curve-card curve-card-${index + 1}`} key={number}><span className="step-number">{number} /</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
        </div>
        <p className="curve-footnote">Not to scale. Definitely to feeling. <span aria-hidden="true">✳</span></p>
      </section>
    </>
  );
}

export function BuzzOutro() {
  return (
    <>
      <section className="adventure-section" aria-labelledby="adventure-title">
        <svg className="adventure-scribble" viewBox="0 0 1000 400" aria-hidden="true"><path d="M0 300 C150 0 250 400 440 150 S650 50 700 200 S900 400 1000 40" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="7 10" /></svg>
        <div className="speech-bubble bubble-left">“Let’s take the scenic route.”</div>
        <div className="speech-bubble bubble-right">“One more stop?”<br />Always.</div>
        <div className="adventure-icons" aria-hidden="true"><span>🚂</span><span>🐝</span></div>
        <span className="handwritten">Your next good story is out there.</span>
        <h2 id="adventure-title">GO FIND<br />YOUR BUZZ.</h2>
        <a className="button button-primary" href="#planner">Let’s make a plan <span aria-hidden="true">↗</span></a>
        <a className="handwritten secondary-cta" href="#curve-title">Take another look at the curve ↑</a>
      </section>
      <footer className="site-footer"><span className="footer-star" aria-hidden="true">✳</span> A LITTLE PLAN. A BIG ADVENTURE. <span>TRIP PLANNER</span></footer>
    </>
  );
}
