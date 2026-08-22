import {useCurrentFrame, useVideoConfig} from 'remotion';
import React from 'react';
import capsRaw from '../data/captions.json';
import {INTER, C} from '../theme';

type Word = {t: number; e: number; w: string};
const caps = capsRaw as Word[];

// Group words into readable lines (~46 chars, break on sentence end).
type Line = {start: number; end: number; words: Word[]};
const LINES: Line[] = (() => {
  const lines: Line[] = [];
  let cur: Word[] = [];
  for (const c of caps) {
    cur.push(c);
    const txt = cur.map((x) => x.w).join(' ');
    const endsSent = /[.?!]$/.test(c.w);
    if (txt.length >= 46 || (endsSent && cur.length >= 3)) {
      lines.push({start: cur[0].t, end: cur[cur.length - 1].e, words: cur});
      cur = [];
    }
  }
  if (cur.length) lines.push({start: cur[0].t, end: cur[cur.length - 1].e, words: cur});
  return lines;
})();

// Burned-in karaoke captions.
export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const line = LINES.find((l) => t >= l.start - 0.12 && t <= l.end + 0.35);
  if (!line) return null;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 64,
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
        {line.words.map((w, i) => {
          const active = t >= w.t - 0.04;
          return (
            <span key={i} style={{color: active ? C.white : 'rgba(255,255,255,0.42)'}}>
              {w.w}{' '}
            </span>
          );
        })}
      </div>
    </div>
  );
};
