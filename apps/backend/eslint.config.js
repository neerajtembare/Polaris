// eslint.config.js — flat config for @polaris/backend
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  // ── Ignore patterns ────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'node_modules/**', 'prisma/**'],
  },

  // ── TypeScript source files ─────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // TypeScript strict rules
      ...tsPlugin.configs['recommended'].rules,
      '@typescript-eslint/no-explicit-any':   'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      // General
      'no-var':           'error',
      'prefer-const':     'error',
      'no-console':       ['warn', { allow: ['error', 'warn'] }],
    },
  },
];
