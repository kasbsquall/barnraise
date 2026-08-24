import React from 'react';
import {AbsoluteFill, useCurrentFrame, interpolate} from 'remotion';
import datos from '../data/refusals.json';
import {Typewriter} from '../lib/Type';
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
// recreation, so the frame says so.
//
// It is also the one scene made of nothing but text, so the motion has to carry
// it. The file writes itself in, the camera goes in on the two signatures because
// that is exactly where the guarantee lives, and each refusal lands with weight
// rather than fading up.

const DUR = 614;                         // 20.46s at 30fps

// The narration's own beats, measured out of the recorded voice.
const CIERRE = 12;      //  0.4s · the file starts writing itself
const DENTRO = 96;      //  3.2s · the camera goes in on the two signatures
const FUERA = 158;      //  5.3s · and back out, as the checks are named
const RECHAZOS = 321;   // 10.7s · the three refusals, one per clause
const PASO = 62;        // between them, so each lands on the clause that names it

const suave = (a: number, b: number, f: number) => {
  const t = Math.min(1, Math.max(0, (f - a) / (b - a)));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

// The signature and the two tool definitions. The whole guarantee is that neither
// tool takes an argument, so neither can be asked about another organization, and
// that is visible in three lines of the file.
const CLAVE = datos.cierre.lineas
  .map((l, i) => (/^(def build_resource_tools|    def list_)/.test(l) ? i : -1))
  .filter((i) => i >= 0);

const ALTO_LINEA = 29.6;   // 19px at 1.56, as it renders
const PRIMERA = 236;       // where the first source line sits in the frame

export const Refuses: React.FC = () => {
  const frame = useCurrentFrame();

  // The push in and back out. A large move over eighteen frames rather than a
  // slow creep: a gradual scale change resamples every glyph at a nearly
  // identical size on every frame and shimmers, which is the one thing a screen
  // full of text cannot survive.
  const dentro = suave(DENTRO, DENTRO + 18, frame) - suave(FUERA, FUERA + 20, frame);
  const escala = 1 + dentro * 0.58;
  // Centred between the first and last key line, so the push lands on the
  // signatures rather than on whatever happens to be mid-frame.
  const foco = PRIMERA + ((CLAVE[0] + CLAVE[CLAVE.length - 1]) / 2) * ALTO_LINEA;
  // The horizontal origin has to be 0. With transform-origin at X percent and a
  // scale above 1, the left edge lands at X * (1 - scale), which is negative for
  // any X above zero: at 19% the code walked eleven percent of the frame off to
  // the left and took the "def" off the signature with it. Anchored at 0 the
  // push only ever crops the right, which is where the long lines are.
  const origen = `0% ${(foco / 1080) * 100}%`;

  const salida = interpolate(frame, [RECHAZOS - 36, RECHAZOS - 6], [1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // Between the pull-back and the first refusal the file just sat there for three
  // and a half seconds, which is a still image under a voice still making a
  // claim. It reads on now, drifting up as though someone were scrolling toward
  // the checks the line is about. Fixed scale and pure translation: the one
  // ambient move that cannot shimmer.
  const lectura = interpolate(frame, [FUERA + 24, RECHAZOS - 40], [0, -74],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  // The refusals hold once the last one has landed, so the block keeps breathing
  // through the closing line rather than freezing under it.
  const respira = interpolate(frame, [RECHAZOS + 2 * PASO + 20, DUR], [0, -30],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: C.field, overflow: 'hidden'}}>
      <div style={{padding: '92px 96px 150px'}}>
        {/* Declared, because the content is real and the typesetting is not. */}
        <div
          style={{
            fontFamily: MONO, fontSize: 17, letterSpacing: '0.15em',
            // Out while the camera is in, or the code rises underneath it and two
            // type systems sit on top of each other.
            color: C.inkFaint,
            opacity: suave(2, 20, frame) * salida * (1 - dentro),
          }}
        >
          REAL OUTPUT, SET IN THE FILM&apos;S TYPE
        </div>

        <div style={{position: 'relative', marginTop: 30, height: 830}}>
          {/* The closure, writing itself in line by line. */}
          <div
            style={{
              position: 'absolute', inset: 0, opacity: salida,
              transform: `translateY(${lectura}px) scale(${escala})`,
              transformOrigin: origen,
            }}
          >
            <div style={{fontFamily: MONO, fontSize: 19, color: C.lib, letterSpacing: '0.1em'}}>
              {datos.cierre.archivo}
            </div>
            <div style={{marginTop: 22, borderLeft: `1px solid ${C.rule}`, paddingLeft: 26}}>
              {datos.cierre.lineas.map((l, i) => {
                const clave = CLAVE.includes(i);
                // The key lines hold their ink while everything else steps back
                // during the push, so the eye lands where the claim is.
                const tinta = clave
                  ? C.ink
                  : /^\s*(#|""")/.test(l) ? C.inkFaint : C.inkSoft;
                return (
                  <div
                    key={i}
                    style={{
                      fontSize: 19, lineHeight: 1.56,
                      color: tinta,
                      opacity: clave ? 1 : 1 - dentro * 0.74,
                    }}
                  >
                    <Typewriter
                      text={l || ' '}
                      at={CIERRE + i * 2}
                      charsPerSec={240}
                      style={{fontFamily: MONO, whiteSpace: 'pre'}}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* What the checks refuse, verbatim. Each one lands rather than fades:
              the title arrives, the argument that was tried sits under it, and
              the answer types out in the refusal colour. */}
          <div style={{position: 'absolute', inset: 0, transform: `translateY(${respira}px)`}}>
            {datos.rechazos.map((r, i) => {
              const at = RECHAZOS + i * PASO;
              const en = suave(at, at + 16, frame);
              // Settles from slightly over, so it reads as impact.
              const golpe = 1 + (1 - en) * 0.03;
              return (
                <div
                  key={r.titulo}
                  style={{
                    marginBottom: 62, opacity: en,
                    transform: `translateY(${(1 - en) * 16}px) scale(${golpe})`,
                    transformOrigin: '0% 50%',
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
                  <div style={{marginTop: 12, maxWidth: 1560}}>
                    <Typewriter
                      text={r.respuesta}
                      at={at + 6}
                      charsPerSec={150}
                      caret
                      style={{
                        fontFamily: MONO, fontSize: 25, lineHeight: 1.5,
                        color: C.danger,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* A sweep to open, a tick on each end of the push, and a refusal under
          each of the three. The refusal sound is from the CC0 library rather
          than synthesised: half a second, most of its energy under 500 Hz. One
          that is bright and long is the buzzer everyone hates. */}
      <Sfx src="whoosh.mp3" at={1} vol={0.18} />
      <Sfx src="click.mp3" at={DENTRO} vol={0.09} />
      <Sfx src="click.mp3" at={FUERA} vol={0.07} />
      {datos.rechazos.map((r, i) => (
        <Sfx key={r.titulo} src="reject.mp3" at={RECHAZOS + i * PASO} vol={0.16} />
      ))}
    </AbsoluteFill>
  );
};

export const REFUSES_DUR = DUR;
