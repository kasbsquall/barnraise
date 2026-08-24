import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Camera2D, Key} from '../lib/Camera2D';
import {Sfx} from '../lib/Sfx';
import {C} from '../theme';

// S5 · Two signatures.
//
// The scene the product exists for, and the interface proves the rule rather
// than asserting it. Luis reads the terms his agent negotiated and signs. The
// console switches to Ana at the library and his decision is simply not there;
// she is told he is reviewing one. She is then told the entry is waiting for
// her, goes to it, signs, and the row turns cream.
//
// Cream is the one reserved colour in this film. It means an agreement both
// organizations signed and it appears nowhere else, which is why the frame it
// lands on is the only real hit in the piece. An earlier cut ended half a second
// before the map came back, losing the beat the narration describes.

const PLATE = {w: 2560, h: 1440};
const PAGE = {cx: PLATE.w / 2, cy: PLATE.h / 2};
const FIT = 1920 / PLATE.w;
const DUR = 946;                         // 31.54s at 30fps

// Measured on the encoded cut. The flip was pinned by sampling the panel for the
// reserved colour every tenth of a second: 36.9% of the panel is cream at 21.0s
// and 63.5% at 21.1s, so 633 is the frame the second signature lands.
const LEDGER = 552;     // 18.4s · the Agreements view opens on rows already signed
const CREAM = 633;      // 21.1s · the row both directors signed flips
const MAP = 852;        // 28.4s · back to the map, the line between them thicker

// Exactly FIT, and nothing moves: see the note in Agents.tsx. An overscan here
// cropped the wordmark and the phase indicator off their own edges.
const HELD: Key[] = [
  {f: 0, cx: PAGE.cx, cy: PAGE.cy, s: FIT},
  {f: DUR, cx: PAGE.cx, cy: PAGE.cy, s: FIT},
];

export const Signatures: React.FC = () => {
  const frame = useCurrentFrame();

  // Warm, because what arrives is cream, and this is the only place in the film
  // that colour is allowed to appear.
  const beat = interpolate(
    frame, [CREAM, CREAM + 10, CREAM + 160, CREAM + 200], [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  // There was a card here reading "both signatures, or no row", and it went for
  // two reasons. It said what the narration already says, and a burned line that
  // paraphrases the subtitle under it makes a viewer stop to work out whether
  // they are two different claims. And the scene does not need it: the decision
  // panel disappearing from the other director's console, and the row refusing
  // to turn cream until she signs, are the argument.

  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <Camera2D keys={HELD} plate={PLATE}>
        <OffthreadVideo
          src={staticFile('vid/s5_cut.mp4')}
          muted
          style={{width: PLATE.w, height: PLATE.h}}
        />
      </Camera2D>

      <div
        style={{
          position: 'absolute',
          left: 16, top: 300, width: 560, height: 460,
          background: `radial-gradient(closest-side, rgba(240,231,214,${beat * 0.18}), transparent 74%)`,
          filter: 'blur(44px)',
          pointerEvents: 'none',
        }}
      />

      {/* Sound. Ticks under the panel changes, a soft confirm on the first
          signature, and the one stamp in the whole film on the second, which is
          the frame the reserved colour arrives. */}
      <Sfx src="whoosh.mp3" at={1} vol={0.2} />
      {[150, 270, 360, 450, 510].map((f) => (
        <Sfx key={f} src="click.mp3" at={f} vol={0.07} />
      ))}
      <Sfx src="confirm.mp3" at={360} vol={0.22} />
      <Sfx src="pop.mp3" at={LEDGER} vol={0.1} />
      <Sfx src="stamp.mp3" at={CREAM} vol={0.42} />
      <Sfx src="whoosh.mp3" at={MAP} vol={0.13} />
    </AbsoluteFill>
  );
};

export const SIGNATURES_DUR = DUR;
