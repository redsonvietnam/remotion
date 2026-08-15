import type {VideoContent} from '../types';

export const defaultVideo: VideoContent = {
  title: 'A reusable Remotion video template',
  hook: 'Change the content. Keep the production system.',
  scenes: [
    {
      id: 'problem',
      title: 'Start with the idea',
      body: 'Each video is driven by typed content instead of hard-coded scene copy.',
      durationInSeconds: 5,
    },
    {
      id: 'system',
      title: 'Reuse the visual system',
      body: 'Typography, motion, spacing, and transitions live in reusable components.',
      durationInSeconds: 5,
    },
    {
      id: 'scale',
      title: 'Scale to more videos',
      body: 'Replace the data and assets, then render the same composition again.',
      durationInSeconds: 5,
    },
  ],
  outro: 'Build once. Publish many times.',
  theme: {
    background: '#0b0b10',
    foreground: '#f7f7fb',
    muted: '#a7a7b5',
    accent: '#7c5cff',
  },
};
