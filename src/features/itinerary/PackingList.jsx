import { useState } from "react";

export function PackingList({ items = [], packing, onChange }) {
  const checked = new Set(packing.checked);
  const customItems = packing.customItems;
  const [newItem, setNewItem] = useState("");

  const planItems = (items || []).map((item, index) => {
    if (item && typeof item === "object" && item.id && item.text) {
      return item;
    }
    const text = typeof item === "string" ? item : String(item?.text || "");
    return {
      id: `plan-${index}-${encodeURIComponent(text)}`,
      text,
    };
  });
  const allItems = [...planItems, ...customItems];

  function toggle(itemId) {
    onChange((current) => ({
      ...current,
      checked: current.checked.includes(itemId)
        ? current.checked.filter((id) => id !== itemId)
        : [...current.checked, itemId],
    }));
  }

  function addItem(event) {
    event.preventDefault();
    const item = newItem.trim();
    if (!item) return;
    const customId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    onChange((current) => ({
      ...current,
      customItems: [...current.customItems, { id: customId, text: item }],
    }));
    setNewItem("");
  }

  return (
    <section className="packing-section">
      <div className="section-title-row">
        <div>
          <div className="section-eyebrow">BE READY</div>
          <h3>Packing list</h3>
        </div>
        <span className="packing-count">
          {checked.size}/{allItems.length} packed
        </span>
      </div>
      {allItems.length === 0 ? (
        <p className="muted-copy">
          No packing suggestions yet. Add something you need.
        </p>
      ) : (
        <ul className="packing-list">
          {allItems.map((item) => (
            <li key={item.id}>
              <label className={checked.has(item.id) ? "is-packed" : ""}>
                <input
                  type="checkbox"
                  checked={checked.has(item.id)}
                  onChange={() => toggle(item.id)}
                />
                <span>{item.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <form className="packing-add" onSubmit={addItem}>
        <label className="sr-only" htmlFor="packing-new-item">
          Add a packing item
        </label>
        <input
          id="packing-new-item"
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Add an item"
        />
        <button
          className="button button-secondary"
          type="submit"
          disabled={!newItem.trim()}
        >
          Add item
        </button>
      </form>
    </section>
  );
}
