import React from 'react';
import {AbsoluteFill, Audio, Composition, Still, staticFile} from 'remotion';
import timing from './data/scene_timing.json';
import {Pause, PAUSE_DUR} from './scenes/Pause';
import {Neighborhood, NEIGHBORHOOD_DUR} from './scenes/Neighborhood';
import {People, PEOPLE_DUR} from './scenes/People';
import {Agents, AGENTS_DUR} from './scenes/Agents';
import {Signatures, SIGNATURES_DUR} from './scenes/Signatures';
import {Refuses, REFUSES_DUR} from './scenes/Refuses';
import {Coalition, COALITION_DUR} from './scenes/Coalition';
import {Close, CLOSE_DUR} from './scenes/Close';
import {Film, FILM_FRAMES} from './Video';
import {Thumbnail} from './Thumbnail';
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
      {id !== 's8' && <Captions offset={s.start} />}
    </AbsoluteFill>
  );
};

// One composition per scene while the picture is being approved. A note then
// costs a four-minute render instead of a forty-minute one.
export const RemotionRoot: React.FC = () => (
  <>
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
    <Composition
      id="Barnraise"
      component={Film}
      durationInFrames={FILM_FRAMES} fps={FPS} width={1920} height={1080}
    />
    <Composition
      id="S1-pause"
      component={() => <Solo id="s1"><Pause /></Solo>}
      durationInFrames={PAUSE_DUR} fps={FPS} width={1920} height={1080}
    />
    <Composition
      id="S2-neighborhood"
      component={() => <Solo id="s2"><Neighborhood /></Solo>}
      durationInFrames={NEIGHBORHOOD_DUR} fps={FPS} width={1920} height={1080}
    />
    <Composition
      id="S3-people"
      component={() => <Solo id="s3"><People /></Solo>}
      durationInFrames={PEOPLE_DUR} fps={FPS} width={1920} height={1080}
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
    <Composition
      id="S6-refuses"
      component={() => <Solo id="s6"><Refuses /></Solo>}
      durationInFrames={REFUSES_DUR} fps={FPS} width={1920} height={1080}
    />
    <Composition
      id="S7-coalition"
      component={() => <Solo id="s7"><Coalition /></Solo>}
      durationInFrames={COALITION_DUR} fps={FPS} width={1920} height={1080}
    />
    <Composition
      id="S8-close"
      component={() => <Solo id="s8"><Close /></Solo>}
      durationInFrames={CLOSE_DUR} fps={FPS} width={1920} height={1080}
    />
  </>
);
