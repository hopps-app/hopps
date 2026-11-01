import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface HintBannerProps {
    icon: LucideIcon;
    children: ReactNode;
    /** Smaller, lighter variant for the edit-mode notice */
    compact?: boolean;
}

/** Light purple notice above the Bommel tree: empty structure, example data or edit mode */
export function HintBanner({ icon: Icon, children, compact }: HintBannerProps) {
    return (
        <div
            className={cn(
                'flex items-center rounded-[14px] border border-[var(--accent-surface-strong)] bg-[var(--accent-surface)] text-purple-600',
                compact ? 'gap-2.5 px-4 py-[11px] text-[13px] font-semibold' : 'gap-3 px-[18px] py-3 text-[13.5px] font-bold'
            )}
        >
            <Icon className="h-[17px] w-[17px] flex-shrink-0" aria-hidden="true" />
            <span>{children}</span>
        </div>
    );
}

export default HintBanner;
