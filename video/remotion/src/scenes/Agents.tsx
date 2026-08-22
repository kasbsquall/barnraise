import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Camera2D, Key} from '../lib/Camera2D';
import {Sfx} from '../lib/Sfx';
import {C, MONO} from '../theme';

// S4 · The agents talk.
//
// One continuous take of the running product. The messages in the activity feed
// are what the agents wrote to each other over A2A during this round, typed in as
// they arrived, and this is the same round whose terms the next scene signs.
//
// Two decisions came out of an outside review of the first cut.
//
// The camera holds. Three treatments were built and two of them destroyed
// information: pushing into the feed cropped the map out of a scene whose subject
// is the map, and the wide push sliced nine lines of body copy down the left edge.
// The held frame is the only one that keeps the brand, the identity, the live
// phase, the whole map, the legend, the three organizations and the port block
// legible at once. The product moves; the camera does not need to.
//
// And the scene now contains its own discovery. The first cut ran 29 seconds in
// which the agents only introduced themselves, with twelve of those seconds
// completely static, while the moment the match is found happened after the last
// frame. The dead stretch is gone and COMPLEMENTARITY FOUND lands inside the take.

const PLATE = {w: 3840, h: 2160};
const PAGE = {cx: PLATE.w / 2, cy: PLATE.h / 2};
const DUR = 784;                       // 26.1s at 30fps

// Frames where the feed actually changes, measured off the encoded clip.
// (video/capture/feed_cues.py)
const CUES = [37, 82, 202, 383, 412, 460, 503, 566, 719];

// The one beat in the scene: the frame where the agents find the match. Every
// other cue is a message arriving; this is the round reaching its point.
const MATCH = 503;

// A message also crosses the map as a pulse, which takes 900ms, so its arrival
// lands 27 frames after it leaves. Clamped inside the scene: the last one used to
// be scheduled 19 frames past the end, where it either plays over the next scene
// or is silently dropped.
const ARRIVALS = CUES.map((f) => f + 27).filter((f) => f < DUR - 2);

const HELD: Key[] = [
  {f: 0, cx: PAGE.cx, cy: PAGE.cy, s: 0.5},
  {f: DUR, cx: PAGE.cx, cy: PAGE.cy + 8, s: 0.512},
];

export const Agents: React.FC = () => {
  const frame = useCurrentFrame();

  // A pool of light behind the matched row, for the seconds it is the hero. This
  // is the only authored event in the scene and it is tied to a real one.
  const beat = interpolate(
    frame, [MATCH, MATCH + 14, MATCH + 150, MATCH + 190], [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  const portsIn = interpolate(frame, [150, 185], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
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

      {/* Behind the activity column, where the matched row lands. Sits over the
          plate rather than inside the camera so it cannot be scaled by the creep. */}
      <div
        style={{
          position: 'absolute',
          left: 1120,
          top: 470,
          width: 540,
          height: 210,
          background: `radial-gradient(closest-side, rgba(117,212,234,${beat * 0.26}), transparent 72%)`,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          left: 1128,
          top: 812,
          width: 520,
          opacity: portsIn,
          transform: `translateY(${(1 - portsIn) * 10}px)`,
          fontFamily: MONO,
        }}
      >
        <div style={{height: 1, background: C.rule, transform: `scaleX(${portsIn})`, transformOrigin: 'left'}} />
        <div style={{marginTop: 18, fontSize: 19, letterSpacing: '0.14em', color: C.inkFaint}}>
          A2A · AGENT TO AGENT
        </div>
        <div style={{marginTop: 12, fontSize: 22, lineHeight: 1.5, color: C.inkSoft}}>
          each organization&rsquo;s agent answers on its own port
        </div>
        <div style={{marginTop: 16, display: 'flex', gap: 30, fontSize: 30, letterSpacing: '0.04em'}}>
          <span style={{color: C.lib}}>9001</span>
          <span style={{color: C.food}}>9002</span>
          <span style={{color: C.school}}>9003</span>
        </div>
      </div>

      {/* Sound. A sweep to open, a tick under each row that lands, a quieter tick
          when its pulse reaches the other station, and one hit on the match.
          The accent is louder than the punctuation around it, which is the way
          round it should have been: the arrival is the event, the sweep is not. */}
      <Sfx src="whoosh.mp3" at={1} vol={0.24} />
      {CUES.filter((f) => f !== MATCH).map((f) => (
        <Sfx key={f} src="pop.mp3" at={f} vol={0.1} />
      ))}
      {ARRIVALS.filter((f) => f !== MATCH + 27).map((f) => (
        <Sfx key={`a${f}`} src="click.mp3" at={f} vol={0.085} />
      ))}
      <Sfx src="confirm.mp3" at={MATCH} vol={0.4} />
    </AbsoluteFill>
  );
};

export const AGENTS_DUR = DUR;
