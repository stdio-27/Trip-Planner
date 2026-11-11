import { useId, useState } from "react";
import { useDebouncedSearch } from "../../hooks/useDebouncedSearch.js";

export function Combobox({
  id = undefined,
  label,
  selectedLabel = "",
  endpoint,
  onSelect,
  onClear = undefined,
  error = undefined,
  getLabel = undefined,
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listId = generatedId + "-list";
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const term = text.trim();
  const url =
    open && !selectedLabel && term.length >= 2
      ? endpoint + encodeURIComponent(term)
      : null;
  const search = useDebouncedSearch(url);
  const rows = search.data?.results ?? [];
  const expanded = Boolean(open && url);
  const activeRow = rows[active];

  function choose(row) {
    onSelect(row);
    setText("");
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="place-field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        role="combobox"
        autoComplete="off"
        maxLength={60}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={expanded ? listId : undefined}
        aria-activedescendant={
          expanded && activeRow ? listId + "-" + active : undefined
        }
        aria-invalid={Boolean(error || (!selectedLabel && text && !open))}
        aria-describedby={error ? inputId + "-error" : undefined}
        value={selectedLabel || text}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          if (!event.currentTarget.parentElement.contains(event.relatedTarget))
            setOpen(false);
        }}
        onChange={(event) => {
          setText(event.target.value);
          setOpen(true);
          setActive(-1);
          onClear?.();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            setActive(-1);
          } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            if (rows.length)
              setActive((index) =>
                event.key === "ArrowDown"
                  ? (index + 1) % rows.length
                  : index <= 0
                    ? rows.length - 1
                    : index - 1,
              );
          } else if (event.key === "Enter" && expanded) {
            event.preventDefault();
            if (activeRow) choose(activeRow);
          }
        }}
      />
      {expanded && (
        <ul
          id={listId}
          role="listbox"
          aria-label={label}
          className="place-results"
        >
          {rows.map((row, index) => (
            <li
              id={listId + "-" + index}
              key={row.id ?? row.code}
              role="option"
              aria-selected={index === active}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(row)}
            >
              {getLabel
                ? getLabel(row)
                : row.name + (row.state ? " · " + row.state : "")}
            </li>
          ))}
        </ul>
      )}
      {expanded && search.loading && <p role="status">Searching…</p>}
      {expanded && !search.loading && !search.error && !rows.length && (
        <p role="status">No matches.</p>
      )}
      {search.error && (
        <p role="alert">
          {search.errorMessage}{" "}
          <button type="button" onClick={search.retry} disabled={search.retryAfter > 0}>
            Retry
          </button>
        </p>
      )}
      {!selectedLabel && text && <small>Choose a place from the list.</small>}
      {error && (
        <p id={inputId + "-error"} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
