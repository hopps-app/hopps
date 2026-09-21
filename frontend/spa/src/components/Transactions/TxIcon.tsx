import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

/** Direction tile: an income points down into the account (green), an expense up and out (purple). */
export function TxIcon({ size = 36, incoming }: { size?: number; incoming?: boolean }) {
    const Icon = incoming ? ArrowDownRight : ArrowUpRight;
    return (
        <span
            className="inline-flex flex-shrink-0 items-center justify-center"
            style={{
                width: size,
                height: size,
                borderRadius: size >= 48 ? 15 : 10,
                background: incoming ? 'var(--positive-surface)' : 'var(--accent-surface)',
                color: incoming ? 'var(--positive)' : 'var(--purple-700)',
            }}
        >
            <Icon size={size >= 48 ? 26 : 17} strokeWidth={2} />
        </span>
    );
}
