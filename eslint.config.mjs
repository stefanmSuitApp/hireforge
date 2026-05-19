import nx from '@nx/eslint-plugin';

export default [
  ...nx.configs['flat/base'],
  ...nx.configs['flat/typescript'],
  ...nx.configs['flat/javascript'],
  {
    ignores: ['**/dist', '**/out-tsc', '**/vite.config.*.timestamp*'],
  },
  /**
   * Type-aware lint overlay — enables rules that need the TypeScript program
   * (e.g. calling conventionally deprecated symbols such as Zod v4 overloads).
   * `projectService` picks the correct tsconfig per file (monorepo-safe).
   */
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/out-tsc/**',
      '**/.next/**',
      '**/coverage/**',
      '**/vitest.config.mts',
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // After cleaning the tree, keep this at `error` so new deprecations fail CI.
      '@typescript-eslint/no-deprecated': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
    rules: {
      '@nx/enforce-module-boundaries': [
        'error',
        {
          enforceBuildableLibDependency: true,
          allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?[jt]s$'],
          depConstraints: [
            {
              sourceTag: 'scope:web',
              onlyDependOnLibsWithTags: ['scope:web', 'scope:shared'],
            },
            {
              sourceTag: 'scope:cms',
              onlyDependOnLibsWithTags: [
                'scope:cms',
                'scope:web',
                'scope:shared',
              ],
            },
            {
              sourceTag: 'scope:api',
              onlyDependOnLibsWithTags: [
                'scope:api',
                'scope:shared',
                'scope:infra',
              ],
            },
            {
              sourceTag: 'scope:worker',
              onlyDependOnLibsWithTags: [
                'scope:api',
                'scope:shared',
                'scope:infra',
              ],
            },
            {
              sourceTag: 'layer:ui',
              onlyDependOnLibsWithTags: [
                'layer:ui',
                'layer:contracts',
                'layer:shared',
              ],
            },
            {
              sourceTag: 'layer:server',
              onlyDependOnLibsWithTags: [
                'layer:server',
                'layer:contracts',
                'layer:shared',
              ],
            },
            {
              sourceTag: 'layer:contracts',
              onlyDependOnLibsWithTags: ['layer:contracts', 'layer:shared'],
            },
            {
              sourceTag: 'layer:shared',
              onlyDependOnLibsWithTags: ['layer:shared'],
            },
          ],
        },
      ],
    },
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.cts',
      '**/*.mts',
      '**/*.js',
      '**/*.jsx',
      '**/*.cjs',
      '**/*.mjs',
    ],
    rules: {},
  },
];
