import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO} from './theme';

/**
 * The 3:4 card, for the Devpost gallery.
 *
 * It sits in a grid next to several thousand other projects, at a width where a
 * screenshot of the product would be an unreadable smear of interface. So it is
 * built rather than grabbed, and it carries three things only: the rule the
 * product enforces, the object that rule produces, and the name.
 *
 * The object is agreement #19 in cream, which is the film's one reserved colour
 * and means both organizations put their name to it. It is the same row the film
 * signs on camera, so a judge who watches the video and then returns to the
 * gallery is looking at the same agreement rather than a decorative mock-up.
 *
 * Portrait wants a vertical spine, so the display type stacks into three lines
 * and the card sits under it slightly off-axis. The tilt is the only thing on the
 * page that is not square to the grid, which is what makes it read as an object
 * lying on a surface instead of another panel.
 */

const W = 1200;
const H = 1600;

const Mark: React.FC<{size: number}> = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <g stroke={C.ink} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="32" cy="32" r="27" strokeWidth="1.8" />
      {[[32, 16], [45.86, 24], [45.86, 40], [32, 48], [18.14, 40], [18.14, 24]].map(
        ([x, y], i) => <path key={i} d={`M32 32 ${x} ${y}`} strokeWidth="1.8" />)}
    </g>
    <g fill={C.ink}>
      <circle cx="32" cy="32" r="4.6" />
      {[[32, 16], [45.86, 24], [45.86, 40], [32, 48], [18.14, 40], [18.14, 24]].map(
        ([x, y], i) => <circle key={i} cx={x} cy={y} r="3.1" />)}
    </g>
  </svg>
);

export const ThumbnailPortrait: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.field, overflow: 'hidden', width: W, height: H}}>
    {/* One pool of light behind the card, so the cream reads as lit rather than
        pasted on. */}
    <div
      style={{
        position: 'absolute', left: -80, top: 780, width: 1000, height: 720,
        background: 'radial-gradient(closest-side, rgba(240,231,214,0.15), transparent 72%)',
        filter: 'blur(70px)',
      }}
    />

    {/* The name, at the top, where a gallery card is scanned first. */}
    <div style={{position: 'absolute', left: 76, top: 74, display: 'flex',
                 alignItems: 'center', gap: 18}}>
      <Mark size={54} />
      <span style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 44,
                    letterSpacing: '0.11em', color: C.ink}}>BARNRAISE</span>
    </div>

    {/* The rule the product enforces, set as large as the frame allows. */}
    <div style={{position: 'absolute', left: 76, top: 188, width: 1050}}>
      <div
        style={{
          fontFamily: FONT.display, fontWeight: 700,
          fontSize: 194, lineHeight: 0.86, letterSpacing: '-0.038em',
          color: C.ink,
        }}
      >
        BOTH<br />MUST<br /><span style={{color: C.lib}}>SIGN</span>
      </div>
    </div>

    {/* The object that rule produces. */}
    <div
      style={{
        position: 'absolute', left: 84, top: 860, width: 1010,
        background: C.signed, borderRadius: 5, padding: '44px 50px',
        boxShadow: '0 44px 120px rgba(0,0,0,0.5)',
        transform: 'rotate(-1.6deg)',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <span style={{fontFamily: MONO, fontSize: 40, color: C.signedInk, opacity: 0.6}}>#19</span>
        <div style={{display: 'flex'}}>
          <span style={{background: C.lib, color: C.signedInk, fontFamily: MONO,
                        fontWeight: 700, fontSize: 34, padding: '9px 19px'}}>CL</span>
          <span style={{background: C.food, color: C.signedInk, fontFamily: MONO,
                        fontWeight: 700, fontSize: 34, padding: '9px 19px'}}>NF</span>
        </div>
      </div>
      <div style={{marginTop: 30, fontFamily: FONT.display, fontWeight: 700,
                   fontSize: 58, lineHeight: 1.12, color: C.signedInk}}>
        Central Library gives<br />a delivery van
      </div>
      <div style={{marginTop: 26, fontFamily: MONO, fontSize: 31, lineHeight: 1.42,
                   color: C.signedInk, opacity: 0.64}}>
        signed by Ana Torres<br />and Luis Mendoza
      </div>
    </div>

    {/* What it is, in one line, for the reader who has not opened anything yet. */}
    <div style={{position: 'absolute', left: 84, bottom: 76, width: 1030}}>
      <div style={{height: 1, background: C.rule, marginBottom: 26}} />
      <span style={{fontFamily: MONO, fontSize: 30, letterSpacing: '0.06em',
                    lineHeight: 1.5, color: C.inkSoft}}>
        six organizations · six agents · A2A · one ledger
      </span>
    </div>
  </AbsoluteFill>
);
