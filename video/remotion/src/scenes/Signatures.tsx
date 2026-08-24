import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Camera2D, Key} from '../lib/Camera2D';
import {Sfx} from '../lib/Sfx';
import {C, MONO} from '../theme';

// S5 · Two signatures.
//
// The scene the whole product exists for, and the interface proves the rule
// rather than asserting it. Luis reads the terms his agent negotiated and signs.
// The console switches to Ana at the library and his decision is simply not
// there: she is told he is reviewing one. He signs, she is told the entry is now
// waiting for her, she goes to it and signs, and the row turns cream.
//
// Cream is the one reserved colour in this film. It means an agreement both
// organizations signed and it appears nowhere else, which is why the moment it
// lands is the only real hit in the piece. An earlier take cut away to the map
// before it arrived, so the scene did not contain the thing it exists to show.

const PLATE = {w: 2560, h: 1440};
const PAGE = {cx: PLATE.w / 2, cy: PLATE.h / 2};
const FIT = 1920 / PLATE.w;
const DUR = 1140;                        // 38s at 30fps

// Measured off the encoded clip, not estimated.
const CUES = [109, 143, 176, 314, 352, 389, 478, 566, 601, 628, 676];
const LEDGER = 779;                      // the Agreements view opens
const CREAM = 862;                       // the row both directors signed flips

const HELD: Key[] = [
  {f: 0, cx: PAGE.cx, cy: PAGE.cy, s: FIT},
  {f: DUR, cx: PAGE.cx, cy: PAGE.cy + 10, s: FIT * 1.025},
];

export const Signatures: React.FC = () => {
  const frame = useCurrentFrame();

  // A pool of light over the ledger as the row lands. Warm, because what arrives
  // is cream, and this is the only place in the film that colour is allowed.
  const beat = interpolate(
    frame, [CREAM, CREAM + 12, CREAM + 190, CREAM + 240], [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  const ruleIn = interpolate(frame, [CREAM + 26, CREAM + 60], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <Camera2D keys={HELD} plate={PLATE}>
        <OffthreadVideo
          src={staticFile('vid/s5_sign.mp4')}
          muted
          style={{width: PLATE.w, height: PLATE.h}}
        />
      </Camera2D>

      <div
        style={{
          position: 'absolute',
          left: 20, top: 330, width: 540, height: 420,
          background: `radial-gradient(closest-side, rgba(240,231,214,${beat * 0.2}), transparent 74%)`,
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      {/* The rule the scene demonstrates, stated once, after it has happened.
          Said out loud in the narration too, because the ledger being partly
          seeded is the kind of thing a judge should hear from us first. */}
      <div
        style={{
          position: 'absolute', right: 84, bottom: 96, width: 520,
          textAlign: 'right',
          opacity: ruleIn,
          transform: `translateY(${(1 - ruleIn) * 10}px)`,
          fontFamily: MONO,
        }}
      >
        <div style={{height: 1, background: C.rule, transform: `scaleX(${ruleIn})`, transformOrigin: 'right'}} />
        <div style={{marginTop: 18, fontSize: 19, letterSpacing: '0.14em', color: C.inkFaint}}>
          BOTH SIGNATURES, OR NO ROW
        </div>
        <div style={{marginTop: 12, fontSize: 22, lineHeight: 1.55, color: C.inkSoft}}>
          four of these are seeded history.<br />the rest were negotiated in sessions like this one.
        </div>
      </div>

      {/* Sound. Ticks under the panel changes, a soft confirm on the first
          signature, and the one stamp in the whole film on the second, which is
          the frame the reserved colour arrives. */}
      <Sfx src="whoosh.mp3" at={1} vol={0.24} />
      {CUES.map((f) => (
        <Sfx key={f} src="click.mp3" at={f} vol={0.075} />
      ))}
      <Sfx src="confirm.mp3" at={478} vol={0.26} />
      <Sfx src="pop.mp3" at={LEDGER} vol={0.12} />
      <Sfx src="stamp.mp3" at={CREAM} vol={0.46} />
    </AbsoluteFill>
  );
};

export const SIGNATURES_DUR = DUR;
