import {useCurrentFrame, useVideoConfig} from 'remotion';
import React from 'react';
import capsRaw from '../data/captions.json';
import {INTER, C} from '../theme';

type Word = {t: number; e: number; w: string};
const caps = capsRaw as Word[];

// Group words into lines that break where the sentence breaks.
//
// The first version split at 46 characters regardless of sense, which produced
// cards reading "A2A, the agent-to-agent protocol, across process" followed by
// "boundaries. The food bank needs a van on Tuesdays." A reader has to hold the
// first half in their head across a cut to make sense of it, which is the
// opposite of what a subtitle is for.
type Line = {start: number; end: number; text: string};

const MAX = 58;

/**
 * Splits one sentence into balanced lines.
 *
 * Greedy wrapping at a character limit leaves orphans: "over its own private /
 * data", "the fund asks / for", "three thousand two / hundred and fifty". The
 * fix is not a longer list of words that may not end a line, because the problem
 * is usually the word that STARTS the next one. Deciding how many lines the
 * sentence needs first and then aiming for equal parts avoids the whole class:
 * no card is left carrying one word.
 */
function repartir(f: Word[]): Line[] {
  const texto = f.map((w) => w.w).join(' ');
  if (texto.length <= MAX) {
    return [{start: f[0].t, end: f[f.length - 1].e, text: texto}];
  }
  const n = Math.ceil(texto.length / MAX);
  const objetivo = texto.length / n;
  const out: Line[] = [];
  let linea: Word[] = [];
  let restante = n;

  const empujar = () => {
    out.push({
      start: linea[0].t,
      end: linea[linea.length - 1].e,
      text: linea.map((x) => x.w).join(' '),
    });
    linea = [];
    restante -= 1;
  };

  for (let i = 0; i < f.length; i++) {
    linea.push(f[i]);
    if (restante <= 1) continue;
    const largo = linea.map((x) => x.w).join(' ').length;
    // Never break with almost nothing left to say.
    if (f.length - i - 1 <= 3) continue;
    const trasComa = /,$/.test(f[i].w);
    if (largo >= objetivo || (trasComa && largo >= objetivo * 0.7)) empujar();
  }
  if (linea.length) empujar();
  return out;
}

const LINES: Line[] = (() => {
  // A sentence is the natural unit of a caption card, so cut there first.
  const frases: Word[][] = [];
  let cur: Word[] = [];
  for (const c of caps) {
    cur.push(c);
    if (/[.?!]$/.test(c.w)) {
      frases.push(cur);
      cur = [];
    }
  }
  if (cur.length) frases.push(cur);
  return frases.flatMap(repartir);
})();

// Burned-in karaoke captions.
export const Captions: React.FC<{offset?: number}> = ({offset = 0}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  // Captions are timed against the whole film. A scene rendered on its own for
  // review starts at frame 0, so it passes its own start time in and the lines
  // land on the words either way.
  const t = frame / fps + offset;
  const line = LINES.find((l) => t >= l.start - 0.12 && t <= l.end + 0.35);
  if (!line) return null;
  return (
    <div
      style={{
        position: 'absolute',
        // Above the map's own legend, which lives in the bottom 100px of the
        // product UI. At 64 the two type systems sat on top of each other.
        bottom: 168,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          maxWidth: 1360,
          padding: '15px 34px',
          borderRadius: 18,
          background: 'rgba(6,14,32,0.74)',
          border: '1px solid rgba(255,255,255,0.10)',
          boxShadow: '0 18px 50px rgba(0,0,0,0.35)',
          textAlign: 'center',
          fontFamily: INTER,
          fontWeight: 700,
          fontSize: 40,
          lineHeight: 1.28,
        }}
      >
        {/* One tone, whole line. Karaoke highlighting draws the eye to the
            caption and away from the product, which is the opposite of what a
            subtitle is for: it is there so the film can be followed muted, not
            so it can be watched. */}
        <span style={{color: C.white}}>{line.text}</span>
      </div>
    </div>
  );
};
