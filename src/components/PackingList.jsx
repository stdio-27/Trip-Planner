import { useEffect, useState } from "react";

export function PackingList({ items }) {
  const [checked, setChecked] = useState(() => new Set());
  const [customItems, setCustomItems] = useState([]);
  const [newItem, setNewItem] = useState("");
  const allItems = [...items, ...customItems];

  useEffect(() => {
    setChecked(new Set());
    setCustomItems([]);
    setNewItem("");
  }, [items]);

  function toggle(itemId) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  }

  function addItem(event) {
    event.preventDefault();
    const item = newItem.trim();
    if (!item) return;
    setCustomItems((current) => [...current, item]);
    setNewItem("");
  }

  return (
    <section className="packing-section">
      <div className="section-title-row">
        <div>
          <div className="section-eyebrow">BE READY</div>
          <h3>Packing list</h3>
        </div>
        <span className="packing-count">{checked.size}/{allItems.length} packed</span>
      </div>
      {allItems.length === 0 ? (
        <p className="muted-copy">No packing suggestions yet. Add something you need.</p>
      ) : (
        <ul className="packing-list">
          {allItems.map((item, index) => {
            const id = `packing-${index}`;
            return (
              <li key={id}>
                <label className={checked.has(id) ? "is-packed" : ""}>
                  <input
                    type="checkbox"
                    checked={checked.has(id)}
                    onChange={() => toggle(id)}
                  />
                  <span>{item}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <form className="packing-add" onSubmit={addItem}>
        <label className="sr-only" htmlFor="packing-new-item">Add a packing item</label>
        <input
          id="packing-new-item"
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          placeholder="Add an item"
        />
        <button className="button button-secondary" type="submit" disabled={!newItem.trim()}>
          Add item
        </button>
      </form>
    </section>
  );
}
