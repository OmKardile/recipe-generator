'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Store, Truck, ExternalLink, ShieldQuestion, ShieldCheck, Save } from 'lucide-react';

/**
 * Shopping location — PIN code, retailer (DMart Ready), fulfilment mode and
 * honest serviceability. Without an official retailer API the check can
 * only ever be "unverified": the user confirms serviceability themselves on
 * the official site/app, and the app records that confirmation.
 */

const inputClass =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm transition';

export default function ShoppingLocationCard() {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ pincode: '', retailerId: 'dmart', fulfilment: '', pickupPoint: '' });
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/shopping-location')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setForm({
          pincode: d.location?.pincode || '',
          retailerId: d.location?.retailerId || 'dmart',
          fulfilment: d.location?.fulfilment || '',
          pickupPoint: d.location?.pickupPoint || '',
        });
      })
      .catch(() => setError('Could not load shopping location.'));
  }, []);

  if (!data) {
    return <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md h-32 animate-pulse" />;
  }

  const { retailers, serviceability, fulfilment, retailer } = data;
  const confirmed = data.location?.serviceability?.status === 'user-confirmed';
  const options = fulfilment?.options || [];
  const requiresPickup = options.find((o) => o.id === form.fulfilment)?.requiresPickupPoint;

  const runCheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const res = await fetch('/api/shopping-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pincode: form.pincode, retailerId: form.retailerId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Check failed.');
      setCheck(d.serviceability);
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  const save = async (extra = {}) => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/shopping-location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...extra }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Save failed.');
      setData(d);
      setForm({
        pincode: d.location?.pincode || '',
        retailerId: d.location?.retailerId || 'dmart',
        fulfilment: d.location?.fulfilment || '',
        pickupPoint: d.location?.pickupPoint || '',
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-2" aria-hidden="true" />
      <div className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl text-white shadow-md shadow-emerald-500/30">
            <MapPin size={20} />
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Shopping location</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              PIN code + retailer — makes prices and product picks local to you.
            </p>
          </div>
          {confirmed ? (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full shrink-0">
              <ShieldCheck size={12} /> serviceability confirmed
            </span>
          ) : (
            <span className="ml-auto flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 px-2.5 py-1 rounded-full shrink-0">
              <ShieldQuestion size={12} /> unverified
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor="loc-pin">
              PIN code
            </label>
            <input
              id="loc-pin"
              inputMode="numeric"
              maxLength="6"
              placeholder="e.g. 411001"
              className={inputClass}
              value={form.pincode}
              onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor="loc-retailer">
              Retailer
            </label>
            <select
              id="loc-retailer"
              className={inputClass}
              value={form.retailerId}
              onChange={(e) => setForm((f) => ({ ...f, retailerId: e.target.value }))}
            >
              {(retailers || []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                  {r.hasOfficialCatalogueApi ? '' : ' — manual verify'}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor="loc-fulfil">
              Fulfilment
            </label>
            <select
              id="loc-fulfil"
              className={inputClass}
              value={form.fulfilment}
              onChange={(e) => setForm((f) => ({ ...f, fulfilment: e.target.value }))}
            >
              <option value="">Choose…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={runCheck}
              disabled={checking || form.pincode.length !== 6}
              className="flex-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              {checking ? 'Checking…' : 'Check'}
            </button>
            <button
              onClick={() => save()}
              disabled={saving}
              className="flex items-center justify-center px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              aria-label="Save shopping location"
              title="Save location"
            >
              <Save size={15} />
            </button>
          </div>
        </div>

        {requiresPickup && (
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1" htmlFor="loc-pickup">
              Preferred pickup point
            </label>
            <input
              id="loc-pickup"
              className={inputClass}
              placeholder="e.g. DMart Ready, Baner pickup point"
              value={form.pickupPoint}
              onChange={(e) => setForm((f) => ({ ...f, pickupPoint: e.target.value }))}
            />
          </div>
        )}

        <AnimatePresence>
          {(check || error) && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              role={error ? 'alert' : 'status'}
              className={`p-3 rounded-lg text-xs leading-relaxed mb-3 ${
                error
                  ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : check.status === 'invalid'
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
              }`}
            >
              {error ? (
                error
              ) : (
                <>
                  <strong className="font-semibold">
                    {check.status === 'invalid' ? 'Invalid PIN' : 'Cannot verify automatically'}
                  </strong>
                  {check.status !== 'invalid' && (
                    <>
                      {' '}{check.message}{' '}
                      <a
                        href={check.officialCheckUrl || retailer?.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-0.5 font-semibold underline text-blue-700 dark:text-blue-300"
                      >
                        dmart.in <ExternalLink size={10} />
                      </a>
                      <span className="block mt-1.5">
                        Then confirm here so your lists trust local availability:
                      </span>
                      <button
                        onClick={() => save({ serviceabilityConfirmed: true })}
                        disabled={saving || form.pincode.length !== 6}
                        className="mt-1.5 px-3 py-1.5 rounded-md bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                      >
                        ✓ I confirmed DMart Ready serves PIN {form.pincode || '…'}
                      </button>
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
          <Store size={11} className="inline mr-1 -mt-0.5" />
          DMart Ready has no official public catalogue API. This app never scrapes it and never invents
          prices — every price you see is either entered by you after checking DMart, or clearly labeled
          as an AI estimate. Physical walk-in DMart stores are separate from DMart Ready online
          fulfilment.
        </p>
      </div>
    </section>
  );
}
