'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search, Sparkles, ExternalLink, Check, Package, IndianRupee, BadgeCheck,
  TriangleAlert, Plus, X,
} from 'lucide-react';
import { optimizePackages } from '@/lib/productMatching';

/**
 * Product picker for one grocery line — the DMart Ready discovery surface.
 *
 * Layers, in order of trust:
 *   1. your saved, user-verified products (catalog),
 *   2. AI suggestions — ESTIMATES, always badged, never auto-selected,
 *   3. manual entry after checking the official DMart search link.
 * A deterministic package-optimizer preview shows the best-value
 * combination for the quantity you actually need.
 */

const inputClass =
  'w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition';

const PACK_UNITS = ['g', 'kg', 'ml', 'l', 'piece'];

const unitPriceText = (p) => {
  if (!p?.packageBase || p.price == null) return null;
  const per = p.price / p.packageBase;
  const unit = p.packageDim === 'mass' ? (p.packageBase >= 1000 ? 'kg' : 'g') : p.packageDim === 'volume' ? (p.packageBase >= 1000 ? 'L' : 'ml') : 'pc';
  const div = unit === 'kg' || unit === 'L' ? 1000 : 1;
  return `₹${(per * div).toFixed(unit === 'kg' || unit === 'L' ? 0 : 2)}/${unit}`;
};

