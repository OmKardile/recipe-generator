"use client";

import { useState, useEffect, useRef } from "react";
import {
  PiPlayFill,
  PiPauseFill,
  PiArrowCounterClockwiseFill,
  PiPlus,
  PiX,
  PiTimerFill,
  PiBellRingingFill,
} from "react-icons/pi";

const PRESETS = [1, 3, 5, 10];
const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function beep() {
  // WebAudio chime — no audio asset needed, works even without notification permission.
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
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
  const [newTimerMinutes, setNewTimerMinutes] = useState("");
  const [newTimerLabel, setNewTimerLabel] = useState("");
  const firedRef = useRef(new Set());

  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
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
    setNewTimerMinutes("");
    setNewTimerLabel("");
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
              if ("Notification" in window && Notification.permission === "granted") {
                try {
                  new Notification(`${t.label} is done!`, {
                    body: "Your timer has finished.",
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
    const onKey = (e) => e.key === "Escape" && setShowAdd(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showAdd]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="no-print fixed bottom-4 right-4 z-40">
      {timers.length === 0 && (
        <button
          onClick={() => setShowAdd(true)}
          className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-herb-600 to-herb-500 text-white shadow-glow transition-transform duration-300 hover:scale-110 active:scale-95 animate-pulse-ring"
          title="Add Cooking Timer"
          aria-label="Add cooking timer"
        >
          <PiTimerFill size={26} aria-hidden />
        </button>
      )}

      {timers.length > 0 && (
        <div className="flex flex-col items-end gap-2">
          {timers.map((timer) => {
            const pct = timer.totalSeconds > 0 ? timer.remainingSeconds / timer.totalSeconds : 0;
            const done = timer.remainingSeconds === 0;
            return (
              <div
                key={timer.id}
                className={`animate-pop w-[230px] overflow-hidden rounded-3xl border bg-elev shadow-lift ${
                  done ? "animate-pulse-ring border-herb-500" : "border-line"
                }`}
              >
                <div className="flex items-center justify-between px-3 pt-2.5">
                  <span className="flex items-center gap-1.5 truncate text-xs font-bold text-body">
                    {done && <PiBellRingingFill size={12} className="shrink-0 text-herb-600 dark:text-herb-400" aria-hidden />}
                    {timer.label}
                  </span>
                  <button
                    onClick={() => removeTimer(timer.id)}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-body transition-colors hover:bg-chili/10 hover:text-chili"
                    aria-label={`Remove ${timer.label}`}
                  >
                    <PiX size={11} aria-hidden />
                  </button>
                </div>

                <div className="flex items-center gap-3 px-3 py-2.5">
                  {/* Circular progress ring */}
                  <div className="relative grid h-[70px] w-[70px] shrink-0 place-items-center">
                    <svg viewBox="0 0 70 70" className="absolute inset-0 -rotate-90" aria-hidden>
                      <circle
                        cx="35" cy="35" r={RING_RADIUS}
                        fill="none" strokeWidth="6"
                        className="stroke-herb-100 dark:stroke-herb-900"
                      />
                      <circle
                        cx="35" cy="35" r={RING_RADIUS}
                        fill="none" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray={RING_CIRCUMFERENCE}
                        strokeDashoffset={RING_CIRCUMFERENCE * (1 - pct)}
                        className={`transition-all duration-1000 ${
                          done
                            ? "stroke-herb-500"
                            : timer.remainingSeconds <= 60
                              ? "stroke-chili"
                              : "stroke-herb-600"
                        }`}
                      />
                    </svg>
                    <span
                      className={`relative font-display text-sm font-semibold tabular-nums ${
                        done
                          ? "text-herb-600 dark:text-herb-300"
                          : timer.remainingSeconds <= 60
                            ? "text-chili"
                            : "text-ink"
                      }`}
                    >
                      {formatTime(timer.remainingSeconds)}
                    </span>
                  </div>

                  <div className="flex flex-1 justify-end gap-1.5">
                    <button
                      onClick={() => toggleTimer(timer.id)}
                      disabled={done}
                      className={`grid h-10 w-10 place-items-center rounded-full transition-all disabled:opacity-40 ${
                        timer.isRunning
                          ? "bg-saffron/15 text-saffron-deep hover:bg-saffron/25 dark:text-saffron"
                          : "bg-herb-600 text-white shadow-glow hover:scale-105"
                      }`}
                      aria-label={timer.isRunning ? "Pause timer" : "Start timer"}
                    >
                      {timer.isRunning ? <PiPauseFill size={15} aria-hidden /> : <PiPlayFill size={15} className="translate-x-[1px]" aria-hidden />}
                    </button>
                    <button
                      onClick={() => resetTimer(timer.id)}
                      className="grid h-10 w-10 place-items-center rounded-full border border-line text-body transition-all hover:rotate-[-120deg] hover:border-herb-400 hover:text-herb-700 dark:hover:text-herb-300"
                      aria-label="Reset timer"
                    >
                      <PiArrowCounterClockwiseFill size={15} aria-hidden />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={() => setShowAdd(true)}
            className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-herb-600 to-herb-500 text-white shadow-glow transition-transform hover:scale-110 active:scale-95"
            title="Add Timer"
            aria-label="Add another timer"
          >
            <PiPlus size={19} aria-hidden />
          </button>
        </div>
      )}

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-herb-950/60 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setShowAdd(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add cooking timer"
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-line bg-elev p-6 shadow-lift animate-pop"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-herb-100 text-herb-600 dark:bg-herb-900/70 dark:text-herb-300">
                <PiTimerFill size={20} aria-hidden />
              </span>
              <h3 className="font-display text-xl font-semibold">Add cooking timer</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="timer-label"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-body"
                >
                  Label <span className="font-normal normal-case tracking-normal opacity-60">(optional)</span>
                </label>
                <input
                  id="timer-label"
                  type="text"
                  value={newTimerLabel}
                  onChange={(e) => setNewTimerLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTimer()}
                  placeholder="e.g., Boil rice"
                  maxLength={40}
                  className="w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-body/60 focus:border-herb-400 focus:ring-2 focus:ring-herb-400/30 dark:bg-herb-950/40"
                />
              </div>
              <div>
                <label
                  htmlFor="timer-minutes"
                  className="mb-1.5 block text-xs font-bold uppercase tracking-[0.14em] text-body"
                >
                  Minutes (1–600)
                </label>
                <input
                  id="timer-minutes"
                  type="number"
                  value={newTimerMinutes}
                  onChange={(e) => setNewTimerMinutes(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTimer()}
                  placeholder="10"
                  min="1"
                  max="600"
                  className="w-full rounded-2xl border border-line bg-paper px-4 py-2.5 text-sm text-ink outline-none transition-all placeholder:text-body/60 focus:border-herb-400 focus:ring-2 focus:ring-herb-400/30 dark:bg-herb-950/40"
                />
                <div className="mt-2.5 flex gap-1.5">
                  {PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewTimerMinutes(String(preset))}
                      className="rounded-full border border-herb-200/70 bg-herb-100/50 px-3 py-1 text-xs font-semibold text-herb-700 transition-all hover:-translate-y-0.5 hover:border-herb-400 dark:border-herb-800 dark:bg-herb-900/50 dark:text-herb-300"
                    >
                      {preset} min
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-full border border-line py-2.5 text-sm font-semibold text-body transition-colors hover:bg-herb-100/50 dark:hover:bg-herb-900/40"
                >
                  Cancel
                </button>
                <button
                  onClick={addTimer}
                  disabled={!newTimerMinutes}
                  className="btn-shine flex-1 rounded-full bg-gradient-to-r from-herb-600 to-herb-500 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  Add timer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
