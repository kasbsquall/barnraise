import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Camera2D, Key} from '../lib/Camera2D';
import {Sfx} from '../lib/Sfx';
import {C} from '../theme';

// S7 · The coalition.
//
// Eight figures are spoken here and every one of them is on screen while it is
// said. The fund and its amount, what the strongest organization covers alone
// and what the kitchen covers, the thousand people the fund asks for, the six of
// six and the three thousand two hundred and fifty they reach together, the three
// agreements the collaboration requirement demands and the eight the ledger
// holds. All of it comes out of the deterministic eligibility scan, not out of a
// model, and all of it moves as the ledger grows.
//
// No coalition round is run. The narration describes the scan's result, and the
// scan is what this view renders, so filming a live model call here would add a
// wait and prove nothing the view does not already show.
//
// The collaboration requirement used to print only the verdict, "8 agreements in
// the ledger", while the narration asserted that the fund asks for three. A
// threshold that lives only in the seed file makes the verdict unauditable, so
// the requirement now carries what it demands beside whether it is met.

const PLATE = {w: 2560, h: 1440};
const DUR = 965;                         // 32.16s at 30fps

const FIN_SCROLL = 630;   // 21.0s · the page stops moving and the reading holds
const REQ6 = 615;         // 20.5s · "the requirement nobody can fake is this one"

// The page scrolls itself for the first two thirds, so the camera holds and lets
// it. Once the reading settles the camera takes over with a slow drift, because a
// scene that stops moving eleven seconds before it ends is a still image under a
// voice still making claims.
//
// cx is fixed at 960: at scale 1 the window is 1920 across a 2560 plate, and
// panning right walks the frame off a panel pinned to the left edge.
const CAM: Key[] = [
  {f: 0, cx: 960, cy: 700, s: 1},
  {f: FIN_SCROLL, cx: 960, cy: 700, s: 1},
  {f: DUR, cx: 960, cy: 764, s: 1},
];

export const Coalition: React.FC = () => {
  const frame = useCurrentFrame();

  // One pool of light, on the requirement the last three sentences are about.
  const luz = interpolate(frame, [REQ6 - 10, REQ6 + 20, DUR - 40, DUR],
    [0, 1, 1, 0.6], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <Camera2D keys={CAM} plate={PLATE}>
        <OffthreadVideo
          src={staticFile('vid/s7_cut.mp4')}
          muted
          style={{width: PLATE.w, height: PLATE.h}}
        />
      </Camera2D>

      <div
        style={{
          position: 'absolute',
          left: 10, top: 150, width: 680, height: 300,
          background: `radial-gradient(closest-side, rgba(6,217,250,${luz * 0.13}), transparent 72%)`,
          filter: 'blur(46px)',
          pointerEvents: 'none',
        }}
      />

      {/* A sweep as the call arrives, a tick as the reading settles, and one
          accent on the requirement the ledger exists to satisfy. */}
      <Sfx src="whoosh.mp3" at={1} vol={0.18} />
      <Sfx src="click.mp3" at={FIN_SCROLL} vol={0.07} />
      <Sfx src="confirm.mp3" at={REQ6} vol={0.28} />
    </AbsoluteFill>
  );
};

export const COALITION_DUR = DUR;
