import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function formatCost(value, currency) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${currency} ${Number(value).toFixed(2)}`;
  }
}

export function StopCard({
  stop,
  currency,
  position,
  total,
  onRemove,
  onMove,
}) {
  const [expanded, setExpanded] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  return (
    <article
      ref={setNodeRef}
      className={`stop-card${isDragging ? " is-dragging" : ""}`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <button
        type="button"
        className="drag-handle icon-button"
        aria-label={`Drag to move ${stop.title}`}
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true">⠿</span>
      </button>
      <div className="stop-content">
        <div className="stop-heading">
          <div>
            <span className={`category-tag category-${stop.category}`}>{stop.category}</span>
            <h4>{stop.title}</h4>
            {stop.time && <p className="stop-time">{stop.time}</p>}
          </div>
          <button
            type="button"
            className="icon-button remove-button"
            aria-label={`Remove ${stop.title}`}
            onClick={onRemove}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <button
          type="button"
          className="details-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Hide details" : "Details & cost"}
          <span aria-hidden="true">{expanded ? "−" : "+"}</span>
        </button>
        {expanded && (
          <div className="stop-details">
            {stop.description && <p>{stop.description}</p>}
            {stop.location && <p><strong>Location:</strong> {stop.location}</p>}
            <p><strong>Estimated activity cost per person:</strong> {formatCost(stop.estCost, currency)}</p>
          </div>
        )}
      </div>
      <div className="stop-reorder" aria-label={`Reorder ${stop.title}`}>
        <button
          type="button"
          className="icon-button reorder-button"
          aria-label={`Move ${stop.title} up`}
          disabled={position === 0}
          onClick={() => onMove(position - 1)}
        >
          <span aria-hidden="true">↑</span>
        </button>
        <button
          type="button"
          className="icon-button reorder-button"
          aria-label={`Move ${stop.title} down`}
          disabled={position === total - 1}
          onClick={() => onMove(position + 1)}
        >
          <span aria-hidden="true">↓</span>
        </button>
      </div>
    </article>
  );
}
