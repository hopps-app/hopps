/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    theme: {
        extend: {
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            colors: {
                background: 'var(--background)',
                foreground: 'var(--foreground)',
                popover: {
                    DEFAULT: 'var(--popover)',
                    foreground: 'var(--popover-foreground)',
                },
                primary: {
                    DEFAULT: 'var(--primary)',
                    foreground: 'var(--primary-foreground)',
                },
                accent: {
                    DEFAULT: 'var(--accent)',
                    foreground: 'var(--accent-foreground)',
                },
                destructive: {
                    DEFAULT: 'var(--destructive)',
                    foreground: 'var(--destructive-foreground)',
                },
                separator: 'var(--separator)',
                border: 'var(--border)',
                'hover-effect': 'var(--hover-effect)',
                'background-secondary': 'var(--background-secondary)',
                purple: {
                    100: 'var(--purple-100)',
                    200: 'var(--purple-200)',
                    300: 'var(--purple-300)',
                    500: 'var(--purple-500)',
                    700: 'var(--purple-700)',
                    900: 'var(--purple-900)',
                },
                grey: {
                    black: 'var(--grey-black)',
                    900: 'var(--grey-900)',
                    800: 'var(--grey-800)',
                    700: 'var(--grey-700)',
                    600: 'var(--grey-600)',
                },
            },
            fontFamily: {
                sans: ['Reddit Sans', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