export default function ProductPicker({ item, retailerId, onUse, onClose }) {
  const [saved, setSaved] = useState([]);
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [manual, setManual] = useState({
    name: item?.name || '',
    brand: '',
    packageAmount: '',
    packageUnit: item?.dim === 'count' ? 'piece' : 'g',
    price: '',
    mrp: '',
    url: '',
  });
  const [manualError, setManualError] = useState(null);
  const [savingManual, setSavingManual] = useState(false);

  const loadSaved = () => {
    const params = new URLSearchParams({ retailerId });
    if (item?.canonical) params.set('canonical', item.canonical);
    fetch(`/api/retailer-products?${params}`)
      .then((r) => r.json())
      .then((d) => setSaved(d.products || []))
      .catch(() => setSaved([]));
  };

  useEffect(loadSaved, [item?.canonical, retailerId]);

  const searchUrl = (term) =>
    `https://www.dmart.in/search?q=${encodeURIComponent(term || item?.name || '')}`;

  const askAi = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch('/api/retailer/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonical: item.canonical,
          displayName: item.name,
          dim: item.dim,
          requiredBase: item.toBuyBase,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Suggestions failed.');
      setAi(data);
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const saveManual = async (e) => {
    e.preventDefault();
    setManualError(null);
    setSavingManual(true);
    try {
      const res = await fetch('/api/retailer-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          retailerId,
          canonical: item.canonical,
          displayName: item.name,
          ...manual,
          packageAmount: Number(manual.packageAmount),
          price: Number(manual.price),
          mrp: manual.mrp ? Number(manual.mrp) : undefined,
          availability: 'user-confirmed',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed.');
      loadSaved();
      onUse({
        catalogId: data.product.id,
        retailerId: data.product.retailerId,
        name: data.product.name,
        brand: data.product.brand,
        packageAmount: data.product.packageAmount,
        packageUnit: data.product.packageUnit,
        packageBase: data.product.packageBase,
        packageDim: data.product.packageDim,
        price: data.product.price,
        mrp: data.product.mrp,
        priceSource: 'user-verified',
        availability: data.product.availability,
        pincodeEntered: data.product.pincode || null,
        verifiedAt: data.product.verifiedAt,
        url: data.product.url || null,
        searchTerm: data.product.searchTerm,
        confidence: 0.95,
      });
    } catch (err) {
      setManualError(err.message);
    } finally {
      setSavingManual(false);
    }
  };

  const applySaved = (p) =>
    onUse({
      catalogId: p.id,
      retailerId: p.retailerId,
      name: p.name,
      brand: p.brand,
      packageAmount: p.packageAmount,
      packageUnit: p.packageUnit,
      packageBase: p.packageBase,
      packageDim: p.packageDim,
      price: p.price,
      mrp: p.mrp,
      priceSource: 'user-verified',
      availability: p.availability,
      pincodeEntered: p.pincode || null,
      verifiedAt: p.verifiedAt,
      url: p.url || null,
      searchTerm: p.searchTerm,
      confidence: 0.9,
    });

  const applyAi = (p) =>
    onUse({
      catalogId: null,
      retailerId: p.retailerId,
      name: p.name,
      brand: p.brand,
      packageAmount: p.packageAmount,
      packageUnit: p.packageUnit,
      packageBase: p.packageBase,
      packageDim: p.packageDim,
      price: p.price,
      mrp: p.mrp,
      priceSource: 'ai-estimate',
      availability: 'unknown',
      pincodeEntered: null,
      verifiedAt: null,
      url: null,
      searchTerm: ai?.searchTerms?.[0] || item.name,
      notes: p.notes,
      confidence: 0.45,
    });

  // Deterministic best-value preview across priced candidates.
  const optimizerPreview = useMemo(() => {
    if (!item?.toBuyBase) return null;
    const priced = saved.filter((p) => p.packageDim === item.dim && p.price != null);
    if (priced.length < 1) return null;
    return optimizePackages(item.toBuyBase, priced);
  }, [saved, item?.toBuyBase, item?.dim]);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="bg-emerald-50/60 dark:bg-emerald-900/15 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-4 space-y-4 overflow-hidden"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm text-gray-900 dark:text-white">
            Find “{item.name}” on DMart Ready
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Need {item.toBuyText}. Official search:{' '}
            <a
              href={searchUrl(item.name)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-semibold text-emerald-700 dark:text-emerald-300 underline"
            >
              {item.name} <ExternalLink size={10} />
            </a>
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          aria-label="Close product picker"
        >
          <X size={16} />
        </button>
      </div>

      {/* Saved verified products */}
      {saved.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1">
            <BadgeCheck size={12} /> Your verified products
          </p>
          <ul className="space-y-2">
            {saved.map((p) => (
              <li
                key={p.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-2.5 flex flex-wrap items-center gap-2"
              >
                <div className="flex-1 min-w-40">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {p.brand ? `${p.brand} ` : ''}{p.name}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {p.packageAmount} {p.packageUnit} · ₹{p.price}
                    {p.mrp ? ` (MRP ₹${p.mrp})` : ''} · {unitPriceText(p) || '—'}
                  </p>
                </div>
                {p.url && (
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600"
                    aria-label={`Open ${p.name} on DMart`}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                <button
                  onClick={() => applySaved(p)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors"
                >
                  <Check size={12} /> Use
                </button>
              </li>
            ))}
          </ul>
          {optimizerPreview && (
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-900/30 rounded-lg px-3 py-2">
              <Sparkles size={11} className="inline mr-1 -mt-0.5" />
              Best-value combination for {item.toBuyText}:{' '}
              {optimizerPreview.packages.map((c) => `${c.count}× ${c.packageBase >= 1000 && item.dim === 'mass' ? `${c.packageBase / 1000}kg` : `${c.packageBase}${item.dim === 'volume' ? 'ml' : item.dim === 'count' ? 'pc' : 'g'}`}`).join(' + ')}
              {' '}≈ ₹{optimizerPreview.totalCost}
              {optimizerPreview.deltaBase === 0 ? ' — covers it exactly.' : ` (+${optimizerPreview.deltaBase}${item.dim === 'volume' ? 'ml' : item.dim === 'count' ? 'pc' : 'g'} extra).`}
            </p>
          )}
        </div>
      )}

      {/* AI suggestions */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 flex items-center gap-1">
            <Sparkles size={12} /> AI suggestions
          </p>
          <button
            onClick={askAi}
            disabled={aiLoading}
            className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-60 transition-colors"
          >
            {aiLoading ? 'Thinking…' : ai ? 'Refresh suggestions' : 'Get suggestions'}
          </button>
        </div>
        {aiError && (
          <p className="text-xs text-red-600 dark:text-red-400" role="alert">{aiError}</p>
        )}
        {ai && (
          <>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded-md px-2.5 py-1.5 mb-2 flex gap-1.5" role="note">
              <TriangleAlert size={12} className="shrink-0 mt-0.5" />
              {ai.disclaimer}
            </p>
            <ul className="space-y-2">
              {ai.products.map((p, i) => (
                <li
                  key={i}
                  className="bg-white dark:bg-gray-800 rounded-lg border border-dashed border-amber-300 dark:border-amber-700 p-2.5 flex flex-wrap items-center gap-2"
                >
                  <div className="flex-1 min-w-40">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {p.brand ? `${p.brand} ` : ''}{p.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {p.packageAmount} {p.packageUnit} · est. ₹{p.price}
                      {p.mrp ? ` (MRP est. ₹${p.mrp})` : ''}
                      {p.notes ? ` · ${p.notes}` : ''}
                    </p>
                  </div>
                  <a
                    href={searchUrl(ai.searchTerms?.[0] || p.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-gray-400 hover:text-emerald-600"
                    aria-label={`Verify ${p.name} on DMart`}
                    title="Verify on DMart Ready"
                  >
                    <Search size={14} />
                  </a>
                  <button
                    onClick={() => applyAi(p)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
                    title="Use as an estimate — replace with the real price after checking"
                  >
                    Use estimate
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Manual entry — the ground truth */}
      <form onSubmit={saveManual} className="border-t border-emerald-200 dark:border-emerald-800/60 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2 flex items-center gap-1">
          <Plus size={12} /> Verified on DMart? Save it
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <input
            aria-label="Product name"
            className={inputClass}
            placeholder="Product name"
            value={manual.name}
            onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))}
            required
          />
          <input
            aria-label="Brand"
            className={inputClass}
            placeholder="Brand"
            value={manual.brand}
            onChange={(e) => setManual((m) => ({ ...m, brand: e.target.value }))}
          />
          <div className="flex gap-1.5">
            <input
              aria-label="Package size"
              type="number"
              min="0.25"
              step="0.25"
              className={inputClass}
              placeholder="Size"
              value={manual.packageAmount}
              onChange={(e) => setManual((m) => ({ ...m, packageAmount: e.target.value }))}
              required
            />
            <select
              aria-label="Package unit"
              className={`${inputClass} !w-20`}
              value={manual.packageUnit}
              onChange={(e) => setManual((m) => ({ ...m, packageUnit: e.target.value }))}
            >
              {PACK_UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="relative">
            <IndianRupee size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              aria-label="DMart price"
              type="number"
              min="0"
              step="0.5"
              className={`${inputClass} pl-7`}
              placeholder="Price"
              value={manual.price}
              onChange={(e) => setManual((m) => ({ ...m, price: e.target.value }))}
              required
            />
          </div>
          <div className="relative">
            <IndianRupee size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              aria-label="MRP (optional)"
              type="number"
              min="0"
              step="0.5"
              className={`${inputClass} pl-7`}
              placeholder="MRP (opt.)"
              value={manual.mrp}
              onChange={(e) => setManual((m) => ({ ...m, mrp: e.target.value }))}
            />
          </div>
          <input
            aria-label="DMart product URL (optional)"
            className={inputClass}
            placeholder="Product URL (opt.)"
            value={manual.url}
            onChange={(e) => setManual((m) => ({ ...m, url: e.target.value }))}
          />
        </div>
        {manualError && (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400" role="alert">{manualError}</p>
        )}
        <button
          type="submit"
          disabled={savingManual}
          className="mt-2.5 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          <Package size={13} />
          {savingManual ? 'Saving…' : 'Save & use this product'}
        </button>
      </form>
    </motion.div>
  );
}
