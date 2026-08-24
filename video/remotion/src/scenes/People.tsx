import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Camera2D, Key} from '../lib/Camera2D';
import {Sfx} from '../lib/Sfx';
import {C} from '../theme';

// S3 · Who this is for.
//
// The line is "six people, six organizations", so the scene puts three of the six
// on screen with their names: Ana Torres at the library, Luis Mendoza at the food
// bank, Marta Ochoa at the kitchen. Each card carries the director, the number of
// people that organization serves and its street address, which is the argument
// the line is making: these are people, not systems.
//
// Framed in on the panel rather than wide. S2 is about the neighborhood and holds
// the whole frame; this one is about who is in it, so the camera is close enough
// to read a name and the map is only the ground behind them.
//
// The building photographs are generated, and the disclosure that says so is on
// screen in the map's top right through the whole film.

const PLATE = {w: 2560, h: 1440};
const FIT = 1920 / PLATE.w;
const DUR = 307;                         // 10.24s at 30fps

// Measured on the encoded cut: the frames each card lands.
const FOOD = 90;        // 3.0s · Luis Mendoza at North Food Bank
const KITCHEN = 192;    // 6.4s · Marta Ochoa at Casa Vecinal Kitchen

// Scale 1 reads real captured pixels, and the plate is 2560 wide against a 1920
// delivery, so the frame can pan without magnifying anything. The vertical
// framing starts below the view tabs, which would otherwise be sliced through
// the middle of their letters.
// The pan is vertical only, and cx stays at 960.
//
// At scale 1 the window is 1920 across a 2560 plate, so the leftmost the camera
// can sit without showing past the plate is cx 960. Panning right from there
// walks the frame off the panel, and the panel is pinned to the left edge of the
// page: measured at the end of an earlier pan, bright type was sitting in the
// first eight columns of the frame, which is the panel being sliced. Vertical
// movement has plate above and below to spend and cannot do that.
const CAM: Key[] = [
  {f: 0, cx: 960, cy: 692, s: 1},
  {f: DUR, cx: 960, cy: 750, s: 1},
];

export const People: React.FC = () => {
  const frame = useCurrentFrame();

  // The pool takes each organization's own colour as its card arrives.
  const paso = interpolate(frame, [FOOD - 8, FOOD + 8, KITCHEN - 8, KITCHEN + 8],
    [0, 1, 1, 2], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const mezcla = (a: number[], b: number[], t: number) =>
    a.map((v, i) => Math.round(v + (b[i] - v) * t));
  const LIB = [6, 217, 250], FOODC = [241, 138, 99], KIT = [198, 119, 199];
  const rgb = paso <= 1 ? mezcla(LIB, FOODC, paso) : mezcla(FOODC, KIT, paso - 1);
  const luz = interpolate(frame, [8, 40, DUR - 30, DUR], [0, 1, 1, 0.4],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <Camera2D keys={CAM} plate={PLATE}>
        <OffthreadVideo
          src={staticFile('vid/s3_cut.mp4')}
          muted
          style={{width: PLATE.w, height: PLATE.h}}
        />
      </Camera2D>

      <div
        style={{
          position: 'absolute',
          left: -70, top: 90, width: 760, height: 820,
          background: `radial-gradient(closest-side, rgba(${rgb.join(', ')}, ${luz * 0.12}), transparent 72%)`,
          filter: 'blur(56px)',
          pointerEvents: 'none',
        }}
      />

      {/* One tick per person. */}
      <Sfx src="whoosh.mp3" at={1} vol={0.16} />
      <Sfx src="pop.mp3" at={FOOD} vol={0.1} />
      <Sfx src="pop.mp3" at={KITCHEN} vol={0.1} />
    </AbsoluteFill>
  );
};

export const PEOPLE_DUR = DUR;
