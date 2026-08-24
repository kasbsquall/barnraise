import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import qr from '../data/qr.json';
import {Sfx} from '../lib/Sfx';
import {C, FONT, MONO} from '../theme';

// S8 · Close.
//
// The only scene with no capture in it: there is nothing left to demonstrate, so
// the card carries the name, the one line the film wants a judge to be able to
// quote hours later, and a way to open the thing on the phone already in their
// hand.
//
// The mark is the product's own, ported from the header rather than drawn for the
// film: a hub with six spokes, one per organization. It draws on, because a
// stroke arriving is the last motion in a film that has been about connections
// being made.
//
// The wordmark is here as well as the mark. A mark on its own is an isotype: a
// viewer who watched the whole film knows what the shape means, and a judge who
// looked up for the last five seconds has to write a name on a scoring sheet.
//
// Captions are suppressed for this scene. The burned line IS the message, and a
// subtitle box underneath saying the same words in the same seconds makes a
// reader stop to work out whether they are two different claims.

const DUR = 352;                         // 11.73s at 30fps
const CODIGO = 232;                      // 7.7s · the URL and the code arrive

const MARCA = 232;                       // the mark's drawn size
const RADIOS: [number, number][] = [
  [32, 16], [45.86, 24], [45.86, 40], [32, 48], [18.14, 40], [18.14, 24],
];

const suave = (a: number, b: number, f: number) => {
  const t = Math.min(1, Math.max(0, (f - a) / (b - a)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export const Close: React.FC = () => {
  const frame = useCurrentFrame();

  const anillo = suave(6, 40, frame);
  const nucleo = suave(20, 44, frame);
  const marca = suave(4, 30, frame);
  const palabra = suave(30, 54, frame);
  const linea1 = suave(56, 86, frame);
  const linea2 = suave(122, 152, frame);   // lands with the second sentence
  const codigo = suave(CODIGO, CODIGO + 26, frame);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.field,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        // The code block is absolutely positioned, so it adds weight the centred
        // flow does not know about. Reserving its height here puts the whole
        // composition on the frame's optical centre instead of leaving the top
        // third empty.
        paddingBottom: 200,
      }}
    >
      {/* One pool of light, behind the mark, which is the protagonist here. */}
      <div
        style={{
          position: 'absolute', left: '50%', top: 300,
          width: 900, height: 620, transform: 'translateX(-50%)',
          background: `radial-gradient(closest-side, rgba(6,217,250,${marca * 0.1}), transparent 70%)`,
          filter: 'blur(70px)', pointerEvents: 'none',
        }}
      />

      <svg
        width={MARCA} height={MARCA} viewBox="0 0 64 64"
        style={{opacity: marca, transform: `scale(${0.94 + marca * 0.06})`}}
      >
        <g stroke={C.ink} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <circle
            cx="32" cy="32" r="27" strokeWidth="1.6"
            strokeDasharray={2 * Math.PI * 27}
            strokeDashoffset={2 * Math.PI * 27 * (1 - anillo)}
            transform="rotate(-90 32 32)"
          />
          <circle cx="32" cy="32" r="16" strokeWidth="1.2" opacity={0.55 * nucleo} />
          {RADIOS.map(([x, y], i) => {
            // Each spoke draws from the centre outwards, one after another, so
            // the six arrive as six rather than as a star appearing whole.
            const t = suave(26 + i * 5, 26 + i * 5 + 20, frame);
            return (
              <line
                key={i} x1={32} y1={32}
                x2={32 + (x - 32) * t} y2={32 + (y - 32) * t}
                strokeWidth="1.6"
              />
            );
          })}
        </g>
        <g fill={C.ink}>
          <circle cx="32" cy="32" r={4.2 * nucleo} />
          {RADIOS.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={2.9 * suave(40 + i * 5, 40 + i * 5 + 16, frame)} />
          ))}
        </g>
      </svg>

      <div
        style={{
          marginTop: 30,
          fontFamily: FONT.display, fontWeight: 700,
          fontSize: 68, letterSpacing: '0.24em',
          color: C.ink,
          opacity: palabra,
          transform: `translateY(${(1 - palabra) * 10}px)`,
        }}
      >
        BARNRAISE
      </div>

      <div
        style={{
          marginTop: 54, maxWidth: 1240, textAlign: 'center',
          fontFamily: FONT.display, fontWeight: 500,
          fontSize: 46, lineHeight: 1.34, letterSpacing: '-0.012em',
          textWrap: 'balance',
        }}
      >
        <div style={{color: C.inkSoft, opacity: linea1,
                     transform: `translateY(${(1 - linea1) * 8}px)`}}>
          Every agent in this sector works inside one organization.
        </div>
        <div style={{color: C.ink, opacity: linea2, marginTop: 10,
                     transform: `translateY(${(1 - linea2) * 8}px)`}}>
          Barnraise is the first one that works <span style={{color: C.lib}}>between them</span>.
        </div>
      </div>

      {/* The link, and a code for the phone already in the room.
          Light modules on no plate was the first version, on the theory that a
          bright rectangle reads before anything else on this ground and that
          scanners handle either polarity. Decoding the actual rendered frame
          settled it: OpenCV read nothing as rendered and read the URL correctly
          from the inverted image. Phone cameras are usually more forgiving, but
          a judge whose phone fails to scan is a worse outcome than a lighter
          card, so this is standard polarity with the four-module quiet zone the
          format asks for. The plate is the film's own ink, never cream, which is
          reserved for an agreement both organizations signed. */}
      <div
        style={{
          position: 'absolute', bottom: 96,
          display: 'flex', alignItems: 'center', gap: 30,
          opacity: codigo, transform: `translateY(${(1 - codigo) * 12}px)`,
        }}
      >
        <svg
          width={168} height={168}
          viewBox={`-4 -4 ${qr.n + 8} ${qr.n + 8}`}
          shapeRendering="crispEdges"
        >
          <rect x={-4} y={-4} width={qr.n + 8} height={qr.n + 8} fill={C.ink} rx={1.5} />
          <path fill={C.field} d={qr.d} />
        </svg>
        <div style={{textAlign: 'left'}}>
          <div style={{fontFamily: MONO, fontSize: 17, letterSpacing: '0.16em', color: C.inkFaint}}>
            THE CODE, THE LEDGER, THE GUARDS
          </div>
          <div style={{fontFamily: MONO, fontSize: 30, color: C.ink, marginTop: 10}}>
            github.com/kasbsquall/barnraise
          </div>
        </div>
      </div>

      {/* Two sounds and no more. The mark landing, and the code arriving. */}
      <Sfx src="confirm.mp3" at={40} vol={0.26} />
      <Sfx src="pop.mp3" at={CODIGO} vol={0.14} />
    </AbsoluteFill>
  );
};

export const CLOSE_DUR = DUR;
