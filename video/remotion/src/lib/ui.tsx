import {AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate} from 'remotion';
import React from 'react';
import {INTER, C} from '../theme';

// DEPRECATED — do not use. A hard diagonal color wipe reads cheap (see SKILL.md step 7:
// transitions must be spring cross-dissolves via @remotion/transitions). Kept only for
// backwards compatibility with old projects.
export const Bg: React.FC<{
  color: string;
  delay?: number;
  children?: React.ReactNode;
}> = ({color, delay = 0, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 200, stiffness: 70, mass: 0.5}});
  const x = interpolate(p, [0, 1], [-10, 150]);
  return (
    <AbsoluteFill>
      <AbsoluteFill
        style={{
          backgroundColor: color,
          clipPath: `polygon(0 0, ${x}% 0, ${x - 22}% 100%, 0 100%)`,
        }}
      />
      {children}
    </AbsoluteFill>
  );
};

// A soft radial glow blob for depth.
export const Glow: React.FC<{x: string; y: string; color: string; size?: number; opacity?: number}> = ({
  x,
  y,
  color,
  size = 900,
  opacity = 0.5,
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: size,
      height: size,
      transform: 'translate(-50%,-50%)',
      background: `radial-gradient(circle, ${color} 0%, transparent 68%)`,
      opacity,
      filter: 'blur(20px)',
      pointerEvents: 'none',
    }}
  />
);

// Small pill / chip.
export const Chip: React.FC<{
  children: React.ReactNode;
  delay?: number;
  bg?: string;
  color?: string;
  size?: number;
}> = ({children, delay = 0, bg = 'rgba(255,255,255,0.08)', color = C.white, size = 30}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 16, stiffness: 120}});
  const y = interpolate(p, [0, 1], [30, 0]);
  return (
    <div
      style={{
        transform: `translateY(${y}px)`,
        opacity: p,
        background: bg,
        color,
        fontFamily: INTER,
        fontWeight: 600,
        fontSize: size,
        padding: `${size * 0.42}px ${size * 0.85}px`,
        borderRadius: 999,
        border: `1px solid ${color}22`,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  );
};

// Reveal wrapper: fades + rises its children with a spring.
export const Reveal: React.FC<{
  delay?: number;
  y?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({delay = 0, y = 40, children, style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = spring({frame: frame - delay, fps, config: {damping: 17, stiffness: 110, mass: 0.8}});
  return (
    <div style={{transform: `translateY(${interpolate(p, [0, 1], [y, 0])}px)`, opacity: p, ...style}}>
      {children}
    </div>
  );
};

// Count-up number (for stats).
export const CountUp: React.FC<{
  to: number;
  delay?: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}> = ({to, delay = 0, duration = 30, suffix = '', prefix = '', decimals = 0}) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame - delay, [0, duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const v = (to * p).toFixed(decimals);
  return (
    <>
      {prefix}
      {v}
      {suffix}
    </>
  );
};

export const label = (children: React.ReactNode, color = C.blueLite, size = 26): React.ReactNode => (
  <div
    style={{
      fontFamily: INTER,
      fontWeight: 700,
      fontSize: size,
      letterSpacing: 4,
      textTransform: 'uppercase',
      color,
    }}
  >
    {children}
  </div>
);
