import {deterministicId} from './ids';
import type {ProjectId, StageName, StageRunEvent, StageRunId, StageRunRecord} from './types';

export const startStageRun = ({
  projectId,
  stage,
  inputHash,
  attempt,
  startedAt,
  dependencyRunIds = [],
}: {
  projectId: ProjectId;
  stage: StageName;
  inputHash: string;
  attempt: number;
  startedAt: string;
  dependencyRunIds?: readonly StageRunId[];
}): StageRunEvent => {
  if (!Number.isInteger(attempt) || attempt < 1) throw new Error('StageRun attempt must be a positive integer');
  const id = deterministicId('run', {projectId, stage, inputHash, attempt}) as StageRunId;
  const run: StageRunRecord = {
    schemaVersion: 1,
    id,
    projectId,
    stage,
    status: 'running',
    attempt,
    startedAt,
    inputHash,
    dependencyRunIds: [...dependencyRunIds],
  };
  return {type: 'started', run};
};

export const succeedStageRun = ({
  run,
  finishedAt,
  outputHash,
}: {
  run: StageRunRecord;
  finishedAt: string;
  outputHash?: string;
}): StageRunEvent => {
  if (run.status !== 'running') throw new Error('Only a running StageRun can succeed');
  return {type: 'succeeded', runId: run.id, finishedAt, outputHash};
};

export const failStageRun = ({
  run,
  finishedAt,
  errorCode,
}: {
  run: StageRunRecord;
  finishedAt: string;
  errorCode: string;
}): StageRunEvent => {
  if (run.status !== 'running') throw new Error('Only a running StageRun can fail');
  if (!errorCode) throw new Error('StageRun failure requires an error code');
  return {type: 'failed', runId: run.id, finishedAt, errorCode};
};

export const applyStageRunEvent = (
  run: StageRunRecord,
  event: Exclude<StageRunEvent, {type: 'started'}>,
): StageRunRecord => {
  if (run.id !== event.runId) throw new Error('StageRun event targets a different run');
  if (run.status !== 'running') throw new Error('StageRun is already terminal');

  if (event.type === 'succeeded') {
    return {
      ...run,
      status: 'succeeded',
      finishedAt: event.finishedAt,
      outputHash: event.outputHash,
    };
  }

  return {
    ...run,
    status: 'failed',
    finishedAt: event.finishedAt,
    errorCode: event.errorCode,
  };
};
