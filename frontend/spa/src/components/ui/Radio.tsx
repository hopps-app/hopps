import React from 'react';

import { Label } from './Label.tsx';

import { RadioGroup, RadioGroupItem } from '@/components/ui/shadecn/RadioGroup.tsx';

interface RadioItem {
    label: string;
    value: string;
}

interface RadioProps {
    items: RadioItem[];
    value?: string;
    label?: string;
    onValueChange?: (value: string) => void;
    className?: string;
    layout?: 'horizontal' | 'vertical';
}

const Radio: React.FC<RadioProps> = ({ items, value, label, onValueChange, className, layout, ...props }) => {
    return (
        <>
            {label && <Label> {label} </Label>}
            <RadioGroup value={value} onValueChange={onValueChange} className={className} aria-label={label} {...props}>
                <div className={layout === 'horizontal' ? 'flex flex-row gap-2' : ''}>
                    {items.map((item) => (
                        <label key={item.value} className="flex items-center gap-2">
                            <RadioGroupItem value={item.value} />
                            {item.label}
                        </label>
                    ))}
                </div>
            </RadioGroup>
        </>
    );
};

export default Radio;
