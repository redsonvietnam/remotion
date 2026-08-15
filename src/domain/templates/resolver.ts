import {stableJson} from '../foundation/ids';
import type {ResolvedStyle, StyleDefinition, StyleTokens, TemplateDefinition} from './types';
import {isStyleDefinition, isStyleTokens, isTemplateDefinition} from './validation';

type Leaf = {readonly path: readonly string[]; readonly value: unknown};

const leaves = (value: unknown, prefix: readonly string[] = []): Leaf[] => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [{path: prefix, value}];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
    entry === undefined ? [] : leaves(entry, [...prefix, key]),
  );
};

const setPath = (root: Record<string, unknown>, path: readonly string[], value: unknown): void => {
  let cursor = root;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index]!;
    const next = cursor[key];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[path[path.length - 1]!] = value;
};

const applyLayer = (
  target: Record<string, unknown>,
  layer: unknown,
  locked: Set<string>,
  lockLayer: boolean,
): void => {
  for (const leaf of leaves(layer)) {
    if (leaf.path.length === 0) continue;
    const key = leaf.path.join('.');
    if (lockLayer) locked.add(key);
    setPath(target, leaf.path, leaf.value);
  }
};

export const resolveStyle = (
  template: TemplateDefinition,
  style: StyleDefinition,
  explicitOverride?: StyleTokens,
): ResolvedStyle => {
  if (!isTemplateDefinition(template)) throw new Error('Invalid template definition');
  if (!isStyleDefinition(style)) throw new Error('Invalid style definition');
  if (explicitOverride !== undefined && !isStyleTokens(explicitOverride)) throw new Error('Invalid style override');

  const result: Record<string, unknown> = {};
  const locked = new Set<string>();

  // Lowest to highest specificity, with template locks recorded as field-level barriers.
  applyLayer(result, template.defaults, locked, false);
  applyLayer(result, style.tokens, locked, false);
  applyLayer(result, template.styleOverrides, locked, true);

  if (explicitOverride !== undefined) {
    for (const leaf of leaves(explicitOverride)) {
      if (leaf.path.length === 0) continue;
      const key = leaf.path.join('.');
      if (!locked.has(key)) setPath(result, leaf.path, leaf.value);
    }
  }

  return JSON.parse(stableJson(result)) as ResolvedStyle;
};
