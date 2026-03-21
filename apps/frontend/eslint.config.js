// eslint.config.js — flat config for @polaris/frontend
import tsPlugin    from '@typescript-eslint/eslint-plugin';
import tsParser    from '@typescript-eslint/parser';
import reactPlugin from 'eslint-plugin-react';
import hooksPlugin from 'eslint-plugin-react-hooks';

export default [
  // ── Ignore patterns ────────────────────────────────────────────────────
  {
    ignores: ['dist/**', 'node_modules/**'],
  },

  // ── TypeScript + React source files ────────────────────────────────────
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      react:       reactPlugin,
      'react-hooks': hooksPlugin,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // TypeScript
      ...tsPlugin.configs['recommended'].rules,
      '@typescript-eslint/no-explicit-any':          'error',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports':  ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-non-null-assertion':    'warn',

      // React + hooks
      ...reactPlugin.configs.recommended.rules,
      ...hooksPlugin.configs.recommended.rules,
      'react/react-in-jsx-scope':  'off',   // not needed with React 17+ JSX transform
      'react/prop-types':          'off',   // TypeScript handles this

      // General
      'no-var':             'error',
      'prefer-const':       'error',
      'no-console':         ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq':             ['error', 'always'],
    },
  },
];
