import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Camera2D, Key} from '../lib/Camera2D';
import {Sfx} from '../lib/Sfx';
import {C} from '../theme';

// S2 · Six organizations, seven hundred metres apart.
//
// The problem, stated with real geography. Each card opens on the sentence that
// names its organization: the library's van idle on Tuesdays, the food bank's
// cold room, the kitchen's six burners. Then the neighborhood opens out with the
// library's card still showing its own list of driving distances, so the line
// about how close they are is a figure a viewer can read rather than a claim.
//
// Every distance in that list is a real driving route over OpenStreetMap data,
// cached in seed/routes.json. The line the narration says out loud, seven
// hundred metres, is the library to the food bank: the route says 714.
//
// The narration used to end "none of them knows what the others have", and the
// map in this scene carries seven agreements they have already signed, which
// contradicts it inside the same frame. What is true, and is the guarantee the
// product actually makes, is that no agent has a tool returning a neighbor's
// inventory: they cannot SEE what the others have idle.

const PLATE = {w: 2560, h: 1440};
const FIT = 1920 / PLATE.w;
const DUR = 746;                         // 24.85s at 30fps

// Measured on the encoded cut. Each is the frame a card lands.
const LIB = 141;        //  4.7s · Central Library
const FOOD = 255;       //  8.5s · North Food Bank
const KITCHEN = 369;    // 12.3s · Casa Vecinal Kitchen
const WIDE = 525;       // 17.5s · the whole neighborhood, distances still open

const HELD: Key[] = [
  {f: 0, cx: PLATE.w / 2, cy: PLATE.h / 2, s: FIT},
  {f: DUR, cx: PLATE.w / 2, cy: PLATE.h / 2, s: FIT},
];

export const Neighborhood: React.FC = () => {
  const frame = useCurrentFrame();

  // The pool of light follows the card, warming as each organization is named
  // and cooling out when the neighborhood opens.
  const luz = interpolate(frame, [LIB - 6, LIB + 14, WIDE - 20, WIDE + 20], [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tono = interpolate(frame, [LIB, FOOD, KITCHEN], [0, 1, 2],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rgb = tono < 1
    ? `${Math.round(6 + tono * 235)}, ${Math.round(217 - tono * 79)}, ${Math.round(250 - tono * 151)}`
    : `${Math.round(241 - (tono - 1) * 43)}, ${Math.round(138 - (tono - 1) * 19)}, ${Math.round(99 + (tono - 1) * 100)}`;

  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <Camera2D keys={HELD} plate={PLATE}>
        <OffthreadVideo
          src={staticFile('vid/s2_cut.mp4')}
          muted
          style={{width: PLATE.w, height: PLATE.h}}
        />
      </Camera2D>

      <div
        style={{
          position: 'absolute',
          left: -40, top: 140, width: 660, height: 700,
          background: `radial-gradient(closest-side, rgba(${rgb}, ${luz * 0.12}), transparent 72%)`,
          filter: 'blur(48px)',
          pointerEvents: 'none',
        }}
      />

      {/* One tick per card, and a sweep when the neighborhood opens out. The
          cards are the events; the sweep only says the shot changed. */}
      <Sfx src="whoosh.mp3" at={1} vol={0.18} />
      {[LIB, FOOD, KITCHEN].map((f) => (
        <Sfx key={f} src="pop.mp3" at={f} vol={0.11} />
      ))}
      <Sfx src="whoosh.mp3" at={WIDE - 3} vol={0.2} />
    </AbsoluteFill>
  );
};

export const NEIGHBORHOOD_DUR = DUR;
