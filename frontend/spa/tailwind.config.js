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
                card: {
                    DEFAULT: 'hsl(var(--card))',
                    foreground: 'hsl(var(--card-foreground))',
                },
                popover: {
                    DEFAULT: 'var(--popover)',
                    foreground: 'var(--popover-foreground)',
                },
                primary: {
                    DEFAULT: 'var(--primary)',
                    foreground: 'var(--primary-foreground)',
                    active: 'var(--primary-active)',
                },
                secondary: {
                    DEFAULT: 'var(--secondary)',
                    foreground: 'var(--secondary-foreground)',
                },
                muted: {
                    DEFAULT: 'var(--muted)',
                    foreground: 'var(--muted-foreground)',
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
                border: 'hsl(var(--border))',
                input: 'hsl(var(--input))',
                ring: 'hsl(var(--ring))',
                'hover-active': 'var(--hover-active)',
                'hover-effect': 'var(--hover-effect)',
                'background-secondary': 'var(--background-secondary)',
                purple: {
                    50: 'var(--purple-50)',
                    100: 'var(--purple-100)',
                    200: 'var(--purple-200)',
                    300: 'var(--purple-300)',
                    400: 'var(--purple-400)',
                    500: 'var(--purple-500)',
                    600: 'var(--purple-600)',
                    700: 'var(--purple-700)',
                    800: 'var(--purple-800)',
                    900: 'var(--purple-900)',
                    950: 'var(--purple-950)',
                },
                grey: {
                    black: 'var(--grey-black)',
                    900: 'var(--grey-900)',
                    800: 'var(--grey-800)',
                    700: 'var(--grey-700)',
                    600: 'var(--grey-600)',
                    500: 'var(--grey-500)',
                    400: 'var(--grey-400)',
                    white: 'var(--grey-white)',
                },
                chart: {
                    1: 'hsl(var(--chart-1))',
                    2: 'hsl(var(--chart-2))',
                    3: 'hsl(var(--chart-3))',
                    4: 'hsl(var(--chart-4))',
                    5: 'hsl(var(--chart-5))',
                },
            },
            fontFamily: {
                reddit: ['"Reddit Sans"', 'sans-serif'],
            }
        },
    },
    plugins: [require('tailwindcss-animate')],
};
