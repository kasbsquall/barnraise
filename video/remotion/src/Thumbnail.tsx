import React from 'react';
import {AbsoluteFill} from 'remotion';
import {C, FONT, MONO} from './theme';

/**
 * The platform thumbnail, authored at its own size.
 *
 * It is built rather than grabbed. A still from the film is composed for a 1920
 * canvas and a sidebar renders this at 168 pixels wide, where type that reads
 * beautifully at full size is a grey smear. Everything here is sized to survive
 * that: three words, one object, and the mark.
 *
 * The object is a signed ledger row in cream, which is the film's one reserved
 * colour and means an agreement both organizations put their name to. Its
 * silhouette reads before any letter inside it does, which is the test.
 *
 * The words are the product's rule rather than a clever line of their own: a
 * thumbnail that invents its own copy competes with the film instead of
 * belonging to it.
 */
export const Thumbnail: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.field, overflow: 'hidden'}}>
    {/* One pool of light behind the object. */}
    <div
      style={{
        position: 'absolute', right: -60, top: 60, width: 760, height: 620,
        background: 'radial-gradient(closest-side, rgba(240,231,214,0.16), transparent 72%)',
        filter: 'blur(60px)',
      }}
    />

    {/* The signed row. Two seals, both filled, which is the whole rule. */}
    <div
      style={{
        position: 'absolute', right: 54, top: 128, width: 560,
        background: C.signed, borderRadius: 4, padding: '30px 34px',
        boxShadow: '0 30px 90px rgba(0,0,0,0.45)',
        transform: 'rotate(-1.4deg)',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <span style={{fontFamily: MONO, fontSize: 30, color: C.signedInk, opacity: 0.62}}>#19</span>
        <div style={{display: 'flex'}}>
          <span style={{background: C.lib, color: C.signedInk, fontFamily: MONO,
                        fontWeight: 700, fontSize: 26, padding: '7px 14px'}}>CL</span>
          <span style={{background: C.food, color: C.signedInk, fontFamily: MONO,
                        fontWeight: 700, fontSize: 26, padding: '7px 14px'}}>NF</span>
        </div>
      </div>
      <div style={{marginTop: 22, fontFamily: FONT.display, fontWeight: 700,
                   fontSize: 40, lineHeight: 1.16, color: C.signedInk}}>
        Central Library gives<br />a delivery van
      </div>
      {/* The id and the names are the row the film actually signs on camera, so a
          judge who pauses S5 and then looks at this sees the same agreement. */}
      <div style={{marginTop: 18, fontFamily: MONO, fontSize: 23,
                   color: C.signedInk, opacity: 0.66}}>
        signed by Ana Torres<br />and Luis Mendoza
      </div>
    </div>

    {/* Three words, set as large as the frame allows. */}
    <div style={{position: 'absolute', left: 62, top: 156, width: 640}}>
      <div
        style={{
          fontFamily: FONT.display, fontWeight: 700,
          fontSize: 116, lineHeight: 0.92, letterSpacing: '-0.035em',
          color: C.ink,
        }}
      >
        BOTH<br />MUST<br /><span style={{color: C.lib}}>SIGN</span>
      </div>
    </div>

    {/* The mark, so a viewer who never clicks still registers the name. */}
    <div style={{position: 'absolute', left: 62, bottom: 56, display: 'flex',
                 alignItems: 'center', gap: 16}}>
      <svg width={44} height={44} viewBox="0 0 64 64" fill="none">
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
      <span style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 34,
                    letterSpacing: '0.1em', color: C.ink}}>BARNRAISE</span>
    </div>
  </AbsoluteFill>
);
