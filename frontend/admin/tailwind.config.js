/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ['class', '[data-theme="dark"]'],
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    // Badge tones are built as `badge--${tone}`, so the literal class names never
    // appear in source for the content scanner to keep. Safelist them explicitly.
    safelist: ['badge--pos', 'badge--neg', 'badge--warn', 'badge--neutral', 'badge--purple'],
    theme: {
        extend: {
            borderRadius: {
                card: 'var(--r-card)',
                md: 'var(--r-md)',
                sm: 'var(--r-sm)',
                pill: 'var(--r-pill)',
            },
            boxShadow: {
                sm: 'var(--shadow-sm)',
                md: 'var(--shadow-md)',
                lg: 'var(--shadow-lg)',
            },
            colors: {
                // Klar tokens — real names from the design system.
                bg: 'var(--bg)',
                surface: {
                    DEFAULT: 'var(--surface)',
                    2: 'var(--surface-2)',
                    3: 'var(--surface-3)',
                },
                ink: {
                    DEFAULT: 'var(--ink)',
                    2: 'var(--ink-2)',
                    3: 'var(--ink-3)',
                },
                line: {
                    DEFAULT: 'var(--line)',
                    2: 'var(--line-2)',
                },
                pp: {
                    DEFAULT: 'var(--pp)',
                    deep: 'var(--pp-deep)',
                    ink: 'var(--pp-ink)',
                    tint: 'var(--pp-tint)',
                    tint2: 'var(--pp-tint2)',
                },
                pos: { DEFAULT: 'var(--pos)', bg: 'var(--pos-bg)', ink: 'var(--pos-ink)' },
                neg: { DEFAULT: 'var(--neg)', bg: 'var(--neg-bg)', ink: 'var(--neg-ink)' },
                warn: { DEFAULT: 'var(--warn)', bg: 'var(--warn-bg)' },

                // Back-compat aliases → Klar tokens. Older components (sidebar, badge)
                // still use these names; they map onto the real palette so nothing
                // renders colourless mid-migration. Remove once every class is Klar-native.
                primary: { DEFAULT: 'var(--pp)', foreground: '#ffffff' },
                separator: 'var(--line)',
                'hover-effect': 'var(--surface-2)',
                'background-secondary': 'var(--surface)',
                destructive: 'var(--neg-ink)',
                accent: 'var(--surface-3)',
                popover: { DEFAULT: 'var(--surface)', foreground: 'var(--ink)' },
                purple: {
                    100: 'var(--pp-tint2)',
                    200: 'var(--pp-tint)',
                    300: 'var(--pp-tint2)',
                    500: 'var(--pp)',
                    700: 'var(--pp-ink)',
                    900: 'var(--pp-ink)',
                },
                grey: {
                    black: 'var(--ink)',
                    900: 'var(--ink)',
                    800: 'var(--ink-2)',
                    700: 'var(--ink-2)',
                    600: 'var(--ink-3)',
                    white: '#ffffff',
                },
            },
            fontFamily: {
                sans: ['Hanken Grotesk', 'system-ui', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
