import type {ProjectConfig, VideoFactoryConfig} from './types';

export type ConfigOverrides = Partial<{
  projectRoot: string;
  defaultTemplate: string;
  defaultStyle: string;
  defaultRenderProfile: string;
  providers: VideoFactoryConfig['providers'];
}>;

type ProjectConfigOverrides = ConfigOverrides & ProjectConfig;

const DEFAULT_CONFIG: VideoFactoryConfig = {
  projectRoot: './projects',
  defaultTemplate: 'news',
  defaultStyle: 'minimal',
  defaultRenderProfile: 'vertical-1080x1920-30',
  providers: {},
};

const firstDefined = <T>(...values: readonly (T | undefined)[]): T | undefined =>
  values.find((value) => value !== undefined);

const mergeProviders = (
  ...sources: readonly (VideoFactoryConfig['providers'] | undefined)[]
): VideoFactoryConfig['providers'] => ({
  text: firstDefined(...sources.map((source) => source?.text)),
  image: firstDefined(...sources.map((source) => source?.image)),
  speech: firstDefined(...sources.map((source) => source?.speech)),
  captionAlignment: firstDefined(...sources.map((source) => source?.captionAlignment)),
});

const projectProviders = (project: ProjectConfigOverrides): VideoFactoryConfig['providers'] => ({
  ...project.providers,
  text: project.textProvider ?? project.providers?.text,
  image: project.imageProvider ?? project.providers?.image,
  speech: project.speechProvider ?? project.providers?.speech,
  captionAlignment: project.captionAlignmentProvider ?? project.providers?.captionAlignment,
});

export const resolveConfig = ({
  cli = {},
  project = {},
  user = {},
  env = {},
  defaults = DEFAULT_CONFIG,
}: {
  cli?: ConfigOverrides;
  project?: ProjectConfigOverrides;
  user?: ConfigOverrides;
  env?: ConfigOverrides;
  defaults?: VideoFactoryConfig;
} = {}): VideoFactoryConfig => ({
  projectRoot: firstDefined(
    cli.projectRoot,
    project.projectRoot,
    user.projectRoot,
    env.projectRoot,
    defaults.projectRoot,
  )!,
  defaultTemplate: firstDefined(
    cli.defaultTemplate,
    project.defaultTemplate,
    project.template,
    user.defaultTemplate,
    env.defaultTemplate,
    defaults.defaultTemplate,
  )!,
  defaultStyle: firstDefined(
    cli.defaultStyle,
    project.defaultStyle,
    project.style,
    user.defaultStyle,
    env.defaultStyle,
    defaults.defaultStyle,
  )!,
  defaultRenderProfile: firstDefined(
    cli.defaultRenderProfile,
    project.defaultRenderProfile,
    project.renderProfile,
    user.defaultRenderProfile,
    env.defaultRenderProfile,
    defaults.defaultRenderProfile,
  )!,
  providers: mergeProviders(
    defaults.providers,
    env.providers,
    user.providers,
    projectProviders(project),
    cli.providers,
  ),
});

export const DEFAULTS = DEFAULT_CONFIG;
