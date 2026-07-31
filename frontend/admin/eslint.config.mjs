import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
// eslint-plugin-import 2.x does not support ESLint 10 — its `order` rule throws
// `sourceCode.getTokenOrCommentBefore is not a function` as soon as it has a violation to
// report. import-x is the maintained fork with the same rule semantics.
import importPlugin from 'eslint-plugin-import-x';
import prettier from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['dist'] },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended, prettierConfig],
        files: ['**/*.{ts,tsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: globals.browser,
        },
        plugins: {
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            prettier,
            'import-x': importPlugin,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'prettier/prettier': 'error',
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'react-hooks/exhaustive-deps': 'warn',
            // Mirrors the SPA config: react-hooks v6+ ships the React-Compiler rules as errors in
            // "recommended". Keep them as warnings so they stay visible without blocking CI.
            'react-hooks/set-state-in-effect': 'warn',
            'react-hooks/refs': 'warn',
            'react-hooks/immutability': 'warn',
            'react-hooks/incompatible-library': 'warn',
            // Currently flagged: `Date.now()` during render in OrganizationsTable/OrganizationDetailView
            // (purity) and the `Header` component declared inside OrganizationsTable's render
            // (static-components). Both are worth fixing on their own merits — see follow-up.
            'react-hooks/purity': 'warn',
            'react-hooks/static-components': 'warn',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'import-x/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
        },
    }
);
