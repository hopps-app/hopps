import React, { useState, forwardRef } from 'react';
import * as _ from 'lodash';

import { Label } from './Label.tsx';
import { BaseInput } from '@/components/ui/shadecn/BaseInput.tsx';

interface TextFieldProps {
    label?: string;
    value?: string;
    placeholder?: string;
    type?: 'text' | 'password';
    name?: string;
    appendIcon?: string;
    className?: string;
    onChange?: (value: string) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>((props, ref) => {
    const { value, label, placeholder, type, name, appendIcon, onChange, onKeyDown, onBlur, onFocus } = props;
    const [id] = useState(_.uniqueId('text-field-'));

    return (
        <div className="grid w-full items-center gap-1.5">
            {label && <Label htmlFor={id}>{label}</Label>}
            <div className="relative flex items-center">
                <BaseInput
                    id={id}
                    name={name || undefined}
                    type={type || 'text'}
                    placeholder={placeholder || ''}
                    value={value}
                    className={props.className}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={onBlur}
                    onFocus={onFocus}
                    ref={ref}
                />
                {appendIcon || null}
            </div>
        </div>
    );
});

export default TextField;
