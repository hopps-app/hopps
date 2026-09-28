import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/shadecn/Tooltip';
import { cn } from '@/lib/utils';

/**
 * Info icon that explains something in a dark speech bubble on hover or focus. The bubble is portalled, so a parent's
 * overflow does not clip it. The icon takes the colour of its surroundings unless `className` sets one.
 */
export function InfoTooltip({
    content,
    label,
    size = 15,
    align = 'start',
    className,
}: {
    content: ReactNode;
    /** Accessible name of the icon button. */
    label: string;
    size?: number;
    align?: 'start' | 'center' | 'end';
    className?: string;
}) {
    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        type="button"
                        aria-label={label}
                        className={cn('inline-flex text-[var(--ink-faint)] transition-colors hover:text-foreground', className)}
                    >
                        <Info size={size} />
                    </button>
                </TooltipTrigger>
                <TooltipContent
                    side="top"
                    align={align}
                    className="z-[60] max-w-[280px] rounded-[10px] bg-[#1B1B1F] px-3.5 py-2.5 text-[12.5px] font-medium leading-snug text-white"
                >
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
