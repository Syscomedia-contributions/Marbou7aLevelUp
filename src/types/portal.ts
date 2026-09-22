// types/portal.ts

export type Phase = "idle" | "selecting" | "opening" | "revealed";

/** Sub-stage during the "opening" phase:
 *  0 = pre-alarm silence, 1 = alarm, 2 = smoke/suspense,
 *  3 = activation, 4 = lock, 5 = vortex */
export type Stage = 0 | 1 | 2 | 3 | 4 | 5;

export type Cat = { key: string; img: string };

export type RevealedCat = Cat & { glyphIndex: number };
