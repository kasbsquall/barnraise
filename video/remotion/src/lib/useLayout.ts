import layout from '../data/layout.json';

// Read animation targets from the captured layout instead of hard-coding them.
//
// Every coordinate in a film that points AT something in a screenshot is a magic number,
// and magic numbers rot silently: re-capture the page after a UI change and the film still
// renders, the highlight now sits on empty space, and nothing catches it but a human eye.
//
// `capture_layout.mjs` records the bounding box of every element you declared. This reads
// those boxes back and converts them into the film's own coordinate space, so a re-capture
// re-aims the whole film automatically.
//
//   const hero = useLayout('dashboard', 'hero', 1600);   // shot rendered 1600px wide
//   <Highlight style={{left: hero.x, top: hero.y, width: hero.w, height: hero.h}} />
//
// It throws rather than returning zeros for a missing key. A silent 0,0 puts a highlight in
// the top-left corner of the frame, which is exactly the kind of defect that survives review
// because it looks deliberate.

type Box = {x: number; y: number; w: number; h: number};

const pages = (layout as {pages: Record<string, {boxes: Record<string, Box>}>}).pages ?? {};
const captureWidth = (layout as {viewport?: {width: number}}).viewport?.width ?? 1920;

/**
 * A captured element's box, scaled to the width the screenshot is RENDERED at in the film.
 *
 * @param page      the page name from the capture config
 * @param key       the box name from that page's `boxes`
 * @param renderedW how wide the screenshot appears in the composition, in px
 */
export const useLayout = (page: string, key: string, renderedW: number): Box & {cx: number; cy: number} => {
  const box = pages[page]?.boxes?.[key];
  if (!box) {
    const known = Object.keys(pages[page]?.boxes ?? {}).join(', ') || '(none)';
    const empty = Object.keys(pages).length === 0;
    throw new Error(
      empty
        ? 'useLayout: src/data/layout.json is still the empty stub. Run ' +
          '`node scripts/capture_layout.mjs <config>.json` against the running product and copy ' +
          'the result into src/data/ before reading any target from it.'
        : `useLayout: no box "${key}" on page "${page}". Known boxes: ${known}. ` +
          `Declare it in the capture config's "boxes" and re-run capture_layout.mjs.`
    );
  }
  const k = renderedW / captureWidth;
  return {
    x: box.x * k,
    y: box.y * k,
    w: box.w * k,
    h: box.h * k,
    cx: (box.x + box.w / 2) * k,
    cy: (box.y + box.h / 2) * k,
  };
};

/** Every box on a page, for iterating rows without naming each one. */
export const useLayoutPage = (page: string, renderedW: number): Record<string, Box> => {
  const boxes = pages[page]?.boxes ?? {};
  const k = renderedW / captureWidth;
  return Object.fromEntries(
    Object.entries(boxes).map(([key, b]) => [key, {x: b.x * k, y: b.y * k, w: b.w * k, h: b.h * k}])
  );
};
