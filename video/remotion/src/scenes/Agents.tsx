import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Camera2D, Key} from '../lib/Camera2D';
import {Sfx} from '../lib/Sfx';
import {C, MONO} from '../theme';

// S4 · The agents talk.
//
// One take of the running product. What types into the activity column is what
// the agents wrote to each other over A2A during this round, and each message
// crosses the map along the road it would actually take. The round this filmed
// is the round the next scene signs.
//
// The camera holds. Three treatments were built for an earlier cut and two of
// them destroyed information: pushing into the feed cropped the map out of a
// scene whose subject is the map, and the wide push sliced nine lines of body
// copy down the left edge. The held frame is the only one that keeps the brand,
// the identity, the live phase, the whole map and the panel legible at once.

const PLATE = {w: 2560, h: 1440};        // captured at 2K, delivered at 1080
const PAGE = {cx: PLATE.w / 2, cy: PLATE.h / 2};
const FIT = 1920 / PLATE.w;              // 0.75: the plate fills the frame exactly
const DUR = 942;                         // 31.40s at 30fps, from the measured narration

// Measured on the encoded cut by watching the feed column's own brightness step
// when the milestone row paints, not estimated off the source timeline.
const JOIN = 735;       // 24.5s · the concealed cut into the terms being struck
const MATCH = 843;      // 28.1s · TERMS CLOSED lands, and the scene hands off

// Exactly FIT, and nothing moves.
//
// A 3% overscan was here to give the shot ambient life, and it cropped 3% off
// every edge: the wordmark lost its top and the live phase indicator lost its
// last characters. The capture is the product filling the frame edge to edge, so
// there is no margin to spend on a camera. The life in this scene is the
// messages typing and the pulses crossing the map, which is real motion rather
// than a camera pretending.
const HELD: Key[] = [
  {f: 0, cx: PAGE.cx, cy: PAGE.cy, s: FIT},
  {f: DUR, cx: PAGE.cx, cy: PAGE.cy, s: FIT},
];

export const Agents: React.FC = () => {
  const frame = useCurrentFrame();

  const beat = interpolate(
    frame, [MATCH - 4, MATCH + 10], [0, 1],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const portsIn = interpolate(frame, [150, 186], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <Camera2D keys={HELD} plate={PLATE}>
        <OffthreadVideo
          src={staticFile('vid/s4_cut.mp4')}
          muted
          style={{width: PLATE.w, height: PLATE.h}}
        />
      </Camera2D>

      {/* One pool of light, behind the one thing that matters, at the moment it
          matters. Sits over the plate rather than inside the camera so the
          translation cannot drag it off its target. */}
      <div
        style={{
          position: 'absolute',
          left: 24, top: 700, width: 560, height: 320,
          background: `radial-gradient(closest-side, rgba(117,212,234,${beat * 0.22}), transparent 72%)`,
          filter: 'blur(38px)',
          pointerEvents: 'none',
        }}
      />

      {/* Six real processes, in the organizations' own colours.
          The narration already says the agents reach each other over A2A across
          process boundaries, so the words that said that again are gone; the
          port numbers are the part a viewer cannot hear. It sits under the
          disclosure in the top right, which is the only band of the map that
          holds no pin and no route. It used to run through the Eastside Youth
          Club marker. */}
      <div
        style={{
          position: 'absolute', right: 84, top: 182,
          textAlign: 'right',
          opacity: portsIn,
          transform: `translateY(${(1 - portsIn) * 8}px)`,
          fontFamily: MONO,
        }}
      >
        <div style={{display: 'flex', gap: 20, fontSize: 24, justifyContent: 'flex-end'}}>
          <span style={{color: C.lib}}>9001</span>
          <span style={{color: C.food}}>9002</span>
          <span style={{color: C.school}}>9003</span>
          <span style={{color: C.health}}>9004</span>
          <span style={{color: C.kitchen}}>9005</span>
          <span style={{color: C.youth}}>9006</span>
        </div>
        <div style={{marginTop: 8, fontSize: 17, letterSpacing: '0.14em', color: C.inkFaint}}>
          ONE PROCESS PER ORGANIZATION
        </div>
      </div>

      {/* Sound. A sweep to open, a tick under each message that lands, and one
          accent on the match. The accent is louder than the punctuation around
          it: the arrival is the event, the sweep only says the shot changed. */}
      <Sfx src="whoosh.mp3" at={1} vol={0.2} />
      {[60, 180, 320, 460, 600, 700].map((f) => (
        <Sfx key={f} src="pop.mp3" at={f} vol={0.085} />
      ))}
      <Sfx src="click.mp3" at={JOIN} vol={0.07} />
      <Sfx src="confirm.mp3" at={MATCH} vol={0.34} />
    </AbsoluteFill>
  );
};

export const AGENTS_DUR = DUR;
