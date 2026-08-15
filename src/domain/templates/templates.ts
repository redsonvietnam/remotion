import {deterministicId} from '../foundation/ids';
import type {StyleDefinition, StyleTokens, TemplateDefinition} from './types';

export type TemplateInput = Omit<TemplateDefinition, 'id' | 'schemaVersion'>;
export type StyleInput = Omit<StyleDefinition, 'id' | 'schemaVersion'>;

export const createTemplate = (input: TemplateInput): TemplateDefinition => {
  const payload = {schemaVersion: 1 as const, ...input};
  return {...payload, id: deterministicId('template', payload)};
};

export const createStyle = (input: StyleInput): StyleDefinition => {
  const payload = {schemaVersion: 1 as const, ...input};
  return {...payload, id: deterministicId('style', payload)};
};

export const emptyStyleTokens = (): StyleTokens => ({});
