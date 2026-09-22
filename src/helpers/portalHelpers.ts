import { CHEVRON_ANGLES, CHEVRON_COUNT, RING_ANGLES } from "@/constants/portalConstants";

/**
 * Pick 3 distinct chevron indices (out of CHEVRON_COUNT) at random.
 * Used per portal session so the same chevrons don't always light up.
 */
export const pickRandomLockSeq = (): number[] => {
  const pool = Array.from({ length: CHEVRON_COUNT }, (_, i) => i);
  const picks: number[] = [];
  while (picks.length < 3 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
};

/**
 * Ring rotation (mod 360) that places `glyphIdx` directly under `chevSlot`.
 * Chevrons are anchored at the top (-90°) baseline.
 */
export const desiredRotationMod = (glyphIdx: number, chevSlot: number): number =>
  -90 + CHEVRON_ANGLES[chevSlot] - RING_ANGLES[glyphIdx % RING_ANGLES.length];

/**
 * Compute the next forward (clockwise, non-decreasing) rotation from `from`
 * that lands on `desiredMod` (mod 360), guaranteeing at least a partial turn
 * plus `extraTurns` full rotations for the SG-1 spin feel.
 */
export const nextForwardRotation = (
  from: number,
  desiredMod: number,
  extraTurns: number
): number => {
  let delta = (((desiredMod - from) % 360) + 360) % 360;
  if (delta < 45) delta += 360;
  return from + delta + 360 * extraTurns;
};
