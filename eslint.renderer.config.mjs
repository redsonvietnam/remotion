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
            {
              regex: '(^|/)(providers)(/|$)',
              message: 'Renderer must not import provider modules.',
            },
            {
              regex: '(^|/)(cli)(/|$)',
              message: 'Renderer must not import CLI modules.',
            },
            {
              regex: '(^|/)(config(?:\\.[^/]+)?|secrets)(/|$)',
              message: 'Renderer must not import configuration or secret-loading modules.',
            },
            {
              regex: '(^|/)(pipeline|asset-store|project|stage-run)(/|$)',
              message: 'Renderer must not import mutable pipeline or project-state modules.',
            },
          ],
        },
      ],
    },
  },
];
