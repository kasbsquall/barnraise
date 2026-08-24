import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import datos from '../data/refusals.json';
import {Sfx} from '../lib/Sfx';
import {C, FONT, MONO} from '../theme';

// S6 · What it refuses.
//
// The only scene that shows the product NOT doing something, and for a technical
// jury it is the most valuable twenty seconds in the film: everything else
// demonstrates a capability, and a capability is easy to believe and easy to
// fake. A refusal is neither.
//
// Three claims, three artefacts, none of them drawn from memory. The tool closure
// is lifted out of agents/tools/resources.py by video/capture/s6_evidence.py; the
// first two refusals are what record_agreement actually returns when it is called
// with those arguments; the third is the body of a real 403 from the running
// server when an organization that is not a party tries to sign. Change the
// guards and the film changes, rather than going on saying something that used to
// be true.
//
// The typography is the film's and the content is verbatim, which is a
// recreation, so the frame says so. A banner admitting a recreation costs
// nothing; the same fact found by a judge costs the credibility of every other
// number in the piece.

const DUR = 614;                         // 20.46s at 30fps

// The narration's own beats, measured out of the recorded voice.
const CIERRE = 15;      //  0.5s · "an agent has no tool that returns a neighbor's resources"
const GUARDIAS = 145;   //  4.8s · "checked by code rather than trusted to a model"
const RECHAZOS = 321;   // 10.7s · the three refusals, one per clause
const PASO = 62;        // between them, so each lands on the clause that names it

const suave = (a: number, b: number, f: number) => {
  const t = Math.min(1, Math.max(0, (f - a) / (b - a)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

const Linea: React.FC<{texto: string; op: number}> = ({texto, op}) => (
  <div
    style={{
      fontFamily: MONO, fontSize: 19, lineHeight: 1.56,
      color: /^\s*(#|""")/.test(texto) ? C.inkFaint : C.inkSoft,
      opacity: op, whiteSpace: 'pre',
    }}
  >
    {texto || ' '}
  </div>
);

export const Refuses: React.FC = () => {
  const frame = useCurrentFrame();

  const cierre = suave(CIERRE, CIERRE + 26, frame);
  // The source recedes as the refusals take the frame, so the two never compete.
  const atras = interpolate(frame, [RECHAZOS - 34, RECHAZOS - 4], [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: C.field, padding: '92px 96px 150px'}}>
      {/* Declared, because the content is real and the typesetting is not. */}
      <div
        style={{
          fontFamily: MONO, fontSize: 17, letterSpacing: '0.15em',
          color: C.inkFaint, opacity: suave(2, 20, frame),
        }}
      >
        REAL OUTPUT, SET IN THE FILM&apos;S TYPE
      </div>

      {/* Sequential, not side by side.
          They were two columns first and the code overlapped the refusals: the
          source lines are set `pre` so they do not wrap, and the long ones ran
          straight out of their column and under the text beside them. Giving
          each the whole frame in its own stretch of the narration fixes the
          collision and makes both readable, which a 960px column never was. */}
      <div style={{position: 'relative', marginTop: 30, height: 830}}>
        {/* The closure. Two tools, neither takes an organization, both read the
            profile they were built over. That is the whole guarantee, and it is
            in the signature rather than in a promise. */}
        <div style={{position: 'absolute', inset: 0, opacity: cierre * atras}}>
          <div style={{fontFamily: MONO, fontSize: 19, color: C.lib, letterSpacing: '0.1em'}}>
            {datos.cierre.archivo}
          </div>
          <div style={{marginTop: 22, borderLeft: `1px solid ${C.rule}`, paddingLeft: 26}}>
            {datos.cierre.lineas.map((l, i) => (
              <Linea key={i} texto={l} op={suave(CIERRE + i * 2, CIERRE + i * 2 + 18, frame)} />
            ))}
          </div>
        </div>

        {/* What the checks refuse, verbatim. */}
        <div style={{position: 'absolute', inset: 0}}>
          {datos.rechazos.map((r, i) => {
            const en = suave(RECHAZOS + i * PASO, RECHAZOS + i * PASO + 22, frame);
            return (
              <div
                key={r.titulo}
                style={{
                  marginBottom: 62, opacity: en,
                  transform: `translateY(${(1 - en) * 12}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: FONT.display, fontWeight: 600, fontSize: 36,
                    color: C.ink, letterSpacing: '-0.012em',
                  }}
                >
                  {r.titulo}
                </div>
                <div style={{fontFamily: MONO, fontSize: 19, color: C.inkFaint, marginTop: 8}}>
                  {'codigo' in r ? `${r.peticion}  ->  ${r.codigo}` : `${r.campo}: ${r.valor}`}
                </div>
                <div
                  style={{
                    fontFamily: MONO, fontSize: 25, lineHeight: 1.5, marginTop: 12,
                    color: C.danger, maxWidth: 1560,
                  }}
                >
                  {r.respuesta}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* One tick as the source arrives, one as the checks take over, and a
          refusal sound under each of the three. */}
      <Sfx src="whoosh.mp3" at={1} vol={0.18} />
      <Sfx src="click.mp3" at={GUARDIAS} vol={0.08} />
      {datos.rechazos.map((r, i) => (
        <Sfx key={r.titulo} src="reject.mp3" at={RECHAZOS + i * PASO} vol={0.16} />
      ))}
    </AbsoluteFill>
  );
};

export const REFUSES_DUR = DUR;
