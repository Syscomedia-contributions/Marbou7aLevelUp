/**
 * Static warm orange sparks/embers overlaid along the left & right edges of
 * the hero — mirrors the fixed embers painted on the mobile background.
 */

// [left%, top%, size(px), warmth(0..1)]
// Two vertical columns of embers hugging each side, matching the mobile look.
const POINTS: Array<[number, number, number, number]> = [
  // LEFT edge column
  [2, 12, 0.3, 0.2],
  [5, 22, 0.4, 0.25],
  [3, 34, 0.5, 0.3],
  [6, 44, 2, 0.6],
  [2, 55, 3, 0.85],
  [5, 66, 3, 0.9],
  [3, 76, 2, 0.6],
  [6, 86, 4, 1],
  [1, 94, 2, 0.7],
  [8, 18, 2, 0.5],
  [9, 50, 2, 0.5],
  [8, 82, 2, 0.55],

  // RIGHT edge column
  [96, 8, 3, 0.9],
  [93, 18, 4, 1],
  [97, 28, 2, 0.6],
  [94, 40, 3, 0.85],
  [98, 52, 2, 0.55],
  [95, 62, 4, 1],
  [97, 74, 2, 0.7],
  [93, 84, 3, 0.9],
  [96, 94, 2, 0.6],
  [90, 14, 2, 0.5],
  [91, 46, 2, 0.5],
  [90, 78, 2, 0.55],
];

interface Props {
  className?: string;
}

const Fireworks = ({ className = "" }: Props) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {POINTS.map(([left, top, size, warmth], i) => {
        const hue = 22;
        const sat = 95;
        const light = Math.round(58 + 12 * warmth);
        return (
          <span
            key={i}
            style={{
              position: "absolute",
              left: `${left}%`,
              top: `${top}%`,
              width: `${size}px`,
              height: `${size}px`,
              borderRadius: "9999px",
              // All sparks go BEHIND interactive content (buttons, CTAs).
              zIndex: -1,
              background: `radial-gradient(circle, hsl(40 100% 92% / 1) 0%, hsl(${hue} ${sat}% ${light}% / 0.95) 45%, hsl(${hue} ${sat}% ${light}% / 0) 100%)`,
              boxShadow: `0 0 ${size * 3}px hsl(${hue} ${sat}% ${light}% / 0.9), 0 0 ${size * 6}px hsl(${hue} ${sat}% ${light - 8}% / 0.5)`,
              opacity: 0.75 + 0.25 * warmth,
            }}
          />
        );
      })}
    </div>
  );
};

export default Fireworks;
