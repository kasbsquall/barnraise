import {Composition} from 'remotion';
import {Agents, AGENTS_DUR} from './scenes/Agents';
import type {Treatment} from './scenes/Agents';
import {FPS} from './theme';

// Three camera treatments of the same scene, so the choice is made by watching
// rather than by reading a description of it.
const TREATMENTS: Treatment[] = ['reveal', 'locked', 'gentle'];

export const RemotionRoot: React.FC = () => (
  <>
    {TREATMENTS.map((t) => (
      <Composition
        key={t}
        id={`S4-${t}`}
        component={Agents}
        defaultProps={{treatment: t}}
        durationInFrames={AGENTS_DUR}
        fps={FPS}
        width={1920}
        height={1080}
      />
    ))}
  </>
);
