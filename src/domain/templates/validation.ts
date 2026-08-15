import type {StyleDefinition, StyleTokens, TemplateDefinition} from './types';

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

const isMetadata = (value: unknown): boolean => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return Object.keys(v).every((key) => key === 'description') &&
    (!('description' in v) || typeof v.description === 'string');
};

const validateTypography = (value: unknown): boolean => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const allowed = ['fontFamily', 'fontWeight', 'fontSize', 'lineHeight', 'letterSpacing', 'maxWidth', 'alignment'] as const;
  const v = value as Record<string, unknown>;
  if (!Object.keys(v).every((key) => allowed.includes(key as (typeof allowed)[number]))) return false;
  if ('fontFamily' in v && !isNonEmptyString(v.fontFamily)) return false;
  if ('fontWeight' in v && ![400, 500, 600, 700, 800, 900].includes(v.fontWeight as number)) return false;
  for (const key of ['fontSize', 'lineHeight', 'maxWidth'] as const) {
    if (key in v && (!isFiniteNumber(v[key]) || (v[key] as number) <= 0)) return false;
  }
  if ('letterSpacing' in v && !isFiniteNumber(v.letterSpacing)) return false;
  if ('alignment' in v && !['left', 'center', 'right'].includes(v.alignment as string)) return false;
  return true;
};

export const isStyleTokens = (value: unknown): value is StyleTokens => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  const categories = ['typography', 'colors', 'spacing', 'caption', 'transitions', 'motion'] as const;
  if (!Object.keys(v).every((key) => categories.includes(key as (typeof categories)[number]))) return false;

  if ('typography' in v && !validateTypography(v.typography)) return false;

  if ('colors' in v) {
    if (v.colors === null || typeof v.colors !== 'object' || Array.isArray(v.colors)) return false;
    const c = v.colors as Record<string, unknown>;
    if (!Object.keys(c).every((key) => ['primary', 'secondary', 'background', 'foreground', 'accent'].includes(key))) return false;
    if (!Object.values(c).every(isNonEmptyString)) return false;
  }

  if ('spacing' in v) {
    if (v.spacing === null || typeof v.spacing !== 'object' || Array.isArray(v.spacing)) return false;
    const s = v.spacing as Record<string, unknown>;
    if (!Object.keys(s).every((key) => ['xs', 'sm', 'md', 'lg', 'xl'].includes(key))) return false;
    if (!Object.values(s).every((entry) => isFiniteNumber(entry) && entry >= 0)) return false;
  }

  if ('caption' in v) {
    if (v.caption === null || typeof v.caption !== 'object' || Array.isArray(v.caption)) return false;
    const c = v.caption as Record<string, unknown>;
    if (!Object.keys(c).every((key) => ['color', 'background', 'fontSize', 'position'].includes(key))) return false;
    if ('color' in c && !isNonEmptyString(c.color)) return false;
    if ('background' in c && !isNonEmptyString(c.background)) return false;
    if ('fontSize' in c && (!isFiniteNumber(c.fontSize) || (c.fontSize as number) <= 0)) return false;
    if ('position' in c && !['top', 'center', 'bottom'].includes(c.position as string)) return false;
  }

  if ('transitions' in v) {
    if (v.transitions === null || typeof v.transitions !== 'object' || Array.isArray(v.transitions)) return false;
    const t = v.transitions as Record<string, unknown>;
    if (!Object.keys(t).every((key) => ['name', 'durationFrames'].includes(key))) return false;
    if ('name' in t && !isNonEmptyString(t.name)) return false;
    if ('durationFrames' in t && (!Number.isInteger(t.durationFrames) || (t.durationFrames as number) < 0)) return false;
  }

  if ('motion' in v) {
    if (v.motion === null || typeof v.motion !== 'object' || Array.isArray(v.motion)) return false;
    const m = v.motion as Record<string, unknown>;
    if (!Object.keys(m).every((key) => key === 'preset')) return false;
    if ('preset' in m && !isNonEmptyString(m.preset)) return false;
  }

  return true;
};

export const isTemplateDefinition = (value: unknown): value is TemplateDefinition => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (!Object.keys(v).every((key) => ['schemaVersion', 'id', 'name', 'defaults', 'styleOverrides', 'metadata'].includes(key))) return false;
  if (v.schemaVersion !== 1 || !isNonEmptyString(v.id) || !v.id.startsWith('template_') || !isNonEmptyString(v.name)) return false;
  if (!isStyleTokens(v.defaults)) return false;
  if ('styleOverrides' in v && v.styleOverrides !== undefined && !isStyleTokens(v.styleOverrides)) return false;
  if ('metadata' in v && v.metadata !== undefined && !isMetadata(v.metadata)) return false;
  return true;
};

export const isStyleDefinition = (value: unknown): value is StyleDefinition => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (!Object.keys(v).every((key) => ['schemaVersion', 'id', 'name', 'tokens', 'metadata'].includes(key))) return false;
  if (v.schemaVersion !== 1 || !isNonEmptyString(v.id) || !v.id.startsWith('style_') || !isNonEmptyString(v.name)) return false;
  if (!isStyleTokens(v.tokens)) return false;
  if ('metadata' in v && v.metadata !== undefined && !isMetadata(v.metadata)) return false;
  return true;
};
