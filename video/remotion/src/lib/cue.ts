// Cue points expressed RELATIVE to the beats they belong to, never as bare frame numbers.
//
// THE FAILURE THIS PREVENTS. A scene's sound effects and reveals get written as literal
// frames — 58, 112, 180 — because that is what the preview showed. Then the narration is
// re-recorded, or a beat is retimed, or a shot gains twelve frames. Every visual moves,
// because the visuals are derived from the audio. The cues do not, because they are
// constants. Nothing errors. The film just falls out of sync, and the only way to find it is
// to watch the whole thing with the sound up.
//
// This happened: a verdict landed at frame 58 while the voice said the word at frame 213,
// five seconds apart, and it survived every review until a camera move made it visible.
//
// So a cue is declared against a named anchor. Move the anchor and everything tracks.
//
//   const C = cues({open: 0, verdict: 213, refusal: 239, wide: 300});
//   <Sfx src="chime.mp3" at={C.verdict} />
//   <Sfx src="error.mp3" at={C.at('refusal', -4)} />        // 4 frames early
//   {C.between('refusal', 'wide', 0.5)}                     // halfway between two anchors
//
// Anchors themselves come from the narration timing, not from taste: read the word's
// timestamp out of captions.json and convert with the composition fps.

export type Cues<K extends string> = Record<K, number> & {
  /** An anchor, offset by a number of frames. Negative lands early. */
  at: (key: K, offset?: number) => number;
  /** A fraction of the way between two anchors. */
  between: (a: K, b: K, t: number) => number;
  /** Evenly spaced cues across a span, for staggered reveals. Capped, because a long stagger reads as slow. */
  stagger: (a: K, b: K, n: number, cap?: number) => number[];
};

export const cues = <K extends string>(anchors: Record<K, number>): Cues<K> => {
  const get = (key: K): number => {
    const v = anchors[key];
    if (v === undefined) {
      throw new Error(`cue "${String(key)}" is not declared. Anchors: ${Object.keys(anchors).join(', ')}`);
    }
    return v;
  };
  return {
    ...anchors,
    at: (key, offset = 0) => get(key) + offset,
    between: (a, b, t) => get(a) + (get(b) - get(a)) * t,
    stagger: (a, b, n, cap = 8) => {
      const span = get(b) - get(a);
      const steps = Math.min(n, cap);
      return Array.from({length: n}, (_, i) => get(a) + (span * Math.min(i, steps - 1)) / Math.max(steps - 1, 1));
    },
  } as Cues<K>;
};

/**
 * Turn a word's timestamp from captions.json into a scene-local frame.
 * This is how an anchor should be derived — from the voice, not from the preview scrubber.
 */
export const wordFrame = (seconds: number, sceneStartSeconds: number, fps: number): number =>
  Math.round((seconds - sceneStartSeconds) * fps);
