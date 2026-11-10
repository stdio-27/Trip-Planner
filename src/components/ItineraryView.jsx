import { useEffect, useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { StopCard } from "./StopCard.jsx";

function DayBoard({ day, currency, dispatch, active }) {
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day.id}` });

  return (
    <section
      ref={setNodeRef}
      className={`day-board${active ? " is-active" : ""}${isOver ? " is-over" : ""}`}
      aria-label={day.label}
    >
      <div className="day-board-heading">
        <h3>{day.label}</h3>
        <span>{day.stops.length} {day.stops.length === 1 ? "stop" : "stops"}</span>
      </div>
      <SortableContext
        items={day.stops.map((stop) => stop.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className={`stop-list${day.stops.length === 0 ? " is-empty" : ""}`}>
          {day.stops.map((stop, index) => (
            <StopCard
              key={stop.id}
              stop={stop}
              currency={currency}
              position={index}
              total={day.stops.length}
              onRemove={() => dispatch({ type: "REMOVE_STOP", stopId: stop.id })}
              onMove={(toIndex) =>
                dispatch({
                  type: "MOVE_STOP",
                  stopId: stop.id,
                  toDayId: day.id,
                  toIndex,
                })
              }
            />
          ))}
          {day.stops.length === 0 && <p className="drop-hint">Drop a stop here</p>}
        </div>
      </SortableContext>
    </section>
  );
}

export function ItineraryView({ plan, dispatch }) {
  const [activeDayId, setActiveDayId] = useState(plan.days[0]?.id ?? null);
  useEffect(() => {
    if (!plan.days.some((day) => day.id === activeDayId)) {
      setActiveDayId(plan.days[0]?.id ?? null);
    }
  }, [plan.days, activeDayId]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleTabKeyDown(event) {
    const tabs = Array.from(
      event.currentTarget.parentElement.querySelectorAll('[role="tab"]'),
    );
    const currentIndex = tabs.indexOf(event.currentTarget);
    let nextIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const nextTab = tabs[nextIndex];
    nextTab.focus();
    setActiveDayId(nextTab.dataset.dayId);
  }

  function handleDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;

    let targetDay;
    let toIndex;
    const overId = String(over.id);

    if (overId.startsWith("day:")) {
      const dayId = overId.slice(4);
      targetDay = plan.days.find((day) => day.id === dayId);
      toIndex = targetDay?.stops.length;
    } else {
      targetDay = plan.days.find((day) => day.stops.some((stop) => stop.id === over.id));
      toIndex = targetDay?.stops.findIndex((stop) => stop.id === over.id);
    }

    if (targetDay && Number.isInteger(toIndex)) {
      dispatch({
        type: "MOVE_STOP",
        stopId: String(active.id),
        toDayId: targetDay.id,
        toIndex,
      });
      setActiveDayId(targetDay.id);
    }
  }

  if (plan.days.length === 0) {
    return <p className="muted-copy">There are no itinerary days to display.</p>;
  }

  return (
    <section className="itinerary-section" aria-label="Daily itinerary">
      <div className="day-tabs" role="tablist" aria-label="Itinerary days">
        {plan.days.map((day, index) => (
          <button
            type="button"
            key={day.id}
            id={`tab-${day.id}`}
            role="tab"
            aria-selected={activeDayId === day.id}
            aria-controls={`panel-${day.id}`}
            data-day-id={day.id}
            className={activeDayId === day.id ? "is-selected" : ""}
            onClick={() => setActiveDayId(day.id)}
            onKeyDown={handleTabKeyDown}
          >
            <span className="tab-index">0{index + 1}</span>
            {day.label}
          </button>
        ))}
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="day-boards">
          {plan.days.map((day) => (
            <div
              id={`panel-${day.id}`}
              role="tabpanel"
              aria-labelledby={`tab-${day.id}`}
              key={day.id}
              className="day-panel"
            >
              <DayBoard
                day={day}
                currency={plan.currency}
                dispatch={dispatch}
                active={activeDayId === day.id}
              />
            </div>
          ))}
        </div>
      </DndContext>
    </section>
  );
}
