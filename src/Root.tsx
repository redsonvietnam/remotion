import {Composition} from 'remotion';
import {ShortVideo} from './compositions/ShortVideo';
import {defaultVideo} from './data/default-video';
import {getVideoDurationInFrames} from './lib/timeline';

const FPS = 30;

export const RemotionRoot = () => {
  return (
    <Composition
      id="MainVideo"
      component={ShortVideo}
      durationInFrames={getVideoDurationInFrames(defaultVideo, FPS)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={{content: defaultVideo}}
    />
  );
};
