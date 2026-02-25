import * as _ from 'lodash';
import React, { useState, forwardRef } from 'react';

import InputLoader from './InputLoader';
import { Label } from './Label.tsx';

import Icon, { RadixIcons } from '@/components/ui/Icon.tsx';
import { BaseInput } from '@/components/ui/shadecn/BaseInput.tsx';

interface TextFieldProps {
    label?: string;
    value?: string;
    placeholder?: string;
    type?: 'text' | 'password';
    name?: string;
    error?: string;
    prependIcon?: RadixIcons;
    className?: string;
    loading?: boolean;
    maxLength?: number;
    required?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onValueChange?: (value: string) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

const TextField = forwardRef<HTMLInputElement, TextFieldProps>((props, ref) => {
    const [id] = useState(_.uniqueId('text-field-'));
    const [showPassword, setShowPassword] = useState(false);
    const errorId = `${id}-error`;

    const isPassword = props.type === 'password';
    const inputType = isPassword && showPassword ? 'text' : props.type || 'text';
    const hasPrependContent = props.loading || props.prependIcon;

    return (
        <div className="grid w-full items-center gap-1.5">
            {props.label && (
                <Label htmlFor={id} className={props.error ? 'text-red-500' : ''}>
                    {props.label}
                </Label>
            )}
            <div className="relative flex items-center">
                {props.loading && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                        <InputLoader />
                    </div>
                )}
                {!props.loading && props.prependIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text">
                        <Icon icon={props.prependIcon} size="md" />
                    </div>
                )}
                <BaseInput
                    id={id}
                    name={props.name || undefined}
                    type={inputType}
                    placeholder={props.placeholder || ''}
                    value={props.value}
                    maxLength={props.maxLength}
                    className={`${hasPrependContent ? 'pl-10 ' : ''}${isPassword ? 'pr-10 ' : ''}${props.error ? 'border-red-500 focus:border-red-500 focus:ring-red-500 shadow-[0_0_0_2px_rgba(239,68,68,0.15)] text-red-500 ' : ''}${props.className || ''}`.trim()}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                        props.onChange?.(event);
                        props.onValueChange?.(event.target.value);
                    }}
                    onKeyDown={props.onKeyDown}
                    onBlur={props.onBlur}
                    onFocus={props.onFocus}
                    ref={ref}
                    aria-invalid={props.error ? true : undefined}
                    aria-describedby={props.error ? errorId : undefined}
                    aria-required={props.required || undefined}
                />
                {isPassword && (
                    <button
                        type="button"
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                        <Icon icon={showPassword ? 'EyeNone' : 'EyeOpen'} size={16} />
                    </button>
                )}
            </div>
            <div className="min-h-[10px]">
                {props.error && (
                    <p id={errorId} role="alert" className="text-xs text-red-500 mt-0.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        {props.error}
                    </p>
                )}
            </div>
        </div>
    );
});

export default TextField;
