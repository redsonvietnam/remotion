import {
  AbsoluteFill,
  Easing,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import type {Scene, VideoContent} from '../types';
import {AnimatedText} from '../components/AnimatedText';
import {INTRO_SECONDS, OUTRO_SECONDS} from '../lib/timeline';

const SceneCard = ({scene, content}: {scene: Scene; content: VideoContent}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const lift = spring({frame, fps, config: {damping: 200}});

  return (
    <AbsoluteFill
      style={{
        padding: 90,
        justifyContent: 'center',
        background: `radial-gradient(circle at 80% 20%, ${content.theme.accent}33, transparent 35%), ${content.theme.background}`,
      }}
    >
      {scene.image ? (
        <Img
          src={staticFile(scene.image)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.28,
          }}
        />
      ) : null}

      <div
        style={{
          position: 'relative',
          padding: 52,
          border: `1px solid ${content.theme.foreground}22`,
          borderRadius: 36,
          background: `${content.theme.foreground}08`,
          transformOrigin: 'center',
          scale: interpolate(lift, [0, 1], [0.96, 1]),
        }}
      >
        <div
          style={{
            width: 90,
            height: 8,
            marginBottom: 32,
            borderRadius: 99,
            background: content.theme.accent,
          }}
        />
        <AnimatedText size={68} color={content.theme.foreground}>
          {scene.title}
        </AnimatedText>
        {scene.body ? (
          <p
            style={{
              margin: '30px 0 0',
              color: content.theme.muted,
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: 34,
              lineHeight: 1.35,
            }}
          >
            {scene.body}
          </p>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};

export const ShortVideo = ({content}: {content: VideoContent}) => {
  const {fps} = useVideoConfig();
  let cursor = 0;

  const introFrames = INTRO_SECONDS * fps;
  cursor += introFrames;

  const sceneSequences = content.scenes.map((scene) => {
    const durationInFrames = Math.max(1, Math.ceil(scene.durationInSeconds * fps));
    const sequence = {
      scene,
      from: cursor,
      durationInFrames,
    };
    cursor += durationInFrames;
    return sequence;
  });

  return (
    <AbsoluteFill
      style={{
        background: content.theme.background,
        color: content.theme.foreground,
        overflow: 'hidden',
      }}
    >
      <Sequence from={0} durationInFrames={introFrames}>
        <AbsoluteFill
          style={{
            padding: 90,
            justifyContent: 'center',
            background: `radial-gradient(circle at 20% 15%, ${content.theme.accent}55, transparent 36%), ${content.theme.background}`,
          }}
        >
          <div
            style={{
              color: content.theme.accent,
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 34,
            }}
          >
            SHORT-FORM TEMPLATE
          </div>
          <AnimatedText size={92} color={content.theme.foreground}>
            {content.title}
          </AnimatedText>
          <p
            style={{
              maxWidth: 850,
              marginTop: 34,
              color: content.theme.muted,
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: 38,
              lineHeight: 1.3,
            }}
          >
            {content.hook}
          </p>
        </AbsoluteFill>
      </Sequence>

      {sceneSequences.map(({scene, from, durationInFrames}) => (
        <Sequence key={scene.id} from={from} durationInFrames={durationInFrames}>
          <SceneCard scene={scene} content={content} />
        </Sequence>
      ))}

      <Sequence from={cursor} durationInFrames={OUTRO_SECONDS * fps}>
        <AbsoluteFill
          style={{
            alignItems: 'center',
            justifyContent: 'center',
            padding: 80,
            textAlign: 'center',
            background: `radial-gradient(circle at 50% 40%, ${content.theme.accent}55, transparent 45%), ${content.theme.background}`,
          }}
        >
          <AnimatedText size={78} color={content.theme.foreground} align="center">
            {content.outro}
          </AnimatedText>
          <div
            style={{
              marginTop: 36,
              color: content.theme.accent,
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '0.12em',
            }}
          >
            FOLLOW FOR MORE
          </div>
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
