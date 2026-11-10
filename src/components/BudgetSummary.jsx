function formatCurrency(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function BudgetSummary({ plan }) {
  const perDay = plan.days.map((day) => ({
    id: day.id,
    label: day.label,
    total: day.stops.reduce((sum, stop) => sum + (Number(stop.estCost) || 0), 0),
  }));
  const total = perDay.reduce((sum, day) => sum + day.total, 0);

  return (
    <section className="budget-summary" aria-label="Estimated trip budget">
      <div className="budget-total">
        <span className="budget-label">Estimated total</span>
        <strong>{formatCurrency(total, plan.currency)}</strong>
      </div>
      <div className="budget-days">
        {perDay.map((day) => (
          <div className="budget-day" key={day.id}>
            <span>{day.label}</span>
            <strong>{formatCurrency(day.total, plan.currency)}</strong>
          </div>
        ))}
      </div>
      <p className="budget-disclaimer">Estimates only; your actual costs may vary.</p>
    </section>
  );
}
