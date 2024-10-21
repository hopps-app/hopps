// @ts-ignore
import path from 'path';
import { defineConfig } from 'vitest/config';
import svgr from 'vite-plugin-svgr';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [svgr(), react()],
    test: {
        globals: true,
        environment: 'jsdom',
        // include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        // exclude: ['node_modules', 'dist', 'build', 'coverage', 'postcss.config.js', 'tailwind.config.js'],
        setupFiles: ['./src/setupTests.ts'],
        coverage: {
            reportsDirectory: './coverage',
            provider: 'v8', // or 'istanbul'
            reporter: ['text', 'json', 'html'],
            all: true,
            include: ['src/**/*.{ts,tsx}'],
            exclude: ['node_modules', 'test'],
            thresholds: {
                statements: 80,
                branches: 80,
                functions: 80,
                lines: 80,
            },
        },
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
});
