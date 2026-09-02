import type React from 'react';

type LineIconProps = {
    size?: number | string;
    className?: string;
};

/**
 * The hopps design system's line icons, ported 1:1 from the design kit (24x24 grid, stroke 2, round
 * caps and joins). They exist because the Radix and lucide equivalents differ in weight and detail —
 * a door on the house, a chart in the sheet — and the sidebar reads as one set only if they match.
 */
function LineIcon({ paths, size = 18, className, children }: LineIconProps & { paths: string[]; children?: React.ReactNode }) {
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
            {paths.map((d) => (
                <path key={d} d={d} />
            ))}
            {children}
        </svg>
    );
}

export function HouseIcon(props: LineIconProps) {
    return <LineIcon {...props} paths={['M3 9.5 12 3l9 6.5', 'M5 9v11h14V9']} />;
}

export function ReceiptIcon(props: LineIconProps) {
    return <LineIcon {...props} paths={['M5 3v18l2-1.2 2 1.2 2-1.2 2 1.2 2-1.2 2 1.2V3l-2 1.2L15 3l-2 1.2L11 3 9 4.2 7 3 5 4.2', 'M9 8h6', 'M9 12h6']} />;
}

export function NetworkIcon(props: LineIconProps) {
    return <LineIcon {...props} paths={['M12 9V5', 'M6 19v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2', 'M9 5h6v4H9z', 'M3 19h6v3H3z', 'M15 19h6v3h-6z']} />;
}

export function ListIcon(props: LineIconProps) {
    return <LineIcon {...props} paths={['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01']} />;
}

export function LandmarkIcon(props: LineIconProps) {
    return <LineIcon {...props} paths={['M3 10h18', 'M5 10v9', 'M9 10v9', 'M15 10v9', 'M19 10v9', 'M3 21h18', 'M12 3l9 6H3z']} />;
}

export function TagIcon(props: LineIconProps) {
    return <LineIcon {...props} paths={['M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L3 13V3h10l7.59 7.59a2 2 0 0 1 0 2.82Z', 'M7 7h.01']} />;
}

export function SheetIcon(props: LineIconProps) {
    return <LineIcon {...props} paths={['M15 3v18', 'M3 9h18', 'M3 15h18', 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z']} />;
}

export function SettingsIcon(props: LineIconProps) {
    return (
        <LineIcon
            {...props}
            paths={[
                'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
            ]}
        >
            <circle cx="12" cy="12" r="3" />
        </LineIcon>
    );
}

export function MoreVerticalIcon(props: LineIconProps) {
    return (
        <LineIcon {...props} paths={[]}>
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
        </LineIcon>
    );
}
