import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';

/**
 * The one place that decides which arrow stands for a direction; every direction icon in the app uses it. The arrow
 * shows the money's path relative to the account: an expense leaves it (up and away, ↗), an income comes in (down and
 * towards it, ↙). Colour and sign carry the meaning too, so the arrow is never the only hint.
 */
export const DIRECTION_ICONS = { income: ArrowDownLeft, expense: ArrowUpRight } as const;

/** Direction tile: an income in green, an expense in red. */
export function TxIcon({ size = 36, incoming }: { size?: number; incoming?: boolean }) {
    const Icon = incoming ? DIRECTION_ICONS.income : DIRECTION_ICONS.expense;
    return (
        <span
            className="inline-flex flex-shrink-0 items-center justify-center"
            style={{
                width: size,
                height: size,
                borderRadius: size >= 48 ? 15 : 10,
                background: incoming ? 'var(--positive-surface)' : 'var(--negative-surface)',
                color: incoming ? 'var(--positive)' : 'var(--negative)',
            }}
        >
            <Icon size={size >= 48 ? 26 : 17} strokeWidth={2} />
        </span>
    );
}
