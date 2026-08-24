import data from './data/scene_timing.json';

/**
 * The film's spine, derived from the measured narration rather than from an
 * estimate. audio/mix.py writes scene_timing.json after synthesising each scene
 * and reading its real duration with ffprobe, so a re-recorded voiceover moves
 * these numbers and every scene follows.
 *
 * Nothing is recomputed here. An earlier version derived each scene's length
 * from the NEXT scene's start, which quietly disagreed with the file whenever a
 * clip was re-cut.
 */
export type Scene = {
  id: string;
  titulo: string;
  vo: string;
  vo_dur: number;
  lead: number;
  tail: number;
  start: number;
  end: number;
  dur: number;
  startF: number;
  durF: number;
  voStart: number;
};

export const SCENES = data as Scene[];
export const scene = (id: string): Scene => {
  const s = SCENES.find((x) => x.id === id);
  if (!s) throw new Error(`no scene "${id}" in scene_timing.json`);
  return s;
};

export const TOTAL_FRAMES = SCENES.reduce((n, s) => n + s.durF, 0);
export const TOTAL_SECONDS = SCENES[SCENES.length - 1].end;
