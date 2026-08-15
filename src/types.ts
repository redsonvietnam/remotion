export type Scene = {
  id: string;
  title: string;
  body?: string;
  durationInSeconds: number;
  image?: string;
  video?: string;
};

export type VideoTheme = {
  background: string;
  foreground: string;
  muted: string;
  accent: string;
};

export type VideoContent = {
  title: string;
  hook: string;
  scenes: Scene[];
  outro: string;
  backgroundAudio?: string;
  theme: VideoTheme;
};
