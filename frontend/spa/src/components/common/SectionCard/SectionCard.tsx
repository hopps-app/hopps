import { CARD } from '@/components/Organization/layout';

/** Card with an icon tile, a title, an optional note and an optional action on the right, as on the settings pages. */
export function SectionCard({
    icon,
    title,
    note,
    action,
    children,
}: {
    icon: React.ReactNode;
    title: string;
    note?: string;
    /** Rendered top right of the card header. */
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className={`${CARD} px-6 py-[22px] flex flex-col gap-4`}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-[13px] min-w-0">
                    <div className="w-9 h-9 rounded-[10px] bg-[#F1F1F4] text-[#6B6B76] dark:bg-[var(--surface-track)] dark:text-[#A0A0AC] grid place-items-center flex-shrink-0">
                        {icon}
                    </div>
                    <div className="flex flex-col gap-[3px] min-w-0">
                        <span className="text-[16.5px] font-extrabold tracking-[-0.01em] text-[#1B1B1F] dark:text-[#F2F2F5]">{title}</span>
                        {note && <span className="text-[13.5px] text-[#6B6B76] dark:text-[#A0A0AC]">{note}</span>}
                    </div>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}
