import {config} from '@remotion/eslint-config-flat';

export default [
  ...config,
  {
    files: ['src/renderer/**/*.{js,jsx,ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {group: ['src/providers/**', '../providers/**', '../../providers/**'], message: 'Renderer must not import provider modules.'},
            {group: ['src/cli/**', '../cli/**', '../../cli/**'], message: 'Renderer must not import CLI modules.'},
            {group: ['**/config', '**/config.ts', '**/config.js', '**/secrets/**'], message: 'Renderer must not import configuration or secret-loading modules.'},
            {group: ['**/pipeline/**', '../domain/foundation/asset-store', '../domain/foundation/project', '../domain/foundation/stage-run'], message: 'Renderer must not import mutable pipeline or project-state modules.'},
          ],
        },
      ],
    },
  },
];
