// components/portal/Chevron.tsx
import { chevronBottom, chevronTop, chevronTopLit } from "@/constants/portalConstants";

interface ChevronProps {
  angle: number;
  isLocked: boolean;
  isLocking: boolean;
  isRevealing: boolean;
  dataTour?: boolean;
}

export function Chevron({ angle, isLocked, isLocking, isRevealing, dataTour }: ChevronProps) {
  const rad = ((angle - 90) * Math.PI) / 180;
  const size = 12; // chevron box size in % — elongated so inner V touches glyph ring
  const R = 50.5 - size / 2;
  const cx = 50 + R * Math.cos(rad);
  const cy = 50 + R * Math.sin(rad);
  const cls = `sg-chevron${isLocked ? " is-locked" : ""}${isLocking ? " is-locking" : ""}${isRevealing ? " is-revealing" : ""}`;

  // Front trapezoid geometry (sits in the V-notch on the outer rim)
  const topWidth = 9.2;
  const topHeight = 8.2;
  const topR = 50.5 - topHeight / 2;
  const tx = 50 + topR * Math.cos(rad);
  const ty = 50 + topR * Math.sin(rad);

  const wrapperStyle = {
    position: "absolute" as const,
    top: `${cy}%`,
    left: `${cx}%`,
    width: `${size}%`,
    height: `${size}%`,
    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
    transformOrigin: "center center" as const,
    pointerEvents: "none" as const,
    zIndex: 11,
  };

  const topWrapperStyle = {
    position: "absolute" as const,
    top: `${ty}%`,
    left: `${tx}%`,
    width: `${topWidth}%`,
    height: `${topHeight}%`,
    transform: `translate(-50%, -50%) rotate(${angle}deg)`,
    transformOrigin: "center center" as const,
    pointerEvents: "none" as const,
    zIndex: 11,
  };

  return (
    <div style={{ display: "contents" }}>
      {/* Front trapezoid (unlit + lit overlay) */}
      <div
        className={cls}
        data-tour={dataTour ? "chevron" : undefined}
        style={topWrapperStyle}
        aria-hidden
      >
        <img
          src={chevronTop}
          alt=""
          draggable={false}
          className="sg-chevron-top"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }}
        />
        <img
          src={chevronTopLit}
          alt=""
          draggable={false}
          className="sg-chevron-top-lit"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "fill",
            filter: "brightness(1.35) contrast(1.05) saturate(0.6)",
          }}
        />
      </div>

      {/* Rear V locking base — in front of the ring */}
      <div className={cls} style={wrapperStyle} aria-hidden>
        <img
          src={chevronBottom}
          alt=""
          draggable={false}
          className="sg-chevron-bottom"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "brightness(1.35) contrast(1.05) saturate(0.6)",
          }}
        />
        <span className="sg-chevron-pulse-ring" aria-hidden />
      </div>
    </div>
  );
}
