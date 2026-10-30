"use client";

import { useTheme } from "@/context/ThemeContext";
import { PiSunFill, PiMoonStarsFill, PiMonitor } from "react-icons/pi";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", icon: PiSunFill, label: "Light" },
    { value: "dark", icon: PiMoonStarsFill, label: "Dark" },
    { value: "system", icon: PiMonitor, label: "System" },
  ];

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-line bg-elev/70 p-1 shadow-card"
      role="radiogroup"
      aria-label="Theme"
    >
      {options.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            title={label}
            aria-label={`${label} theme`}
            role="radio"
            aria-checked={active}
            className={`grid h-8 w-8 place-items-center rounded-full transition-all duration-300 ${
              active
                ? "animate-pop bg-herb-600 text-white shadow-glow"
                : "text-body hover:bg-herb-100/70 hover:text-herb-700 dark:hover:bg-herb-900/60 dark:hover:text-herb-300"
            }`}
          >
            <Icon size={15} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
