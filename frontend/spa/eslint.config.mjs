import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';

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
            import: importPlugin,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            'prettier/prettier': 'error',
            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
            'import/order': [
                'error',
                {
                    groups: [['builtin', 'external', 'internal']],
                    'newlines-between': 'always',
                },
            ],
        },
    }
);
