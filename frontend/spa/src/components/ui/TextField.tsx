import * as _ from 'lodash';
import React, { useState, forwardRef } from 'react';

import { BaseInput } from '@/components/ui/shadecn/BaseInput.tsx';
import { Label } from './Label.tsx';
import InputLoader from './InputLoader';

interface TextFieldProps {
    label?: string;
    value?: string;
    placeholder?: string;
    type?: 'text' | 'password';
    name?: string;
    error?: string;
    appendIcon?: string;
    className?: string;
    loading?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onValueChange?: (value: string) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>((props, ref) => {
    const [id] = useState(_.uniqueId('text-field-'));

    return (
        <div className="relative grid w-full items-center gap-1.5">
            {props.label && <Label htmlFor={id}>{props.label}</Label>}
            <div className="relative flex items-center">
                {props.loading && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                        <InputLoader />
                    </div>
                )}
                <BaseInput
                    id={id}
                    name={props.name || undefined}
                    type={props.type || 'text'}
                    placeholder={props.placeholder || ''}
                    value={props.value}
                    className={props.loading ? `pl-10 ${props.className || ''}` : props.className}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        props.onChange?.(event);
                        props.onValueChange?.(event.target.value);
                    }}
                    onKeyDown={props.onKeyDown}
                    onBlur={props.onBlur}
                    onFocus={props.onFocus}
                    ref={ref}
                />
                {props.appendIcon || null}
            </div>
            {props.error && (
                <div className="absolute bottom-0 right-0 bg-destructive text-destructive-foreground text-xs px-4 translate-y-2.5 select-none">
                    {props.error}
                </div>
            )}
        </div>
    );
});

export default TextField;
