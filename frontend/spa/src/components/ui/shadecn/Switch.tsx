import * as SwitchPrimitives from '@radix-ui/react-switch';
import * as React from 'react';

import { cn } from '@/lib/utils';

export const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>>(
    ({ className, ...props }, ref) => (
        <SwitchPrimitives.Root
            ref={ref}
            className={cn(
                'peer inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border border-[#A7A7A7]',
                'transition-colors data-[state=checked]:bg-[var(--purple-500)] data-[state=unchecked]:bg-[var(--grey-300)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple-500)] focus-visible:ring-offset-2',
                className
            )}
            {...props}
        >
            <SwitchPrimitives.Thumb
                className={cn(
                    'pointer-events-none block h-[16px] w-[16px] rounded-full bg-white shadow transition-transform',
                    'data-[state=checked]:translate-x-[17px] data-[state=unchecked]:translate-x-[3px]'
                )}
            />
        </SwitchPrimitives.Root>
    )
);
Switch.displayName = SwitchPrimitives.Root.displayName;
