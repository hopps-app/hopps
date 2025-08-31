import * as _ from 'lodash';
import * as React from 'react';

import { Label } from './Label.tsx';
import { BaseSwitch as BaseSwitch } from '@/components/ui/shadecn/BaseSwitch.tsx';

type UISwitchProps = React.ComponentPropsWithoutRef<typeof BaseSwitch> & {
    label?: string;
};

const Switch = React.forwardRef<React.ElementRef<typeof BaseSwitch>, UISwitchProps>(({ label, id: providedId, ...props }, ref) => {
    const [id] = React.useState<string>(providedId || _.uniqueId('switch-'));

    return (
        <div className="flex items-center space-x-2">
            <BaseSwitch id={id} ref={ref} {...props} />
            {label ? <Label htmlFor={id}>{label}</Label> : null}
        </div>
    );
});

Switch.displayName = 'Switch';

export default Switch;
