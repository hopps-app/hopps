import { useId } from 'react';

import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { BaseSwitch } from '@/components/ui/shadecn/BaseSwitch';

interface ToggleFieldProps {
    label: string;
    /** Explanation shown in the info tooltip next to the label */
    info: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}

/** Switch with a bold label and an info tooltip. The icon sits outside the label, so hovering or clicking it does not flip the switch. */
export function ToggleField({ label, info, checked, onCheckedChange }: ToggleFieldProps) {
    const id = useId();
    return (
        <div className="flex items-center gap-1.5">
            <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5">
                <BaseSwitch id={id} checked={checked} onCheckedChange={onCheckedChange} />
                <span className="text-[13.5px] font-bold text-foreground">{label}</span>
            </label>
            <InfoTooltip content={info} label={info} />
        </div>
    );
}

export default ToggleField;
