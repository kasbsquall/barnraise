import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Camera2D, Key} from '../lib/Camera2D';
import {Sfx} from '../lib/Sfx';
import {C} from '../theme';

// S1 · The pause. The cold open.
//
// No logo and no title. The film opens on an agent that has stopped: the panel
// holds the terms two agents settled on a moment ago and will not write anything
// until a person signs. Those are the same terms S4 films being negotiated and
// S5 films being signed, because all three takes come from one round. Shot from
// separate rounds they would put different resources in front of a viewer being
// asked to believe they are watching one thing happen.
//
// Nothing is driven in the take. The round is genuinely blocked on a worker
// thread waiting on an event, so holding the camera on it is filming the product
// rather than performing it.

const PLATE = {w: 2560, h: 1440};
const FIT = 1920 / PLATE.w;              // 0.75: the whole plate fills the frame
const DUR = 317;                         // 10.56s at 30fps
const SALIDA = 282;                      // the pull-back, as the narration lands

// The capture is 2560 wide and the film is delivered at 1920, so at scale 1 the
// frame reads real captured pixels and there are 640 spare across and 360 down
// to move through. That is what makes an eleven-second held shot survive: a slow
// pan at a FIXED scale, which is the one ambient move that cannot shimmer,
// because nothing is being resampled at a nearly identical size every frame.
//
// Then one fast pull-back. A 33% scale change over 35 frames is far enough
// outside the danger zone to be clean, and it lands on the word "sign" and opens
// the neighborhood the next scene is about.
// The vertical framing has two edges to clear. Too high and the subtitle lands on
// the last line of the terms, eating what the panel exists to say; too low and
// the view tabs are sliced through the middle of their letters at the top, which
// reads as a broken render. Fully out is a deliberate crop, so the frame starts
// below them, and the film opens with no chrome and no logo: an agent that has
// stopped.
// The pan is vertical only, and cx stays at 960.
//
// At scale 1 the window is 1920 across a 2560 plate, so the leftmost the camera
// can sit without showing past the plate is cx 960. Panning right from there
// walks the frame off the panel, and the panel is pinned to the left edge of the
// page: measured at the end of an earlier pan, bright type was sitting in the
// first eight columns of the frame, which is the panel being sliced. Vertical
// movement has plate above and below to spend and cannot do that.
const CAM: Key[] = [
  {f: 0, cx: 960, cy: 712, s: 1},
  {f: SALIDA, cx: 960, cy: 762, s: 1},
  {f: DUR, cx: PLATE.w / 2, cy: PLATE.h / 2, s: FIT},
];

export const Pause: React.FC = () => {
  const frame = useCurrentFrame();

  // A pool of light behind the panel that is waiting for someone. It fades as
  // the camera leaves, so it never sits over the wide shot.
  const luz = interpolate(frame, [12, 60, SALIDA - 20, SALIDA + 10], [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <Camera2D keys={CAM} plate={PLATE}>
        <OffthreadVideo
          src={staticFile('vid/s1_cut.mp4')}
          muted
          style={{width: PLATE.w, height: PLATE.h}}
        />
      </Camera2D>

      <div
        style={{
          position: 'absolute',
          left: -60, top: 120, width: 720, height: 760,
          background: `radial-gradient(closest-side, rgba(6,217,250,${luz * 0.13}), transparent 72%)`,
          filter: 'blur(52px)',
          pointerEvents: 'none',
        }}
      />

      {/* One sound, on the pull-back. Under the first seconds of a film, before
          anything is established, a handful of micro-sounds reads as machinery
          rather than as a film starting. */}
      <Sfx src="whoosh.mp3" at={SALIDA - 4} vol={0.22} />
    </AbsoluteFill>
  );
};

export const PAUSE_DUR = DUR;
