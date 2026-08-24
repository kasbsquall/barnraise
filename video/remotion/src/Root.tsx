import {Composition} from 'remotion';
import {Agents, AGENTS_DUR} from './scenes/Agents';
import {Signatures, SIGNATURES_DUR} from './scenes/Signatures';
import {FPS} from './theme';

// One composition per scene while the picture is being approved. A note on one
// scene then costs a four-minute render instead of a forty-minute one, and they
// are assembled into the film once every scene is signed off.
export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="S4-agents" component={Agents}
      durationInFrames={AGENTS_DUR} fps={FPS} width={1920} height={1080} />
    <Composition id="S5-signatures" component={Signatures}
      durationInFrames={SIGNATURES_DUR} fps={FPS} width={1920} height={1080} />
  </>
);
