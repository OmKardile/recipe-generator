'use client';

import {
  IndianRupee, BadgeCheck, Sparkles, CircleHelp, TrendingDown, PiggyBank,
  TriangleAlert, Target,
} from 'lucide-react';

/**
 * Shopping cost intelligence — three separated price sources, never mixed:
 *   • user-verified (entered after checking DMart) — the trusted number,
 *   • AI estimates — planning hints only, clearly badged,
 *   • unpriced — honestly counted, never guessed.
 */

const money = (currency, n) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency || 'INR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

const Stat = ({ icon: Icon, label, value, tone = 'default', hint }) => (
  <div className="flex items-center gap-2.5 bg-gray-50 dark:bg-gray-750/60 rounded-lg px-3 py-2.5">
    <Icon
      size={16}
      className={`shrink-0 ${
        tone === 'emerald'
          ? 'text-emerald-600 dark:text-emerald-400'
          : tone === 'amber'
            ? 'text-amber-500'
            : tone === 'blue'
              ? 'text-blue-500'
              : 'text-gray-400'
      }`}
    />
    <div className="min-w-0">
      <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 leading-tight">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{value}</p>
      {hint && <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">{hint}</p>}
    </div>
  </div>
);

export default function ShoppingSummary({ cart, currency, needsSelection = [] }) {
  if (!cart) return null;

  const overBudget = cart.budgetRemaining != null && cart.budgetRemaining < 0;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2" aria-hidden="true" />
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="bg-gradient-to-br from-emerald-500 to-teal-600 p-2.5 rounded-xl text-white shadow-md shadow-emerald-500/30">
            <PiggyBank size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Shopping estimate</h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {cart.matchedCount} priced · {cart.unpricedCount} awaiting prices
              {needsSelection.length ? ` · ${needsSelection.length} with product options to pick` : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <Stat
            icon={BadgeCheck}
            label="Verified total"
            value={money(currency, cart.verifiedTotal)}
            tone="emerald"
            hint="prices you confirmed"
          />
          <Stat
            icon={Sparkles}
            label="AI-estimated part"
            value={money(currency, cart.estimatedTotal)}
            tone="amber"
            hint="estimates only — verify"
          />
          <Stat
            icon={Target}
            label={cart.budget != null ? (overBudget ? 'Over budget by' : 'Budget remaining') : 'Planned total'}
            value={
              cart.budget != null
                ? money(currency, Math.abs(cart.budgetRemaining))
                : money(currency, cart.plannedTotal)
            }
            tone={overBudget ? 'amber' : 'default'}
          />
          {cart.mrpTotal > 0 && (
            <Stat icon={IndianRupee} label="Total MRP" value={money(currency, cart.mrpTotal)} hint="where known" />
          )}
          {cart.savings > 0 && (
            <Stat icon={TrendingDown} label="Estimated savings" value={money(currency, cart.savings)} tone="emerald" hint="MRP − DMart price" />
          )}
          <Stat icon={CircleHelp} label="Unpriced items" value={String(cart.unpricedCount)} hint="never guessed" />
        </div>

        {(cart.stalePriceCount > 0 || cart.pinStaleCount > 0) && (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 rounded-lg px-3 py-2 flex gap-1.5" role="status">
            <TriangleAlert size={13} className="shrink-0 mt-0.5" />
            {cart.stalePriceCount > 0 &&
              `${cart.stalePriceCount} price${cart.stalePriceCount > 1 ? 's' : ''} older than a week — re-check on DMart before the final estimate. `}
            {cart.pinStaleCount > 0 &&
              `${cart.pinStaleCount} entered for a different PIN code.`}
          </p>
        )}

        {cart.topExpensive?.length > 0 && (
          <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500">
            Biggest lines: {cart.topExpensive.map((t) => `${t.name} (${money(currency, t.cost)})`).join(' · ')}
          </p>
        )}
      </div>
    </section>
  );
}
