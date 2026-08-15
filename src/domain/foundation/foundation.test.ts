import {describe, expect, it} from 'vitest';
import {createCapabilityRegistry} from './capabilities';
import {resolveConfig} from './config';
import {hashValue, stableJson} from './ids';
import {createProject} from './project';
import {projectPaths, resolveProjectPath} from './paths';
import {applyStageRunEvent, failStageRun, startStageRun, succeedStageRun} from './stage-run';
import {isProjectRecord, isStageRunRecord} from './validation';
import type {ProjectId} from './types';

describe('foundation', () => {
  it('canonicalizes object key order for deterministic hashing', () => {
    expect(stableJson({b: 2, a: 1})).toBe(stableJson({a: 1, b: 2}));
    expect(hashValue({b: 2, a: 1})).toBe(hashValue({a: 1, b: 2}));
  });

  it('creates a self-describing project without secret state', () => {
    const project = createProject({name: '  Nghị quyết 57  ', createdAt: '2026-08-15T00:00:00.000Z'});
    expect(isProjectRecord(project)).toBe(true);
    expect(project.name).toBe('Nghị quyết 57');
    expect(Object.keys(project).sort()).toEqual(['createdAt', 'id', 'name', 'schemaVersion']);
  });

  it('rejects invalid persisted project and StageRun state', () => {
    expect(isProjectRecord({schemaVersion: 1, id: 'x', name: 'x'})).toBe(false);
    expect(isStageRunRecord({schemaVersion: 1, id: 'run_x', projectId: 'project_x', stage: 'render', status: 'running', attempt: 0, startedAt: 'bad', inputHash: 'x', dependencyRunIds: []})).toBe(false);
  });

  it('enforces the project path boundary', () => {
    expect(resolveProjectPath('/tmp/projects', 'project_x', 'assets/a.png')).toBe('/tmp/projects/project_x/assets/a.png');
    expect(() => resolveProjectPath('/tmp/projects', 'project_x', '../outside')).toThrow();
    expect(() => resolveProjectPath('/tmp/projects', 'project_x', '/outside')).toThrow();
    expect(projectPaths('/tmp/projects', 'project_x').plan).toBe('/tmp/projects/project_x/content/plan.json');
  });

  it('uses CLI > project > user > environment > defaults precedence', () => {
    const config = resolveConfig({
      defaults: {projectRoot: 'defaults', defaultTemplate: 'defaults', defaultStyle: 'defaults', defaultRenderProfile: 'defaults', providers: {text: 'defaults'}},
      env: {projectRoot: 'env', defaultTemplate: 'env', providers: {text: 'env'}},
      user: {projectRoot: 'user', defaultTemplate: 'user', providers: {text: 'user'}},
      project: {projectRoot: 'project', template: 'project', providers: {text: 'project'}},
      cli: {projectRoot: 'cli', defaultTemplate: 'cli', providers: {text: 'cli'}},
    });
    expect(config.projectRoot).toBe('cli');
    expect(config.defaultTemplate).toBe('cli');
    expect(config.defaultStyle).toBe('defaults');
    expect(config.providers.text).toBe('cli');
  });

  it('models StageRun as an append-only lifecycle', () => {
    const projectId = 'project_x' as ProjectId;
    const started = startStageRun({projectId, stage: 'captionAlign', inputHash: 'input', attempt: 1, startedAt: '2026-08-15T00:00:00.000Z'});
    expect(started.type).toBe('started');
    expect(isStageRunRecord(started.run)).toBe(true);

    const succeeded = succeedStageRun({run: started.run, finishedAt: '2026-08-15T00:00:01.000Z', outputHash: 'output'});
    const completed = applyStageRunEvent(started.run, succeeded);
    expect(completed.status).toBe('succeeded');
    expect(completed.outputHash).toBe('output');
    expect(() => failStageRun({run: completed, finishedAt: '2026-08-15T00:00:02.000Z', errorCode: 'late'})).toThrow();
  });

  it('registers capabilities by capability kind, not provider brand', () => {
    const text = {kind: 'text' as const, providerId: 'fake-text', generate: async () => ({text: 'ok', metadata: {provider: 'fake', model: 'test', requestHash: 'x'}})};
    const registry = createCapabilityRegistry([text]);
    expect(registry.text?.providerId).toBe('fake-text');
    expect(() => createCapabilityRegistry([text, text])).toThrow('Duplicate capability registration');
  });
});
