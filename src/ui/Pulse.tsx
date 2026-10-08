type Props = { className?: string; animated?: boolean; strokeWidth?: number };

export const PULSE_PATH =
  "M0 60 C 40 60, 60 52, 90 50 S 130 64, 160 58 L 205 56 L 238 4 L 262 108 L 290 26 L 318 66 C 360 64, 420 62, 520 62";

export function Pulse({ className, animated = true, strokeWidth = 7 }: Props) {
  return (
    <svg className={className} viewBox="0 0 520 112" fill="none" preserveAspectRatio="none" aria-hidden>
      <path
        d={PULSE_PATH}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1600}
        style={animated ? { strokeDasharray: 1600, animation: "pulse-draw 3.2s var(--ease) infinite" } : undefined}
      />
    </svg>
  );
}
