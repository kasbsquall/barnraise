import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Camera2D, Key} from '../lib/Camera2D';
import {Sfx} from '../lib/Sfx';
import {C, MONO} from '../theme';

// S4 · The agents talk.
//
// One continuous take of the running product. The messages in the activity feed
// are what the agents wrote to each other over A2A during this round, typed in as
// they arrived, and each one crosses the map along the road it would actually
// take. This is the same round whose terms the next scene signs.
//
// The camera holds. Three treatments were built for an earlier cut and two of
// them destroyed information: pushing into the feed cropped the map out of a
// scene whose subject is the map, and the wide push sliced nine lines of body
// copy down the left edge. Two independent reviewers picked the held frame, and
// it is the only one that keeps the brand, the identity, the live phase, the
// whole map and the panel legible at once.

const PLATE = {w: 2560, h: 1440};        // captured at 2K and shown at 1080
const PAGE = {cx: PLATE.w / 2, cy: PLATE.h / 2};
const FIT = 1920 / PLATE.w;              // 0.75: the whole plate fills the frame
const DUR = 961;                         // 32.03s at 30fps

// Frames where the activity column actually changes, measured off the encoded
// clip rather than estimated. (video/capture, feed_cues)
const CUES = [4, 157, 281, 311, 384, 626, 780, 933];

// The one beat: the frame where the agents find the match. Everything else is a
// message arriving; this is the round reaching its point, and an earlier cut ran
// twenty-nine seconds without ever containing it.
const MATCH = 626;

// A message also crosses the map, which takes about a second, so the arrival
// lands 30 frames after it leaves. Clamped inside the scene.
const ARRIVALS = CUES.map((f) => f + 30).filter((f) => f < DUR - 2);

const HELD: Key[] = [
  {f: 0, cx: PAGE.cx, cy: PAGE.cy, s: FIT},
  {f: DUR, cx: PAGE.cx, cy: PAGE.cy + 10, s: FIT * 1.025},
];

export const Agents: React.FC = () => {
  const frame = useCurrentFrame();

  const beat = interpolate(
    frame, [MATCH, MATCH + 14, MATCH + 170, MATCH + 210], [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );
  const portsIn = interpolate(frame, [170, 205], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <Camera2D keys={HELD} plate={PLATE}>
        <OffthreadVideo
          src={staticFile('vid/s4_round.mp4')}
          muted
          style={{width: PLATE.w, height: PLATE.h}}
        />
      </Camera2D>

      {/* A pool of light behind the activity column when the match lands. Placed
          over the plate rather than inside the camera so the scale creep cannot
          drag it. */}
      <div
        style={{
          position: 'absolute',
          left: 30, top: 470, width: 520, height: 240,
          background: `radial-gradient(closest-side, rgba(117,212,234,${beat * 0.24}), transparent 72%)`,
          filter: 'blur(34px)',
          pointerEvents: 'none',
        }}
      />

      {/* The protocol, named. Sits in the empty quarter of the map. */}
      <div
        style={{
          position: 'absolute', right: 84, bottom: 96, width: 470,
          textAlign: 'right',
          opacity: portsIn,
          transform: `translateY(${(1 - portsIn) * 10}px)`,
          fontFamily: MONO,
        }}
      >
        <div style={{height: 1, background: C.rule, transform: `scaleX(${portsIn})`, transformOrigin: 'right'}} />
        <div style={{marginTop: 18, fontSize: 19, letterSpacing: '0.14em', color: C.inkFaint}}>
          A2A · AGENT TO AGENT
        </div>
        <div style={{marginTop: 12, fontSize: 22, lineHeight: 1.5, color: C.inkSoft}}>
          six organizations, six processes, six ports
        </div>
        <div style={{marginTop: 16, display: 'flex', gap: 22, fontSize: 26, justifyContent: 'flex-end'}}>
          <span style={{color: C.lib}}>9001</span>
          <span style={{color: C.food}}>9002</span>
          <span style={{color: C.school}}>9003</span>
          <span style={{color: C.health}}>9004</span>
          <span style={{color: C.kitchen}}>9005</span>
          <span style={{color: C.youth}}>9006</span>
        </div>
      </div>

      {/* Sound. A sweep to open, a tick under each row that lands, a quieter one
          when its pulse reaches the other station, and one accent on the match.
          The accent is louder than the punctuation around it: the arrival is the
          event, the sweep is only saying the shot changed. */}
      <Sfx src="whoosh.mp3" at={1} vol={0.24} />
      {CUES.filter((f) => f !== MATCH).map((f) => (
        <Sfx key={f} src="pop.mp3" at={f} vol={0.1} />
      ))}
      {ARRIVALS.filter((f) => f !== MATCH + 30).map((f) => (
        <Sfx key={`a${f}`} src="click.mp3" at={f} vol={0.085} />
      ))}
      <Sfx src="confirm.mp3" at={MATCH} vol={0.4} />
    </AbsoluteFill>
  );
};

export const AGENTS_DUR = DUR;
