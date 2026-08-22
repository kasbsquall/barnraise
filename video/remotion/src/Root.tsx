import {Composition} from 'remotion';
import {Agents, AGENTS_DUR} from './scenes/Agents';
import {FPS} from './theme';

// One composition, not three. Two independent reviewers picked the held frame
// over both camera moves and for the same reason: the moves cost information the
// scene needs. Keeping the losing treatments around invites rebuilding them.
export const RemotionRoot: React.FC = () => (
  <Composition
    id="S4-agents"
    component={Agents}
    durationInFrames={AGENTS_DUR}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
