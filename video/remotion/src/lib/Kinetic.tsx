import {useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';
import React from 'react';
import {INTER, C} from '../theme';

// Word-by-word kinetic headline (the Karo-style reveal).
export const Kinetic: React.FC<{
  text: string;
  delay?: number;
  stagger?: number;
  size?: number;
  weight?: number;
  color?: string;
  accent?: string;
  accentWords?: string[];
  lineHeight?: number;
  maxWidth?: number;
  align?: 'left' | 'center';
  style?: React.CSSProperties;
}> = ({
  text,
  delay = 0,
  stagger = 2.4,
  size = 110,
  weight = 800,
  color = C.white,
  accent = C.blue,
  accentWords = [],
  lineHeight = 1.02,
  maxWidth = 1500,
  align = 'left',
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const words = text.split(' ');
  const clean = (w: string) => w.replace(/[.,!?:]/g, '');
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${size * 0.14}px ${size * 0.26}px`,
        maxWidth,
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        fontFamily: INTER,
        fontWeight: weight,
        fontSize: size,
        lineHeight,
        letterSpacing: -size * 0.014,
        ...style,
      }}
    >
      {words.map((w, i) => {
        const d = delay + i * stagger;
        const p = spring({frame: frame - d, fps, config: {damping: 15, stiffness: 130, mass: 0.7}});
        const y = interpolate(p, [0, 1], [size * 0.42, 0]);
        const acc = accentWords.includes(clean(w));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${y}px)`,
              opacity: p,
              color: acc ? accent : color,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};
