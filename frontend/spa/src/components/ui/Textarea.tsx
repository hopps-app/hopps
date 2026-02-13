import * as _ from 'lodash';
import * as React from 'react';
import { useState } from 'react';

import { Label } from './Label';

import { Textarea as TextareaBase } from '@/components/ui/shadecn/textarea'; // no .tsx needed
import { cn } from '@/lib/utils';

type TextareaProps = React.ComponentProps<'textarea'> & {
    label?: string;
    error?: string;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ label, id: propId, error, className, ...props }, ref) => {
    const [generatedId] = useState(_.uniqueId('textarea-'));
    const id = propId || generatedId;
    const errorId = `${id}-error`;

    return (
        <div className="relative grid w-full items-center gap-1.5">
            {label && <Label htmlFor={id}>{label}</Label>}

            <TextareaBase
                id={id}
                ref={ref}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? errorId : undefined}
                className={cn(className)}
                {...props}
            />

            {error && (
                <div
                    id={errorId}
                    role="alert"
                    className="absolute bottom-0 right-0 translate-y-2.5 bg-destructive text-destructive-foreground text-xs px-4 select-none"
                >
                    {error}
                </div>
            )}
        </div>
    );
});

Textarea.displayName = 'Textarea';
export default Textarea;
