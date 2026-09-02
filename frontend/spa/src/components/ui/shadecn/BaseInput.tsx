import * as React from 'react';

import { cn } from '@/lib/utils.ts';

const BaseInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                'w-full h-10 text-gray-800 dark:text-gray-100 text-sm border border-[#E0E0E6] dark:border-gray-700 px-3 rounded-xl bg-white dark:bg-[var(--purple-50)] ' +
                    'placeholder:text-muted transition-colors ' +
                    'focus:border-[var(--purple-300)] focus-visible:border-[var(--purple-300)] focus:outline-none focus:ring-2 focus:ring-[var(--purple-50)] ' +
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
