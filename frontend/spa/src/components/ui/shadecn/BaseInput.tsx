import * as React from 'react';

import { cn } from '@/lib/utils.ts';

const BaseInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                'w-full text-gray-800 text-sm border border-gray-300 px-4 py-3 rounded-md outline-primary bg-primary-foreground ' +
                    'placeholder:text-muted focus:border-primary transition-colors ' +
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
