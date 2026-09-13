'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Plus, X, Timer } from 'lucide-react';

export default function CookingTimer() {
  const [timers, setTimers] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTimerMinutes, setNewTimerMinutes] = useState('');
  const [newTimerLabel, setNewTimerLabel] = useState('');

  const addTimer = () => {
    const minutes = parseInt(newTimerMinutes);
    if (isNaN(minutes) || minutes <= 0) return;

    const newTimer = {
      id: Date.now(),
      label: newTimerLabel || `Timer ${timers.length + 1}`,
      totalSeconds: minutes * 60,
      remainingSeconds: minutes * 60,
      isRunning: false,
    };

    setTimers([...timers, newTimer]);
    setNewTimerMinutes('');
    setNewTimerLabel('');
    setShowAdd(false);
  };

  const toggleTimer = (id) => {
    setTimers(timers.map((t) =>
      t.id === id ? { ...t, isRunning: !t.isRunning } : t
    ));
  };

  const resetTimer = (id) => {
    setTimers(timers.map((t) =>
      t.id === id ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false } : t
    ));
  };

  const removeTimer = (id) => {
    setTimers(timers.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setTimers((prev) =>
        prev.map((t) => {
          if (!t.isRunning || t.remainingSeconds <= 0) return t;
          const newRemaining = t.remainingSeconds - 1;
          if (newRemaining <= 0) {
            // Play notification sound
            if (typeof window !== 'undefined' && 'Notification' in window) {
              new Notification(`${t.label} is done!`, { body: 'Your timer has finished.' });
            }
            return { ...t, remainingSeconds: 0, isRunning: false };
          }
          return { ...t, remainingSeconds: newRemaining };
        })
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Floating Timer Button */}
      {timers.length === 0 && (
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
          title="Add Cooking Timer"
        >
          <Timer size={24} />
        </button>
      )}

      {/* Active Timers */}
      {timers.length > 0 && (
        <div className="space-y-2">
          {timers.map((timer) => (
            <div
              key={timer.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border ${
                timer.remainingSeconds === 0
                  ? 'border-green-500 animate-pulse'
                  : 'border-gray-200 dark:border-gray-700'
              } p-3 min-w-[200px]`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                  {timer.label}
                </span>
                <button
                  onClick={() => removeTimer(timer.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="text-center mb-2">
                <span
                  className={`text-2xl font-mono font-bold ${
                    timer.remainingSeconds === 0
                      ? 'text-green-600'
                      : timer.remainingSeconds <= 60
                      ? 'text-orange-500'
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
                  className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {timer.isRunning ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button
                  onClick={() => resetTimer(timer.id)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
          ))}

          {/* Add Timer Button */}
          <button
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
            title="Add Timer"
          >
            <Plus size={20} />
          </button>
        </div>
      )}

      {/* Add Timer Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add Cooking Timer</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={newTimerLabel}
                  onChange={(e) => setNewTimerLabel(e.target.value)}
                  placeholder="e.g., Boil pasta"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Minutes</label>
                <input
                  type="number"
                  value={newTimerMinutes}
                  onChange={(e) => setNewTimerMinutes(e.target.value)}
                  placeholder="10"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-black dark:text-white dark:bg-gray-700"
                />
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
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
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
