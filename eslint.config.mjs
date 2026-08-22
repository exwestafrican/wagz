// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs',  '**/generated/**']  ,
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  {
    files: ['src/fahari/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/envoye', '@/envoye/**'],
              message:
                'Fahari must not import Envoye. Move shared code to src/ (e.g. @/common, @/auth) instead.',
            },
            {
              group: ['**/envoye', '**/envoye/**'],
              message:
                'Fahari must not import Envoye via relative paths. Move shared code to src/ instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/envoye/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/fahari', '@/fahari/**'],
              message:
                'Envoye must not import Fahari. Move shared code to src/ (e.g. @/common, @/auth) instead.',
            },
            {
              group: ['**/fahari', '**/fahari/**'],
              message:
                'Envoye must not import Fahari via relative paths. Move shared code to src/ instead.',
            },
          ],
        },
      ],
    },
  },
);
