import {createHash} from 'node:crypto';

const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
};

export const stableJson = (value: unknown): string => JSON.stringify(canonicalize(value)) ?? 'undefined';

export const sha256 = (value: string | Uint8Array): string =>
  createHash('sha256').update(value).digest('hex');

export const hashValue = (value: unknown): string => sha256(stableJson(value));

export const deterministicId = (namespace: string, value: unknown): string =>
  `${namespace}_${hashValue(value).slice(0, 24)}`;
