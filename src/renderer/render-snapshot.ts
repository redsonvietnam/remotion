import type {RenderSnapshot} from '../domain/snapshot';

export type RendererInput = RenderSnapshot;

export const createRendererInput = (snapshot: RenderSnapshot): RendererInput => snapshot;
