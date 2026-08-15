import type {VideoContent} from '../types';

export const INTRO_SECONDS = 3;
export const OUTRO_SECONDS = 3;

export const getVideoDurationInSeconds = (content: VideoContent) =>
  INTRO_SECONDS +
  content.scenes.reduce((total, scene) => total + scene.durationInSeconds, 0) +
  OUTRO_SECONDS;

export const getVideoDurationInFrames = (content: VideoContent, fps: number) =>
  Math.ceil(getVideoDurationInSeconds(content) * fps);
