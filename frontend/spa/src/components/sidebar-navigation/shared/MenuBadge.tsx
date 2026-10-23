import { cn } from '@/lib/utils';

/**
 * Small count next to a menu item. Expanded it sits at the end of the row; with the sidebar collapsed it overlaps the
 * icon's top right corner. The visible number is decorative, `label` (e.g. "13 receipts to review") is what screen
 * readers announce.
 */
export function MenuBadge({ count, label, collapsed = false }: { count: number; label: string; collapsed?: boolean }) {
    if (count <= 0) return null;
    return (
        <>
            <span
                aria-hidden="true"
                className={cn(
                    'grid place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-none text-white tabular-nums',
                    collapsed ? 'absolute -right-2 -top-1.5 h-4 min-w-4 px-1 text-[10px]' : 'h-5 min-w-5 flex-shrink-0'
                )}
            >
                {count > 99 ? '99+' : count}
            </span>
            <span className="sr-only">{label}</span>
        </>
    );
}
