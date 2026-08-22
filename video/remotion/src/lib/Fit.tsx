import React from 'react';
import {fitText} from '@remotion/layout-utils';

// Text that CANNOT overflow its box.
//
// A word set at a fixed size overflowed its column and crossed the divider beside it, and
// nobody saw it until a whole film had been rendered and watched. That is the expensive
// way to find a layout bug: two minutes of render and a human's attention, for something
// the browser could have answered before a single frame was drawn.
//
// fitText() measures the string in the real font at the real weight and returns the size
// that fits the width given. Passing a maximum keeps the intended scale when the string is
// short, so nothing gets bigger than designed — it only ever shrinks to fit.
//
// Use this for ANY text whose content might change: data-driven strings, anything
// translated, anything a viewer supplies. Fixed decorative type can stay fixed.
export const Fit: React.FC<{
  text: string;
  width: number;
  fontFamily: string;
  fontWeight?: number | string;
  letterSpacing?: string;
  max?: number;
  style?: React.CSSProperties;
}> = ({text, width, fontFamily, fontWeight = 400, letterSpacing, max = 200, style}) => {
  const {fontSize} = fitText({
    text,
    withinWidth: width,
    fontFamily,
    fontWeight: String(fontWeight),
    letterSpacing,
  });
  return (
    <div
      style={{
        fontSize: Math.min(fontSize, max),
        fontFamily,
        fontWeight,
        letterSpacing,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {text}
    </div>
  );
};
