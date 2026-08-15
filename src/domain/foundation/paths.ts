import {isAbsolute, join, relative, resolve, sep} from 'node:path';

const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

export const assertSafeProjectId = (projectId: string): void => {
  if (!PROJECT_ID_PATTERN.test(projectId)) {
    throw new Error(`Invalid project id: ${projectId}`);
  }
};

export const resolveProjectPath = (
  projectRoot: string,
  projectId: string,
  relativePath = '',
): string => {
  assertSafeProjectId(projectId);
  if (isAbsolute(relativePath)) throw new Error('Project path must be relative');

  const root = resolve(projectRoot);
  const project = resolve(root, projectId);
  const target = resolve(project, relativePath);
  const fromProject = relative(project, target);

  if (fromProject === '..' || fromProject.startsWith(`..${sep}`) || isAbsolute(fromProject)) {
    throw new Error('Project path escapes project boundary');
  }

  return target;
};

export const projectPaths = (projectRoot: string, projectId: string) => ({
  root: resolveProjectPath(projectRoot, projectId),
  project: resolveProjectPath(projectRoot, projectId, 'project.json'),
  ledger: resolveProjectPath(projectRoot, projectId, 'ledger'),
  content: resolveProjectPath(projectRoot, projectId, 'content'),
  plan: resolveProjectPath(projectRoot, projectId, 'content/plan.json'),
  timeline: resolveProjectPath(projectRoot, projectId, 'timeline'),
  timelineFile: resolveProjectPath(projectRoot, projectId, 'timeline/timeline.json'),
  assets: resolveProjectPath(projectRoot, projectId, 'assets'),
  snapshots: resolveProjectPath(projectRoot, projectId, 'snapshots'),
  renders: resolveProjectPath(projectRoot, projectId, 'renders'),
  logs: resolveProjectPath(projectRoot, projectId, 'logs'),
});

export const isPathWithin = (root: string, candidate: string): boolean => {
  const normalizedRoot = resolve(root);
  const normalizedCandidate = resolve(candidate);
  const relativePath = relative(normalizedRoot, normalizedCandidate);
  return relativePath === '' || (!relativePath.startsWith(`..${sep}`) && relativePath !== '..' && !isAbsolute(relativePath));
};

export const joinProjectPath = (projectRoot: string, projectId: string, ...parts: string[]): string =>
  resolveProjectPath(projectRoot, projectId, join(...parts));
