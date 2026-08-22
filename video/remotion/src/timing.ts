import data from './data/scene_timing.json';
import {FPS} from './theme';

export const VO = data.vo;
export const TAIL = 1.4;
export const TOTAL_FRAMES = Math.round((VO + TAIL) * FPS);

type Raw = {id: string; start: number; end: number; dur: number};
const raw = data.scenes as Raw[];

export type SceneId = Raw['id'];

// Each scene occupies [start_i, start_{i+1}) so its visuals line up with the VO beat.
export const SCENES = raw.map((s, i) => {
  const startF = Math.round(s.start * FPS);
  const nextStart = i < raw.length - 1 ? raw[i + 1].start : VO + TAIL;
  const durF = Math.round(nextStart * FPS) - startF;
  return {id: s.id, start: s.start, end: s.end, startF, durF};
});
