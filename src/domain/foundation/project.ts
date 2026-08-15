import {deterministicId} from './ids';
import {assertSafeProjectId} from './paths';
import type {ProjectId, ProjectRecord} from './types';

export const createProject = ({
  name,
  createdAt = new Date().toISOString(),
}: {
  name: string;
  createdAt?: string;
}): ProjectRecord => {
  const normalizedName = name.trim().replace(/\s+/g, ' ');
  if (!normalizedName) throw new Error('Project name must not be empty');
  const id = deterministicId('project', {name: normalizedName, createdAt}) as ProjectId;
  assertSafeProjectId(id);
  return {
    schemaVersion: 1,
    id,
    name: normalizedName,
    createdAt,
  };
};
