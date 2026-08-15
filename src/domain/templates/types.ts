import {deterministicId} from '../foundation/ids';
import type {TypographySpec} from '../typography/types';

export const TEMPLATE_SCHEMA_VERSION = 1 as const;
export const STYLE_SCHEMA_VERSION = 1 as const;

export type ColorTokens = {
  readonly primary?: string;
  readonly secondary?: string;
  readonly background?: string;
  readonly foreground?: string;
  readonly accent?: string;
};

export type SpacingTokens = {
  readonly xs?: number;
  readonly sm?: number;
  readonly md?: number;
  readonly lg?: number;
  readonly xl?: number;
};

export type CaptionTokens = {
  readonly color?: string;
  readonly background?: string;
  readonly fontSize?: number;
  readonly position?: 'top' | 'center' | 'bottom';
};

export type TransitionTokens = {
  readonly name?: string;
  readonly durationFrames?: number;
};

export type MotionTokens = {
  readonly preset?: string;
};

export type StyleTokens = {
  readonly typography?: Partial<TypographySpec>;
  readonly colors?: ColorTokens;
  readonly spacing?: SpacingTokens;
  readonly caption?: CaptionTokens;
  readonly transitions?: TransitionTokens;
  readonly motion?: MotionTokens;
};

export type DefinitionMetadata = {
  readonly description?: string;
};

export type TemplateDefinition = {
  readonly schemaVersion: typeof TEMPLATE_SCHEMA_VERSION;
  readonly id: string;
  readonly name: string;
  readonly defaults: StyleTokens;
  readonly styleOverrides?: StyleTokens;
  readonly metadata?: DefinitionMetadata;
};

export type StyleDefinition = {
  readonly schemaVersion: typeof STYLE_SCHEMA_VERSION;
  readonly id: string;
  readonly name: string;
  readonly tokens: StyleTokens;
  readonly metadata?: DefinitionMetadata;
};

export type StyleOverride = StyleTokens;

export type RenderProfile = {
  readonly resolution: {readonly width: number; readonly height: number};
  readonly fps: number;
  readonly codec: string;
  readonly container: string;
};

export type ResolvedStyle = StyleTokens;

export const templateIdentity = (value: Omit<TemplateDefinition, 'id'>): string =>
  deterministicId('template', value);

export const styleIdentity = (value: Omit<StyleDefinition, 'id'>): string =>
  deterministicId('style', value);
