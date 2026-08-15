import {describe, expect, it} from 'vitest';
import {createStyle, createTemplate} from './templates';
import {TemplateStyleRegistry} from './registry';
import {resolveStyle} from './resolver';
import {isStyleDefinition, isStyleTokens, isTemplateDefinition} from './validation';

const template = createTemplate({
  name: 'vertical',
  defaults: {
    typography: {fontFamily: 'Be Vietnam Pro', fontSize: 32, lineHeight: 1.2, fontWeight: 700, letterSpacing: 0, maxWidth: 900, alignment: 'left'},
    colors: {foreground: '#ffffff', background: '#000000'},
    spacing: {md: 16},
  },
  styleOverrides: {
    colors: {foreground: '#ff0000'},
  },
});

const style = createStyle({
  name: 'editorial',
  tokens: {
    typography: {fontSize: 40},
    colors: {foreground: '#00ff00', accent: '#ffff00'},
    spacing: {md: 24, lg: 32},
  },
});

describe('WS5 template/style registry', () => {
  it('validates Template and Style definitions strictly', () => {
    expect(isTemplateDefinition(template)).toBe(true);
    expect(isStyleDefinition(style)).toBe(true);
    expect(isTemplateDefinition({...template, apiKey: 'secret'})).toBe(false);
    expect(isStyleDefinition({...style, providerSecret: 'secret'})).toBe(false);
    expect(isStyleTokens({colors: {foreground: '#fff'}, unknown: 1})).toBe(false);
    expect(isStyleTokens({spacing: {md: 0}})).toBe(true);
  });

  it('derives deterministic identities', () => {
    expect(createTemplate({name: template.name, defaults: template.defaults, styleOverrides: template.styleOverrides})).toEqual(template);
    expect(createStyle({name: style.name, tokens: style.tokens})).toEqual(style);
  });

  it('resolves defaults when Style omits a field', () => {
    const result = resolveStyle(template, createStyle({name: 'minimal', tokens: {}}));
    expect(result.spacing?.md).toBe(16);
    expect(result.typography?.fontSize).toBe(32);
  });

  it('lets Style override unlocked Template defaults', () => {
    const result = resolveStyle(template, style);
    expect(result.typography?.fontSize).toBe(40);
    expect(result.spacing?.md).toBe(24);
    expect(result.colors?.accent).toBe('#ffff00');
  });

  it('lets explicit overrides win over Style for unlocked fields', () => {
    const result = resolveStyle(template, style, {
      typography: {fontSize: 48},
      spacing: {md: 0},
    });
    expect(result.typography?.fontSize).toBe(48);
    expect(result.spacing?.md).toBe(0);
  });

  it('prevents explicit overrides and Style from replacing locked Template fields', () => {
    const result = resolveStyle(template, style, {colors: {foreground: '#0000ff'}});
    expect(result.colors?.foreground).toBe('#ff0000');
  });

  it('resolves token categories independently', () => {
    const result = resolveStyle(template, style, {caption: {fontSize: 18, position: 'bottom'}});
    expect(result.typography?.fontSize).toBe(40);
    expect(result.colors?.accent).toBe('#ffff00');
    expect(result.caption).toEqual({fontSize: 18, position: 'bottom'});
  });

  it('is deterministic and does not use RenderProfile as a token layer', () => {
    const first = resolveStyle(template, style, {spacing: {lg: 64}});
    const second = resolveStyle(template, style, {spacing: {lg: 64}});
    expect(second).toEqual(first);
  });

  it('rejects malformed definitions and overrides', () => {
    expect(isTemplateDefinition({...template, defaults: {colors: {foreground: 123}}})).toBe(false);
    expect(isStyleDefinition({...style, tokens: {colors: {unknown: '#fff'}}})).toBe(false);
    expect(isStyleTokens({transitions: {durationFrames: -1}})).toBe(false);
    expect(() => resolveStyle(template, style, {colors: {unknown: '#fff'} as never})).toThrow('Invalid style override');
  });

  it('rejects duplicate registry IDs and has insertion-order-independent lookup', () => {
    const reverse = new TemplateStyleRegistry([template], [style]);
    const normal = new TemplateStyleRegistry([template], [style]);
    expect(reverse.getTemplate(template.id)).toEqual(normal.getTemplate(template.id));
    expect(reverse.getStyle(style.id)).toEqual(normal.getStyle(style.id));
    expect(reverse.templateIds()).toEqual([template.id].sort());
    expect(() => new TemplateStyleRegistry([template, template], [])).toThrow('Duplicate template id');
    expect(() => new TemplateStyleRegistry([], [style, style])).toThrow('Duplicate style id');
  });

  it('produces a deterministic registry fingerprint', () => {
    const a = new TemplateStyleRegistry([template], [style]);
    const b = new TemplateStyleRegistry([template], [style]);
    expect(a.fingerprint()).toBe(b.fingerprint());
  });

  it('keeps the WS5 domain renderer/provider independent', async () => {
    const source = await import('node:fs/promises').then((fs) => fs.readFile(new URL('./resolver.ts', import.meta.url), 'utf8'));
    expect(source).not.toMatch(/from ['\"](?:remotion|@remotion\//);
    expect(source).not.toContain('process.env');
    expect(source).not.toContain('fetch(');
  });
});
