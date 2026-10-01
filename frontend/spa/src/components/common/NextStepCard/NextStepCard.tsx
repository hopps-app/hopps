import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type NextStepCardProps = {
    icon: LucideIcon;
    title: string;
    text: string;
    /** The one action that moves the user on, shown on the right (wraps below on narrow screens). */
    action?: ReactNode;
};

/**
 * Card that points a new organization to its next step on an otherwise empty screen ("Nächster-Schritt"-Card from the
 * first-use design): icon tile, title, short explanation and a primary action.
 */
export function NextStepCard({ icon: Icon, title, text, action }: NextStepCardProps) {
    return (
        <div className="flex flex-wrap items-center gap-3.5 rounded-[var(--r-card)] border border-[var(--border-soft)] bg-[var(--background-secondary)] px-[22px] py-[18px]">
            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-[13px] bg-[var(--accent-surface)] text-purple-700">
                <Icon size={20} />
            </span>
            <div className="min-w-[220px] flex-1">
                <div className="text-[15.5px] font-extrabold text-[var(--font-color)]">{title}</div>
                <p className="mt-0.5 text-[13.5px] text-[var(--muted)]">{text}</p>
            </div>
            {action}
        </div>
    );
}
