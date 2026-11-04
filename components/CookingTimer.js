"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Plus, X, Timer, Volume2 } from "lucide-react";

const PRESETS = [1, 3, 5, 10];

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
    <div className="no-print" style={{ position: "fixed", bottom: "var(--gutter)", right: "var(--gutter)", zIndex: 55, display: "grid", gap: "0.5rem", justifyItems: "end" }}>
      {timers.length === 0 && (
        <button
          onClick={() => setShowAdd(true)}
          className="btn"
          data-fill
          title="Add cooking timer"
          aria-label="Add cooking timer"
        >
          <span className="fill" aria-hidden="true" />
          <Timer size={15} />
          Timer
        </button>
      )}

      {timers.length > 0 && (
        <>
          {timers.map((timer) => (
            <div key={timer.id} className="timer">
              <div className="timer__top">
                <span className="timer__label">
                  {timer.remainingSeconds === 0 && (
                    <Volume2 size={12} aria-hidden style={{ display: "inline", verticalAlign: "-2px", marginRight: "0.3em" }} />
                  )}
                  {timer.label}
                </span>
                <button
                  onClick={() => removeTimer(timer.id)}
                  className="icon-btn"
                  style={{ width: "1.6rem", height: "1.6rem" }}
                  aria-label={`Remove ${timer.label}`}
                >
                  <X size={13} />
                </button>
              </div>
              <span
                className={`timer__time${timer.remainingSeconds === 0 ? " timer__time--done" : ""}`}
                style={
                  timer.remainingSeconds <= 60 && timer.remainingSeconds > 0
                    ? { color: "var(--c-accent)" }
                    : undefined
                }
              >
                {formatTime(timer.remainingSeconds)}
              </span>
              <div className="timer__ctrls">
                <button
                  onClick={() => toggleTimer(timer.id)}
                  disabled={timer.remainingSeconds === 0}
                  className="icon-btn"
                  aria-label={timer.isRunning ? "Pause timer" : "Start timer"}
                  style={{ border: "1px solid var(--c-line-strong)", width: "2rem", height: "2rem" }}
                >
                  {timer.isRunning ? <Pause size={13} /> : <Play size={13} />}
                </button>
                <button
                  onClick={() => resetTimer(timer.id)}
                  className="icon-btn"
                  aria-label="Reset timer"
                  style={{ border: "1px solid var(--c-line-strong)", width: "2rem", height: "2rem" }}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => setShowAdd(true)}
            className="icon-btn"
            style={{ border: "1px solid var(--c-line-strong)", background: "var(--c-bg)", width: "2.2rem", height: "2.2rem" }}
            title="Add timer"
            aria-label="Add another timer"
          >
            <Plus size={16} />
          </button>
        </>
      )}

      {showAdd && (
        <div
          className="overlay in"
          onClick={() => setShowAdd(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add cooking timer"
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__head">
              <div>
                <h3 className="modal__title">Add cooking timer</h3>
                <p className="modal__sub">Chimes even in a background tab</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="icon-btn" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="modal__body">
              <div className="field">
                <label className="field__label" htmlFor="timer-label">
                  Label (optional)
                </label>
                <input
                  id="timer-label"
                  type="text"
                  value={newTimerLabel}
                  onChange={(e) => setNewTimerLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTimer()}
                  placeholder="e.g. boil rice"
                  maxLength={40}
                />
              </div>
              <div className="field">
                <label className="field__label" htmlFor="timer-minutes">
                  Minutes · 1 to 600
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
                />
              </div>
              <div className="chips">
                {PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNewTimerMinutes(String(preset))}
                    className="chip"
                  >
                    {preset} min
                  </button>
                ))}
              </div>
              <div className="modal__actions" style={{ marginTop: "0.5rem" }}>
                <button onClick={() => setShowAdd(false)} className="btn btn--ghost">
                  Cancel
                </button>
                <button onClick={addTimer} disabled={!newTimerMinutes} className="btn" data-fill>
                  <span className="fill" aria-hidden="true" />
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
