import * as React from 'react';

import { cn } from '@/lib/utils.ts';

const BaseInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                'w-full text-gray-800 dark:text-gray-100 text-sm border border-[#d1d5db] dark:border-gray-700 px-4 py-2.5 rounded-lg bg-white dark:bg-[var(--purple-50)] ' +
                    'placeholder:text-muted transition-shadow ' +
                    'focus:border-[var(--purple-500)] focus:outline-none focus:ring-2 focus:ring-[#9955cc66] ' +
                    'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground ' +
                    'disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            ref={ref}
            {...props}
        />
    );
});
BaseInput.displayName = 'BaseInput';

export { BaseInput };
