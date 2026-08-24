// Ported from the product, not invented for the film.
//
// Every colour below is a custom property in web/static/styles.css and every face
// is the one the interface actually renders. A film whose palette was chosen
// alongside a product that already has one reads as a mismatch a viewer feels
// without being able to name it.

import {loadFont as loadDisplay} from '@remotion/google-fonts/ArchivoNarrow';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';

const display = loadDisplay('normal', {weights: ['400', '500', '600', '700']});
const mono = loadMono('normal', {weights: ['400', '500', '700']});

export const FONT = {
  display: display.fontFamily,
  text: display.fontFamily,
  mono: mono.fontFamily,
};

export const INTER = FONT.text;
export const MONO = mono.fontFamily;

export const C = {
  // ground
  field: '#091421',
  plateLow: '#121c2a',
  plate: '#16202e',
  plateHigh: '#212a39',
  plateTop: '#2b3544',

  // ink
  ink: '#d9e3f6',
  inkSoft: '#a8b3c6',
  inkFaint: '#8e97a6',

  rule: 'rgba(217, 227, 246, 0.14)',
  ruleSoft: 'rgba(217, 227, 246, 0.07)',

  // one route colour per organization, used nowhere else
  food: '#f18a63',
  lib: '#06d9fa',
  school: '#fdd669',
  health: '#6cc892',
  kitchen: '#c677c7',
  youth: '#5f7ed1',

  // cream means an agreement both organizations signed, and appears nowhere else
  signed: '#f0e7d6',
  signedInk: '#1b2430',

  waiting: '#ffb599',
  ok: '#7fd6a2',
  danger: '#ffb4ab',

  // legacy names the template's lib components still reference
  navy: '#091421',
  navyDeep: '#050d16',
  blue: '#75d4ea',
  blueLite: '#a5e6f5',
  white: '#d9e3f6',
  paper: '#f0e7d6',
  red: '#ffb4ab',
  amber: '#ffb599',
  green: '#7fd6a2',
  slate: 'rgba(217, 227, 246, 0.14)',
  slateText: '#8e97a6',
  line: 'rgba(217, 227, 246, 0.07)',
};

export const FPS = 30;
