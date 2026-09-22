import mCoin from "@/assets/m-coin.png";
import { useTranslation } from "react-i18next";

/**
 * Premium realistic 3D gold "M" coin, rendered from a pre-generated PNG so it
 * matches the reference art exactly (thick beveled edge, embossed letter,
 * cinematic gold shading).
 */
const COIN_SIZE = 30;

const PremiumCoin = ({
  size = COIN_SIZE,
}: {
  size?: number;
  label?: string | number; // kept for API compat, ignored
}) => (
  <img
    src={mCoin}
    alt=""
    width={size}
    height={size}
    loading="lazy"
    decoding="async"
    draggable={false}
    className="block select-none"
    style={{ width: size, height: size }}
  />
);


/**
 * Mobile coins — realistic gold pieces placed next to the Stargate, each
 * with its own subtle float animation, a soft luminous trail, and a few
 * spark particles so the portal reads as the source of the rewards.
 */
type MobileCoin = {
  top: string;
  left: string;
  size: number;
  /** CSS 3D transform to tilt the coin, matching the reference photo. */
  tilt: string;
  /** Float animation keyframe. */
  anim: "coin-float-a" | "coin-float-b" | "coin-float-c";
  /** Animation duration in seconds. */
  dur: number;
  /** Animation delay in seconds. */
  delay: number;
};

const MOBILE_COINS: MobileCoin[] = [];

const MobilePrizeBurst = () => {
  const { i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");
  return (
    <div
      aria-hidden="true"
      className="sm:hidden absolute pointer-events-none z-10"
      style={{
        top: "28vw",
        transform: `translateY(-40%)${isAr ? " scaleX(-1)" : ""}`,
        [isAr ? "left" : "right"]: "3vw",
        width: "44vw",
        height: "30vw",
        perspective: "700px",
      }}
    >
      {MOBILE_COINS.map((c, i) => {
        return (
          <span
            key={i}
            className="absolute"
            style={{
              top: c.top,
              left: c.left,
              width: c.size,
              height: c.size,
            }}
          >
            {/* Luminous trail behind the coin — hint at being pulled from the portal */}
            <span
              aria-hidden="true"
              className="absolute rounded-full"
              style={{
                inset: `-${Math.round(c.size * 0.55)}px`,
                background:
                  "radial-gradient(circle, hsl(45 100% 70% / 0.55) 0%, hsl(35 100% 55% / 0.28) 35%, transparent 70%)",
                filter: "blur(6px)",
                animation: `coin-trail-pulse ${c.dur * 0.9}s ease-in-out ${c.delay}s infinite`,
              }}
            />

            {/* Tilted coin — 3D orientation for depth */}
            <span
              className="relative block"
              style={{
                transform: c.tilt,
                transformStyle: "preserve-3d",
                filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.55)) drop-shadow(0 0 8px hsl(45 100% 60% / 0.45))",
              }}
            >
              <PremiumCoin size={c.size} />
            </span>

            {/* Tiny spark particles — reinforce the "ejected from the portal" feel */}
            {[0, 1, 2].map((s) => (
              <span
                key={s}
                aria-hidden="true"
                className="absolute rounded-full"
                style={{
                  top: "50%",
                  left: "50%",
                  width: 3,
                  height: 3,
                  background: "hsl(48 100% 78%)",
                  boxShadow: "0 0 6px hsl(45 100% 65%)",
                  ['--sx' as any]: `${-(8 + s * 4)}px`,
                  ['--sy' as any]: `${-6 - s * 5}px`,
                  animation: `coin-spark ${1.8 + s * 0.4}s ease-out ${c.delay + s * 0.5}s infinite`,
                }}
              />
            ))}
          </span>
        );
      })}
    </div>
  );
};

export default MobilePrizeBurst;
