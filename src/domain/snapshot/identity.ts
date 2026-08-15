import {deterministicId, hashValue} from '../foundation/ids';
import type {RenderSnapshot, RenderSnapshotId} from './types';

export const renderSnapshotIdentityInput = (snapshot: Omit<RenderSnapshot, 'id' | 'manifest'>) => ({
  schemaVersion: snapshot.schemaVersion,
  timeline: snapshot.timeline,
  template: snapshot.template,
  style: snapshot.style,
  resolvedStyle: snapshot.resolvedStyle,
  renderProfile: snapshot.renderProfile,
  assets: [...snapshot.assets].sort((a, b) => a.id.localeCompare(b.id)),
});

export const snapshotIdentity = (snapshot: Omit<RenderSnapshot, 'id' | 'manifest'>): RenderSnapshotId =>
  deterministicId('snapshot', renderSnapshotIdentityInput(snapshot)) as RenderSnapshotId;

export const renderSnapshotIdentityHash = (snapshot: RenderSnapshot): string =>
  hashValue(renderSnapshotIdentityInput(snapshot));
