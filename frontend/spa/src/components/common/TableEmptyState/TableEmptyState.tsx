import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type TableEmptyStateProps = {
    icon: LucideIcon;
    title: string;
    text?: string;
    /** Optional follow-up, e.g. a link that resets the filters. */
    action?: ReactNode;
};

/**
 * Empty state shown inside a table card below its header row (first-use design, Belege): icon tile, title and a short
 * hint. Used both for "nothing exists yet" and "the search or filter finds nothing".
 */
export function TableEmptyState({ icon: Icon, title, text, action }: TableEmptyStateProps) {
    return (
        <div className="flex flex-col items-center gap-1 px-6 py-[46px] text-center">
            <span className="mb-2 grid h-14 w-14 place-items-center rounded-[18px] bg-[var(--accent-surface)] text-purple-700">
                <Icon size={26} />
            </span>
            <p className="text-base font-extrabold text-foreground">{title}</p>
            {text && <p className="max-w-[340px] text-[13.5px] leading-normal text-muted-foreground">{text}</p>}
            {action && <div className="mt-2">{action}</div>}
        </div>
    );
}
