'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Clock, Flame, Lightbulb, Info, Bookmark, Check, Share2, Link2,
  Copy, ListChecks, RotateCcw, MapPin, Gauge, Carrot, Activity, Youtube,
} from 'lucide-react';
import { useRecipes } from '@/context/RecipeContext';
import { ingredientLine, formatAmount } from '@/lib/recipeUtils';
import { videoHref } from '@/lib/video';
import ServingAdjuster from './ServingAdjuster';
import RecipeMedia from './RecipeMedia';

const DIFFICULTY_STYLES = {
  Easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Hard: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

const EASE = [0.22, 1, 0.36, 1];

/** Section reveal — fires once when the block scrolls into view. */
const reveal = (delay = 0) => ({
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-32px' },
  transition: { duration: 0.6, delay, ease: EASE },
});

const ingredientStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045 } },
};
const ingredientItem = {
  hidden: { opacity: 0, x: -18 },
  show: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } },
};

export default function RecipeDisplay({ data, ingredients, preferences }) {
  const { saveRecipe } = useRecipes();
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareError, setShareError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cook mode state
  const [cookMode, setCookMode] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const [doneSteps, setDoneSteps] = useState(new Set());

  const recipe = data?.recipe;
  const structured = data?.structured && data.ingredients?.length ? data : null;
  const baseServings = structured?.servings || 4;

  const [servings, setServings] = useState(baseServings);

  const scaleFactor = structured ? servings / baseServings : 1;
  const isScaled = Math.abs(scaleFactor - 1) > 0.001;

  const markdown = useMemo(() => recipe || '', [recipe]);

  if (!recipe && !structured) return null;

  const hasVideo = Boolean(data?.youtubeVideoId);
  const watchHref = videoHref({
    youtubeVideoId: data?.youtubeVideoId,
    title: data?.canonicalDish || data?.title,
  });

  const toggleItem = (set, setter, index) => {
    const next = new Set(set);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setter(next);
  };

  const handleSave = () => {
    if (saved) return;
    saveRecipe({
      title: data.title,
      recipe,
      nutrition: data.nutrition,
      ingredients: ingredients || [],
      preferences,
      servings: baseServings,
      baseServings,
      canonicalDish: data.canonicalDish || data.title,
      youtubeVideoId: data.youtubeVideoId || null,
      youtubeChannel: data.youtubeChannel || null,
      videoVerified: Boolean(data.videoVerified),
      structured: structured
        ? {
            description: data.description,
            cuisine: data.cuisine,
            difficulty: data.difficulty,
            prepMinutes: data.prepMinutes,
            cookMinutes: data.cookMinutes,
            totalTimeMinutes: data.totalTimeMinutes,
            servings: baseServings,
            ingredients: data.ingredients,
            instructions: data.instructions,
            tips: data.tips,
          }
        : null,
    });
    setSaved(true);
  };

  const writeClipboard = async (text) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for non-secure contexts / older browsers.
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      return false;
    }
  };

  const handleShare = async () => {
    setShareError('');
    try {
      if (shared) {
        await writeClipboard(shareUrl);
        return;
      }

      setSharing(true);
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: data.title,
          recipe,
          nutrition: data.nutrition,
          ingredients: ingredients || [],
          preferences,
          canonicalDish: data.canonicalDish || data.title,
          youtubeVideoId: data.youtubeVideoId || null,
          youtubeChannel: data.youtubeChannel || null,
          videoVerified: Boolean(data.videoVerified),
        }),
      });

      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Sharing failed');

      const url = `${window.location.origin}${res.url}`;
      setShareUrl(url);
      setShared(true);
      await writeClipboard(url);
    } catch (error) {
      setShareError('Could not create a share link. Please try again.');
      console.error('Error sharing recipe:', error);
    } finally {
      setSharing(false);
    }
  };

  const handleCopyRecipe = async () => {
    const ok = await writeClipboard(markdown);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetCookMode = () => {
    setCheckedIngredients(new Set());
    setDoneSteps(new Set());
  };

  const totalTime = structured?.totalTimeMinutes;

  return (
    <motion.div
      initial={{ opacity: 0, y: 34 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
      className="w-full max-w-3xl mx-auto mt-8"
    >
      <div className="bg-white/85 dark:bg-gray-800/85 backdrop-blur-md rounded-3xl shadow-2xl shadow-emerald-900/10 overflow-hidden border border-emerald-900/10 dark:border-gray-700/80 transition-colors">
        <div className="bg-gradient-to-r from-emerald-500 via-green-600 to-teal-600 h-2.5"></div>

        <div className="p-6 md:p-10">
          {/* ── Real photo alongside the recipe ────────────────────────── */}
          <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-6 md:gap-8 items-center mb-8">
            <RecipeMedia recipe={data} variant="hero" />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {structured?.cuisine && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <MapPin size={12} /> {structured.cuisine}
                  </span>
                )}
                {structured?.difficulty && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      DIFFICULTY_STYLES[structured.difficulty] || DIFFICULTY_STYLES.Medium
                    }`}
                  >
                    <Gauge size={12} /> {structured.difficulty}
                  </span>
                )}
                {totalTime != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                    <Clock size={12} /> {totalTime} min total
                  </span>
                )}
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-3 tracking-tight leading-tight">
                {data.title}
              </h1>
              {structured?.description && (
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-lg">
                  {structured.description}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between gap-3">
                <a
                  href={watchHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-4 py-2 text-sm font-semibold shadow-md shadow-emerald-600/25 transition-all"
                >
                  <Youtube size={16} className="text-red-300" />
                  {hasVideo ? 'Watch the real video' : 'Find videos'}
                </a>
                <ServingAdjuster
                  servings={servings}
                  baseServings={baseServings}
                  onServingsChange={setServings}
                />
              </div>
            </div>
          </div>

          {structured ? (
            <>
              {/* ── Ingredients — with REAL scaling ─────────────────────── */}
              <motion.div {...reveal()} className="flex items-center gap-3 mb-4 px-1">
                <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <Carrot size={22} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  Ingredients
                </h2>
                {isScaled && (
                  <span className="ml-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                    scaled ×{formatAmount(scaleFactor)}
                  </span>
                )}
              </motion.div>

              <motion.ul
                variants={ingredientStagger}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: '-32px' }}
                className="space-y-2.5 mb-8 bg-emerald-50/60 dark:bg-gray-900/60 p-5 rounded-xl border border-emerald-100 dark:border-gray-700"
              >
                {structured.ingredients.map((ing, index) => {
                  const line = ingredientLine(ing, scaleFactor);
                  const checked = checkedIngredients.has(index);
                  return (
                    <motion.li
                      key={`${ing.name}-${index}`}
                      variants={ingredientItem}
                    >
                      <button
                        onClick={() =>
                          cookMode && toggleItem(checkedIngredients, setCheckedIngredients, index)
                        }
                        className={`w-full text-left flex gap-3 items-start transition-opacity ${
                          cookMode ? 'cursor-pointer' : 'cursor-default'
                        } ${checked ? 'opacity-50' : ''}`}
                        aria-pressed={cookMode ? checked : undefined}
                      >
                        {cookMode && (
                          <span
                            className={`mt-1 h-5 w-5 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${
                              checked
                                ? 'bg-emerald-500 border-emerald-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            aria-hidden="true"
                          >
                            {checked && <Check size={12} className="text-white" />}
                          </span>
                        )}
                        <span
                          className={`text-gray-700 dark:text-gray-200 leading-relaxed ${
                            checked ? 'line-through' : ''
                          }`}
                        >
                          {line}
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </motion.ul>
              {isScaled && (
                <p className="text-xs text-gray-400 dark:text-gray-500 -mt-6 mb-8 px-1">
                  Amounts auto-scaled from the base recipe of {baseServings} servings. Spices
                  scale non-linearly — taste and adjust.
                </p>
              )}

              {/* ── Instructions — numbered, tappable in cook mode ───────── */}
              <motion.div {...reveal()} className="flex items-center gap-3 mb-4 px-1">
                <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <Flame size={22} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  Instructions
                </h2>
                {cookMode && doneSteps.size > 0 && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {doneSteps.size}/{structured.instructions.length} done
                  </span>
                )}
              </motion.div>

              <ol className="space-y-3 mb-8">
                {structured.instructions.map((step, index) => {
                  const done = doneSteps.has(index);
                  return (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, margin: '-24px' }}
                      transition={{ duration: 0.45, delay: Math.min(index * 0.05, 0.4), ease: EASE }}
                    >
                      <button
                        onClick={() => cookMode && toggleItem(doneSteps, setDoneSteps, index)}
                        className={`w-full text-left flex gap-4 items-start p-3.5 rounded-xl transition-all ${
                          cookMode
                            ? 'hover:bg-emerald-50/70 dark:hover:bg-gray-700/50 cursor-pointer'
                            : 'cursor-default'
                        } ${done ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}
                        aria-pressed={cookMode ? done : undefined}
                      >
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors ${
                            done
                              ? 'bg-emerald-500 text-white'
                              : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                          }`}
                          aria-hidden="true"
                        >
                          {done ? <Check size={14} /> : index + 1}
                        </span>
                        <span
                          className={`text-gray-700 dark:text-gray-200 leading-relaxed pt-0.5 ${
                            done ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {step}
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </ol>

              {/* ── Tips ─────────────────────────────────────────────────── */}
              {structured.tips?.length > 0 && (
                <>
                  <motion.div {...reveal()} className="flex items-center gap-3 mb-4 px-1">
                    <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                      <Lightbulb size={22} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      Chef&apos;s Tips
                    </h2>
                  </motion.div>
                  <ul className="space-y-2 mb-8 px-1">
                    {structured.tips.map((tip, index) => (
                      <li
                        key={index}
                        className="flex gap-3 text-gray-600 dark:text-gray-300 leading-relaxed"
                      >
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            /* Legacy markdown fallback (non-structured recipes) */
            <ReactMarkdown
              components={{
                h1: ({ node, ...props }) => (
                  <h1
                    className="font-display text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-6 tracking-tight border-b border-emerald-100 dark:border-gray-700 pb-4"
                    {...props}
                  />
                ),
                h2: ({ node, ...props }) => {
                  const text = String(props.children ?? '').toLowerCase();
                  let Icon = Carrot;
                  if (text.includes('instruction') || text.includes('step')) Icon = Flame;
                  if (text.includes('time') || text.includes('serving')) Icon = Clock;
                  if (text.includes('nutrition')) Icon = Activity;
                  return (
                    <div className="flex items-center gap-3 mt-8 mb-4 px-1">
                      <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                        <Icon size={22} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100" {...props} />
                    </div>
                  );
                },
                p: ({ node, ...props }) => (
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4 px-1" {...props} />
                ),
                ul: ({ node, ...props }) => (
                  <ul
                    className="space-y-3 mb-6 bg-emerald-50/60 dark:bg-gray-900/60 p-5 rounded-xl border border-emerald-100 dark:border-gray-700 list-none"
                    {...props}
                  />
                ),
                ol: ({ node, ...props }) => (
                  <ol
                    className="list-decimal marker:text-emerald-600 dark:marker:text-emerald-400 marker:font-bold space-y-3 mb-6 pl-6"
                    {...props}
                  />
                ),
                li: ({ node, ...props }) => (
                  <li className="text-gray-700 dark:text-gray-200 leading-relaxed" {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className="font-bold text-gray-900 dark:text-white" {...props} />
                ),
              }}
            >
              {markdown}
            </ReactMarkdown>
          )}
        </div>

        {data.nutrition && (
          <div className="px-6 md:px-10 pb-6">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-xl p-6 border border-emerald-100 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="text-emerald-600 dark:text-emerald-400" size={20} />
                <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-300">
                  Nutrition per Serving
                </h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  ['Calories', data.nutrition.calories, ''],
                  ['Protein', data.nutrition.protein, 'g'],
                  ['Carbs', data.nutrition.carbs, 'g'],
                  ['Fat', data.nutrition.fat, 'g'],
                ].map(([label, value, unit]) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {value}
                      {unit}
                    </div>
                    <div className="text-sm text-emerald-600 dark:text-emerald-500">{label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-emerald-600/70 dark:text-emerald-500/70 mt-3 text-center">
                Estimated per serving — unaffected by serving scaling.
              </p>
            </div>
          </div>
        )}

        {/* ── Footer actions ──────────────────────────────────────────── */}
        <div className="bg-emerald-50/50 dark:bg-gray-900/60 p-4 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-100 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Generated by Gemini AI · Photo from a real cooking video
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {structured && (
              <button
                onClick={() => setCookMode((v) => !v)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                  cookMode
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                aria-pressed={cookMode}
              >
                <ListChecks size={16} />
                {cookMode ? 'Cook Mode On' : 'Cook Mode'}
              </button>
            )}
            {cookMode && (doneSteps.size > 0 || checkedIngredients.size > 0) && (
              <button
                onClick={resetCookMode}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
                title="Reset progress"
              >
                <RotateCcw size={16} />
              </button>
            )}
            <button
              onClick={handleCopyRecipe}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all active:scale-95"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleShare}
              disabled={sharing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 disabled:opacity-60 ${
                shared
                  ? 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {shared ? <Link2 size={16} /> : <Share2 size={16} />}
              {shared ? 'Link Copied!' : sharing ? 'Sharing…' : 'Share'}
            </button>
            <button
              onClick={handleSave}
              disabled={saved}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                saved
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25'
              } disabled:cursor-default`}
            >
              {saved ? <Check size={16} /> : <Bookmark size={16} />}
              {saved ? 'Saved' : 'Save Recipe'}
            </button>
          </div>
        </div>

        {shareError && (
          <p className="px-6 pb-4 text-sm text-red-600 dark:text-red-400" role="alert">
            {shareError}
          </p>
        )}
      </div>
    </motion.div>
  );
}
