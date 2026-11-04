'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBasket, RefreshCw, Check, Copy, Plus, Trash2, ExternalLink, X,
  Store, Package, Refrigerator, ChevronDown, ListPlus, AlertTriangle, IndianRupee,
} from 'lucide-react';
import { GROCERY_CATEGORIES } from '@/lib/grocery';
import ShoppingLocationCard from '@/components/grocery/ShoppingLocationCard';
import ProductPicker from '@/components/grocery/ProductPicker';
import ShoppingSummary from '@/components/grocery/ShoppingSummary';
import ShoppingList from '@/components/ShoppingList';

/**
 * Grocery intelligence view — the consolidated, pantry-subtracted shopping
 * list built from a meal plan, with DMart Ready product matching, honest
 * cost estimates and a shopping handoff. Fully functional even when no
 * retailer data exists at all.
 */

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition';

const CATEGORY_ICONS = {
  meat: Package, dairy: Package, produce: ShoppingBasket, bakery: Package,
  frozen: Package, beverages: Package, grains: Package, spices: Package,
  other: Package,
};

export default function GroceryView({ currentRecipe, currentIngredients, onGoToPlanner }) {
  const [list, setList] = useState(null);
  const [cartPayload, setCartPayload] = useState(null);
  const [currency, setCurrency] = useState('INR');
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [pickerFor, setPickerFor] = useState(null);
  const [custom, setCustom] = useState({ name: '', quantity: '1', unit: 'piece' });
  const [copied, setCopied] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const [groceryRes, plansRes] = await Promise.all([
        fetch('/api/grocery'),
        fetch('/api/planner'),
      ]);
      const grocery = await groceryRes.json();
      const plansData = await plansRes.json();
      if (!groceryRes.ok) throw new Error(grocery.error || 'Failed to load grocery list.');
      setList(grocery.list);
      setCartPayload(grocery.cartPayload);
      setCurrency(grocery.currency || 'INR');
      const planList = plansData.plans || [];
      setPlans(planList);
      setPlanId((current) => current || grocery.list?.mealPlanId || planList[0]?.id || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const generateList = async () => {
    if (!planId) {
      setError('Create a meal plan first — the grocery list is built from it.');
      return;
    }
    setGenerating(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealPlanId: planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to build the list.');
      setList(data.list);
      setCartPayload(data.cartPayload);
      setCurrency(data.list?.currency || 'INR');
      setNotice('List refreshed from the plan — purchased items, prices and product picks preserved.');
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const mutate = async (payload) => {
    try {
      const res = await fetch('/api/grocery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed.');
      setList(data.list);
      setCartPayload(data.cartPayload);
    } catch (err) {
      setError(err.message);
    }
  };

  const attachProduct = (itemId, product) => {
    setPickerFor(null);
    mutate({ action: 'selectProduct', id: itemId, product });
  };

  const addToPantry = async () => {
    setError(null);
    try {
      const res = await fetch('/api/grocery', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'getPantryLines' }),
      });
      const data = await res.json();
      const lines = data.lines || [];
      for (const line of lines) {
        await fetch('/api/pantry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(line),
        });
      }
      await mutate({ action: 'clearPurchased' });
      setNotice(
        lines.length
          ? `${lines.length} purchased item(s) moved into your pantry.`
          : 'Nothing purchased yet — tick items off as you shop.'
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const copyList = async () => {
    if (!list) return;
    const groups = groupedItems.map(({ label, items: groupItems }) => {
      const lines = groupItems.map((item) => {
        const product = item.product
          ? ` — ${item.product.brand ? item.product.brand + ' ' : ''}${item.product.name} (${item.product.packageAmount} ${item.product.packageUnit})${
              item.product.url || item.product.searchTerm
                ? ` → ${item.product.url || `https://www.dmart.in/search?q=${encodeURIComponent(item.product.searchTerm)}`}`
                : ''
            }`
          : '';
        return `${item.purchased ? '☑' : '☐'} ${item.name}: ${item.toBuyText}${product}`;
      });
      return `${label.toUpperCase()}\n${lines.join('\n')}`;
    });
    const text = [
      `Grocery list — ${list.mealPlanId ? 'from your meal plan' : ''} (${new Date(list.generatedAt).toLocaleDateString()})`,
      '',
      groups.join('\n\n'),
      '',
      cartPayload?.cart?.plannedTotal
        ? `Estimated total: ₹${cartPayload.cart.plannedTotal} (verify prices on DMart Ready)`
        : '',
    ]
      .filter(Boolean)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard unavailable — the list is still on screen */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groupedItems = useMemo(() => {
    if (!list?.items) return [];
    return GROCERY_CATEGORIES.map(({ key, label }) => ({
      key,
      label,
      items: list.items.filter((i) => (i.category || 'other') === key),
    })).filter((g) => g.items.length > 0);
  }, [list]);

  const cartLineFor = (id) => cartPayload?.cart?.lines?.find((l) => l.id === id) || null;

  const money = (n) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(n) || 0);

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto mt-8 space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-32 animate-pulse" />
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 space-y-6">
      <ShoppingLocationCard />

      {/* ── List builder ──────────────────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-5 transition-colors">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-56">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor="gr-plan">
              Meal plan
            </label>
            <select
              id="gr-plan"
              className={inputClass}
              value={planId}
              onChange={(e) => setPlanId(e.target.value)}
            >
              {plans.length === 0 && <option value="">No plans yet</option>}
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name || p.startDate} · {p.dayCount} days, {p.mealCount} meals
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={generateList}
            disabled={generating || !planId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-sm font-semibold shadow-md shadow-emerald-600/30 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-60 transition-all"
          >
            <RefreshCw size={15} className={generating ? 'animate-spin' : ''} />
            {list ? 'Refresh from plan' : 'Build grocery list'}
          </button>
          {list && (
            <button
              onClick={copyList}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
              {copied ? 'Copied!' : 'Copy list'}
            </button>
          )}
        </div>

        <AnimatePresence>
          {(error || notice) && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role={error ? 'alert' : 'status'}
              className={`mt-3 p-3 rounded-lg text-sm ${
                error
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {error || notice}
            </motion.p>
          )}
        </AnimatePresence>

        {list?.warnings?.length > 0 && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded-lg px-3 py-2" role="status">
            <AlertTriangle size={12} className="inline mr-1 -mt-0.5" />
            {list.warnings.join(' · ')}
          </p>
        )}
      </section>

      {/* ── Empty state ───────────────────────────────────────────────── */}
      {!list && (
        <div className="text-center py-14">
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full inline-block mb-4">
            <ShoppingBasket className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            No grocery list yet
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-4">
            Build one from a meal plan — every recipe&apos;s ingredients are scaled, merged (500 g +
            300 g → 800 g) and reduced by what&apos;s already in your pantry.
          </p>
          {plans.length === 0 && (
            <button
              onClick={onGoToPlanner}
              className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
            >
              Create a meal plan first
            </button>
          )}
        </div>
      )}

      {/* ── Items ─────────────────────────────────────────────────────── */}
      {list && groupedItems.length > 0 && (
        <section className="space-y-5" aria-label="Grocery items">
          {groupedItems.map(({ key, label, items: groupItems }) => {
            const GroupIcon = CATEGORY_ICONS[key] || Package;
            return (
              <div key={key}>
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">
                  <GroupIcon size={13} /> {label}
                </h3>
                <ul className="space-y-2">
                  {groupItems.map((item) => {
                    const line = cartLineFor(item.id);
                    const product = item.product;
                    const productUrl =
                      product?.url ||
                      (product?.searchTerm
                        ? `https://www.dmart.in/search?q=${encodeURIComponent(product.searchTerm)}`
                        : null);
                    return (
                      <li
                        key={item.id}
                        className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm transition-colors overflow-hidden ${
                          item.purchased
                            ? 'border-emerald-200 dark:border-emerald-800 opacity-70'
                            : 'border-gray-100 dark:border-gray-700'
                        }`}
                      >
                        <div className="p-3 flex flex-wrap items-start gap-3">
                          {/* Purchased checkbox — real checkbox semantics */}
                          <div
                            role="checkbox"
                            aria-checked={Boolean(item.purchased)}
                            aria-label={`Mark ${item.name} as purchased`}
                            tabIndex={0}
                            onClick={() => mutate({ action: 'togglePurchased', id: item.id })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                mutate({ action: 'togglePurchased', id: item.id });
                              }
                            }}
                            className={`w-5 h-5 shrink-0 mt-0.5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-colors ${
                              item.purchased
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-gray-300 dark:border-gray-500 hover:border-emerald-400'
                            }`}
                          >
                            {item.purchased && <Check size={12} className="text-white" />}
                          </div>

                          <div className="flex-1 min-w-44">
                            <p
                              className={`text-sm font-semibold ${
                                item.purchased
                                  ? 'text-gray-400 dark:text-gray-500 line-through'
                                  : 'text-gray-900 dark:text-white'
                              }`}
                            >
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {item.custom ? (
                                'your addition'
                              ) : (
                                <>
                                  need {item.requiredText}
                                  {item.pantryBase > 0 && <> · pantry {item.pantryText}</>}
                                  {' · '}
                                  <strong className="text-gray-600 dark:text-gray-300 font-semibold">
                                    buy {item.toBuyText}
                                  </strong>
                                </>
                              )}
                            </p>

                            {/* Selected product */}
                            {product && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full px-2 py-0.5 font-medium">
                                  <Store size={10} />
                                  {product.brand ? `${product.brand} ` : ''}
                                  {product.name} · {product.packageAmount} {product.packageUnit}
                                </span>
                                {line?.packagesNeeded != null && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {line.packagesNeeded} pack{line.packagesNeeded > 1 ? 's' : ''} ×{' '}
                                    {money(product.price)} ={' '}
                                    <strong className="text-gray-700 dark:text-gray-200">
                                      {money(line.lineCost)}
                                    </strong>
                                    {line.deltaText ? ` (${line.deltaText})` : ''}
                                  </span>
                                )}
                                {product.priceSource === 'ai-estimate' ? (
                                  <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 rounded-full px-1.5 py-0.5">
                                    AI estimate
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 rounded-full px-1.5 py-0.5">
                                    you verified
                                  </span>
                                )}
                                {line?.priceStale && (
                                  <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                                    old price
                                  </span>
                                )}
                                {line?.pinNote && (
                                  <span className="text-[10px] font-bold uppercase text-red-500">
                                    {line.pinNote}
                                  </span>
                                )}
                                {line?.unitMismatch && (
                                  <span className="text-[10px] font-bold uppercase text-red-500">
                                    unit mismatch
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {!product && !item.custom && item.toBuyBase !== 0 && (
                              <PriceInput
                                item={item}
                                onSave={(price) => mutate({ action: 'setPrice', id: item.id, price })}
                              />
                            )}
                            {productUrl && (
                              <a
                                href={productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                                aria-label={`Open ${product ? product.name : item.name} on DMart Ready`}
                                title="Open on DMart Ready"
                              >
                                <ExternalLink size={15} />
                              </a>
                            )}
                            {!item.custom && (
                              <button
                                onClick={() => setPickerFor((p) => (p === item.id ? null : item.id))}
                                className={`p-1.5 rounded-md transition-colors ${
                                  pickerFor === item.id
                                    ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40'
                                    : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                                }`}
                                aria-expanded={pickerFor === item.id}
                                aria-label={`Find ${item.name} on DMart Ready`}
                                title="Find on DMart Ready"
                              >
                                <Store size={15} />
                              </button>
                            )}
                            {product && (
                              <button
                                onClick={() => mutate({ action: 'clearProduct', id: item.id })}
                                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                aria-label={`Remove product selection for ${item.name}`}
                                title="Remove product selection"
                              >
                                <X size={15} />
                              </button>
                            )}
                            {item.custom && (
                              <button
                                onClick={() => mutate({ action: 'removeItem', id: item.id })}
                                className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                aria-label={`Remove ${item.name}`}
                                title="Remove custom item"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {pickerFor === item.id && (
                            <div className="px-3 pb-3">
                              <ProductPicker
                                item={item}
                                retailerId="dmart"
                                onUse={(product2) => attachProduct(item.id, product2)}
                                onClose={() => setPickerFor(null)}
                              />
                            </div>
                          )}
                        </AnimatePresence>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {list && <ShoppingSummary cart={cartPayload?.cart} currency={currency} needsSelection={cartPayload?.needsSelection || []} />}

      {/* ── Custom items + pantry restock ─────────────────────────────── */}
      {list && (
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-5 transition-colors">
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor="cust-name">
                Add your own item
              </label>
              <input
                id="cust-name"
                className={inputClass}
                placeholder="e.g. Dishwash bar"
                value={custom.name}
                onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <input
                aria-label="Quantity"
                type="number"
                min="1"
                className={`${inputClass} !w-20`}
                value={custom.quantity}
                onChange={(e) => setCustom((c) => ({ ...c, quantity: e.target.value }))}
              />
              <select
                aria-label="Unit"
                className={`${inputClass} !w-24`}
                value={custom.unit}
                onChange={(e) => setCustom((c) => ({ ...c, unit: e.target.value }))}
              >
                {['piece', 'g', 'kg', 'ml', 'l'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                if (!custom.name.trim()) return;
                mutate({
                  action: 'addCustom',
                  name: custom.name,
                  quantity: Number(custom.quantity) || 1,
                  unit: custom.unit,
                });
                setCustom((c) => ({ ...c, name: '' }));
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Plus size={15} /> Add
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={addToPantry}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
              title="Purchased groceries become pantry stock"
            >
              <Refrigerator size={15} /> Add purchased to pantry
            </button>
            <button
              onClick={() => mutate({ action: 'clearPurchased' })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <Trash2 size={15} /> Clear purchased
            </button>
          </div>
        </section>
      )}

      {/* ── Quick list (single recipe) ────────────────────────────────── */}
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
        <button
          onClick={() => setQuickOpen((o) => !o)}
          aria-expanded={quickOpen}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-emerald-50/50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <ListPlus size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="flex-1">
            <span className="block font-semibold text-gray-900 dark:text-white text-sm">
              Quick list — one recipe
            </span>
            <span className="block text-xs text-gray-500 dark:text-gray-400">
              Simple checklist for a single recipe (current or saved), without the planner.
            </span>
          </span>
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${quickOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <AnimatePresence initial={false}>
          {quickOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                <ShoppingList currentRecipe={currentRecipe} currentIngredients={currentIngredients} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

/** Manual per-unit price (₹/kg etc.) for items without a selected product. */
function PriceInput({ item, onSave }) {
  const [value, setValue] = useState(item.price ?? '');

  const commit = () => {
    const n = Number(value);
    if (Number.isFinite(n) && n >= 0 && n !== (item.price ?? '')) {
      onSave(n);
    }
  };

  return (
    <span className="inline-flex items-center rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
      <span className="px-1.5 text-gray-400 bg-gray-50 dark:bg-gray-700" aria-hidden="true">
        <IndianRupee size={11} />
      </span>
      <input
        type="number"
        min="0"
        step="0.5"
        aria-label={`Price per ${item.unit} for ${item.name}`}
        title={`Price per ${item.unit} (your own verified price)`}
        className="w-16 px-1 py-1 bg-white dark:bg-gray-900 text-xs text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 tabular-nums"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
    </span>
  );
}
