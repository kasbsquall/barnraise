import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {Camera2D, Key} from '../lib/Camera2D';
import {Sfx} from '../lib/Sfx';
import {C, MONO} from '../theme';

// S4 · The agents talk.
//
// One continuous take of the running product. The messages in the activity feed
// are what the agents wrote to each other over A2A during this round, typed in as
// they arrive, and this is the same round whose terms the next scene signs.
//
// The plate is the 3840x2160 capture, so every coordinate below is in PLATE
// pixels and scale 0.5 is the whole page filling the 1920 frame. Anything above
// 0.5 is reading real captured detail rather than magnifying it.

const PLATE = {w: 3840, h: 2160};
const PAGE = {cx: PLATE.w / 2, cy: PLATE.h / 2};
const FEED = {cx: 2640, cy: 980};      // the activity column
const DUR = 870;                        // 29s at 30fps

// Frames where the feed actually changes, measured off the encoded clip.
// (video/capture/feed_cues.py, threshold picked to catch a row landing rather
// than every typed character, which would clatter.)
const CUES = [16, 88, 247, 588, 654, 708, 810, 862];

// A message is not only a row landing in the feed: it also travels the map as a
// pulse between the two stations. The tick belongs to the moment it leaves, and
// the pulse takes 900ms to cross, so the arrival lands 27 frames later.
const ARRIVALS = CUES.map((f) => f + 27);

export type Treatment = 'reveal' | 'locked' | 'gentle';

const CAMERA: Record<Treatment, Key[]> = {
  // A. Opens on the neighborhood and moves INTO the conversation as it fills.
  //     The first attempt ran this the other way, opening macro on the feed and
  //     pulling out. It framed an empty column: the feed has one message at three
  //     seconds and four at twenty-five, so a tight early framing is mostly dark
  //     ground. The camera now arrives where the content is, when it is there.
  reveal: [
    {f: 0, cx: PAGE.cx, cy: PAGE.cy, s: 0.5},
    {f: 210, cx: PAGE.cx + 90, cy: PAGE.cy - 20, s: 0.53},
    {f: 480, cx: FEED.cx, cy: 900, s: 0.76},
    {f: 780, cx: FEED.cx, cy: 1150, s: 0.97},
    {f: DUR, cx: FEED.cx, cy: 1190, s: 1.0},
  ],
  // B. The camera holds and the product moves. The reference product films do
  //    this during a demo, and it is the only treatment where nothing competes
  //    with the interface for the viewer's attention.
  locked: [
    {f: 0, cx: PAGE.cx, cy: PAGE.cy, s: 0.5},
    {f: DUR, cx: PAGE.cx, cy: PAGE.cy + 8, s: 0.512},
  ],
  // C. One slow push with mass, never macro, never wide. The neighborhood stays
  //    readable throughout and the feed simply grows into frame.
  gentle: [
    {f: 0, cx: PAGE.cx + 120, cy: PAGE.cy - 40, s: 0.56},
    {f: DUR, cx: PAGE.cx + 260, cy: PAGE.cy + 20, s: 0.66},
  ],
};

export const Agents: React.FC<{treatment?: Treatment}> = ({treatment = 'reveal'}) => {
  const frame = useCurrentFrame();
  const keys = CAMERA[treatment];

  // The evidence line arrives once the frame is wide enough to hold it, which is
  // only true in the treatment that opens out.
  const showPorts = treatment === 'locked' || treatment === 'gentle';
  const portsIn = interpolate(frame, [240, 275], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: C.field}}>
      <Camera2D keys={keys} plate={PLATE}>
        <OffthreadVideo
          src={staticFile('vid/s4_round.mp4')}
          muted
          style={{width: PLATE.w, height: PLATE.h}}
        />
      </Camera2D>

      {showPorts && (
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
      )}

      {/* Sound. One sweep to open the scene, and a tick under each row that lands.
          Deliberately NOT a tick per typed character: at this rate that is not a
          texture, it is a clatter, and it would sit on top of the narration. */}
      <Sfx src="whoosh.mp3" at={1} vol={0.26} />
      {CUES.map((f) => (
        <Sfx key={f} src="pop.mp3" at={f} vol={0.1} />
      ))}
      {ARRIVALS.map((f) => (
        <Sfx key={`a${f}`} src="click.mp3" at={f} vol={0.055} />
      ))}
    </AbsoluteFill>
  );
};

export const AGENTS_DUR = DUR;
