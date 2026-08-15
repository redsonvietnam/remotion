import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

type AnimatedTextProps = {
  children: React.ReactNode;
  size: number;
  color: string;
  align?: 'left' | 'center';
};

export const AnimatedText = ({
  children,
  size,
  color,
  align = 'left',
}: AnimatedTextProps) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  return (
    <div
      style={{
        color,
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: size,
        fontWeight: 800,
        lineHeight: 1.04,
        letterSpacing: '-0.03em',
        textAlign: align,
        opacity: interpolate(frame, [0, 0.6 * fps], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        }),
        translate: `0px ${interpolate(frame, [0, 0.6 * fps], [36, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
          easing: Easing.bezier(0.16, 1, 0.3, 1),
        })}px`,
      }}
    >
      {children}
    </div>
  );
};
