import {AbsoluteFill, useCurrentFrame} from 'remotion';
import React from 'react';
import {C} from '../theme';

// Layered dark backdrop with real depth: indigo gradient base, a faint dot grid,
// drifting aurora blobs, a subtle grain, and a vignette. Replaces flat black.
export const Backdrop: React.FC<{tint?: string; grid?: boolean}> = ({tint = C.blue, grid = true}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame * 0.012) * 40;
  const drift2 = Math.cos(frame * 0.009) * 50;
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      {/* base gradient */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(1300px 900px at 50% 12%, ${tint}22, transparent 55%), linear-gradient(180deg, #0D0B24 0%, #08070F 62%, #060510 100%)`,
        }}
      />
      {/* dot grid, masked to fade toward edges */}
      {grid && (
        <AbsoluteFill
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1.2px, transparent 1.2px)',
            backgroundSize: '46px 46px',
            WebkitMaskImage: 'radial-gradient(circle at 50% 40%, black 0%, transparent 78%)',
            maskImage: 'radial-gradient(circle at 50% 40%, black 0%, transparent 78%)',
            opacity: 0.6,
          }}
        />
      )}
      {/* aurora blobs */}
      <div style={{position: 'absolute', left: `calc(14% + ${drift}px)`, top: `${-6 + drift2 * 0.1}%`, width: 620, height: 620, borderRadius: 999, background: `radial-gradient(circle, ${tint}, transparent 66%)`, filter: 'blur(90px)', opacity: 0.32}} />
      <div style={{position: 'absolute', right: `calc(10% + ${drift2}px)`, top: '40%', width: 520, height: 520, borderRadius: 999, background: `radial-gradient(circle, ${C.green}, transparent 68%)`, filter: 'blur(100px)', opacity: 0.12}} />
      {/* grain */}
      <AbsoluteFill style={{opacity: 0.05, mixBlendMode: 'overlay'}}>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
      {/* vignette */}
      <AbsoluteFill style={{boxShadow: 'inset 0 0 400px 120px rgba(0,0,0,0.55)'}} />
    </AbsoluteFill>
  );
};
