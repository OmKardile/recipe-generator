'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Refrigerator, Plus, Trash2, AlertTriangle, Package } from 'lucide-react';

/**
 * Pantry manager — what the household already owns. Quantities are only
 * ever deducted through the explicit "I cooked this" flow in the planner
 * (POST /api/pantry/consume); nothing is ever auto-consumed by planning.
 */

const CATEGORIES = [
  { key: 'produce', label: 'Vegetables & Fruits' },
  { key: 'dairy', label: 'Dairy & Alternatives' },
  { key: 'meat', label: 'Meat & Seafood' },
  { key: 'grains', label: 'Grains & Cereals' },
  { key: 'spices', label: 'Spices & Seasoning' },
  { key: 'bakery', label: 'Bakery' },
  { key: 'frozen', label: 'Frozen' },
  { key: 'beverages', label: 'Beverages' },
  { key: 'other', label: 'Other Essentials' },
];

const UNITS = [
  { key: 'g', label: 'g' },
  { key: 'kg', label: 'kg' },
  { key: 'ml', label: 'ml' },
  { key: 'l', label: 'L' },
  { key: 'tbsp', label: 'tbsp' },
  { key: 'tsp', label: 'tsp' },
  { key: 'piece', label: 'pieces' },
];

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition';

const todayIso = () => new Date().toISOString().slice(0, 10);

const daysToExpiry = (iso) => {
  if (!iso) return null;
  const today = new Date(`${todayIso()}T00:00:00Z`).getTime();
  return Math.round((new Date(`${iso}T00:00:00Z`).getTime() - today) / 86400000);
};

export default function PantryManager() {
  const [items, setItems] = useState(null);
  const [expiring, setExpiring] = useState([]);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: '',
    quantity: '',
    unit: 'g',
    category: 'produce',
    purchaseDate: todayIso(),
    expiryDate: '',
    storage: '',
  });

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pantry');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load pantry.');
      setItems(data.items || []);
      setExpiring(data.expiring || []);
    } catch (err) {
      setError(err.message);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const addItem = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Give the item a name.');
      return;
    }
    setError(null);
    try {
      const res = await fetch('/api/pantry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity) > 0 ? Number(form.quantity) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add item.');
      setForm((f) => ({ ...f, name: '', quantity: '' }));
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const patchItem = async (id, updates) => {
    const res = await fetch(`/api/pantry/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) await load();
  };

  const removeItem = async (id) => {
    const res = await fetch(`/api/pantry/${id}`, { method: 'DELETE' });
    if (res.ok) await load();
  };

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of items || []) {
      const list = map.get(item.category) || [];
      list.push(item);
      map.set(item.category, list);
    }
    return CATEGORIES.filter((c) => map.has(c.key)).map((c) => ({ ...c, items: map.get(c.key) }));
  }, [items]);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      {/* Expiry alerts */}
      <AnimatePresence>
        {expiring.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="status"
            className="p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl text-sm text-amber-800 dark:text-amber-300 flex gap-2"
          >
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <span>
              <strong className="font-semibold">Use soon:</strong>{' '}
              {expiring
                .map((i) => {
                  const d = daysToExpiry(i.expiryDate);
                  return `${i.name} (${d < 0 ? 'expired' : d === 0 ? 'today' : `${d} day${d > 1 ? 's' : ''}`})`;
                })
                .join(' · ')}
              . The planner prioritises these when generating meals.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add-item form */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-2" aria-hidden="true" />
        <form onSubmit={addItem} className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl text-white shadow-md shadow-emerald-500/30">
              <Refrigerator size={20} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Your pantry</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Stock you already have — subtracted from every shopping list automatically.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor="pan-name">
                Item
              </label>
              <input
                id="pan-name"
                className={inputClass}
                placeholder="e.g. Basmati rice"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor="pan-qty">
                Quantity
              </label>
              <input
                id="pan-qty"
                type="number"
                min="0"
                step="0.25"
                className={inputClass}
                placeholder="500"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor="pan-unit">
                Unit
              </label>
              <select
                id="pan-unit"
                className={inputClass}
                value={form.unit}
                onChange={(e) => set('unit', e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u.key} value={u.key}>{u.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor="pan-cat">
                Category
              </label>
              <select
                id="pan-cat"
                className={inputClass}
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor="pan-exp">
                Expiry (optional)
              </label>
              <input
                id="pan-exp"
                type="date"
                className={inputClass}
                value={form.expiryDate}
                onChange={(e) => set('expiryDate', e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
              >
                <Plus size={15} /> Add
              </button>
            </div>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>
          )}
        </form>
      </section>

      {/* Items */}
      {items === null ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-48 animate-pulse" />
      ) : items.length === 0 ? (
        <div className="text-center py-14">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full inline-block mb-4">
            <Refrigerator className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Pantry is empty</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
            Add what you already have — the planner will prefer it and your shopping lists shrink to
            what you actually need to buy.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ key, label, items: groupItems }) => (
            <section key={key} aria-label={label}>
              <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                <Package size={13} /> {label}
              </h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {groupItems.map((item) => {
                  const d = daysToExpiry(item.expiryDate);
                  return (
                    <li
                      key={item.id}
                      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm p-3 flex items-center gap-3 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {item.quantity > 0 ? `${item.quantity} ${item.unit}` : 'quantity n/a'}
                          {item.storage ? ` · ${item.storage}` : ''}
                        </p>
                      </div>
                      {item.quantity > 0 && (
                        <input
                          type="number"
                          min="0"
                          step="0.25"
                          aria-label={`Quantity of ${item.name} in ${item.unit}`}
                          className="w-20 px-2 py-1 border border-gray-200 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
                          defaultValue={item.quantity}
                          onBlur={(e) => {
                            const q = Number(e.target.value);
                            if (Number.isFinite(q) && q >= 0 && q !== item.quantity) {
                              patchItem(item.id, { quantity: q });
                            }
                          }}
                        />
                      )}
                      {d != null && d <= 3 && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                            d < 0
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                              : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {d < 0 ? 'EXPIRED' : d === 0 ? 'TODAY' : `${d}d`}
                        </span>
                      )}
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors shrink-0"
                        aria-label={`Remove ${item.name}`}
                        title="Remove from pantry"
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
