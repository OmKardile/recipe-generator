import { CookingPot, Leaf, Citrus, Cherry, Grape } from "lucide-react";

/**
 * The garnish constellation — this app's signature mark, restored.
 * A cooking pot in an emerald tile bobs gently while four colorful
 * garnish icons drift and rotate around it, each on its own phase.
 *
 * Everything here is decorative (aria-hidden): the wordmark next to it
 * carries the meaning. Animation lives in globals.css as pure CSS
 * keyframes — under prefers-reduced-motion the icons freeze in place,
 * still colorful (a visible state without the movement, per the motion
 * system's rule). Variant "mark" is the small static lid version.
 */

const GARNISH_ICONS = [
  { Icon: Leaf, className: "garnish__leaf" },
  { Icon: Citrus, className: "garnish__citrus" },
  { Icon: Cherry, className: "garnish__cherry" },
  { Icon: Grape, className: "garnish__grape" },
];

export default function Garnish({ variant = "hero", className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`garnish garnish--${variant}${className ? ` ${className}` : ""}`}
    >
      <div className="garnish__tile">
        <CookingPot className="garnish__pot" strokeWidth={2.1} />
      </div>
      {variant === "hero" &&
        GARNISH_ICONS.map(({ Icon, className: iconClass }) => (
          <Icon key={iconClass} className={`garnish__icon ${iconClass}`} strokeWidth={2.3} />
        ))}
    </div>
  );
}
