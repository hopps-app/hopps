type HouseIconProps = {
    size?: number | string;
    className?: string;
};

/**
 * The hopps design system's own `home` glyph — a bare peaked roof over plain walls, no door. Ported
 * 1:1 from the design kit (24x24 grid, stroke 2, round caps) because neither the Radix nor the lucide
 * house matches it.
 */
export function HouseIcon({ size = 18, className }: HouseIconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M3 9.5 12 3l9 6.5" />
            <path d="M5 9v11h14V9" />
        </svg>
    );
}
