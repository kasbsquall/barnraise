import React from 'react';
import {AbsoluteFill, Audio, Composition, staticFile} from 'remotion';
import timing from './data/scene_timing.json';
import {Pause, PAUSE_DUR} from './scenes/Pause';
import {Agents, AGENTS_DUR} from './scenes/Agents';
import {Signatures, SIGNATURES_DUR} from './scenes/Signatures';
import {Captions} from './lib/Captions';
import {FPS} from './theme';

type Scene = {id: string; start: number; dur: number; startF: number; durF: number};
const T = timing as Scene[];
const at = (id: string) => T.find((s) => s.id === id)!;

/** A scene on its own, carrying the film's audio bed and subtitles from its own
 *  start time. A preview that omits the film's layers is not a preview of the
 *  film, it is a different picture. */
const Solo: React.FC<{id: string; children: React.ReactNode}> = ({id, children}) => {
  const s = at(id);
  return (
    <AbsoluteFill>
      {children}
      <Audio src={staticFile('mix.wav')} startFrom={s.startF} />
      <Captions offset={s.start} />
    </AbsoluteFill>
  );
};

// One composition per scene while the picture is being approved. A note then
// costs a four-minute render instead of a forty-minute one.
export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="S1-pause"
      component={() => <Solo id="s1"><Pause /></Solo>}
      durationInFrames={PAUSE_DUR} fps={FPS} width={1920} height={1080}
    />
    <Composition
      id="S4-agents"
      component={() => <Solo id="s4"><Agents /></Solo>}
      durationInFrames={AGENTS_DUR} fps={FPS} width={1920} height={1080}
    />
    <Composition
      id="S5-signatures"
      component={() => <Solo id="s5"><Signatures /></Solo>}
      durationInFrames={SIGNATURES_DUR} fps={FPS} width={1920} height={1080}
    />
  </>
);
