import * as React from 'react';

import { INPUT_SURFACE } from './inputStyles';

import { cn } from '@/lib/utils.ts';

const BaseInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(INPUT_SURFACE, 'h-10 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground', className)}
            ref={ref}
            {...props}
        />
    );
});
BaseInput.displayName = 'BaseInput';

export { BaseInput };
