// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['.output/', '.wxt/', 'node_modules/', 'demo/'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  prettier,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    // WXT auto-imports (defineBackground, defineContentScript, browser, ...)
    // are declared as globals in .wxt/types; eslint doesn't read them.
    files: ['entrypoints/**'],
    rules: {
      'no-undef': 'off',
    },
  },
);
