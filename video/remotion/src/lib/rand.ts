// Deterministic randomness. A film must render identically every time.
//
// `Math.random()`, `Date.now()` and `new Date()` are BANNED in a composition. The failure is
// nasty because it is not a crash: Remotion renders frames in parallel across workers, so a
// non-deterministic value produces a DIFFERENT result per frame. Particles jump, positions
// flicker, and a second render of the same project does not match the first — which quietly
// destroys any frame-to-frame measurement you try to run over it.
//
// Seed from something stable and index-derived: the element's key, the row number, the scene
// id. Same input, same output, forever.
//
//   const jitter = rand(`particle-${i}`);          // 0..1
//   const angle  = randRange(`spark-${i}`, -8, 8);
//   const pick   = randPick('bg', ['a', 'b', 'c']);

/** mulberry32 — small, fast, good enough distribution for visual jitter. */
const mulberry32 = (a: number) => {
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** FNV-1a: turns a seed string into a stable 32-bit integer. */
const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** A stable number in [0, 1) for a given seed. */
export const rand = (seed: string): number => mulberry32(hash(seed));

/** A stable number in [min, max). */
export const randRange = (seed: string, min: number, max: number): number => min + rand(seed) * (max - min);

/** A stable choice from a list. */
export const randPick = <T,>(seed: string, items: readonly T[]): T => items[Math.floor(rand(seed) * items.length)];

/** N stable values, for particle fields and scatter layouts. */
export const randSeries = (seed: string, n: number): number[] =>
  Array.from({length: n}, (_, i) => rand(`${seed}:${i}`));
