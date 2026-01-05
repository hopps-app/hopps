import { FC } from 'react';

import Button from '@/components/ui/Button';
import { RadixIcons } from '@/components/ui/Icon';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/shadecn/Tooltip';

type TooltipButtonPropsType = {
    text: string;
    onAction: () => void;
    icon?: RadixIcons;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'center' | 'end' | 'start';
};

const TooltipButton: FC<TooltipButtonPropsType> = ({ onAction, text, icon, align, side }) => {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Button
                        onClick={onAction}
                        className="min-w-[25px] bg-transparent p-0 flex items-center h-6 text-xs text-[var(--font-color)] hover:text-[var(--primary-foreground)]"
                        icon={icon}
                    />
                </TooltipTrigger>
                <TooltipContent side={side ?? 'top'} align={align ?? 'center'}>
                    <span>{text}</span>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
};

export default TooltipButton;
