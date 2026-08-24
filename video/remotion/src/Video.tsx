import React from 'react';
import {AbsoluteFill, Audio, Series, staticFile} from 'remotion';
import {SCENES} from './timing';
import {Captions} from './lib/Captions';
import {C, FONT} from './theme';

import {Pause} from './scenes/Pause';
import {Neighborhood} from './scenes/Neighborhood';
import {People} from './scenes/People';
import {Agents} from './scenes/Agents';
import {Signatures} from './scenes/Signatures';
import {Refuses} from './scenes/Refuses';
import {Coalition} from './scenes/Coalition';
import {Close} from './scenes/Close';

const MAPA: Record<string, React.FC> = {
  s1: Pause,
  s2: Neighborhood,
  s3: People,
  s4: Agents,
  s5: Signatures,
  s6: Refuses,
  s7: Coalition,
  s8: Close,
};

/**
 * The mark, for the one scene that does not carry the product's own.
 *
 * Six of the eight are captures of the running app, so its header is in the
 * frame and the name is available at whatever second a judge happens to look up.
 * S6 is built from source and terminal output and had no brand on it at all for
 * twenty seconds. This sits where the app's own mark sits, so it reads as the
 * same object rather than as an overlay that comes and goes.
 */
const Marca: React.FC = () => (
  <div style={{position: 'absolute', left: 40, top: 30, display: 'flex',
               alignItems: 'center', gap: 14, opacity: 0.85}}>
    <svg width={30} height={30} viewBox="0 0 64 64" fill="none">
      <g stroke={C.ink} strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="32" r="27" strokeWidth="1.6" />
        <circle cx="32" cy="32" r="16" strokeWidth="1.2" opacity="0.55" />
        {[[32, 16], [45.86, 24], [45.86, 40], [32, 48], [18.14, 40], [18.14, 24]].map(
          ([x, y], i) => <path key={i} d={`M32 32 ${x} ${y}`} strokeWidth="1.6" />)}
      </g>
      <g fill={C.ink}>
        <circle cx="32" cy="32" r="4.2" />
        {[[32, 16], [45.86, 24], [45.86, 40], [32, 48], [18.14, 40], [18.14, 24]].map(
          ([x, y], i) => <circle key={i} cx={x} cy={y} r="2.9" />)}
      </g>
    </svg>
    <span style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 21,
                  letterSpacing: '0.06em', color: C.ink}}>BARNRAISE</span>
  </div>
);

/**
 * The film.
 *
 * Hard cuts throughout, and no cross-dissolves. Every scene sits on the same
 * near-black ground, which is the condition that makes a cut invisible: the
 * frame's overall luminance barely moves across it. Two of the joins are better
 * than invisible and are why the scenes were built in this order. S1 ends by
 * pulling back to the whole neighborhood and S2 opens on it, and S2 ends on the
 * library's card while S3 opens on the same card. Those are match cuts, and
 * putting an effect on either would be covering something that already works.
 *
 * Scene lengths come from the measured narration and are chained here, so the
 * picture cannot drift from the voice: the sum is 5189 frames against a mix of
 * 172.94s, which is inside one frame.
 */
export const Film: React.FC = () => (
  <AbsoluteFill style={{backgroundColor: C.field}}>
    <Series>
      {SCENES.map((s) => {
        const Escena = MAPA[s.id];
        return (
          <Series.Sequence key={s.id} durationInFrames={s.durF}>
            <Escena />
            {s.id === 's6' ? <Marca /> : null}
          </Series.Sequence>
        );
      })}
    </Series>

    {/* One track for the whole film. Slicing the audio per scene makes every
        segment pad its own tail, and the padding accumulates until the narration
        no longer lands on its picture. */}
    <Audio src={staticFile('mix.wav')} />

    {/* Captions are timed against the film, so at film level they need no offset.
        The close card carries its line as display type and suppresses them. */}
    <Captions hideFrom={SCENES.slice(0, -1).reduce((n, s) => n + s.durF, 0)} />
  </AbsoluteFill>
);

export const FILM_FRAMES = SCENES.reduce((n, s) => n + s.durF, 0);
