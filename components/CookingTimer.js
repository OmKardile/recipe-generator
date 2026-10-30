'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, X, Timer, Volume2 } from 'lucide-react';

const PRESETS = [1, 3, 5, 10];

function beep() {
  // WebAudio chime — no audio asset needed, works even without notification permission.
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.3);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.32);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Audio blocked (autoplay policy) — visual pulse still alerts the user.
  }
}

export default function CookingTimer() {
  const [timers, setTimers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTimerMinutes, setNewTimerMinutes] = useState('');
  const [newTimerLabel, setNewTimerLabel] = useState('');
  const firedRef = useRef(new Set());

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  };

  const addTimer = () => {
    const minutes = parseInt(newTimerMinutes, 10);
    if (Number.isNaN(minutes) || minutes < 1 || minutes > 600) return;

    const totalSeconds = minutes * 60;
    const newTimer = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      label: newTimerLabel.trim().slice(0, 40) || `Timer ${timers.length + 1}`,
      totalSeconds,
      remainingSeconds: totalSeconds,
      isRunning: false,
    };

    setTimers([...timers, newTimer]);
    setNewTimerMinutes('');
    setNewTimerLabel('');
    setShowAdd(false);
    requestNotificationPermission();
  };

  const toggleTimer = (id) => {
    setTimers(timers.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t)));
  };

  const resetTimer = (id) => {
    firedRef.current.delete(id);
    setTimers(timers.map((t) =>
      t.id === id ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false } : t
    ));
  };

  const removeTimer = (id) => {
    firedRef.current.delete(id);
    setTimers(timers.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => {
          if (!t.isRunning || t.remainingSeconds <= 0) return t;
          const newRemaining = t.remainingSeconds - 1;
          if (newRemaining <= 0) {
            // Fire exactly once per completion (guard against interval races).
            if (!firedRef.current.has(t.id)) {
              firedRef.current.add(t.id);
              beep();
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(`${t.label} is done!`, {
                    body: 'Your timer has finished.',
                  });
                } catch {
                  // notification construction failed — beep already played
                }
              }
            }
            return { ...t, remainingSeconds: 0, isRunning: false };
          }
          return { ...t, remainingSeconds: newRemaining };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Escape closes the add-timer modal.
  useEffect(() => {
    if (!showAdd) return;
    const onKey = (e) => e.key === 'Escape' && setShowAdd(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAdd]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 no-print">
      {timers.length === 0 && (
        <button
          onClick={() => setShowAdd(true)}
          className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-4 rounded-full shadow-lg shadow-orange-600/30 hover:scale-105 active:scale-95 transition-transform"
          title="Add Cooking Timer"
          aria-label="Add cooking timer"
        >
          <Timer size={24} />
        </button>
      )}

      {timers.length > 0 && (
        <div className="space-y-2">
          {timers.map((timer) => (
            <div
              key={timer.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border ${
                timer.remainingSeconds === 0
                  ? 'border-green-500 animate-pulse'
                  : 'border-gray-200 dark:border-gray-700'
              } p-3 min-w-[210px] transition-colors`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex items-center gap-1.5">
                  {timer.remainingSeconds === 0 && (
                    <Volume2 size={13} className="text-green-600 dark:text-green-400 shrink-0" />
                  )}
                  {timer.label}
                </span>
                <button
                  onClick={() => removeTimer(timer.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  aria-label={`Remove ${timer.label}`}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="text-center mb-2">
                <span
                  className={`text-2xl font-mono font-bold tabular-nums ${
                    timer.remainingSeconds === 0
                      ? 'text-green-600 dark:text-green-400'
                      : timer.remainingSeconds <= 60
                        ? 'text-orange-500 dark:text-orange-400'
                        : 'text-gray-900 dark:text-white'
                  }`}
                >
                  {formatTime(timer.remainingSeconds)}
                </span>
              </div>
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => toggleTimer(timer.id)}
                  disabled={timer.remainingSeconds === 0}
                  className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors disabled:opacity-50"
                  aria-label={timer.isRunning ? 'Pause timer' : 'Start timer'}
                >
                  {timer.isRunning ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  onClick={() => resetTimer(timer.id)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  aria-label="Reset timer"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setShowAdd(true)}
            className="bg-gradient-to-br from-orange-500 to-red-600 text-white p-3 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-transform"
            title="Add Timer"
            aria-label="Add another timer"
          >
            <Plus size={20} />
          </button>
        </div>
      )}

      {showAdd && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAdd(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add cooking timer"
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Add Cooking Timer
            </h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="timer-label"
                  className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
                >
                  Label <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  id="timer-label"
                  type="text"
                  value={newTimerLabel}
                  onChange={(e) => setNewTimerLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTimer()}
                  placeholder="e.g., Boil rice"
                  maxLength={40}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                />
              </div>
              <div>
                <label
                  htmlFor="timer-minutes"
                  className="block text-sm text-gray-600 dark:text-gray-400 mb-1"
                >
                  Minutes (1–600)
                </label>
                <input
                  id="timer-minutes"
                  type="number"
                  value={newTimerMinutes}
                  onChange={(e) => setNewTimerMinutes(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTimer()}
                  placeholder="10"
                  min="1"
                  max="600"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                />
                <div className="flex gap-1.5 mt-2">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewTimerMinutes(String(preset))}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-orange-900/40 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                    >
                      {preset} min
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={addTimer}
                  disabled={!newTimerMinutes}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 disabled:opacity-50 transition"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
