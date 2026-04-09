import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactPlugin from 'eslint-plugin-react';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      react: reactPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // Prettier applique le formatage automatiquement
      'prettier/prettier': 'warn',

      // React : pas besoin d'importer React en JSX transform
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',

      // Variables inutilisées : erreur sauf conventions majuscules
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],

      // Qualité du code
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'prefer-const': 'warn',
      'no-var': 'error',

      // Désactivé pour compatibilité avec le code migré
      ...prettierConfig.rules,
    },
  },
]);
