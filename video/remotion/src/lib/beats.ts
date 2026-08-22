import data from '../data/beats.json';
import {FPS} from '../theme';

// Beat map from scripts/beats.py. Frames are recomputed here from seconds using the
// composition's own FPS, so a beats.json generated elsewhere can never desync.
// With the empty default ({"bpm":0,"beats":[]}) every helper degrades to identity,
// so the template compiles and previews before the music exists.
export const beatFrames: number[] = (data.beats as number[]).map((t) => Math.round(t * FPS));
export const bpm: number = data.bpm;

const nearestIdx = (f: number): number => {
  // binary search for the insertion point, then compare neighbors
  let lo = 0, hi = beatFrames.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (beatFrames[mid] < f) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(beatFrames[lo - 1] - f) <= Math.abs(beatFrames[lo] - f)) return lo - 1;
  return lo;
};

/** Nearest beat frame to f (global composition frames). Identity when no beat map. */
export const onBeat = (f: number): number =>
  beatFrames.length ? beatFrames[nearestIdx(f)] : f;

/** Next beat at or after f — for an SFX or punch-in that must never fire early. */
export const nextBeat = (f: number): number => {
  if (!beatFrames.length) return f;
  const i = nearestIdx(f);
  return beatFrames[i] >= f ? beatFrames[i] : beatFrames[Math.min(i + 1, beatFrames.length - 1)];
};

/** Nearest beat in SCENE-LOCAL frames, given the scene's global startF. This is the one
 *  to use inside a <Sequence>: `<Sfx at={onBeatLocal(scene.startF, 12)} .../>` */
export const onBeatLocal = (sceneStartF: number, localF: number): number =>
  onBeat(sceneStartF + localF) - sceneStartF;

/** 0..1 pulse peaking on each beat and decaying over decayFrames — drive scale/glow:
 *  `transform: scale(${1 + 0.03 * beatPulse(frame)})`. Returns 0 with no beat map. */
export const beatPulse = (f: number, decayFrames = 8): number => {
  if (!beatFrames.length) return 0;
  const i = nearestIdx(f);
  const b = beatFrames[i] <= f ? beatFrames[i] : i > 0 ? beatFrames[i - 1] : -Infinity;
  const since = f - b;
  return since >= 0 && since < decayFrames ? 1 - since / decayFrames : 0;
};
