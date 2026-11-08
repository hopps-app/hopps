import * as SwitchPrimitives from '@radix-ui/react-switch';
import { Check } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils.ts';

/**
 * On/off switch. Off: a quiet track with a thin border and a raised knob, readable in light and dark mode. On: the brand
 * purple with a white knob carrying a small check, so the state does not rely on colour alone.
 */
const BaseSwitch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>>(
    ({ className, ...props }, ref) => (
        <SwitchPrimitives.Root
            className={cn(
                'group peer relative inline-flex h-[22px] w-[38px] shrink-0 cursor-pointer items-center rounded-full border p-[2px]',
                'transition-[background-color,border-color,box-shadow] duration-200 ease-out',
                // Off
                'data-[state=unchecked]:border-[var(--border-strong)] data-[state=unchecked]:bg-[var(--surface-track)]',
                'data-[state=unchecked]:shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] hover:data-[state=unchecked]:border-[var(--purple-400)]',
                // On
                'data-[state=checked]:border-primary data-[state=checked]:bg-primary hover:data-[state=checked]:bg-primary-active hover:data-[state=checked]:border-primary-active',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                'disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            {...props}
            ref={ref}
        >
            <SwitchPrimitives.Thumb
                className={cn(
                    'pointer-events-none grid h-4 w-4 place-items-center rounded-full shadow-[0_1px_3px_rgba(0,0,0,0.25)]',
                    'transition-[transform,background-color] duration-200 ease-[cubic-bezier(0.3,1.3,0.6,1)]',
                    'data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-white dark:data-[state=unchecked]:bg-[var(--ink-faint)]',
                    'data-[state=checked]:translate-x-4 data-[state=checked]:bg-white'
                )}
            >
                <Check
                    className="h-2.5 w-2.5 text-primary opacity-0 transition-opacity duration-150 group-data-[state=checked]:opacity-100"
                    strokeWidth={3.5}
                    aria-hidden="true"
                />
            </SwitchPrimitives.Thumb>
        </SwitchPrimitives.Root>
    )
);
BaseSwitch.displayName = SwitchPrimitives.Root.displayName;

export { BaseSwitch };
